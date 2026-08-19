import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');

const anchor = `    let dynamicTail = hasSplit ? systemPrompt.dynamic : '';`;
const marker = `    // GPT prompt experiment: trim redundant prose/pressure rules for Sol.`;

if (s.includes(marker)) {
  console.log('GPT prompt thinning already applied.');
  process.exit(0);
}

if (!s.includes(anchor)) {
  throw new Error('GPT prompt thinning anchor not found; refusing broad edit');
}

const insert = `    // GPT prompt experiment: trim redundant prose/pressure rules for Sol.\n    // TTS-sensitive wording rules, tags, mechanics, autonomy, and stat spelling\n    // are intentionally left untouched.\n    const thinnedGptInstructions = provider === 'openai'\n      ? gptStaticInstructions\n          // Quiet scenes do not need a manufactured hook. PACING/MOMENTUM already\n          // tell Sol how to keep play useful without forcing an event.\n          .replace(/EVERY SCENE NEEDS A HOOK:[\\s\\S]*?(?=\\n\\nPACING:)/, '')\n          // Two long mystery paragraphs were teaching the same simple distinction.\n          .replace(/SCENES MUST EARN THEIR MYSTERY:[\\s\\S]*?(?=\\n\\nMOMENTUM WITHOUT FORCING IT:)/, 'MYSTERY AND DIRECT THREATS: Strange elements should matter and give the player something actionable. Not every threat needs a mystery, twist, or hidden cause; straightforward danger and direct fights are valid.')\n          // Keep consequences, remove the instruction to manufacture escalation or\n          // atmospheric omens every time the player does something significant.\n          .replace(/ACTIONS HAVE CONSEQUENCES:[\\s\\S]*?world owes them a reaction\\./, 'ACTIONS HAVE CONSEQUENCES: Significant player actions should produce believable consequences when the fiction supports them. Do not invent escalation merely to acknowledge an action.')\n      : gptStaticInstructions;\n\n`;

s = s.replace(anchor, insert + anchor);

const textAnchor = `          text: gptStaticInstructions,`;
if (!s.includes(textAnchor)) {
  throw new Error('GPT developer-content anchor not found; refusing broad edit');
}
s = s.replace(textAnchor, `          text: thinnedGptInstructions,`);

fs.writeFileSync(path, s);
console.log('GPT prompt thinning applied: hook forcing removed; mystery and consequence rules compressed.');
