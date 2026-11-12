import type { LocalAnalysisReport } from "@/lib/types";

export interface TacticalIntelPanelProps {
  report: LocalAnalysisReport;
  onSelectPerspective: (author: string) => void;
}

export function TacticalIntelPanel({
  report,
  onSelectPerspective,
}: TacticalIntelPanelProps) {
  const { chat, insights } = report;

  return (
    <section aria-labelledby="tactical-intel-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="tactical-intel-heading"
            className="font-mono text-sm font-bold tracking-wider text-amber-400 uppercase"
          >
            04 // Inteligencia Operativa (Accionables Reales)
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Preguntas abiertas, montos detectados, presupuesto de palabras y ventana óptima de respuesta.
          </p>
        </div>

        {chat.participants.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <span className="text-slate-400">Tu rol en el chat:</span>
            {chat.participants.map((participant) => {
              const isSelected = insights.perspectiveAuthor === participant;
              return (
                <button
                  key={participant}
                  type="button"
                  onClick={() => onSelectPerspective(participant)}
                  className={`cursor-pointer rounded border px-2.5 py-1 transition ${
                    isSelected
                      ? "border-amber-400 bg-amber-500/20 font-bold text-amber-300"
                      : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {participant}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 1. Pending Unanswered Questions */}
        <article className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-400/90 uppercase">
                TÁCTICA · Pendientes sin contestar
              </span>
              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                {insights.pendingQuestions.length.toFixed(2).replace(".", ",")}
              </span>
            </div>
            <h3 className="mt-1.5 text-sm font-bold text-slate-100">
              Preguntas dirigidas a {insights.perspectiveAuthor ?? "vos"}
            </h3>

            {insights.pendingQuestions.length === 0 ? (
              <p className="mt-3 font-mono text-xs text-amber-300">
                0,00 pendientes: estás al día, nadie quedó esperando respuesta.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {insights.pendingQuestions.map((item, idx) => (
                  <li
                    key={`${item.author}-${item.rawTime}-${idx}`}
                    className="rounded border border-amber-500/30 bg-amber-950/20 p-2.5"
                  >
                    <p className="text-xs font-medium text-slate-100">
                      <span className="font-mono font-bold text-amber-300">
                        {item.author}:
                      </span>{" "}
                      “{item.question}”
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-emerald-400">
                      {item.elapsedDisplayText}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>

        {/* 2. Accounts Receivable (Amounts & Dates) */}
        <article className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-400/90 uppercase">
                TÁCTICA · Cuentas por cobrar
              </span>
              <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-emerald-400">
                Total: {insights.totalReceivablesFormatted}
              </span>
            </div>
            <h3 className="mt-1.5 text-sm font-bold text-slate-100">
              Montos y compromisos detectados
            </h3>

            {insights.receivables.length === 0 ? (
              <p className="mt-3 font-mono text-xs text-amber-300">
                $0,00 detectados: expediente libre de vaquitas, señas o transferencias pendientes.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {insights.receivables.map((item, idx) => (
                  <li
                    key={`${item.author}-${item.amountFormatted}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 bg-slate-950/70 px-3 py-2 font-mono text-xs"
                  >
                    <span className="font-bold text-emerald-400">
                      {item.amountFormatted}
                    </span>
                    <span className="text-slate-200">
                      {item.concept} ·{" "}
                      <span className="text-amber-300">{item.dateHint}</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ({item.author})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>

        {/* 3. Ideal Reply Word Count */}
        <article className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-400/90 uppercase">
              TÁCTICA · Largo ideal de respuesta
            </span>
            <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-slate-300">
              {insights.idealReplyLength.formattedTargetWords} palabras
            </span>
          </div>
          <h3 className="mt-1.5 text-sm font-bold text-slate-100">
            {insights.idealReplyLength.counterpartyLabel}
          </h3>
          <p className="mt-3 font-mono text-sm font-bold text-emerald-400">
            {insights.idealReplyLength.displayText}
          </p>
        </article>

        {/* 4. Recommended Non-Desperate Reply Time */}
        <article className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-400/90 uppercase">
              TÁCTICA · Ventana anti-desesperación
            </span>
            <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-slate-300">
              {insights.recommendedReplyWindow.formattedElapsedPercentage} %
            </span>
          </div>
          <h3 className="mt-1.5 text-sm font-bold text-slate-100">
            Hora recomendada para responder sin parecer desesperado
          </h3>
          <p className="mt-3 font-mono text-sm font-bold text-amber-300">
            {insights.recommendedReplyWindow.displayText}
          </p>
        </article>
      </div>
    </section>
  );
}

