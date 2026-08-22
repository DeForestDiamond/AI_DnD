import fs from 'node:fs';

const path = 'src/App.jsx';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

const importLine = `import { callGptSalvage } from './helpers/openai/salvage.js';`;
if (!s.includes(importLine)) {
  const importAnchor = `import { owedSubclasses } from './constants/subclasses.js';`;
  const count = s.split(importAnchor).length - 1;
  if (count !== 1) throw new Error(`GPT salvage routing: expected one import anchor, found ${count}`);
  s = s.replace(importAnchor, `${importAnchor}\n${importLine}`);
  changed = true;
}

const routeMarker = `      const { result: gptResult, usage: gptUsage } = await callGptSalvage({`;
if (!s.includes(routeMarker)) {
  const salvageLog = `    log(\`[SALVAGE] Proposing breakdown of \${items.length} item(s)\`);`;
  const count = s.split(salvageLog).length - 1;
  if (count !== 1) throw new Error(`GPT salvage routing: expected one salvage log anchor, found ${count}`);

  const insert = `${salvageLog}\n    if (selectedModel === 'gpt') {\n      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;\n      const { result: gptResult, usage: gptUsage } = await callGptSalvage({\n        apiKey: gptKey,\n        itemsText: itemList,\n      });\n      const gIn = gptUsage?.input_tokens || 0;\n      const gOut = gptUsage?.output_tokens || 0;\n      log(\`[HELPER] salvage via GPT \${gIn.toLocaleString()} in / \${gOut.toLocaleString()} out\`);\n      log(\`[SALVAGE] Recovers: \${(gptResult.recovers || []).map(r => \`\${r.name} x\${r.count}\`).join(', ') || 'nothing'}\`);\n      return gptResult;\n    }`;

  s = s.replace(salvageLog, insert);
  changed = true;
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('GPT salvage routing applied: GPT uses dedicated OpenAI helper; Claude salvage unchanged.');
} else {
  console.log('GPT salvage routing already applied.');
}
