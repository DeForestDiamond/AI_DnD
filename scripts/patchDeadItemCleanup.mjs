import fs from 'node:fs';

const replaceOnce = (text, from, to, label) => {
  const count = text.split(from).length - 1;
  if (count === 0 && text.includes(to.slice(0, Math.min(100, to.length)))) return { text, changed:false };
  if (count !== 1) throw new Error(`Dead item cleanup patch: expected one ${label} anchor, found ${count}`);
  return { text:text.replace(from, to), changed:true };
};

// ── Shared orphan-pruning helper + load-time cleanup ─────────────────────────
{
  const path = 'src/hooks/useCharacter.js';
  let s = fs.readFileSync(path, 'utf8');
  let changed = false;

  let r = replaceOnce(s,
`export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];`,
`// Remove item definitions that are no longer referenced anywhere the character
// owns them. Definitions are shared metadata, so leaving dead entries behind
// bloats saves and makes old crafted/salvaged items linger forever.
export const pruneDeadItemDefinitions = (c) => {
  if (!c?.items || typeof c.items !== 'object') return c;
  const items = { ...c.items };
  let changed = false;
  for (const name of Object.keys(items)) {
    if (!itemExistsAnywhere({ ...c, items }, name)) {
      delete items[name];
      changed = true;
    }
  }
  return changed ? { ...c, items } : c;
};

export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];`,
'prune helper');
  s = r.text; changed ||= r.changed;

  r = replaceOnce(s,
`  if (!c.items || typeof c.items !== 'object') c.items = {};
  c._v = SAVE_VERSION;`,
`  if (!c.items || typeof c.items !== 'object') c.items = {};
  // Older saves may already contain orphaned definitions from crafting,
  // salvaging, or deletes that removed the last owned copy. Clean them once on
  // load as well as preventing new orphans below.
  c = pruneDeadItemDefinitions(c);
  c._v = SAVE_VERSION;`,
'load cleanup');
  s = r.text; changed ||= r.changed;

  if (changed) {
    fs.writeFileSync(path, s);
    console.log('Dead custom-item cleanup added to character registry.');
  } else console.log('Dead custom-item character cleanup already applied.');
}

// ── Crafting/salvage can consume from stash/bags after [REMOVE:] is parsed ────
{
  const path = 'src/App.jsx';
  let s = fs.readFileSync(path, 'utf8');
  let changed = false;

  let r = replaceOnce(s,
`import { useCharacter, modStr, statMod, calcAC, equippableInSlot, allItems, levelUpsAvailable } from './hooks/useCharacter.js';`,
`import { useCharacter, modStr, statMod, calcAC, equippableInSlot, allItems, levelUpsAvailable, pruneDeadItemDefinitions } from './hooks/useCharacter.js';`,
'App import');
  s = r.text; changed ||= r.changed;

  r = replaceOnce(s,
`      return next;
    };
    return { removeTags, apply, bagTakes };`,
`      // [REMOVE:] can only see inventory at parse time. Stash/bag consumption
      // happens here afterwards, so prune definitions only after every source
      // has actually been updated.
      return pruneDeadItemDefinitions(next);
    };
    return { removeTags, apply, bagTakes };`,
'consumeMaterials apply');
  s = r.text; changed ||= r.changed;

  if (changed) {
    fs.writeFileSync(path, s);
    console.log('Crafting/salvage orphan cleanup applied.');
  } else console.log('Crafting/salvage orphan cleanup already applied.');
}
