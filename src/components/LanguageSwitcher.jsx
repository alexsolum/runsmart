import React from "react";
import { useI18n } from "../i18n/translations";

export default function LanguageSwitcher() {
  const { t, lang, setLanguage } = useI18n();

  return (
    <div className="flex gap-1" role="group" aria-label="Language switcher">
      <button
        type="button"
        className={`text-xs px-2 py-1 rounded font-semibold transition-colors ${
          lang === "en"
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
        onClick={() => setLanguage("en")}
        aria-pressed={lang === "en"}
      >
        {t("lang.en")}
      </button>
      <button
        type="button"
        className={`text-xs px-2 py-1 rounded font-semibold transition-colors ${
          lang === "no"
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
        onClick={() => setLanguage("no")}
        aria-pressed={lang === "no"}
      >
        {t("lang.no")}
      </button>
    </div>
  );
}
