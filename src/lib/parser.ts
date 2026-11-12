import type { ChatKind, ParsedChat, ParsedMessage, ParseResult } from "./types";

const WHATSAPP_LINE_REGEX =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2})\s*-\s*(.+)$/;

const SYSTEM_MESSAGE_PATTERNS: RegExp[] = [
  /se cifr[oó] el chat/i,
  /cifrad[oa]s de extremo a extremo/i,
  /end-to-end encrypted/i,
  /cambi[oó] el asunto/i,
  /cambi[oó] el [ií]cono/i,
  /cre[oó] el grupo/i,
  /a[ñn]adi[oó] a/i,
  /agreg[oó] a/i,
  /sali[oó] del grupo/i,
  /elimin[oó] a/i,
  /se uni[oó] usando el enlace/i,
  /cambi[oó] la descripci[oó]n/i,
  /cambi[oó] tu c[oó]digo de seguridad/i,
];

const MEDIA_OMITTED_PATTERNS: RegExp[] = [
  /^<multimedia omitido>$/i,
  /^<media omitted>$/i,
  /^imagen omitida$/i,
  /^video omitido$/i,
  /^sticker omitido$/i,
  /^documento omitido$/i,
  /^gif omitido$/i,
];

const AUDIO_OMITTED_PATTERNS: RegExp[] = [
  /^<?audio omitido>?$/i,
  /^<?audio omitted>?$/i,
  /^nota de voz omitida$/i,
];

const DELETED_MESSAGE_PATTERNS: RegExp[] = [
  /^se elimin[oó] este mensaje\.?$/i,
  /^eliminaste este mensaje\.?$/i,
  /^this message was deleted\.?$/i,
  /^you deleted this message\.?$/i,
];

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function parseWhatsAppTimestamp(rawDate: string, rawTime: string): Date {
  const [dayStr, monthStr, yearStr] = rawDate.split("/");
  const [hourStr, minuteStr] = rawTime.split(":");

  const day = Number.parseInt(dayStr, 10);
  const month = Number.parseInt(monthStr, 10) - 1;
  let year = Number.parseInt(yearStr, 10);
  if (year < 100) {
    year += 2000;
  }

  const hour = Number.parseInt(hourStr, 10);
  const minute = Number.parseInt(minuteStr, 10);

  return new Date(year, month, day, hour, minute, 0, 0);
}

function splitAuthorAndBody(
  rest: string,
): { author: string; body: string } | null {
  const separatorIndex = rest.indexOf(": ");
  if (separatorIndex <= 0) {
    return null;
  }

  const author = rest.slice(0, separatorIndex).trim();
  const body = rest.slice(separatorIndex + 2);
  if (!author) {
    return null;
  }

  return { author, body };
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  const normalized = text.trim();
  return patterns.some((pattern) => pattern.test(normalized));
}

function classifyChatKind(participantCount: number): ChatKind {
  return participantCount >= 3 ? "group" : "individual";
}

/**
 * Parses an exported WhatsApp chat text into structured messages and metadata.
 */
export function parseWhatsAppChat(rawInput: string): ParseResult {
  if (!rawInput || !rawInput.trim()) {
    return {
      ok: false,
      error: {
        code: "EMPTY_INPUT",
        message:
          "El expediente está vacío. Pegá un historial de WhatsApp o cargá un ejemplo.",
      },
    };
  }

  const lines = rawInput.replace(/\r\n/g, "\n").split("\n");
  const messages: ParsedMessage[] = [];
  const participantSet = new Set<string>();

  let ignoredSystemCount = 0;
  let mediaOmittedCount = 0;
  let audioOmittedCount = 0;
  let lastLineWasIgnored = false;

  for (const rawLine of lines) {
    // Strip invisible directional formatting marks sometimes injected by WhatsApp exports.
    const line = rawLine.replace(/[\u200e\u200f\u202a-\u202e]/g, "");
    const match = line.match(WHATSAPP_LINE_REGEX);

    if (!match) {
      if (!lastLineWasIgnored && messages.length > 0) {
        const previous = messages[messages.length - 1];
        const trimmedLine = line.trimEnd();
        if (trimmedLine.length > 0 || previous.text.length > 0) {
          previous.text = `${previous.text}\n${trimmedLine}`;
          previous.wordCount = countWords(previous.text);
        }
      }
      continue;
    }

    const [, rawDate, rawTime, rest] = match;
    const split = splitAuthorAndBody(rest);

    if (!split) {
      ignoredSystemCount += 1;
      lastLineWasIgnored = true;
      continue;
    }

    const { author, body } = split;
    const trimmedBody = body.trim();

    if (matchesAny(trimmedBody, AUDIO_OMITTED_PATTERNS)) {
      audioOmittedCount += 1;
      mediaOmittedCount += 1;
      ignoredSystemCount += 1;
      lastLineWasIgnored = true;
      continue;
    }

    if (
      matchesAny(trimmedBody, MEDIA_OMITTED_PATTERNS) ||
      matchesAny(trimmedBody, SYSTEM_MESSAGE_PATTERNS) ||
      matchesAny(trimmedBody, DELETED_MESSAGE_PATTERNS)
    ) {
      if (matchesAny(trimmedBody, MEDIA_OMITTED_PATTERNS)) {
        mediaOmittedCount += 1;
      }
      ignoredSystemCount += 1;
      lastLineWasIgnored = true;
      continue;
    }

    participantSet.add(author);
    lastLineWasIgnored = false;

    messages.push({
      id: `msg-${messages.length + 1}`,
      rawDate,
      rawTime,
      timestamp: parseWhatsAppTimestamp(rawDate, rawTime),
      author,
      text: body.trim(),
      wordCount: countWords(body),
    });
  }

  if (messages.length === 0) {
    return {
      ok: false,
      error: {
        code: "NO_VALID_MESSAGES",
        message:
          "No se reconocieron mensajes con el formato esperado (dd/mm/aa, hh:mm - Autor: mensaje).",
      },
    };
  }

  const participants = Array.from(participantSet);
  const parsedChat: ParsedChat = {
    kind: classifyChatKind(participants.length),
    participants,
    messages,
    ignoredSystemCount,
    mediaOmittedCount,
    audioOmittedCount,
    hasInsufficientSample: messages.length < 5,
  };

  return { ok: true, data: parsedChat };
}

