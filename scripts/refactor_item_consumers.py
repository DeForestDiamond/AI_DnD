from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def sub_once(text, start, end, replacement, label):
    a = text.find(start)
    if a < 0: raise RuntimeError(f'{label}: start missing')
    b = text.find(end, a)
    if b < 0: raise RuntimeError(f'{label}: end missing')
    return text[:a] + replacement + text[b:]

# ── useGame ────────────────────────────────────────────────────────────────────
p = ROOT/'src/hooks/useGame.js'
s = p.read_text()
s = s.replace("import { ITEM_DB } from '../constants/items.js';\n", '')
if "../utils/itemStacks.js" not in s:
    s = s.replace("import { subclassPromptLines } from '../constants/subclasses.js';\n",
                  "import { subclassPromptLines } from '../constants/subclasses.js';\nimport { stackCounts, stackNames } from '../utils/itemStacks.js';\n", 1)
s = s.replace('char.customItems || {}', 'char.items || {}')
s = s.replace('char.customItems||{}', 'char.items||{}')
s = s.replace('char.customItems?.[n]', 'char.items?.[n]')
s = s.replace('const db          = { ...ITEM_DB, ...(char.items||{}) };', 'const db          = allItems(char.items || {});')
s = s.replace('const db = { ...ITEM_DB, ...(char.items||{}) };', 'const db = allItems(char.items || {});')
s = s.replace('const cdb = char.customItems || {};', 'const cdb = char.items || {};')
s = s.replace('const names = [...new Set(char.inventory || [])].filter(nm => cdb[nm]?.type === \'construct\');', "const names = stackNames(char.inventory).filter(nm => cdb[nm]?.type === 'construct');")
s = s.replace('no entry in customItems', 'no entry in the character item registry')

# Retire UPDATE instructions and teach qty:0.
s = s.replace("  [UPDATE: Sealed Letter | Opened Letter]   [UPDATE: Broken Amulet | Restored Amulet]\n  UPDATE keeps all of the item's stats, bonuses, and custom data — only the name changes. Safe for magic items: [UPDATE: Dull Blade | Awakened Blade] keeps its damage and bonuses.\n",
'''  MODIFYING AN EXISTING ITEM: emit the complete updated [ITEM:] definition with | qty:0. qty:0 updates the authoritative definition without adding another copy. Example: [ITEM: Awakened Blade | weapon | 2d8+2 | versatile | melee | awakened runes blaze along the edge | qty:0]\n  IMPORTANT: item NAME is its identity. To rename an existing item, use the exact final name consistently in narration and item management; do not invent two different definitions with the same name.\n''')

# Stack display helper now just exposes stored quantities.
old = '''export const stackInventory = (inventory) => {\n  const stacked = {};\n  inventory.forEach(name => {\n    stacked[name] = (stacked[name] || 0) + 1;\n  });\n  return stacked;\n};'''
if old not in s:
    raise RuntimeError('stackInventory old body missing')
s = s.replace(old, "export const stackInventory = (inventory) => stackCounts(inventory);", 1)
p.write_text(s)

# ── App crafting/salvage/runtime consumers ─────────────────────────────────────
p = ROOT/'src/App.jsx'
s = p.read_text()
if "./utils/itemStacks.js" not in s:
    s = s.replace("import { SaveModal } from './components/modals/SaveModal.jsx';\n",
                  "import { SaveModal } from './components/modals/SaveModal.jsx';\nimport { stackCounts, stackCount, stackHas, addStack, takeStack } from './utils/itemStacks.js';\n", 1)

start = "  // Bags hold their contents in customItems[bag].contents rather than the\n"
end = "  const totalHeld = (s) =>"
replacement = '''  // Bags keep their contents on the bag definition in the single item registry.\n  // A bag's physical stack determines whether those contents count as inventory\n  // or stash for crafting/salvage filters.\n  const materialSources = (c) => {\n    const src = {};\n    const bump = (nm, key, n) => {\n      src[nm] = src[nm] || { inv: 0, stash: 0, bags: [] };\n      if (key === 'bags') src[nm].bags.push(n); else src[nm][key] += n;\n    };\n    Object.entries(stackCounts(c.inventory)).forEach(([nm, qty]) => bump(nm, 'inv', qty));\n    Object.entries(stackCounts(c.stash)).forEach(([nm, qty]) => bump(nm, 'stash', qty));\n    Object.entries(c.items || {}).forEach(([bagName, d]) => {\n      if (d?.type !== 'bag' || !d.contents) return;\n      const bagStore = stackHas(c.stash, bagName) && !stackHas(c.inventory, bagName) ? 'stash' : 'inventory';\n      Object.entries(d.contents).forEach(([item, count]) => {\n        if (count > 0) bump(item, 'bags', { bag: bagName, store: bagStore, count });\n      });\n    });\n    return src;\n  };\n'''
s = sub_once(s, start, end, replacement, 'materialSources')

# consumeMaterials apply: replace old stash single-string scan and two-store bag edit.
start = "      if (stashTakes.length) {\n"
end = "      return next;\n"
replacement = '''      if (stashTakes.length) {\n        for (const t of stashTakes) next = { ...next, stash: takeStack(next.stash, t.name, t.count).stacks };\n      }\n      for (const t of bagTakes) {\n        const items = { ...(next.items || {}) };\n        const bag = items[t.bag];\n        if (!bag?.contents) continue;\n        const contents = { ...bag.contents };\n        contents[t.name] = (contents[t.name] || 0) - t.take;\n        if (contents[t.name] <= 0) delete contents[t.name];\n        items[t.bag] = { ...bag, contents };\n        next = { ...next, items };\n      }\n'''
s = sub_once(s, start, end, replacement, 'consume apply')

s = s.replace("const before = (c.inventory || []).filter(n => wanted.includes(n)).length;\n    const after = (next.inventory || []).filter(n => wanted.includes(n)).length;",
              "const before = wanted.reduce((sum, n) => sum + stackCount(c.inventory, n), 0);\n    const after = wanted.reduce((sum, n) => sum + stackCount(next.inventory, n), 0);", 1)
s = s.replace("const db = { ...(char.customItems || {}), ...(char.stashedCustomItems || {}) };", "const db = char.items || {};", 1)
s = s.replace("const db = allItems(character.customItems || {});", "const db = allItems(character.items || {});")

# Construct unpack/status blocks: one registry, no store split.
s = re.sub(r"const store = c\.customItems\?\.\[name\] \? 'customItems' : \(c\.stashedCustomItems\?\.\[name\] \? 'stashedCustomItems' : null\);",
           "const store = c.items?.[name] ? 'items' : null;", s)
s = s.replace("const inventory = (c.inventory || []).filter(x => x !== name);\n    const stash = (c.stash || []).filter(x => x !== name);",
              "const inventory = takeStack(c.inventory, name, stackCount(c.inventory, name)).stacks;\n    const stash = takeStack(c.stash, name, stackCount(c.stash, name)).stacks;", 1)
p.write_text(s)

# ── Sidebar UI ─────────────────────────────────────────────────────────────────
p = ROOT/'src/components/Sidebar.jsx'
s = p.read_text()
if "../utils/itemStacks.js" not in s:
    s = s.replace("import { XP_THRESHOLDS } from '../constants/progression.js';\n",
                  "import { XP_THRESHOLDS } from '../constants/progression.js';\nimport { stackCounts, stackCount, stackHas } from '../utils/itemStacks.js';\n", 1)

# Runtime DB/stat callers.
s = s.replace('allItems(character.customItems || {})', 'allItems(character.items || {})')
s = s.replace('character.customItems||{}', 'character.items||{}')
s = s.replace('character.customItems || {}', 'character.items || {}')
s = s.replace("db[name] || (character.stashedCustomItems || {})[name]", 'db[name]')
s = s.replace("db[nm] || (character.stashedCustomItems || {})[nm]", 'db[nm]')
s = s.replace("Object.entries(character.customItems || {})", "Object.entries(character.items || {})")
s = s.replace("character.inventory.filter(i => i === itemName).length", "stackCount(character.inventory, itemName)")

# Crafting and salvage count/source blocks appear twice with nearly identical shape.
def replace_source_block(text, label):
    start = "  const invCount = {}, stashCount = {}, bagInvCount = {}, bagStashCount = {}, bagWhere = {};\n"
    a = text.find(start)
    if a < 0: raise RuntimeError(label + ' source start missing')
    end_marker = "  const allNames = [...new Set([...Object.keys(invCount), ...Object.keys(stashCount), ...Object.keys(bagInvCount), ...Object.keys(bagStashCount)])];\n"
    b = text.find(end_marker, a)
    if b < 0: raise RuntimeError(label + ' source end missing')
    repl = '''  const invCount = stackCounts(character.inventory);\n  const stashCount = stackCounts(character.stash);\n  const bagInvCount = {}, bagStashCount = {}, bagWhere = {};\n  Object.entries(character.items || {}).forEach(([bagName, d]) => {\n    if (d?.type !== 'bag' || !d.contents) return;\n    const target = stackHas(character.stash, bagName) && !stackHas(character.inventory, bagName) ? bagStashCount : bagInvCount;\n    Object.entries(d.contents).forEach(([item, ct]) => {\n      if (ct > 0) { target[item] = (target[item] || 0) + ct; (bagWhere[item] = bagWhere[item] || []).push(bagName); }\n    });\n  });\n'''
    return text[:a] + repl + text[b:]

s = replace_source_block(s, 'craft')
s = replace_source_block(s, 'salvage')
s = s.replace("const stockData = (nm) => db[nm] || (character.stashedCustomItems || {})[nm];", "const stockData = (nm) => db[nm];")
s = s.replace("const stashData = nm => db[nm] || (character.stashedCustomItems || {})[nm];", "const stashData = nm => db[nm];")
p.write_text(s)

print('consumer refactor applied')
