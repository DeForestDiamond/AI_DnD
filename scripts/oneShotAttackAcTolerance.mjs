import fs from 'node:fs';
const path='src/hooks/useGame.js';
let s=fs.readFileSync(path,'utf8');

const oldRegex = `const rollMatch = dmText.match(/\\[ROLL:\\s*([a-z' ]+?)\\s*(saving throw|save|check)?\\s*(?:difficulty|dc)\\s*(\\d+)\\]/i);`;
const newRegex = `const rollMatch = dmText.match(/\\[ROLL:\\s*([a-z' ]+?)\\s*(saving throw|save|check)?\\s*(?:difficulty|dc)\\s*(\\d+)\\s*(?:ac)?\\s*\\]/i);`;
if (!s.includes(oldRegex)) throw new Error('roll parser marker not found');
s=s.replace(oldRegex,newRegex);

const oldAttack = `  ATTACK: attack. Use [ROLL: attack] for player weapon attacks, including ranged weapon attacks. "rangedattack" is NOT a valid roll name.`;
const newAttack = `  ATTACK: attack. Player weapon attacks, including ranged attacks, MUST include the target's AC as the difficulty. Preferred form: [ROLL: attack difficulty 18]. Never emit bare [ROLL: attack]. "rangedattack" is NOT a valid roll name. The parser is deliberately tolerant if AC is appended to the number: 18, 18ac, and 18 ac all mean AC 18. "difficulty" and "DC" are both accepted.`;
if (!s.includes(oldAttack)) throw new Error('attack prompt marker not found');
s=s.replace(oldAttack,newAttack);

const oldFormat = `  FORMAT: [ROLL: attack] for a player weapon attack; [ROLL: <valid skill> difficulty <number>] for a skill check; or [ROLL: <valid saving throw> DC <number>] for a save. If a non-attack action does not map cleanly to one of these, choose the governing standard D&D skill instead of inventing a new check name.`;
const newFormat = `  FORMAT: [ROLL: attack difficulty <target AC>] for a player weapon attack; [ROLL: <valid skill> difficulty <number>] for a skill check; or [ROLL: <valid saving throw> DC <number>] for a save. If a non-attack action does not map cleanly to one of these, choose the governing standard D&D skill instead of inventing a new check name.`;
if (!s.includes(oldFormat)) throw new Error('format prompt marker not found');
s=s.replace(oldFormat,newFormat);

fs.writeFileSync(path,s);
console.log('Attack AC prompt and tolerant parser applied.');
