import { describe, expect, it } from "vitest";
import { parseWhatsAppChat } from "./parser";

describe("parseWhatsAppChat", () => {
  it("returns EMPTY_INPUT when text is empty or whitespace", () => {
    const result = parseWhatsAppChat("   \n  ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EMPTY_INPUT");
    }
  });

  it("returns NO_VALID_MESSAGES when format does not match WhatsApp export", () => {
    const result = parseWhatsAppChat("Hola todo bien\nSi vos?");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NO_VALID_MESSAGES");
    }
  });

  it("parses timestamps, authors, multiline continuations, and detects individual chat", () => {
    const raw = [
      "12/11/26, 10:00 - Ana: Hola!",
      "12/11/26, 10:02 - Bruno: Todo bien?",
      "Te escribia por el TP",
      "de mañana",
      "12/11/26, 10:03 - Ana: Ah dale",
      "12/11/26, 10:05 - Bruno: A que hora nos vemos?",
      "12/11/26, 10:06 - Ana: A las 18:00.",
    ].join("\n");

    const result = parseWhatsAppChat(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.kind).toBe("individual");
    expect(result.data.participants).toEqual(["Ana", "Bruno"]);
    expect(result.data.messages).toHaveLength(5);
    expect(result.data.hasInsufficientSample).toBe(false);
    expect(result.data.messages[1].text).toBe(
      "Todo bien?\nTe escribia por el TP\nde mañana",
    );
    expect(result.data.messages[1].wordCount).toBe(9);
  });

  it("ignores system notices and media omitted lines while counting audio omitted", () => {
    const raw = [
      "12/11/26, 09:00 - Los mensajes y las llamadas están cifrados de extremo a extremo.",
      "12/11/26, 09:01 - Se cifró el chat",
      "12/11/26, 09:02 - Carla: <Multimedia omitido>",
      "12/11/26, 09:03 - Diego: audio omitido",
      "12/11/26, 09:04 - Carla: Bueno dale",
      "12/11/26, 09:05 - Elena: Yo voy a las 20",
    ].join("\n");

    const result = parseWhatsAppChat(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.kind).toBe("individual");
    expect(result.data.messages).toHaveLength(2);
    expect(result.data.ignoredSystemCount).toBe(4);
    expect(result.data.mediaOmittedCount).toBe(2);
    expect(result.data.audioOmittedCount).toBe(1);
    expect(result.data.hasInsufficientSample).toBe(true);
  });

  it("detects group chats when 3 or more authors participate", () => {
    const raw = [
      "12/11/26, 14:00 - Lucas: Quien lleva hielo?",
      "12/11/26, 14:01 - Sofi: Yo llevo",
      "12/11/26, 14:02 - Tincho: Yo llevo carbón",
      "12/11/26, 14:03 - Lucas: Genial",
      "12/11/26, 14:04 - Sofi: Nos vemos a las 21",
    ].join("\n");

    const result = parseWhatsAppChat(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.kind).toBe("group");
    expect(result.data.participants).toHaveLength(3);
  });
});

