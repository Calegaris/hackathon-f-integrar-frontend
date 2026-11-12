"use client";

import { useCallback, useRef, useState } from "react";
import { generateRuleBasedFallback } from "@/lib/fallback";
import { analyzeParsedChat } from "@/lib/metrics";
import { countWords, parseWhatsAppChat } from "@/lib/parser";
import type { ChatSample } from "@/lib/samples";
import type {
  AnalyzeApiResponse,
  LocalAnalysisReport,
  ResponseTone,
} from "@/lib/types";
import { ChatInputPanel } from "./ChatInputPanel";
import { DossierHeader } from "./DossierHeader";
import { MetricsGrid } from "./MetricsGrid";
import { SmokeVsSubstanceChart } from "./SmokeVsSubstanceChart";
import { TacticalResponsesPanel } from "./TacticalResponsesPanel";

export function TacticalAnalyzerContainer() {
  const [chatText, setChatText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [report, setReport] = useState<LocalAnalysisReport | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AnalyzeApiResponse | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [regeneratingTone, setRegeneratingTone] = useState<ResponseTone | null>(
    null,
  );

  const variantSeedRef = useRef(0);
  const requestCounterRef = useRef(0);

  const executeAnalysis = useCallback(async (rawInput: string) => {
    const parsed = parseWhatsAppChat(rawInput);

    if (!parsed.ok) {
      setErrorMessage(parsed.error.message);
      setReport(null);
      setAiAnalysis(null);
      return;
    }

    setErrorMessage(null);
    variantSeedRef.current = 0;

    // 1. Offline-first instant local fallback & mandatory metrics
    const immediateFallback = generateRuleBasedFallback(
      rawInput,
      "missing_key",
      0,
    );
    const initialReport = analyzeParsedChat(parsed.data, {
      summaryWordCount: countWords(immediateFallback.summary),
    });

    setReport(initialReport);
    setAiAnalysis(immediateFallback);
    setIsLoadingAi(true);

    const requestId = ++requestCounterRef.current;

    try {
      const response = await fetch("/api/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatText: rawInput }),
      });

      if (requestId !== requestCounterRef.current) return;

      if (response.ok) {
        const data = (await response.json()) as AnalyzeApiResponse;
        setAiAnalysis(data);
        setReport(
          analyzeParsedChat(parsed.data, {
            caseNumber: initialReport.caseNumber,
            summaryWordCount: countWords(data.summary),
          }),
        );
      }
    } catch {
      // Offline fallback is already rendered; keep UI resilient (RF-19).
    } finally {
      if (requestId === requestCounterRef.current) {
        setIsLoadingAi(false);
      }
    }
  }, []);

  const handleLoadSample = useCallback(
    (sample: ChatSample) => {
      setChatText(sample.rawText);
      void executeAnalysis(sample.rawText);
    },
    [executeAnalysis],
  );

  const handleAnalyzeClick = useCallback(() => {
    void executeAnalysis(chatText);
  }, [chatText, executeAnalysis]);

  const handleReset = useCallback(() => {
    requestCounterRef.current += 1;
    setChatText("");
    setErrorMessage(null);
    setReport(null);
    setAiAnalysis(null);
    setIsLoadingAi(false);
    setRegeneratingTone(null);
  }, []);

  const handleRegenerateTone = useCallback(
    async (tone: ResponseTone) => {
      if (!chatText.trim() || !aiAnalysis) return;

      setRegeneratingTone(tone);
      const nextSeed = ++variantSeedRef.current;

      try {
        const response = await fetch("/api/analizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatText,
            regenerateTone: tone,
            variantSeed: nextSeed,
          }),
        });

        if (response.ok) {
          const fresh = (await response.json()) as AnalyzeApiResponse;
          setAiAnalysis((prev) =>
            prev
              ? {
                  ...prev,
                  responses: {
                    ...prev.responses,
                    [tone]: fresh.responses[tone],
                  },
                }
              : fresh,
          );
          return;
        }
      } catch {
        // Fallback rotation below if network fails
      } finally {
        setRegeneratingTone(null);
      }

      const localRotated = generateRuleBasedFallback(
        chatText,
        "provider_error",
        nextSeed,
      );
      setAiAnalysis((prev) =>
        prev
          ? {
              ...prev,
              responses: {
                ...prev.responses,
                [tone]: localRotated.responses[tone],
              },
            }
          : localRotated,
      );
    },
    [aiAnalysis, chatText],
  );

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-100">
      <DossierHeader
        caseNumber={report?.caseNumber}
        chatKind={report?.chat.kind}
        participantCount={report?.chat.participants.length}
        messageCount={report?.chat.messages.length}
        hasActiveAnalysis={Boolean(report)}
        onReset={handleReset}
      />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <ChatInputPanel
          chatText={chatText}
          errorMessage={errorMessage}
          isLoadingAi={isLoadingAi}
          onChangeText={setChatText}
          onLoadSample={handleLoadSample}
          onAnalyze={handleAnalyzeClick}
          onClear={handleReset}
        />

        {report && aiAnalysis && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <MetricsGrid report={report} />
              </div>
              <div className="lg:col-span-1">
                <SmokeVsSubstanceChart
                  breakdown={report.mandatory.substanceVsSmoke}
                  totalMessages={report.chat.messages.length}
                />
              </div>
            </div>

            <TacticalResponsesPanel
              analysis={aiAnalysis}
              isLoadingAi={isLoadingAi}
              regeneratingTone={regeneratingTone}
              onRegenerateTone={handleRegenerateTone}
            />
          </div>
        )}
      </main>
    </div>
  );
}

