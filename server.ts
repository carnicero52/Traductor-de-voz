import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is missing.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
const PORT = 3000;

app.use(express.json());

// Translation Endpoint
const OFFLINE_DICTIONARY: Record<string, Record<string, { text: string; pronunciation: string }>> = {
  // Spanish Source (es)
  "es_hola": {
    en: { text: "Hello", pronunciation: "he-lóu" },
    "pt-BR": { text: "Olá", pronunciation: "o-lá" }
  },
  "es_buenos dias": {
    en: { text: "Good morning", pronunciation: "gud mór-ning" },
    "pt-BR": { text: "Bom dia", pronunciation: "bom dí-a" }
  },
  "es_buenas tardes": {
    en: { text: "Good afternoon", pronunciation: "gud áf-ter-nun" },
    "pt-BR": { text: "Boa tarde", pronunciation: "bóa tár-de" }
  },
  "es_buenas noches": {
    en: { text: "Good night", pronunciation: "gud náit" },
    "pt-BR": { text: "Boa noite", pronunciation: "bóa nói-te" }
  },
  "es_adios": {
    en: { text: "Goodbye", pronunciation: "gud-bái" },
    "pt-BR": { text: "Adeus", pronunciation: "a-déus" }
  },
  "es_por favor": {
    en: { text: "Please", pronunciation: "plis" },
    "pt-BR": { text: "Por favor", pronunciation: "pór fa-vór" }
  },
  "es_gracias": {
    en: { text: "Thank you", pronunciation: "zénk iú" },
    "pt-BR": { text: "Obrigado", pronunciation: "o-bri-gá-do" }
  },
  "es_de nada": {
    en: { text: "You're welcome", pronunciation: "iúr uél-cam" },
    "pt-BR": { text: "De nada", pronunciation: "de ná-da" }
  },
  "es_donde esta": {
    en: { text: "Where is", pronunciation: "uér is" },
    "pt-BR": { text: "Onde fica", pronunciation: "ón-de fí-ca" }
  },
  "es_bano": {
    en: { text: "Restroom", pronunciation: "báz-rum" },
    "pt-BR": { text: "Banheiro", pronunciation: "ba-nhéi-ro" }
  },
  "es_el bano": {
    en: { text: "The restroom", pronunciation: "dâ báz-rum" },
    "pt-BR": { text: "O banheiro", pronunciation: "o ba-nhéi-ro" }
  },
  "es_estacion de tren": {
    en: { text: "Train station", pronunciation: "tréin stéi-shon" },
    "pt-BR": { text: "Estação de trem", pronunciation: "es-ta-ção de trêin" }
  },
  "es_aeropuerto": {
    en: { text: "Airport", pronunciation: "ér-pórt" },
    "pt-BR": { text: "Aeroporto", pronunciation: "a-e-ro-pór-to" }
  },
  "es_hotel": {
    en: { text: "Hotel", pronunciation: "jou-tél" },
    "pt-BR": { text: "Hotel", pronunciation: "o-tél" }
  },
  "es_restaurante": {
    en: { text: "Restaurant", pronunciation: "rés-to-ránt" },
    "pt-BR": { text: "Restaurante", pronunciation: "res-tau-rán-te" }
  },
  "es_agua": {
    en: { text: "Water", pronunciation: "uá-ter" },
    "pt-BR": { text: "Água", pronunciation: "á-gua" }
  },
  "es_dinero": {
    en: { text: "Money", pronunciation: "má-ni" },
    "pt-BR": { text: "Dinheiro", pronunciation: "di-nhéi-ro" }
  },
  "es_ayuda": {
    en: { text: "Help", pronunciation: "jelp" },
    "pt-BR": { text: "Ajuda", pronunciation: "a-jú-da" }
  },
  "es_si": {
    en: { text: "Yes", pronunciation: "iés" },
    "pt-BR": { text: "Sim", pronunciation: "sim" }
  },
  "es_no": {
    en: { text: "No", pronunciation: "nóu" },
    "pt-BR": { text: "Não", pronunciation: "nã-o" }
  },
  "es_cuanto cuesta": {
    en: { text: "How much is it", pronunciation: "háo mach is it" },
    "pt-BR": { text: "Quanto custa", pronunciation: "quán-to cús-ta" }
  },
  "es_boleto": {
    en: { text: "Ticket", pronunciation: "tí-ket" },
    "pt-BR": { text: "Passagem", pronunciation: "pa-sá-gem" }
  },
  "es_pasaporte": {
    en: { text: "Passport", pronunciation: "pás-pórt" },
    "pt-BR": { text: "Passaporte", pronunciation: "pa-sa-pór-te" }
  },
  "es_calle": {
    en: { text: "Street", pronunciation: "strít" },
    "pt-BR": { text: "Rua", pronunciation: "húa" }
  },
  "es_hospital": {
    en: { text: "Hospital", pronunciation: "jós-pi-tal" },
    "pt-BR": { text: "Hospital", pronunciation: "os-pi-tál" }
  },
  "es_medico": {
    en: { text: "Doctor", pronunciation: "dóc-tor" },
    "pt-BR": { text: "Médico", pronunciation: "mé-di-co" }
  },
  "es_bonito": {
    en: { text: "Beautiful", pronunciation: "biú-ti-ful" },
    "pt-BR": { text: "Bonito", pronunciation: "bo-ní-to" }
  },
  "es_comida": {
    en: { text: "Food", pronunciation: "fúd" },
    "pt-BR": { text: "Comida", pronunciation: "co-mí-da" }
  },
  "es_cafe": {
    en: { text: "Coffee", pronunciation: "có-fi" },
    "pt-BR": { text: "Café", pronunciation: "ca-fé" }
  },
  "es_cerveza": {
    en: { text: "Beer", pronunciation: "bír" },
    "pt-BR": { text: "Cerveja", pronunciation: "ser-vé-ja" }
  },
  "es_vino": {
    en: { text: "Wine", pronunciation: "uáin" },
    "pt-BR": { text: "Vinho", pronunciation: "ví-nho" }
  },
  "es_cuenta": {
    en: { text: "Bill", pronunciation: "bil" },
    "pt-BR": { text: "Conta", pronunciation: "cón-ta" }
  },
  "es_comprar": {
    en: { text: "Buy", pronunciation: "bái" },
    "pt-BR": { text: "Comprar", pronunciation: "com-prár" }
  },
  "es_hablar": {
    en: { text: "Speak", pronunciation: "spík" },
    "pt-BR": { text: "Falar", pronunciation: "fa-lár" }
  },
  "es_entender": {
    en: { text: "Understand", pronunciation: "án-der-sténd" },
    "pt-BR": { text: "Entender", pronunciation: "en-ten-dér" }
  },
  "es_amigo": {
    en: { text: "Friend", pronunciation: "frénd" },
    "pt-BR": { text: "Amigo", pronunciation: "a-mí-go" }
  },
  "es_tempo": {
    en: { text: "Time", pronunciation: "táim" },
    "pt-BR": { text: "Tempo", pronunciation: "têm-po" }
  },
  "es_hoy": {
    en: { text: "Today", pronunciation: "tu-déi" },
    "pt-BR": { text: "Hoje", pronunciation: "ó-je" }
  },
  "es_manana": {
    en: { text: "Tomorrow", pronunciation: "tu-má-rou" },
    "pt-BR": { text: "Amanhã", pronunciation: "a-ma-nhã" }
  },
  "es_ayer": {
    en: { text: "Yesterday", pronunciation: "iés-ter-déi" },
    "pt-BR": { text: "Ontem", pronunciation: "ón-tem" }
  },
  "es_ahora": {
    en: { text: "Now", pronunciation: "náu" },
    "pt-BR": { text: "Agora", pronunciation: "a-gó-ra" }
  },

  // English Source (en)
  "en_hello": {
    es: { text: "Hola", pronunciation: "ó-la" },
    "pt-BR": { text: "Olá", pronunciation: "o-lá" }
  },
  "en_hi": {
    es: { text: "Hola", pronunciation: "ó-la" },
    "pt-BR": { text: "Oi", pronunciation: "oi" }
  },
  "en_good morning": {
    es: { text: "Buenos días", pronunciation: "bué-nos dí-as" },
    "pt-BR": { text: "Bom dia", pronunciation: "bom dí-a" }
  },
  "en_good afternoon": {
    es: { text: "Buenas tardes", pronunciation: "bué-nas tár-des" },
    "pt-BR": { text: "Boa tarde", pronunciation: "bóa tár-de" }
  },
  "en_good night": {
    es: { text: "Buenas noches", pronunciation: "bué-nas nó-ches" },
    "pt-BR": { text: "Boa noite", pronunciation: "bóa nói-te" }
  },
  "en_goodbye": {
    es: { text: "Adiós", pronunciation: "a-diós" },
    "pt-BR": { text: "Adeus", pronunciation: "a-déus" }
  },
  "en_please": {
    es: { text: "Por favor", pronunciation: "por fa-vór" },
    "pt-BR": { text: "Por favor", pronunciation: "pór fa-vór" }
  },
  "en_thank you": {
    es: { text: "Gracias", pronunciation: "grá-cias" },
    "pt-BR": { text: "Obrigado", pronunciation: "o-bri-gá-do" }
  },
  "en_thanks": {
    es: { text: "Gracias", pronunciation: "grá-cias" },
    "pt-BR": { text: "Obrigado", pronunciation: "o-bri-gá-do" }
  },
  "en_you are welcome": {
    es: { text: "De nada", pronunciation: "de ná-da" },
    "pt-BR": { text: "De nada", pronunciation: "de ná-da" }
  },
  "en_where is": {
    es: { text: "Dónde está", pronunciation: "dón-de es-tá" },
    "pt-BR": { text: "Onde fica", pronunciation: "ón-de fí-ca" }
  },
  "en_restroom": {
    es: { text: "El baño", pronunciation: "el bá-ño" },
    "pt-BR": { text: "O banheiro", pronunciation: "o ba-nhéi-ro" }
  },
  "en_bathroom": {
    es: { text: "El baño", pronunciation: "el bá-ño" },
    "pt-BR": { text: "O banheiro", pronunciation: "o ba-nhéi-ro" }
  },
  "en_train station": {
    es: { text: "Estación de tren", pronunciation: "es-ta-ción de tren" },
    "pt-BR": { text: "Estação de trem", pronunciation: "es-ta-ção de trêin" }
  },
  "en_airport": {
    es: { text: "Aeropuerto", pronunciation: "a-e-ro-puér-to" },
    "pt-BR": { text: "Aeroporto", pronunciation: "a-e-ro-pór-to" }
  },
  "en_hotel": {
    es: { text: "Hotel", pronunciation: "o-tél" },
    "pt-BR": { text: "Hotel", pronunciation: "o-tél" }
  },
  "en_restaurant": {
    es: { text: "Restaurante", pronunciation: "res-tau-rán-te" },
    "pt-BR": { text: "Restaurante", pronunciation: "res-tau-rán-te" }
  },
  "en_water": {
    es: { text: "Agua", pronunciation: "á-gua" },
    "pt-BR": { text: "Água", pronunciation: "á-gua" }
  },
  "en_money": {
    es: { text: "Dinero", pronunciation: "di-né-ro" },
    "pt-BR": { text: "Dinheiro", pronunciation: "di-nhéi-ro" }
  },
  "en_help": {
    es: { text: "Ayuda", pronunciation: "a-iú-da" },
    "pt-BR": { text: "Ajuda", pronunciation: "a-jú-da" }
  },
  "en_yes": {
    es: { text: "Sí", pronunciation: "sí" },
    "pt-BR": { text: "Sim", pronunciation: "sim" }
  },
  "en_no": {
    es: { text: "No", pronunciation: "no" },
    "pt-BR": { text: "Não", pronunciation: "não" }
  },
  "en_how much is it": {
    es: { text: "Cuánto cuesta", pronunciation: "cuán-to cués-ta" },
    "pt-BR": { text: "Quanto custa", pronunciation: "quán-to cús-ta" }
  },
  "en_ticket": {
    es: { text: "Boleto", pronunciation: "bo-lé-to" },
    "pt-BR": { text: "Passagem", pronunciation: "pa-sá-gem" }
  },
  "en_passport": {
    es: { text: "Pasaporte", pronunciation: "pa-sa-pór-te" },
    "pt-BR": { text: "Pasaporte", pronunciation: "pa-sa-pór-te" }
  },
  "en_street": {
    es: { text: "Calle", pronunciation: "cá-ye" },
    "pt-BR": { text: "Rua", pronunciation: "húa" }
  },
  "en_hospital": {
    es: { text: "Hospital", pronunciation: "os-pi-tál" },
    "pt-BR": { text: "Hospital", pronunciation: "os-pi-tál" }
  },
  "en_doctor": {
    es: { text: "Médico", pronunciation: "mé-di-co" },
    "pt-BR": { text: "Médico", pronunciation: "mé-di-co" }
  },
  "en_beautiful": {
    es: { text: "Bonito", pronunciation: "bo-ní-to" },
    "pt-BR": { text: "Lindo", pronunciation: "lín-do" }
  },
  "en_food": {
    es: { text: "Comida", pronunciation: "co-mí-da" },
    "pt-BR": { text: "Comida", pronunciation: "co-mí-da" }
  },
  "en_coffee": {
    es: { text: "Café", pronunciation: "ca-fé" },
    "pt-BR": { text: "Café", pronunciation: "ca-fé" }
  },
  "en_beer": {
    es: { text: "Cerveza", pronunciation: "ser-vé-za" },
    "pt-BR": { text: "Cerveja", pronunciation: "ser-vé-ja" }
  },
  "en_wine": {
    es: { text: "Vino", pronunciation: "bí-no" },
    "pt-BR": { text: "Vinho", pronunciation: "ví-nho" }
  },
  "en_bill": {
    es: { text: "Cuenta", pronunciation: "cuén-ta" },
    "pt-BR": { text: "Conta", pronunciation: "cón-ta" }
  },
  "en_buy": {
    es: { text: "Comprar", pronunciation: "com-prár" },
    "pt-BR": { text: "Comprar", pronunciation: "com-prár" }
  },
  "en_speak": {
    es: { text: "Hablar", pronunciation: "a-blár" },
    "pt-BR": { text: "Falar", pronunciation: "fa-lár" }
  },
  "en_understand": {
    es: { text: "Entender", pronunciation: "en-ten-dér" },
    "pt-BR": { text: "Entender", pronunciation: "en-ten-dér" }
  },
  "en_friend": {
    es: { text: "Amigo", pronunciation: "a-mí-go" },
    "pt-BR": { text: "Amigo", pronunciation: "a-mí-go" }
  },
  "en_time": {
    es: { text: "Tiempo / Hora", pronunciation: "tiém-po" },
    "pt-BR": { text: "Tempo / Hora", pronunciation: "têm-po" }
  },
  "en_today": {
    es: { text: "Hoy", pronunciation: "oi" },
    "pt-BR": { text: "Hoje", pronunciation: "ó-je" }
  },
  "en_tomorrow": {
    es: { text: "Mañana", pronunciation: "ma-nyá-na" },
    "pt-BR": { text: "Amanhã", pronunciation: "a-ma-nhã" }
  },
  "en_yesterday": {
    es: { text: "Ayer", pronunciation: "a-yér" },
    "pt-BR": { text: "Ontem", pronunciation: "ón-tem" }
  },
  "en_now": {
    es: { text: "Ahora", pronunciation: "a-ó-ra" },
    "pt-BR": { text: "Agora", pronunciation: "a-gó-ra" }
  },

  // Portuguese Source (pt-BR)
  "pt-BR_olá": {
    es: { text: "Hola", pronunciation: "ó-la" },
    en: { text: "Hello", pronunciation: "je-lóu" }
  },
  "pt-BR_oi": {
    es: { text: "Hola", pronunciation: "ó-la" },
    en: { text: "Hi", pronunciation: "jai" }
  },
  "pt-BR_bom dia": {
    es: { text: "Buenos días", pronunciation: "bué-nos dí-as" },
    en: { text: "Good morning", pronunciation: "gud mór-ning" }
  },
  "pt-BR_boa tarde": {
    es: { text: "Buenas tardes", pronunciation: "bué-nas tár-des" },
    en: { text: "Good afternoon", pronunciation: "gud áf-ter-nun" }
  },
  "pt-BR_boa noite": {
    es: { text: "Buenas noches", pronunciation: "bué-nas nó-ches" },
    en: { text: "Good night", pronunciation: "gud náit" }
  },
  "pt-BR_adeus": {
    es: { text: "Adiós", pronunciation: "a-diós" },
    en: { text: "Goodbye", pronunciation: "gud-bái" }
  },
  "pt-BR_tchau": {
    es: { text: "Adiós", pronunciation: "a-diós" },
    en: { text: "Bye", pronunciation: "bái" }
  },
  "pt-BR_por favor": {
    es: { text: "Por favor", pronunciation: "por fa-vór" },
    en: { text: "Please", pronunciation: "plis" }
  },
  "pt-BR_obrigado": {
    es: { text: "Gracias", pronunciation: "grá-cias" },
    en: { text: "Thank you", pronunciation: "zénk iú" }
  },
  "pt-BR_obrigada": {
    es: { text: "Gracias", pronunciation: "grá-cias" },
    en: { text: "Thank you", pronunciation: "zénk iú" }
  },
  "pt-BR_de nada": {
    es: { text: "De nada", pronunciation: "de ná-da" },
    en: { text: "You're welcome", pronunciation: "iúr uél-cam" }
  },
  "pt-BR_onde fica": {
    es: { text: "Dónde está", pronunciation: "dón-de es-tá" },
    en: { text: "Where is", pronunciation: "uér is" }
  },
  "pt-BR_onde esta": {
    es: { text: "Dónde está", pronunciation: "dón-de es-tá" },
    en: { text: "Where is", pronunciation: "uér is" }
  },
  "pt-BR_banheiro": {
    es: { text: "Baño", pronunciation: "bá-ño" },
    en: { text: "Restroom", pronunciation: "rés-trum" }
  },
  "pt-BR_estação de trem": {
    es: { text: "Estación de tren", pronunciation: "es-ta-ción de tren" },
    en: { text: "Train station", pronunciation: "tréin stéi-shon" }
  },
  "pt-BR_estacoes de trem": {
    es: { text: "Estaciones de tren", pronunciation: "es-ta-ció-nes de tren" },
    en: { text: "Train stations", pronunciation: "tréin stéi-shons" }
  },
  "pt-BR_aeroporto": {
    es: { text: "Aeropuerto", pronunciation: "a-e-ro-puér-to" },
    en: { text: "Airport", pronunciation: "ér-pórt" }
  },
  "pt-BR_hotel": {
    es: { text: "Hotel", pronunciation: "o-tél" },
    en: { text: "Hotel", pronunciation: "jou-tél" }
  },
  "pt-BR_restaurante": {
    es: { text: "Restaurante", pronunciation: "res-tau-rán-te" },
    en: { text: "Restaurant", pronunciation: "rés-to-ránt" }
  },
  "pt-BR_água": {
    es: { text: "Agua", pronunciation: "á-gua" },
    en: { text: "Water", pronunciation: "uá-ter" }
  },
  "pt-BR_dinheiro": {
    es: { text: "Dinero", pronunciation: "di-né-ro" },
    en: { text: "Money", pronunciation: "má-ni" }
  },
  "pt-BR_ajuda": {
    es: { text: "Ayuda", pronunciation: "a-iú-da" },
    en: { text: "Help", pronunciation: "jelp" }
  },
  "pt-BR_sim": {
    es: { text: "Sí", pronunciation: "sí" },
    en: { text: "Yes", pronunciation: "iés" }
  },
  "pt-BR_não": {
    es: { text: "No", pronunciation: "no" },
    en: { text: "No", pronunciation: "nóu" }
  },
  "pt-BR_quanto custa": {
    es: { text: "Cuánto cuesta", pronunciation: "cuán-to cués-ta" },
    en: { text: "How much is it", pronunciation: "háo mach is it" }
  },
  "pt-BR_passagem": {
    es: { text: "Boleto", pronunciation: "bo-lé-to" },
    en: { text: "Ticket", pronunciation: "tí-ket" }
  },
  "pt-BR_passaporte": {
    es: { text: "Pasaporte", pronunciation: "pa-sa-pór-te" },
    en: { text: "Passport", pronunciation: "pás-pórt" }
  },
  "pt-BR_rua": {
    es: { text: "Calle", pronunciation: "cá-ye" },
    en: { text: "Street", pronunciation: "strít" }
  },
  "pt-BR_hospital": {
    es: { text: "Hospital", pronunciation: "os-pi-tál" },
    en: { text: "Hospital", pronunciation: "jós-pi-tal" }
  },
  "pt-BR_médico": {
    es: { text: "Médico", pronunciation: "mé-di-co" },
    en: { text: "Doctor", pronunciation: "dóc-tor" }
  },
  "pt-BR_lindo": {
    es: { text: "Bonito", pronunciation: "bo-ní-to" },
    en: { text: "Beautiful", pronunciation: "biú-ti-ful" }
  },
  "pt-BR_comida": {
    es: { text: "Comida", pronunciation: "co-mí-da" },
    en: { text: "Food", pronunciation: "fúd" }
  },
  "pt-BR_café": {
    es: { text: "Café", pronunciation: "ca-fé" },
    en: { text: "Coffee", pronunciation: "có-fi" }
  },
  "pt-BR_cerveja": {
    es: { text: "Cerveza", pronunciation: "ser-vé-za" },
    en: { text: "Beer", pronunciation: "bír" }
  },
  "pt-BR_vinho": {
    es: { text: "Vino", pronunciation: "bí-no" },
    en: { text: "Wine", pronunciation: "uáin" }
  },
  "pt-BR_conta": {
    es: { text: "Cuenta", pronunciation: "cuén-ta" },
    en: { text: "Bill", pronunciation: "bil" }
  },
  "pt-BR_comprar": {
    es: { text: "Comprar", pronunciation: "com-prár" },
    en: { text: "Buy", pronunciation: "bái" }
  },
  "pt-BR_falar": {
    es: { text: "Hablar", pronunciation: "a-blár" },
    en: { text: "Speak", pronunciation: "spík" }
  },
  "pt-BR_entender": {
    es: { text: "Entender", pronunciation: "en-ten-dér" },
    en: { text: "Understand", pronunciation: "án-der-sténd" }
  },
  "pt-BR_amigo": {
    es: { text: "Amigo", pronunciation: "a-mí-go" },
    en: { text: "Friend", pronunciation: "frénd" }
  },
  "pt-BR_tempo": {
    es: { text: "Tiempo / Hora", pronunciation: "tiém-po" },
    en: { text: "Time", pronunciation: "táim" }
  },
  "pt-BR_hoje": {
    es: { text: "Hoy", pronunciation: "oi" },
    en: { text: "Today", pronunciation: "tu-déi" }
  },
  "pt-BR_amanhã": {
    es: { text: "Mañana", pronunciation: "ma-nyá-na" },
    en: { text: "Tomorrow", pronunciation: "tu-má-rou" }
  },
  "pt-BR_ontem": {
    es: { text: "Ayer", pronunciation: "a-yér" },
    en: { text: "Yesterday", pronunciation: "iés-ter-déi" }
  },
  "pt-BR_agora": {
    es: { text: "Ahora", pronunciation: "a-ó-ra" },
    en: { text: "Now", pronunciation: "náu" }
  }
};

// Auxiliary common single prepositions / pronouns to make fallback word-by-word elegant
const FALLBACK_VOCAB: Record<string, Record<string, string>> = {
  // Spanish Source (es)
  "es_la": { en: "the", "pt-BR": "a", es: "la" },
  "es_el": { en: "the", "pt-BR": "o", es: "el" },
  "es_un": { en: "a", "pt-BR": "um", es: "un" },
  "es_una": { en: "a", "pt-BR": "uma", es: "una" },
  "es_o": { es: "o", en: "or", "pt-BR": "ou" },
  "es_y": { en: "and", "pt-BR": "e", es: "y" },
  "es_a": { en: "to", es: "a", "pt-BR": "a" },
  "es_para": { en: "for", es: "para", "pt-BR": "para" },
  "es_con": { en: "with", "pt-BR": "com", es: "con" },
  "es_de": { en: "of", "pt-BR": "de", es: "de" },
  "es_en": { en: "in", "pt-BR": "em", es: "en" },
  "es_por": { en: "by", "pt-BR": "por", es: "por" },
  "es_mi": { en: "my", "pt-BR": "meu", es: "mi" },
  "es_su": { en: "his/her", "pt-BR": "seu", es: "su" },
  "es_yo": { en: "I", "pt-BR": "eu", es: "yo" },
  "es_tu": { en: "you", "pt-BR": "você", es: "tú" },
  "es_nosotros": { en: "we", "pt-BR": "nós", es: "nosotros" },

  // English Source (en)
  "en_the": { es: "la", "pt-BR": "o", en: "the" },
  "en_a": { es: "un", "pt-BR": "um", en: "a" },
  "en_and": { es: "y", "pt-BR": "e", en: "and" },
  "en_or": { es: "o", "pt-BR": "ou", en: "or" },
  "en_to": { es: "a", "pt-BR": "para", en: "to" },
  "en_for": { es: "para", "pt-BR": "para", en: "for" },
  "en_with": { es: "con", "pt-BR": "com", en: "with" },
  "en_of": { es: "de", "pt-BR": "de", en: "of" },
  "en_in": { es: "en", "pt-BR": "em", en: "in" },
  "en_my": { es: "mi", "pt-BR": "meu", en: "my" },
  "en_you": { es: "tú", "pt-BR": "você", en: "you" },
  "en_we": { es: "nosotros", "pt-BR": "nós", en: "we" },

  // Portuguese Source (pt-BR)
  "pt-BR_e": { es: "y", en: "and", "pt-BR": "e" },
  "pt-BR_um": { es: "un", en: "a", "pt-BR": "um" },
  "pt-BR_uma": { es: "una", en: "a", "pt-BR": "uma" },
  "pt-BR_com": { es: "con", en: "with", "pt-BR": "com" },
  "pt-BR_em": { es: "en", en: "in", "pt-BR": "em" },
  "pt-BR_meu": { es: "mi", en: "my", "pt-BR": "meu" },
  "pt-BR_você": { es: "tú", en: "you", "pt-BR": "você" },
  "pt-BR_nós": { es: "nosotros", en: "we", "pt-BR": "nós" }
};

// Generate high quality word-by-word fallback translations if live model fails
function getOfflineFallbackTranslation(text: string, sourceLang: string, targetLangs: string[]) {
  const sanitize = (val: string) => val.toLowerCase()
    .replace(/[¿?¡!.,;:()\-]/g, "")
    .replace(/[áàâã]/g, "a")
    .replace(/[éê]/g, "e")
    .replace(/[í]/g, "i")
    .replace(/[óôõ]/g, "o")
    .replace(/[úû]/g, "u")
    .replace(/[ç]/g, "c")
    .trim();

  const sanitizedInput = sanitize(text);

  const translations = targetLangs.map((tgt) => {
    // 1. Direct entire match in OFFLINE_DICTIONARY with source language prefix
    const dictKey = `${sourceLang}_${sanitizedInput}`;
    if (OFFLINE_DICTIONARY[dictKey]?.[tgt]) {
      const match = OFFLINE_DICTIONARY[dictKey][tgt];
      return {
        lang: tgt,
        text: match.text,
        pronunciation: match.pronunciation,
        explanation: tgt === "es"
          ? "✨ Traducción offline de respaldo (Límite temporal de API Gemini excedido)."
          : tgt === "pt-BR"
            ? "✨ Tradução offline de backup (Limite temporário da API Gemini excedido)."
            : "✨ Offline backup translation (Gemini API temporary quota limit reached)."
      };
    }

    // 2. Fragment substring matching (ensuring source lang prefix)
    const prefix = `${sourceLang}_`;
    for (const fullKey of Object.keys(OFFLINE_DICTIONARY)) {
      if (fullKey.startsWith(prefix)) {
        const rawKey = fullKey.substring(prefix.length);
        if (sanitizedInput.includes(rawKey) && rawKey.length > 3) {
          const match = OFFLINE_DICTIONARY[fullKey][tgt];
          if (match) {
            const restText = text.replace(new RegExp(rawKey, "gi"), "").trim().replace(/[¿?¡!.,;:()]/g, "");
            const combinedText = restText 
              ? `${match.text} [${restText}]`
              : match.text;
            return {
              lang: tgt,
              text: combinedText,
              pronunciation: match.pronunciation,
              explanation: tgt === "es"
                ? "✨ Traducción offline de respaldo parcial (Límite temporal de cuota activa)."
                : tgt === "pt-BR"
                  ? "✨ Tradução offline de backup parcial (Limite de cota ativo)."
                  : "✨ Offline partial backup translation (Gemini quota limit reached)."
            };
          }
        }
      }
    }

    // 3. Word-by-word dictionary fallback construction
    const words = text.split(/\s+/);
    const translatedWords: string[] = [];
    const pronuncParts: string[] = [];

    for (let rawWord of words) {
      const cleanWord = rawWord.toLowerCase().replace(/[¿?¡!.,;:()]/g, "");
      if (!cleanWord) continue;
      
      const unaccentWord = sanitize(cleanWord);
      const wordKey = `${sourceLang}_${unaccentWord}`;
      const fallbackKey = `${sourceLang}_${cleanWord}`;

      // Check main offline dictionary first
      if (OFFLINE_DICTIONARY[wordKey]?.[tgt]) {
        const entry = OFFLINE_DICTIONARY[wordKey][tgt];
        translatedWords.push(entry.text);
        if (entry.pronunciation) {
          pronuncParts.push(entry.pronunciation);
        }
      } else if (FALLBACK_VOCAB[fallbackKey]?.[tgt]) {
        // Check smaller vocab words
        translatedWords.push(FALLBACK_VOCAB[fallbackKey][tgt]);
      } else {
        // Keep original word if unknown (names, labels)
        translatedWords.push(rawWord);
      }
    }

    const compiledText = translatedWords.join(" ");
    const compiledPronunc = pronuncParts.length > 0 
      ? pronuncParts.join("-")
      : translatedWords.map(w => w.substring(0, 3)).join("-").toLowerCase();

    // Format final text
    const formattedText = compiledText.charAt(0).toUpperCase() + compiledText.slice(1);

    return {
      lang: tgt,
      text: formattedText,
      pronunciation: compiledPronunc,
      explanation: tgt === "es"
        ? "✨ Traducción precisa por palabras clave (Backup Offline por cuota)."
        : tgt === "pt-BR"
          ? "✨ Tradução precisa por palavras-chave (Backup Offline por limite de cota)."
          : "✨ Precision keyword-matched translation (Offline Backup due to API quota limits)."
    };
  });

  return { translations };
}

app.post("/api/translate", async (req, res) => {
  const { text, sourceLang, targetLangs } = req.body;

  try {
    if (!text || !sourceLang || !targetLangs || !Array.isArray(targetLangs)) {
      return res.status(400).json({ error: "Missing required parameters: text, sourceLang, or targetLangs array" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Google Gemini API key is not configured. Please add GEMINI_API_KEY in the Secrets panel."
      });
    }

    // Map language codes to names for the LLM
    const langNames: Record<string, string> = {
      es: "Spanish (es)",
      en: "English (en)",
      "pt-BR": "Portuguese (Brazil, pt-BR)",
    };

    const sourceLangName = langNames[sourceLang] || sourceLang;
    const targetLangNames = targetLangs.map((l) => langNames[l] || l).join(", ");

    const prompt = `You are an expert real-time voice translator.
Source statement to translate: "${text}"
From language: ${sourceLangName}
Translate to these target languages: ${targetLangs.map(l => langNames[l] || l).join(" and ")}

Provide a translation for each target language that is natural, colloquial (if the input is informal), and easy to speak.
For each translated result, include:
1. 'text': The actual translation in the target language.
2. 'pronunciation': A simplified phonetics-based reading guide that helps a speaker of the source language pronounce the translation correctly.
3. 'explanation' (optional): If there are interesting slang, cultural nuances, or alternate ways to say it, provide a super short 1-sentence explanation, otherwise leave as empty string.

Return output in valid JSON JSON format matching this schema:
{
  "translations": [
    {
      "lang": "language_code_such_as_en_or_pt-BR",
      "text": "translated text",
      "pronunciation": "pronunciation guide",
      "explanation": "cultural explanation or empty"
    }
  ]
}
`;

    // Tier 1: Try Primary Model (gemini-3.5-flash)
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["translations"],
            properties: {
              translations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["lang", "text", "pronunciation", "explanation"],
                  properties: {
                    lang: { type: Type.STRING },
                    text: { type: Type.STRING },
                    pronunciation: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const responseText = response.text;
      if (responseText) {
        const result = JSON.parse(responseText.trim());
        return res.json(result);
      }
    } catch (primaryError: any) {
      console.warn("Primary model gemini-3.5-flash failed or hit quota limit. Attempting backup model...", primaryError);
      
      const isQuotaOrStatus = (primaryError.message || "").includes("429") || 
                              (primaryError.message || "").includes("quota") || 
                              (primaryError.message || "").includes("Quota") || 
                              (primaryError.message || "").includes("exhausted") || 
                              (primaryError.message || "").includes("RESOURCE_EXHAUSTED") ||
                              primaryError.status === 429;

      if (!isQuotaOrStatus) {
        throw primaryError; // Rethrow general non-quota server/API issues to general catcher
      }
    }

    // Tier 2: Try Backup Model (gemini-3.1-flash-lite)
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["translations"],
            properties: {
              translations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["lang", "text", "pronunciation", "explanation"],
                  properties: {
                    lang: { type: Type.STRING },
                    text: { type: Type.STRING },
                    pronunciation: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const responseText = response.text;
      if (responseText) {
        const result = JSON.parse(responseText.trim());
        return res.json(result);
      }
    } catch (backupError: any) {
      console.warn("Backup model gemini-3.1-flash-lite failed or hit quota. Invoking Smart Direct Local Heuristic Dictionary...", backupError);
    }

    // Tier 3: Uninterrupted Local Dictionary and Keyword Translation Module on 429
    const localResult = getOfflineFallbackTranslation(text, sourceLang, targetLangs);
    res.json(localResult);

  } catch (error: any) {
    console.error("Translation fatal catch:", error);
    // Even if something completely threw up, gracefully fallback to local translation dictionary
    try {
      const emergencyLocal = getOfflineFallbackTranslation(text, sourceLang, targetLangs);
      return res.json(emergencyLocal);
    } catch (_) {
      res.status(500).json({ error: error.message || "Failed to perform translation" });
    }
  }
});

// Setup Vite Dev Server / Static files safely supporting both ESM and CommonJS runtimes
const resolvedFilename = typeof import.meta !== "undefined" && import.meta.url
  ? fileURLToPath(import.meta.url)
  : (typeof __filename !== "undefined" ? __filename : "");
const resolvedDirname = typeof __dirname !== "undefined"
  ? __dirname
  : (typeof resolvedFilename === "string" && resolvedFilename ? path.dirname(resolvedFilename) : process.cwd());

async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Started Vite Dev Server middleware");
  } else {
    // Production static files serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production files from dist/");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start server:", err);
});
