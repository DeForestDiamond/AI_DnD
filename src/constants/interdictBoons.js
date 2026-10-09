// App class levels compress the revised Illrigger's 20 levels into 10.
// Unlocks use ceil(rules level / 2), based on Illrigger level, not total level.
export const INTERDICT_BOONS = {
  'Abating Seal': { level:1, desc:'Reaction, spend a seal: reduce incoming damage to you or a nearby ally.' },
  'Bedevil': { level:1, desc:'Burn a seal: penalize the target’s next save.' },
  'Soul Eater': { level:1, desc:'Burn a seal: gain temporary HP equal to Illrigger level.' },
  "Styx's Apathy": { level:1, desc:'Reaction on burning a seal: suppress target reactions.' },
  'Swift Retribution': { level:1, desc:'Passive: one opportunity attack against a sealed enemy without spending your reaction each round.' },
  "Acheron's Chain": { level:4, desc:'Place/move a seal: pull or grapple the target.' },
  'Conflagrant Channel': { level:4, desc:'Bonus action, spend a seal: teleport 60 feet.' },
  'Eyes of the Gate': { level:4, desc:'Spend seals: share target senses and channel interdict through them.' },
  'Shadow Shroud': { level:4, desc:'Bonus action, spend a seal: +2 AC for one minute.' },
  'Unleash Hell': { level:4, desc:'Reaction on burning seals: splash their damage nearby.' },
  'Vengeful Shot': { level:4, desc:'Reaction, spend a seal: retaliate against ranged attacks.' },
  "Dis's Onslaught": { level:7, desc:'Passive: attack while placing/moving a seal.' },
  'Flash of Brimstone': { level:7, desc:'Place/move a seal: teleport beside the target.' },
  'Hellish Frenzy': { level:7, desc:'Spend a seal near a sealed enemy: speed, AC, and attack boost.' },
  'Hellsight': { level:7, desc:'Action, spend a seal: truesight.' },
  'Impaling Shot': { level:7, desc:'Ranged hit, spend a seal: lower target AC.' },
  'Iron Gaol': { level:7, desc:'Action, spend four seals: banish a touched target to Hell.' },
  'Last Word': { level:7, desc:'At zero HP, spend seals: explode and potentially recover HP.' },
  "Soul's Doom": { level:7, desc:'Place/move a seal: add damage whenever the target takes damage.' },
};

export const interdictBoonCount = level =>
  level >= 9 ? 4 : level >= 7 ? 3 : level >= 4 ? 2 : level >= 1 ? 1 : 0;

export const availableInterdictBoons = level =>
  Object.keys(INTERDICT_BOONS).filter(name => INTERDICT_BOONS[name].level <= level);

// Preserve older selections that lived in Techniques (or the old Spells bucket).
// Do not silently drop excess legacy choices; the picker allows removing them.
export function normalizeInterdictAbilities(abilities = {}, classLevels = {}) {
  if (!classLevels.Illrigger) return abilities;
  const legacy = [...(abilities.martial || []), ...(abilities.spells || [])]
    .filter(name => INTERDICT_BOONS[name]);
  return {
    ...abilities,
    martial: (abilities.martial || []).filter(name => !INTERDICT_BOONS[name]),
    spells: (abilities.spells || []).filter(name => !INTERDICT_BOONS[name]),
    interdictBoons: [...new Set([...(abilities.interdictBoons || []), ...legacy])],
  };
}
