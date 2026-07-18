import { useState, useRef, useCallback, useEffect } from 'react';

// Clean DM text for TTS — strip tags and fix abbreviations that sound wrong
const cleanForSpeech = (text) => text
  .replace(/\[[^\]]+\]/g, '')           // remove all game tags
  .replace(/[*_]/g, '')                 // strip markdown emphasis so TTS doesn't say "asterisk"
  .replace(/\d+\.\s/g, '')             // remove numbered list markers
  .replace(/\bDC\b/g, 'difficulty')    // DC → difficulty
  .replace(/\bAC\b/g, 'armor class')   // AC → armor class
  .replace(/\bHP\b/g, 'hit points')    // HP → hit points
  .replace(/\bXP\b/g, 'experience')    // XP → experience
  .replace(/\bSTR\b/g, 'strength')
  .replace(/\bDEX\b/g, 'dexterity')
  .replace(/\bCON\b/g, 'constitution')
  .replace(/\bINT\b/g, 'intelligence')
  .replace(/\bWIS\b/g, 'wisdom')
  .replace(/\bCHA\b/g, 'charisma')
  .trim();

// Split text into speakable chunks at sentence boundaries
const splitIntoChunks = (text, maxLength = 200) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
};

export function useVoice() {
  const [ttsEnabled, setTtsEnabled]   = useState(true);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [isListening, setIsListening] = useState(false);
  const ttsEnabledRef  = useRef(ttsEnabled);
  const recognitionRef = useRef(null);
  const chunkQueueRef  = useRef([]);

  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);

  const voiceSupported = 'speechSynthesis' in window;
  const sttSupported   = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  // Persisted voice preferences (voice name + speaking rate). Falls back to the
  // old name-hunt when nothing is chosen, so existing behavior is unchanged.
  const [voiceName, setVoiceNameState] = useState(() => localStorage.getItem('dnd-tts-voice') || '');
  const [rate, setRateState] = useState(() => parseFloat(localStorage.getItem('dnd-tts-rate')) || 0.88);
  const [pitch, setPitchState] = useState(() => parseFloat(localStorage.getItem('dnd-tts-pitch')) || 0.85);
  const [availableVoices, setAvailableVoices] = useState([]);
  const voiceNameRef = useRef(voiceName);
  const rateRef = useRef(rate);
  const pitchRef = useRef(pitch);
  useEffect(() => { voiceNameRef.current = voiceName; }, [voiceName]);
  useEffect(() => { rateRef.current = rate; }, [rate]);
  useEffect(() => { pitchRef.current = pitch; }, [pitch]);

  // The voice list populates asynchronously; refresh on the change event.
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => setAvailableVoices(window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en')));
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const setVoiceName = (name) => { setVoiceNameState(name); localStorage.setItem('dnd-tts-voice', name); };
  const setRate = (r) => { setRateState(r); localStorage.setItem('dnd-tts-rate', String(r)); };
  const setPitch = (v) => { setPitchState(v); localStorage.setItem('dnd-tts-pitch', String(v)); };

  const getPreferredVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    // 1. explicit saved choice wins — match by unique voiceURI first (Android
    // variants often share one display name), fall back to name for old prefs
    if (voiceNameRef.current) {
      const chosen = voices.find(v => v.voiceURI === voiceNameRef.current)
                  || voices.find(v => v.name === voiceNameRef.current);
      if (chosen) return chosen;
    }
    // 2. fall back to the old name-hunt for a decent default
    return voices.find(v =>
      v.name.includes('Daniel') || v.name.includes('David') ||
      v.name.includes('Alex')   || v.name.includes('Google UK')
    );
  };

  const speakChunk = useCallback((chunk, isLast, voice) => {
    const utt = new SpeechSynthesisUtterance(chunk);
    if (voice) utt.voice = voice;
    utt.rate = rateRef.current; utt.pitch = pitchRef.current; utt.volume = 1;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => {
      if (isLast) setIsSpeaking(false);
    };
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, []);

  const speak = useCallback((text) => {
    if (!voiceSupported || !ttsEnabledRef.current) return;
    window.speechSynthesis.cancel();
    const clean = cleanForSpeech(text);
    if (!clean) return;
    const chunks = splitIntoChunks(clean);
    const voice  = getPreferredVoice();
    // Queue all chunks — browser queues utterances automatically
    chunks.forEach((chunk, i) => {
      speakChunk(chunk, i === chunks.length - 1, voice);
    });
  }, [voiceSupported, speakChunk]);

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const startListening = (onResult) => {
    if (!sttSupported || isListening) return;
    const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart  = () => setIsListening(true);
    rec.onresult = (e) => { onResult(e.results[0][0].transcript); setIsListening(false); };
    rec.onerror  = () => setIsListening(false);
    rec.onend    = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return {
    ttsEnabled, setTtsEnabled,
    isSpeaking, isListening,
    voiceSupported, sttSupported,
    voiceName, setVoiceName, rate, setRate, pitch, setPitch, availableVoices,
    previewVoice: () => { window.speechSynthesis.cancel(); speakChunk('The road stretches on beneath a darkening sky.', true, getPreferredVoice()); },
    speak, stopSpeaking,
    startListening, stopListening,
  };
}
