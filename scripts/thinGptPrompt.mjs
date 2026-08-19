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
// the thinned prompt is guaranteed to share the same lexical scope.
const insertAnchor = `      const cacheBreakpoint = () => ({ mode: 'explicit' });`;
if (!s.includes(insertAnchor)) {
  throw new Error('GPT cache-breakpoint anchor not found; refusing broad edit');
}

const insert = `      // GPT prompt experiment: trim redundant prose/pressure rules for Sol.\n      // TTS-sensitive wording rules, tags, mechanics, autonomy, and stat spelling\n      // are intentionally left untouched.\n      const thinnedGptInstructions = gptStaticInstructions\n        // FORMAT: preserve the actual contract while removing repeated warnings,\n        // examples, and explanations of the four-choice rule. Stat spelling stays\n        // verbatim because TTS depends on it.\n        .replace(/── FORMAT ──[\\s\\S]*?(?=\\n\\n── STORYTELLING ──)/, \
\`── FORMAT ──\nNarrate events directly rather than writing novelistic prose. Keep normal gameplay around 250–450 words when useful; simple scenes may be shorter and important scenes may be longer. Preserve meaningful companion and NPC reactions.\nKeep detail purposeful. Short uneventful travel may be summarized briefly; journeys of a day or more should include one concrete event or observation, and an [ENCOUNTER] directive must play out rather than be skipped.\nEnd every non-roll response with exactly 4 numbered choices, each one short sentence of 15 words or fewer. Include at least one chaotic or unconventional choice and at least one ruthless or self-serving choice, phrased neutrally. Choices are suggestions only; the player may always do something else. A response containing [ROLL:] ends at that tag with no choices.\nNever resolve travel, combat, violence, or significant events without player input first.\nPlain text only. No markdown, asterisks, bold, or headers.\nNever abbreviate stats in narrative — spell out Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma.\`)\n        .replace(/EVERY SCENE NEEDS A HOOK:[\\s\\S]*?(?=\\n\\nPACING:)/, '')\n        .replace(/SCENES MUST EARN THEIR MYSTERY:[\\s\\S]*?(?=\\n\\nMOMENTUM WITHOUT FORCING IT:)/, 'MYSTERY AND DIRECT THREATS: Strange elements should matter and give the player something actionable. Not every threat needs a mystery, twist, or hidden cause; straightforward danger and direct fights are valid.')\n        .replace(/ACTIONS HAVE CONSEQUENCES:[\\s\\S]*?world owes them a reaction\\./, 'ACTIONS HAVE CONSEQUENCES: Significant player actions should produce believable consequences when the fiction supports them. Do not invent escalation merely to acknowledge an action.');\n\n`;

s = s.replace(insertAnchor, insert + insertAnchor);

const textAnchor = `          text: gptStaticInstructions,`;
if (!s.includes(textAnchor)) {
  throw new Error('GPT developer-content anchor not found; refusing broad edit');
}
s = s.replace(textAnchor, `          text: thinnedGptInstructions,`);

fs.writeFileSync(path, s);
console.log('GPT prompt thinning applied: format compressed; hook forcing removed; mystery and consequence rules compressed.');
