import { CHAT_SAMPLES, type ChatSample } from "@/lib/samples";

export interface ChatInputPanelProps {
  chatText: string;
  errorMessage: string | null;
  isLoadingAi: boolean;
  onChangeText: (nextText: string) => void;
  onLoadSample: (sample: ChatSample) => void;
  onAnalyze: () => void;
  onClear: () => void;
}

export function ChatInputPanel({
  chatText,
  errorMessage,
  isLoadingAi,
  onChangeText,
  onLoadSample,
  onAnalyze,
  onClear,
}: ChatInputPanelProps) {
  return (
    <section
      aria-labelledby="dossier-input-heading"
      className="rounded-lg border border-slate-800 bg-slate-900/75 p-4 shadow-lg sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="dossier-input-heading"
            className="font-mono text-sm font-bold tracking-wider text-amber-400 uppercase"
          >
            01 // Ingreso de Evidencia (Historial de WhatsApp)
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Pegá el texto exportado con formato{" "}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200">
              dd/mm/aa, hh:mm - Autor: mensaje
            </code>{" "}
            o ejecutá un expediente de prueba en un clic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CHAT_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => onLoadSample(sample)}
              className="cursor-pointer rounded border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 font-mono text-xs font-medium text-amber-300 transition hover:border-amber-400 hover:bg-amber-900/40"
              title={sample.description}
            >
              Cargar ejemplo: {sample.id === "individual" ? "Individual" : "Grupal"}
            </button>
          ))}
        </div>
      </div>

      <label htmlFor="whatsapp-chat-input" className="sr-only">
        Historial de chat de WhatsApp
      </label>
      <textarea
        id="whatsapp-chat-input"
        value={chatText}
        onChange={(e) => onChangeText(e.target.value)}
        rows={8}
        placeholder={
          "12/11/26, 09:12 - Martina: Che estás?\n12/11/26, 09:14 - Martina: Necesito confirmar urgente a qué hora nos vemos hoy..."
        }
        className="w-full rounded border border-slate-700 bg-slate-950/90 p-3 font-mono text-xs leading-relaxed text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
      />

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 rounded border border-red-500/60 bg-red-950/40 px-3 py-2 font-mono text-xs text-red-300"
        >
          <span className="font-bold uppercase">Error de formato: </span>
          {errorMessage}
        </div>
      )}

      <div className="mt-4 flex flex-col justify-between gap-3 border-t border-slate-800/80 pt-3 sm:flex-row sm:items-center">
        <p className="font-mono text-[11px] text-slate-400">
          <span className="font-semibold text-amber-400 uppercase">
            Aviso táctico (RF-03):
          </span>{" "}
          Al analizar, el texto puede enviarse a un servicio de IA para generar el
          resumen y las respuestas sugeridas.
        </p>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {chatText.trim().length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="cursor-pointer rounded border border-slate-700 bg-slate-800/80 px-3 py-2 font-mono text-xs text-slate-300 transition hover:bg-slate-700"
            >
              Nuevo análisis
            </button>
          )}
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isLoadingAi}
            className="cursor-pointer rounded bg-amber-500 px-5 py-2 font-mono text-xs font-bold tracking-wider text-slate-950 uppercase transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingAi ? "Analizando expediente..." : "Analizar"}
          </button>
        </div>
      </div>
    </section>
  );
}
