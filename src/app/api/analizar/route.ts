import { NextResponse } from "next/server";
import { analyzeChatWithAi } from "@/lib/ai";
import type { AnalyzeApiRequest } from "@/lib/types";

export async function POST(request: Request) {
  let body: Partial<AnalyzeApiRequest>;

  try {
    body = (await request.json()) as Partial<AnalyzeApiRequest>;
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud debe ser un JSON válido." },
      { status: 400 },
    );
  }

  if (typeof body.chatText !== "string" || body.chatText.trim().length === 0) {
    return NextResponse.json(
      { error: "Falta el campo chatText con el historial del chat." },
      { status: 400 },
    );
  }

  const analysis = await analyzeChatWithAi(body.chatText, {
    regenerateTone: body.regenerateTone,
    variantSeed: body.variantSeed,
  });

  return NextResponse.json(analysis, { status: 200 });
}

