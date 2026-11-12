import type { FormattedMetric, MetricId } from "./types";

export const INSUFFICIENT_SAMPLE_NOTICE =
  "Expediente archivado por falta de evidencia";

export const ZERO_COMMENTARIES: Record<MetricId, string> = {
  fillerPercentage:
    "0,00 %: eficiencia quirúrgica. Cero humo detectado en el expediente.",
  lifeTimeSaved:
    "00 minutos y 00,00 segundos: chat tan breve que tardaste más en abrir el expediente.",
  dramaLevel:
    "0,00 %: calma sospechosa. Ni un signo de exclamación ni mayúsculas.",
  testamentIndex:
    "Nivel de novela rusa: 0,00. Telegrama puro, cero vocación literaria.",
  averageResponseTime:
    "00 minutos y 00,00 segundos: monólogo detectado, no hubo intercambio entre autores.",
  urgencyIndex:
    "0,00 %: tranquilidad absoluta. Nadie pidió nada para ayer.",
  laughlessJajaPercentage:
    "0,00 %: chat sin una sola risa. Preocupante.",
  audioCouldBeTextCount:
    "0,00: milagro táctico, nadie mandó audios interminables.",
  lateNightPercentage:
    "0,00 %: horario de oficina impecable. Todos durmiendo entre las 2:00 y las 6:00.",
  gossipTemperature:
    "0,00: cero chisme detectado. Nivel de confidencialidad suizo.",
  fiacaLevel:
    "0,00 %: energía arrolladora. Este chat no dio ni una gota de fiaca.",
};

/**
 * Rounds a number to 2 decimal places, treating non-finite or near-zero numbers cleanly.
 */
export function roundToTwo(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Formats a number with exactly two decimal places using comma separator (RF-08).
 */
export function formatTwoDecimals(value: number): string {
  return roundToTwo(value).toFixed(2).replace(".", ",");
}

/**
 * Formats a currency amount using Argentine dot thousands and two comma decimals.
 */
export function formatCurrencyArs(value: number): string {
  const safe = roundToTwo(Math.max(0, value));
  const [intPart, decPart] = safe.toFixed(2).split(".");
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$${withDots},${decPart}`;
}

/**
 * Formats a duration in seconds as `mm minutos y ss,cc segundos` (RF-10, RF-27).
 */
export function formatDurationMinutesSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Number.isFinite(totalSeconds) ? totalSeconds : 0);
  let minutes = Math.floor(safeSeconds / 60);
  let seconds = roundToTwo(safeSeconds - minutes * 60);

  if (seconds >= 60) {
    minutes += 1;
    seconds = 0;
  }

  const mm = String(minutes).padStart(2, "0");
  const sscc = formatTwoDecimals(seconds).padStart(5, "0");
  return `${mm} minutos y ${sscc} segundos`;
}

export function buildMetric(
  id: MetricId,
  label: string,
  priority: "M" | "D" | "O",
  rawValue: number,
  unit: FormattedMetric["unit"],
  nonZeroDisplay: (formattedValue: string, roundedValue: number) => string,
): FormattedMetric {
  const value = roundToTwo(rawValue);
  const isZero = value === 0;
  const formattedValue = formatTwoDecimals(value);
  const zeroCommentary = isZero ? ZERO_COMMENTARIES[id] : null;
  const displayText = isZero
    ? ZERO_COMMENTARIES[id]
    : nonZeroDisplay(formattedValue, value);

  return {
    id,
    label,
    priority,
    value,
    formattedValue,
    unit,
    displayText,
    isZero,
    zeroCommentary,
  };
}

