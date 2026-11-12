import type { SubstanceVsSmokeBreakdown } from "@/lib/types";

export interface SmokeVsSubstanceChartProps {
  breakdown: SubstanceVsSmokeBreakdown;
  totalMessages: number;
}

export function SmokeVsSubstanceChart({
  breakdown,
  totalMessages,
}: SmokeVsSubstanceChartProps) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const fillerRatio = Math.max(0, Math.min(100, breakdown.fillerPercentage)) / 100;
  const fillerDash = fillerRatio * circumference;

  return (
    <section
      aria-labelledby="smoke-vs-substance-heading"
      className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/80 p-4 shadow sm:p-5"
    >
      <div>
        <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-400/90 uppercase">
          RF-14 · Gráfico Táctico
        </span>
        <h3
          id="smoke-vs-substance-heading"
          className="mt-1 text-base font-bold text-slate-100"
        >
          Humo vs. Sustancia
        </h3>
        <p className="mt-0.5 text-xs text-slate-400">
          Proporción de relleno innecesario frente a mensajes con contenido útil.
        </p>
      </div>

      <div className="my-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg
            viewBox="0 0 140 140"
            className="h-36 w-36 -rotate-90 transform"
            role="img"
            aria-label={`Humo ${breakdown.formattedFillerPercentage} por ciento, Sustancia ${breakdown.formattedUsefulPercentage} por ciento`}
          >
            {/* Base ring: Substance (useful content) */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="#10b981"
              strokeWidth="18"
            />
            {/* Overlay arc: Smoke (unnecessary filler) */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="#f59e0b"
              strokeWidth="18"
              strokeDasharray={`${fillerDash} ${circumference}`}
              strokeLinecap="butt"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono">
            <span className="text-[10px] uppercase text-slate-400">Total</span>
            <span className="text-lg font-bold text-slate-100">
              {totalMessages}
            </span>
            <span className="text-[10px] text-slate-400">msjs</span>
          </div>
        </div>

        <div className="w-full space-y-3 sm:w-auto">
          <div className="flex items-center justify-between gap-4 rounded border border-amber-500/30 bg-amber-950/20 px-3 py-2 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
              <span className="text-slate-200">Humo (Relleno)</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-amber-400">
                {breakdown.formattedFillerPercentage} %
              </span>
              <span className="ml-2 text-slate-400">
                ({breakdown.fillerCount})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />
              <span className="text-slate-200">Sustancia (Útil)</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-emerald-400">
                {breakdown.formattedUsefulPercentage} %
              </span>
              <span className="ml-2 text-slate-400">
                ({breakdown.usefulCount})
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
