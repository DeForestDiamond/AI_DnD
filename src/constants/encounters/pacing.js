// ── Pacing knob ────────────────────────────────────────────────────────────────
// grace: turns with zero encounter chance. After that, chance = base + perTurn per turn, capped.
// perTurn is the key knob: a gentle slope means the chance climbs gradually
// instead of spiking to near-certainty a few turns past grace (which stacked
// encounters back-to-back). Ladder runs off → calm → sparse → normal → dangerous.
export const PACING = {
  off:       { label: '🚫 Encounters: Off',   grace: Infinity, base: 0,    perTurn: 0 },
  calm:      { label: '🕊️ Pacing: Calm',      grace: 8, base: 0.08, perTurn: 0.04 },
  sparse:    { label: '🍃 Pacing: Sparse',    grace: 6, base: 0.10, perTurn: 0.05 },
  normal:    { label: '⚖️ Pacing: Normal',    grace: 4, base: 0.12, perTurn: 0.07 },
  dangerous: { label: '⚔️ Pacing: Dangerous', grace: 3, base: 0.20, perTurn: 0.11 },
};
export const PACING_ORDER = ['off', 'calm', 'sparse', 'normal', 'dangerous'];

// Player-selected environment — drives which encounters can appear.
export const ENVIRONMENTS = [
  { id: 'wilderness', label: '🌲 Wilderness' },
  { id: 'city',       label: '🏛️ City' },
  { id: 'ocean',      label: '🌊 Ocean / Coast' },
  { id: 'underdark',  label: '🕳️ Underdark' },
  { id: 'avernus',    label: '🔥 Avernus' },
  { id: 'feywild',    label: '🍄 Feywild' },
  { id: 'astral',     label: '🌌 Astral Sea' },
  { id: 'shadowfell', label: '🌑 Shadowfell' },
  { id: 'fire',       label: '🔥 Plane of Fire' },
  { id: 'water',      label: '🌊 Plane of Water' },
  { id: 'air',        label: '🌬️ Plane of Air' },
  { id: 'earth',      label: '⛰️ Plane of Earth' },
  { id: 'limbo',      label: '🌀 Limbo' },
  { id: 'mechanus',   label: '⚙️ Mechanus' },
  { id: 'sigil',      label: '🚪 Sigil / Outlands' },
  { id: 'hells',      label: '😈 Nine Hells' },
  { id: 'abyss',      label: '🩸 Abyss' },
  { id: 'hades',      label: '🌫️ Gray Waste of Hades' },
  { id: 'gehenna',    label: '🌋 Gehenna' },
  { id: 'carceri',     label: '⛓️ Carceri' },
  { id: 'arborea',     label: '🌺 Arborea' },
  { id: 'ysgard',      label: '⚔️ Ysgard' },
  { id: 'celestia',    label: '✨ Mount Celestia' },
  { id: 'elysium',     label: '🌿 Elysium' },
  { id: 'ethereal',    label: '👻 Ethereal Plane' },
  { id: 'positive',    label: '☀️ Positive Energy Plane' },
  { id: 'negative',    label: '⚫ Negative Energy Plane' },
];

export const encounterChance = (turnsSince, pacing) => {
  const p = PACING[pacing] || PACING.normal;
  if (turnsSince < p.grace) return 0;
  return Math.min(0.9, p.base + (turnsSince - p.grace) * p.perTurn);
};

// ── Random-encounter CR ceiling ────────────────────────────────────────────────
// CR ratings assume a party of FOUR — this is solo play, so CR <= level runs hot.
// Levels also come fast early. The ceiling climbs at ~60% of level, saving the
// big monsters for the back half of the 1-20 journey:
//   lvl 1 → 1/2 | lvl 3 → 1 | lvl 5 → 3 | lvl 8 → 4 | lvl 10 → 6
//   lvl 13 → 7  | lvl 15 → 9 | lvl 17 → 10 | lvl 20 → 12
export const encounterCRCap = (level) => {
  const lvl = Math.max(1, level || 1);
  if (lvl <= 1) return 0.5;
  if (lvl <= 3) return 1;
  return Math.max(2, Math.floor(lvl * 0.6));
};

