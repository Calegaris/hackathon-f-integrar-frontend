import { describe, expect, it } from "vitest";
import {
  analyzeParsedChat,
  formatDurationMinutesSeconds,
  formatTwoDecimals,
  INSUFFICIENT_SAMPLE_NOTICE,
} from "./metrics";
import { parseWhatsAppChat } from "./parser";

describe("formatting helpers", () => {
  it("formats numbers with exact two decimal places and comma separator (RF-08)", () => {
    expect(formatTwoDecimals(0)).toBe("0,00");
    expect(formatTwoDecimals(14.866)).toBe("14,87");
    expect(formatTwoDecimals(100)).toBe("100,00");
  });

  it("formats duration in minutes and two-decimal seconds (RF-10, RF-27)", () => {
    expect(formatDurationMinutesSeconds(0)).toBe("00 minutos y 00,00 segundos");
    expect(formatDurationMinutesSeconds(2833.08)).toBe(
      "47 minutos y 13,08 segundos",
    );
  });
});

describe("analyzeParsedChat mandatory metrics", () => {
  it("flags insufficient sample when chat has fewer than 5 messages and computes only M metrics (RF-32)", () => {
    const raw = [
      "12/11/26, 10:00 - Ana: Hola",
      "12/11/26, 10:05 - Bruno: Como va?",
      "12/11/26, 10:10 - Ana: Bien",
    ].join("\n");

    const parsed = parseWhatsAppChat(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const report = analyzeParsedChat(parsed.data);
    expect(report.insufficientSampleNotice).toBe(INSUFFICIENT_SAMPLE_NOTICE);
    expect(report.desirable).toBeNull();
    expect(report.mandatory.fillerPercentage.formattedValue).toBe("66,67");
  });

  it("applies the zero rule with humorous commentary when a metric equals 0,00 (RF-25)", () => {
    const raw = [
      "12/11/26, 10:00 - Ana: Nos vemos a las 10?",
      "12/11/26, 10:02 - Bruno: Si, llevo 500 pesos",
      "12/11/26, 10:03 - Ana: Vamos hoy al centro?",
      "12/11/26, 10:04 - Bruno: Confirmado a las 18",
      "12/11/26, 10:05 - Ana: Paso a las 17",
    ].join("\n");

    const parsed = parseWhatsAppChat(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const report = analyzeParsedChat(parsed.data);
    expect(report.mandatory.fillerPercentage.isZero).toBe(true);
    expect(report.mandatory.fillerPercentage.formattedValue).toBe("0,00");
    expect(report.mandatory.fillerPercentage.displayText).toContain("0,00 %");

    expect(report.mandatory.dramaLevel.isZero).toBe(true);
    expect(report.mandatory.dramaLevel.displayText).toContain("0,00 %");
  });

  it("calculates drama, testament index, response time, and substance breakdown accurately", () => {
    const raw = [
      "12/11/26, 10:00 - Ana: URGENTE!! Contestame YA!!! 😱😱",
      "12/11/26, 10:10 - Bruno: Que paso? Todo bien?",
      "12/11/26, 10:20 - Ana: Bueno jajaja nada",
      "12/11/26, 10:30 - Bruno: Dale ok",
      "12/11/26, 10:40 - Ana: Nos vemos mañana a las 15",
    ].join("\n");

    const parsed = parseWhatsAppChat(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const report = analyzeParsedChat(parsed.data, { summaryWordCount: 10 });
    expect(report.mandatory.dramaLevel.value).toBeGreaterThan(0);
    expect(report.mandatory.testamentIndex.displayText).toMatch(
      /^Nivel de novela rusa: \d+,\d{2}$/,
    );
    expect(report.mandatory.averageResponseTime.displayText).toBe(
      "10 minutos y 00,00 segundos",
    );
    expect(report.mandatory.substanceVsSmoke.usefulCount).toBe(3);
    expect(report.mandatory.substanceVsSmoke.fillerCount).toBe(2);
  });
});

