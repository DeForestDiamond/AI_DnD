import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');

const marker = `      // GPT prompt experiment: trim redundant prose/pressure rules for Sol.`;

if (s.includes(marker)) {
  console.log('GPT prompt thinning already applied.');
  process.exit(0);
}

// patchGptPromptExperiment defines gptStaticInstructions inside the OpenAI
// request branch, immediately before the explicit cache layout. Insert here so
// the thinned prompt is guaranteed to share the same lexical scope. Do not try
// to infer the end of the gptStaticInstructions expression from surrounding
// dynamic-state code; that code lives earlier in the function.
const insertAnchor = `      const cacheBreakpoint = () => ({ mode: 'explicit' });`;
if (!s.includes(insertAnchor)) {
  throw new Error('GPT cache-breakpoint anchor not found; refusing broad edit');
}

const insert = `      // GPT prompt experiment: trim redundant prose/pressure rules for Sol.\n      // TTS-sensitive wording rules, tags, mechanics, autonomy, and stat spelling\n      // are intentionally left untouched.\n      const thinnedGptInstructions = gptStaticInstructions\n        .replace(/EVERY SCENE NEEDS A HOOK:[\\s\\S]*?(?=\\n\\nPACING:)/, '')\n        .replace(/SCENES MUST EARN THEIR MYSTERY:[\\s\\S]*?(?=\\n\\nMOMENTUM WITHOUT FORCING IT:)/, 'MYSTERY AND DIRECT THREATS: Strange elements should matter and give the player something actionable. Not every threat needs a mystery, twist, or hidden cause; straightforward danger and direct fights are valid.')\n        .replace(/ACTIONS HAVE CONSEQUENCES:[\\s\\S]*?world owes them a reaction\\./, 'ACTIONS HAVE CONSEQUENCES: Significant player actions should produce believable consequences when the fiction supports them. Do not invent escalation merely to acknowledge an action.');\n\n`;

s = s.replace(insertAnchor, insert + insertAnchor);

const textAnchor = `          text: gptStaticInstructions,`;
if (!s.includes(textAnchor)) {
  throw new Error('GPT developer-content anchor not found; refusing broad edit');
}
s = s.replace(textAnchor, `          text: thinnedGptInstructions,`);

fs.writeFileSync(path, s);
console.log('GPT prompt thinning applied in OpenAI scope: hook forcing removed; mystery and consequence rules compressed.');
