import { describe, expect, it } from "vitest";
import { detectFallbackCategory, generateRuleBasedFallback } from "./fallback";

describe("rule-based fallback engine (RF-19, RF-20)", () => {
  it("detects money, date, complaint, and question categories accurately", () => {
    expect(
      detectFallbackCategory("Che cuanto sale? Pasame el alias para transferir $15000"),
    ).toBe("money");
    expect(
      detectFallbackCategory("Nos vemos el viernes a las 19:00 o mañana?"),
    ).toBe("date");
    expect(
      detectFallbackCategory("URGENTE!! Otra vez lo mismo, estoy harto de este problema!!"),
    ).toBe("complaint");
    expect(detectFallbackCategory("Vos fuiste al final? Que te dijeron?")).toBe(
      "question",
    );
  });

  it("returns complete fallback response with 3 tones and formatted urgency", () => {
    const chat = [
      "12/11/26, 10:00 - Ana: Necesito saber urgente cuanto es",
      "12/11/26, 10:05 - Ana: Pasame el alias y decime si transferimos hoy?",
    ].join("\n");

    const result = generateRuleBasedFallback(chat, "missing_key");
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("missing_key");
    expect(result.summary.length).toBeGreaterThan(10);
    expect(result.responses.diplomatic.text.length).toBeGreaterThan(0);
    expect(result.responses.passiveAggressive.text.length).toBeGreaterThan(0);
    expect(result.responses.neutral.text.length).toBeGreaterThan(0);
    expect(result.verdict.formattedUrgencyPercentage).toMatch(/^\d+,\d{2}$/);
    expect(result.verdict.shouldReply).toBe(true);
    expect(["red", "yellow", "green"]).toContain(result.verdict.signal);
  });

  it("rotates response variants deterministically when variantSeed changes (RF-22)", () => {
    const chat = "12/11/26, 10:00 - Ana: A que hora es el viernes?";
    const v0 = generateRuleBasedFallback(chat, "timeout", 0);
    const v1 = generateRuleBasedFallback(chat, "timeout", 1);

    expect(v0.responses.neutral.text).not.toBe(v1.responses.neutral.text);
  });
});

