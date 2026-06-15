import { useState } from "react";
import { HistoryItem, LANGUAGES } from "../types";
import { Trash2, RotateCcw, Volume2, Globe, Download, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TranslationHistoryProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onSpeak: (text: string, locale: string) => void;
  isHighContrast?: boolean;
  uiLang?: "es" | "en" | "pt";
}

const HISTORY_TRANSLATIONS = {
  es: {
    recent_history: "Historial Reciente",
    clear_all: "Borrar todo",
    restore: "Restaurar traducción",
    delete: "Eliminar del historial",
    play: "Reproducir pronunciación",
    export_txt: "Exportar TXT",
    export_json: "Exportar JSON",
    export_success: "¡Archivo descargado con éxito!",
  },
  en: {
    recent_history: "Recent History",
    clear_all: "Clear all",
    restore: "Restore translation",
    delete: "Delete from history",
    play: "Play pronunciation",
    export_txt: "Export TXT",
    export_json: "Export JSON",
    export_success: "File downloaded successfully!",
  },
  pt: {
    recent_history: "Histórico Recente",
    clear_all: "Apagar tudo",
    restore: "Restaurar tradução",
    delete: "Remover do histórico",
    play: "Reproduzir pronúncia",
    export_txt: "Exportar TXT",
    export_json: "Exportar JSON",
    export_success: "Arquivo baixado com sucesso!",
  },
};

export default function TranslationHistory({
  items,
  onSelect,
  onDelete,
  onClearAll,
  onSpeak,
  isHighContrast = false,
  uiLang = "es",
}: TranslationHistoryProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingTxt, setIsExportingTxt] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);

  if (items.length === 0) return null;

  const t = (key: keyof typeof HISTORY_TRANSLATIONS["es"]) => {
    return HISTORY_TRANSLATIONS[uiLang][key] || HISTORY_TRANSLATIONS["es"][key];
  };

  const exportTXT = () => {
    setIsExportingTxt(true);
    setToastMessage(`${t("export_txt")} - ${t("export_success")}`);
    
    const formattedText = items
      .map((item) => {
        const dateStr = new Date(item.timestamp).toLocaleString();
        const translationsStr = item.translations
          .map((t) => `  [${t.lang}] -> "${t.text}"` + (t.pronunciation ? ` (Pronunciación: ${t.pronunciation})` : ""))
          .join("\n");
        return `[${dateStr}] (${item.sourceLang}): "${item.text}"\nTraducciones:\n${translationsStr}`;
      })
      .join("\n\n" + "=".repeat(40) + "\n\n");

    const blob = new Blob([formattedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historial_traducciones_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTimeout(() => setIsExportingTxt(false), 2000);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const exportJSON = () => {
    setIsExportingJson(true);
    setToastMessage(`${t("export_json")} - ${t("export_success")}`);

    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historial_traducciones_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTimeout(() => setIsExportingJson(false), 2000);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className={`w-full max-w-2xl mt-8 pt-6 border-t transition-colors duration-300 ${isHighContrast ? "border-white" : "border-slate-800"}`} id="history-section">
      
      {/* SUCCESS TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-semibold border backdrop-blur-lg ${
              isHighContrast
                ? "bg-black text-white border-2 border-white"
                : "bg-slate-900/90 text-white border-cyan-500/25 shadow-cyan-500/10"
            }`}
          >
            <div className={`p-1 rounded-full ${isHighContrast ? "bg-white text-black" : "bg-emerald-500/20 text-emerald-400"}`}>
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className={`text-sm font-semibold tracking-wider uppercase font-display flex items-center gap-2 ${isHighContrast ? "text-white" : "text-slate-400"}`}>
          <Globe className={`w-4 h-4 ${isHighContrast ? "text-white" : "text-slate-500"}`} />
          {t("recent_history")}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Txt Button */}
          <button
            id="btn-export-txt"
            disabled={isExportingTxt}
            onClick={exportTXT}
            className={`text-xs transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all select-none ${
              isHighContrast
                ? "text-white bg-black border-2 border-white disabled:bg-white disabled:text-black"
                : "text-cyan-400 disabled:text-emerald-400 bg-slate-900 border border-transparent hover:border-cyan-500/25 disabled:border-emerald-500/30"
            }`}
          >
            {isExportingTxt ? (
              <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{t("export_txt")}</span>
              </motion.div>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{t("export_txt")}</span>
              </>
            )}
          </button>

          {/* Export Json Button */}
          <button
            id="btn-export-json"
            disabled={isExportingJson}
            onClick={exportJSON}
            className={`text-xs transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all select-none ${
              isHighContrast
                ? "text-white bg-black border-2 border-white disabled:bg-white disabled:text-black"
                : "text-indigo-400 disabled:text-emerald-400 bg-slate-900 border border-transparent hover:border-indigo-500/25 disabled:border-emerald-500/30"
            }`}
          >
            {isExportingJson ? (
              <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{t("export_json")}</span>
              </motion.div>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{t("export_json")}</span>
              </>
            )}
          </button>

          {/* Clear history button */}
          <button
            id="btn-clear-history"
            onClick={onClearAll}
            className={`text-xs transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all ${
              isHighContrast
                ? "text-white hover:text-black bg-black hover:bg-white border-2 border-white"
                : "text-rose-400 hover:text-rose-300 hover:bg-slate-900"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("clear_all")}
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1" id="history-list">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const srcLang = LANGUAGES[item.sourceLang];
            return (
              <motion.div
                key={item.id}
                id={`history-item-${item.id}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
                className={`p-3.5 rounded-xl transition-all flex flex-col gap-2.5 ${
                  isHighContrast
                    ? "bg-black border-2 border-white text-white"
                    : "p-3.5 bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 text-slate-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{srcLang?.flag}</span>
                    <span className={`text-xs font-medium ${isHighContrast ? "text-white" : "text-slate-400"}`}>
                      {srcLang?.nativeName}
                    </span>
                    <span className={`text-[10px] font-mono ${isHighContrast ? "text-white" : "text-slate-600"}`}>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-restore-${item.id}`}
                      onClick={() => onSelect(item)}
                      title={t("restore")}
                      className={`p-1 rounded-md transition-all ${isHighContrast ? "text-white hover:text-black hover:bg-white border border-white" : "text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60"}`}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      id={`btn-delete-${item.id}`}
                      onClick={() => onDelete(item.id)}
                      title={t("delete")}
                      className={`p-1 rounded-md transition-all ${isHighContrast ? "text-white hover:text-black hover:bg-white border border-white" : "text-slate-400 hover:text-rose-400 hover:bg-slate-800/60"}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className={`text-sm font-medium pl-1 ${isHighContrast ? "text-white" : "text-slate-200"}`}>
                  "{item.text}"
                </div>

                {/* Target translation bubbles */}
                <div className={`flex flex-wrap gap-2 pt-1 border-t ${isHighContrast ? "border-white" : "border-slate-800/40"}`}>
                  {item.translations.map((trans, idx) => {
                    const tarLang = LANGUAGES[trans.lang];
                    return (
                      <div
                        key={trans.lang + idx}
                        id={`history-trans-${item.id}-${trans.lang}`}
                        className={`flex-1 min-w-[200px] flex items-start justify-between gap-2 p-2 rounded-lg text-xs ${
                          isHighContrast
                            ? "bg-black border border-white text-white"
                            : "bg-slate-950/40 border border-slate-800/40"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-slate-400">
                            <span>{tarLang?.flag}</span>
                            <span className={`font-semibold text-[10px] uppercase tracking-wider ${isHighContrast ? "text-white font-black" : "text-slate-500"}`}>
                              {tarLang?.name}
                            </span>
                          </div>
                          <div className={`${isHighContrast ? "text-white font-semibold" : "text-slate-300"} font-medium`}>
                            {trans.text}
                          </div>
                        </div>
                        <button
                          id={`btn-speak-${item.id}-${trans.lang}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSpeak(trans.text, tarLang?.synthLocale || "en-US");
                          }}
                          className={`p-1 rounded transition ${isHighContrast ? "bg-white text-black hover:bg-zinc-200" : "bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-700"}`}
                          title={t("play")}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
