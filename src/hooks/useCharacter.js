import { useState, useRef, useEffect } from 'react';
import { ITEM_DB, SLOTS, EMPTY_SLOTS, parseDMItem } from '../constants/items.js';
import { STARTING_GEAR } from '../constants/classes.js';
import { XP_THRESHOLDS, HP_PER_LEVEL, HP_BASE, SAVE_VERSION } from '../constants/progression.js';

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
  return char.inventory.filter(name => {
    const data = db[name];
    if (!data) return slot.accepts.includes('magic');
    if (slotId === 'offhand' && data.type === 'shield') return true;
    return slot.accepts.includes(data.type);
  });
};

// -- Save migration -------------------------------------------------------------
export const migrateCharacter = (char) => {
  const notes = [];
  const v = char._v || 1;
  let c = { ...char };
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
  if (v < 5) {
    if (c.customItems['Chitin Bracers']?.type === 'armor') {
      c.customItems['Chitin Bracers'] = { type:'magic', slot:'hands', bonuses:{ ac:1 }, label:'+1 AC' };
      notes.push('Chitin Bracers upgraded');
    }
    if (c.customItems['Chitin Greaves']?.type === 'armor') {
      c.customItems['Chitin Greaves'] = { type:'magic', slot:'feet', bonuses:{ ac:1 }, label:'+1 AC' };
      notes.push('Chitin Greaves upgraded');
    }
    if (c.slots.armor === 'Chitin Bracers') { c.slots.armor = null; c.slots.hands = 'Chitin Bracers'; }
    if (c.slots.armor === 'Chitin Greaves') { c.slots.armor = null; c.slots.feet  = 'Chitin Greaves'; }
  }
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
    const patronClasses = ['Cleric', 'Warlock'];
    const hasPatronClass = patronClasses.some(c =>
      c === (c.cls?.name) || Object.keys(c.classLevels || {}).includes(c)
    );
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
  slots:{ ...EMPTY_SLOTS },
  inventory:[], stash:[], gold:10,
  customItems:{},
  stashedCustomItems:{},
  contextExclusions: { companions:{}, npcs:{}, towns:{} },
  bio: '',
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
      const hpPerLevel = { Fighter:6, Wizard:4, Rogue:5, Cleric:5, Artificer:5, Illrigger:6, Monk:5, Barbarian:7, Warlock:5, 'Blood Hunter':5 }[className] || 5;
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

    // Gold
    [...text.matchAll(/\[GOLD:\s*([+-]?\d+)\]/gi)].forEach(m => {
      c.gold = Math.max(0, c.gold + parseInt(m[1]));
    });

    // HP -- [DAMAGE:] = player takes damage, [HEAL:] = player heals
    const dmgM  = text.match(/\[DAMAGE:\s*(\d+)\]/i);
    if (dmgM)  c.hp = Math.max(0, c.hp - parseInt(dmgM[1]));
    const healM = text.match(/\[HEAL:\s*(\d+)\]/i);
    if (healM) c.hp = Math.min(c.maxHp, c.hp + parseInt(healM[1]));

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
      if (!ITEM_DB[name] && data.type !== 'misc') c.customItems[name] = data;
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
    });

    // Location tracking -- updates currentLocation for tiered context system
    const locMatch = text.match(/\[LOCATION:\s*([^\]]+)\]/i);
    if (locMatch) c.currentLocation = locMatch[1].trim();

    // Item update
    [...text.matchAll(/\[UPDATE:\s*([^|^\]]+)\|([^\]]+)\]/gi)].forEach(m => {
      const oldName = m[1].trim();
      const newName = m[2].trim();
      const idx = c.inventory.indexOf(oldName);
      if (idx !== -1) {
        const inv = [...c.inventory];
        inv[idx] = newName;
        c.inventory = inv;
      }
      const slotEntry = Object.entries(c.slots).find(([,v]) => v === oldName);
      if (slotEntry) c.slots = { ...c.slots, [slotEntry[0]]: newName };
    });

    // DM equip -- only first occurrence removed from inventory
    [...text.matchAll(/\[EQUIP:\s*([^|^\]]+)\|?\s*([^\]]*)\]/gi)].forEach(m => {
      const name     = m[1].trim();
      const slotHint = m[2].trim().toLowerCase();
      const db       = allItems(c.customItems);
      const data     = db[name];
      let slotId     = slotHint || null;
      if (!slotId) {
        if (data?.type === 'weapon') slotId = 'mainhand';
        else if (data?.type === 'armor')  slotId = 'armor';
        else if (data?.type === 'shield') slotId = 'offhand';
        else slotId = 'neck';
      }
      if (!SLOTS.find(s => s.id === slotId)) slotId = 'neck';
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
    setCharacter(c => {
      let inventory = [...c.inventory];
      let stash = [...(c.stash || [])];
      if (all) {
        // Move every copy
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

  const finalizeCharacter = (name) => {
    const char = { ...charRef.current, name: name.trim() || 'Adventurer', xp:0, _v:SAVE_VERSION };
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
    equipToSlot, unequipSlot, equippableInSlot,
    moveToStash, moveToInventory,
    createBag, addToBag,
    toggleContextExclusion,
    pendingStatPoint, setPendingStatPoint,
    levelUpMsg, setLevelUpMsg,
  };
}
