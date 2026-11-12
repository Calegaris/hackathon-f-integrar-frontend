import {
  buildMetric,
  formatCurrencyArs,
  formatTwoDecimals,
  roundToTwo,
} from "./metric-format";
import type {
  AuthorParticipation,
  DesirableMetrics,
  IdealReplyLength,
  MandatoryMetrics,
  ParsedChat,
  ParsedMessage,
  PendingQuestion,
  ReceivableItem,
  RecommendedReplyWindow,
  TacticalInsights,
  TimelinePoint,
} from "./types";

const URGENCY_WORDS_REGEX =
  /\b(urgente|ya|hoy|necesito|ahora|contestame|respondeme|si o si|s[ií] o s[ií]|cuanto antes)\b/i;

const JAJA_TOKEN_REGEX =
  /\b(?:(?=[aj]*j)(?=[aj]*a)[aj]{4,}|(?=[js]*j)(?=[js]*s)[js]{4,})\b/gi;
const FUNNY_CONTEXT_REGEX =
  /\b(?:(?=[aj]*j)(?=[aj]*a)[aj]{4,}|(?=[js]*j)(?=[js]*s)[js]{4,}|xd|jijo)\b|[😂🤣😹]/i;

const GOSSIP_WORDS_REGEX =
  /\b(che|viste|no sab[eé]s|escuchame|posta|chisme|contame|sab[ií]as|te enteraste|al parecer|supuestamente)\b/gi;

const AMOUNT_TOKEN_REGEX =
  /(?:\$\s*|usd\s*|u\$s\s*|ars\s*)(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d{1,2})?)|(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d{1,2})?)\s*(?:pesos|lucas|usd|d[oó]lares|dolares)\b|(?:sale|cuesta|vale|por|en|son|pagamos|puso)\s+(\d+(?:[.,]\d+)?)\s*k\b/gi;

const DATE_HINT_REGEX =
  /\b(hoy|ma[ñn]ana|pasado ma[ñn]ana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|esta noche|este finde|fin de semana)\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b\d{1,2}:\d{2}\b/i;

const CONCEPT_HINT_REGEX =
  /\b(vaquita(?:\s+del?\s+\w+)?|regalo|asado|carne|impresi[oó]n|alquiler|se[ñn]a|entrada|entradas|birra|bebida|gaseosas|hielo|taxi|uber|nafta|cuota|alias|delivery|pizza|empanadas|viaje)\b/i;

const REPEATED_PUNCTUATION_REGEX = /!{2,}|\?{2,}|[!?]{2,}/g;
const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;

export interface DesirableAnalysisContext {
  perspectiveAuthor?: string;
  referenceTime?: Date;
  averageResponseSeconds: number;
  mandatory: MandatoryMetrics;
}

function countGossipHits(text: string): number {
  const matches = text.match(GOSSIP_WORDS_REGEX);
  return matches ? matches.length : 0;
}

function computeUrgencyScore(messages: ParsedMessage[]): number {
  const total = messages.length;
  if (total === 0) return 0;

  let urgencyHits = 0;
  for (const msg of messages) {
    if (URGENCY_WORDS_REGEX.test(msg.text)) {
      urgencyHits += 1;
    }
  }

  const lastAuthor = messages[total - 1].author;
  let trailingQuestions = 0;
  for (let i = total - 1; i >= 0; i -= 1) {
    if (messages[i].author !== lastAuthor) break;
    if (/[?¿]/.test(messages[i].text)) {
      trailingQuestions += 1;
    }
  }

  return Math.min(100, (urgencyHits / total) * 70 + Math.min(40, trailingQuestions * 25));
}

function computeLaughlessJajaScore(messages: ParsedMessage[]): number {
  let totalJaja = 0;
  let nonFunnyMessages = 0;

  for (const msg of messages) {
    const jajaMatches = msg.text.match(JAJA_TOKEN_REGEX);
    if (jajaMatches) {
      totalJaja += jajaMatches.length;
    }
    if (!FUNNY_CONTEXT_REGEX.test(msg.text)) {
      nonFunnyMessages += 1;
    }
  }

  if (totalJaja === 0) return 0;
  if (nonFunnyMessages === 0) return 100;
  return Math.min(100, (totalJaja / nonFunnyMessages) * 100);
}

function computeLateNightPercentage(messages: ParsedMessage[]): number {
  if (messages.length === 0) return 0;

  let lateNightCount = 0;
  for (const msg of messages) {
    const hour = msg.timestamp.getHours();
    const minute = msg.timestamp.getMinutes();
    if ((hour >= 2 && hour < 6) || (hour === 6 && minute === 0)) {
      lateNightCount += 1;
    }
  }

  return (lateNightCount / messages.length) * 100;
}

function computeAuthorRanking(messages: ParsedMessage[]): AuthorParticipation[] {
  const total = messages.length;
  if (total === 0) return [];

  const counts = new Map<string, number>();
  for (const msg of messages) {
    counts.set(msg.author, (counts.get(msg.author) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([author, messageCount]) => {
      const percentage = roundToTwo((messageCount / total) * 100);
      return {
        author,
        messageCount,
        percentage,
        formattedPercentage: formatTwoDecimals(percentage),
      };
    });
}

/**
 * Computes desirable (D) metrics when chat has at least 5 messages (RF-12, RF-13, RF-28..31).
 */
export function computeDesirableMetrics(chat: ParsedChat): DesirableMetrics {
  const totalWords = chat.messages.reduce((sum, msg) => sum + msg.wordCount, 0);
  let totalGossipHits = 0;
  for (const msg of chat.messages) {
    totalGossipHits += countGossipHits(msg.text);
  }

  const urgencyIndex = buildMetric(
    "urgencyIndex",
    "Índice de urgencia",
    "D",
    computeUrgencyScore(chat.messages),
    "percent",
    (formatted) => `${formatted} %`,
  );

  const laughlessJajaPercentage = buildMetric(
    "laughlessJajaPercentage",
    "Jajas sin gracia",
    "D",
    computeLaughlessJajaScore(chat.messages),
    "percent",
    (formatted) => `${formatted} %`,
  );

  const audioCouldBeTextCount = buildMetric(
    "audioCouldBeTextCount",
    "Audios que podían ser un texto",
    "D",
    chat.audioOmittedCount,
    "count",
    (formatted) => `${formatted} audios`,
  );

  const lateNightPercentage = buildMetric(
    "lateNightPercentage",
    "Mensajes de madrugada",
    "D",
    computeLateNightPercentage(chat.messages),
    "percent",
    (formatted) => `${formatted} %`,
  );

  const rawGossip = totalWords > 0 ? (totalGossipHits / totalWords) * 100 : 0;
  const gossipTemperature = buildMetric(
    "gossipTemperature",
    "Temperatura del chisme",
    "D",
    rawGossip,
    "per100Words",
    (formatted) => `${formatted} cada 100 palabras`,
  );

  return {
    urgencyIndex,
    laughlessJajaPercentage,
    audioCouldBeTextCount,
    lateNightPercentage,
    gossipTemperature,
    authorRanking: computeAuthorRanking(chat.messages),
  };
}

export function resolvePerspectiveAuthor(
  chat: ParsedChat,
  requested?: string,
): string | null {
  if (requested && chat.participants.includes(requested)) {
    return requested;
  }

  const selfAlias = chat.participants.find((p) =>
    /^(?:you|t[uú]|vos)$/i.test(p.trim()),
  );
  if (selfAlias) {
    return selfAlias;
  }

  if (chat.participants.length < 2) {
    return chat.participants[0] ?? null;
  }

  const lastAuthor = chat.messages[chat.messages.length - 1]?.author;
  for (let i = chat.messages.length - 2; i >= 0; i -= 1) {
    if (chat.messages[i].author !== lastAuthor) {
      return chat.messages[i].author;
    }
  }

  return chat.participants.find((p) => p !== lastAuthor) ?? null;
}

function formatElapsedHoursMinutes(from: Date, to: Date): {
  hours: number;
  minutes: number;
  text: string;
} {
  const diffMs = Math.max(0, to.getTime() - from.getTime());
  const totalMinutes = diffMs / 60_000;
  let hours = Math.floor(totalMinutes / 60);
  let minutes = roundToTwo(totalMinutes - hours * 60);

  if (minutes >= 60) {
    hours += 1;
    minutes = 0;
  }

  const text = `Te preguntaron esto hace ${hours} horas y ${formatTwoDecimals(minutes)} minutos`;
  return { hours, minutes, text };
}

function extractQuestionSnippet(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const sentences = normalized.split(/(?<=[?¿!.])\s+/);
  const questionSentence = sentences.find((s) => /[?¿]/.test(s)) ?? normalized;
  return questionSentence.length > 120
    ? `${questionSentence.slice(0, 117)}...`
    : questionSentence;
}

function computePendingQuestions(
  chat: ParsedChat,
  perspectiveAuthor: string | null,
  referenceTime: Date,
): PendingQuestion[] {
  if (chat.messages.length === 0) return [];

  const pending: PendingQuestion[] = [];

  for (let i = 0; i < chat.messages.length; i += 1) {
    const msg = chat.messages[i];
    if (!/[?¿]/.test(msg.text)) continue;
    if (perspectiveAuthor && msg.author === perspectiveAuthor) continue;

    // A question is pending if the target author (or anyone else when single-author) never sent a later message.
    const wasAnsweredLater = chat.messages.slice(i + 1).some((later) =>
      perspectiveAuthor
        ? later.author === perspectiveAuthor
        : later.author !== msg.author,
    );

    if (!wasAnsweredLater) {
      const elapsed = formatElapsedHoursMinutes(msg.timestamp, referenceTime);
      pending.push({
        author: msg.author,
        question: extractQuestionSnippet(msg.text),
        rawTime: msg.rawTime,
        elapsedHours: elapsed.hours,
        elapsedMinutes: elapsed.minutes,
        elapsedDisplayText: elapsed.text,
      });
    }
  }

  return pending;
}

function parseLocalizedNumber(rawNumeric: string, isLucasUnit: boolean): number | null {
  let normalized = rawNumeric.trim();
  if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  } else if (/^\d{1,3}(?:,\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "");
  } else {
    normalized = normalized.replace(/\.(?=\d{3}(?:,|$))/g, "").replace(",", ".");
  }

  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return isLucasUnit ? value * 1000 : value;
}

function extractReceivables(chat: ParsedChat): {
  items: ReceivableItem[];
  totalFormatted: string;
} {
  const items: ReceivableItem[] = [];
  let total = 0;

  for (const msg of chat.messages) {
    const regex = new RegExp(AMOUNT_TOKEN_REGEX.source, "gi");
    const dateMatch = msg.text.match(DATE_HINT_REGEX);
    const conceptMatch = msg.text.match(CONCEPT_HINT_REGEX);

    let match: RegExpExecArray | null;
    while ((match = regex.exec(msg.text)) !== null) {
      const rawNumber = match[1] ?? match[2] ?? match[3];
      if (!rawNumber) continue;
      const isThousandsUnit =
        /\blucas\b/i.test(match[0]) || /\d\s*k\b/i.test(match[0]);
      const parsedAmount = parseLocalizedNumber(rawNumber, isThousandsUnit);
      if (parsedAmount === null) continue;

      total += parsedAmount;
      const dateHint = dateMatch ? dateMatch[0].toLowerCase() : "fecha a confirmar";
      const concept = conceptMatch
        ? conceptMatch[0].toLowerCase()
        : msg.text
            .replace(match[0], "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 48) || "gasto compartido";

      items.push({
        author: msg.author,
        amountFormatted: formatCurrencyArs(parsedAmount),
        rawAmount: roundToTwo(parsedAmount),
        concept,
        dateHint,
        sourceText: msg.text.replace(/\s+/g, " ").trim(),
      });
    }
  }

  return {
    items,
    totalFormatted: formatCurrencyArs(total),
  };
}

function computeIdealReplyLength(
  chat: ParsedChat,
  perspectiveAuthor: string | null,
): IdealReplyLength {
  const otherMessages = perspectiveAuthor
    ? chat.messages.filter((m) => m.author !== perspectiveAuthor)
    : chat.messages;

  const targetPool = otherMessages.length > 0 ? otherMessages : chat.messages;
  const totalWords = targetPool.reduce((sum, m) => sum + m.wordCount, 0);
  const average = targetPool.length > 0 ? roundToTwo(totalWords / targetPool.length) : 0;
  const formatted = formatTwoDecimals(average);

  const counterpartyLabel =
    chat.kind === "group"
      ? "Promedio del resto del grupo"
      : perspectiveAuthor
        ? `Promedio de ${chat.participants.find((p) => p !== perspectiveAuthor) ?? "la contraparte"}`
        : "Promedio del chat";

  return {
    targetWords: average,
    formattedTargetWords: formatted,
    displayText: `Respondé con máximo ${formatted} palabras`,
    counterpartyLabel,
  };
}

function formatTimeHhMm(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function computeRecommendedReplyWindow(
  chat: ParsedChat,
  perspectiveAuthor: string | null,
  averageResponseSeconds: number,
  referenceTime: Date,
): RecommendedReplyWindow {
  const incomingMessages = perspectiveAuthor
    ? chat.messages.filter((m) => m.author !== perspectiveAuthor)
    : chat.messages;

  const lastIncoming =
    incomingMessages[incomingMessages.length - 1] ??
    chat.messages[chat.messages.length - 1];

  // Fallback to a 15-minute baseline if chat has only one author.
  const baselineMs =
    averageResponseSeconds > 0 ? averageResponseSeconds * 1000 : 15 * 60 * 1000;

  if (!lastIncoming) {
    const nowTime = formatTimeHhMm(referenceTime);
    return {
      recommendedTime: nowTime,
      elapsedPercentage: 0,
      formattedElapsedPercentage: "0,00",
      isReadyNow: true,
      displayText: `${nowTime}, sin mensajes entrantes previos`,
    };
  }

  const recommendedDate = new Date(lastIncoming.timestamp.getTime() + baselineMs);
  const recommendedTime = formatTimeHhMm(recommendedDate);
  const elapsedMs = Math.max(
    0,
    referenceTime.getTime() - lastIncoming.timestamp.getTime(),
  );
  const elapsedPercentage = roundToTwo((elapsedMs / baselineMs) * 100);
  const formattedElapsedPercentage = formatTwoDecimals(elapsedPercentage);
  const isReadyNow = elapsedPercentage >= 100;

  const displayText = isReadyNow
    ? `Ya podés responder (${recommendedTime} pasó), porque ya transcurrió el ${formattedElapsedPercentage} % de su tiempo medio de respuesta`
    : `${recommendedTime}, porque ya pasó el ${formattedElapsedPercentage} % de su tiempo medio de respuesta`;

  return {
    recommendedTime,
    elapsedPercentage,
    formattedElapsedPercentage,
    isReadyNow,
    displayText,
  };
}

function computeMessageDramaSignal(msg: ParsedMessage): number {
  if (msg.wordCount === 0) return 0;
  const punct = msg.text.match(REPEATED_PUNCTUATION_REGEX)?.length ?? 0;
  const emojis = msg.text.match(EMOJI_REGEX)?.length ?? 0;
  const upperWords = msg.text
    .split(/\s+/)
    .filter((w) => w.length >= 2 && w === w.toUpperCase() && w !== w.toLowerCase()).length;
  return Math.min(
    100,
    roundToTwo(((upperWords * 2 + punct * 1.5 + emojis * 1.2) / msg.wordCount) * 100),
  );
}

function computeTimelineSeries(messages: ParsedMessage[]): TimelinePoint[] {
  if (messages.length === 0) return [];
  const bucketCount = Math.min(8, messages.length);
  const bucketSize = messages.length / bucketCount;
  const points: TimelinePoint[] = [];

  for (let i = 0; i < bucketCount; i += 1) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    const slice = messages.slice(start, Math.max(start + 1, end));
    const sliceWords = slice.reduce((sum, m) => sum + m.wordCount, 0);
    const sliceGossipHits = slice.reduce((sum, m) => sum + countGossipHits(m.text), 0);

    const avgDrama =
      slice.reduce((sum, m) => sum + computeMessageDramaSignal(m), 0) / slice.length;
    const gossipScore =
      sliceWords > 0 ? Math.min(100, roundToTwo((sliceGossipHits / sliceWords) * 400)) : 0;

    points.push({
      label: slice[0].rawTime,
      dramaScore: roundToTwo(avgDrama),
      gossipScore,
    });
  }

  return points;
}

/**
 * Computes optional tactical insights, semicircular fiaca gauge (RF-33),
 * and progressive drama/gossip timeline (RF-16).
 */
export function computeTacticalInsights(
  chat: ParsedChat,
  context: DesirableAnalysisContext,
): TacticalInsights {
  const referenceTime = context.referenceTime ?? new Date();
  const perspectiveAuthor = resolvePerspectiveAuthor(chat, context.perspectiveAuthor);

  const pendingQuestions = computePendingQuestions(
    chat,
    perspectiveAuthor,
    referenceTime,
  );
  const receivablesResult = extractReceivables(chat);
  const idealReplyLength = computeIdealReplyLength(chat, perspectiveAuthor);
  const recommendedReplyWindow = computeRecommendedReplyWindow(
    chat,
    perspectiveAuthor,
    context.averageResponseSeconds,
    referenceTime,
  );

  // Fiaca level (RF-33): weighted blend of filler %, testament length, and audio count, clamped 0..100.
  const fillerWeight = context.mandatory.fillerPercentage.value * 0.55;
  const testamentWeight = Math.min(35, context.mandatory.testamentIndex.value * 1.8);
  const audioWeight = Math.min(15, chat.audioOmittedCount * 7.5);
  const rawFiaca = Math.min(100, fillerWeight + testamentWeight + audioWeight);

  const fiacaLevel = buildMetric(
    "fiacaLevel",
    "Nivel de fiaca",
    "O",
    rawFiaca,
    "percent",
    (formatted) => `${formatted} %`,
  );

  return {
    perspectiveAuthor,
    pendingQuestions,
    receivables: receivablesResult.items,
    totalReceivablesFormatted: receivablesResult.totalFormatted,
    idealReplyLength,
    recommendedReplyWindow,
    fiacaLevel,
    timelineSeries: computeTimelineSeries(chat.messages),
  };
}

