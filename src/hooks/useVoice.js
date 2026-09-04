import { useState, useRef, useCallback, useEffect } from 'react';

// Clean DM text for TTS — strip tags and fix abbreviations that sound wrong
// Words the speech engine mangles. Short names with no obvious vowel pattern get
// read as initialisms ("A-M-N"), and a leading double consonant is treated as a
// separate letter ("S. Seth'karix"). Rewriting them phonetically is the only fix
// — the engine has no pronunciation API. Users can add their own in settings.
const DEFAULT_PRONUNCIATIONS = {
  // Only words the engine genuinely mangles. Respelling anything it already
  // handles makes it WORSE — hyphenated syllables get read with odd pauses and
  // stress. Add your own in voice settings if you hit a new one.
  amn: 'Ahmn',
  vyn: 'Vinn',
};

const applyPronunciations = (text, custom = {}) => {
  const map = { ...DEFAULT_PRONUNCIATIONS, ...custom };
  let out = text;
  for (const [word, say] of Object.entries(map)) {
    if (!word || !say) continue;
    out = out.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), say);
  }
  out = out.replace(/\b([bcdfgklmnprstvz])\1(?=[a-z])/gi, '$1');
  return out;
};

const cleanForSpeech = (text, custom) => applyPronunciations(text, custom)
  .replace(/\[[^\]]+\]/g, '')
  .replace(/[*_]/g, '')
  .replace(/\d+\.\s/g, '')
  .replace(/\bCR\s*(\d+)/gi, 'challenge rating $1')
  .replace(/\bCR\b/g, 'challenge rating')
  .replace(/\bDC\b/g, 'difficulty')
  .replace(/\bAC\b/g, 'armor class')
  .replace(/\bHP\b/g, 'hit points')
  .replace(/\bXP\b/g, 'experience')
  .replace(/\bSTR\b/g, 'strength')
  .replace(/\bDEX\b/g, 'dexterity')
  .replace(/\bCON\b/g, 'constitution')
  .replace(/\bINT\b/g, 'intelligence')
  .replace(/\bWIS\b/g, 'wisdom')
  .replace(/\bCHA\b/g, 'charisma')
  .trim();

const splitIntoChunks = (text, maxLength = 200) => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength && current) {
      chunks.push(current.trim());
      current = sentence;
    } else current += sentence;
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

  // Device-local preferences remain a convenience fallback, while save files can
  // now restore rate/pitch for the character/campaign on load.
  const [voiceName, setVoiceNameState] = useState(() => localStorage.getItem('dnd-tts-voice') || '');
  const [rate, setRateState] = useState(() => {
    const saved = parseFloat(localStorage.getItem('dnd-tts-rate'));
    return Number.isFinite(saved) ? saved : 1;
  });
  const [pronounce, setPronounceState] = useState(() => localStorage.getItem('dnd-tts-pronounce') || '');
  const pronounceRef = useRef(pronounce);
  const [pitch, setPitchState] = useState(() => {
    const saved = parseFloat(localStorage.getItem('dnd-tts-pitch'));
    return Number.isFinite(saved) ? saved : 1;
  });
  const [availableVoices, setAvailableVoices] = useState([]);
  const voiceNameRef = useRef(voiceName);
  const rateRef = useRef(rate);
  const pitchRef = useRef(pitch);
  useEffect(() => { voiceNameRef.current = voiceName; }, [voiceName]);
  useEffect(() => { rateRef.current = rate; }, [rate]);
  useEffect(() => { pronounceRef.current = pronounce; }, [pronounce]);
  useEffect(() => { pitchRef.current = pitch; }, [pitch]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => setAvailableVoices(window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en')));
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const setVoiceName = (name) => { setVoiceNameState(name); localStorage.setItem('dnd-tts-voice', name); };
  const setRate = (r) => { setRateState(r); localStorage.setItem('dnd-tts-rate', String(r)); };
  const setPronounce = (t) => { setPronounceState(t); localStorage.setItem('dnd-tts-pronounce', t); };
  const parsePronounce = (text) => {
    const out = {};
    (text || '').split('\n').forEach(line => {
      const i = line.indexOf(':');
      if (i > 0) {
        const k = line.slice(0, i).trim().toLowerCase();
        const v = line.slice(i + 1).trim();
        if (k && v) out[k] = v;
      }
    });
    return out;
  };
  const setPitch = (v) => { setPitchState(v); localStorage.setItem('dnd-tts-pitch', String(v)); };

  // Save-load path uses the same setters so restored values immediately update
  // refs, UI state, and the device fallback.
  const applySavedSettings = ({ rate: savedRate, pitch: savedPitch } = {}) => {
    if (Number.isFinite(Number(savedRate))) setRate(Number(savedRate));
    if (Number.isFinite(Number(savedPitch))) setPitch(Number(savedPitch));
  };

  const getPreferredVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voiceNameRef.current) {
      const chosen = voices.find(v => v.voiceURI === voiceNameRef.current)
                  || voices.find(v => v.name === voiceNameRef.current);
      if (chosen) return chosen;
    }
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
    utt.onend   = () => { if (isLast) setIsSpeaking(false); };
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, []);

  const speak = useCallback((text) => {
    if (!voiceSupported || !ttsEnabledRef.current) return;
    window.speechSynthesis.cancel();
    const clean = cleanForSpeech(text, parsePronounce(pronounceRef.current));
    if (!clean) return;
    const chunks = splitIntoChunks(clean);
    const voice  = getPreferredVoice();
    chunks.forEach((chunk, i) => speakChunk(chunk, i === chunks.length - 1, voice));
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
    voiceName, setVoiceName, rate, setRate, pitch, setPitch, pronounce, setPronounce, availableVoices,
    applySavedSettings,
    previewVoice: () => { window.speechSynthesis.cancel(); speakChunk('The road stretches on beneath a darkening sky.', true, getPreferredVoice()); },
    speak, stopSpeaking,
    startListening, stopListening,
  };
}
