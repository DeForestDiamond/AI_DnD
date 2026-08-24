import fs from 'node:fs';

const path = 'src/helpers/openai/crafting.js';
let s = fs.readFileSync(path, 'utf8');

const oldRule = '- WEAPON DAMAGE FORMAT IS STRICTLY NUMERIC DICE/MODIFIERS. Put every rolled damage component in damage, joined with " plus ", but NEVER write damage-type words there. Correct: "1d6+3 plus 2d12". WRONG: "1d6+3 piercing plus 2d12 force". WRONG: "2d8 radiant". The game rolls the numbers; damage types may be described narratively in label only when useful.';
const priorRule = '- WEAPON DAMAGE FORMAT: the BASE weapon damage is untyped; every EXTRA damage component must include its damage type. Correct: "1d6+3 plus 2d12 force". WRONG: "1d6+3 piercing plus 2d12 force" because the base damage must not include a type. WRONG: "1d6+3 plus 2d12" because extra damage must include its type. If there are multiple extra components of the SAME damage type, COLLAPSE THEM into ONE dice expression with approximately the same average damage. Never output "plus 1d4 force plus 1d6 force"; combine it to a close single expression such as "plus 1d10 force". Each extra damage type should appear at most once. When exact conversion is impossible, prioritize preserving approximate average damage, then minimizing separate dice groups. When upgrading an existing weapon, clean up repeated same-type damage already present in its old damage field.';
const newRule = '- WEAPON DAMAGE HAS ONE CANONICAL FORMAT. Before returning ANY weapon, normalize its damage field to: ONE untyped base dice expression with its modifier, followed by ZERO OR MORE typed bonus expressions, with EACH damage type appearing AT MOST ONCE. Canonical example: "7d8+14 plus 10d10 radiant plus 4d6 fire plus 3d6 cold". The base damage MUST be one dice size only: never "2d10+4d6+1d8+14"; convert mixed base dice to the closest single expression with approximately the same average, e.g. "7d8+14". NEVER put a damage type on the base expression: "7d8+14 piercing" is wrong. EVERY bonus expression MUST have a type: "plus 10d10" is wrong. COLLAPSE all bonus dice of the same type into one closest equivalent expression: "plus 10d10 radiant plus 6d6 radiant" is WRONG and must become one radiant group; "plus 1d4 force plus 1d6 force" is WRONG and should become approximately "plus 1d10 force". Preserve approximate average damage rather than exact dice distribution. When upgrading an existing weapon, first normalize all of its old base and bonus damage, then add the upgrade, then normalize again. FINAL SELF-CHECK: if the base contains more than one d-expression, or any damage type word appears more than once in the damage field, the answer is invalid and MUST be rewritten before output.';

if (s.includes(newRule)) {
  console.log('GPT crafting canonical damage format already patched.');
} else if (s.includes(priorRule)) {
  s = s.replace(priorRule, newRule);
  fs.writeFileSync(path, s);
  console.log('GPT crafting damage format upgraded to canonical form.');
} else {
  if (!s.includes(oldRule)) throw new Error('GPT crafting damage patch: expected damage rule not found');
  s = s.replace(oldRule, newRule);
  fs.writeFileSync(path, s);
  console.log('GPT crafting canonical damage format patched.');
}
