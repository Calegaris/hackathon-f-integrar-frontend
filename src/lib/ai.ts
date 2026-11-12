import { GoogleGenAI } from "@google/genai";
import { generateRuleBasedFallback } from "./fallback";
import { formatTwoDecimals, roundToTwo } from "./metrics";
import type {
  AnalyzeApiResponse,
  FallbackReason,
  ReplyVerdict,
  ResponseTone,
} from "./types";

export const AI_TIMEOUT_MS = 10_000;

export const DEFAULT_INITIAL_MODEL = "gemini-3.5-flash-lite";

export const MODELS_CASCADE: readonly string[] = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
  "gemini-flash-lite-latest",
  "gemini-omni-1.1-flash",
  "gemma-4-31b-it",
];

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "Resumen conciso de lo que realmente quieren decir en el chat (1 a 3 oraciones en español rioplatense neutro).",
    },
    diplomatic: {
      type: "string",
      description: "Respuesta sugerida en tono diplomático, cordial y constructivo.",
    },
    passiveAggressive: {
      type: "string",
      description:
        "Respuesta sugerida en tono pasivo-agresivo, irónico y elegante sin insultos.",
    },
    neutral: {
      type: "string",
      description: "Respuesta sugerida en tono neutro, directo y breve.",
    },
    shouldReply: {
      type: "boolean",
      description: "Indica si el chat requiere respuesta del usuario.",
    },
    urgencyPercentage: {
      type: "number",
      description: "Porcentaje numérico de urgencia de 0 a 100.",
    },
  },
  required: [
    "summary",
    "diplomatic",
    "passiveAggressive",
    "neutral",
    "shouldReply",
    "urgencyPercentage",
  ],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = [
  "Sos analista táctico de A.R.T. (Agencia de Respuestas Tácticas).",
  "Analizá el historial de chat de WhatsApp y devolvé ÚNICAMENTE un JSON válido.",
  "Campos requeridos:",
  '- "summary": síntesis directa de lo que realmente quieren decir (máximo 2-3 oraciones).',
  '- "diplomatic": respuesta lista para copiar en tono diplomático.',
  '- "passiveAggressive": respuesta lista para copiar en tono pasivo-agresivo sutil (sin agresiones ni insultos).',
  '- "neutral": respuesta lista para copiar en tono neutro y práctico.',
  '- "shouldReply": booleano indicando si conviene responder.',
  '- "urgencyPercentage": número entre 0 y 100 representando el nivel de urgencia.',
].join("\n");

export function buildModelsToTry(initialModel?: string): string[] {
  const first = initialModel?.trim() || DEFAULT_INITIAL_MODEL;
  return Array.from(new Set([first, ...MODELS_CASCADE].filter(Boolean)));
}

interface RawAiPayload {
  summary?: unknown;
  diplomatic?: unknown;
  passiveAggressive?: unknown;
  neutral?: unknown;
  shouldReply?: unknown;
  urgencyPercentage?: unknown;
}

function stripJsonCodeFences(rawText: string): string {
  const trimmed = rawText.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildVerdict(shouldReply: boolean, rawUrgency: number): ReplyVerdict {
  const clamped = roundToTwo(Math.max(0, Math.min(100, rawUrgency)));
  const signal = clamped >= 60 ? "red" : clamped >= 25 ? "yellow" : "green";
  return {
    shouldReply,
    urgencyPercentage: clamped,
    formattedUrgencyPercentage: formatTwoDecimals(clamped),
    signal,
  };
}

export function parseAiResponsePayload(
  rawText: string,
  modelUsed: string,
): AnalyzeApiResponse | null {
  try {
    const cleaned = stripJsonCodeFences(rawText);
    const parsed = JSON.parse(cleaned) as RawAiPayload;

    if (
      !isNonEmptyString(parsed.summary) ||
      !isNonEmptyString(parsed.diplomatic) ||
      !isNonEmptyString(parsed.passiveAggressive) ||
      !isNonEmptyString(parsed.neutral) ||
      typeof parsed.shouldReply !== "boolean" ||
      typeof parsed.urgencyPercentage !== "number" ||
      !Number.isFinite(parsed.urgencyPercentage)
    ) {
      return null;
    }

    return {
      summary: parsed.summary.trim(),
      responses: {
        diplomatic: {
          tone: "diplomatic",
          label: "Diplomática",
          text: parsed.diplomatic.trim(),
        },
        passiveAggressive: {
          tone: "passiveAggressive",
          label: "Pasivo-agresiva",
          text: parsed.passiveAggressive.trim(),
        },
        neutral: {
          tone: "neutral",
          label: "Neutra",
          text: parsed.neutral.trim(),
        },
      },
      verdict: buildVerdict(parsed.shouldReply, parsed.urgencyPercentage),
      source: "llm",
      modelUsed,
    };
  } catch {
    return null;
  }
}

export type GenerateContentFn = (params: {
  model: string;
  contents: string;
  systemInstruction?: string;
  useJsonSchema: boolean;
  abortSignal: AbortSignal;
  timeoutMs: number;
}) => Promise<string | undefined>;

function createSdkGenerator(apiKey: string): GenerateContentFn {
  const ai = new GoogleGenAI({ apiKey });

  return async ({
    model,
    contents,
    systemInstruction,
    useJsonSchema,
    abortSignal,
    timeoutMs,
  }) => {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        abortSignal,
        httpOptions: {
          timeout: timeoutMs,
          // Fail fast on saturated/rate-limited models so the cascade can try the next model within 10s.
          retryOptions: { attempts: 1 },
        },
        ...(systemInstruction ? { systemInstruction } : {}),
        ...(useJsonSchema
          ? {
              responseMimeType: "application/json",
              responseJsonSchema: RESPONSE_JSON_SCHEMA,
            }
          : {}),
      },
    });

    return response.text;
  };
}

export interface AnalyzeWithAiOptions {
  apiKey?: string;
  initialModel?: string;
  timeoutMs?: number;
  regenerateTone?: ResponseTone;
  variantSeed?: number;
  generator?: GenerateContentFn;
}

/**
 * Analyzes a WhatsApp chat using a Gemini model cascade with a shared 10s timeout
 * and deterministic rule-based fallback (RF-17, RF-18, RF-19).
 */
export async function analyzeChatWithAi(
  chatText: string,
  options: AnalyzeWithAiOptions = {},
): Promise<AnalyzeApiResponse> {
  const apiKey = (options.apiKey ?? process.env.GEMINI_API_KEY)?.trim();
  const variantSeed = options.variantSeed ?? 0;

  if (!apiKey && !options.generator) {
    return generateRuleBasedFallback(chatText, "missing_key", variantSeed);
  }

  const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;
  const modelsToTry = buildModelsToTry(
    options.initialModel ?? process.env.GEMINI_MODEL,
  );
  const generate = options.generator ?? createSdkGenerator(apiKey ?? "");

  const controller = new AbortController();
  const deadline = Date.now() + timeoutMs;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const toneNote = options.regenerateTone
    ? `\nGenerá una variante fresca y distinta especialmente para el tono "${options.regenerateTone}".`
    : "";

  const userPrompt = `Historial de chat a analizar:\n${chatText}${toneNote}`;

  let lastFailureReason: FallbackReason = "provider_error";

  try {
    for (const model of modelsToTry) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0 || controller.signal.aborted) {
        lastFailureReason = "timeout";
        break;
      }

      const isGemma = model.toLowerCase().startsWith("gemma");

      try {
        const rawText = await generate({
          model,
          contents: isGemma
            ? `${SYSTEM_PROMPT}\n\n${userPrompt}\nRespondé solo con el objeto JSON.`
            : userPrompt,
          systemInstruction: isGemma ? undefined : SYSTEM_PROMPT,
          useJsonSchema: !isGemma,
          abortSignal: controller.signal,
          timeoutMs: remainingMs,
        });

        if (!rawText) {
          lastFailureReason = "invalid_payload";
          continue;
        }

        const parsed = parseAiResponsePayload(rawText, model);
        if (parsed) {
          return parsed;
        }

        lastFailureReason = "invalid_payload";
      } catch {
        if (controller.signal.aborted) {
          lastFailureReason = "timeout";
          break;
        }
        lastFailureReason = "provider_error";
      }
    }
  } finally {
    clearTimeout(timer);
  }

  return generateRuleBasedFallback(chatText, lastFailureReason, variantSeed);
}

