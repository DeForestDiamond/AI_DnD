import fs from 'node:fs';

const path = 'src/App.jsx';
let s = fs.readFileSync(path, 'utf8');
let changed = false;
const once = (from, to, label) => {
  if (s.includes(to)) return;
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`TTS settings patch: expected one ${label}, found ${n}`);
  s = s.replace(from, to);
  changed = true;
};

once(
`    if (settings.selectedModel && MODEL_CONFIGS[settings.selectedModel]) setSelectedModel(settings.selectedModel);\n    if (typeof settings.showRawTags === 'boolean') setShowRawTags(settings.showRawTags);`,
`    if (settings.selectedModel && MODEL_CONFIGS[settings.selectedModel]) setSelectedModel(settings.selectedModel);\n    if (typeof settings.showRawTags === 'boolean') setShowRawTags(settings.showRawTags);\n    voice.applySavedSettings?.({ rate: settings.ttsRate, pitch: settings.ttsPitch });`,
'load settings hook'
);

once(
`    getSettings: () => ({ selectedModel, showRawTags }),`,
`    getSettings: () => ({ selectedModel, showRawTags, ttsRate: voice.rate, ttsPitch: voice.pitch }),`,
'save settings payload'
);

once(
`  }, [character, phase, selectedModel, showRawTags]);`,
`  }, [character, phase, selectedModel, showRawTags, voice.rate, voice.pitch]);`,
'autosave dependencies'
);

if (changed) fs.writeFileSync(path, s);
console.log(changed ? 'TTS save settings patch applied.' : 'TTS save settings patch already applied.');
