import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');

const marker = `      // GPT prompt experiment: trim redundant prose/pressure rules for Sol.`;

if (s.includes(marker)) {
  console.log('GPT prompt thinning already applied.');
  process.exit(0);
}

// patchGptPromptExperiment defines gptStaticInstructions inside the OpenAI request
// branch. Insert immediately after that expression so the thinned variant shares
// the same lexical scope instead of trying to reference it from outside the branch.
const anchor = `        .replace(NPC_BLOCK, '')`;
if (!s.includes(anchor)) {
  throw new Error('GPT static-instructions anchor not found; refusing broad edit');
}

const endAnchor = `        .replace(`;
const start = s.indexOf(`      const gptStaticInstructions =`);
if (start < 0) throw new Error('gptStaticInstructions definition not found');
const dynamic = s.indexOf(`\n\n    let dynamicTail`, start);
if (dynamic < 0) throw new Error('OpenAI static-instructions block end not found');

const block = s.slice(start, dynamic);
const semicolon = block.lastIndexOf(';');
if (semicolon < 0) throw new Error('gptStaticInstructions terminator not found');
const insertAt = start + semicolon + 1;

const insert = `\n\n      // GPT prompt experiment: trim redundant prose/pressure rules for Sol.\n      // TTS-sensitive wording rules, tags, mechanics, autonomy, and stat spelling\n      // are intentionally left untouched.\n      const thinnedGptInstructions = gptStaticInstructions\n        .replace(/EVERY SCENE NEEDS A HOOK:[\\s\\S]*?(?=\\n\\nPACING:)/, '')\n        .replace(/SCENES MUST EARN THEIR MYSTERY:[\\s\\S]*?(?=\\n\\nMOMENTUM WITHOUT FORCING IT:)/, 'MYSTERY AND DIRECT THREATS: Strange elements should matter and give the player something actionable. Not every threat needs a mystery, twist, or hidden cause; straightforward danger and direct fights are valid.')\n        .replace(/ACTIONS HAVE CONSEQUENCES:[\\s\\S]*?world owes them a reaction\\./, 'ACTIONS HAVE CONSEQUENCES: Significant player actions should produce believable consequences when the fiction supports them. Do not invent escalation merely to acknowledge an action.');`;

s = s.slice(0, insertAt) + insert + s.slice(insertAt);

const textAnchor = `          text: gptStaticInstructions,`;
if (!s.includes(textAnchor)) {
  throw new Error('GPT developer-content anchor not found; refusing broad edit');
}
s = s.replace(textAnchor, `          text: thinnedGptInstructions,`);

fs.writeFileSync(path, s);
console.log('GPT prompt thinning applied in OpenAI scope: hook forcing removed; mystery and consequence rules compressed.');
