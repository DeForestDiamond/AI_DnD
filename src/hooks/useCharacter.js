import { useState, useRef, useEffect } from 'react';
import { ITEM_DB, SLOTS, EMPTY_SLOTS, parseDMItem } from '../constants/items.js';
import { STARTING_GEAR } from '../constants/classes.js';
import { XP_THRESHOLDS, HP_PER_LEVEL, HP_BASE, SAVE_VERSION } from '../constants/progression.js';
import { parseCoinAmount } from '../constants/currency.js';
import { rollArc, resolveArcLocation } from '../constants/encounters.js';
import { normalizeStacks, stackCount, stackHas, stackNames, addStack, takeStack, takeAllStack, renameStack } from '../utils/itemStacks.js';

// -- Pure stat helpers ----------------------------------------------------------
export const statMod   = (v) => Math.floor(((v||10) - 10) / 2);
export const modStr    = (v) => { const m = statMod(v); return m >= 0 ? `+${m}` : `${m}`; };
export const profBonus = (level) => 1 + Math.ceil(level / 4);
export const rollDie   = (sides) => Math.floor(Math.random() * sides) + 1;
export const rollDice  = (notation) => {
  const [n, s] = notation.split('d').map(Number);
  let t = 0; for (let i = 0; i < n; i++) t += rollDie(s);
  return t;
};

export const calcMaxHp = (clsName, con, level = 1) => {
  const base   = HP_BASE[clsName]    || 8;
  const perLv  = HP_PER_LEVEL[clsName] || 5;
  const conMod = statMod(con);
  return base + conMod + (level - 1) * (perLv + conMod);
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

export const applyRaceBonus = (baseStats, race) => {
  const b = race?.bonus || {};
  const r = { ...baseStats };
  for (const k of Object.keys(r)) r[k] = (r[k] || 0) + (b[k] || 0);
  return r;
};

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
  // Arcane Pistol uses INT, finesse weapons use best of STR/DEX, others use STR
  let statBonus;
  if (w.label?.includes('INT-based') || name === 'Arcane Pistol') {
    statBonus = statMod(effStats.int);
  } else {
    const useDex = w.finesse && statMod(effStats.dex) >= statMod(effStats.str);
    statBonus = useDex ? statMod(effStats.dex) : statMod(effStats.str);
  }
  return { name, ...w, statBonus };
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

// -- Save migration -------------------------------------------------------------
export const migrateCharacter = (char) => {
  const notes = [];
  const v = char._v || 1;
  let c = { ...char };
  // Inventory/stash may arrive in compressed { name: count } form (how they're
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
  if (c.inventory !== undefined) c.inventory = expandList(c.inventory);
  if (c.stash !== undefined) c.stash = expandList(c.stash);
  if (v < 2) {
    c.slots = { ...EMPTY_SLOTS };
    c.customItems = {};
    if (Array.isArray(char.equipped)) {
      char.equipped.forEach(name => {
        const d = ITEM_DB[name];
        if (d?.type === 'weapon' && !c.slots.mainhand) c.slots.mainhand = name;
        else if (d?.type === 'shield' && !c.slots.offhand) c.slots.offhand = name;
        else if (d?.type === 'armor'  && !c.slots.armor)   c.slots.armor   = name;
      });
    }
    notes.push('Equipment slots upgraded');
  }
  if (v < 3) { if (c.xp === undefined) { c.xp = 0; notes.push('XP initialized'); } }
  if (v < 4) { if (!c.customItems) { c.customItems = {}; } }
  if (v < 6) {
    // Add classLevels if missing -- infer from primary class
    if (!c.classLevels) {
      c.classLevels = {};
      if (c.cls?.name) c.classLevels[c.cls.name] = c.level;
      notes.push('Class levels initialized');
    }
  }
  if (v < 7) {
    if (!c.abilities) {
      c.abilities = { cantrips:[], spells:[], infusions:[] };
      notes.push('Abilities initialized -- please select your known spells and infusions');
    }
    if (!c.abilities.cantrips)  c.abilities.cantrips  = [];
    if (!c.abilities.spells)    c.abilities.spells    = [];
    if (!c.abilities.infusions) c.abilities.infusions = [];
  }
  if (v < 8) {
    // Add deity for clerics from old saves that don't have one.
    // Check both primary class AND classLevels (catches multiclass clerics).
    if (!c.deity && (c.cls?.name === 'Cleric' || c.cls?.name === 'Warlock' ||
      Object.keys(c.classLevels || {}).some(k => ['Cleric','Warlock'].includes(k)))) {
      c._needsDeitySelection = true;
      notes.push('Character needs to choose a deity/patron -- you will be prompted after load');
    }
    if (!c.deity) c.deity = null;
    // Add stash if missing
    if (!c.stash) { c.stash = []; notes.push('Stash initialized'); }
    if (!c.stashedCustomItems) { c.stashedCustomItems = {}; }
    if (!c.contextExclusions) { c.contextExclusions = { companions:{}, npcs:{}, towns:{} }; }
  }
  if (v < 9) {
    // Subclass support. Add the field; owed choices are detected live on load.
    if (!c.subclasses) c.subclasses = {};
  }
  if (v < 10) {
    // World-state containers. Features that write NPCs/towns (extraction, edit
    // panel) and the arc/pacing systems assume these exist; older saves may
    // lack any of them. Guarantees shape so downstream code can stop guarding.
    if (c.arc === undefined) c.arc = null;                    // no active antagonist
    if (!c.pacing) c.pacing = 'normal';
    if (!c.environment) c.environment = 'wilderness';
    if (!c.companions) c.companions = {};
    if (!c.npcs) c.npcs = {};
    if (!c.towns) { c.towns = {}; notes.push('Towns/locations store initialized'); }
    if (!c.contextExclusions) c.contextExclusions = {};
    ['companions','npcs','towns'].forEach(k => {
      if (!c.contextExclusions[k]) c.contextExclusions[k] = {};
    });
    // Companion/NPC entries: guarantee the three core keys every consumer and
    // the upcoming edit panel rely on. Light touch — optional flavor fields
    // (race, appearance, personality, ...) stay absent unless authored, since
    // the prompt builder skips missing fields cleanly.
    ['companions','npcs'].forEach(group => {
      Object.entries(c[group]).forEach(([name, entry]) => {
        if (!entry || typeof entry !== 'object') { c[group][name] = { desc: String(entry ?? ''), location: '', relationship: '' }; return; }
        if (entry.desc === undefined) entry.desc = '';
        if (entry.location === undefined) entry.location = '';
        if (entry.relationship === undefined) entry.relationship = '';
      });
    });
  }
  if (v < 11) {
    // Currency: gp number -> one copper integer (1gp = 100cp). Old saves have
    // char.gold; convert and retire the field.
    if (c.coins === undefined) c.coins = Math.max(0, Math.round((c.gold || 0) * 100));
    delete c.gold;
  }
  if (v < 12) {
    // New equipment slots (face, shoulders, torso, arms, waist) — backfill as
    // empty so the slots object matches the full SLOTS list. Existing equipped
    // items are untouched.
    c.slots = { ...EMPTY_SLOTS, ...(c.slots || {}) };
  }
  if (v < 14) {
    // Ledger of antagonists whose arcs are finished — filters them out of future
    // rolls so the player isn't sent after someone they already dealt with.
    if (!Array.isArray(c.defeatedAntagonists)) c.defeatedAntagonists = [];
  }
  if (v < 13) {
    // Quantity baked into the NAME ("Pit Fiend Scale x200") — one string
    // pretending to be many items. Breaks [REMOVE: name | qty:N] (the stored
    // name never matches), shows as a single item in the sidebar, and makes
    // crafting/selling propose consuming quantities that do not exist.
    // Expand into real individual entries; the save-boundary compression turns
    // them back into { name: count } on disk, so file size is unaffected.
    const QTY_IN_NAME = /^(.*?)\s*[xX]\s*(\d+)$/;
    const MAX_EXPAND = 500;                       // guard against a typo'd x99999
    const expandQty = (list) => {
      if (!Array.isArray(list)) return list;
      const out = [];
      for (const entry of list) {
        const m = typeof entry === 'string' && entry.match(QTY_IN_NAME);
        if (m && m[1].trim()) {
          const base = m[1].trim();
          const n = Math.min(MAX_EXPAND, Math.max(1, parseInt(m[2], 10) || 1));
          for (let i = 0; i < n; i++) out.push(base);
        } else out.push(entry);
      }
      return out;
    };
    const invBefore = (c.inventory || []).length;
    c.inventory = expandQty(c.inventory);
    c.stash = expandQty(c.stash);
    // Re-key any custom definition stored under the full "name xN" so the
    // expanded items keep their stats/label instead of orphaning.
    ['customItems', 'stashedCustomItems'].forEach(store => {
      if (!c[store]) return;
      const next = { ...c[store] };
      Object.keys(c[store]).forEach(key => {
        const m = key.match(QTY_IN_NAME);
        if (m && m[1].trim()) {
          const base = m[1].trim();
          if (!next[base]) next[base] = c[store][key];
          delete next[key];
        }
      });
      c[store] = next;
    });
    if ((c.inventory || []).length !== invBefore) {
      notes.push('Quantity-in-name items expanded into real stacks');
    }
  }
  if (v < 16) {
    // Structured disposition — who this character actually is, so the DM stops
    // assuming heroism. 'indifferent' is the important one: what genuinely
    // fails to move them.
    if (!c.disposition || typeof c.disposition !== 'object') {
      c.disposition = { alignment:'', cares:'', indifferent:'', methods:'', lines:'' };
    }
    if (c.arc && !Array.isArray(c.arc.objectives)) c.arc = { ...c.arc, objectives: [] };
    if (c.arc && typeof c.arc.goal !== 'string') c.arc = { ...c.arc, goal: '' };
  }
  if (v < 15) {
    // v13 expanded quantity-in-name entries in inventory and stash but missed
    // BAG CONTENTS, which are {name: count} maps rather than arrays. A bag
    // holding "Refined Veil x30": 1 reads as a single item named that, so the
    // real 30 are invisible to crafting, salvage and removal alike.
    const QTY = /^(.*?)\s*[xX]\s*(\d+)$/;
    let fixed = 0;
    ['customItems', 'stashedCustomItems'].forEach(store => {
      if (!c[store]) return;
      const next = { ...c[store] };
      Object.entries(c[store]).forEach(([bagName, data]) => {
        if (data?.type !== 'bag' || !data.contents) return;
        const contents = {};
        Object.entries(data.contents).forEach(([item, count]) => {
          const m = String(item).match(QTY);
          const held = Math.max(1, parseInt(count, 10) || 1);
          if (m && m[1].trim()) {
            const base = m[1].trim();
            const per = Math.min(500, Math.max(1, parseInt(m[2], 10) || 1));
            contents[base] = (contents[base] || 0) + per * held;   // merge if the base already exists
            fixed++;
          } else {
            contents[item] = (contents[item] || 0) + held;
          }
        });
        next[bagName] = { ...data, contents };
      });
      c[store] = next;
    });
    if (fixed) notes.push(`Bag contents: ${fixed} quantity-in-name entries expanded`);
  }
  if (v < 17) {
    // Techniques split out of the spells bucket. Only the field is added —
    // existing selections are left where they are and can be cleared by hand.
    if (c.abilities && !Array.isArray(c.abilities.martial)) c.abilities.martial = [];
  }
  if (v < 18) {
    // v18: persist a destination for the current arc. Old saves roll it once here.
    if (c.arc?.antagonist && !c.arc.arcLocation) {
      c.arc = { ...c.arc, arcLocation: resolveArcLocation(c.arc.antagonist) };
      notes.push(`Arc location assigned: ${c.arc.arcLocation}`);
    }
  }

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
  c._v = SAVE_VERSION;
  return { char: c, notes };
};

// -- Empty character ------------------------------------------------------------
export const EMPTY_CHAR = {
  _v: SAVE_VERSION,
  name:'', race:null, cls:null, deity:null,
  hp:0, maxHp:0, stats:{},
  level:1, xp:0,
  classLevels: {},
  subclasses: {},
  slots:{ ...EMPTY_SLOTS },
  inventory:[], stash:[], coins:1000, environment:'wilderness', defeatedAntagonists:[],
  disposition: { alignment:'', cares:'', indifferent:'', methods:'', lines:'' },
  items:{},
  contextExclusions: { companions:{}, npcs:{}, towns:{} },
  bio: '',
  directives: '',
  currentLocation: '',
  companions: {},
  npcs: {},
  towns: {},
  abilities: {
    cantrips: [],
    spells: [],
    infusions: [],
  },
};

// Companion slot types
export const COMPANION_SLOT_DEFS = {
  humanoid: ['mainhand','offhand','armor','head','neck','cloak','hands','ring1','feet'],
  wolf:     ['neck','armor'],
};

export const emptyCompanionSlots = (type = 'humanoid') =>
  Object.fromEntries((COMPANION_SLOT_DEFS[type] || COMPANION_SLOT_DEFS.humanoid).map(s => [s, null]));

// -- The hook -------------------------------------------------------------------
export function useCharacter(log) {
  // `log` is optional; every call site uses log?.() so the hook still works
  // without one. It must be a PARAMETER though — optional chaining guards a null
  // value, not an undefined identifier, so a bare log?.() would throw.
  const [character, setCharacter]         = useState(EMPTY_CHAR);
  const [pendingStatPoint, setPendingStatPoint] = useState(false);
  const [levelUpMsg, setLevelUpMsg]       = useState(null);
  const charRef = useRef(character);
  useEffect(() => { charRef.current = character; }, [character]);

  const updateChar = (newChar) => {
    setCharacter(newChar);
    charRef.current = newChar;
  };

  const checkLevelUp = (char) => {
    const next = char.level + 1;
    if (next >= XP_THRESHOLDS.length) return char;
    const threshold = XP_THRESHOLDS[next];
    if (threshold === 0 || char.xp === 0) return char;
    if (char.xp < threshold) return char;
    const expectedLevel = XP_THRESHOLDS.reduce((lvl, t, idx) => (t > 0 && char.xp >= t) ? idx : lvl, 1);
    if (char.level >= expectedLevel) return char;
    setLevelUpMsg(` Level ${next}! Choose your path!`);
    setTimeout(() => setLevelUpMsg(null), 8000);
    setPendingStatPoint(true);
    return { ...char, level: next };
  };

  // className = which class to advance, stat = which stat to boost
  const spendStatPoint = (className, stat) => {
    setCharacter(c => {
      const classLevels  = { ...(c.classLevels || {}) };
      classLevels[className] = (classLevels[className] || 0) + 1;
      const newStats  = { ...c.stats, [stat]: c.stats[stat] + 1 };
      const hpPerLevel = HP_PER_LEVEL[className] || 5;
      const conMod     = statMod(newStats.con);
      const hpGain     = Math.max(1, hpPerLevel + conMod);
      const newMaxHp   = c.maxHp + hpGain;
      const withMax = { ...c, stats:newStats, maxHp:newMaxHp, classLevels };
      const nc = { ...withMax, hp: Math.min(c.hp + hpGain, effectiveMaxHp(withMax)) };
      charRef.current = nc;
      return nc;
    });
    setPendingStatPoint(false);
  };

  // Apply all DM game effect tags to character
  const applyEffects = (text, currentChar, skipLevelUp = false) => {
    let c = { ...currentChar, items:{ ...(currentChar.items||{}) }, inventory:normalizeStacks(currentChar.inventory), stash:normalizeStacks(currentChar.stash), slots:{ ...(currentChar.slots||EMPTY_SLOTS) } };

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
      if (grant > 0) c.inventory = addStack(c.inventory, name, grant);
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
    if (locMatch) c.currentLocation = locMatch[1].trim();

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

    if (/\[ARC COMPLETE\]/i.test(text)) {
      // Record the finished foe so it's never rolled again, then pick the next.
      const finished = c.arc?.antagonist;
      const defeated = [...(c.defeatedAntagonists || [])];
      if (finished && !defeated.some(d => d.toLowerCase() === finished.toLowerCase())) {
        defeated.push(finished);
      }
      c.defeatedAntagonists = defeated;
      c.arc = rollArc(c.level, finished, defeated);
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

    c = skipLevelUp ? c : checkLevelUp(c);
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

  // Create a named bag from selected inventory items
  // selectedItems: array of item names (may include duplicates for multiple copies)
  const createBag = (bagName, selectedItems) => {
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

  const finalizeCharacter = (name, bio = '', disposition = null) => {
    const char = { ...charRef.current, name: name.trim() || 'Adventurer', bio: bio.trim(),
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
    setPendingStatPoint(false);
    setLevelUpMsg(null);
    return migrated;
  };

  return {
    character, charRef, updateChar, loadCharacter,
    selectRace, selectClass, selectDeity, finalizeCharacter,
    applyEffects, spendStatPoint,
    equipToSlot, unequipSlot, equippableInSlot, equipCompanionItem, unequipCompanionItem,
    moveToStash, moveToInventory,
    createBag, addToBag, removeFromBag, deleteItem, deleteFromBag, renameItem,
    toggleContextExclusion,
    pendingStatPoint, setPendingStatPoint,
    levelUpMsg, setLevelUpMsg,
  };
}
