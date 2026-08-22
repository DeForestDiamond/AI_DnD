import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');

const marker = 'LOCATION SPECIFICITY:';
if (s.includes(marker)) {
  console.log('Location tag specificity already patched.');
  process.exit(0);
}

const anchor = `Deities, factions (Harpers, Zhentarim, Lords' Alliance, Flaming Fist), and lore follow Forgotten Realms canon. Use [LOCATION:] tags with canon place names whenever the player's location changes.`;
const count = s.split(anchor).length - 1;
if (count !== 1) throw new Error(`Location tag patch: expected one setting anchor, found ${count}`);

const replacement = `${anchor}\nLOCATION SPECIFICITY: [LOCATION:] must identify the player's actual immediate place, not only the broad plane, region, or city. Preserve the useful hierarchy as \"Broad Location - Immediate Location\" when the player is inside or aboard a distinct place. Example: if the player is aboard the Spelljammer Battleship while in the Astral Plane, tag [LOCATION: Astral Plane - Spelljammer Battleship], NOT merely [LOCATION: Astral Plane]. Likewise use forms such as [LOCATION: Waterdeep - Yawning Portal] or [LOCATION: Underdark - Gracklstugh] when that specificity matters. This exact location is used to decide which NPC and town records are relevant, so dropping the immediate location can hide needed world-state information.`;

s = s.replace(anchor, replacement);
fs.writeFileSync(path, s);
console.log('Location tag specificity applied.');
