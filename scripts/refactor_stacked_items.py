from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def sub_once(text, pattern, repl, label, flags=re.S):
    new, n = re.subn(pattern, repl, text, count=1, flags=flags)
    if n != 1:
        raise RuntimeError(f'{label}: expected 1 replacement, got {n}')
    return new

# ── save version ───────────────────────────────────────────────────────────────
p = ROOT / 'src/constants/progression.js'
s = p.read_text()
s, n = re.subn(r'export const SAVE_VERSION\s*=\s*\d+;', 'export const SAVE_VERSION = 19;', s, count=1)
if n != 1: raise RuntimeError('SAVE_VERSION not found')
p.write_text(s)

# ── character/item core ───────────────────────────────────────────────────────
p = ROOT / 'src/hooks/useCharacter.js'
s = p.read_text()
imp = "import { normalizeStacks, stackCount, stackHas, stackNames, addStack, takeStack, takeAllStack, renameStack } from '../utils/itemStacks.js';\n"
if imp not in s:
    anchor = "import { rollArc, resolveArcLocation } from '../constants/encounters.js';\n"
    if anchor not in s: raise RuntimeError('useCharacter import anchor missing')
    s = s.replace(anchor, anchor + imp, 1)

s = sub_once(s,
    r"export const allItems = \(customItems\) => \(\{ \.\.\.ITEM_DB, \.\.\.customItems \}\);.*?export const ABILITY_KEYS =",
    """export const allItems = (items) => ({ ...(items || {}) });

// True if any copy of a named item still exists anywhere the character owns it.
// Definitions live once in character.items, so this is the only condition under
// which a definition may be discarded.
export const itemExistsAnywhere = (c, name, overrides = {}) => {
  const inv = overrides.inventory ?? c.inventory ?? [];
  const stash = overrides.stash ?? c.stash ?? [];
  const slots = overrides.slots ?? c.slots ?? {};
  if (stackHas(inv, name) || stackHas(stash, name)) return true;
  if (Object.values(slots).some(v => v?.toLowerCase() === String(name).toLowerCase())) return true;
  for (const comp of Object.values(c.companions || {})) {
    if (Object.values(comp?.slots || {}).some(v => v?.toLowerCase() === String(name).toLowerCase())) return true;
  }
  const items = overrides.items ?? c.items ?? {};
  for (const d of Object.values(items)) {
    if (d?.type === 'bag' && d.contents && (d.contents[name] || 0) > 0) return true;
    if (d?.type === 'bag' && d.contents) {
      const k = Object.keys(d.contents).find(k => k.toLowerCase() === String(name).toLowerCase());
      if (k && (d.contents[k] || 0) > 0) return true;
    }
  }
  return false;
};

export const ABILITY_KEYS =""", 'allItems/itemExistsAnywhere')

s = sub_once(s,
    r"export const equippableInSlot = \(char, slotId\) => \{.*?\n\};\n\n// -- Save migration",
    """export const equippableInSlot = (char, slotId) => {
  const slot = SLOTS.find(s => s.id === slotId);
  if (!slot) return [];
  const db = allItems(char.items);
  const validSlotIds = SLOTS.map(s => s.id);
  return stackNames(char.inventory).filter(name => {
    const data = db[name];
    if (!data) return slot.accepts.includes('magic');
    if (slotId === 'offhand' && data.type === 'shield') return true;
    if (!slot.accepts.includes(data.type)) return false;
    if (data.type === 'magic' && data.slot) {
      if (/^ring[12]?$/.test(data.slot)) return slotId === 'ring1' || slotId === 'ring2';
      if (validSlotIds.includes(data.slot)) return data.slot === slotId;
    }
    return true;
  });
};

// -- Save migration""", 'equippableInSlot')

# Migrate all legacy string/compressed lists + split definition stores into the
# v19 compact stacks + one authoritative item registry.
migration = r'''
  if (v < 19) {
    const legacyDefs = { ...(c.stashedCustomItems || {}), ...(c.customItems || {}), ...(c.items || {}) };
    const inventory = normalizeStacks(c.inventory);
    const stash = normalizeStacks(c.stash);
    const items = {};
    const cloneDef = (d) => d && typeof d === 'object' ? { ...d, ...(d.bonuses ? { bonuses:{...d.bonuses} } : {}) } : { type:'misc' };
    const ensure = (name) => {
      if (!name || items[name]) return;
      items[name] = cloneDef(legacyDefs[name] || ITEM_DB[name] || { type:'misc' });
    };
    Object.entries(legacyDefs).forEach(([name, data]) => { items[name] = cloneDef(data); });
    inventory.forEach(({name}) => ensure(name));
    stash.forEach(({name}) => ensure(name));
    Object.values(c.slots || {}).filter(Boolean).forEach(ensure);
    Object.values(c.companions || {}).forEach(comp => Object.values(comp?.slots || {}).filter(Boolean).forEach(ensure));
    Object.values(items).forEach(data => {
      if (data?.type === 'bag' && data.contents) Object.keys(data.contents).forEach(ensure);
    });
    c.inventory = inventory;
    c.stash = stash;
    c.items = items;
    delete c.customItems;
    delete c.stashedCustomItems;
    notes.push('Inventory upgraded to compact quantity stacks and unified item registry');
  }
  // Be tolerant of hand-edited/new saves: normalize the two location lists even
  // when the file already claims the current version.
  c.inventory = normalizeStacks(c.inventory);
  c.stash = normalizeStacks(c.stash);
  if (!c.items || typeof c.items !== 'object') c.items = {};
'''
anchor = "  c._v = SAVE_VERSION;\n"
if migration.strip() not in s:
    if anchor not in s: raise RuntimeError('migration end anchor missing')
    s = s.replace(anchor, migration + anchor, 1)

s = s.replace("  customItems:{},\n  stashedCustomItems:{},", "  items:{},", 1)
s = s.replace("char.customItems || {}", "char.items || {}")

# applyEffects working copy
s = s.replace(
    "let c = { ...currentChar, customItems:{ ...(currentChar.customItems||{}) }, slots:{ ...(currentChar.slots||EMPTY_SLOTS) } };",
    "let c = { ...currentChar, items:{ ...(currentChar.items||{}) }, inventory:normalizeStacks(currentChar.inventory), stash:normalizeStacks(currentChar.stash), slots:{ ...(currentChar.slots||EMPTY_SLOTS) } };",
    1)

items_block = r'''    // Items gained / definitions updated.
    // qty:0 is definition-only: it changes the authoritative item data without
    // adding another copy. Missing qty remains backwards-compatible and adds 1.
    [...text.matchAll(/\[ITEM:\s*([^\]]+)\]/gi)].forEach(m => {
      const raw = m[1];
      const qtyMatch = raw.match(/\|\s*qty:\s*(\d+)/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
      const cleanRaw = raw.replace(/\|\s*qty:\s*\d+/i, '').trim();
      const structured = cleanRaw.includes('|');
      const { name: rawName, data } = parseDMItem(cleanRaw);
      const bakedQty = rawName.match(/^(.*?)\s*[xX]\s*(\d+)$/);
      const parsedName = bakedQty && bakedQty[1].trim() ? bakedQty[1].trim() : rawName;
      const totalQty = bakedQty && bakedQty[1].trim()
        ? qty * Math.min(500000, Math.max(1, parseInt(bakedQty[2], 10) || 1))
        : qty;
      const existingKey = Object.keys(c.items || {}).find(k => k.toLowerCase() === parsedName.toLowerCase());
      const name = existingKey || parsedName;

      if (/\b(crate|chest|barrel|sack|bundle|assortment|collection|cache|trove|haul|pile|box)\s+of\b/i.test(name)
          || /\b(assorted|various|miscellaneous|sundry)\b/i.test(name)
          || /^(alchemical|crafting|trade|general)\s+supplies$/i.test(name.trim())) {
        log?.(`[ITEM] NOTE: "${name}" looks like a bundle rather than itemised loot — ask the DM to list its contents as separate items.`);
      }

      // A bare [ITEM: Existing Name] means another copy, not "erase its stats and
      // turn it into misc". Structured ITEM tags are authoritative and overwrite
      // the single definition shared by every copy of that name.
      if (structured || !existingKey) c.items[name] = data;

      const MAX_GRANT = 500000;
      const grant = Math.min(totalQty, MAX_GRANT);
      if (grant < totalQty) {
        log?.(`[ITEM] WARNING: "${name}" asked for ${totalQty.toLocaleString()} — capped at ${MAX_GRANT.toLocaleString()}. ${(totalQty-grant).toLocaleString()} were NOT added.`);
      }
      if (grant > 0) c.inventory = addStack(c.inventory, name, grant);
    });

    // Items removed -- case-insensitive, supports qty tag.
'''
s = sub_once(s, r"    // Items gained\n.*?    // Items removed -- case-insensitive, supports qty tag: \[REMOVE: Blast Powder \| qty:2\]\n", items_block, 'ITEM block')

remove_block = r'''    [...text.matchAll(/\[REMOVE:\s*([^\]]+)\]/gi)].forEach(m => {
      const raw = m[1];
      const qtyMatch = raw.match(/\|\s*qty:\s*(\d+)/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
      const removeName = raw.replace(/\|\s*qty:\s*\d+/i, '').trim();
      if (qty > 0) c.inventory = takeStack(c.inventory, removeName, qty).stacks;
      const key = removeName.toLowerCase();
      const slotEntry = Object.entries(c.slots).find(([,v]) => v?.toLowerCase() === key);
      if (slotEntry) c.slots = { ...c.slots, [slotEntry[0]]: null };
      const itemKey = Object.keys(c.items || {}).find(k => k.toLowerCase() === key);
      if (itemKey && !itemExistsAnywhere(c, itemKey)) {
        const items = { ...c.items }; delete items[itemKey]; c.items = items;
      }
    });

    // Location tracking'''
s = sub_once(s, r"    \[\.\.\.text\.matchAll\(/\\\[REMOVE:.*?\n    // Location tracking", remove_block, 'REMOVE block')

update_block = r'''    // Legacy [UPDATE: old | new] support. New prompts no longer teach this;
    // [ITEM: name | ... | qty:0] is the definition-update path.
    [...text.matchAll(/\[UPDATE:\s*([^|\]]+)\|([^\]]+)\]/gi)].forEach(m => {
      const oldName = m[1].trim();
      const newName = m[2].trim();
      const oldKey = Object.keys(c.items || {}).find(k => k.toLowerCase() === oldName.toLowerCase());
      if (oldKey) {
        const items = { ...c.items, [newName]: c.items[oldKey] };
        if (oldKey !== newName) delete items[oldKey];
        // Bag contents are references by name too.
        Object.entries(items).forEach(([bag, d]) => {
          if (d?.type === 'bag' && d.contents) {
            const ck = Object.keys(d.contents).find(k => k.toLowerCase() === oldName.toLowerCase());
            if (ck) {
              const contents = { ...d.contents, [newName]:(d.contents[newName] || 0) + d.contents[ck] };
              if (ck !== newName) delete contents[ck];
              items[bag] = { ...d, contents };
            }
          }
        });
        c.items = items;
      }
      c.inventory = renameStack(c.inventory, oldName, newName);
      c.stash = renameStack(c.stash, oldName, newName);
      Object.keys(c.slots).forEach(slot => { if (c.slots[slot]?.toLowerCase() === oldName.toLowerCase()) c.slots = { ...c.slots, [slot]:newName }; });
      if (c.companions) {
        const companions = { ...c.companions };
        Object.entries(companions).forEach(([cn, comp]) => {
          const slots = { ...(comp?.slots || {}) }; let touched = false;
          Object.keys(slots).forEach(slot => { if (slots[slot]?.toLowerCase() === oldName.toLowerCase()) { slots[slot] = newName; touched = true; } });
          if (touched) companions[cn] = { ...comp, slots };
        });
        c.companions = companions;
      }
    });

    // DM unequip'''
s = sub_once(s, r"    // Item update -- renames an item AND carries its custom stats/data to the new name\n.*?    // DM unequip", update_block, 'UPDATE block')

# Small equip/unequip substitutions inside applyEffects.
s = s.replace("if (!c.inventory.some(n => n.toLowerCase() === name)) {\n          c.inventory = [...c.inventory, itemName];\n        }", "c.inventory = addStack(c.inventory, itemName, 1);", 1)
s = s.replace("const db       = allItems(c.customItems);", "const db       = allItems(c.items);", 1)
s = s.replace("const idx  = c.inventory.indexOf(name);\n        if (idx !== -1) c.inventory = [...c.inventory.slice(0,idx), ...c.inventory.slice(idx+1)];\n        if (prev) c.inventory = [...c.inventory, prev];", "c.inventory = takeStack(c.inventory, name, 1).stacks;\n        if (prev) c.inventory = addStack(c.inventory, prev, 1);", 1)
s = s.replace("const idx  = c.inventory.indexOf(name);\n      if (idx !== -1) c.inventory = [...c.inventory.slice(0,idx), ...c.inventory.slice(idx+1)];\n      if (prev) c.inventory = [...c.inventory, prev];", "c.inventory = takeStack(c.inventory, name, 1).stacks;\n      if (prev) c.inventory = addStack(c.inventory, prev, 1);", 1)

# Starting gear becomes runtime stacks + authoritative definitions copied once.
old = """      const gear  = STARTING_GEAR[cls.name] || { slots:{ ...EMPTY_SLOTS }, inventory:[] };
      return { ...c, cls, stats, maxHp, hp:maxHp, slots:{ ...gear.slots }, inventory:[...gear.inventory], customItems:{}, classLevels:{ [cls.name]: 1 } };"""
new = """      const gear  = STARTING_GEAR[cls.name] || { slots:{ ...EMPTY_SLOTS }, inventory:[] };
      const inventory = normalizeStacks(gear.inventory);
      const ownedNames = [...new Set([...Object.values(gear.slots).filter(Boolean), ...stackNames(inventory)])];
      const items = Object.fromEntries(ownedNames.map(name => [name, { ...(ITEM_DB[name] || { type:'misc' }) }]));
      return { ...c, cls, stats, maxHp, hp:maxHp, slots:{ ...gear.slots }, inventory, items, classLevels:{ [cls.name]: 1 } };"""
if old not in s: raise RuntimeError('selectClass anchor missing')
s = s.replace(old, new, 1)

# Stash operations: quantities move, definitions never move.
s = sub_once(s, r"  const moveToStash = \(itemName, all = false\) => \{.*?\n  // Create a named bag from selected inventory items",
r'''  const moveToStash = (itemName, all = false) => {
    setCharacter(c => {
      const qty = all ? stackCount(c.inventory, itemName) : 1;
      const taken = takeStack(c.inventory, itemName, qty);
      if (!taken.removed) return c;
      const nc = { ...c, inventory:taken.stacks, stash:addStack(c.stash, itemName, taken.removed) };
      charRef.current = nc;
      return nc;
    });
  };

  const moveToInventory = (itemName, all = false) => {
    setCharacter(c => {
      const qty = all ? stackCount(c.stash, itemName) : 1;
      const taken = takeStack(c.stash, itemName, qty);
      if (!taken.removed) return c;
      const nc = { ...c, stash:taken.stacks, inventory:addStack(c.inventory, itemName, taken.removed) };
      charRef.current = nc;
      return nc;
    });
  };

  // Create a named bag from selected inventory items''', 'stash functions')

s = sub_once(s, r"  const createBag = \(bagName, selectedItems\) => \{.*?\n  // Permanently delete an item from inventory \(one or all copies\)\. Bags are deleted whole\.",
r'''  const createBag = (bagName, selectedItems) => {
    setCharacter(c => {
      const counts = {};
      selectedItems.forEach(name => { counts[name] = (counts[name] || 0) + 1; });
      let inventory = normalizeStacks(c.inventory);
      Object.entries(counts).forEach(([name, qty]) => { inventory = takeStack(inventory, name, qty).stacks; });
      const label = Object.entries(counts).map(([name, count]) => count > 1 ? `${name} x${count}` : name).join(', ');
      inventory = addStack(inventory, bagName, 1);
      const items = { ...(c.items || {}), [bagName]: { type:'bag', slot:null, bonuses:{}, label, contents:counts } };
      const nc = { ...c, inventory, items };
      charRef.current = nc;
      return nc;
    });
  };

  const removeFromBag = (bagName, itemName, all = false) => {
    setCharacter(c => {
      const existing = c.items?.[bagName];
      if (!existing?.contents?.[itemName]) return c;
      const counts = { ...existing.contents };
      const moveCount = all ? counts[itemName] : 1;
      counts[itemName] -= moveCount;
      if (counts[itemName] <= 0) delete counts[itemName];
      const label = Object.entries(counts).map(([name, count]) => count > 1 ? `${name} x${count}` : name).join(', ');
      const items = { ...c.items, [bagName]: { ...existing, label, contents:counts } };
      const nc = { ...c, inventory:addStack(c.inventory, itemName, moveCount), items };
      charRef.current = nc;
      return nc;
    });
  };

  // Permanently delete an item from inventory (one or all copies). Bags are deleted whole.''', 'bag create/remove')

# Rename function.
s = sub_once(s, r"  const renameItem = \(from, to\) => \{.*?\n  const deleteItem =",
r'''  const renameItem = (from, to) => {
    const target = (to || '').trim();
    if (!target || target === from) return;
    setCharacter(c => {
      const nc = { ...c, inventory:renameStack(c.inventory, from, target), stash:renameStack(c.stash, from, target) };
      const slots = { ...(c.slots || {}) };
      Object.keys(slots).forEach(k => { if (slots[k] === from) slots[k] = target; });
      nc.slots = slots;
      const items = { ...(c.items || {}) };
      if (items[from]) {
        if (!items[target]) items[target] = items[from];
        delete items[from];
      }
      Object.entries(items).forEach(([bagName, d]) => {
        if (d?.type === 'bag' && d.contents && d.contents[from] !== undefined) {
          const contents = { ...d.contents };
          contents[target] = (contents[target] || 0) + contents[from];
          delete contents[from];
          items[bagName] = { ...d, contents };
        }
      });
      nc.items = items;
      if (c.companions) {
        const comps = { ...c.companions };
        Object.entries(comps).forEach(([n, d]) => {
          if (!d?.slots) return;
          const cs = { ...d.slots }; let touched = false;
          Object.keys(cs).forEach(k => { if (cs[k] === from) { cs[k] = target; touched = true; } });
          if (touched) comps[n] = { ...d, slots:cs };
        });
        nc.companions = comps;
      }
      charRef.current = nc;
      return nc;
    });
  };

  const deleteItem =''', 'renameItem')

s = sub_once(s, r"  const deleteItem = \(itemName, all = false\) => \{.*?\n  // Permanently delete an item from inside a bag",
r'''  const deleteItem = (itemName, all = false) => {
    setCharacter(c => {
      const qty = all ? stackCount(c.inventory, itemName) : 1;
      const inventory = takeStack(c.inventory, itemName, qty).stacks;
      let items = c.items;
      if (items?.[itemName] && !itemExistsAnywhere(c, itemName, { inventory })) {
        items = { ...items }; delete items[itemName];
      }
      const nc = { ...c, inventory, items };
      charRef.current = nc;
      return nc;
    });
  };

  // Permanently delete an item from inside a bag''', 'deleteItem')

s = sub_once(s, r"  const deleteFromBag = \(bagName, itemName, all = false\) => \{.*?\n  const finalizeCharacter =",
r'''  const deleteFromBag = (bagName, itemName, all = false) => {
    setCharacter(c => {
      const existing = c.items?.[bagName];
      if (!existing?.contents?.[itemName]) return c;
      const counts = { ...existing.contents };
      if (all) delete counts[itemName];
      else { counts[itemName] -= 1; if (counts[itemName] <= 0) delete counts[itemName]; }
      const label = Object.entries(counts).map(([name, count]) => count > 1 ? `${name} x${count}` : name).join(', ');
      let items = { ...c.items, [bagName]: { ...existing, label, contents:counts } };
      if (items[itemName] && !itemExistsAnywhere({ ...c, items }, itemName)) { delete items[itemName]; }
      const nc = { ...c, items };
      charRef.current = nc;
      return nc;
    });
  };

  const addToBag = (bagName, selectedItems) => {
    setCharacter(c => {
      const existing = c.items?.[bagName];
      if (!existing) return c;
      const counts = { ...(existing.contents || {}) };
      selectedItems.forEach(name => { counts[name] = (counts[name] || 0) + 1; });
      let inventory = normalizeStacks(c.inventory);
      const selectedCounts = {};
      selectedItems.forEach(name => { selectedCounts[name] = (selectedCounts[name] || 0) + 1; });
      Object.entries(selectedCounts).forEach(([name, qty]) => { inventory = takeStack(inventory, name, qty).stacks; });
      const label = Object.entries(counts).map(([name, count]) => count > 1 ? `${name} x${count}` : name).join(', ');
      const items = { ...c.items, [bagName]: { ...existing, label, contents:counts } };
      const nc = { ...c, inventory, items };
      charRef.current = nc;
      return nc;
    });
  };

  const finalizeCharacter =''', 'bag delete/add')

# Player equipment helpers.
s = sub_once(s, r"  const equipToSlot = \(slotId, itemName\) => \{.*?\n  const loadCharacter =",
r'''  const equipToSlot = (slotId, itemName) => {
    setCharacter(c => {
      const prev = c.slots[slotId];
      let inventory = takeStack(c.inventory, itemName, 1).stacks;
      if (prev) inventory = addStack(inventory, prev, 1);
      const nc = reconcileHp(c, { ...c, slots:{ ...c.slots, [slotId]:itemName }, inventory });
      charRef.current = nc;
      return nc;
    });
  };

  const unequipSlot = (slotId) => {
    setCharacter(c => {
      const item = c.slots[slotId];
      if (!item) return c;
      const nc = reconcileHp(c, { ...c, slots:{ ...c.slots, [slotId]:null }, inventory:addStack(c.inventory, item, 1) });
      charRef.current = nc;
      return nc;
    });
  };

  const equipCompanionItem = (companionName, slotId, itemName) => {
    setCharacter(c => {
      const comp = c.companions?.[companionName];
      if (!comp) return c;
      const compSlots = comp.slots || {};
      const prev = compSlots[slotId];
      let inventory = takeStack(c.inventory, itemName, 1).stacks;
      if (prev) inventory = addStack(inventory, prev, 1);
      const nc = { ...c, inventory, companions:{ ...c.companions, [companionName]:{ ...comp, slots:{ ...compSlots, [slotId]:itemName } } } };
      charRef.current = nc;
      return nc;
    });
  };

  const unequipCompanionItem = (companionName, slotId) => {
    setCharacter(c => {
      const comp = c.companions?.[companionName];
      const item = comp?.slots?.[slotId];
      if (!item) return c;
      const nc = { ...c, inventory:addStack(c.inventory, item, 1), companions:{ ...c.companions, [companionName]:{ ...comp, slots:{ ...comp.slots, [slotId]:null } } } };
      charRef.current = nc;
      return nc;
    });
  };

  const loadCharacter =''', 'equip helpers')

p.write_text(s)

# ── save: stacks are already compact; stop converting to {name:count} ──────────
p = ROOT / 'src/hooks/useSave.js'
s = p.read_text()
s = sub_once(s,
    r"  // ── Inventory/stash storage compression.*?  const buildState = \(type\) => \(\{",
    """  // Inventory and stash are already compact [{name, qty}] stacks in memory.
  // Save the character exactly as it exists; migration handles older compressed
  // {name:count} and string-array formats on load.
  const compressCharForSave = (char) => ({ ...char });

  const buildState = (type) => ({""", 'save compression')
p.write_text(s)

# ── parseDMItem: ITEM_DB is creation-only, not runtime authority ───────────────
p = ROOT / 'src/constants/items.js'
s = p.read_text()
s = s.replace("if (parts.length === 1) return { name, data: ITEM_DB[name] || { type:'misc' } };",
              "if (parts.length === 1) return { name, data: { type:'misc' } };", 1)
p.write_text(s)

print('core stacked item model refactor applied')
