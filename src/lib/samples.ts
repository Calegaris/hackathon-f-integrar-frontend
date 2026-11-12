/**
 * Preloaded individual and group WhatsApp sample histories for instant demos (RF-02).
 */

export interface ChatSample {
  id: "individual" | "group";
  label: string;
  description: string;
  rawText: string;
}

export const INDIVIDUAL_SAMPLE: ChatSample = {
  id: "individual",
  label: "Chat individual (TP / Alquiler)",
  description: "Conversación mano a mano llena de vueltas para definir un horario y una seña.",
  rawText: [
    "12/11/26, 09:10 - Los mensajes y las llamadas están cifrados de extremo a extremo.",
    "12/11/26, 09:12 - Martina: Che estás?",
    "12/11/26, 09:13 - Martina: Escuchame",
    "12/11/26, 09:14 - Martina: No te quiero molestar pero...",
    "12/11/26, 09:42 - Lucas: Hola Martu! Recién veo esto, qué pasó?",
    "12/11/26, 09:44 - Martina: Es por la entrega del viernes!!",
    "Necesito saber SI O SI hoy a qué hora nos juntamos",
    "porque después se me re complica 😅😅",
    "12/11/26, 09:45 - Martina: audio omitido",
    "12/11/26, 10:08 - Lucas: Perdoná, estoy en una call. Te parece hoy a las 19:00?",
    "12/11/26, 10:15 - Martina: Dale!! Ahí reservo la sala y te confirmo.",
    "12/11/26, 10:16 - Martina: Ah y acordate que la impresión sale $12500 cada uno.",
    "12/11/26, 10:18 - Lucas: Perfecto, después te transfiero.",
  ].join("\n"),
};

export const GROUP_SAMPLE: ChatSample = {
  id: "group",
  label: "Chat grupal (Asado del sábado)",
  description: "Grupo desorganizado intentando coordinar compras, plata y horario.",
  rawText: [
    "11/11/26, 21:00 - Se cifró el chat",
    "11/11/26, 21:05 - Santi: Cheeeeee",
    "11/11/26, 21:06 - Santi: Sale algo el sábado o están todos muertos?? 🔥🔥",
    "11/11/26, 21:14 - Valen: Jajajajaja",
    "11/11/26, 21:15 - Valen: Yo estoy re manija",
    "11/11/26, 21:16 - Valen: <Multimedia omitido>",
    "11/11/26, 21:30 - Tomi: Yo puedo después de las 21:00.",
    "Confirmen cuántos somos así compro la carne mañana.",
    "11/11/26, 21:32 - Santi: Uhhh alto asado, yo llevo hielo y 2 gaseosas",
    "11/11/26, 22:05 - Mili: PAREN UN POCO que no leí nada!! 😱",
    "11/11/26, 22:06 - Mili: Cuánto ponemos por cabeza? Avisen porfa así separo $18000",
    "11/11/26, 22:07 - Tomi: Calculen $15000 aprox cada uno, después pasamos el alias.",
    "11/11/26, 22:10 - Valen: Buenisimo jajaja",
  ].join("\n"),
};

export const CHAT_SAMPLES: ChatSample[] = [INDIVIDUAL_SAMPLE, GROUP_SAMPLE];

