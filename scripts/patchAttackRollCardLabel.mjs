import fs from 'node:fs';

const path = 'src/components/MessageFeed.jsx';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

const marker = `const displayLabel = roll.dmg != null ? 'Attack' : roll.label;`;
if (!s.includes(marker)) {
  const anchor = `  const hit = roll.dc == null || roll.value >= roll.dc;`;
  const count = s.split(anchor).length - 1;
  if (count !== 1) throw new Error(`Attack roll card patch: expected one DiceRollDisplay anchor, found ${count}`);
  s = s.replace(anchor, `${anchor}\n  // Attack rolls can be auto-triggered by lightweight keyword matching. Never\n  // expose the equipped weapon name in the visible roll card; the player's prose\n  // remains authoritative about what kind of attack they actually attempted.\n  const displayLabel = roll.dmg != null ? 'Attack' : roll.label;`);
  changed = true;
}

if (s.includes(`            {roll.label}: <strong`)) {
  s = s.replace(`            {roll.label}: <strong`, `            {displayLabel}: <strong`);
  changed = true;
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('Attack roll cards now show generic Attack instead of weapon names.');
} else {
  console.log('Attack roll card label already generic.');
}
