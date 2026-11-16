import { reconcileFeatSources } from './feats.js';
import { EMPTY_CHAR } from '../hooks/character/defaults.js';
import { ABILITY_KEYS, effectiveMaxHp } from '../hooks/character/items.js';
import { applyRaceBonus, calcMaxHp, statMod } from '../hooks/character/stats.js';
import { ITEM_DB, EMPTY_SLOTS } from '../constants/items.js';
import { STARTING_GEAR } from '../constants/classes.js';
import { SAVE_VERSION } from '../constants/progression.js';
import { normalizeStacks, stackNames } from '../utils/itemStacks.js';

export const CARRY_OPTIONS = [
  ['inventory', 'Carried inventory and bags'], ['equipment', 'Equipped gear'],
  ['stash', 'Stash and stored bags'], ['money', 'Carried and banked money'],
  ['companions', 'Companions and their equipment'], ['npcs', 'NPC records'],
  ['towns', 'Town and location records'], ['directives', 'Standing instructions'],
  ['storySettings', 'Story structure, tone, and encounter settings'],
  ['completed', 'Completed adventure and antagonist draw exclusions'],
];
export const startingStats = (race, cls) => applyRaceBonus(cls?.stats || {}, race);

// Walk only retained ownership roots. Orphan bags must not keep their old
// contents alive, and nested bags/custom companion gear must not lose definitions.
export const retainedItemDefinitions = (character, definitions) => {
  const pending = [...stackNames(character.inventory), ...stackNames(character.stash),
    ...Object.values(character.slots || {}),
    ...Object.values(character.companions || {}).flatMap(c=>Object.values(c.slots || {}))].filter(Boolean);
  const result = {};
  const visited = new Set();
  while (pending.length) {
    const name = pending.pop();
    if (visited.has(name)) continue;
    visited.add(name);
    const data = definitions[name] || ITEM_DB[name];
    if (!data) continue;
    result[name] = structuredClone(data);
    if (data.type === 'bag') pending.push(...stackNames(normalizeStacks(data.contents || {})));
  }
  return result;
};

// Pure, atomic draft application. New characters are allowlisted from an empty
// sheet so old arcs, pressures, location, abilities and hidden state cannot leak.
export const buildCharacterRevision = (source, options) => {
  const { mode = 'edit', race, cls, keep = {}, keepXp = true } = options;
  if (!['edit','fresh','carry'].includes(mode)) throw new Error('Choose a character action.');
  if (!race?.name || !cls?.name) throw new Error('Choose a race and class.');
  if (!options.name?.trim()) throw new Error('Enter a character name.');
  const editing = mode === 'edit';
  const reset = !editing || options.resetLevels || cls.name !== source.cls?.name;
  let next = structuredClone(editing ? source : EMPTY_CHAR);
  if (!editing) {
    if (mode === 'carry') {
      for (const key of ['inventory','stash','companions','npcs','towns','directives']) {
        if (keep[key]) next[key] = structuredClone(source[key] ?? next[key]);
      }
      if (keep.equipment) next.slots = structuredClone(source.slots || EMPTY_SLOTS);
      if (keep.money) { next.coins = source.coins || 0; next.bankedCoins = source.bankedCoins || 0; }
      if (keep.storySettings) for (const key of ['storyMode','fantasyTone','combatFirst','pacing','environment']) {
        if (source[key] !== undefined) next[key] = structuredClone(source[key]);
      }
      if (keep.completed) for (const key of ['completedAdventures','defeatedAntagonists']) next[key] = structuredClone(source[key] || []);
      for (const key of ['companions','npcs','towns']) if (keep[key]) next.contextExclusions[key] = structuredClone(source.contextExclusions?.[key] || {});
    }
    if (options.startingGear && !(mode === 'carry' && (keep.inventory || keep.equipment))) {
      const gear = STARTING_GEAR[cls.name] || {slots:EMPTY_SLOTS, inventory:[]};
      next.slots = structuredClone(gear.slots);
      next.inventory = normalizeStacks(gear.inventory);
    }
    next.items = retainedItemDefinitions(next, mode === 'carry' ? source.items || {} : {});
  }
  const stats = options.stats || (reset ? startingStats(race, cls) : Object.fromEntries(ABILITY_KEYS.map(key=>[
    key, (source.stats?.[key] || 10) - (source.race?.bonus?.[key] || 0) + (race.bonus?.[key] || 0),
  ])));
  if (ABILITY_KEYS.some(key=>!Number.isInteger(Number(stats[key])) || Number(stats[key]) < 1 || Number(stats[key]) > 100)) {
    throw new Error('Each ability score must be a whole number from 1 to 100.');
  }
  Object.assign(next, {
    _v:SAVE_VERSION, name:options.name.trim(), race:structuredClone(race), cls:structuredClone(cls),
    deity:structuredClone(options.deity ?? null), stats:Object.fromEntries(ABILITY_KEYS.map(key=>[key,Number(stats[key])])),
    bio:options.bio ?? next.bio, appearance:options.appearance ?? next.appearance,
    disposition:structuredClone(options.disposition ?? next.disposition),
    xp:mode === 'fresh' || !keepXp ? 0 : Math.max(0, source.xp || 0),
  });
  const divineClasses = reset ? [cls.name] : Object.keys(next.classLevels || {[cls.name]:1});
  if (divineClasses.some(name=>['Cleric','Paladin','Warlock'].includes(name)) && !next.deity) throw new Error('Choose a deity or patron.');
  delete next._needsDeitySelection;
  if (reset) {
    next.level = 1;
    next.classLevels = {[cls.name]:1};
    next.subclasses = {};
    next.feats = [];
    next.abilities = structuredClone(EMPTY_CHAR.abilities);
    next.maxHp = Math.max(1, calcMaxHp(cls.name, next.stats.con, 1));
    next.hp = effectiveMaxHp(next);
  } else {
    next = reconcileFeatSources(next);
    next.maxHp = Math.max(1, source.maxHp + (statMod(next.stats.con) - statMod(source.stats.con)) * source.level);
    const ratio = Math.min(1, Math.max(0, source.hp / effectiveMaxHp(source)));
    next.hp = Math.round(ratio * effectiveMaxHp(next));
  }
  return next;
};

export const characterEditNote = (before, after) => {
  const profile = ['bio','appearance','disposition','subclasses','abilities','feats'].filter(key=>JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map(key=>`${key}: ${JSON.stringify(after[key])}`).join('; ');
  return `CORRECTION — OOC CHARACTER SHEET UPDATE: ${before.name} is now named ${after.name}; race ${after.race.name}; primary class ${after.cls.name}; level ${after.level}; class levels ${JSON.stringify(after.classLevels)}; XP ${after.xp}; ability scores ${JSON.stringify(after.stats)}; deity/patron ${after.deity?.name || 'none'}.${profile ? ` Updated profile/choices: ${profile}.` : ''} The current character sheet, bio, appearance, and disposition are authoritative. Apply these player-authored edits to future play and campaign memory; older descriptions or mechanical values are superseded. This is an out-of-character edit, not an action, conversation, or time passage in the world.`;
};
