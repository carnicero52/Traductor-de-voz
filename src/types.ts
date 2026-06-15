export type LangCode = "es" | "pt-BR" | "en";

export interface Language {
  code: LangCode;
  name: string;
  nativeName: string;
  flag: string;
  locale: string; // for SpeechRecognition
  synthLocale: string; // for SpeechSynthesis
}

export const LANGUAGES: Record<LangCode, Language> = {
  es: {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    locale: "es-ES",
    synthLocale: "es-ES",
  },
  "pt-BR": {
    code: "pt-BR",
    name: "Portuguese",
    nativeName: "Português (Brasil)",
    flag: "🇧🇷",
    locale: "pt-BR",
    synthLocale: "pt-BR",
  },
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇺🇸",
    locale: "en-US",
    synthLocale: "en-US",
  },
};

export interface Translation {
  lang: LangCode;
  text: string;
  pronunciation: string;
  explanation: string;
}

export interface TranslationResponse {
  translations: Translation[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  sourceLang: LangCode;
  text: string;
  translations: Translation[];
}
