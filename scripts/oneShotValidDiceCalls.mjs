import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let src = fs.readFileSync(path, 'utf8');

const anchor = `  Roll whenever an outcome is uncertain and interesting: perception to spot an ambush/clue/lie, stealth to sneak, persuasion/intimidation/deception in social conflict, investigation to search, athletics/acrobatics for physical feats, insight to read someone. Do not silently decide these — call the [ROLL:] and let the dice answer.\n`;

const replacement = `${anchor}  VALID ROLL NAMES — USE ONLY THESE EXACT CHECK/SAVE NAMES. Never invent a custom roll name such as "arcane pistol check", "tracking check", "lockpick check", or "magic check". Translate the fictional action to the closest valid skill or saving throw below.\n  SKILL CHECKS: athletics, acrobatics, sleight of hand, stealth, arcana, history, investigation, nature, religion, animal handling, insight, medicine, perception, survival, deception, intimidation, performance, persuasion.\n  SAVING THROWS: strength saving throw, dexterity saving throw, constitution saving throw, intelligence saving throw, wisdom saving throw, charisma saving throw. "save" may replace "saving throw" (example: [ROLL: dexterity save DC 15]).\n  FORMAT: [ROLL: <valid name> difficulty <number>] or [ROLL: <valid saving throw> DC <number>]. If an action does not map cleanly to one of these, choose the governing standard D&D skill instead of inventing a new check name.\n`;

if (!src.includes(anchor)) throw new Error('Roll instruction anchor not found');
src = src.replace(anchor, replacement);
fs.writeFileSync(path, src);
console.log('Added canonical valid dice-call list to shared prompt.');
