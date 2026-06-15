// Web Speech API interface definitions for TypeScript safety
export const getSpeechRecognition = (): any => {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

export const isSpeechRecognitionSupported = (): boolean => {
  return getSpeechRecognition() !== null;
};

// Play audio using web synthesis
export const speakText = (
  text: string,
  locale: string,
  voiceURI?: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void,
  rate?: number
) => {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    if (onError) onError("Speech synthesis not supported in this browser.");
    return;
  }

  // Cancel any existing synthesis
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;

  const voices = window.speechSynthesis.getVoices();

  if (voiceURI) {
    const selectedVoice = voices.find((v) => v.voiceURI === voiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  } else {
    // Attempt to select a high-quality native speaker voice for the target locale
    const matchedVoice = voices.find(
      (voice) => voice.lang.replaceAll("_", "-").toLowerCase() === locale.toLowerCase() || 
                 voice.lang.toLowerCase().startsWith(locale.split("-")[0].toLowerCase())
    );
    
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
  }

  utterance.rate = rate ?? 1.0; // custom rate or natural speed
  utterance.pitch = 1.0;

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;
  utterance.onerror = (evt) => {
    console.error("Speech Synthesis Error:", evt);
    if (onError) onError(evt);
  };

  window.speechSynthesis.speak(utterance);
};

// Get available synthesis voices
export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
};
