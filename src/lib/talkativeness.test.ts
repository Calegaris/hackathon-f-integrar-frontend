import { describe, expect, it } from "vitest";
import {
  adjustResponsesByTalkativeness,
  getTalkativenessMode,
} from "./talkativeness";
import type { ResponseTone, SuggestedResponse } from "./types";

const BASE_RESPONSES: Record<ResponseTone, SuggestedResponse> = {
  diplomatic: {
    tone: "diplomatic",
    label: "Diplomática",
    text: "¡Gracias por pasar los números! Apenas me libere reviso el monto y te transfiero sin falta.",
  },
  passiveAggressive: {
    tone: "passiveAggressive",
    label: "Pasivo-agresiva",
    text: "Recibido el presupuesto. Cuando me pases el alias exacto veo si llego antes de fin de mes.",
  },
  neutral: {
    tone: "neutral",
    label: "Neutra",
    text: "Anotado el monto. Pasame el alias y te transfiero hoy.",
  },
};

describe("talkativeness slider adaptation", () => {
  it("preserves exact responses in the balanced middle range", () => {
    expect(getTalkativenessMode(50).tier).toBe("balanced");
    const adjusted = adjustResponsesByTalkativeness(BASE_RESPONSES, 50);
    expect(adjusted).toBe(BASE_RESPONSES);
  });

  it("shortens responses smoothly at low talkativeness levels", () => {
    expect(getTalkativenessMode(10).tier).toBe("short");
    const ultraLow = adjustResponsesByTalkativeness(BASE_RESPONSES, 5);
    expect(ultraLow.neutral.text.length).toBeLessThan(
      BASE_RESPONSES.neutral.text.length,
    );
    expect(ultraLow.diplomatic.text.length).toBeLessThan(
      BASE_RESPONSES.diplomatic.text.length,
    );
  });

  it("expands responses with tone-consistent elaboration at high talkativeness levels", () => {
    expect(getTalkativenessMode(90).tier).toBe("elaborate");
    const high = adjustResponsesByTalkativeness(BASE_RESPONSES, 92);
    expect(high.diplomatic.text.length).toBeGreaterThan(
      BASE_RESPONSES.diplomatic.text.length,
    );
    expect(high.passiveAggressive.text.length).toBeGreaterThan(
      BASE_RESPONSES.passiveAggressive.text.length,
    );
    expect(high.neutral.text.length).toBeGreaterThan(
      BASE_RESPONSES.neutral.text.length,
    );
  });
});

