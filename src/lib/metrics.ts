import type {
  FormattedMetric,
  LocalAnalysisReport,
  MandatoryMetrics,
  MetricId,
  ParsedChat,
  ParsedMessage,
  SubstanceVsSmokeBreakdown,
} from "./types";

const READING_WPM = 238;
const DEFAULT_SUMMARY_WORD_COUNT = 28;

export const INSUFFICIENT_SAMPLE_NOTICE =
  "Expediente archivado por falta de evidencia";

const ZERO_COMMENTARIES: Record<MetricId, string> = {
  fillerPercentage:
    "0,00 %: eficiencia quirúrgica. Cero humo detectado en el expediente.",
  lifeTimeSaved:
    "00 minutos y 00,00 segundos: chat tan breve que tardaste más en abrir el expediente.",
  dramaLevel:
    "0,00 %: calma sospechosa. Ni un signo de exclamación ni mayúsculas.",
  testamentIndex:
    "Nivel de novela rusa: 0,00. Telegrama puro, cero vocación literaria.",
  averageResponseTime:
    "00 minutos y 00,00 segundos: monólogo detectado, no hubo intercambio entre autores.",
  urgencyIndex:
    "0,00 %: tranquilidad absoluta. Nadie pidió nada para ayer.",
  laughlessJajaPercentage:
    "0,00 %: chat sin una sola risa. Preocupante.",
  audioCouldBeTextCount:
    "0,00: milagro táctico, nadie mandó audios interminables.",
  lateNightPercentage:
    "0,00 %: horario de oficina impecable. Todos durmiendo entre las 2:00 y las 6:00.",
  gossipTemperature:
    "0,00: cero chisme detectado. Nivel de confidencialidad suizo.",
};

const USEFUL_DATE_TIME_REGEX =
  /\b(hoy|ma[ñn]ana|ayer|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|mediod[ií]a|noche|tarde)\b|\b\d{1,2}[:/]\d{1,2}\b/i;

const USEFUL_AMOUNT_OR_NUMBER_REGEX = /(?:\$|usd|ars|pesos|lucas)\b|\d+/i;

const USEFUL_ACTION_VERB_REGEX =
  /\b(vamos|vayamos|hacemos|hago|traigo|llevo|mando|paso|pod[eé]s|puedes|puede|quiero|necesito|decime|avisame|confirm[aá]|mandame|pasame|contest[aá]|contestame|respond[eé]|respondeme|pagar|pago|transfer[ií]|transferir|compramos|compro|reservamos|reservo|quedamos|juntamos|vemos|coordinamos|organizamos|ven[ií]s|salimos|empezamos|terminamos)\b/i;

const REPEATED_PUNCTUATION_REGEX = /!{2,}|\?{2,}|[!?]{2,}/g;
const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;

/**
 * Rounds a number to 2 decimal places, treating non-finite or near-zero numbers cleanly.
 */
export function roundToTwo(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Formats a number with exactly two decimal places using comma separator (RF-08).
 */
export function formatTwoDecimals(value: number): string {
  return roundToTwo(value).toFixed(2).replace(".", ",");
}

/**
 * Formats a duration in seconds as `mm minutos y ss,cc segundos` (RF-10, RF-27).
 */
export function formatDurationMinutesSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Number.isFinite(totalSeconds) ? totalSeconds : 0);
  let minutes = Math.floor(safeSeconds / 60);
  let seconds = roundToTwo(safeSeconds - minutes * 60);

  if (seconds >= 60) {
    minutes += 1;
    seconds = 0;
  }

  const mm = String(minutes).padStart(2, "0");
  const sscc = formatTwoDecimals(seconds).padStart(5, "0");
  return `${mm} minutos y ${sscc} segundos`;
}

function buildMetric(
  id: MetricId,
  label: string,
  priority: "M" | "D" | "O",
  rawValue: number,
  unit: FormattedMetric["unit"],
  nonZeroDisplay: (formattedValue: string, roundedValue: number) => string,
): FormattedMetric {
  const value = roundToTwo(rawValue);
  const isZero = value === 0;
  const formattedValue = formatTwoDecimals(value);
  const zeroCommentary = isZero ? ZERO_COMMENTARIES[id] : null;
  const displayText = isZero
    ? ZERO_COMMENTARIES[id]
    : nonZeroDisplay(formattedValue, value);

  return {
    id,
    label,
    priority,
    value,
    formattedValue,
    unit,
    displayText,
    isZero,
    zeroCommentary,
  };
}

/**
 * Determines whether a message contains actionable or informative substance (RF-09).
 */
export function isUsefulMessage(text: string): boolean {
  if (/[?¿]/.test(text)) return true;
  if (USEFUL_AMOUNT_OR_NUMBER_REGEX.test(text)) return true;
  if (USEFUL_DATE_TIME_REGEX.test(text)) return true;
  if (USEFUL_ACTION_VERB_REGEX.test(text)) return true;
  return false;
}

function countUppercaseWords(text: string): number {
  const tokens = text.split(/\s+/).filter(Boolean);
  let count = 0;
  for (const token of tokens) {
    const lettersOnly = token.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, "");
    if (
      lettersOnly.length >= 2 &&
      lettersOnly === lettersOnly.toUpperCase() &&
      lettersOnly !== lettersOnly.toLowerCase()
    ) {
      count += 1;
    }
  }
  return count;
}

function computeDramaScore(messages: ParsedMessage[], totalWords: number): number {
  if (totalWords === 0) return 0;

  let uppercaseWords = 0;
  let repeatedPunctuation = 0;
  let emojiCount = 0;

  for (const msg of messages) {
    uppercaseWords += countUppercaseWords(msg.text);
    const punctMatches = msg.text.match(REPEATED_PUNCTUATION_REGEX);
    if (punctMatches) {
      repeatedPunctuation += punctMatches.length;
    }
    const emojiMatches = msg.text.match(EMOJI_REGEX);
    if (emojiMatches) {
      emojiCount += emojiMatches.length;
    }
  }

  const weightedSignals =
    uppercaseWords * 2 + repeatedPunctuation * 1.5 + emojiCount * 1.2;
  const percentage = (weightedSignals / totalWords) * 100;
  return Math.min(100, percentage);
}

function computeAverageResponseSeconds(messages: ParsedMessage[]): number {
  let totalDiffSeconds = 0;
  let transitions = 0;

  for (let i = 1; i < messages.length; i += 1) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (curr.author === prev.author) continue;

    const diffMs = curr.timestamp.getTime() - prev.timestamp.getTime();
    if (diffMs >= 0) {
      totalDiffSeconds += diffMs / 1000;
      transitions += 1;
    }
  }

  if (transitions === 0) return 0;
  return totalDiffSeconds / transitions;
}

/**
 * Generates a deterministic tactical case identifier from the parsed chat content.
 */
export function buildCaseNumber(chat: ParsedChat): string {
  let hash = 0;
  const seed = `${chat.kind}:${chat.participants.join(",")}:${chat.messages.length}:${chat.messages[0]?.text ?? ""}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const code = String(hash % 10000).padStart(4, "0");
  return `ART-2026-${code}`;
}

export interface ComputeAnalysisOptions {
  summaryWordCount?: number;
  caseNumber?: string;
}

/**
 * Computes mandatory (M) behavioral metrics for a parsed WhatsApp chat.
 */
export function computeMandatoryMetrics(
  chat: ParsedChat,
  options: ComputeAnalysisOptions = {},
): MandatoryMetrics {
  const totalMessages = chat.messages.length;
  const totalWords = chat.messages.reduce((sum, msg) => sum + msg.wordCount, 0);

  let usefulCount = 0;
  for (const msg of chat.messages) {
    if (isUsefulMessage(msg.text)) {
      usefulCount += 1;
    }
  }
  const fillerCount = totalMessages - usefulCount;
  const rawFillerPct =
    totalMessages > 0 ? (fillerCount / totalMessages) * 100 : 0;
  const rawUsefulPct = totalMessages > 0 ? 100 - roundToTwo(rawFillerPct) : 0;

  const substanceVsSmoke: SubstanceVsSmokeBreakdown = {
    usefulCount,
    fillerCount,
    usefulPercentage: roundToTwo(rawUsefulPct),
    fillerPercentage: roundToTwo(rawFillerPct),
    formattedUsefulPercentage: formatTwoDecimals(rawUsefulPct),
    formattedFillerPercentage: formatTwoDecimals(rawFillerPct),
  };

  const fillerPercentage = buildMetric(
    "fillerPercentage",
    "Relleno innecesario",
    "M",
    rawFillerPct,
    "percent",
    (formatted) => `${formatted} %`,
  );

  const summaryWords = options.summaryWordCount ?? DEFAULT_SUMMARY_WORD_COUNT;
  const rawSavedSeconds = Math.max(
    0,
    ((totalWords - summaryWords) / READING_WPM) * 60,
  );
  const lifeTimeSaved = buildMetric(
    "lifeTimeSaved",
    "Tiempo de vida ahorrado",
    "M",
    rawSavedSeconds / 60,
    "duration",
    () => formatDurationMinutesSeconds(rawSavedSeconds),
  );

  const rawDrama = computeDramaScore(chat.messages, totalWords);
  const dramaLevel = buildMetric(
    "dramaLevel",
    "Nivel de drama",
    "M",
    rawDrama,
    "percent",
    (formatted) => `${formatted} %`,
  );

  const rawTestament = totalMessages > 0 ? totalWords / totalMessages : 0;
  const testamentIndex = buildMetric(
    "testamentIndex",
    "Índice de testamento",
    "M",
    rawTestament,
    "ratio",
    (formatted) => `Nivel de novela rusa: ${formatted}`,
  );

  const avgResponseSeconds = computeAverageResponseSeconds(chat.messages);
  const averageResponseTime = buildMetric(
    "averageResponseTime",
    "Tiempo medio de respuesta",
    "M",
    avgResponseSeconds / 60,
    "duration",
    () => formatDurationMinutesSeconds(avgResponseSeconds),
  );

  return {
    fillerPercentage,
    lifeTimeSaved,
    dramaLevel,
    testamentIndex,
    averageResponseTime,
    substanceVsSmoke,
  };
}

/**
 * Produces the complete offline analysis report for a parsed WhatsApp chat.
 */
export function analyzeParsedChat(
  chat: ParsedChat,
  options: ComputeAnalysisOptions = {},
): LocalAnalysisReport {
  const mandatory = computeMandatoryMetrics(chat, options);
  const caseNumber = options.caseNumber ?? buildCaseNumber(chat);

  return {
    caseNumber,
    chat,
    insufficientSampleNotice: chat.hasInsufficientSample
      ? INSUFFICIENT_SAMPLE_NOTICE
      : null,
    mandatory,
    // Desirable metrics will be attached in Phase 4 when chat has >= 5 messages.
    desirable: null,
  };
}
