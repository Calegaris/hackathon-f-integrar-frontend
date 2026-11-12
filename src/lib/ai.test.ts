import { describe, expect, it, vi } from "vitest";
import {
  analyzeChatWithAi,
  buildModelsToTry,
  parseAiResponsePayload,
} from "./ai";

const SAMPLE_CHAT = [
  "12/11/26, 10:00 - Ana: Necesito confirmar urgente la entrega",
  "12/11/26, 10:05 - Bruno: A que hora seria?",
].join("\n");

const VALID_JSON_RESPONSE = JSON.stringify({
  summary: "Ana necesita confirmar el horario de entrega cuanto antes.",
  diplomatic: "¡Hola Ana! Ya mismo lo reviso y te confirmo el horario.",
  passiveAggressive: "Qué tranquilidad la tuya. Cuando me libere te confirmo la hora.",
  neutral: "Lo reviso ahora y te confirmo horario.",
  shouldReply: true,
  urgencyPercentage: 78.5,
});

describe("buildModelsToTry", () => {
  it("starts with initialModel and deduplicates the cascade", () => {
    const models = buildModelsToTry("gemini-3.6-flash");
    expect(models[0]).toBe("gemini-3.6-flash");
    expect(models.filter((m) => m === "gemini-3.6-flash")).toHaveLength(1);
    expect(models[models.length - 1]).toBe("gemma-4-31b-it");
  });
});

describe("parseAiResponsePayload", () => {
  it("parses valid JSON including markdown code fences from Gemma models", () => {
    const fenced = `\`\`\`json\n${VALID_JSON_RESPONSE}\n\`\`\``;
    const result = parseAiResponsePayload(fenced, "gemma-4-31b-it");
    expect(result).not.toBeNull();
    expect(result?.source).toBe("llm");
    expect(result?.modelUsed).toBe("gemma-4-31b-it");
    expect(result?.verdict.formattedUrgencyPercentage).toBe("78,50");
    expect(result?.verdict.signal).toBe("red");
  });

  it("returns null on malformed JSON or missing required fields", () => {
    expect(parseAiResponsePayload("not json", "gemini-3.5-flash")).toBeNull();
    expect(
      parseAiResponsePayload(JSON.stringify({ summary: "Solo resumen" }), "gemini-3.5-flash"),
    ).toBeNull();
  });
});

describe("analyzeChatWithAi", () => {
  it("falls back immediately with missing_key when GEMINI_API_KEY is unset (RF-19)", async () => {
    const result = await analyzeChatWithAi(SAMPLE_CHAT, { apiKey: "" });
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("missing_key");
    expect(result.responses.diplomatic.text.length).toBeGreaterThan(0);
  });

  it("cascades to the next model when an earlier model fails or is saturated", async () => {
    const tried: string[] = [];
    const generator = vi.fn(async ({ model }: { model: string }) => {
      tried.push(model);
      if (model === "gemini-3.5-flash-lite") {
        throw new Error("503 Service Unavailable");
      }
      return VALID_JSON_RESPONSE;
    });

    const result = await analyzeChatWithAi(SAMPLE_CHAT, {
      apiKey: "test-key",
      generator,
    });

    expect(tried).toEqual(["gemini-3.5-flash-lite", "gemini-3.6-flash"]);
    expect(result.source).toBe("llm");
    expect(result.modelUsed).toBe("gemini-3.6-flash");
  });

  it("falls back with timeout when the 10s deadline expires", async () => {
    const generator = vi.fn(
      ({ abortSignal }: { abortSignal: AbortSignal }) =>
        new Promise<string | undefined>((_resolve, reject) => {
          abortSignal.addEventListener("abort", () => {
            reject(new Error("Aborted"));
          });
        }),
    );

    const result = await analyzeChatWithAi(SAMPLE_CHAT, {
      apiKey: "test-key",
      timeoutMs: 25,
      generator,
    });

    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("timeout");
  });

  it("falls back with provider_error if every model in the cascade fails", async () => {
    const generator = vi.fn(async () => {
      throw new Error("429 Resource Exhausted");
    });

    const result = await analyzeChatWithAi(SAMPLE_CHAT, {
      apiKey: "test-key",
      generator,
    });

    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("provider_error");
    expect(generator).toHaveBeenCalledTimes(9);
  });
});

