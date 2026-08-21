import fs from 'node:fs';

const path = 'src/App.jsx';
let s = fs.readFileSync(path, 'utf8');

const old = `  const resolveHeldName = (wanted, held) => {\n    const w = (wanted || '').trim();\n    const exact = held.find(h => h.toLowerCase() === w.toLowerCase());\n    if (exact) return exact;\n    const stripped = w.replace(/\\s*\\([^)]*\\)\\s*$/, '').replace(/\\s+x\\d+$/i, '').trim();\n    const onStripped = held.find(h => h.toLowerCase() === stripped.toLowerCase());\n    if (onStripped) return onStripped;\n    // longest held name that the requested string begins with (handles a\n    // trailing description appended without brackets)\n    const prefix = held\n      .filter(h => stripped.toLowerCase().startsWith(h.toLowerCase()))\n      .sort((a, b) => b.length - a.length)[0];\n    return prefix || w;\n  };`;

const replacement = `  // Canonicalise names before comparing model output to held inventory. Models\n  // frequently swap straight and curly apostrophes (Knight's vs Knight’s), and\n  // may vary whitespace/case. Preserve the player's exact held spelling once a\n  // match is found so downstream inventory/stash/bag operations still use the\n  // real item key.\n  const canonicalItemName = (name) => String(name || '')\n    .normalize('NFKC')\n    .replace(/[\\u2018\\u2019\\u02BC\\uFF07]/g, "'")\n    .replace(/[\\u201C\\u201D]/g, '"')\n    .replace(/\\s+/g, ' ')\n    .trim()\n    .toLowerCase();\n\n  const resolveHeldName = (wanted, held) => {\n    const w = (wanted || '').trim();\n    const exact = held.find(h => canonicalItemName(h) === canonicalItemName(w));\n    if (exact) return exact;\n    const stripped = w.replace(/\\s*\\([^)]*\\)\\s*$/, '').replace(/\\s+x\\d+$/i, '').trim();\n    const strippedKey = canonicalItemName(stripped);\n    const onStripped = held.find(h => canonicalItemName(h) === strippedKey);\n    if (onStripped) return onStripped;\n    // longest held name that the requested string begins with (handles a\n    // trailing description appended without brackets)\n    const prefix = held\n      .filter(h => strippedKey.startsWith(canonicalItemName(h)))\n      .sort((a, b) => b.length - a.length)[0];\n    return prefix || w;\n  };`;

if (s.includes(replacement)) {
  console.log('Crafting material name normalization already applied.');
  process.exit(0);
}

const count = s.split(old).length - 1;
if (count !== 1) throw new Error(`Crafting name patch: expected one resolveHeldName anchor, found ${count}`);

s = s.replace(old, replacement);
fs.writeFileSync(path, s);
console.log('Crafting material name normalization applied.');
