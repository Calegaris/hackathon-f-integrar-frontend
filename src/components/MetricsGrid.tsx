import type { FormattedMetric, LocalAnalysisReport } from "@/lib/types";

export interface MetricsGridProps {
  report: LocalAnalysisReport;
}

export interface MetricCardProps {
  code: string;
  metric: FormattedMetric;
  subtitle: string;
}

export function MetricCard({ code, metric, subtitle }: MetricCardProps) {
  return (
    <article className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-400/90 uppercase">
            {code} · Prioridad {metric.priority}
          </span>
          <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-slate-300">
            {metric.formattedValue}
          </span>
        </div>
        <h3 className="mt-1.5 text-sm font-bold text-slate-100">
          {metric.label}
        </h3>
        <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
      </div>

      <div className="mt-4 border-t border-slate-800/80 pt-3">
        {metric.isZero ? (
          <p className="font-mono text-xs leading-relaxed text-amber-300">
            {metric.displayText}
          </p>
        ) : (
          <p className="font-mono text-base font-bold tracking-tight text-emerald-400">
            {metric.displayText}
          </p>
        )}
      </div>
    </article>
  );
}

export function MetricsGrid({ report }: MetricsGridProps) {
  const { chat, insufficientSampleNotice, mandatory } = report;

  return (
    <section aria-labelledby="dossier-metrics-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="dossier-metrics-heading"
            className="font-mono text-sm font-bold tracking-wider text-amber-400 uppercase"
          >
            02 // Peritaje Conductual (Precisión a Dos Decimales)
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Participantes identificados ({chat.participants.length}):{" "}
            <span className="font-mono text-slate-200">
              {chat.participants.join(", ")}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300">
            Tipo:{" "}
            <strong className="text-amber-400 uppercase">
              {chat.kind === "group" ? "Grupal (3+ autores)" : "Individual (2 autores)"}
            </strong>
          </span>
          {chat.ignoredSystemCount > 0 && (
            <span className="rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-400">
              Sistema/Multimedia filtrados: {chat.ignoredSystemCount}
            </span>
          )}
        </div>
      </div>

      {insufficientSampleNotice && (
        <div
          role="status"
          className="rounded-lg border-2 border-amber-500/70 bg-amber-950/40 px-4 py-3 font-mono text-xs text-amber-200"
        >
          <span className="font-bold uppercase text-amber-400">
            Alerta RF-32 ({chat.messages.length} mensajes):{" "}
          </span>
          {insufficientSampleNotice}. Se calculan únicamente las métricas
          imprescindibles (M).
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          code="RF-09"
          metric={mandatory.fillerPercentage}
          subtitle="Mensajes sin pregunta, monto, fecha/hora ni verbo de plan."
        />
        <MetricCard
          code="RF-10"
          metric={mandatory.lifeTimeSaved}
          subtitle="Lectura a 238 palabras/minuto menos lectura del resumen."
        />
        <MetricCard
          code="RF-11"
          metric={mandatory.dramaLevel}
          subtitle="Puntaje ponderado de MAYÚSCULAS, signos repetidos y emojis."
        />
        <MetricCard
          code="RF-26"
          metric={mandatory.testamentIndex}
          subtitle="Promedio de palabras por mensaje emitido."
        />
        <MetricCard
          code="RF-27"
          metric={mandatory.averageResponseTime}
          subtitle="Demora promedio de respuesta entre distintos autores."
        />
      </div>
    </section>
  );
}
