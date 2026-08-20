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

const insert = `      // GPT prompt experiment: trim redundant prose/pressure rules for Sol.\n      // TTS-sensitive wording rules, tags, mechanics, autonomy, and stat spelling\n      // are intentionally left untouched.\n      const thinnedGptInstructions = gptStaticInstructions\n        // FORMAT: preserve the actual contract while removing repeated warnings,\n        // examples, and numeric length targets that encourage filler.\n        .replace(/── FORMAT ──[\\s\\S]*?(?=\\n\\n── STORYTELLING ──)/, \
\`── FORMAT ──\nRESPONSE LENGTH IS SITUATIONAL. Use only as many words as the scene earns. Routine actions, simple dialogue, travel, and straightforward resolutions should be concise. Expand only when additional dialogue, information, consequences, atmosphere, or character interaction materially improves the scene. Available output length is a ceiling, never a target. Preserve meaningful companion and NPC reactions.\nDESCRIPTION MUST EARN ITS SPACE. Prioritize actionable information, new facts, meaningful reactions, and one or two details that establish the scene. Do not add description merely to make a response feel complete or substantial. Once the next meaningful player decision is available, hand the turn back.\nTRAVEL: Uneventful travel may pass uneventfully, including journeys lasting days. Do not invent encounters, complications, discoveries, or interruptions merely because the player is travelling. If the app supplies an [ENCOUNTER] directive, play that encounter normally. Otherwise, summarize travel as briefly as appropriate unless existing story events logically interrupt it.\nEnd every non-roll response with exactly 4 numbered choices, each one short sentence of 15 words or fewer. Include at least one chaotic or unconventional choice and at least one ruthless or self-serving choice, phrased neutrally. Choices are suggestions only; the player may always do something else. A response containing [ROLL:] ends at that tag with no choices.\nNever resolve travel, combat, violence, or significant events without player input first.\nPlain text only. No markdown, asterisks, bold, or headers.\nNever abbreviate stats in narrative — spell out Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma.\`)\n        // STORYTELLING: the format block above now owns brevity/description. Remove\n        // the overlapping pressure/action rules rather than telling Sol repeatedly\n        // to create activity whenever a scene gets quiet.\n        .replace(/EVERY SCENE NEEDS A HOOK:[\\s\\S]*?(?=\\n\\nPACING:)/, '')\n        .replace(/SCENES MUST EARN THEIR MYSTERY:[\\s\\S]*?(?=\\n\\nMOMENTUM WITHOUT FORCING IT:)/, 'MYSTERY AND DIRECT THREATS: Strange elements should matter and give the player something actionable. Not every threat needs a mystery, twist, or hidden cause; straightforward danger and direct fights are valid.')\n        .replace(/ACTION OVER DESCRIPTION:[\\s\\S]*?(?=\\n\\nACTIONS HAVE CONSEQUENCES:)/, '')\n        .replace(/ACTIONS HAVE CONSEQUENCES:[\\s\\S]*?world owes them a reaction\\./, 'ACTIONS HAVE CONSEQUENCES: Significant player actions should produce believable consequences when the fiction supports them. Do not invent escalation merely to acknowledge an action.')\n        // The autonomy section already says to advance the scene after player actions.\n        // Keep the useful part, but remove the duplicated demand to always add something.\n        .replace(/SETTING THE STAGE IS YOUR JOB:[^\\n]*/, 'SETTING THE STAGE IS YOUR JOB: After a player action, provide whatever new information, reaction, or opportunity naturally follows, then return control to the player.')\n        + '\\n\\nNPC INTRODUCTIONS: The first time a character appears, explicitly state their race or creature type in the narration (for example human, elf, gnome, dragonborn, tiefling, aasimar). Do not rely on appearance alone to imply it.';\n\n`;

s = s.replace(insertAnchor, insert + insertAnchor);

const textAnchor = `          text: gptStaticInstructions,`;
if (!s.includes(textAnchor)) {
  throw new Error('GPT developer-content anchor not found; refusing broad edit');
}
s = s.replace(textAnchor, `          text: thinnedGptInstructions,`);

fs.writeFileSync(path, s);
console.log('GPT prompt thinning applied: situational length; travel may remain uneventful; narration duplication removed; NPC race introductions restored; pressure rules compressed.');
