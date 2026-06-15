/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Languages,
  ArrowRightLeft,
  BookOpen,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Send,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  Contrast,
  Wifi,
  WifiOff,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  LangCode,
  LANGUAGES,
  Translation,
  HistoryItem,
} from "./types";
import {
  getSpeechRecognition,
  isSpeechRecognitionSupported,
  speakText,
} from "./utils/speech";
import AudioWaveform from "./components/AudioWaveform";
import TranslationHistory from "./components/TranslationHistory";

// Predefined communication pairs as a user-friendly selection
type ModeId = "es_both" | "es_en" | "es_pt" | "en_es" | "pt_es" | "auto";

interface TranslationMode {
  id: ModeId;
  label: string;
  source: LangCode | "auto";
  targets: LangCode[];
  iconText: string;
}

const TRANSLATION_MODES: TranslationMode[] = [
  {
    id: "auto",
    label: "Auto-detectar ➔ ES/EN/PT",
    source: "auto",
    targets: ["en", "es", "pt-BR"],
    iconText: "✨ ➔ 🌎",
  },
  {
    id: "es_both",
    label: "Español ➔ Ambos (EN & PT)",
    source: "es",
    targets: ["en", "pt-BR"],
    iconText: "🇪🇸 ➔ 🇺🇸🇧🇷",
  },
  {
    id: "es_en",
    label: "Español ➔ Inglés",
    source: "es",
    targets: ["en"],
    iconText: "🇪🇸 ➔ 🇺🇸",
  },
  {
    id: "es_pt",
    label: "Español ➔ Portugués",
    source: "es",
    targets: ["pt-BR"],
    iconText: "🇪🇸 ➔ 🇧🇷",
  },
  {
    id: "en_es",
    label: "Inglés ➔ Español",
    source: "en",
    targets: ["es"],
    iconText: "🇺🇸 ➔ 🇪🇸",
  },
  {
    id: "pt_es",
    label: "Portugués ➔ Español",
    source: "pt-BR",
    targets: ["es"],
    iconText: "🇧🇷 ➔ 🇪🇸",
  },
];

export interface PredefinedPhrase {
  category: "greetings" | "travel" | "emergency";
  sourceText: string;
  sourceLang: LangCode;
  translations: Record<LangCode, { text: string; pronunciation: string; explanation: string }>;
}

export const PREDEFINED_PHRASES: PredefinedPhrase[] = [
  // Spanish Source (es)
  {
    category: "greetings",
    sourceText: "Hola, ¿cómo estás?",
    sourceLang: "es",
    translations: {
      en: { text: "Hello, how are you?", pronunciation: "He-lóu, háo ar iú?", explanation: "Saludo general formal e informal en inglés." },
      "pt-BR": { text: "Olá, como você está?", pronunciation: "O-lá, có-mo vo-cê es-tá?", explanation: "Cumprimento comum em português do Brasil." },
      es: { text: "Hola, ¿cómo estás?", pronunciation: "", explanation: "" }
    }
  },
  {
    category: "greetings",
    sourceText: "Muchas gracias por tu ayuda.",
    sourceLang: "es",
    translations: {
      en: { text: "Thank you very much for your help.", pronunciation: "Zénk iú vé-ri mach for iór jelp.", explanation: "Expresar agradecimiento de manera educada." },
      "pt-BR": { text: "Muito obrigado pela sua ajuda.", pronunciation: "Múito o-bri-gá-do péla súa a-júda.", explanation: "Agradecimento comum. Use 'obrigada' se você se identificar no feminino." },
      es: { text: "Muchas gracias por tu ayuda.", pronunciation: "", explanation: "" }
    }
  },
  {
    category: "travel",
    sourceText: "¿Dónde está la estación de tren más cercana?",
    sourceLang: "es",
    translations: {
      en: { text: "Where is the nearest train station?", pronunciation: "Uér is dâ ní-rest tréin stéi-shon?", explanation: "Preguntar por indicaciones para la estación ferroviaria." },
      "pt-BR": { text: "Onde fica a estação de trem mais próxima?", pronunciation: "Ón-de fí-ca a es-ta-ção de trêin máis pró-ssi-ma?", explanation: "Pedir direções para transporte público." },
      es: { text: "¿Dónde está la estación de tren más cercana?", pronunciation: "", explanation: "" }
    }
  },
  {
    category: "travel",
    sourceText: "¿Cuánto cuesta un boleto para el centro?",
    sourceLang: "es",
    translations: {
      en: { text: "How much does a ticket to downtown cost?", pronunciation: "Háo mach daz e tí-ket tu dáun-táun cost?", explanation: "Preguntar precios de transporte urbano." },
      "pt-BR": { text: "Quanto custa uma passagem para o centro?", pronunciation: "Quán-to cús-ta úma pa-sá-gem pá-ra o cén-tro?", explanation: "A palavra 'passagem' é usada para tíquetes de transporte." },
      es: { text: "¿Cuánto cuesta un boleto para el centro?", pronunciation: "", explanation: "" }
    }
  },
  {
    category: "travel",
    sourceText: "¿Me puede recomendar un buen restaurante local?",
    sourceLang: "es",
    translations: {
      en: { text: "Can you recommend a good local restaurant?", pronunciation: "Quian iú re-co-ménd e gud lóu-cal rés-tor-ant?", explanation: "Preguntar a gente local por recomendaciones gastronómicas." },
      "pt-BR": { text: "Você pode me recomendar um bom restaurante local?", pronunciation: "Vo-cê pó-de me re-co-men-dár um bom restaurante local?", explanation: "Recomendação culinária regional." },
      es: { text: "¿Me puede recomendar un buen restaurante local?", pronunciation: "", explanation: "" }
    }
  },
  {
    category: "emergency",
    sourceText: "Necesito ayuda, por favor.",
    sourceLang: "es",
    translations: {
      en: { text: "I need help, please.", pronunciation: "Ái nid jelp, plis.", explanation: "Pedir auxilio de forma directo e inmediato." },
      "pt-BR": { text: "Preciso de ajuda, por favor.", pronunciation: "Pre-cí-zo de a-jú-da, por fa-vór.", explanation: "Pedido urgente e educado de auxílio." },
      es: { text: "Necesito ayuda, por favor.", pronunciation: "", explanation: "" }
    }
  },
  {
    category: "emergency",
    sourceText: "¿Dónde está el hospital más cercano?",
    sourceLang: "es",
    translations: {
      en: { text: "Where is the nearest hospital?", pronunciation: "Uér is dâ ní-rest jós-pi-tal?", explanation: "Solicitar asistencia médica de emergencia." },
      "pt-BR": { text: "Onde fica o hospital mais próximo?", pronunciation: "Ón-de fí-ca o os-pi-tál máis pró-ssi-mo?", explanation: "Procura urgente de atendimento de saúde." },
      es: { text: "¿Dónde está el hospital más cercano?", pronunciation: "", explanation: "" }
    }
  },

  // English Source (en)
  {
    category: "greetings",
    sourceText: "Hello, how are you?",
    sourceLang: "en",
    translations: {
      es: { text: "Hola, ¿cómo estás?", pronunciation: "Ó-la, có-mo es-tás?", explanation: "Saludo básico habitual en español." },
      "pt-BR": { text: "Olá, como você está?", pronunciation: "O-lá, có-mo vo-cê es-tá?", explanation: "Saudação cortês em português brasileiro." },
      en: { text: "Hello, how are you?", pronunciation: "", explanation: "" }
    }
  },
  {
    category: "greetings",
    sourceText: "Thank you very much.",
    sourceLang: "en",
    translations: {
      es: { text: "Muchas gracias.", pronunciation: "Mú-chas grá-cias.", explanation: "Expresión estándar de gratitud." },
      "pt-BR": { text: "Muito obrigado.", pronunciation: "Múito o-bri-gá-do.", explanation: "Agradecimento masculino. Mulheres dizem 'Muito obrigada'." },
      en: { text: "Thank you very much.", pronunciation: "", explanation: "" }
    }
  },
  {
    category: "travel",
    sourceText: "Where is the bathroom?",
    sourceLang: "en",
    translations: {
      es: { text: "¿Dónde está el baño?", pronunciation: "Dón-de es-tá el bá-ño?", explanation: "Preguntar por el aseo público o de un local." },
      "pt-BR": { text: "Onde fica o banheiro?", pronunciation: "Ón-de fí-ca o ba-nhéi-ro?", explanation: "Perguntar onde fica o sanitário." },
      en: { text: "Where is the bathroom?", pronunciation: "", explanation: "" }
    }
  },
  {
    category: "travel",
    sourceText: "How much does this cost?",
    sourceLang: "en",
    translations: {
      es: { text: "¿Cuánto cuesta esto?", pronunciation: "Cuán-to cués-ta és-to?", explanation: "Consultar el precio de un objeto en una tienda." },
      "pt-BR": { text: "Quanto custa isso?", pronunciation: "Quán-to cús-ta ís-so?", explanation: "Perguntar preço de bens ou serviços." },
      en: { text: "How much does this cost?", pronunciation: "", explanation: "" }
    }
  },
  {
    category: "emergency",
    sourceText: "Please call an ambulance.",
    sourceLang: "en",
    translations: {
      es: { text: "Por favor, llame a una ambulancia.", pronunciation: "Por fa-vór, iá-me a úna am-bu-lán-cia.", explanation: "Pedir asistencia médica telefónica urgente." },
      "pt-BR": { text: "Por favor, chame uma ambulância.", pronunciation: "Por fa-vór, chá-me úma am-bu-lân-cia.", explanation: "Pedido grave de assistência de primeiros socorros." },
      en: { text: "Please call an ambulance.", pronunciation: "", explanation: "" }
    }
  },

  // Portuguese Source (pt-BR)
  {
    category: "greetings",
    sourceText: "Olá, tudo bem?",
    sourceLang: "pt-BR",
    translations: {
      es: { text: "Hola, ¿todo bien?", pronunciation: "Ó-la, tó-do bién?", explanation: "Saludo sumamente común e informal." },
      en: { text: "Hello, is everything okay?", pronunciation: "He-lóu, is é-vri-zing o-kéi?", explanation: "Friendly, casual check-in greeting." },
      "pt-BR": { text: "Olá, tudo bem?", pronunciation: "", explanation: "" }
    }
  },
  {
    category: "travel",
    sourceText: "Onde posso conseguir um táxi ou Uber?",
    sourceLang: "pt-BR",
    translations: {
      es: { text: "¿Dónde puedo conseguir un taxi o Uber?", pronunciation: "Dón-de pué-do con-se-gúir un tác-si o Ú-ber?", explanation: "Buscar transportes privados locales." },
      en: { text: "Where can I get a taxi or Uber?", pronunciation: "Uér quian ái gét e tác-si or Ú-ber?", explanation: "Asking directions or advice for private transport options." },
      "pt-BR": { text: "Onde posso conseguir um táxi ou Uber?", pronunciation: "", explanation: "" }
    }
  },
  {
    category: "emergency",
    sourceText: "Eu me perdi, pode me ajudar a voltar ao hotel?",
    sourceLang: "pt-BR",
    translations: {
      es: { text: "Me perdí, ¿puede ayudarme a volver al hotel?", pronunciation: "Me per-dí, pué-de a-iu-dár-me a vol-vér al o-tél?", explanation: "Pedir auxilio por desorientación." },
      en: { text: "I am lost, can you help me get back to the hotel?", pronunciation: "Ái em lost, quian iú jelp mi gét bac tu dâ jo-tél?", explanation: "Asking for navigational help back to your hotel." },
      "pt-BR": { text: "Eu me perdi, pode me ajudar a voltar ao hotel?", pronunciation: "", explanation: "" }
    }
  }
];

const DICTIONARY = {
  es: {
    ai_realtime: "Inteligencia Artificial en Tiempo Real",
    subtitle: "Traducción instantánea de voz hablada entre Español, Inglés y Portugués (Brasil).",
    playback_voices: "Voces de Reproducción",
    speed: "Velocidad",
    capturing_voice: "• Capturando voz...",
    channel_ready: "Canal listo",
    stop_capturing: "Detener captura",
    speak_now: "Hablar ahora",
    speak_clearly: "Habla claro. Toca el botón rojo para finalizar.",
    press_to_speak: "Presiona para hablar en",
    mic_not_supported: "Tu navegador no soporta entrada de voz. Utiliza el campo de escritura manual.",
    mic_denied: "Acceso al micrófono denegado. Permite su uso en la barra del navegador.",
    no_speech_detected: "No se detectó voz hablada. Intenta nuevamente.",
    capture_error: "Error de captura",
    cannot_start_recorder: "No se pudo iniciar el grabador de voz.",
    translation_failed: "No se pudo realizar la traducción. Verifica tu conexión de red o API key.",
    phrase_in: "Frase en",
    clear: "Limpiar",
    listening: "Escuchando lo que dices...",
    placeholder_input: "Escribe algo para traducir aquí...",
    translate_text: "Traducir texto",
    translating: "Traduciendo con Gemini 3.5...",
    copy_translation: "Copiar traducción",
    playing: "Reproduciendo...",
    play_sound: "Reproducir sonido",
    recent_history: "Historial Reciente",
    clear_all: "Borrar todo",
    normal_contrast: "Contraste Normal",
    high_contrast: "Alto Contraste",
    footer_credits: "© 2026 BabelVoices. Desarrollado con el SDK oficial de Google Gemini.",
    speech_not_supported: "Captura de voz no detectada en este navegador. Se recomienda usar Google Chrome o Safari. Puedes escribir tu frase abajo.",
    voice_for: "Voz para",
    mode_es_both: "Ambos (EN & PT)",
    mode_es_en: "Inglés",
    mode_es_pt: "Portugués",
    mode_en_es: "Español",
    mode_pt_es: "Español",
    lang_es: "Español",
    lang_en: "Inglés",
    lang_pt: "Portugués",

    // Offline Translation Strings
    offline_translated: "Traducción desde caché offline",
    offline_banner: "Modo Offline Activo: Traduciendo vía caché de historial y frases pregrabadas.",
    offline_badge: "Historial/Caché Offline",
    offline_badge_predefined: "Pregrabado Offline",
    common_phrases: "Frases de Utilidad y Viaje",
    no_offline_match: "No se encontró traducción offline. Prueba con una frase de viaje pregrabada abajo o algo de tu historial reciente.",
    greetings: "Saludos",
    travel: "Viaje",
    emergency: "Urgencias",
    force_offline: "Forzar Modo Offline",
    online_status: "Conectado",
    offline_status: "Offline",
    click_to_translate: "Toca para traducir inmediatamente",
    search_placeholder: "Buscar frases de utilidad...",
    quota_exceeded_title: "Límite de cuota API excedido",
    quota_exceeded_desc: "El servicio en la nube de Gemini ha agotado la cuota gratuita temporalmente. Hemos activado la búsqueda inteligente offline. ¡Puedes buscar o pulsar frases de la guía útil de viaje abajo!",
    any_language: "Cualquier idioma (ES/EN/PT)",
  },
  en: {
    ai_realtime: "Real-Time Artificial Intelligence",
    subtitle: "Instant translation of spoken voice between Spanish, English, and Portuguese (Brazil).",
    playback_voices: "Playback Voices",
    speed: "Speed",
    capturing_voice: "• Capturing voice...",
    channel_ready: "Channel ready",
    stop_capturing: "Stop capturing",
    speak_now: "Speak now",
    speak_clearly: "Speak clearly. Tap the red button to finish.",
    press_to_speak: "Press to speak in",
    mic_not_supported: "Your browser does not support voice input. Use the manual writing field.",
    mic_denied: "Microphone access denied. Please allow its use in the browser bar.",
    no_speech_detected: "No spoken voice was detected. Try again.",
    capture_error: "Capture error",
    cannot_start_recorder: "Could not start voice recorder.",
    translation_failed: "Translation failed. Check your network connection or API key.",
    phrase_in: "Phrase in",
    clear: "Clear",
    listening: "Listening to what you say...",
    placeholder_input: "Write something to translate here...",
    translate_text: "Translate text",
    translating: "Translating with Gemini 3.5...",
    copy_translation: "Copy translation",
    playing: "Playing...",
    play_sound: "Play sound",
    recent_history: "Recent History",
    clear_all: "Clear all",
    normal_contrast: "Normal Contrast",
    high_contrast: "High Contrast",
    footer_credits: "© 2026 BabelVoices. Developed with the official Google Gemini SDK.",
    speech_not_supported: "Voice input is not supported in this browser. We recommend using Google Chrome or Safari. You can type your text below.",
    voice_for: "Voice for",
    mode_es_both: "Both (EN & PT)",
    mode_es_en: "English",
    mode_es_pt: "Portuguese",
    mode_en_es: "Spanish",
    mode_pt_es: "Spanish",
    lang_es: "Spanish",
    lang_en: "English",
    lang_pt: "Portuguese",

    // Offline Translation Strings
    offline_translated: "Translation from offline cache",
    offline_banner: "Offline Mode Active: Translating using local history and pre-recorded travel phrases.",
    offline_badge: "Offline History/Cache",
    offline_badge_predefined: "Pre-recorded Offline",
    common_phrases: "Travel & Utility Phrases",
    no_offline_match: "No offline translation found. Try a pre-recorded travel phrase below or something from your recent history.",
    greetings: "Greetings",
    travel: "Travel",
    emergency: "Urgent",
    force_offline: "Force Offline Mode",
    online_status: "Online",
    offline_status: "Offline",
    click_to_translate: "Tap to translate instantly",
    search_placeholder: "Search utility phrases...",
    quota_exceeded_title: "API Quota Limit Exceeded",
    quota_exceeded_desc: "The cloud Gemini API has temporarily reached its free daily quota limit. We have activated our intelligent offline search. Try selecting or searching phrases in the Travel Guide below!",
    any_language: "Any language (ES/EN/PT)",
  },
  pt: {
    ai_realtime: "Inteligência Artificial em Tempo Real",
    subtitle: "Tradução instantânea de voz falada entre Espanhol, Inglês e Português (Brasil).",
    playback_voices: "Vozes de Reprodução",
    speed: "Velocidade",
    capturing_voice: "• Capturando voz...",
    channel_ready: "Canal pronto",
    stop_capturing: "Parar captura",
    speak_now: "Falar agora",
    speak_clearly: "Fale claramente. Toque no botão vermelho para finalizar.",
    press_to_speak: "Pressione para falar em",
    mic_not_supported: "O seu navegador não suporta entrada de voz. Use o campo de digitação manual.",
    mic_denied: "Acesso ao microfone negado. Permita o uso na barra do navegador.",
    no_speech_detected: "Nenhuma voz falada foi detectada. Tente novamente.",
    capture_error: "Erro de captura",
    cannot_start_recorder: "Não foi possível iniciar o gravador de voz.",
    translation_failed: "Falha na tradução. Verifique sua conexão de rede ou chave de API.",
    phrase_in: "Frase em",
    clear: "Limpar",
    listening: "Ouvindo o que você diz...",
    placeholder_input: "Escreva algo para traduzir aqui...",
    translate_text: "Traduzir texto",
    translating: "Traduzindo com Gemini 3.5...",
    copy_translation: "Copiar tradução",
    playing: "Reproduzindo...",
    play_sound: "Reproduzir som",
    recent_history: "Histórico Recente",
    clear_all: "Apagar tudo",
    normal_contrast: "Contraste Normal",
    high_contrast: "Alto Contraste",
    footer_credits: "© 2026 BabelVoices. Desenvolvido com o SDK oficial do Google Gemini.",
    speech_not_supported: "Entrada de voz não disponível neste navegador. Recomendamos usar o Google Chrome ou Safari. Você pode digitar abaixo.",
    voice_for: "Voz para",
    mode_es_both: "Ambos (EN & PT)",
    mode_es_en: "Inglês",
    mode_es_pt: "Português",
    mode_en_es: "Espanhol",
    mode_pt_es: "Espanhol",
    lang_es: "Espanhol",
    lang_en: "Inglês",
    lang_pt: "Português",

    // Offline Translation Strings
    offline_translated: "Tradução via cache offline",
    offline_banner: "Modo Offline Ativo: Traduzindo usando cache de histórico e frases salvas.",
    offline_badge: "Histórico/Cache Offline",
    offline_badge_predefined: "Pré-gravado Offline",
    common_phrases: "Frases de Utilidade e Viagem",
    no_offline_match: "Nenhuma tradução offline encontrada. Tente uma frase de viagem pré-gravada abaixo ou do seu histórico recente.",
    greetings: "Saudações",
    travel: "Viagem",
    emergency: "Urgência",
    force_offline: "Forçar Modo Offline",
    online_status: "Online",
    offline_status: "Offline",
    click_to_translate: "Toque para traduzir instantaneamente",
    search_placeholder: "Buscar frases de utilidade...",
    quota_exceeded_title: "Limite de Cota da API Excedido",
    quota_exceeded_desc: "O serviço na nuvem Gemini atingiu temporariamente o limite de cota gratuita cotidiana. Ativamos a busca inteligente offline. Tente buscar ou selecionar frases do guia útil de viagem abaixo!",
    any_language: "Qualquer idioma (ES/EN/PT)",
  }
};

const getVoiceLabel = (v: SpeechSynthesisVoice) => {
  const name = v.name;
  let genderIndicator = "";
  if (/female|hazel|zira|samantha|helena|maria|lucia|susan|karen|veena|moira|tessa|sara|elene/i.test(name)) {
    genderIndicator = " ♀ (Fem)";
  } else if (/male|david|george|mark|ravi|richard|cosme|antonio|daniel/i.test(name)) {
    genderIndicator = " ♂ (Masc)";
  }
  return `${v.name}${genderIndicator}`;
};

const detectLanguage = (text: string): LangCode => {
  const clean = text.toLowerCase().trim();
  if (!clean) return "es"; // Default fallback

  // Highly distinctive stopwords for score-based guessing
  const spanishWords = [
    "hola", "como", "gracias", "buenos", "dias", "que", "para", "por", "con", "es", "el", "la", "los", "las", "un", "una", "en", "de", "si", "no", "bien", "esta", "donde", "cuando", "quien", "ayuda", "por favor", "adios", "amigo", "casa", "lo", "me", "te", "se", "del", "al"
  ];
  const englishWords = [
    "hello", "how", "thanks", "thank", "good", "morning", "afternoon", "evening", "what", "for", "by", "with", "is", "the", "a", "an", "in", "of", "yes", "no", "well", "this", "where", "when", "who", "why", "to", "do", "have", "want", "need", "help", "please", "bye", "friend", "house", "time", "you", "are", "it", "that"
  ];
  const portugueseWords = [
    "olá", "ola", "como", "obrigado", "obrigada", "bom", "dia", "tarde", "noite", "que", "para", "por", "com", "é", "o", "a", "os", "as", "um", "uma", "em", "de", "sim", "não", "nao", "bem", "esta", "onde", "quando", "quem", "ajuda", "por favor", "tchau", "amigo", "casa", "tempo", "você", "voce", "do", "da", "no", "na"
  ];

  let esScore = 0;
  let enScore = 0;
  let ptScore = 0;

  // Simple token matching
  const words = clean.split(/\s+/);
  for (const w of words) {
    const wordClean = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g, "");
    if (spanishWords.includes(wordClean)) esScore++;
    if (englishWords.includes(wordClean)) enScore++;
    if (portugueseWords.includes(wordClean)) ptScore++;
  }

  // Accent and special character markings
  if (clean.includes("ñ") || clean.includes("¿") || clean.includes("¡") || clean.includes("y ") || clean.includes(" muy ")) {
    esScore += 4;
  }
  if (clean.includes("ç") || clean.includes("õ") || clean.includes("ã") || clean.includes("ê") || clean.includes("lh") || clean.includes("nh")) {
    ptScore += 4;
  }

  console.log(`Language detection scores -> es: ${esScore}, en: ${enScore}, pt: ${ptScore}`);

  if (esScore === 0 && enScore === 0 && ptScore === 0) {
    // Fallback to browser primary language if specified
    const navLanguage = typeof navigator !== "undefined" ? (navigator.language || "").toLowerCase() : "";
    if (navLanguage.startsWith("pt")) return "pt-BR";
    if (navLanguage.startsWith("en")) return "en";
    return "es";
  }

  if (esScore >= enScore && esScore >= ptScore) {
    return "es";
  } else if (ptScore >= esScore && ptScore >= enScore) {
    return "pt-BR";
  } else {
    return "en";
  }
};

export default function App() {
  const [activeMode, setActiveMode] = useState<TranslationMode>(TRANSLATION_MODES[0]);
  const [textToTranslate, setTextToTranslate] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [error, setError] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [speakingLang, setSpeakingLang] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURIs, setSelectedVoiceURIs] = useState<Record<string, string>>({});

  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [uiLang, setUiLang] = useState<"es" | "en" | "pt">("es");

  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [forceOffline, setForceOffline] = useState<boolean>(false);
  const [offlineCategory, setOfflineCategory] = useState<"all" | "greetings" | "travel" | "emergency">("all");
  const [offlineSearch, setOfflineSearch] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const activeOffline = isOffline || forceOffline;

  const t = (key: keyof typeof DICTIONARY["es"]) => {
    return DICTIONARY[uiLang][key] || DICTIONARY["es"][key];
  };

  const recognitionRef = useRef<any>(null);
  const transcriptionBufferRef = useRef<string>("");

  // Load SpeechSynthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      // Filter for languages we care about: es, pt, en
      const filtered = allVoices.filter((v) => {
        const lowerLang = v.lang.toLowerCase();
        return (
          lowerLang.startsWith("es") ||
          lowerLang.startsWith("en") ||
          lowerLang.startsWith("pt")
        );
      });
      setVoices(filtered);

      // Initialize default selections for our target languages (es, en, pt-BR)
      setSelectedVoiceURIs((prev) => {
        const next = { ...prev };
        ["es", "en", "pt-BR"].forEach((langCode) => {
          if (!next[langCode]) {
            const match = filtered.find(
              (v) =>
                v.lang.toLowerCase().replaceAll("_", "-").startsWith(langCode.toLowerCase().split("-")[0])
            );
            if (match) {
              next[langCode] = match.voiceURI;
            }
          }
        });
        return next;
      });
    };

    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Load History, Contrast Theme and Speech Rate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("voice_translator_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }

    try {
      const savedTheme = localStorage.getItem("high_contrast_theme");
      if (savedTheme === "true") {
        setIsHighContrast(true);
      }
    } catch (e) {
      console.error("Failed to load theme preference:", e);
    }

    try {
      const savedRate = localStorage.getItem("speech_rate");
      if (savedRate) {
        const parsed = parseFloat(savedRate);
        if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) {
          setSpeechRate(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load speech rate preference:", e);
    }

    try {
      const savedUiLang = localStorage.getItem("ui_lang");
      if (savedUiLang === "es" || savedUiLang === "en" || savedUiLang === "pt") {
        setUiLang(savedUiLang as "es" | "en" | "pt");
      }
    } catch (e) {
      console.error("Failed to load ui language preference:", e);
    }
  }, []);

  const toggleHighContrast = () => {
    const newVal = !isHighContrast;
    setIsHighContrast(newVal);
    localStorage.setItem("high_contrast_theme", String(newVal));
  };

  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    localStorage.setItem("speech_rate", String(newRate));
  };

  const handleUiLangChange = (lang: "es" | "en" | "pt") => {
    setUiLang(lang);
    localStorage.setItem("ui_lang", lang);
  };

  // Save History to localStorage
  const saveHistory = (newHistory: HistoryItem[]) => {
    try {
      setHistory(newHistory);
      localStorage.setItem("voice_translator_history", JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  };

  // Stop recording on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Change modes manually
  const selectMode = (mode: TranslationMode) => {
    if (isRecording) {
      stopRecording();
    }
    setActiveMode(mode);
    setTranslations([]);
    setTextToTranslate("");
    setTranscript("");
    setError("");
  };

  // Perform translation request through backend `/api/translate` or offline lookup
  const handleTranslation = async (sourceText: string, modeOverride?: TranslationMode) => {
    if (!sourceText.trim()) return;

    setIsLoading(true);
    setError("");

    const trimmedText = sourceText.trim();
    let currentMode = modeOverride || activeMode;

    if (currentMode.source === "auto") {
      const detectedLang = detectLanguage(trimmedText);
      let matchedMode = TRANSLATION_MODES.find(m => m.id === "es_both");
      if (detectedLang === "en") {
        matchedMode = TRANSLATION_MODES.find(m => m.id === "en_es");
      } else if (detectedLang === "pt-BR") {
        matchedMode = TRANSLATION_MODES.find(m => m.id === "pt_es");
      }

      if (matchedMode) {
        currentMode = matchedMode;
        setActiveMode(matchedMode);

        const langNames: Record<string, string> = {
          es: "Español",
          en: "English",
          "pt-BR": "Português"
        };
        const detectedLabel = langNames[detectedLang] || detectedLang;
        setError(`✨ Auto-detect: [${detectedLabel}] detected. Mode changed to ${matchedMode.label}`);
        setTimeout(() => setError(""), 6000);
      }
    }

    const reallyOffline = forceOffline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (reallyOffline) {
      // 1. Check exact pre-recorded phrase match (ignoring whitespace & basic symbols)
      const sanitize = (txt: string) => txt.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g, "").trim();
      const sanitizedSearch = sanitize(trimmedText);

      const matchedPredefined = PREDEFINED_PHRASES.find(
        (p) =>
          p.sourceLang === currentMode.source &&
          sanitize(p.sourceText) === sanitizedSearch
      );

      if (matchedPredefined) {
        const results: Translation[] = currentMode.targets.map((tgt) => {
          const tData = matchedPredefined.translations[tgt];
          return {
            lang: tgt,
            text: tData?.text || "",
            pronunciation: tData?.pronunciation || "",
            explanation: `${t("offline_badge_predefined")} - ${t("offline_translated")}`
          };
        });

        setTimeout(() => {
          setTranslations(results);
          setIsLoading(false);

          // Add to history list to keep track of recent actions
          const historyItem: HistoryItem = {
            id: "of_" + Date.now().toString(),
            timestamp: Date.now(),
            sourceLang: currentMode.source,
            text: trimmedText,
            translations: results,
          };
          saveHistory([historyItem, ...history.filter(h => sanitize(h.text) !== sanitizedSearch).slice(0, 49)]);

          // Speak auto playback
          if (results.length === 1) {
            const singleTrans = results[0];
            const targetLangConfig = LANGUAGES[singleTrans.lang];
            if (targetLangConfig) {
              const selectedURI = selectedVoiceURIs[singleTrans.lang];
              handleSpeak(singleTrans.text, targetLangConfig.synthLocale, selectedURI);
            }
          }
        }, 300);
        return;
      }

      // 2. Check history for exact query match from previous translated phrases
      const matchedHistory = history.find(
        (h) =>
          h.sourceLang === currentMode.source &&
          sanitize(h.text) === sanitizedSearch
      );

      if (matchedHistory) {
        setTimeout(() => {
          setTranslations(matchedHistory.translations);
          setIsLoading(false);

          if (matchedHistory.translations.length === 1) {
            const singleTrans = matchedHistory.translations[0];
            const targetLangConfig = LANGUAGES[singleTrans.lang];
            if (targetLangConfig) {
              const selectedURI = selectedVoiceURIs[singleTrans.lang];
              handleSpeak(singleTrans.text, targetLangConfig.synthLocale, selectedURI);
            }
          }
        }, 300);
        return;
      }

      // 3. Substring matching as fallback
      const partialPredefined = PREDEFINED_PHRASES.find(
        (p) =>
          p.sourceLang === currentMode.source &&
          (sanitize(p.sourceText).includes(sanitizedSearch) ||
           sanitizedSearch.includes(sanitize(p.sourceText)))
      );

      if (partialPredefined) {
        const results: Translation[] = currentMode.targets.map((tgt) => {
          const tData = partialPredefined.translations[tgt];
          return {
            lang: tgt,
            text: tData?.text || "",
            pronunciation: tData?.pronunciation || "",
            explanation: `${t("offline_badge_predefined")} (${t("offline_translated")} - Match: "${partialPredefined.sourceText}")`
          };
        });

        setTimeout(() => {
          setTranslations(results);
          setIsLoading(false);

          if (results.length === 1) {
            const singleTrans = results[0];
            const targetLangConfig = LANGUAGES[singleTrans.lang];
            if (targetLangConfig) {
              const selectedURI = selectedVoiceURIs[singleTrans.lang];
              handleSpeak(singleTrans.text, targetLangConfig.synthLocale, selectedURI);
            }
          }
        }, 400);
        return;
      }

      // 4. Case where nothing is found offline
      setTimeout(() => {
        setError(t("no_offline_match"));
        setTranslations([]);
        setIsLoading(false);
      }, 300);
      return;
    }

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sourceText,
          sourceLang: currentMode.source,
          targetLangs: currentMode.targets,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Translation failed");
      }

      const data = await response.json();
      if (data.translations) {
        setIsOffline(false); // Connection is verified and working
        setTranslations(data.translations);

        const sanitize = (txt: string) => txt.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g, "").trim();
        const sanitizedSearch = sanitize(sourceText);

        // Add to history list
        const historyItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          sourceLang: currentMode.source,
          text: sourceText,
          translations: data.translations,
        };
        saveHistory([historyItem, ...history.filter(h => sanitize(h.text) !== sanitizedSearch).slice(0, 49)]); // keep last 50 items

        // Auto-play translation audio if single target is selected
        if (data.translations.length === 1) {
          const singleTrans = data.translations[0];
          const targetLangConfig = LANGUAGES[singleTrans.lang];
          if (targetLangConfig) {
            const selectedURI = selectedVoiceURIs[singleTrans.lang];
            handleSpeak(singleTrans.text, targetLangConfig.synthLocale, selectedURI);
          }
        }
      }
    } catch (err: any) {
      console.error("Error calling translator api:", err);
      
      const errMsg = err.message || "";
      const isQuotaError = errMsg.toLowerCase().includes("quota") || 
                           errMsg.toLowerCase().includes("exhausted") || 
                           errMsg.toLowerCase().includes("limit") || 
                           errMsg.toLowerCase().includes("429") || 
                           errMsg.toLowerCase().includes("rate");

      if (isQuotaError) {
        setIsOffline(true);
        
        // Try searching the local offline predefined phrases or local history
        const sanitize = (txt: string) => txt.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g, "").trim();
        const sanitizedSearch = sanitize(trimmedText);

        const matchedPredefined = PREDEFINED_PHRASES.find(
          (p) =>
            p.sourceLang === currentMode.source &&
            sanitize(p.sourceText) === sanitizedSearch
        );

        if (matchedPredefined) {
          const results: Translation[] = currentMode.targets.map((tgt) => {
            const tData = matchedPredefined.translations[tgt];
            return {
              lang: tgt,
              text: tData?.text || "",
              pronunciation: tData?.pronunciation || "",
              explanation: `${t("quota_exceeded_title")} - ${t("offline_badge_predefined")} (Match: "${matchedPredefined.sourceText}")`
            };
          });

          setTranslations(results);
          setError(`${t("quota_exceeded_title")}: ${t("quota_exceeded_desc")}`);

          const historyItem: HistoryItem = {
            id: "of_" + Date.now().toString(),
            timestamp: Date.now(),
            sourceLang: currentMode.source,
            text: trimmedText,
            translations: results,
          };
          saveHistory([historyItem, ...history.filter(h => sanitize(h.text) !== sanitizedSearch).slice(0, 49)]);

          if (results.length === 1) {
            const singleTrans = results[0];
            const targetLangConfig = LANGUAGES[singleTrans.lang];
            if (targetLangConfig) {
              const selectedURI = selectedVoiceURIs[singleTrans.lang];
              handleSpeak(singleTrans.text, targetLangConfig.synthLocale, selectedURI);
            }
          }
          return;
        }

        // Check history
        const matchedHistory = history.find(
          (h) =>
            h.sourceLang === currentMode.source &&
            sanitize(h.text) === sanitizedSearch
        );

        if (matchedHistory) {
          setTranslations(matchedHistory.translations);
          setError(`${t("quota_exceeded_title")}: ${t("quota_exceeded_desc")}`);
          if (matchedHistory.translations.length === 1) {
            const singleTrans = matchedHistory.translations[0];
            const targetLangConfig = LANGUAGES[singleTrans.lang];
            if (targetLangConfig) {
              const selectedURI = selectedVoiceURIs[singleTrans.lang];
              handleSpeak(singleTrans.text, targetLangConfig.synthLocale, selectedURI);
            }
          }
          return;
        }

        // Substring matching as fallback
        const partialPredefined = PREDEFINED_PHRASES.find(
          (p) =>
            p.sourceLang === currentMode.source &&
            (sanitize(p.sourceText).includes(sanitizedSearch) ||
             sanitizedSearch.includes(sanitize(p.sourceText)))
        );

        if (partialPredefined) {
          const results: Translation[] = currentMode.targets.map((tgt) => {
            const tData = partialPredefined.translations[tgt];
            return {
              lang: tgt,
              text: tData?.text || "",
              pronunciation: tData?.pronunciation || "",
              explanation: `${t("quota_exceeded_title")} - ${t("offline_badge_predefined")} (Match: "${partialPredefined.sourceText}")`
            };
          });

          setTranslations(results);
          setError(`${t("quota_exceeded_title")}: ${t("quota_exceeded_desc")}`);
          if (results.length === 1) {
            const singleTrans = results[0];
            const targetLangConfig = LANGUAGES[singleTrans.lang];
            if (targetLangConfig) {
              const selectedURI = selectedVoiceURIs[singleTrans.lang];
              handleSpeak(singleTrans.text, targetLangConfig.synthLocale, selectedURI);
            }
          }
          return;
        }

        setError(`${t("quota_exceeded_title")}: ${t("quota_exceeded_desc")}`);
        setTranslations([]);
      } else if (err instanceof TypeError || err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")) {
        setIsOffline(true);
        setError(`${t("offline_banner")} (${t("translation_failed")})`);
      } else {
        setError(err.message || t("translation_failed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger recording using Web Speech API SpeechRecognition
  const startRecording = () => {
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) {
      setError(t("mic_not_supported"));
      return;
    }

    // Abort any existing active session to avoid "already started" browser DOMExceptions
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
    }

    try {
      // Cancel active speaking narration
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeakingLang(null);

      transcriptionBufferRef.current = "";
      setTranscript("");
      setTranslations([]);
      setError("");

      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      if (activeMode.source === "auto") {
        rec.lang = typeof navigator !== "undefined" ? (navigator.language || "es-ES") : "es-ES";
      } else {
        rec.lang = LANGUAGES[activeMode.source].locale;
      }

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        let finalTrans = "";
        let interimTrans = "";

        // Loop through all results to correctly accumulate transcription segments
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }

        const activeResult = finalTrans + interimTrans;
        setTranscript(activeResult);
        transcriptionBufferRef.current = activeResult;
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error event:", event);
        setIsRecording(false);
        transcriptionBufferRef.current = ""; // Clear buffer on error so we don't translate stale junk
        if (event.error === "not-allowed") {
          setError(t("mic_denied"));
        } else if (event.error === "no-speech") {
          setError(t("no_speech_detected"));
        } else {
          setError(`${t("capture_error")}: ${event.error}`);
        }
      };

      rec.onend = () => {
        setIsRecording(false);
        const finalText = transcriptionBufferRef.current.trim();
        if (finalText) {
          setTextToTranslate(finalText);
          if (activeMode.id === "auto") {
            const detectedLang = detectLanguage(finalText);
            let matchedMode = TRANSLATION_MODES.find(m => m.id === "es_both");
            if (detectedLang === "en") {
              matchedMode = TRANSLATION_MODES.find(m => m.id === "en_es");
            } else if (detectedLang === "pt-BR") {
              matchedMode = TRANSLATION_MODES.find(m => m.id === "pt_es");
            }

            if (matchedMode) {
              setActiveMode(matchedMode);
              handleTranslation(finalText, matchedMode);

              const langNames: Record<string, string> = {
                es: "Español",
                en: "English",
                "pt-BR": "Português"
              };
              const detectedLabel = langNames[detectedLang] || detectedLang;
              setError(`✨ Auto-detect: [${detectedLabel}] detected. Mode changed to ${matchedMode.label}`);
              setTimeout(() => setError(""), 6000);
            } else {
              handleTranslation(finalText);
            }
          } else {
            handleTranslation(finalText);
          }
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e: any) {
      console.error("Error starting speech recognition:", e);
      setError(t("cannot_start_recorder"));
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  // Trigger local text submission
  const handleTextSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!textToTranslate.trim() || isLoading) return;
    setTranscript("");

    const finalText = textToTranslate.trim();
    if (activeMode.id === "auto") {
      const detectedLang = detectLanguage(finalText);
      let matchedMode = TRANSLATION_MODES.find(m => m.id === "es_both");
      if (detectedLang === "en") {
        matchedMode = TRANSLATION_MODES.find(m => m.id === "en_es");
      } else if (detectedLang === "pt-BR") {
        matchedMode = TRANSLATION_MODES.find(m => m.id === "pt_es");
      }

      if (matchedMode) {
        setActiveMode(matchedMode);
        handleTranslation(finalText, matchedMode);

        const langNames: Record<string, string> = {
          es: "Español",
          en: "English",
          "pt-BR": "Português"
        };
        setError(`✨ Auto-detect: [${langNames[detectedLang] || detectedLang}] detected. Mode changed to ${matchedMode.label}`);
        setTimeout(() => setError(""), 6000);
      } else {
        handleTranslation(finalText);
      }
    } else {
      handleTranslation(finalText);
    }
  };

  // Play audio utilizing Speech Synthesis
  const handleSpeak = (text: string, locale: string, voiceURI?: string) => {
    setSpeakingLang(locale);

    let finalVoiceURI = voiceURI;
    if (!finalVoiceURI) {
      const matchLangKey = Object.keys(LANGUAGES).find(
        (key) => LANGUAGES[key as LangCode].synthLocale === locale
      );
      if (matchLangKey) {
        finalVoiceURI = selectedVoiceURIs[matchLangKey];
      }
    }

    speakText(
      text,
      locale,
      finalVoiceURI,
      () => {},
      () => setSpeakingLang(null),
      () => setSpeakingLang(null),
      speechRate
    );
  };

  // Copy translated text with helpful feedback tick
  const copyToClipboard = (text: string, id: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
          })
          .catch((err) => {
            console.warn("Clipboard write API failed, using fallback:", err);
            fallbackCopy(text, id);
          });
      } else {
        fallbackCopy(text, id);
      }
    } catch (e) {
      console.warn("Clipboard copy error, using fallback:", e);
      fallbackCopy(text, id);
    }
  };

  const fallbackCopy = (text: string, id: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        console.error("Fallback copy was unsuccessful");
      }
    } catch (err) {
      console.error("Fallback copy failed:", err);
    }
  };

  // Load history item back to active
  const handleSelectHistory = (item: HistoryItem) => {
    // Find mode that fits
    const matchedMode = TRANSLATION_MODES.find(
      (m) =>
        m.source === item.sourceLang &&
        m.targets.length === item.translations.length &&
        m.targets.every((value) => item.translations.some((t) => t.lang === value))
    );

    if (matchedMode) {
      setActiveMode(matchedMode);
    }
    setTextToTranslate(item.text);
    setTranscript("");
    setTranslations(item.translations);
    setError("");
  };

  const handleDeleteHistory = (id: string) => {
    saveHistory(history.filter((item) => item.id !== id));
  };

  const handleClearHistory = () => {
    saveHistory([]);
  };

  const isRecAvailable = isSpeechRecognitionSupported();

  const filteredOfflinePhrases = PREDEFINED_PHRASES.filter((p) => {
    // 1. Match source language with selected mode
    if (activeMode.source !== "auto" && p.sourceLang !== activeMode.source) return false;
    // 2. Filter by category
    if (offlineCategory !== "all" && p.category !== offlineCategory) return false;
    // 3. Filter by search filter
    if (offlineSearch.trim()) {
      const s = offlineSearch.toLowerCase();
      const textMatch = p.sourceText.toLowerCase().includes(s);
      const categoryMatch = p.category.toLowerCase().includes(s);
      
      // Also match in translations languages
      const transCodes = Object.keys(p.translations) as LangCode[];
      const translationMatch = transCodes.some(code => 
        p.translations[code]?.text.toLowerCase().includes(s)
      );

      return textMatch || categoryMatch || translationMatch;
    }
    return true;
  });

  return (
    <div className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 md:p-8 transition-colors duration-300 relative ${
      isHighContrast
        ? "bg-black text-white selection:bg-white selection:text-black"
        : "bg-slate-950 text-slate-100"
    }`} id="app-root">
      {/* Decorative background grid and ambient glows */}
      {!isHighContrast ? (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-20" />
      )}

      {/* Header Container */}
      <header className="relative w-full max-w-4xl mx-auto flex flex-col items-center text-center mt-4 mb-6" id="header">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 max-w-2xl px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase backdrop-blur-sm shadow-lg shadow-indigo-500/5"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            {t("ai_realtime")}
          </motion.div>

          {/* Selector de idioma de la interfaz y controles de estado offline */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 sm:mt-0" id="ui-header-controls">
            {/* Connection Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold border transition-all duration-300 ${
                activeOffline
                  ? (isHighContrast ? "border-amber-500 text-amber-500 bg-black font-extrabold" : "bg-amber-500/10 border-amber-500/20 text-amber-400")
                  : (isHighContrast ? "border-emerald-500 text-emerald-500 bg-black" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400")
              }`}
              title={activeOffline ? t("offline_status") : t("online_status")}
              id="connectivity-badge"
            >
              {activeOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>{t("offline_status")}</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t("online_status")}</span>
                </>
              )}
            </div>

            {/* Force Offline Simulator Toggle */}
            <button
              onClick={() => setForceOffline(!forceOffline)}
              className={`flex items-center gap-1.5 text-[10px] uppercase font-semibold h-7.5 px-3 rounded-xl transition-all border ${
                forceOffline
                  ? (isHighContrast ? "bg-white text-black border-white font-extrabold" : "bg-amber-500/25 border-amber-500/40 text-amber-300 shadow-sm")
                  : (isHighContrast ? "bg-black text-white hover:bg-zinc-900 border-zinc-800" : "bg-slate-900/80 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200")
              }`}
              title={t("force_offline")}
              id="btn-force-offline"
            >
              <span>{t("force_offline")}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${forceOffline ? "bg-amber-400 animate-ping" : "bg-slate-600"}`} />
            </button>

            {/* Selector de idioma de la interfaz */}
            <div className="flex items-center gap-2" id="ui-language-selector-container">
              <Languages className={`w-4 h-4 ${isHighContrast ? "text-white" : "text-indigo-400"}`} />
              <select
                value={uiLang}
                onChange={(e) => handleUiLangChange(e.target.value as "es" | "en" | "pt")}
                className={`text-xs p-1.5 px-2.5 rounded-lg font-semibold outline-none cursor-pointer transition-all ${
                  isHighContrast
                    ? "bg-black border-2 border-white text-white"
                    : "bg-slate-900/90 border border-slate-800 text-slate-300 hover:border-indigo-500/30"
                }`}
                id="ui-language-dropdown"
                title="Cambiar idioma de la interfaz / Change interface language"
              >
                <option value="es" className="bg-slate-950 text-slate-300">Español 🇪🇸</option>
                <option value="en" className="bg-slate-950 text-slate-300">English 🇺🇸</option>
                <option value="pt" className="bg-slate-950 text-slate-300">Português 🇧🇷</option>
              </select>
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display tracking-tight text-white" id="main-title">
          Babel<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-indigo-500">Voices</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-md font-sans">
          {t("subtitle")}
        </p>
      </header>

      {/* Main Translation Desk */}
      <main className="relative w-full max-w-3xl mx-auto flex-grow flex flex-col items-center z-10" id="main-desk">
        
        {/* Mode Selector Panel */}
        <div className="w-full mb-6" id="mode-selector-wrapper">
          <div className={`flex flex-wrap justify-center gap-2 p-1.5 rounded-2xl backdrop-blur-md transition-all ${
            isHighContrast
              ? "bg-black border-2 border-white"
              : "bg-slate-900/60 border border-slate-800/80"
          }`}>
            {TRANSLATION_MODES.map((mode) => {
              const isSelected = activeMode.id === mode.id;
              return (
                <button
                  key={mode.id}
                  id={`mode-btn-${mode.id}`}
                  onClick={() => selectMode(mode)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isSelected
                      ? (isHighContrast ? "text-black font-bold" : "text-white font-semibold")
                      : (isHighContrast ? "text-white hover:text-white hover:bg-zinc-900" : "text-slate-400 hover:text-slate-200 hover:bg-slate-850")
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-mode-indicator"
                      className={`absolute inset-0 rounded-xl -z-10 ${
                        isHighContrast
                          ? "bg-white shadow-none"
                          : "bg-indigo-600/90 shadow-md shadow-indigo-600/20"
                      }`}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="text-sm">{mode.iconText.split("➔")[0]}</span>
                  <span className="hidden sm:inline">{t(`mode_${mode.id}` as any)}</span>
                  <span className="text-xs text-slate-300 font-semibold sm:hidden">
                    ➔ {mode.iconText.split("➔")[1]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Translation Box */}
        <div className={`w-full p-5 sm:p-7 shadow-2xl flex flex-col gap-6 transition-all ${
          isHighContrast
            ? "bg-black border-2 border-white rounded-3xl"
            : "bg-slate-900/40 border border-slate-800/60 rounded-3xl backdrop-blur-xl"
        }`} id="translator-core-card">
          
          {/* Offline Warning Banner */}
          {activeOffline && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2.5 p-3.5 rounded-2xl text-xs leading-normal ${
                isHighContrast
                  ? "bg-black border-2 border-amber-500 text-amber-500 font-bold"
                  : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
              }`}
              id="offline-alert-banner"
            >
              <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse mt-0.5 text-amber-500" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5">{t("offline_status")}</span>
                <p>{t("offline_banner")}</p>
                {isOffline && !forceOffline && (
                  <button
                    onClick={() => {
                      setIsOffline(false);
                      setError("");
                    }}
                    className="mt-2.5 px-3 py-1 text-[11px] font-sans font-medium rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-sans transition-all cursor-pointer shadow-md"
                  >
                    🔄 Forzar e intentar Conexión Online
                  </button>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Audio Capturing Wave Dashboard */}
          <div className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${
            isHighContrast
              ? "bg-black border-2 border-white"
              : "bg-slate-950/80 border border-slate-800/60"
          }`} id="audio-input-area">
            
            <AudioWaveform isRecording={isRecording} isHighContrast={isHighContrast} />
 
            <div className="flex flex-col items-center gap-2.5 mt-2">
              <span className={`text-xs font-mono uppercase tracking-widest ${
                isRecording
                  ? (isHighContrast ? "text-white font-extrabold animate-pulse" : "text-red-400 animate-pulse font-bold")
                  : (isHighContrast ? "text-zinc-200" : "text-slate-500")
              }`}>
                {isRecording ? t("capturing_voice") : t("channel_ready")}
              </span>
 
              {/* Massive Micro trigger */}
              <button
                id="mic-pulse-button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`group flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-lg ${
                  isRecording
                    ? (isHighContrast ? "bg-white text-black border-2 border-black scale-105 font-bold" : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20 scale-105")
                    : (isHighContrast ? "bg-black text-white hover:bg-zinc-900 border-2 border-white hover:scale-105" : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 hover:scale-105")
                }`}
                title={isRecording ? t("stop_capturing") : t("speak_now")}
              >
                {isRecording ? (
                  <MicOff className={`w-6 h-6 animate-pulse ${isHighContrast ? "text-black" : "text-white"}`} />
                ) : (
                  <Mic className={`w-6 h-6 group-hover:rotate-6 transition-transform ${isHighContrast ? "text-white" : "text-white"}`} />
                )}
              </button>
 
              <p className="text-[11px] sm:text-xs text-slate-400 text-center max-w-xs mt-1.5">
                {isRecording ? (
                  <span className="text-rose-400">{t("speak_clearly")}</span>
                ) : (
                  <span>{t("press_to_speak")} <strong className="text-indigo-400">{activeMode.source === "auto" ? t("any_language") : LANGUAGES[activeMode.source].nativeName}</strong>.</span>
                )}
              </p>
            </div>
          </div>

          {/* Selector de Voz para Reproducción (TTS) */}
          {voices.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3.5 rounded-2xl flex flex-col gap-4 transition-all ${
                isHighContrast
                  ? "bg-black border-2 border-white"
                  : "bg-slate-950/40 border border-slate-800/40"
              }`}
              id="voice-settings-row"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-display">
                    {t("playback_voices")}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeMode.targets.map((targetCode) => {
                    const langConfig = LANGUAGES[targetCode];
                    // Filter voices matching this target lang code
                    const matchingVoices = voices.filter(
                      (v) =>
                        v.lang.toLowerCase().replaceAll("_", "-").startsWith(targetCode.toLowerCase().split("-")[0])
                    );

                    if (matchingVoices.length === 0) return null;

                    const currentSelectedURI = selectedVoiceURIs[targetCode] || matchingVoices[0]?.voiceURI;

                    return (
                      <div
                        key={targetCode}
                        className="flex items-center gap-2 bg-slate-900/80 p-1.5 px-3 rounded-xl border border-slate-800 hover:border-indigo-500/30 transition-all font-sans"
                        id={`voice-box-${targetCode}`}
                      >
                        <span className="text-sm leading-none" title={langConfig?.nativeName}>
                          {langConfig?.flag}
                        </span>
                        <select
                          value={currentSelectedURI}
                          onChange={(e) => {
                            setSelectedVoiceURIs((prev) => ({
                              ...prev,
                              [targetCode]: e.target.value,
                            }));
                          }}
                          className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer border-none max-w-[130px] sm:max-w-[180px]"
                          title={`${t("voice_for")} ${langConfig ? t(`lang_${langConfig.code === "pt-BR" ? "pt" : langConfig.code}` as any) : ""}`}
                        >
                          {matchingVoices.map((v) => (
                            <option key={v.voiceURI} value={v.voiceURI} className="bg-slate-950 text-slate-300">
                              {getVoiceLabel(v)}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Control de velocidad (rate) */}
              <div className={`pt-2.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isHighContrast ? "border-white" : "border-slate-800/40"
              }`} id="voice-rate-control">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider font-display ${isHighContrast ? "text-white" : "text-slate-400"}`}>
                    {t("speed")}: <span className="font-mono text-cyan-400 font-bold">{speechRate.toFixed(1)}x</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 w-full sm:max-w-xs">
                  <span className={`text-[10px] font-mono ${isHighContrast ? "text-white" : "text-slate-500"}`}>0.5x</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500 ${isHighContrast ? "bg-white" : "bg-slate-800"}`}
                    id="speech-rate-slider"
                  />
                  <span className={`text-[10px] font-mono ${isHighContrast ? "text-white" : "text-slate-500"}`}>2.0x</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Browser Mic Permission Warning banner */}
          {!isRecAvailable && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs" id="no-speech-warning">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {t("speech_not_supported")}
              </span>
            </div>
          )}

          {/* Iframe iframe permission support tip */}
          <div className={`p-3 rounded-xl text-xs leading-relaxed border ${
            isHighContrast 
              ? "bg-black border-zinc-500 text-zinc-300"
              : "bg-teal-500/5 border border-teal-500/10 text-teal-400"
          }`} id="iframe-mic-tip">
            <div className="flex gap-2">
              <span className="text-sm">💡</span>
              <div>
                <p className="font-semibold">{uiLang === "es" ? "Sugerencia de captura de voz:" : uiLang === "en" ? "Voice Capture Tip:" : "Dica de captura de voz:"}</p>
                <p className="mt-0.5 opacity-90 text-[11px]">
                  {uiLang === "es" 
                    ? "Si el sistema no graba tu voz o no suena el audio traducido, por favor haz clic en el botón superior derecho 'Open in new tab' (Pestaña nueva) en AI Studio. ¡Exclusivamente en su propia pestaña el navegador otorga permisos y soporte total a micrófonos y altavoces!" 
                    : uiLang === "en"
                      ? "If speech recognition is not capturing or synthesizing audio, please click 'Open in new tab' at the top right of the AI Studio window. Browsers enforce complete voice and audio playback access inside standalone tabs!"
                      : "Se o reconhecimento ou a fala não gravar/reproduzir áudio, por favor clique no botão 'Open in new tab' no canto superior direito para liberar total acesso!"}
                </p>
              </div>
            </div>
          </div>

          {/* Inline Errors */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs" id="error-alert">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Transient Live recording text OR finalized Text Box */}
          <div className="flex flex-col gap-2" id="text-input-field">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-display">
                <span className="text-sm">{activeMode.source === "auto" ? "🌐" : LANGUAGES[activeMode.source].flag}</span>
                {activeMode.source === "auto" ? t("any_language") : `${t("phrase_in")} ${t(`lang_${activeMode.source === "pt-BR" ? "pt" : activeMode.source}` as any)}`}
              </label>
              {(transcript || textToTranslate) && (
                <button
                  id="btn-reset-texts"
                  onClick={() => {
                    setTextToTranslate("");
                    setTranscript("");
                    setTranslations([]);
                    setError("");
                  }}
                  className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-950 p-1 px-1.5 rounded"
                >
                  <RefreshCw className="w-3 h-3" /> {t("clear")}
                </button>
              )}
            </div>

            <form onSubmit={handleTextSubmit} className="relative mt-1">
              <textarea
                id="source-textbox"
                rows={2}
                value={isRecording ? transcript : textToTranslate}
                onChange={(e) => {
                  if (!isRecording) setTextToTranslate(e.target.value);
                }}
                disabled={isRecording}
                placeholder={isRecording ? t("listening") : t("placeholder_input")}
                className={`w-full focus:ring-1 outline-none rounded-xl p-3 pr-12 text-sm resize-none transition-all ${
                  isHighContrast
                    ? "bg-black border-2 border-white focus:border-white focus:ring-white text-white placeholder-zinc-500"
                    : "bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-indigo-500 text-slate-100 placeholder-slate-600"
                }`}
              />
              {!isRecording && textToTranslate.trim() && (
                <button
                  type="submit"
                  id="btn-submit-translation"
                  disabled={isLoading}
                  className={`absolute right-2.5 bottom-3 p-2 rounded-lg transition-all disabled:opacity-50 ${
                    isHighContrast
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
                  title={t("translate_text")}
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              )}
            </form>

            {isRecording && transcript && (
              <span className="text-xs text-indigo-400 animate-pulse italic font-medium pl-1">
                "{transcript}"
              </span>
            )}
          </div>

          {/* Results panel container */}
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`flex flex-col items-center justify-center py-10 gap-3 rounded-2xl ${
                  isHighContrast
                    ? "bg-black border-2 border-white"
                    : "bg-slate-950/40 rounded-2xl border border-slate-800/40"
                }`}
                id="loading-spinner"
              >
                <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                <span className="text-xs text-slate-400 font-mono tracking-wider">{t("translating")}</span>
              </motion.div>
            )}

            {!isLoading && translations.length > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                id="results-grid"
              >
                {translations.map((trans, index) => {
                  const toLang = LANGUAGES[trans.lang];
                  const resultId = `result-${trans.lang}-${index}`;
                  const isSpeechActive = speakingLang === toLang?.synthLocale;

                  return (
                    <motion.div
                      key={trans.lang}
                      id={resultId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 110,
                        damping: 15,
                        delay: index * 0.1,
                      }}
                      className={`flex flex-col justify-between p-4.5 rounded-2.5xl shadow-lg relative overflow-hidden group transition-all flex-1 ${
                        isHighContrast
                          ? "bg-black border-2 border-white"
                          : "bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/80 hover:border-slate-700/60"
                      }`}
                    >
                      {/* Accent glow on hover */}
                      {!isHighContrast && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-full group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
                      )}

                      <div className="space-y-3">
                        {/* Header of card */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{toLang?.flag}</span>
                            <span className="text-xs font-semibold tracking-wide uppercase text-slate-400">
                              {toLang ? t(`lang_${toLang.code === "pt-BR" ? "pt" : toLang.code}` as any) : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Copy button */}
                            <button
                              id={`copy-btn-${trans.lang}`}
                              onClick={() => copyToClipboard(trans.text, resultId)}
                              className={`p-1.5 rounded-lg transition-all ${
                                isHighContrast
                                  ? "bg-zinc-900 hover:bg-zinc-800 text-white border border-white"
                                  : "bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                              title={t("copy_translation")}
                            >
                              {copiedId === resultId ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* TTS button */}
                            <button
                              id={`tts-btn-${trans.lang}`}
                              onClick={() => handleSpeak(trans.text, toLang?.synthLocale || "en-US", selectedVoiceURIs[trans.lang])}
                              className={`p-1.5 rounded-lg transition-all ${
                                isSpeechActive
                                  ? (isHighContrast ? "bg-white text-black font-bold" : "bg-indigo-600 text-white shadow-md shadow-indigo-600/30")
                                  : (isHighContrast ? "bg-zinc-900 hover:bg-zinc-800 text-white border border-white" : "bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200")
                              }`}
                              title={isSpeechActive ? t("playing") : t("play_sound")}
                            >
                              <Volume2 className={`w-3.5 h-3.5 ${isSpeechActive ? "animate-bounce" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {/* Translation output */}
                        <p className={`text-base sm:text-lg font-semibold leading-snug ${isHighContrast ? "text-white" : "text-slate-100"}`}>
                          {trans.text}
                        </p>

                        {/* Pronunciation helpful block */}
                        {trans.pronunciation && (
                          <div className={`flex items-center gap-1.5 py-1 px-2.5 rounded w-full ${
                            isHighContrast
                              ? "bg-black border border-white text-white"
                              : "bg-slate-950/60 border border-slate-850"
                          }`} id={`pronounce-box-${trans.lang}`}>
                            <BookOpen className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                            <span className="text-[11px] font-mono text-slate-400 italic leading-none pt-0.5">
                              {trans.pronunciation}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Spark explanation bullet from Gemini if populated */}
                      {trans.explanation && (
                        <div className={`mt-4 pt-3 border-t flex items-start gap-1.5 text-[11px] p-2 rounded-lg ${
                          isHighContrast
                            ? "bg-black border-2 border-white text-white"
                            : "bg-indigo-950/10 border border-indigo-500/10 text-indigo-300"
                        }`}>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                          <p className="leading-normal">{trans.explanation}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Offline Phrasebook Section */}
        <div className={`w-full p-5 sm:p-6 shadow-xl flex flex-col gap-4 mt-6 transition-all ${
          isHighContrast
            ? "bg-black border-2 border-white rounded-3xl text-white"
            : "bg-slate-900/20 border border-slate-800/40 rounded-3xl backdrop-blur-md"
        }`} id="offline-phrasebook-section">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/40 pb-3" id="phrasebook-header">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-display">
                {t("common_phrases")} ({activeMode.source === "auto" ? "🌐" : LANGUAGES[activeMode.source].flag})
              </h3>
            </div>
            
            {/* Search Input */}
            <div className={`relative flex items-center w-full sm:max-w-xs rounded-xl transition-all ${
              isHighContrast ? "border-2 border-white bg-black" : "border border-slate-800 bg-slate-950/60 focus-within:border-indigo-500/50"
            }`} id="phrasebook-search-input">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3" />
              <input
                type="text"
                placeholder={t("search_placeholder")}
                value={offlineSearch}
                onChange={(e) => setOfflineSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-transparent text-xs text-slate-200 outline-none focus:ring-0 placeholder-slate-600"
              />
              {offlineSearch && (
                <button
                  onClick={() => setOfflineSearch("")}
                  className="absolute right-2 px-1 text-[10px] text-slate-450 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Categories Tab Selector */}
          <div className="flex flex-wrap gap-1.5" id="phrasebook-categories">
            {(["all", "greetings", "travel", "emergency"] as const).map((cat) => {
              const isActive = offlineCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setOfflineCategory(cat)}
                  className={`text-[10px] uppercase font-semibold px-2.5 py-1 rounded-lg transition-all ${
                    isActive
                      ? (isHighContrast ? "bg-white text-black font-extrabold pb-0.5" : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-sm")
                      : (isHighContrast ? "bg-black text-white hover:bg-zinc-900 border border-zinc-800" : "bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900")
                  }`}
                  id={`cat-btn-${cat}`}
                >
                  {cat === "all" ? (uiLang === "es" ? "Todos" : uiLang === "en" ? "All" : "Todos") : t(cat as any)}
                </button>
              );
            })}
          </div>

          {/* Filtered Predefined Phrases Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[180px] overflow-y-auto pr-1" id="phrasebook-items-grid">
            {filteredOfflinePhrases.length > 0 ? (
              filteredOfflinePhrases.map((phrase) => (
                <button
                  key={phrase.sourceText}
                  onClick={() => {
                    setTextToTranslate(phrase.sourceText);
                    setTranscript("");
                    let targetMode = activeMode;
                    if (activeMode.id === "auto" || activeMode.source !== phrase.sourceLang) {
                      const found = TRANSLATION_MODES.find(
                        (m) => m.source === phrase.sourceLang && m.id !== "auto"
                      );
                      if (found) {
                        targetMode = found;
                        setActiveMode(found);
                      }
                    }
                    handleTranslation(phrase.sourceText, targetMode);
                  }}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all hover:-translate-y-0.5 duration-200 group relative overflow-hidden ${
                    isHighContrast
                      ? "bg-black border border-white hover:bg-zinc-900"
                      : "bg-slate-950/50 hover:bg-slate-900/60 border-slate-900 hover:border-slate-800"
                  }`}
                  title={t("click_to_translate")}
                >
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {phrase.sourceText}
                  </span>
                  
                  {/* Category flag */}
                  <span className={`text-[9px] uppercase tracking-wider mt-1.5 font-mono ${
                    phrase.category === "emergency" 
                      ? "text-red-400" 
                      : (phrase.category === "travel" ? "text-cyan-400" : "text-slate-400")
                  }`}>
                    {t(phrase.category as any)}
                  </span>
                </button>
              ))
            ) : (
              <div className="col-span-full text-center py-6 text-xs text-slate-500 italic">
                {uiLang === "es" ? "No se encontraron frases de utilidad matching." : uiLang === "en" ? "No matching utility phrases found." : "Nenhuma frase útil correspondente encontrada."}
              </div>
            )}
          </div>
        </div>

        {/* Translation History Tracker */}
        <TranslationHistory
          items={history}
          onSelect={handleSelectHistory}
          onDelete={handleDeleteHistory}
          onClearAll={handleClearHistory}
          onSpeak={handleSpeak}
          isHighContrast={isHighContrast}
          uiLang={uiLang}
        />
      </main>

      {/* Styled Footer */}
      <footer className={`w-full text-center mt-12 py-4 border-t text-[11px] font-sans relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
        isHighContrast
          ? "border-white bg-black text-white"
          : "border-slate-900 bg-transparent text-slate-600"
      }`} id="footer-credits">
        <p>{t("footer_credits")}</p>
        
        <button
          id="toggle-high-contrast"
          onClick={toggleHighContrast}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            isHighContrast
              ? "bg-white text-black border-2 border-black hover:bg-zinc-200 animate-pulse"
              : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700"
          }`}
          title={isHighContrast ? t("normal_contrast") : t("high_contrast")}
        >
          <Contrast className="w-3.5 h-3.5 text-cyan-400 rotate-180 animate-spin-slow" />
          {isHighContrast ? t("normal_contrast") : t("high_contrast")}
        </button>
      </footer>
    </div>
  );
}
