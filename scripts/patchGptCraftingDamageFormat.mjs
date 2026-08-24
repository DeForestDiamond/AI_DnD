import fs from 'node:fs';

const path = 'src/helpers/openai/crafting.js';
let s = fs.readFileSync(path, 'utf8');

const oldRule = '- WEAPON DAMAGE FORMAT IS STRICTLY NUMERIC DICE/MODIFIERS. Put every rolled damage component in damage, joined with " plus ", but NEVER write damage-type words there. Correct: "1d6+3 plus 2d12". WRONG: "1d6+3 piercing plus 2d12 force". WRONG: "2d8 radiant". The game rolls the numbers; damage types may be described narratively in label only when useful.';
const newRule = '- WEAPON DAMAGE FORMAT: the BASE weapon damage is untyped; every EXTRA damage component must include its damage type. Correct: "1d6+3 plus 2d12 force". WRONG: "1d6+3 piercing plus 2d12 force" because the base damage must not include a type. WRONG: "1d6+3 plus 2d12" because extra damage must include its type. If there are multiple extra components of the SAME damage type, COLLAPSE THEM into ONE dice expression with approximately the same average damage. Never output "plus 1d4 force plus 1d6 force"; combine it to a close single expression such as "plus 1d10 force". Each extra damage type should appear at most once. When exact conversion is impossible, prioritize preserving approximate average damage, then minimizing separate dice groups. When upgrading an existing weapon, clean up repeated same-type damage already present in its old damage field.';

if (s.includes(newRule)) {
  console.log('GPT crafting damage format already patched.');
} else {
  if (!s.includes(oldRule)) throw new Error('GPT crafting damage patch: expected old damage rule not found');
  s = s.replace(oldRule, newRule);
  fs.writeFileSync(path, s);
  console.log('GPT crafting damage format patched.');
}
