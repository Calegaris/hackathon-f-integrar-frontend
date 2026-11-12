import { describe, expect, it } from "vitest";
import { analyzeParsedChat } from "./metrics";
import { parseWhatsAppChat } from "./parser";

describe("desirable metrics (D) and tactical insights", () => {
  it("computes desirable metrics (RF-12, RF-13, RF-28..31) when chat has >= 5 messages", () => {
    const raw = [
      "12/11/26, 03:15 - Ana: Che viste lo de la vaquita del regalo? Son $4.500 para el viernes",
      "12/11/26, 03:25 - Bruno: Jajajaja posta?",
      "12/11/26, 03:35 - Ana: audio omitido",
      "12/11/26, 03:45 - Carla: Si che, yo pongo los $4.500 hoy",
      "12/11/26, 03:55 - Ana: Urgente necesito confirmar esto hoy, vos venis?",
      "12/11/26, 04:05 - Bruno: Bueno dale ok",
      "12/11/26, 04:15 - Ana: A que hora pasas?",
    ].join("\n");

    const parsed = parseWhatsAppChat(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const referenceTime = new Date(2026, 10, 12, 7, 27, 24, 0);
    const report = analyzeParsedChat(parsed.data, {
      perspectiveAuthor: "Bruno",
      referenceTime,
    });

    expect(report.desirable).not.toBeNull();
    if (!report.desirable) return;

    expect(report.desirable.lateNightPercentage.formattedValue).toBe("100,00");
    expect(report.desirable.audioCouldBeTextCount.formattedValue).toBe("1,00");
    expect(report.desirable.laughlessJajaPercentage.value).toBeGreaterThan(0);
    expect(report.desirable.gossipTemperature.value).toBeGreaterThan(0);
    expect(report.desirable.urgencyIndex.value).toBeGreaterThan(0);
    expect(report.desirable.authorRanking[0].author).toBe("Ana");
    expect(report.desirable.authorRanking[0].formattedPercentage).toMatch(/^\d+,\d{2}$/);
  });

  it("extracts unanswered pending questions, receivables, ideal reply length, and recommended reply time", () => {
    const raw = [
      "12/11/26, 17:00 - Ana: Hola! Armamos la vaquita del regalo? Son $4.500 para el viernes",
      "12/11/26, 17:10 - Bruno: Dale buenísimo, después miro bien",
      "12/11/26, 17:20 - Ana: Perfecto, pero confirmame porfa si venís hoy a la noche?",
      "12/11/26, 17:30 - Bruno: Ahora te digo",
      "12/11/26, 18:00 - Ana: Che a qué hora podés pasar por el regalo?",
    ].join("\n");

    const parsed = parseWhatsAppChat(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    // 3 hours and 12.40 minutes after 18:00 -> 21:12:24
    const referenceTime = new Date(2026, 10, 12, 21, 12, 24, 0);
    const report = analyzeParsedChat(parsed.data, {
      perspectiveAuthor: "Bruno",
      referenceTime,
    });

    expect(report.insights.pendingQuestions).toHaveLength(1);
    expect(report.insights.pendingQuestions[0].author).toBe("Ana");
    expect(report.insights.pendingQuestions[0].elapsedDisplayText).toBe(
      "Te preguntaron esto hace 3 horas y 12,40 minutos",
    );

    expect(report.insights.receivables).toHaveLength(1);
    expect(report.insights.receivables[0].amountFormatted).toBe("$4.500,00");
    expect(report.insights.receivables[0].concept).toContain("vaquita");
    expect(report.insights.receivables[0].dateHint).toBe("viernes");

    expect(report.insights.idealReplyLength.displayText).toMatch(
      /^Respondé con máximo \d+,\d{2} palabras$/,
    );

    expect(report.insights.recommendedReplyWindow.recommendedTime).toMatch(
      /^\d{2}:\d{2}$/,
    );
    expect(report.insights.recommendedReplyWindow.formattedElapsedPercentage).toMatch(
      /^\d+,\d{2}$/,
    );
    expect(report.insights.fiacaLevel.formattedValue).toMatch(/^\d+,\d{2}$/);
    expect(report.insights.timelineSeries.length).toBeGreaterThan(0);
  });

  it("computes exact percentage elapsed before average response window expires", () => {
    const raw = [
      "12/11/26, 20:00 - Ana: Hola",
      "12/11/26, 20:20 - Bruno: Buenas",
      "12/11/26, 20:40 - Ana: Qué hacés?",
      "12/11/26, 21:00 - Bruno: Acá ando",
      "12/11/26, 21:04 - Ana: Vamos a cenar?",
    ].join("\n");

    const parsed = parseWhatsAppChat(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    // Average response across transitions: (20 + 20 + 20 + 4) / 4 = 16 min -> recommended = 21:20.
    // Reference = 21:14 (10 min elapsed out of 16 min = 62,50 %).
    const referenceTime = new Date(2026, 10, 12, 21, 14, 0, 0);
    const report = analyzeParsedChat(parsed.data, {
      perspectiveAuthor: "Bruno",
      referenceTime,
    });

    expect(report.insights.recommendedReplyWindow.recommendedTime).toBe("21:20");
    expect(report.insights.recommendedReplyWindow.isReadyNow).toBe(false);
    expect(report.insights.recommendedReplyWindow.displayText).toBe(
      "21:20, porque ya pasó el 62,50 % de su tiempo medio de respuesta",
    );
  });

  it("applies Zero Rule to desirable metrics when laughs, audios, and late night are 0", () => {
    const raw = [
      "12/11/26, 10:00 - Ana: Buen día, confirmamos reunión a las 15",
      "12/11/26, 10:05 - Bruno: Confirmado para las 15",
      "12/11/26, 10:10 - Ana: Envío informe",
      "12/11/26, 10:15 - Bruno: Recibido",
      "12/11/26, 10:20 - Ana: Saludos",
    ].join("\n");

    const parsed = parseWhatsAppChat(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const report = analyzeParsedChat(parsed.data);
    expect(report.desirable).not.toBeNull();
    if (!report.desirable) return;

    expect(report.desirable.laughlessJajaPercentage.displayText).toBe(
      "0,00 %: chat sin una sola risa. Preocupante.",
    );
    expect(report.desirable.audioCouldBeTextCount.isZero).toBe(true);
    expect(report.desirable.lateNightPercentage.isZero).toBe(true);
    expect(report.desirable.gossipTemperature.isZero).toBe(true);
  });
});

