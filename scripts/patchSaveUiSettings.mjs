import fs from 'node:fs';

const appPath = 'src/App.jsx';
const savePath = 'src/hooks/useSave.js';
const modalPath = 'src/components/modals/SaveModal.jsx';

let app = fs.readFileSync(appPath, 'utf8');
let save = fs.readFileSync(savePath, 'utf8');
let modal = fs.readFileSync(modalPath, 'utf8');
let changed = false;

const replaceOnce = (text, from, to, label) => {
  if (text.includes(to)) return text;
  const i = text.indexOf(from);
  if (i < 0) throw new Error(`Save UI settings migration: ${label} anchor not found`);
  changed = true;
  return text.slice(0, i) + to + text.slice(i + from.length);
};

// ── useSave.js: persist settings in both exports and autosaves, and pass them
// through the normal load handlers. Older saves simply have no settings field.
save = replaceOnce(
  save,
  'export function useSave({ charRef, messages, storySummaryRef, debugLogRef, promptLogRef, onLoadFull, onLoadCharacter }) {',
  'export function useSave({ charRef, messages, storySummaryRef, debugLogRef, promptLogRef, getSettings, onLoadFull, onLoadCharacter }) {',
  'useSave signature'
);

save = replaceOnce(
  save,
  '    _v: SAVE_VERSION,\n    // Character exports are a clean start:',
  '    _v: SAVE_VERSION,\n    settings: getSettings?.() || {},\n    // Character exports are a clean start:',
  'buildState settings'
);

save = replaceOnce(
  save,
  "        _type: 'fullsave', _v: SAVE_VERSION,\n        character: compressCharForSave({ ...char, _v: SAVE_VERSION }),",
  "        _type: 'fullsave', _v: SAVE_VERSION,\n        settings: getSettings?.() || {},\n        character: compressCharForSave({ ...char, _v: SAVE_VERSION }),",
  'autosave settings'
);

save = replaceOnce(
  save,
  "      onLoadFull(migrated, state.messages || [], state.storySummary || '');\n    } else {\n      onLoadCharacter(migrated);",
  "      onLoadFull(migrated, state.messages || [], state.storySummary || '', state.settings);\n    } else {\n      onLoadCharacter(migrated, state.settings);",
  'load settings passthrough'
);

// ── App.jsx: apply restored settings, expose current settings to useSave, and
// autosave when either UI preference changes.
const handlerAnchor = "  const applyLoadedFull = (char, msgs, summary = '') => {";
if (!app.includes('const applyLoadedSettings = (settings) => {')) {
  const helper = `  const applyLoadedSettings = (settings) => {\n    if (!settings || typeof settings !== 'object') return;\n    if (settings.selectedModel && MODEL_CONFIGS[settings.selectedModel]) setSelectedModel(settings.selectedModel);\n    if (typeof settings.showRawTags === 'boolean') setShowRawTags(settings.showRawTags);\n  };\n\n`;
  const i = app.indexOf(handlerAnchor);
  if (i < 0) throw new Error('Save UI settings migration: load handler anchor not found');
  app = app.slice(0, i) + helper + app.slice(i);
  changed = true;
}

app = replaceOnce(
  app,
  "  const applyLoadedFull = (char, msgs, summary = '') => {\n    resetCraftingPanels();",
  "  const applyLoadedFull = (char, msgs, summary = '', settings = null) => {\n    applyLoadedSettings(settings);\n    resetCraftingPanels();",
  'full load settings'
);

app = replaceOnce(
  app,
  '  const applyLoadedCharacter = (char) => {\n    resetCraftingPanels();',
  '  const applyLoadedCharacter = (char, settings = null) => {\n    applyLoadedSettings(settings);\n    resetCraftingPanels();',
  'character load settings'
);

app = replaceOnce(
  app,
  '    promptLogRef,\n    onLoadFull: applyLoadedFull,',
  '    promptLogRef,\n    getSettings: () => ({ selectedModel, showRawTags }),\n    onLoadFull: applyLoadedFull,',
  'useSave getSettings'
);

app = replaceOnce(
  app,
  '  }, [character, phase]);',
  '  }, [character, phase, selectedModel, showRawTags]);',
  'autosave dependencies'
);

// ── SaveModal.jsx: autosave restore bypasses useSave.loadFromState, so pass the
// settings metadata through the same App handlers explicitly.
modal = replaceOnce(
  modal,
  "        onLoadFull(state.character, state.messages || [], state.storySummary || '');\n      } else {\n        onLoadCharacter(state.character);",
  "        onLoadFull(state.character, state.messages || [], state.storySummary || '', state.settings);\n      } else {\n        onLoadCharacter(state.character, state.settings);",
  'autosave restore settings'
);

if (changed) {
  fs.writeFileSync(appPath, app);
  fs.writeFileSync(savePath, save);
  fs.writeFileSync(modalPath, modal);
  console.log('Save UI settings migration applied.');
} else {
  console.log('Save UI settings already patched.');
}
