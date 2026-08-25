import fs from 'node:fs';

const path = 'src/components/Sidebar.jsx';
let s = fs.readFileSync(path, 'utf8');

const replacements = [
  [
    "if (d.ac !== undefined) bits.push(`AC ${d.ac}`);",
    "if (d.ac !== undefined && d.ac !== null && d.ac !== '') bits.push(`AC ${d.ac}`);"
  ],
  [
    "{pc.type}{pc.slot && pc.slot !== pc.type ? ` · ${pc.slot}` : ''}{pc.ac !== undefined && pc.ac !== '' ? ` · AC ${pc.ac}` : ''}{pc.damage ? ` · ${pc.damage}` : ''}{pc.bonuses ? ` · ${pc.bonuses}` : ''}",
    "{pc.type}{pc.slot && pc.slot !== pc.type ? ` · ${pc.slot}` : ''}{pc.ac !== undefined && pc.ac !== null && pc.ac !== '' ? ` · AC ${pc.ac}` : ''}{pc.damage ? ` · ${pc.damage}` : ''}{pc.bonuses ? ` · ${pc.bonuses}` : ''}"
  ]
];

let changed = false;
for (const [from, to] of replacements) {
  if (s.includes(to)) continue;
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`Crafting null AC patch: expected one target, found ${n}`);
  s = s.replace(from, to);
  changed = true;
}

fs.writeFileSync(path, s);
console.log(changed ? 'Crafting null AC display fixed.' : 'Crafting null AC display already fixed.');
