import fs from 'node:fs';

const path = 'src/App.jsx';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

const replaceOnce = (from, to, label) => {
  const count = s.split(from).length - 1;
  if (count !== 1) throw new Error(`GPT world helpers: expected one ${label} anchor, found ${count}`);
  s = s.replace(from, to);
  changed = true;
};

// Imports
const importAnchor = `import { owedSubclasses } from './constants/subclasses.js';`;
const imports = [
  `import { callGptNpcManager } from './helpers/openai/npcs.js';`,
  `import { callGptTownManager } from './helpers/openai/towns.js';`,
  `import { callGptStoryEntry, callGptArchive } from './helpers/openai/history.js';`,
];
for (const line of imports) {
  if (!s.includes(line)) replaceOnce(importAnchor, `${importAnchor}\n${line}`, `import for ${line}`);
}

// Archive compression: GPT gets its own helper, Claude path remains untouched.
const archiveMarker = `      const { text: gptArchiveText, usage: gptArchiveUsage } = await callGptArchive({`;
if (!s.includes(archiveMarker)) {
  const anchor = `    log(\`[SUMMARY] Compressing \${entriesToCompress.length} entries into archived chunk (\${sessionLabel})\`);\n    try {`;
  const insert = `    log(\`[SUMMARY] Compressing \${entriesToCompress.length} entries into archived chunk (\${sessionLabel})\`);\n    if (selectedModel === 'gpt') {\n      try {\n        const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;\n        const { text: gptArchiveText, usage: gptArchiveUsage } = await callGptArchive({\n          apiKey: gptKey,\n          entriesText: entriesToCompress.map(e => e.text).join('\\n\\n'),\n        });\n        const gIn = gptArchiveUsage?.input_tokens || 0;\n        const gOut = gptArchiveUsage?.output_tokens || 0;\n        log(\`[HELPER] archive via GPT \${gIn.toLocaleString()} in / \${gOut.toLocaleString()} out\`);\n        log(\`[SUMMARY] Archived chunk created: \${gptArchiveText.length} chars\`);\n        return gptArchiveText;\n      } catch (e) {\n        log('[SUMMARY] GPT compression failed: ' + e.message);\n        return entriesToCompress.map(e => e.text).join('\\n\\n');\n      }\n    }\n    try {`;
  replaceOnce(anchor, insert, 'archive compression');
}

// Rolling story entry: obtain text from GPT when GPT is the DM, otherwise use existing Claude request.
if (!s.includes(`let gptStoryEntry = '';`)) {
  const stepAnchor = `      // Step 1 — write new entry for recent events\n      const res = await fetch('https://api.anthropic.com/v1/messages', {`;
  const stepInsert = `      // Step 1 — write new entry for recent events\n      let gptStoryEntry = '';\n      let gptStoryUsage = null;\n      if (selectedModel === 'gpt') {\n        const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;\n        const gptTranscript = historyForSummary.map(m => \`\${m.role === 'assistant' ? 'DM' : 'PLAYER'}: \${m.content}\`).join('\\n\\n');\n        const gptStory = await callGptStoryEntry({\n          apiKey: gptKey,\n          playerName: charRef.current?.name || 'the adventurer',\n          currentLocation: charRef.current?.currentLocation || 'unknown',\n          transcript: gptTranscript,\n        });\n        gptStoryEntry = gptStory.text;\n        gptStoryUsage = gptStory.usage;\n        const gIn = gptStoryUsage?.input_tokens || 0;\n        const gOut = gptStoryUsage?.output_tokens || 0;\n        log(\`[HELPER] story log via GPT \${gIn.toLocaleString()} in / \${gOut.toLocaleString()} out\`);\n      }\n      const res = gptStoryEntry ? null : await fetch('https://api.anthropic.com/v1/messages', {`;
  replaceOnce(stepAnchor, stepInsert, 'story entry request');

  replaceOnce(
    `      if (!res.ok) { lastSummarizedAt.current = prevSummarizedAt; return; }\n      const data = await res.json();\n      logUsage('story log entry', data);\n      const newEntry = data.content?.[0]?.text || '';`,
    `      if (!gptStoryEntry && !res.ok) { lastSummarizedAt.current = prevSummarizedAt; return; }\n      const data = gptStoryEntry ? null : await res.json();\n      if (data) logUsage('story log entry', data);\n      const newEntry = gptStoryEntry || data?.content?.[0]?.text || '';`,
    'story entry response'
  );
}

// NPC manager: early GPT path; existing Claude extraction/update code remains unchanged.
if (!s.includes(`const { found: gptFound, usage: gptUsage } = await callGptNpcManager({`)) {
  const npcAnchor = `    log(\`[NPC] Extracting \${trimmedName || 'all significant characters'} from messages #\${lo}-#\${hi} (\${apiMsgs.length} msgs)\`);`;
  const npcInsert = `${npcAnchor}\n    if (selectedModel === 'gpt') {\n      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;\n      const transcript = apiMsgs.map(m => \`\${m.role === 'assistant' ? 'DM' : 'PLAYER'}: \${m.content}\`).join('\\n\\n');\n      const existingRecord = existing ? { [existing[0]]: existing[1] } : null;\n      const { found: gptFound, usage: gptUsage } = await callGptNpcManager({\n        apiKey: gptKey, playerName, transcript, name: trimmedName, existing: existingRecord, note,\n      });\n      const gIn = gptUsage?.input_tokens || 0;\n      const gOut = gptUsage?.output_tokens || 0;\n      log(\`[HELPER] NPC manager via GPT \${gIn.toLocaleString()} in / \${gOut.toLocaleString()} out\`);\n      const names = Object.keys(gptFound || {});\n      if (!names.length) { log('[NPC] Nothing found in range'); return { applied: [] }; }\n      const c = { ...charRef.current, npcs: { ...charRef.current.npcs }, companions: { ...charRef.current.companions } };\n      const applied = [];\n      for (const [n, e] of Object.entries(gptFound)) {\n        const entry = { location: String(e?.location ?? ''), relationship: String(e?.relationship ?? ''), desc: String(e?.desc ?? '') };\n        const inComp = Object.keys(c.companions).find(k => k.toLowerCase() === n.toLowerCase());\n        const inNpc = Object.keys(c.npcs).find(k => k.toLowerCase() === n.toLowerCase());\n        if (inComp) c.companions[inComp] = { ...c.companions[inComp], ...entry };\n        else if (inNpc && !asCompanion) c.npcs[inNpc] = { ...c.npcs[inNpc], ...entry };\n        else if (inNpc && asCompanion) { c.companions[n] = { ...c.npcs[inNpc], ...entry }; delete c.npcs[inNpc]; }\n        else c[group][n] = entry;\n        applied.push(n);\n      }\n      updateChar(c);\n      log(\`[NPC] Saved: \${applied.join(', ')}\`);\n      return { applied };\n    }`;
  replaceOnce(npcAnchor, npcInsert, 'NPC routing');
}

// Town manager: same early-return provider routing.
if (!s.includes(`const { found: gptFound, usage: gptUsage } = await callGptTownManager({`)) {
  const townAnchor = `    log(\`[TOWN] Extracting \${trimmedName || 'all significant locations'} from messages #\${lo}-#\${hi}\`);`;
  const townInsert = `${townAnchor}\n    if (selectedModel === 'gpt') {\n      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;\n      const transcript = apiMsgs.map(m => \`\${m.role === 'assistant' ? 'DM' : 'PLAYER'}: \${m.content}\`).join('\\n\\n');\n      const existingRecord = existing ? { [existing[0]]: existing[1] } : null;\n      const { found: gptFound, usage: gptUsage } = await callGptTownManager({\n        apiKey: gptKey, playerName, transcript, name: trimmedName, existing: existingRecord, note,\n      });\n      const gIn = gptUsage?.input_tokens || 0;\n      const gOut = gptUsage?.output_tokens || 0;\n      log(\`[HELPER] town manager via GPT \${gIn.toLocaleString()} in / \${gOut.toLocaleString()} out\`);\n      if (!Object.keys(gptFound || {}).length) { log('[TOWN] Nothing found in range'); return { applied: [] }; }\n      const c = { ...charRef.current, towns: { ...charRef.current.towns } };\n      const applied = [];\n      const asDict = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};\n      for (const [n, e] of Object.entries(gptFound)) {\n        const entry = { desc: String(e?.desc ?? ''), status: String(e?.status ?? ''), notable_locations: asDict(e?.notable_locations), minor_residents: asDict(e?.minor_residents) };\n        const hit = Object.keys(c.towns).find(k => k.toLowerCase() === n.toLowerCase());\n        if (hit) c.towns[hit] = { ...c.towns[hit], ...entry };\n        else c.towns[n] = entry;\n        applied.push(n);\n      }\n      updateChar(c);\n      log(\`[TOWN] Saved: \${applied.join(', ')}\`);\n      return { applied };\n    }`;
  replaceOnce(townAnchor, townInsert, 'town routing');
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('GPT world helpers routing applied: history, NPCs, and towns use OpenAI when GPT DM is selected.');
} else {
  console.log('GPT world helpers routing already applied.');
}
