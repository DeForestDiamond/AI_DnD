import { SLOTS } from '../../constants/items.js';
import { stackHas, stackNames } from '../../utils/itemStacks.js';
import { statMod } from './stats.js';

// -- Item / slot helpers --------------------------------------------------------
export const allItems = (items) => ({ ...(items || {}) });

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

// Remove item definitions that are no longer referenced anywhere the character
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

export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const effectiveStats = (baseStats, slots, customItems) => {
  const db = allItems(customItems);
  const s  = { ...baseStats };
  Object.values(slots).forEach(name => {
    if (!name) return;
    const d = db[name];
    // Any equipped item may grant stat bonuses — a hammer that grants STR, a
    // breastplate that grants CON. Only the six ABILITY scores belong here:
    // skill bonuses (intimidation, stealth ...) used to land in this object too
    // and rendered as unnamed ability rows with nonsense modifiers. AC is
    // handled separately in calcAC; skills via skillBonuses below.
    if (d?.bonuses) {
      Object.entries(d.bonuses).forEach(([k, v]) => {
        if (ABILITY_KEYS.includes(k)) s[k] = (s[k] || 0) + v;
      });
    }
  });
  return s;
};

// CON granted by equipped gear raises max HP the way 5e does: +1 hit point per
// level per point of CON modifier. maxHp stays a stored value (level-up, damage
// and healing all keep working on it); this is the gear contribution on top.
export const gearHpBonus = (char) => {
  if (!char?.stats) return 0;
  const eff = effectiveStats(char.stats, char.slots || {}, char.items || {});
  const modGain = statMod(eff.con) - statMod(char.stats.con);
  if (modGain === 0) return 0;
  const level = Math.max(1, char.level || 1);
  return modGain * level;
};

export const effectiveMaxHp = (char) => Math.max(1, (char?.maxHp || 0) + gearHpBonus(char));

// After anything that changes equipment, keep the player's HP RATIO intact
// rather than clamping or gifting. Swapping gear shouldn't cost hit points, and
// putting armour on shouldn't leave you looking half dead.
export const reconcileHp = (prev, next) => {
  const before = effectiveMaxHp(prev);
  const after  = effectiveMaxHp(next);
  if (before === after || before <= 0) return next;
  const ratio = Math.min(1, (prev.hp || 0) / before);
  return { ...next, hp: Math.max(1, Math.min(after, Math.round(ratio * after))) };
};


// Accumulated SKILL bonuses from equipped gear, e.g. { intimidation: 4 }.
// Keyed by whatever skill names the items use; the roll system matches on the
// same names when a [ROLL:] names a skill.
export const skillBonuses = (slots, customItems) => {
  const db = allItems(customItems);
  const out = {};
  Object.values(slots || {}).forEach(name => {
    if (!name) return;
    const b = db[name]?.bonuses;
    if (!b) return;
    Object.entries(b).forEach(([k, v]) => {
      if (k !== 'ac' && !ABILITY_KEYS.includes(k) && typeof v === 'number') {
        out[k] = (out[k] || 0) + v;
      }
    });
  });
  return out;
};

export const calcAC = (slots, baseStats, customItems) => {
  const db      = allItems(customItems);
  const stats   = effectiveStats(baseStats, slots, customItems);
  const dexMod  = statMod(stats.dex);
  const armorData = slots.armor ? db[slots.armor] : null;
  let ac = 10 + dexMod;
  if (armorData?.type === 'armor') {
    ac = armorData.ac;
    if (armorData.dexBonus) ac += armorData.maxDex != null ? Math.min(dexMod, armorData.maxDex) : dexMod;
  }
  const offData = slots.offhand ? db[slots.offhand] : null;
  if (offData?.type === 'shield') ac += offData.ac ?? 2;
  Object.values(slots).forEach(name => {
    if (!name) return;
    const d = db[name];
    // AC bonuses from any equipped item, including the worn armour itself: its
    // base AC comes from the `ac` field, so an ac:N in its bonuses is a genuine
    // addition (masterwork, reinforcement) rather than a duplicate of the base.
    if (d?.bonuses?.ac) ac += d.bonuses.ac;
  });
  return ac;
};

export const getMainWeapon = (slots, stats, customItems) => {
  const db        = allItems(customItems);
  const effStats  = effectiveStats(stats, slots, customItems);
  const name      = slots.mainhand;
  if (!name) return null;
  const w = db[name];
  if (!w || w.type !== 'weapon') return null;
  // Choose the attack ability once, here, for every attack path.
  // Ranged weapons use Dexterity; finesse melee weapons use the better of
  // Strength/Dexterity; ordinary melee weapons use Strength. Explicit INT-based
  // arcane weapons keep their special rule.
  let attackAbility;
  if (w.label?.includes('INT-based') || name === 'Arcane Pistol') {
    attackAbility = 'int';
  } else if (w.range === 'ranged') {
    attackAbility = 'dex';
  } else if (w.finesse && statMod(effStats.dex) >= statMod(effStats.str)) {
    attackAbility = 'dex';
  } else {
    attackAbility = 'str';
  }
  const statBonus = statMod(effStats[attackAbility]);
  return { name, ...w, statBonus, attackAbility };
};

export const equippableInSlot = (char, slotId) => {
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

