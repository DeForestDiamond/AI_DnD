import fs from 'node:fs';

const path = 'src/App.jsx';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

const importLine = `import { callGptCrafting } from './helpers/openai/crafting.js';`;
if (!s.includes(importLine)) {
  const importAnchor = `import { owedSubclasses } from './constants/subclasses.js';`;
  const count = s.split(importAnchor).length - 1;
  if (count !== 1) throw new Error(`GPT crafting routing: expected one import anchor, found ${count}`);
  s = s.replace(importAnchor, `${importAnchor}\n${importLine}`);
  changed = true;
}

const routeMarker = `      const { parsed: gptParsed, usage: gptUsage } = await callGptCrafting({`;
if (!s.includes(routeMarker)) {
  const craftMarker = `    log(\`[CRAFT] Proposing \${batchN > 1 ? \`\${batchN}x \` : ''}\${asConstruct ? 'CONSTRUCTS' : asSet ? 'matched SETS' : 'items'} from \${materials.length} material stacks\`);`;
  const craftAt = s.indexOf(craftMarker);
  if (craftAt < 0) throw new Error('GPT crafting routing: crafting log anchor not found');

  const fetchAnchor = `    const res = await fetch('https://api.anthropic.com/v1/messages', {`;
  const start = s.indexOf(fetchAnchor, craftAt);
  if (start < 0) throw new Error('GPT crafting routing: Anthropic crafting fetch anchor not found');

  const endAnchor = `    // Bonuses may come back as a string ("ac:2"), an object ({ac:2}) or an`;
  const end = s.indexOf(endAnchor, start);
  if (end < 0) throw new Error('GPT crafting routing: post-parse anchor not found');

  const oldBlock = s.slice(start, end);
  if (!oldBlock.includes(`logUsage('crafting', data);`) || !oldBlock.includes(`parsed = JSON.parse(raw);`)) {
    throw new Error('GPT crafting routing: crafting API block shape changed; refusing broad edit');
  }

  // Keep the existing Claude request intact inside the else branch. GPT gets its
  // own prompt/request implementation and both paths rejoin at the existing
  // shared validation + inventory application code below.
  const anthropicIndented = oldBlock
    .split('\n')
    .map(line => line ? `  ${line}` : line)
    .join('\n')
    .replace(`      let parsed;\n`, '')
    .replace(`      parsed = JSON.parse(raw);`, `      parsed = JSON.parse(raw);`);

  const newBlock = `    let parsed;\n    if (selectedModel === 'gpt') {\n      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;\n      const { parsed: gptParsed, usage: gptUsage } = await callGptCrafting({\n        apiKey: gptKey,\n        materialsText: matList,\n        characterLevel: char.level,\n        intent,\n        asSet,\n        asConstruct,\n        quantity: batchN,\n      });\n      parsed = gptParsed;\n      const gIn = gptUsage?.input_tokens || 0;\n      const gOut = gptUsage?.output_tokens || 0;\n      log(\`[HELPER] crafting via GPT \${gIn.toLocaleString()} in / \${gOut.toLocaleString()} out\`);\n    } else {\n${anthropicIndented}    }\n`;

  s = s.slice(0, start) + newBlock + s.slice(end);
  changed = true;
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('GPT crafting routing applied: GPT uses dedicated OpenAI helper; Claude crafting unchanged.');
} else {
  console.log('GPT crafting routing already applied.');
}
