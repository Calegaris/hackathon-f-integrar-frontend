/**
 * Domain contracts and API payload types for A.R.T. (Tactical Response Agency).
 */

export type RequirementPriority = "M" | "D" | "O";

export type ChatKind = "individual" | "group";

export type ParseErrorCode = "EMPTY_INPUT" | "NO_VALID_MESSAGES";

export interface ParseError {
  code: ParseErrorCode;
  message: string;
}

export interface ParsedMessage {
  id: string;
  /** Original date token in dd/mm/yy format. */
  rawDate: string;
  /** Original time token in hh:mm format. */
  rawTime: string;
  /** Local timestamp reconstructed from rawDate and rawTime. */
  timestamp: Date;
  author: string;
  text: string;
  wordCount: number;
}

export interface ParsedChat {
  kind: ChatKind;
  participants: string[];
  messages: ParsedMessage[];
  ignoredSystemCount: number;
  mediaOmittedCount: number;
  audioOmittedCount: number;
  /** True when the chat has fewer than 5 valid user messages (RF-32). */
  hasInsufficientSample: boolean;
}

export type ParseResult =
  | { ok: true; data: ParsedChat }
  | { ok: false; error: ParseError };

export type MetricId =
  | "fillerPercentage"
  | "lifeTimeSaved"
  | "dramaLevel"
  | "testamentIndex"
  | "averageResponseTime"
  | "urgencyIndex"
  | "laughlessJajaPercentage"
  | "audioCouldBeTextCount"
  | "lateNightPercentage"
  | "gossipTemperature";

export type MetricUnit =
  | "percent"
  | "duration"
  | "ratio"
  | "count"
  | "per100Words";

export interface FormattedMetric {
  id: MetricId;
  label: string;
  priority: RequirementPriority;
  /** Raw numeric value (never NaN or Infinity). */
  value: number;
  /** Value strictly formatted with two decimal places (RF-08). */
  formattedValue: string;
  unit: MetricUnit;
  /** Final UI string, including fixed humorous commentary when value is zero (RF-25). */
  displayText: string;
  isZero: boolean;
  zeroCommentary: string | null;
}

export interface SubstanceVsSmokeBreakdown {
  usefulCount: number;
  fillerCount: number;
  usefulPercentage: number;
  fillerPercentage: number;
  formattedUsefulPercentage: string;
  formattedFillerPercentage: string;
}

export interface AuthorParticipation {
  author: string;
  messageCount: number;
  percentage: number;
  formattedPercentage: string;
}

export interface MandatoryMetrics {
  fillerPercentage: FormattedMetric;
  lifeTimeSaved: FormattedMetric;
  dramaLevel: FormattedMetric;
  testamentIndex: FormattedMetric;
  averageResponseTime: FormattedMetric;
  substanceVsSmoke: SubstanceVsSmokeBreakdown;
}

export interface DesirableMetrics {
  urgencyIndex: FormattedMetric;
  laughlessJajaPercentage: FormattedMetric;
  audioCouldBeTextCount: FormattedMetric;
  lateNightPercentage: FormattedMetric;
  gossipTemperature: FormattedMetric;
  authorRanking: AuthorParticipation[];
}

export interface LocalAnalysisReport {
  caseNumber: string;
  chat: ParsedChat;
  /** Populated with archival notice when message count is under 5 (RF-32). */
  insufficientSampleNotice: string | null;
  mandatory: MandatoryMetrics;
  /** Null when sample is insufficient so only M metrics are computed (RF-32). */
  desirable: DesirableMetrics | null;
}

export type ResponseTone = "diplomatic" | "passiveAggressive" | "neutral";

export interface SuggestedResponse {
  tone: ResponseTone;
  label: string;
  text: string;
}

export type TrafficLightSignal = "red" | "yellow" | "green";

export interface ReplyVerdict {
  shouldReply: boolean;
  urgencyPercentage: number;
  formattedUrgencyPercentage: string;
  signal: TrafficLightSignal;
}

export type AnalysisSource = "llm" | "fallback";

export type FallbackReason =
  | "missing_key"
  | "timeout"
  | "provider_error"
  | "invalid_payload";

export interface AnalyzeApiRequest {
  chatText: string;
  regenerateTone?: ResponseTone;
}

export interface AnalyzeApiResponse {
  summary: string;
  responses: Record<ResponseTone, SuggestedResponse>;
  verdict: ReplyVerdict;
  source: AnalysisSource;
  fallbackReason?: FallbackReason;
}

