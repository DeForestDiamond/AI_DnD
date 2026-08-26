import fs from 'node:fs';

const appPath = 'src/App.jsx';
let app = fs.readFileSync(appPath, 'utf8');
let changed = false;

const openAiCondition = `MODEL_CONFIGS[selectedModel]?.provider === 'openai'`;
app = app.replaceAll(`selectedModel === 'gpt'`, openAiCondition);

// Every dedicated OpenAI helper should use the same model as the selected GPT DM.
const helperCalls = [
  'callGptCrafting({',
  'callGptSalvage({',
  'callGptStoryEntry({',
  'callGptArchive({',
  'callGptNpcManager({',
  'callGptTownManager({',
];
for (const marker of helperCalls) {
  let pos = 0;
  while ((pos = app.indexOf(marker, pos)) >= 0) {
    const insertAt = pos + marker.length;
    const tail = app.slice(insertAt, insertAt + 120);
    if (!tail.includes('model: MODEL_CONFIGS[selectedModel].model')) {
      app = app.slice(0, insertAt) + `\n        model: MODEL_CONFIGS[selectedModel].model,` + app.slice(insertAt);
      changed = true;
      pos = insertAt + 60;
    } else {
      pos = insertAt + 1;
    }
  }
}

if (app.includes(openAiCondition)) changed = true;
fs.writeFileSync(appPath, app);

const helperFiles = [
  ['src/helpers/openai/crafting.js', 'GPT_CRAFTING_MODEL', 'callGptCrafting'],
  ['src/helpers/openai/salvage.js', 'GPT_SALVAGE_MODEL', 'callGptSalvage'],
  ['src/helpers/openai/npcs.js', 'GPT_NPC_MODEL', 'callGptNpcManager'],
  ['src/helpers/openai/towns.js', 'GPT_TOWN_MODEL', 'callGptTownManager'],
];

for (const [path, constant, fn] of helperFiles) {
  let s = fs.readFileSync(path, 'utf8');
  const sigNeedle = `export async function ${fn}({ apiKey,`;
  if (s.includes(sigNeedle)) {
    s = s.replace(sigNeedle, `export async function ${fn}({ apiKey, model = ${constant},`);
    changed = true;
  }
  const modelNeedle = `model: ${constant},`;
  if (s.includes(modelNeedle)) {
    s = s.replace(modelNeedle, `model,`);
    changed = true;
  }
  fs.writeFileSync(path, s);
}

// History has a shared low-level call, so thread the selected model through it.
{
  const path = 'src/helpers/openai/history.js';
  let s = fs.readFileSync(path, 'utf8');
  s = s.replace(
    `async function callText({ apiKey, developer, user, maxOutputTokens }) {`,
    `async function callText({ apiKey, model = GPT_HISTORY_MODEL, developer, user, maxOutputTokens }) {`
  );
  s = s.replace(`model: GPT_HISTORY_MODEL,`, `model,`);
  s = s.replace(
    `export async function callGptStoryEntry({ apiKey, playerName, currentLocation, transcript }) {`,
    `export async function callGptStoryEntry({ apiKey, model = GPT_HISTORY_MODEL, playerName, currentLocation, transcript }) {`
  );
  s = s.replace(
    `return callText({ apiKey, developer, user: \`RECENT TRANSCRIPT:`,
    `return callText({ apiKey, model, developer, user: \`RECENT TRANSCRIPT:`
  );
  s = s.replace(
    `export async function callGptArchive({ apiKey, entriesText }) {`,
    `export async function callGptArchive({ apiKey, model = GPT_HISTORY_MODEL, entriesText }) {`
  );
  s = s.replace(
    `return callText({ apiKey, developer, user: \`ARCHIVE THESE ENTRIES:`,
    `return callText({ apiKey, model, developer, user: \`ARCHIVE THESE ENTRIES:`
  );
  fs.writeFileSync(path, s);
  changed = true;
}

console.log(changed ? 'OpenAI helpers now follow the selected GPT DM model.' : 'OpenAI helper model parity already applied.');
