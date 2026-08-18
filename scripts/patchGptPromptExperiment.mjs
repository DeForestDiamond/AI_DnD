import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');

const old = `      const instructions = hasSplit
        ? [systemPrompt.static, systemPrompt.gear, systemPrompt.items].filter(Boolean).join('\\n\\n')
        : systemPrompt;`;

const next = `      // GPT prompt experiment: remove the shared NPC description/diversity block
      // from OpenAI only. Sonnet and Haiku continue receiving NPC_BLOCK unchanged.
      const instructions = (hasSplit
        ? [systemPrompt.static, systemPrompt.gear, systemPrompt.items].filter(Boolean).join('\\n\\n')
        : systemPrompt).replace(NPC_BLOCK, '');`;

if (s.includes(next)) {
  console.log('GPT prompt experiment already applied.');
} else if (s.includes(old)) {
  s = s.replace(old, next);
  fs.writeFileSync(path, s);
  console.log('GPT prompt experiment applied: NPC_BLOCK removed from OpenAI instructions.');
} else {
  throw new Error('OpenAI instructions anchor not found; refusing broad edit');
}
