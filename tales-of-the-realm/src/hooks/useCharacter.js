import { useState, useRef, useEffect } from 'react';
import { ITEM_DB, SLOTS, EMPTY_SLOTS, parseDMItem } from '../constants/items.js';
import { STARTING_GEAR } from '../constants/classes.js';
import { XP_THRESHOLDS, HP_PER_LEVEL, HP_BASE, SAVE_VERSION } from '../constants/progression.js';

// ── Pure stat helpers ──────────────────────────────────────────────────────────
export const statMod  = (v) => Math.floor(((v||10) - 10) / 2);
export const modStr   = (v) => { const m = statMod(v); return m >= 0 ? `+${m}` : `${m}`; };
export const profBonus = (level) => 1 + Math.ceil(level / 4);

export const rollDie  = (sides) => Math.floor(Math.random() * sides) + 1;
export const rollDice = (notation) => {
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

// ── Item / slot helpers ────────────────────────────────────────────────────────
export const allItems = (customItems) => ({ ...ITEM_DB, ...customItems });

export const effectiveStats = (baseStats, slots, customItems) => {
  const db = allItems(customItems);
  const s = { ...baseStats };
  Object.values(slots).forEach(name => {
    if (!name) return;
    const d = db[name];
    if (d?.type === 'magic' && d.bonuses) {
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
  const db       = allItems(customItems);
  const effStats = effectiveStats(stats, slots, customItems);
  const name     = slots.mainhand;
  if (!name) return null;
  const w = db[name];
  if (!w || w.type !== 'weapon') return null;
  const useDex   = w.finesse && statMod(effStats.dex) >= statMod(effStats.str);
  const statBonus = useDex ? statMod(effStats.dex) : statMod(effStats.str);
  return { name, ...w, statBonus, useDex };
};

export const equippableInSlot = (char, slotId) => {
  const slot = SLOTS.find(s => s.id === slotId);
  if (!slot) return [];
  const db = allItems(char.customItems);
  return char.inventory.filter(name => {
    const data = db[name];
    if (!data) return slot.accepts.includes('magic'); // unknown items → any magic slot
    if (slotId === 'offhand' && data.type === 'shield') return true;
    return slot.accepts.includes(data.type);
  });
};

// ── Save migration ─────────────────────────────────────────────────────────────
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
  c._v = SAVE_VERSION;
  return { char: c, notes };
};

// ── Empty character ────────────────────────────────────────────────────────────
export const EMPTY_CHAR = {
  _v: SAVE_VERSION,
  name:'', race:null, cls:null,
  hp:0, maxHp:0, stats:{},
  level:1, xp:0,
  slots:{ ...EMPTY_SLOTS },
  inventory:[], gold:10,
  customItems:{},
};

// ── The hook ───────────────────────────────────────────────────────────────────
export function useCharacter() {
  const [character, setCharacter] = useState(EMPTY_CHAR);
  const [pendingStatPoint, setPendingStatPoint] = useState(false);
  const [levelUpMsg, setLevelUpMsg] = useState(null);
  const charRef = useRef(character);
  useEffect(() => { charRef.current = character; }, [character]);

  const updateChar = (newChar) => {
    setCharacter(newChar);
    charRef.current = newChar;
  };

  const checkLevelUp = (char) => {
    const next = char.level + 1;
    if (next >= XP_THRESHOLDS.length) return char;
    if (char.xp < XP_THRESHOLDS[next]) return char;
    const newMaxHp = calcMaxHp(char.cls.name, char.stats.con, next);
    const hpGain   = newMaxHp - char.maxHp;
    const newChar  = { ...char, level:next, maxHp:newMaxHp, hp:Math.min(char.hp + hpGain, newMaxHp) };
    setLevelUpMsg(`🎉 Level ${next}! HP +${hpGain}. Choose a stat to increase!`);
    setTimeout(() => setLevelUpMsg(null), 6000);
    setPendingStatPoint(true);
    return newChar;
  };

  // Apply all DM game effect tags to character
  const applyEffects = (text, currentChar) => {
    let c = { ...currentChar, customItems:{ ...(currentChar.customItems||{}) }, slots:{ ...(currentChar.slots||EMPTY_SLOTS) } };

    // Gold — use tags only, never trust narration
    [...text.matchAll(/\[GOLD:\s*([+-]?\d+)\]/gi)].forEach(m => {
      c.gold = Math.max(0, c.gold + parseInt(m[1]));
    });

    // HP
    const dmgM  = text.match(/\[DAMAGE:\s*(\d+)\]/i);
    if (dmgM)  c.hp = Math.max(0, c.hp - parseInt(dmgM[1]));
    const healM = text.match(/\[HEAL:\s*(\d+)\]/i);
    if (healM) c.hp = Math.min(c.maxHp, c.hp + parseInt(healM[1]));

    // XP
    [...text.matchAll(/\[XP:\s*\+(\d+)\]/gi)].forEach(m => { c.xp = (c.xp||0) + parseInt(m[1]); });

    // Items gained
    [...text.matchAll(/\[ITEM:\s*([^\]]+)\]/gi)].forEach(m => {
      const { name, data } = parseDMItem(m[1]);
      if (!ITEM_DB[name] && data.type !== 'misc') c.customItems[name] = data;
      c.inventory = [...c.inventory, name];
    });

    // Items removed
    [...text.matchAll(/\[REMOVE:\s*([^\]]+)\]/gi)].forEach(m => {
      const name = m[1].trim();
      const idx  = c.inventory.indexOf(name);
      if (idx !== -1) c.inventory = [...c.inventory.slice(0,idx), ...c.inventory.slice(idx+1)];
      const slotEntry = Object.entries(c.slots).find(([,v]) => v === name);
      if (slotEntry) c.slots = { ...c.slots, [slotEntry[0]]: null };
    });

    // Item update (transform quest items): [UPDATE: Old Item | New Item]
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

    // DM equip: [EQUIP: itemname | slotid]
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
      c.inventory = c.inventory.filter(n => n !== name);
      if (prev) c.inventory = [...c.inventory, prev];
      c.slots = { ...c.slots, [slotId]: name };
    });

    c = checkLevelUp(c);
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
      return { ...c, cls, stats, maxHp, hp:maxHp, slots:{ ...gear.slots }, inventory:[...gear.inventory], customItems:{} };
    });
  };

  const finalizeCharacter = (name) => {
    const char = { ...charRef.current, name: name.trim() || 'Adventurer', xp:0, _v:SAVE_VERSION };
    updateChar(char);
    return char;
  };

  const spendStatPoint = (stat) => {
    setCharacter(c => {
      const newStats = { ...c.stats, [stat]: c.stats[stat] + 1 };
      const newMaxHp = stat === 'con' ? calcMaxHp(c.cls.name, newStats.con, c.level) : c.maxHp;
      const hpDiff   = newMaxHp - c.maxHp;
      const nc = { ...c, stats:newStats, maxHp:newMaxHp, hp:c.hp + hpDiff };
      charRef.current = nc;
      return nc;
    });
    setPendingStatPoint(false);
  };

  const equipToSlot = (slotId, itemName) => {
    setCharacter(c => {
      const prev = c.slots[slotId];
      let inventory = c.inventory.filter(n => n !== itemName);
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
    return migrated;
  };

  return {
    character, charRef, updateChar, loadCharacter,
    selectRace, selectClass, finalizeCharacter,
    applyEffects, spendStatPoint,
    equipToSlot, unequipSlot, equippableInSlot,
    pendingStatPoint, setPendingStatPoint,
    levelUpMsg, setLevelUpMsg,
  };
}
