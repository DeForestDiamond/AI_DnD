import { SAVE_VERSION } from '../constants/progression.js';
import { migrateCharacter } from './useCharacter.js';

// ── Tolerant save parser ───────────────────────────────────────────────────────
// Hand-edited saves on mobile commonly have small JSON slips. Try strict parse
// first; if it fails, repair the safe, unambiguous mistakes and try again; if it
// STILL fails, throw an error that points at the line so the fix is findable.
// Repairs are intentionally conservative — only things with one correct meaning
// (trailing commas, smart quotes). We never guess at missing brackets or values.
export function parseSaveJSON(raw) {
  // 1. Strict — the normal path
  try { return { data: JSON.parse(raw), repaired: false }; } catch (strictErr) {

    // 2. Lenient — fix unambiguous hand-edit slips, then re-parse
    let fixed = raw
      // smart/curly quotes → straight quotes (phones love to autocorrect these)
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      // trailing comma before a closing } or ]   e.g.  "x": 1,]  →  "x": 1]
      .replace(/,(\s*[}\]])/g, '$1');

    // missing comma between two values: `}\n"key"` or `]\n"key"` or `"\n"key"`
    // (a value/closer directly followed by a new "key": — insert the comma)
    fixed = fixed.replace(/([}\]"0-9truefalsenul])(\s*\n\s*)(")/g, (m, end, gap, q) => {
      // only insert if the line genuinely starts a new "key": pair
      return `${end},${gap}${q}`;
    });

    try { return { data: JSON.parse(fixed), repaired: true }; } catch {
      // 3. Both failed — surface WHERE, using the strict error's position
      const posMatch = String(strictErr.message).match(/position (\d+)/);
      let where = '';
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const upto = raw.slice(0, pos);
        const line = upto.split('\n').length;
        const col = pos - upto.lastIndexOf('\n');
        where = ` near line ${line}, column ${col}`;
      }
      throw new Error(`Save file has a JSON error${where}. Common causes: a missing or extra comma, or an unclosed { } or [ ]. ${strictErr.message}`);
    }
  }
}

export function useSave({ charRef, messages, storySummaryRef, debugLogRef, promptLogRef, onLoadFull, onLoadCharacter }) {

  // ── Inventory/stash storage compression ──────────────────────────────────────
  // In memory, inventory & stash are arrays of individual item-name strings
  // (4000 cigarillos = 4000 strings) — every consumer relies on that array shape,
  // so we DON'T change it in memory. We only compress at the save boundary:
  // arrays become { name: count } objects on disk, and expand back to arrays on
  // load. A save with 4000 identical items stores one line instead of 4000.
  const compressList = (arr) => {
    if (!Array.isArray(arr)) return arr; // already compressed or absent — leave it
    const counts = {};
    for (const name of arr) counts[name] = (counts[name] || 0) + 1;
    return counts;
  };
  const compressCharForSave = (char) => ({
    ...char,
    inventory: compressList(char.inventory),
    stash: compressList(char.stash),
  });

  const buildState = (type) => ({
    _type: type,
    _v: SAVE_VERSION,
    // Character exports are a clean start: the character and world the player
    // built, with no story arc attached. Full saves keep the arc.
    character: type === 'character'
      ? (({ arc, ...rest }) => compressCharForSave({ ...rest, _v: SAVE_VERSION }))(charRef.current)
      : compressCharForSave({ ...charRef.current, _v: SAVE_VERSION }),
    // Full saves carry the debug log so cost tracing and diagnostics survive a
    // reload. Autosave writes its own payload and is unaffected.
    ...(type === 'fullsave' ? { messages, storySummary: storySummaryRef.current || '', debugLog: debugLogRef?.current || [], promptLog: promptLogRef?.current || null } : {}),
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
    try {
      localStorage.setItem('dnd-autosave', JSON.stringify({
        _type: 'fullsave', _v: SAVE_VERSION,
        character: compressCharForSave({ ...char, _v: SAVE_VERSION }),
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
          const { data: state, repaired } = parseSaveJSON(e.target.result);
          if (repaired) console.warn('[SAVE] Repaired minor JSON errors on load (trailing comma / quotes / missing comma).');
          const result = loadFromState(state);
          resolve({ ...result, repaired });
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Paste-a-save loading (JSON only; legacy base64 codes removed)
  const loadFromCode = (code) => {
    const { data: state } = parseSaveJSON(code);
    return loadFromState(state);
  };

  return {
    generateFullSave, generateCharExport,
    loadFromFile, loadFromCode, loadFromState,
    autoSave, loadAutoSave, hasAutoSave, clearAutoSave,
  };
}
