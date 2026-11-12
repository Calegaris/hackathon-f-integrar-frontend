import { formatTwoDecimals, roundToTwo } from "./metrics";
import { parseWhatsAppChat } from "./parser";
import type {
  AnalyzeApiResponse,
  FallbackReason,
  ParsedChat,
  ReplyVerdict,
  ResponseTone,
  SuggestedResponse,
} from "./types";

export type FallbackCategory = "money" | "date" | "complaint" | "question" | "general";

const MONEY_REGEX =
  /(?:\$|usd|ars|pesos|plata|lucas|alias|cbu|cvu|transfer[ií]|transferir|pagar|pago|se[ñn]a|precio|cu[aá]nto\s+(?:es|sale|ponemos)|guita)/i;

const DATE_TIME_REGEX =
  /\b(hoy|ma[ñn]ana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|hora|cu[aá]ndo|horario|d[ií]a|fecha|tarde|noche)\b|\b\d{1,2}:\d{2}\b/i;

const COMPLAINT_REGEX =
  /\b(urgente|siempre|nunca|harto|harta|cansado|cansada|colgado|colgaste|otra vez|problema|queja|molesto|molesta|reclamo|desastre|imposible|tarde)\b|!{2,}/i;

const URGENCY_REGEX =
  /\b(urgente|ya|hoy|necesito|ahora|contestame|respondeme|si o si|s[ií] o s[ií]|cuanto antes)\b/i;

interface TemplateBundle {
  summary: (chat: ParsedChat | null) => string;
  responses: Record<ResponseTone, string[]>;
}

const TEMPLATES: Record<FallbackCategory, TemplateBundle> = {
  money: {
    summary: (chat) =>
      chat && chat.kind === "group"
        ? "Están dando vueltas para definir quién pone la plata, cuánto toca por cabeza y cuándo transfieren."
        : "Detrás de tanto rodeo, el punto central es confirmar un monto pendiente y coordinar el pago.",
    responses: {
      diplomatic: [
        "¡Gracias por pasar los números! Apenas me libere reviso el monto y te transfiero sin falta.",
        "Perfecto, ya me anoté el importe. Te confirmo en cuanto haga la transferencia así lo cerramos.",
      ],
      passiveAggressive: [
        "Recibido el presupuesto. Cuando me pases el alias exacto veo si llego antes de fin de mes.",
        "Qué claridad financiera, che. Anotado; en cuanto tenga un segundo libre hago cuentas y te aviso.",
      ],
      neutral: [
        "Anotado el monto. Pasame el alias y te transfiero hoy.",
        "Entendido el importe. Confirmame los datos de pago y lo resuelvo.",
      ],
    },
  },
  date: {
    summary: (chat) =>
      chat && chat.kind === "group"
        ? "Quieren cerrar día, horario y logística del encuentro, pero nadie termina de confirmar."
        : "Necesitan que confirmes disponibilidad de día y horario para dejar cerrado el plan.",
    responses: {
      diplomatic: [
        "¡Dale, buenísimo! Por mi parte ese horario me viene genial, dejémoslo confirmado.",
        "¡Gracias por coordinarlo! Me acomodo a esa fecha y horario, contá conmigo.",
      ],
      passiveAggressive: [
        "Si finalmente logran ponerse de acuerdo con la hora, avisen y aparezco.",
        "Qué velocidad para definir un horario, un récord. Dejame ver la agenda y te confirmo.",
      ],
      neutral: [
        "Confirmado para ese día y horario. Nos vemos ahí.",
        "Puedo en ese horario. Quedamos así entonces.",
      ],
    },
  },
  complaint: {
    summary: () =>
      "Hay tensión acumulada y un reclamo implícito por demoras o falta de respuesta; esperan una reacción concreta.",
    responses: {
      diplomatic: [
        "Tenés razón con el apuro, disculpá la demora. Ya mismo me pongo con esto y te doy una solución.",
        "Entiendo perfectamente la molestia. Gracias por avisarme, lo priorizo ahora y te confirmo.",
      ],
      passiveAggressive: [
        "Tranquilo/a, respiremos hondo que tampoco se incendió nada. Cuando termine lo que estoy haciendo lo veo.",
        "Anotado el nivel de urgencia dramática. Lo reviso en cuanto pueda, gracias por la paciencia.",
      ],
      neutral: [
        "Recibido. Lo reviso ahora y te contesto con una definición concreta.",
        "Entendido el punto. Me ocupo hoy y te aviso apenas esté resuelto.",
      ],
    },
  },
  question: {
    summary: () =>
      "Después de varios mensajes de contexto, hay una pregunta puntual sin responder esperando definición.",
    responses: {
      diplomatic: [
        "¡Perdón que recién lo veo! Sí, contá con eso; cualquier detalle que falte lo vamos viendo.",
        "¡Buenas! Ahí leí todo: la respuesta corta es sí, avisame cómo preferís seguir.",
      ],
      passiveAggressive: [
        "Podrías haber empezado directamente por la pregunta del final y ahorrábamos diez minutos. Ahí lo veo.",
        "¡Qué novela! Para resumir: lo chequeo y en un rato te contesto puntual.",
      ],
      neutral: [
        "Recién leo. Sí, por mi lado está todo ok; avisame si hace falta algo más.",
        "Visto. Lo confirmo en un rato y te respondo directo sobre eso.",
      ],
    },
  },
  general: {
    summary: (chat) =>
      chat && chat.kind === "group"
        ? "Mucho ruido grupal y poca definición operativa; conviene cerrar el tema en dos líneas."
        : "Intercambio largo con bastante relleno; no hay una urgencia crítica, solo cierre cordial.",
    responses: {
      diplomatic: [
        "¡Qué buen resumen de novedades! Gracias por mantenerme al tanto, seguimos en contacto.",
        "¡Genial, me alegro mucho! Cualquier cosa que necesiten coordinar me avisan.",
      ],
      passiveAggressive: [
        "Leído todo el testamento con atención. Impresionante poder de síntesis. Cualquier novedad avisen.",
        "Qué nivel de detalle, casi me tomo un café leyendo. Quedo atento por si pasa algo concreto.",
      ],
      neutral: [
        "Recibido todo, gracias por avisar. Quedo atento.",
        "Ok, entendido. Cualquier cosa lo retomamos más tarde.",
      ],
    },
  },
};

/**
 * Computes urgency percentage and traffic-light reply verdict from chat messages (RF-20).
 */
export function computeReplyVerdict(chat: ParsedChat | null, rawText: string): ReplyVerdict {
  if (!chat || chat.messages.length === 0) {
    const hasUrgency = URGENCY_REGEX.test(rawText);
    const hasQuestion = /[?¿]/.test(rawText);
    const score = roundToTwo((hasUrgency ? 45 : 10) + (hasQuestion ? 30 : 0));
    return buildVerdictFromScore(score);
  }

  const total = chat.messages.length;
  let urgencyHits = 0;

  for (const msg of chat.messages) {
    if (URGENCY_REGEX.test(msg.text)) {
      urgencyHits += 1;
    }
  }

  // Count unanswered questions in the trailing tail (messages from the last active author).
  const lastAuthor = chat.messages[total - 1].author;
  let trailingQuestions = 0;
  for (let i = total - 1; i >= 0; i -= 1) {
    if (chat.messages[i].author !== lastAuthor) break;
    if (/[?¿]/.test(chat.messages[i].text)) {
      trailingQuestions += 1;
    }
  }

  const urgencyDensity = (urgencyHits / total) * 70;
  const questionBoost = Math.min(40, trailingQuestions * 25);
  const rawScore = Math.min(100, urgencyDensity + questionBoost);

  return buildVerdictFromScore(roundToTwo(rawScore));
}

function buildVerdictFromScore(score: number): ReplyVerdict {
  const signal = score >= 60 ? "red" : score >= 25 ? "yellow" : "green";
  return {
    shouldReply: signal !== "green",
    urgencyPercentage: score,
    formattedUrgencyPercentage: formatTwoDecimals(score),
    signal,
  };
}

/**
 * Classifies chat content into a deterministic fallback rule category (RF-19).
 */
export function detectFallbackCategory(rawText: string): FallbackCategory {
  const scores: Record<Exclude<FallbackCategory, "general">, number> = {
    money: (rawText.match(new RegExp(MONEY_REGEX.source, "gi")) ?? []).length * 3,
    date: (rawText.match(new RegExp(DATE_TIME_REGEX.source, "gi")) ?? []).length * 2,
    complaint:
      (rawText.match(new RegExp(COMPLAINT_REGEX.source, "gi")) ?? []).length * 2.5,
    question: (rawText.match(/[?¿]/g) ?? []).length * 1.5,
  };

  let bestCategory: FallbackCategory = "general";
  let bestScore = 0;

  for (const [category, score] of Object.entries(scores) as [
    Exclude<FallbackCategory, "general">,
    number,
  ][]) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Generates deterministic rule-based summary and 3 response tones when AI is unavailable (RF-19).
 */
export function generateRuleBasedFallback(
  rawText: string,
  reason: FallbackReason,
  variantSeed = 0,
): AnalyzeApiResponse {
  const parsed = parseWhatsAppChat(rawText);
  const chat = parsed.ok ? parsed.data : null;

  const focusText = chat
    ? chat.messages.map((m) => m.text).join("\n")
    : rawText;

  const category = detectFallbackCategory(focusText);
  const bundle = TEMPLATES[category];
  const verdict = computeReplyVerdict(chat, focusText);

  const pick = (tone: ResponseTone): SuggestedResponse => {
    const options = bundle.responses[tone];
    const index = Math.abs(variantSeed) % options.length;
    const labels: Record<ResponseTone, string> = {
      diplomatic: "Diplomática",
      passiveAggressive: "Pasivo-agresiva",
      neutral: "Neutra",
    };
    return {
      tone,
      label: labels[tone],
      text: options[index],
    };
  };

  return {
    summary: bundle.summary(chat),
    responses: {
      diplomatic: pick("diplomatic"),
      passiveAggressive: pick("passiveAggressive"),
      neutral: pick("neutral"),
    },
    verdict,
    source: "fallback",
    fallbackReason: reason,
  };
}

