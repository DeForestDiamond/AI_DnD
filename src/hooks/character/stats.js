import { XP_THRESHOLDS, HP_PER_LEVEL, HP_BASE } from '../../constants/progression.js';

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


// Level-ups are derived from XP instead of stored as transient UI state. This
// makes them safely bankable across turns, saves, and reloads: XP says how many
// levels the character has earned; character.level says how many were spent.
export const levelUpsAvailable = (char) => {
  if (!char) return 0;
  const xp = char.xp || 0;
  const current = Math.max(1, char.level || 1);
  const earned = XP_THRESHOLDS.reduce(
    (lvl, threshold, idx) => (idx > 0 && threshold >= 0 && xp >= threshold ? idx : lvl),
    1
  );
  return Math.max(0, earned - current);
};

export const applyRaceBonus = (baseStats, race) => {
  const b = race?.bonus || {};
  const r = { ...baseStats };
  for (const k of Object.keys(r)) r[k] = (r[k] || 0) + (b[k] || 0);
  return r;
};

