"use client";

import { useState } from "react";
import type { AnalyzeApiResponse, ResponseTone } from "@/lib/types";

export interface TacticalResponsesPanelProps {
  analysis: AnalyzeApiResponse;
  isLoadingAi: boolean;
  regeneratingTone: ResponseTone | null;
  onRegenerateTone: (tone: ResponseTone) => void;
}

const SIGNAL_STYLES = {
  red: {
    dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]",
    badge: "border-red-500/50 bg-red-950/40 text-red-300",
  },
  yellow: {
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
    badge: "border-amber-500/50 bg-amber-950/40 text-amber-300",
  },
  green: {
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
    badge: "border-emerald-500/50 bg-emerald-950/40 text-emerald-300",
  },
} as const;

const TONE_ORDER: ResponseTone[] = [
  "diplomatic",
  "passiveAggressive",
  "neutral",
];

const TONE_BADGES: Record<ResponseTone, string> = {
  diplomatic: "border-sky-500/40 bg-sky-950/30 text-sky-300",
  passiveAggressive: "border-rose-500/40 bg-rose-950/30 text-rose-300",
  neutral: "border-slate-600 bg-slate-800/70 text-slate-200",
};

export function TacticalResponsesPanel({
  analysis,
  isLoadingAi,
  regeneratingTone,
  onRegenerateTone,
}: TacticalResponsesPanelProps) {
  const [copiedTone, setCopiedTone] = useState<ResponseTone | null>(null);

  const handleCopy = async (tone: ResponseTone, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTone(tone);
      window.setTimeout(() => {
        setCopiedTone((prev) => (prev === tone ? null : prev));
      }, 2200);
    } catch {
      // Fallback for restricted clipboard contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedTone(tone);
      window.setTimeout(() => {
        setCopiedTone((prev) => (prev === tone ? null : prev));
      }, 2200);
    }
  };

  const { verdict } = analysis;
  const signalStyle = SIGNAL_STYLES[verdict.signal];

  return (
    <section aria-labelledby="tactical-responses-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="tactical-responses-heading"
            className="font-mono text-sm font-bold tracking-wider text-amber-400 uppercase"
          >
            03 // Inteligencia de Síntesis y Respuestas Tácticas
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Traducción directa de intenciones y respuestas listas para copiar en un clic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* RF-20: Traffic light indicator */}
          <div
            className={`flex items-center gap-2 rounded border px-3 py-1 ${signalStyle.badge}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${signalStyle.dot}`} />
            <span>
              Responder: <strong>{verdict.shouldReply ? "SÍ" : "NO"}</strong>
            </span>
            <span className="opacity-80">
              (Urgencia: {verdict.formattedUrgencyPercentage} %)
            </span>
          </div>

          <span className="rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-400">
            {isLoadingAi
              ? "Consultando IA..."
              : analysis.source === "llm"
                ? `Fuente: IA (${analysis.modelUsed ?? "Gemini"})`
                : "Fuente: Plantillas por reglas (RF-19)"}
          </span>
        </div>
      </div>

      {/* Summary card (RF-18) */}
      <div className="rounded-lg border border-amber-500/40 bg-slate-900/90 p-4 shadow sm:p-5">
        <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-400 uppercase">
          RF-18 · Lo que realmente quieren decir
        </span>
        <p className="mt-2 text-sm leading-relaxed text-slate-100 sm:text-base">
          {analysis.summary}
        </p>
      </div>

      {/* 3 Suggested responses (RF-18, RF-21, RF-22) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TONE_ORDER.map((tone) => {
          const item = analysis.responses[tone];
          const isCopied = copiedTone === tone;
          const isRegenerating = regeneratingTone === tone;

          return (
            <article
              key={tone}
              className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase ${TONE_BADGES[tone]}`}
                  >
                    {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRegenerateTone(tone)}
                    disabled={isLoadingAi || isRegenerating}
                    className="cursor-pointer font-mono text-[11px] text-slate-400 underline-offset-2 transition hover:text-amber-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRegenerating ? "Regenerando..." : "Regenerar tono"}
                  </button>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-100">
                  “{item.text}”
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleCopy(tone, item.text)}
                  className={`w-full cursor-pointer rounded px-3 py-2 font-mono text-xs font-bold tracking-wider uppercase transition ${
                    isCopied
                      ? " border border-emerald-500/60 bg-emerald-950/60 text-emerald-300"
                      : "border border-slate-700 bg-slate-800 text-slate-100 hover:border-amber-500/60 hover:bg-slate-700"
                  }`}
                >
                  {isCopied
                    ? "✓ Copiado al portapapeles"
                    : "Copiar respuesta"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

