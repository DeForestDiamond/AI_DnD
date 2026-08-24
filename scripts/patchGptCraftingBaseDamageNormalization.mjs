import fs from 'node:fs';

const path = 'src/helpers/openai/crafting.js';
let s = fs.readFileSync(path, 'utf8');

const marker = '- BASE DAMAGE MUST ALSO BE CONSOLIDATED';
if (s.includes(marker)) {
  console.log('GPT crafting base damage normalization already applied.');
  process.exit(0);
}

const anchor = '- Do NOT put attack-roll bonuses or standard weapon properties into label.';
const at = s.indexOf(anchor);
if (at < 0) throw new Error('GPT crafting base damage normalization: mechanics anchor not found');

const rules = `- BASE DAMAGE MUST ALSO BE CONSOLIDATED into ONE untyped dice group plus its modifier. Never return mixed base dice such as "2d10+4d6+1d8+14". Convert them to the closest practical single dice expression with approximately the same average damage, e.g. "7d8+14".\n- The final weapon damage format should therefore be: ONE consolidated untyped base dice group + modifier, followed by at most ONE consolidated dice group for EACH extra damage type. Example: "7d8+14 plus 10d10 radiant".\n- Prefer dice expressions the game dice engine can parse cleanly. Do not use bullets, middle dots, comma-separated damage expressions, nested arithmetic, or multiple different dice sizes inside the base damage group.\n`;

s = s.slice(0, at) + rules + s.slice(at);
fs.writeFileSync(path, s);
console.log('GPT crafting base damage normalization applied.');
