import fs from 'node:fs';

const path = 'src/components/Sidebar.jsx';
let s = fs.readFileSync(path, 'utf8');

const replacements = [
  [
    "if (d.ac !== undefined) bits.push(`AC ${d.ac}`);",
    "if (d.ac !== undefined && d.ac !== null && d.ac !== '') bits.push(`AC ${d.ac}`);",
    'expandable item AC display'
  ],
  [
    "{pc.type}{pc.slot && pc.slot !== pc.type ? ` · ${pc.slot}` : ''}{pc.ac !== undefined && pc.ac !== '' ? ` · AC ${pc.ac}` : ''}{pc.damage ? ` · ${pc.damage}` : ''}{pc.bonuses ? ` · ${pc.bonuses}` : ''}",
    "{pc.type}{pc.slot && pc.slot !== pc.type ? ` · ${pc.slot}` : ''}{pc.ac !== undefined && pc.ac !== null && pc.ac !== '' ? ` · AC ${pc.ac}` : ''}{pc.damage ? ` · ${pc.damage}` : ''}{pc.bonuses ? ` · ${pc.bonuses}` : ''}",
    'crafted set-piece AC display'
  ]
];

let changed = false;
for (const [from, to, label] of replacements) {
  if (s.includes(from)) {
    // Some UI fragments intentionally exist in both crafting and salvage. Apply
    // the null guard everywhere the old rendering form still exists instead of
    // assuming there can only ever be one copy.
    const n = s.split(from).length - 1;
    s = s.split(from).join(to);
    changed = true;
    console.log(`Crafting null AC: patched ${n} ${label}${n === 1 ? '' : 's'}.`);
    continue;
  }
  if (!s.includes(to)) {
    throw new Error(`Crafting null AC patch: ${label} target not found`);
  }
}

fs.writeFileSync(path, s);
console.log(changed ? 'Crafting null AC display fixed.' : 'Crafting null AC display already fixed.');
