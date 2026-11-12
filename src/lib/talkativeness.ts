import type { ResponseTone, SuggestedResponse } from "./types";

export interface TalkativenessMode {
  label: string;
  tier: "short" | "balanced" | "elaborate";
}

/**
 * Returns the UI mode label corresponding to the 0..100 talkativeness slider.
 */
export function getTalkativenessMode(talkativeness: number): TalkativenessMode {
  if (talkativeness <= 30) {
    return { label: "Modo monosílabo", tier: "short" };
  }
  if (talkativeness >= 71) {
    return { label: "Modo elocuente", tier: "elaborate" };
  }
  return { label: "Modo equilibrado", tier: "balanced" };
}

function condenseText(text: string, tone: ResponseTone, level: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const firstClause = cleaned.split(/[.!?]/)[0]?.trim() || cleaned;
  const words = firstClause.split(" ").filter(Boolean);

  if (level <= 12) {
    const ultraShort: Record<ResponseTone, string> = {
      diplomatic: "Dale, gracias!",
      passiveAggressive: "Ok, veo.",
      neutral: "Ok, dale.",
    };
    return ultraShort[tone];
  }

  const maxWords = Math.max(4, Math.round(4 + (level / 30) * 5));
  if (words.length <= maxWords) {
    return `${words.join(" ")}.`;
  }
  return `${words.slice(0, maxWords).join(" ")}.`;
}

function expandText(text: string, tone: ResponseTone, level: number): string {
  const base = text.trim();
  const extraTails: Record<ResponseTone, [string, string]> = {
    diplomatic: [
      "Avisame cualquier detalle que falte así lo dejamos todo encaminado.",
      "Contá conmigo para resolverlo sin apuro pero con todo claro desde hoy.",
    ],
    passiveAggressive: [
      "Igual, por las dudas, mandame todo junto en un solo mensaje la próxima.",
      "Así no tenemos que leer cuarenta mensajes más para llegar al mismo punto.",
    ],
    neutral: [
      "Si surge algún cambio de horario o monto, avisame por acá.",
      "Dejemos confirmado ese punto así queda cerrado para todos.",
    ],
  };

  const [firstAdd, secondAdd] = extraTails[tone];
  if (level >= 88) {
    return `${base} ${firstAdd} ${secondAdd}`;
  }
  return `${base} ${firstAdd}`;
}

/**
 * Dynamically adapts suggested responses according to the 0..100 talkativeness slider.
 */
export function adjustResponsesByTalkativeness(
  responses: Record<ResponseTone, SuggestedResponse>,
  talkativeness: number,
): Record<ResponseTone, SuggestedResponse> {
  const clamped = Math.max(0, Math.min(100, talkativeness));
  const mode = getTalkativenessMode(clamped);

  if (mode.tier === "balanced") {
    return responses;
  }

  const transform = (tone: ResponseTone): SuggestedResponse => {
    const original = responses[tone];
    const adjustedText =
      mode.tier === "short"
        ? condenseText(original.text, tone, clamped)
        : expandText(original.text, tone, clamped);

    return {
      ...original,
      text: adjustedText,
    };
  };

  return {
    diplomatic: transform("diplomatic"),
    passiveAggressive: transform("passiveAggressive"),
    neutral: transform("neutral"),
  };
}

