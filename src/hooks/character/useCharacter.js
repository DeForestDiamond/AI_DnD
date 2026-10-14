import { isContinuousStory } from '../../helpers/storyOptions.js';
import { applyWorldPressures } from '../../helpers/worldPressures.js';
import { useState, useRef, useEffect } from 'react';
import { ITEM_DB, SLOTS, EMPTY_SLOTS, parseDMItem } from '../../constants/items.js';
import { STARTING_GEAR } from '../../constants/classes.js';
import { parseCoinAmount } from '../../constants/currency.js';
import { rollArc } from '../../constants/encounters.js';
import { normalizeStacks, stackCount, stackHas, stackNames, addStack, takeStack, takeAllStack, renameStack } from '../../utils/itemStacks.js';
import { calcMaxHp, applyRaceBonus, statMod, levelUpsAvailable } from './stats.js';
import { allItems, effectiveMaxHp, reconcileHp, pruneDeadItemDefinitions, itemExistsAnywhere, equippableInSlot } from './items.js';
import { migrateCharacter } from './migration.js';
import { EMPTY_CHAR, emptyCompanionSlots } from './defaults.js';
import { HP_PER_LEVEL, SAVE_VERSION } from '../../constants/progression.js';

// -- The hook -------------------------------------------------------------------
export function useCharacter(log) {
  // `log` is optional; every call site uses log?.() so the hook still works
  // without one. It must be a PARAMETER though — optional chaining guards a null
  // value, not an undefined identifier, so a bare log?.() would throw.
  const [character, setCharacter]         = useState(EMPTY_CHAR);
  const charRef = useRef(character);
  useEffect(() => { charRef.current = character; }, [character]);

  const updateChar = (newChar) => {
    setCharacter(newChar);
    charRef.current = newChar;
  };

  // className = which class to advance, stat = which stat to boost
  const spendStatPoint = (className, stat) => {
    setCharacter(c => {
      if (levelUpsAvailable(c) <= 0) return c;
      const classLevels  = { ...(c.classLevels || {}) };
      classLevels[className] = (classLevels[className] || 0) + 1;
      const newStats  = { ...c.stats, [stat]: c.stats[stat] + 1 };
      const hpPerLevel = HP_PER_LEVEL[className] || 5;
      const conMod     = statMod(newStats.con);
      const hpGain     = Math.max(1, hpPerLevel + conMod);
      const newMaxHp   = c.maxHp + hpGain;
      const withMax = { ...c, level:(c.level || 1) + 1, stats:newStats, maxHp:newMaxHp, classLevels };
      const nc = { ...withMax, hp: Math.min(c.hp + hpGain, effectiveMaxHp(withMax)) };
      charRef.current = nc;
      return nc;
    });
  };

  // Apply all DM game effect tags to character
  const applyEffects = (text, currentChar, skipLevelUp = false, itemDestination = 'inventory') => {
    let c = { ...currentChar, items:{ ...(currentChar.items||{}) }, inventory:normalizeStacks(currentChar.inventory), stash:normalizeStacks(currentChar.stash), slots:{ ...(currentChar.slots||EMPTY_SLOTS) } };

    c.worldPressures = applyWorldPressures(text, c.worldPressures);

    // Coins — [GOLD:] and [COIN:]/[COINS:] both accepted; bare numbers are gp,
    // denominations pp/gp/sp/cp all work ([GOLD: -5sp], [COIN: +2pp], [GOLD: +3gp 5sp]).
    // Stored as one copper integer, so change-making is automatic.
    [...text.matchAll(/\[(?:GOLD|COINS?):\s*([^\]]+)\]/gi)].forEach(m => {
      const delta = parseCoinAmount(m[1]);
      // A gain exactly equal to what the player already holds is almost always
      // the DM tagging a RESTATEMENT of their wealth rather than a real gain,
      // which silently doubles it. Apply it, but make it visible.
      if (delta > 0 && delta === (c.coins || 0) && delta > 100) {
        log?.(`[COINS] WARNING: [GOLD: ${m[1].trim()}] exactly matches current holdings — this looks like the DM restating wealth rather than granting it, and has DOUBLED it. Check and correct if unintended.`);
      }
      c.coins = Math.max(0, (c.coins || 0) + delta);
    });

    // HP -- [DAMAGE:] = player takes damage, [HEAL:] = player heals
    // Also supports [HP: +10] for healing and [HP: -5] for damage
    [...text.matchAll(/\[DAMAGE:\s*(\d+)\]/gi)].forEach(m => {
      c.hp = Math.max(0, c.hp - parseInt(m[1]));
    });
    [...text.matchAll(/\[HEAL:\s*(\d+)\]/gi)].forEach(m => {
      c.hp = Math.min(effectiveMaxHp(c), c.hp + parseInt(m[1]));
    });
    // [HP: +10] or [HP: -5] — sign determines heal vs damage
    [...text.matchAll(/\[HP:\s*([+-]?\d+)\]/gi)].forEach(m => {
      const val = parseInt(m[1]);
      if (val > 0) c.hp = Math.min(effectiveMaxHp(c), c.hp + val);
      else if (val < 0) c.hp = Math.max(0, c.hp + val); // val is already negative
    });

    // XP -- accept [XP: +50] or [XP: 50]
    [...text.matchAll(/\[XP:\s*\+?(\d+)\]/gi)].forEach(m => { c.xp = (c.xp||0) + parseInt(m[1]); });

    // Items gained / definitions updated.
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
      if (grant > 0) {
        const destination = itemDestination === 'stash' ? 'stash' : 'inventory';
        c[destination] = addStack(c[destination], name, grant);
      }
    });

    // Items removed -- case-insensitive, supports qty tag.
    [...text.matchAll(/\[REMOVE:\s*([^\]]+)\]/gi)].forEach(m => {
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

    // Location tracking -- updates currentLocation for tiered context system
    const locMatch = text.match(/\[LOCATION:\s*([^\]]+)\]/i);
    if (locMatch) {
      c.currentLocation = locMatch[1].trim();
      // Player-written openings establish their anchor on the first response.
      // Once anchored, later travel must not move the antagonist's operation.
      if (c.arc?.antagonist && !c.arc.arcLocation && !c.arc.localArea) {
        c.arc = { ...c.arc, localArea: c.currentLocation };
      }
    }

    // Arc resolved — roll a fresh antagonist (never the one just defeated);
    // the DM sees it next turn and starts seeding
    // Objectives are rolling: one live at a time, the rest a completed record.
    // [OBJECTIVE DONE: 3] closes one; [OBJECTIVE: text] opens the next. Two tags
    // rather than one so a garbled new objective can't also lose the completion.
    [...text.matchAll(/\[OBJECTIVE\s+DONE:\s*(\d+)\]/gi)].forEach(m => {
      const idx = parseInt(m[1], 10) - 1;
      const objs = c.arc?.objectives;
      if (Array.isArray(objs) && objs[idx] && !objs[idx].done) {
        c.arc = { ...c.arc, objectives: objs.map((o, i) => i === idx ? { ...o, done: true } : o) };
      }
    });
    [...text.matchAll(/\[OBJECTIVE:\s*([^\]]+)\]/gi)].forEach(m => {
      const t = m[1].trim();
      if (!t || /^done\b/i.test(t)) return;
      const objs = Array.isArray(c.arc?.objectives) ? c.arc.objectives : [];
      // Ignore a duplicate of anything already tracked.
      if (objs.some(o => o.text.toLowerCase() === t.toLowerCase())) return;
      c.arc = { ...(c.arc || {}), objectives: [...objs, { text: t, done: false }] };
    });

    if (/\[ARC COMPLETE\]/i.test(text) && !isContinuousStory(c) && c.arc?.antagonist && c.arc.status !== 'reserved') {
      // Resolve the central conflict, but keep the next foe reserved during aftermath.
      const finished = c.arc?.antagonist;
      const defeated = [...(c.defeatedAntagonists || [])];
      if (finished && !defeated.some(d => d.toLowerCase() === finished.toLowerCase())) {
        defeated.push(finished);
      }
      c.defeatedAntagonists = defeated;
      c.arc = { ...rollArc(c.level, finished, defeated, c.currentLocation), status: 'reserved', previousAntagonist: finished };
    } else if (!/\[ARC COMPLETE\]/i.test(text) && /\[ARC START\]/i.test(text) && !isContinuousStory(c) && c.arc?.status === 'reserved') {
      // The DM emits this only after the player chooses a discovered new opportunity.
      c.arc = { ...c.arc, status: 'active' };
    }

    // Legacy [UPDATE: old | new] support. New prompts no longer teach this;
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

    // DM unequip -- moves an equipped item back to inventory WITHOUT deleting it
    [...text.matchAll(/\[UNEQUIP:\s*([^\]]+)\]/gi)].forEach(m => {
      const name = m[1].trim().toLowerCase();
      const slotEntry = Object.entries(c.slots).find(([,v]) => v?.toLowerCase() === name);
      if (slotEntry) {
        const [slotId, itemName] = slotEntry;
        c.slots = { ...c.slots, [slotId]: null };
        c.inventory = addStack(c.inventory, itemName, 1);
      }
    });

    // DM equip -- only first occurrence removed from inventory
    [...text.matchAll(/\[EQUIP:\s*([^|\]]+)\|?\s*([^\]]*)\]/gi)].forEach(m => {
      const name     = m[1].trim();
      const target   = m[2].trim();
      const db       = allItems(c.items);
      const data     = db[name];

      const slotFromType = () => {
        if (data?.type === 'weapon') return 'mainhand';
        if (data?.type === 'armor')  return 'armor';
        if (data?.type === 'shield') return 'offhand';
        if (data?.type === 'magic' && data?.slot) return data.slot;
        // Item not in the DB (DM equipped something it never granted, or a name
        // mismatch) — guess from the NAME so a weapon doesn't fall to 'neck'.
        // Order matters: check specific worn slots before the broad 'armor'.
        const n = name.toLowerCase();
        if (/shield|buckler/.test(n)) return 'offhand';
        if (/helm|helmet|hood|circlet|crown|coif/.test(n)) return 'head';
        if (/boots|greaves|sabaton|shoes|footwear/.test(n)) return 'feet';
        if (/gloves|gauntlet/.test(n)) return 'hands';
        if (/bracer|vambrace|arm-?guard|armband/.test(n)) return 'arms';
        if (/belt|girdle|sash|waistband/.test(n)) return 'waist';
        if (/goggles|lenses|spectacles|mask|monocle|eyepatch|visor|\beyes?\b/.test(n)) return 'face';
        if (/pauldron|mantle|epaulet|shoulder/.test(n)) return 'shoulders';
        if (/shirt|vest|tunic|jerkin|undershirt/.test(n)) return 'torso';
        if (/cloak|cape/.test(n)) return 'cloak';
        if (/\bring\b/.test(n)) return 'ring1';
        if (/amulet|necklace|pendant|torc|collar/.test(n)) return 'neck';
        if (/knife|dagger|sword|blade|axe|mace|hammer|spear|staff|wand|bow|crossbow|club|flail|scimitar|rapier|glaive|halberd|whip|sickle|pistol|gun|cannon|katana|sabre|saber|dirk|kukri|falchion/.test(n)) return 'mainhand';
        if (/armor|armour|mail|plate|breastplate|cuirass|robe|leather|hide|brigandine|chain/.test(n)) return 'armor';
        return 'neck';
      };

      // The second field may be a SLOT (mainhand, ring1, ...) or a COMPANION
      // NAME. If it matches a companion, equip onto that companion instead of
      // misreading the name as a slot (which used to evict the player's item).
      const compKey = target && Object.keys(c.companions || {}).find(n => n.toLowerCase() === target.toLowerCase());
      const targetIsSlot = target && SLOTS.find(s => s.id === target.toLowerCase());

      if (compKey) {
        const comp      = c.companions[compKey];
        const compSlots = comp.slots || {};
        const slotId    = slotFromType();
        const prev = compSlots[slotId];
        c.inventory = takeStack(c.inventory, name, 1).stacks;
        if (prev) c.inventory = addStack(c.inventory, prev, 1);
        c.companions = { ...c.companions, [compKey]: { ...comp, slots: { ...compSlots, [slotId]: name } } };
        return;
      }

      let slotId = targetIsSlot ? target.toLowerCase() : slotFromType();
      if (!SLOTS.find(s => s.id === slotId)) slotId = slotFromType();
      const prev = c.slots[slotId];
      c.inventory = takeStack(c.inventory, name, 1).stacks;
      if (prev) c.inventory = addStack(c.inventory, prev, 1);
      c.slots = { ...c.slots, [slotId]: name };
    });

    // XP no longer auto-spends a level here. Available level-ups are derived
    // from XP and can be banked until the player chooses to spend them.
    // Equipment tags may have changed CON-granting gear; keep the HP ratio.
    return reconcileHp(currentChar, c);
  };

  const selectRace = (race) => {
    setCharacter(c => {
      if (!c.cls) return { ...c, race };
      const stats  = applyRaceBonus({ ...c.cls.stats }, race);
      const maxHp  = calcMaxHp(c.cls.name, stats.con, 1);
      return { ...c, race, stats, maxHp, hp:maxHp };
    });
  };

  const selectClass = (cls) => {
    setCharacter(c => {
      const stats = applyRaceBonus({ ...cls.stats }, c.race);
      const maxHp = calcMaxHp(cls.name, stats.con, 1);
      const gear  = STARTING_GEAR[cls.name] || { slots:{ ...EMPTY_SLOTS }, inventory:[] };
      const inventory = normalizeStacks(gear.inventory);
      const ownedNames = [...new Set([...Object.values(gear.slots).filter(Boolean), ...stackNames(inventory)])];
      const items = Object.fromEntries(ownedNames.map(name => [name, { ...(ITEM_DB[name] || { type:'misc' }) }]));
      return { ...c, cls, stats, maxHp, hp:maxHp, slots:{ ...gear.slots }, inventory, items, classLevels:{ [cls.name]: 1 } };
    });
  };

  const selectDeity = (deity) => {
    setCharacter(c => ({ ...c, deity }));
  };

  const toggleContextExclusion = (section, name) => {
    setCharacter(c => {
      const excl = { ...(c.contextExclusions || { companions:{}, npcs:{}, towns:{} }) };
      excl[section] = { ...excl[section] };
      excl[section][name] = !excl[section][name];
      const nc = { ...c, contextExclusions: excl };
      charRef.current = nc;
      return nc;
    });
  };

  const moveToStash = (itemName, all = false) => {
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

  // Move wealth between carried coin and the private bank. Amounts are copper
  // integers, matching the rest of the currency system. Banked coin is never
  // included in the DM prompt.
  const bankCoins = (amountCp) => {
    setCharacter(c => {
      const requested = Math.max(0, Math.floor(Number(amountCp) || 0));
      const moved = Math.min(c.coins || 0, requested);
      if (!moved) return c;
      const nc = { ...c, coins:(c.coins || 0) - moved, bankedCoins:(c.bankedCoins || 0) + moved };
      charRef.current = nc;
      return nc;
    });
  };

  const withdrawCoins = (amountCp) => {
    setCharacter(c => {
      const requested = Math.max(0, Math.floor(Number(amountCp) || 0));
      const moved = Math.min(c.bankedCoins || 0, requested);
      if (!moved) return c;
      const nc = { ...c, coins:(c.coins || 0) + moved, bankedCoins:(c.bankedCoins || 0) - moved };
      charRef.current = nc;
      return nc;
    });
  };

  // Create a named bag from selected inventory items
  // selectedItems: array of item names (may include duplicates for multiple copies)
  const createBag = (bagName, selectedItems) => {
    setCharacter(c => {
      const selectedStacks = normalizeStacks(selectedItems);
      const counts = Object.fromEntries(selectedStacks.map(({name, qty}) => [name, qty]));
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

  // Permanently delete an item from inventory (one or all copies). Bags are deleted whole.
  // Rename an item everywhere it can exist, MERGING into the target if that name
  // is already in use. This is the fix for near-duplicate names — 'Steel Scrap'
  // and 'Scrap Steel' as separate piles — which otherwise never stack.
  const renameItem = (from, to) => {
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

  const deleteItem = (itemName, all = false) => {
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

  // Permanently delete an item from inside a bag (one or all copies)
  const deleteFromBag = (bagName, itemName, all = false) => {
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
      const selectedStacks = normalizeStacks(selectedItems);
      selectedStacks.forEach(({name, qty}) => { counts[name] = (counts[name] || 0) + qty; });
      let inventory = normalizeStacks(c.inventory);
      selectedStacks.forEach(({name, qty}) => { inventory = takeStack(inventory, name, qty).stacks; });
      const label = Object.entries(counts).map(([name, count]) => count > 1 ? `${name} x${count}` : name).join(', ');
      const items = { ...c.items, [bagName]: { ...existing, label, contents:counts } };
      const nc = { ...c, inventory, items };
      charRef.current = nc;
      return nc;
    });
  };

  const finalizeCharacter = (name, bio = '', appearance = '', disposition = null) => {
    const char = { ...charRef.current, name: name.trim() || 'Adventurer', bio: bio.trim(), appearance: appearance.trim(),
      ...(disposition ? { disposition } : {}), xp:0, _v:SAVE_VERSION };
    updateChar(char);
    return char;
  };

  const equipToSlot = (slotId, itemName) => {
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

  const loadCharacter = (char) => {
    const { char:migrated } = migrateCharacter(char);
    updateChar(migrated);
    return migrated;
  };

  return {
    character, charRef, updateChar, loadCharacter,
    selectRace, selectClass, selectDeity, finalizeCharacter,
    applyEffects, spendStatPoint,
    equipToSlot, unequipSlot, equippableInSlot, equipCompanionItem, unequipCompanionItem,
    moveToStash, moveToInventory, bankCoins, withdrawCoins,
    createBag, addToBag, removeFromBag, deleteItem, deleteFromBag, renameItem,
    toggleContextExclusion,
  };
}



