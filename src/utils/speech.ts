export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Read-aloud language. Set by the play screen from the lesson's subject:
// language lessons use that language, everything else British English.
// Without this the browser uses the computer's own language, e.g. a Hungarian
// voice reading English questions on a laptop set up in Hungarian.
let currentLang = 'en-GB';

export function setSpeechLanguage(lang: string): void {
  currentLang = lang || 'en-GB';
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split('-')[0].toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(`${base}-`) || v.lang.toLowerCase() === base)
  );
}

export function stopSpeech(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

export function speakText(text: string, rate = 0.95): void {
  if (!isSpeechSupported() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = currentLang;
  const voice = pickVoice(currentLang);
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

// Voices load asynchronously in Chrome; touching the list early warms it up.
if (isSpeechSupported()) {
  window.speechSynthesis.getVoices();
}
