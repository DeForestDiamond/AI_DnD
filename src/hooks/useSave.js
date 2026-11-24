import { SAVE_VERSION } from '../constants/progression.js';
import { migrateCharacter } from './character/migration.js';
import { useRef, useState } from 'react';
import { browserSaveStore } from '../helpers/browserSave.js';

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

const characterFields = [
  '_v', 'name', 'race', 'cls', 'deity',
  'bio', 'appearance', 'disposition', 'directives',
  'level', 'xp', 'classLevels', 'subclasses', 'hp', 'maxHp', 'stats', 'feats', 'abilities',
];
const gearFields = [
  'coins', 'bankedCoins', 'slots', 'equipped', 'items', 'customItems', 'stashedCustomItems',
  'inventory', 'stash',
];
const positionedFields = new Set([...characterFields, ...gearFields]);

function characterForSave(char) {
  const data = { ...char, _v: SAVE_VERSION };
  // Keep campaign data and any unfamiliar fields from imported saves ahead of gear.
  const middle = Object.keys(data).filter(key => !positionedFields.has(key));
  const keys = [...characterFields, ...middle, ...gearFields];
  return Object.fromEntries(keys.filter(key => Object.hasOwn(data, key)).map(key => [key, data[key]]));
}

export function useSave({ charRef, messages, messagesRef, storySummaryRef, debugLogRef, promptLogRef, tokenCostLogRef, cacheStateRef, getSettings, onLoadFull, onLoadCharacter }) {
  const [autoSaveStatus,setAutoSaveStatus] = useState({state:'idle'});
  const saveSequence = useRef(0);

  const buildState = (type) => ({
    _type: type,
    _v: SAVE_VERSION,
    settings: getSettings?.() || {},
    // Character exports are a clean start: the character and world the player
    // built, with no story arc attached. Full saves keep the arc.
    character: type === 'character'
      ? (({ arc, ...rest }) => characterForSave(rest))(charRef.current)
      : characterForSave(charRef.current),
    ...(type === 'fullsave' ? {
      messages: messagesRef?.current || messages,
      storySummary: storySummaryRef.current || '',
      debugLog: debugLogRef?.current || [],
      promptLog: promptLogRef?.current || null,
      tokenCostLog: tokenCostLogRef?.current || [],
      cacheStateSnapshot: cacheStateRef?.current || null,
    } : {}),
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
    void autoSave(charRef.current,messagesRef?.current || messages);
    return state;
  };

  const generateCharExport = () => {
    const state = buildState('character');
    downloadJSON(state, `${charRef.current.name || 'character'}-export.json`);
    return state;
  };

  // ── Browser auto-save ──────────────────────────────────────────────────────
  const autoSave = async (char, msgs) => {
    const sequence = ++saveSequence.current;
    setAutoSaveStatus({state:'saving'});
    try {
      const saved = await browserSaveStore.save({
        _type: 'fullsave', _v: SAVE_VERSION,
        settings: getSettings?.() || {},
        character: characterForSave(char),
        messages: msgs,
        storySummary: storySummaryRef.current || '',
        tokenCostLog: tokenCostLogRef?.current || [],
        cacheStateSnapshot: cacheStateRef?.current || null,
      });
      if (sequence === saveSequence.current) setAutoSaveStatus({state:'saved',savedAt:saved.state._savedAt,messageCount:msgs.length,backend:saved.backend});
      return true;
    } catch(error) {
      if (sequence === saveSequence.current) setAutoSaveStatus({state:'error',message:error.message});
      console.error('[SAVE]',error);
      return false;
    }
  };

  const loadAutoSave = () => browserSaveStore.load();

  const hasAutoSave = async () => Boolean(await loadAutoSave());

  const clearAutoSave = () => browserSaveStore.clear();

  // ── Load ─────────────────────────────────────────────────────────────────────
  const loadFromState = (state) => {
    if (!state.character) throw new Error('No character data');
    const { char: migrated, notes } = migrateCharacter(state.character);
    const isFullSave = state._type === 'fullsave' || !!state.messages;
    if (isFullSave) {
      onLoadFull(
        migrated,
        state.messages || [],
        state.storySummary || '',
        state.settings,
        state.tokenCostLog || [],
        state.cacheStateSnapshot || null
      );
    } else {
      onLoadCharacter(migrated, state.settings);
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
    autoSave, loadAutoSave, hasAutoSave, clearAutoSave, autoSaveStatus,
  };
}

