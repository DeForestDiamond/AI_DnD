import { SAVE_VERSION } from '../constants/progression.js';
import { migrateCharacter } from './useCharacter.js';

export function useSave({ charRef, messages, storySummaryRef, onLoadFull, onLoadCharacter }) {

  const buildState = (type) => ({
    _type: type,
    _v: SAVE_VERSION,
    character: { ...charRef.current, _v: SAVE_VERSION },
    ...(type === 'fullsave' ? { messages, storySummary: storySummaryRef.current || '' } : {}),
  });

  // ── File download ────────────────────────────────────────────────────────────
  const downloadJSON = (state, filename) => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateFullSave = () => {
    const state = buildState('fullsave');
    console.log('[SAVE] storySummary length:', (storySummaryRef.current || '').length, 'preview:', (storySummaryRef.current || '').slice(0, 50));
    downloadJSON(state, `${charRef.current.name || 'character'}-fullsave-${Date.now()}.json`);
    try { localStorage.setItem('dnd-autosave', JSON.stringify(state)); } catch {}
    return state;
  };

  const generateCharExport = () => {
    const state = buildState('character');
    downloadJSON(state, `${charRef.current.name || 'character'}-export.json`);
    return state;
  };

  // ── localStorage auto-save ───────────────────────────────────────────────────
  const autoSave = (char, msgs) => {
    console.log('[AUTOSAVE] storySummary length:', (storySummaryRef.current || '').length);
    try {
      localStorage.setItem('dnd-autosave', JSON.stringify({
        _type: 'fullsave', _v: SAVE_VERSION,
        character: { ...char, _v: SAVE_VERSION },
        messages: msgs,
        storySummary: storySummaryRef.current || '',
      }));
    } catch {}
  };

  const loadAutoSave = () => {
    try {
      const raw = localStorage.getItem('dnd-autosave');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  };

  const hasAutoSave = () => {
    try { return !!localStorage.getItem('dnd-autosave'); } catch { return false; }
  };

  const clearAutoSave = () => {
    try { localStorage.removeItem('dnd-autosave'); } catch {}
  };

  // ── Load ─────────────────────────────────────────────────────────────────────
  const loadFromState = (state) => {
    if (!state.character) throw new Error('No character data');
    const { char: migrated, notes } = migrateCharacter(state.character);
    const isFullSave = state._type === 'fullsave' || !!state.messages;
    if (isFullSave) {
      onLoadFull(migrated, state.messages || [], state.storySummary || '');
    } else {
      onLoadCharacter(migrated);
    }
    return { notes, isFullSave };
  };

  const loadFromFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const state = JSON.parse(e.target.result);
          const result = loadFromState(state);
          resolve(result);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Legacy base64 string support for old saves
  const loadFromCode = (code) => {
    try {
      // Try JSON first (new format)
      const state = JSON.parse(code);
      return loadFromState(state);
    } catch {
      // Fall back to base64 (old format)
      const state = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      return loadFromState(state);
    }
  };

  // ── History compression ──────────────────────────────────────────────────────
  const compressHistory = async (messages, char, callDM, buildSystemPrompt) => {
    if (messages.length < 20) return null; // not worth compressing yet
    const history = messages.map(m => ({
      role: m.role === 'dm' ? 'assistant' : 'user',
      content: m.text.substring(0, 500), // truncate each message for summary
    }));
    const summary = await callDM([
      ...history,
      { role: 'user', content: 'Please write a detailed 3-4 paragraph summary of everything that has happened in this adventure so far. Include: key events, NPCs met, locations visited, items found, gold earned, contracts made, and the current situation. This will replace the full history to save space.' }
    ], buildSystemPrompt(char));
    return [{ role: 'dm', text: `[SESSION SUMMARY]\n${summary}`, id: Date.now(), roll: null }];
  };

  return {
    generateFullSave, generateCharExport,
    loadFromFile, loadFromCode, loadFromState,
    autoSave, loadAutoSave, hasAutoSave, clearAutoSave,
    compressHistory,
  };
}
