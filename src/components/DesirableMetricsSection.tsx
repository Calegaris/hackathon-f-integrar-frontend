import type { LocalAnalysisReport } from "@/lib/types";
import { MetricCard } from "./MetricsGrid";

export interface DesirableMetricsSectionProps {
  report: LocalAnalysisReport;
}

export function DesirableMetricsSection({
  report,
}: DesirableMetricsSectionProps) {
  const { desirable, insights, chat } = report;
  const fiacaValue = Math.max(0, Math.min(100, insights.fiacaLevel.value));
  const arcLength = Math.PI * 52;
  const filledArc = (fiacaValue / 100) * arcLength;

  // Timeline SVG scaling
  const points = insights.timelineSeries;
  const svgWidth = 280;
  const svgHeight = 96;
  const padX = 12;
  const padY = 12;

  const toPolyline = (extractor: (p: (typeof points)[number]) => number) => {
    if (points.length === 0) return "";
    if (points.length === 1) {
      const y = svgHeight - padY - (extractor(points[0]) / 100) * (svgHeight - padY * 2);
      return `${padX},${y} ${svgWidth - padX},${y}`;
    }
    return points
      .map((point, idx) => {
        const x = padX + (idx / (points.length - 1)) * (svgWidth - padX * 2);
        const y = svgHeight - padY - (extractor(point) / 100) * (svgHeight - padY * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  return (
    <section aria-labelledby="desirable-metrics-heading" className="space-y-4">
      <div>
        <h2
          id="desirable-metrics-heading"
          className="font-mono text-sm font-bold tracking-wider text-amber-400 uppercase"
        >
          05 // Peritaje Extendido &amp; Radar de Comportamiento
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Indicadores deseables (D) y visualizaciones tácticas opcionales (O).
        </p>
      </div>

      {desirable ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              code="RF-12"
              metric={desirable.urgencyIndex}
              subtitle="Palabras urgentes sumadas a preguntas abiertas al final."
            />
            <MetricCard
              code="RF-28"
              metric={desirable.laughlessJajaPercentage}
              subtitle="Cantidad de 'jaja' frente a mensajes sin contenido gracioso."
            />
            <MetricCard
              code="RF-29"
              metric={desirable.audioCouldBeTextCount}
              subtitle="Mensajes marcados como audio omitido que pudieron leerse."
            />
            <MetricCard
              code="RF-30"
              metric={desirable.lateNightPercentage}
              subtitle="Actividad enviada entre las 02:00 y las 06:00."
            />
            <MetricCard
              code="RF-31"
              metric={desirable.gossipTemperature}
              subtitle="Frecuencia de 'che', 'viste', 'no sabés' cada 100 palabras."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* RF-13 & RF-15: Author participation bar chart */}
            <article className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow">
              <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-400/90 uppercase">
                RF-13 · RF-15 · Ranking
              </span>
              <h3 className="mt-1 text-sm font-bold text-slate-100">
                Quién habla más para decir menos
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                {chat.kind === "group"
                  ? "Participación por integrante en el grupo."
                  : "Distribución de mensajes por participante."}
              </p>

              <ul className="mt-4 space-y-3">
                {desirable.authorRanking.map((entry) => (
                  <li key={entry.author} className="space-y-1 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">
                        {entry.author}
                      </span>
                      <span className="text-amber-300">
                        {entry.formattedPercentage} % ({entry.messageCount})
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded bg-slate-950">
                      <div
                        className="h-full rounded bg-amber-500 transition-all"
                        style={{ width: `${Math.max(4, entry.percentage)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            {/* RF-33: Semicircular Fiaca Gauge */}
            <article className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow">
              <div>
                <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-400/90 uppercase">
                  RF-33 · Medidor Semicircular
                </span>
                <h3 className="mt-1 text-sm font-bold text-slate-100">
                  Nivel de fiaca
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Índice combinado de relleno, longitud y audios de 0,00 a 100,00.
                </p>
              </div>

              <div className="my-3 flex flex-col items-center">
                <svg
                  viewBox="0 0 140 84"
                  className="h-28 w-44"
                  role="img"
                  aria-label={`Nivel de fiaca ${insights.fiacaLevel.formattedValue} por ciento`}
                >
                  <path
                    d="M 18 70 A 52 52 0 0 1 122 70"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 18 70 A 52 52 0 0 1 122 70"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${filledArc} ${arcLength}`}
                  />
                  <text
                    x="70"
                    y="64"
                    textAnchor="middle"
                    className="fill-slate-100 font-mono text-sm font-bold"
                  >
                    {insights.fiacaLevel.formattedValue}
                  </text>
                </svg>
                {insights.fiacaLevel.isZero && (
                  <p className="mt-1 text-center font-mono text-xs text-amber-300">
                    {insights.fiacaLevel.displayText}
                  </p>
                )}
              </div>
            </article>

            {/* RF-16: Line chart Drama & Gossip evolution */}
            <article className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow">
              <div>
                <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-400/90 uppercase">
                  RF-16 · Evolución Temporal
                </span>
                <h3 className="mt-1 text-sm font-bold text-slate-100">
                  Drama y Temperatura del Chisme
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Curva de intensidad a lo largo de la conversación.
                </p>
              </div>

              <div className="my-2">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="h-28 w-full rounded border border-slate-800/80 bg-slate-950/70"
                  role="img"
                  aria-label="Evolución de drama y chisme en el chat"
                >
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    points={toPolyline((p) => p.dramaScore)}
                  />
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                    points={toPolyline((p) => p.gossipScore)}
                  />
                </svg>
                <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-4 bg-emerald-500" />
                    Drama
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-4 bg-amber-500" />
                    Chisme
                  </span>
                  <span>
                    {points[0]?.label ?? ""} → {points[points.length - 1]?.label ?? ""}
                  </span>
                </div>
              </div>
            </article>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 font-mono text-xs text-slate-400">
          Las métricas deseables (D) permanecen ocultas porque el expediente tiene menos de 5 mensajes (RF-32).
        </div>
      )}
    </section>
  );
}

