import type { ChatKind, ParsedChat, ParsedMessage, ParseResult } from "./types";

const STANDARD_TXT_LINE_REGEX =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2})\s*-\s*(.+)$/;

const IOS_BRACKET_LINE_REGEX =
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s*m\.?)?)\]\s*(.+)$/i;

const MARKDOWN_MESSAGE_LINE_REGEX =
  /^\[(\d{1,2}:\d{2}\s*(?:AM|PM))\]\s*\*\*(.+?):\*\*\s*(.*)$/i;

const MARKDOWN_DATE_HEADING_REGEX =
  /^##\s+([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s*$/;

const MARKDOWN_EXPORT_DATE_REGEX =
  /^Export date:\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i;

const MARKDOWN_QUOTE_LINE_REGEX = /^>\s*.*$/;

const ENGLISH_MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

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
  /^_?waiting for this message\. this may take a while\.?_?$/i,
  /^esperando este mensaje/i,
];

const MEDIA_OMITTED_PATTERNS: RegExp[] = [
  /^<multimedia omitido>$/i,
  /^<media omitted>$/i,
  /^imagen omitida$/i,
  /^video omitido$/i,
  /^sticker omitido$/i,
  /^documento omitido$/i,
  /^gif omitido$/i,
  /^\[(?:sticker|image|video|document|gif|photo|contact card|location)\]$/i,
];

const MEDIA_TAG_PREFIX_REGEX =
  /^\[(sticker|image|video|document|gif|photo)\]\s*/i;

const AUDIO_OMITTED_PATTERNS: RegExp[] = [
  /^<?audio omitido>?$/i,
  /^<?audio omitted>?$/i,
  /^nota de voz omitida$/i,
  /^\[(?:voice message|audio)\]$/i,
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

function formatRawDate(day: number, month: number, fullYear: number): string {
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const yy = String(fullYear % 100).padStart(2, "0");
  return `${dd}/${mm}/${yy}`;
}

function parseEnglishDate(
  monthName: string,
  dayStr: string,
  yearStr: string,
): string | null {
  const month = ENGLISH_MONTHS[monthName.toLowerCase()];
  if (!month) return null;
  const day = Number.parseInt(dayStr, 10);
  const year = Number.parseInt(yearStr, 10);
  if (!Number.isFinite(day) || !Number.isFinite(year)) return null;
  return formatRawDate(day, month, year);
}

function normalizeTimeTo24h(rawTime: string): string {
  const trimmed = rawTime.trim();
  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])\.?\s*m\.?$/i);
  if (!amPmMatch) {
    // Strip optional seconds on 24h strings.
    const plainMatch = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (!plainMatch) return trimmed;
    return `${plainMatch[1].padStart(2, "0")}:${plainMatch[2]}`;
  }

  let hour = Number.parseInt(amPmMatch[1], 10);
  const minute = amPmMatch[2];
  const period = amPmMatch[3].toLowerCase();

  if (period === "p" && hour < 12) {
    hour += 12;
  } else if (period === "a" && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function parseWhatsAppTimestamp(rawDate: string, rawTime24h: string): Date {
  const [dayStr, monthStr, yearStr] = rawDate.split("/");
  const [hourStr, minuteStr] = rawTime24h.split(":");

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

interface RawEntry {
  rawDate: string;
  rawTime: string;
  author: string | null;
  lines: string[];
  isMarkdownFormat: boolean;
}

function extractRawEntries(lines: string[]): RawEntry[] {
  const now = new Date();
  let currentContextDate = formatRawDate(
    now.getDate(),
    now.getMonth() + 1,
    now.getFullYear(),
  );

  const entries: RawEntry[] = [];
  let activeEntry: RawEntry | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/[\u200e\u200f\u202a-\u202e]/g, "");
    const trimmed = line.trim();

    // 1. Markdown export metadata / date headings
    const exportDateMatch = trimmed.match(MARKDOWN_EXPORT_DATE_REGEX);
    if (exportDateMatch) {
      const parsedDate = parseEnglishDate(
        exportDateMatch[1],
        exportDateMatch[2],
        exportDateMatch[3],
      );
      if (parsedDate) currentContextDate = parsedDate;
      activeEntry = null;
      continue;
    }

    const headingDateMatch = trimmed.match(MARKDOWN_DATE_HEADING_REGEX);
    if (headingDateMatch) {
      const parsedDate = parseEnglishDate(
        headingDateMatch[1],
        headingDateMatch[2],
        headingDateMatch[3],
      );
      if (parsedDate) currentContextDate = parsedDate;
      activeEntry = null;
      continue;
    }

    if (
      /^#\s+WhatsApp Chat Export:/i.test(trimmed) ||
      trimmed === "---"
    ) {
      activeEntry = null;
      continue;
    }

    // 2. Markdown message header: [10:45 AM] **Author:** body
    const mdMatch = trimmed.match(MARKDOWN_MESSAGE_LINE_REGEX);
    if (mdMatch) {
      const [, rawTime12, rawAuthor, inlineBody] = mdMatch;
      const entry: RawEntry = {
        rawDate: currentContextDate,
        rawTime: normalizeTimeTo24h(rawTime12),
        author: rawAuthor.trim(),
        lines: inlineBody ? [inlineBody] : [],
        isMarkdownFormat: true,
      };
      entries.push(entry);
      activeEntry = entry;
      continue;
    }

    // 3. Standard WhatsApp TXT format: dd/mm/aa, hh:mm - Author: body
    const txtMatch = line.match(STANDARD_TXT_LINE_REGEX);
    if (txtMatch) {
      const [, rawDate, rawTime, rest] = txtMatch;
      const split = splitAuthorAndBody(rest);
      const entry: RawEntry = {
        rawDate,
        rawTime: normalizeTimeTo24h(rawTime),
        author: split ? split.author : null,
        lines: [split ? split.body : rest],
        isMarkdownFormat: false,
      };
      entries.push(entry);
      activeEntry = entry;
      continue;
    }

    // 4. iOS bracket format: [dd/mm/aa, hh:mm(:ss)] Author: body
    const iosMatch = line.match(IOS_BRACKET_LINE_REGEX);
    if (iosMatch) {
      const [, rawDate, rawTime, rest] = iosMatch;
      const split = splitAuthorAndBody(rest);
      const entry: RawEntry = {
        rawDate,
        rawTime: normalizeTimeTo24h(rawTime),
        author: split ? split.author : null,
        lines: [split ? split.body : rest],
        isMarkdownFormat: false,
      };
      entries.push(entry);
      activeEntry = entry;
      continue;
    }

    // 5. Continuation / quoted reply line
    if (!activeEntry) continue;

    if (activeEntry.isMarkdownFormat) {
      if (trimmed.length === 0 || MARKDOWN_QUOTE_LINE_REGEX.test(trimmed)) {
        continue;
      }
      activeEntry.lines.push(trimmed);
    } else {
      const trimmedEnd = line.trimEnd();
      if (trimmedEnd.length > 0 || activeEntry.lines.length > 0) {
        activeEntry.lines.push(trimmedEnd);
      }
    }
  }

  return entries;
}

/**
 * Parses an exported WhatsApp chat text (TXT or Markdown export) into structured messages.
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
  const rawEntries = extractRawEntries(lines);

  const messages: ParsedMessage[] = [];
  const participantSet = new Set<string>();

  let ignoredSystemCount = 0;
  let mediaOmittedCount = 0;
  let audioOmittedCount = 0;

  for (const entry of rawEntries) {
    if (!entry.author) {
      ignoredSystemCount += 1;
      continue;
    }

    let bodyText = entry.lines.join("\n").trim();
    if (!bodyText) {
      ignoredSystemCount += 1;
      continue;
    }

    if (matchesAny(bodyText, AUDIO_OMITTED_PATTERNS)) {
      audioOmittedCount += 1;
      mediaOmittedCount += 1;
      ignoredSystemCount += 1;
      continue;
    }

    if (
      matchesAny(bodyText, MEDIA_OMITTED_PATTERNS) ||
      matchesAny(bodyText, SYSTEM_MESSAGE_PATTERNS) ||
      matchesAny(bodyText, DELETED_MESSAGE_PATTERNS)
    ) {
      if (matchesAny(bodyText, MEDIA_OMITTED_PATTERNS)) {
        mediaOmittedCount += 1;
      }
      ignoredSystemCount += 1;
      continue;
    }

    // Handle media tag followed by an actual text caption (e.g. "[Image] ES MAÑANAAAAAAA").
    if (MEDIA_TAG_PREFIX_REGEX.test(bodyText)) {
      mediaOmittedCount += 1;
      bodyText = bodyText.replace(MEDIA_TAG_PREFIX_REGEX, "").trim();
      if (!bodyText) {
        ignoredSystemCount += 1;
        continue;
      }
    }

    participantSet.add(entry.author);

    messages.push({
      id: `msg-${messages.length + 1}`,
      rawDate: entry.rawDate,
      rawTime: entry.rawTime,
      timestamp: parseWhatsAppTimestamp(entry.rawDate, entry.rawTime),
      author: entry.author,
      text: bodyText,
      wordCount: countWords(bodyText),
    });
  }

  if (messages.length === 0) {
    return {
      ok: false,
      error: {
        code: "NO_VALID_MESSAGES",
        message:
          "No se reconocieron mensajes con el formato esperado (dd/mm/aa, hh:mm - Autor: mensaje o [hh:mm AM/PM] **Autor:** mensaje).",
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
