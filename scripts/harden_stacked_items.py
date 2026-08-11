from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

# useCharacter: never expand old compressed saves into hundreds of thousands of strings.
p=ROOT/'src/hooks/useCharacter.js'
s=p.read_text()
old='''  // Inventory/stash may arrive in compressed { name: count } form (how they're
  // now stored on disk to avoid 4000 identical lines). Expand back to the array
  // of individual strings that every in-memory consumer expects. Runs for ALL
  // saves regardless of version — a plain array passes through untouched.
  const expandList = (val) => {
    if (Array.isArray(val)) return val;                 // old array-form save — as-is
    if (val && typeof val === 'object') {               // compressed { name: count }
      const out = [];
      for (const [name, count] of Object.entries(val)) {
        const n = Math.max(0, parseInt(count, 10) || 0);
        for (let i = 0; i < n; i++) out.push(name);
      }
      return out;
    }
    return [];                                          // absent/garbage → empty
  };
'''
new='''  // Legacy saves may contain either individual-name arrays or the old save-only
  // compressed {name:count} shape. NEVER expand the compressed form: a stockpile
  // of 300,000 ingots must stay one object during migration, not briefly become
  // 300,000 strings just to be collapsed again at v19.
  const expandList = (val) => {
    if (Array.isArray(val)) return val;                 // old array form; v19 compacts it
    if (val && typeof val === 'object') return Object.entries(val)
      .map(([name, count]) => ({ name, qty: Math.max(0, parseInt(count, 10) || 0) }))
      .filter(x => x.qty > 0);
    return [];
  };
'''
if old not in s: raise RuntimeError('legacy expandList block missing')
s=s.replace(old,new,1)

# v19 also fixes quantity baked into names for compressed saves that skipped the old
# string-array v13 transformation.
old='''    const inventory = normalizeStacks(c.inventory);
    const stash = normalizeStacks(c.stash);
    const items = {};
'''
new='''    const fixBakedQty = (list) => {
      let out = [];
      for (const stack of normalizeStacks(list)) {
        const m = stack.name.match(/^(.*?)\\s*[xX]\\s*(\\d+)$/);
        if (m && m[1].trim()) out = addStack(out, m[1].trim(), stack.qty * Math.min(500000, Math.max(1, parseInt(m[2], 10) || 1)));
        else out = addStack(out, stack.name, stack.qty);
      }
      return out;
    };
    const inventory = fixBakedQty(c.inventory);
    const stash = fixBakedQty(c.stash);
    const items = {};
'''
if old not in s: raise RuntimeError('v19 stack normalization anchor missing')
s=s.replace(old,new,1)

# create/add bag accept compact stack selections instead of arrays containing one
# string per selected copy.
s=s.replace("      const counts = {};\n      selectedItems.forEach(name => { counts[name] = (counts[name] || 0) + 1; });\n      let inventory = normalizeStacks(c.inventory);",
'''      const selectedStacks = normalizeStacks(selectedItems);
      const counts = Object.fromEntries(selectedStacks.map(({name, qty}) => [name, qty]));
      let inventory = normalizeStacks(c.inventory);''',1)
s=s.replace("      selectedItems.forEach(name => { counts[name] = (counts[name] || 0) + 1; });\n      let inventory = normalizeStacks(c.inventory);\n      const selectedCounts = {};\n      selectedItems.forEach(name => { selectedCounts[name] = (selectedCounts[name] || 0) + 1; });\n      Object.entries(selectedCounts).forEach(([name, qty]) => { inventory = takeStack(inventory, name, qty).stacks; });",
'''      const selectedStacks = normalizeStacks(selectedItems);
      selectedStacks.forEach(({name, qty}) => { counts[name] = (counts[name] || 0) + qty; });
      let inventory = normalizeStacks(c.inventory);
      selectedStacks.forEach(({name, qty}) => { inventory = takeStack(inventory, name, qty).stacks; });''',1)
p.write_text(s)

# Sidebar: only carried bags can be edited from inventory UI, and don't explode a
# large selected quantity back into an array of duplicate names.
p=ROOT/'src/components/Sidebar.jsx'
s=p.read_text()
s=s.replace("  const existingBags = Object.entries(character.items || {})\n    .filter(([, v]) => v.type === 'bag')\n    .map(([name]) => name);",
'''  const existingBags = Object.entries(character.items || {})
    .filter(([name, v]) => v.type === 'bag' && stackHas(character.inventory, name))
    .map(([name]) => name);''',1)
s=s.replace("    const items = Object.entries(bagSelected).flatMap(([name, count]) => Array(count).fill(name));",
              "    const items = Object.entries(bagSelected).filter(([, qty]) => qty > 0).map(([name, qty]) => ({ name, qty }));",1)
p.write_text(s)

# App crafting: one qty tag instead of repeating whole item tags N times. For sets,
# every piece receives batch copies.
p=ROOT/'src/App.jsx'
s=p.read_text()
old="""    const isSet = Array.isArray(option.pieces) && option.pieces.length > 0;
    const one = isSet ? option.pieces.map(tagFor).join('') : tagFor(option);
    const tag = one.repeat(batch);   // identical copies; [ITEM:] stacks them
"""
new="""    const isSet = Array.isArray(option.pieces) && option.pieces.length > 0;
    const withQty = (tag, qty) => qty > 1 ? tag.replace(/]$/, ` | qty:${qty}]`) : tag;
    const tag = isSet
      ? option.pieces.map(piece => withQty(tagFor(piece), batch)).join('')
      : withQty(tagFor(option), batch);
"""
if old not in s: raise RuntimeError('craft repeat block missing')
s=s.replace(old,new,1)
p.write_text(s)

# Clean obsolete wording so audits can distinguish real legacy runtime usage from comments.
p=ROOT/'src/hooks/useGame.js'
s=p.read_text().replace('their flavor/label lives in customItems, not the name.', 'their flavor/label lives in the character item registry, not the name.')
p.write_text(s)

print('stacked item hardening applied')
