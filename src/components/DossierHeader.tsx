import type { ChatKind } from "@/lib/types";

export interface DossierHeaderProps {
  caseNumber?: string;
  chatKind?: ChatKind;
  participantCount?: number;
  messageCount?: number;
  hasActiveAnalysis: boolean;
  onReset: () => void;
}

export function DossierHeader({
  caseNumber,
  chatKind,
  participantCount,
  messageCount,
  hasActiveAnalysis,
  onReset,
}: DossierHeaderProps) {
  return (
    <header className="border-b border-amber-500/30 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded border-2 border-red-500/80 bg-red-950/50 px-2.5 py-1 font-mono text-xs font-bold tracking-widest text-red-400 uppercase shadow-sm">
            CONFIDENCIAL
          </span>
          <div>
            <p className="font-mono text-[11px] tracking-widest text-amber-400/90 uppercase">
              Pabellón de Molestias Cotidianas · División Comunicaciones
            </p>
            <h1 className="text-lg font-bold tracking-tight text-slate-100 sm:text-xl">
              A.R.T. — Agencia de Respuestas Tácticas
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded border border-slate-800 bg-slate-900/90 px-3 py-1.5 font-mono text-xs text-slate-300">
            <span className="text-slate-500">EXPEDIENTE: </span>
            <span className="font-semibold text-amber-400">
              {caseNumber ?? "ART-PENDIENTE"}
            </span>
          </div>

          {chatKind && (
            <div className="rounded border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 font-mono text-xs text-amber-300">
              <span className="font-bold uppercase">
                {chatKind === "group" ? "Chat Grupal" : "Chat Individual"}
              </span>
              {typeof participantCount === "number" &&
                typeof messageCount === "number" && (
                  <span className="ml-2 text-amber-200/80">
                    ({participantCount} autores · {messageCount} msjs)
                  </span>
                )}
            </div>
          )}

          {hasActiveAnalysis && (
            <button
              type="button"
              onClick={onReset}
              className="cursor-pointer rounded border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-xs font-semibold text-slate-200 transition hover:border-amber-500/60 hover:bg-slate-700 hover:text-white"
            >
              Nuevo análisis
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
