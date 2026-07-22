import { useState, useRef, useEffect } from 'react';
import { ITEM_DB, SLOTS, EMPTY_SLOTS, parseDMItem } from '../constants/items.js';
import { STARTING_GEAR } from '../constants/classes.js';
import { XP_THRESHOLDS, HP_PER_LEVEL, HP_BASE, SAVE_VERSION } from '../constants/progression.js';
import { parseCoinAmount } from '../constants/currency.js';
import { rollAntagonist } from '../constants/encounters.js';

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

export const applyRaceBonus = (baseStats, race) => {
  const b = race?.bonus || {};
  const r = { ...baseStats };
  for (const k of Object.keys(r)) r[k] = (r[k] || 0) + (b[k] || 0);
  return r;
};

// -- Item / slot helpers --------------------------------------------------------
export const allItems = (customItems) => ({ ...ITEM_DB, ...customItems });

export const effectiveStats = (baseStats, slots, customItems) => {
  const db = allItems(customItems);
  const s  = { ...baseStats };
  Object.values(slots).forEach(name => {
    if (!name) return;
    const d = db[name];
    // Apply bonuses from magic AND focus items
    if ((d?.type === 'magic' || d?.type === 'focus') && d.bonuses) {
      Object.entries(d.bonuses).forEach(([k, v]) => { if (k !== 'ac') s[k] = (s[k]||0) + v; });
    }
  });
  return s;
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
    if (d?.type === 'magic' && d.bonuses?.ac) ac += d.bonuses.ac;
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
  const db = allItems(char.customItems);
  const validSlotIds = SLOTS.map(s => s.id);
  return char.inventory.filter(name => {
    const data = db[name];
    if (!data) return slot.accepts.includes('magic');
    if (slotId === 'offhand' && data.type === 'shield') return true;
    if (!slot.accepts.includes(data.type)) return false;
    // Magic items with a declared slot only fit that slot ('ring' fits either ring slot).
    // Items with a missing or unrecognized slot stay flexible so nothing gets stranded.
    if (data.type === 'magic' && data.slot) {
      if (data.slot === 'ring') return slotId === 'ring1' || slotId === 'ring2';
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
  inventory:[], stash:[], coins:1000, environment:'wilderness',
  customItems:{},
  stashedCustomItems:{},
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
export function useCharacter() {
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
      const nc = { ...c, stats:newStats, maxHp:newMaxHp, hp:Math.min(c.hp + hpGain, newMaxHp), classLevels };
      charRef.current = nc;
      return nc;
    });
    setPendingStatPoint(false);
  };

  // Apply all DM game effect tags to character
  const applyEffects = (text, currentChar, skipLevelUp = false) => {
    let c = { ...currentChar, customItems:{ ...(currentChar.customItems||{}) }, slots:{ ...(currentChar.slots||EMPTY_SLOTS) } };

    // Coins — [GOLD:] and [COIN:]/[COINS:] both accepted; bare numbers are gp,
    // denominations pp/gp/sp/cp all work ([GOLD: -5sp], [COIN: +2pp], [GOLD: +3gp 5sp]).
    // Stored as one copper integer, so change-making is automatic.
    [...text.matchAll(/\[(?:GOLD|COINS?):\s*([^\]]+)\]/gi)].forEach(m => {
      c.coins = Math.max(0, (c.coins || 0) + parseCoinAmount(m[1]));
    });

    // HP -- [DAMAGE:] = player takes damage, [HEAL:] = player heals
    // Also supports [HP: +10] for healing and [HP: -5] for damage
    [...text.matchAll(/\[DAMAGE:\s*(\d+)\]/gi)].forEach(m => {
      c.hp = Math.max(0, c.hp - parseInt(m[1]));
    });
    [...text.matchAll(/\[HEAL:\s*(\d+)\]/gi)].forEach(m => {
      c.hp = Math.min(c.maxHp, c.hp + parseInt(m[1]));
    });
    // [HP: +10] or [HP: -5] — sign determines heal vs damage
    [...text.matchAll(/\[HP:\s*([+-]?\d+)\]/gi)].forEach(m => {
      const val = parseInt(m[1]);
      if (val > 0) c.hp = Math.min(c.maxHp, c.hp + val);
      else if (val < 0) c.hp = Math.max(0, c.hp + val); // val is already negative
    });

    // XP -- accept [XP: +50] or [XP: 50]
    [...text.matchAll(/\[XP:\s*\+?(\d+)\]/gi)].forEach(m => { c.xp = (c.xp||0) + parseInt(m[1]); });

    // Items gained
    [...text.matchAll(/\[ITEM:\s*([^\]]+)\]/gi)].forEach(m => {
      const raw = m[1];
      // Support qty tag: [ITEM: Blast Powder | qty:3] adds 3 individual entries
      const qtyMatch = raw.match(/\|\s*qty:\s*(\d+)/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
      const cleanRaw = raw.replace(/\|\s*qty:\s*\d+/i, '').trim();
      const { name, data } = parseDMItem(cleanRaw);
      // Store custom data when it's a real custom item, OR a misc item that
      // carries a label (quest items with a description). Plain label-less misc
      // items stay as bare inventory strings to avoid clutter.
      const isCustom = !ITEM_DB[name] && (data.type !== 'misc' || (data.label && data.label.trim()));
      if (isCustom) c.customItems[name] = data;
      for (let i = 0; i < qty; i++) {
        c.inventory = [...c.inventory, name];
      }
    });

    // Items removed -- case-insensitive, supports qty tag: [REMOVE: Blast Powder | qty:2]
    [...text.matchAll(/\[REMOVE:\s*([^\]]+)\]/gi)].forEach(m => {
      const raw = m[1];
      const qtyMatch = raw.match(/\|\s*qty:\s*(\d+)/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
      const removeName = raw.replace(/\|\s*qty:\s*\d+/i, '').trim().toLowerCase();
      for (let i = 0; i < qty; i++) {
        const idx = c.inventory.findIndex(n => n.toLowerCase() === removeName);
        if (idx !== -1) c.inventory = [...c.inventory.slice(0,idx), ...c.inventory.slice(idx+1)];
      }
      const slotEntry = Object.entries(c.slots).find(([,v]) => v?.toLowerCase() === removeName);
      if (slotEntry) c.slots = { ...c.slots, [slotEntry[0]]: null };
      // Drop the custom definition once no copies remain (avoids orphaned customItems)
      const stillHeld = c.inventory.some(n => n.toLowerCase() === removeName)
        || Object.values(c.slots).some(v => v?.toLowerCase() === removeName);
      if (!stillHeld) {
        const ck = Object.keys(c.customItems).find(k => k.toLowerCase() === removeName);
        if (ck) { const ci = { ...c.customItems }; delete ci[ck]; c.customItems = ci; }
      }
    });

    // Location tracking -- updates currentLocation for tiered context system
    const locMatch = text.match(/\[LOCATION:\s*([^\]]+)\]/i);
    if (locMatch) c.currentLocation = locMatch[1].trim();

    // Arc resolved — roll a fresh antagonist (never the one just defeated);
    // the DM sees it next turn and starts seeding
    if (/\[ARC COMPLETE\]/i.test(text)) {
      c.arc = { antagonist: rollAntagonist(c.level, c.arc?.antagonist) };
    }

    // Item update -- renames an item AND carries its custom stats/data to the new name
    [...text.matchAll(/\[UPDATE:\s*([^|\]]+)\|([^\]]+)\]/gi)].forEach(m => {
      const oldName = m[1].trim();
      const newName = m[2].trim();
      // Move custom item data to the new key so stats/bonuses survive the rename
      const oldKey = Object.keys(c.customItems).find(k => k.toLowerCase() === oldName.toLowerCase());
      if (oldKey) {
        c.customItems = { ...c.customItems, [newName]: c.customItems[oldKey] };
        if (oldKey !== newName) { const ci = { ...c.customItems }; delete ci[oldKey]; c.customItems = ci; }
      }
      const idx = c.inventory.findIndex(n => n.toLowerCase() === oldName.toLowerCase());
      if (idx !== -1) {
        const inv = [...c.inventory];
        inv[idx] = newName;
        c.inventory = inv;
      }
      const slotEntry = Object.entries(c.slots).find(([,v]) => v?.toLowerCase() === oldName.toLowerCase());
      if (slotEntry) c.slots = { ...c.slots, [slotEntry[0]]: newName };
    });

    // DM unequip -- moves an equipped item back to inventory WITHOUT deleting it
    [...text.matchAll(/\[UNEQUIP:\s*([^\]]+)\]/gi)].forEach(m => {
      const name = m[1].trim().toLowerCase();
      const slotEntry = Object.entries(c.slots).find(([,v]) => v?.toLowerCase() === name);
      if (slotEntry) {
        const [slotId, itemName] = slotEntry;
        c.slots = { ...c.slots, [slotId]: null };
        if (!c.inventory.some(n => n.toLowerCase() === name)) {
          c.inventory = [...c.inventory, itemName];
        }
      }
    });

    // DM equip -- only first occurrence removed from inventory
    [...text.matchAll(/\[EQUIP:\s*([^|\]]+)\|?\s*([^\]]*)\]/gi)].forEach(m => {
      const name     = m[1].trim();
      const target   = m[2].trim();
      const db       = allItems(c.customItems);
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
        const idx  = c.inventory.indexOf(name);
        if (idx !== -1) c.inventory = [...c.inventory.slice(0,idx), ...c.inventory.slice(idx+1)];
        if (prev) c.inventory = [...c.inventory, prev];
        c.companions = { ...c.companions, [compKey]: { ...comp, slots: { ...compSlots, [slotId]: name } } };
        return;
      }

      let slotId = targetIsSlot ? target.toLowerCase() : slotFromType();
      if (!SLOTS.find(s => s.id === slotId)) slotId = slotFromType();
      const prev = c.slots[slotId];
      const idx  = c.inventory.indexOf(name);
      if (idx !== -1) c.inventory = [...c.inventory.slice(0,idx), ...c.inventory.slice(idx+1)];
      if (prev) c.inventory = [...c.inventory, prev];
      c.slots = { ...c.slots, [slotId]: name };
    });

    c = skipLevelUp ? c : checkLevelUp(c);
    return c;
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
      return { ...c, cls, stats, maxHp, hp:maxHp, slots:{ ...gear.slots }, inventory:[...gear.inventory], customItems:{}, classLevels:{ [cls.name]: 1 } };
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
      let inventory = [...c.inventory];
      let stash = [...(c.stash || [])];
      if (all) {
        const moved = inventory.filter(i => i === itemName);
        inventory = inventory.filter(i => i !== itemName);
        stash = [...stash, ...moved];
      } else {
        const idx = inventory.indexOf(itemName);
        if (idx === -1) return c;
        inventory = [...inventory.slice(0, idx), ...inventory.slice(idx + 1)];
        stash = [...stash, itemName];
      }
      // Move customItem definition to stashedCustomItems if present
      const customItems = { ...c.customItems };
      const stashedCustomItems = { ...(c.stashedCustomItems || {}) };
      if (customItems[itemName]) {
        stashedCustomItems[itemName] = customItems[itemName];
        delete customItems[itemName];
      }
      const nc = { ...c, inventory, stash, customItems, stashedCustomItems };
      charRef.current = nc;
      return nc;
    });
  };

  const moveToInventory = (itemName, all = false) => {
    setCharacter(c => {
      let stash = [...(c.stash || [])];
      let inventory = [...c.inventory];
      if (all) {
        const moved = stash.filter(i => i === itemName);
        stash = stash.filter(i => i !== itemName);
        inventory = [...inventory, ...moved];
      } else {
        const idx = stash.indexOf(itemName);
        if (idx === -1) return c;
        stash = [...stash.slice(0, idx), ...stash.slice(idx + 1)];
        inventory = [...inventory, itemName];
      }
      // Restore customItem definition from stashedCustomItems if present
      const customItems = { ...c.customItems };
      const stashedCustomItems = { ...(c.stashedCustomItems || {}) };
      if (stashedCustomItems[itemName]) {
        customItems[itemName] = stashedCustomItems[itemName];
        delete stashedCustomItems[itemName];
      }
      const nc = { ...c, inventory, stash, customItems, stashedCustomItems };
      charRef.current = nc;
      return nc;
    });
  };

  // Create a named bag from selected inventory items
  // selectedItems: array of item names (may include duplicates for multiple copies)
  const createBag = (bagName, selectedItems) => {
    setCharacter(c => {
      // Count selected items
      const counts = {};
      selectedItems.forEach(name => { counts[name] = (counts[name] || 0) + 1; });
      // Build label from counts
      const label = Object.entries(counts)
        .map(([name, count]) => count > 1 ? `${name} x${count}` : name)
        .join(', ');
      // Remove selected items from inventory (one copy at a time)
      let inventory = [...c.inventory];
      selectedItems.forEach(name => {
        const idx = inventory.indexOf(name);
        if (idx !== -1) inventory.splice(idx, 1);
      });
      // Add bag to inventory and customItems
      inventory = [...inventory, bagName];
      const customItems = {
        ...c.customItems,
        [bagName]: { type: 'bag', slot: null, bonuses: {}, label, contents: counts },
      };
      const nc = { ...c, inventory, customItems };
      charRef.current = nc;
      return nc;
    });
  };

  // Move an item out of a bag back into inventory (one or all copies)
  const removeFromBag = (bagName, itemName, all = false) => {
    setCharacter(c => {
      const existing = c.customItems[bagName];
      if (!existing?.contents?.[itemName]) return c;
      const counts = { ...existing.contents };
      const moveCount = all ? counts[itemName] : 1;
      counts[itemName] -= moveCount;
      if (counts[itemName] <= 0) delete counts[itemName];
      const label = Object.entries(counts)
        .map(([name, count]) => count > 1 ? `${name} x${count}` : name)
        .join(', ');
      const inventory = [...c.inventory, ...Array(moveCount).fill(itemName)];
      const customItems = { ...c.customItems, [bagName]: { ...existing, label, contents: counts } };
      const nc = { ...c, inventory, customItems };
      charRef.current = nc;
      return nc;
    });
  };

  // Permanently delete an item from inventory (one or all copies). Bags are deleted whole.
  const deleteItem = (itemName, all = false) => {
    setCharacter(c => {
      let inventory = [...c.inventory];
      if (all) {
        inventory = inventory.filter(n => n !== itemName);
      } else {
        const idx = inventory.indexOf(itemName);
        if (idx !== -1) inventory.splice(idx, 1);
      }
      // If no copies remain and it's a custom item, drop the definition too
      let customItems = c.customItems;
      if (!inventory.includes(itemName) && customItems[itemName]) {
        customItems = { ...customItems };
        delete customItems[itemName];
      }
      const nc = { ...c, inventory, customItems };
      charRef.current = nc;
      return nc;
    });
  };

  // Permanently delete an item from inside a bag (one or all copies)
  const deleteFromBag = (bagName, itemName, all = false) => {
    setCharacter(c => {
      const existing = c.customItems[bagName];
      if (!existing?.contents?.[itemName]) return c;
      const counts = { ...existing.contents };
      if (all) delete counts[itemName];
      else { counts[itemName] -= 1; if (counts[itemName] <= 0) delete counts[itemName]; }
      const label = Object.entries(counts)
        .map(([name, count]) => count > 1 ? `${name} x${count}` : name)
        .join(', ');
      const customItems = { ...c.customItems, [bagName]: { ...existing, label, contents: counts } };
      const nc = { ...c, customItems };
      charRef.current = nc;
      return nc;
    });
  };

  // Add more items to an existing bag
  const addToBag = (bagName, selectedItems) => {
    setCharacter(c => {
      const existing = c.customItems[bagName];
      if (!existing) return c;
      const counts = { ...(existing.contents || {}) };
      selectedItems.forEach(name => { counts[name] = (counts[name] || 0) + 1; });
      const label = Object.entries(counts)
        .map(([name, count]) => count > 1 ? `${name} x${count}` : name)
        .join(', ');
      let inventory = [...c.inventory];
      selectedItems.forEach(name => {
        const idx = inventory.indexOf(name);
        if (idx !== -1) inventory.splice(idx, 1);
      });
      const customItems = {
        ...c.customItems,
        [bagName]: { ...existing, label, contents: counts },
      };
      const nc = { ...c, inventory, customItems };
      charRef.current = nc;
      return nc;
    });
  };

  const finalizeCharacter = (name, bio = '') => {
    const char = { ...charRef.current, name: name.trim() || 'Adventurer', bio: bio.trim(), xp:0, _v:SAVE_VERSION };
    updateChar(char);
    return char;
  };

  const equipToSlot = (slotId, itemName) => {
    setCharacter(c => {
      const prev = c.slots[slotId];
      const idx  = c.inventory.indexOf(itemName);
      let inventory = idx !== -1
        ? [...c.inventory.slice(0, idx), ...c.inventory.slice(idx + 1)]
        : c.inventory;
      if (prev) inventory = [...inventory, prev];
      const nc = { ...c, slots:{ ...c.slots, [slotId]:itemName }, inventory };
      charRef.current = nc;
      return nc;
    });
  };

  const unequipSlot = (slotId) => {
    setCharacter(c => {
      const item = c.slots[slotId];
      if (!item) return c;
      const nc = { ...c, slots:{ ...c.slots, [slotId]:null }, inventory:[...c.inventory, item] };
      charRef.current = nc;
      return nc;
    });
  };

  // Equip an inventory item onto a companion's slot. Mirrors equipToSlot: the
  // item leaves the shared inventory, and anything previously in that slot
  // returns to inventory.
  const equipCompanionItem = (companionName, slotId, itemName) => {
    setCharacter(c => {
      const comp = c.companions?.[companionName];
      if (!comp) return c;
      const compSlots = comp.slots || {};
      const prev = compSlots[slotId];
      const idx  = c.inventory.indexOf(itemName);
      let inventory = idx !== -1
        ? [...c.inventory.slice(0, idx), ...c.inventory.slice(idx + 1)]
        : c.inventory;
      if (prev) inventory = [...inventory, prev];
      const nc = { ...c, inventory, companions: { ...c.companions, [companionName]: { ...comp, slots: { ...compSlots, [slotId]: itemName } } } };
      charRef.current = nc;
      return nc;
    });
  };

  const unequipCompanionItem = (companionName, slotId) => {
    setCharacter(c => {
      const comp = c.companions?.[companionName];
      const item = comp?.slots?.[slotId];
      if (!item) return c;
      const nc = { ...c, inventory: [...c.inventory, item], companions: { ...c.companions, [companionName]: { ...comp, slots: { ...comp.slots, [slotId]: null } } } };
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
    createBag, addToBag, removeFromBag, deleteItem, deleteFromBag,
    toggleContextExclusion,
    pendingStatPoint, setPendingStatPoint,
    levelUpMsg, setLevelUpMsg,
  };
}
