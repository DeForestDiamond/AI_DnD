// ── Class abilities by level ───────────────────────────────────────────────────
// Defines what spells, cantrips, and infusions are available per class per level

export const CLASS_ABILITIES = {
  Artificer: {
    cantrips: [
      'Fire Bolt', 'Mending', 'Prestidigitation', 'Ray of Frost',
      'Shocking Grasp', 'Spare the Dying', 'Thorn Whip',
    ],
    infusions: {
      1: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot'],
      2: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night'],
      3: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night', 'Homunculus Servant'],
      4: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night', 'Homunculus Servant', 'Bag of Holding', 'Helm of Awareness'],
      5: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night', 'Homunculus Servant', 'Bag of Holding', 'Helm of Awareness', 'Arcane Propulsion Armor', 'Mind Sharpener'],
    },
    spells: {
      1: ['Cure Wounds', 'Detect Magic', 'Faerie Fire', 'False Life', 'Grease', 'Identify', 'Jump', 'Longstrider', 'Purify Food and Drink', 'Sanctuary', 'Shield of Faith', 'Thunderwave'],
      2: ['Aid', 'Alter Self', 'Arcane Lock', 'Blur', 'Continual Flame', 'Darkvision', 'Enhance Ability', 'Enlarge/Reduce', 'Heat Metal', 'Invisibility', 'Lesser Restoration', 'Levitate', 'Magic Mouth', 'Magic Weapon', 'Protection from Poison', 'Rope Trick', 'See Invisibility', 'Skywrite', 'Spider Climb', 'Web'],
      3: ['Blink', 'Catnap', 'Create Food and Water', 'Dispel Magic', 'Elemental Weapon', 'Fly', 'Glyph of Warding', 'Haste', 'Intellect Fortress', 'Protection from Energy', 'Revivify', 'Tiny Servant', 'Water Breathing', 'Water Walk'],
    },
    // Number of infusions known per level
    infusionsKnown: { 1:0, 2:4, 3:4, 4:4, 5:4, 6:6, 7:6, 8:6, 9:6, 10:8 },
    // Cantrips known
    cantripsKnown: { 1:2, 2:2, 3:2, 4:2, 5:2, 6:2, 7:2, 8:2, 9:2, 10:3 },
    // Spell slots (prepared spells = INT mod + half artificer level)
    spellsKnown: { 1:0, 2:2, 3:3, 4:3, 5:4, 6:4, 7:5, 8:5, 9:6, 10:6 },
  },

  Cleric: {
    cantrips: [
      'Guidance', 'Light', 'Mending', 'Resistance', 'Sacred Flame',
      'Spare the Dying', 'Thaumaturgy', 'Toll the Dead', 'Word of Radiance',
    ],
    spells: {
      1: ['Bless', 'Command', 'Create or Destroy Water', 'Cure Wounds', 'Detect Evil and Good', 'Detect Magic', 'Detect Poison and Disease', 'Guiding Bolt', 'Healing Word', 'Inflict Wounds', 'Protection from Evil and Good', 'Purify Food and Drink', 'Sanctuary', 'Shield of Faith'],
      2: ['Aid', 'Augury', 'Blindness/Deafness', 'Calm Emotions', 'Continual Flame', 'Enhance Ability', 'Find Traps', 'Gentle Repose', 'Hold Person', 'Lesser Restoration', 'Locate Object', 'Prayer of Healing', 'Protection from Poison', 'Silence', 'Spiritual Weapon', 'Warding Bond', 'Zone of Truth'],
      3: ['Animate Dead', 'Beacon of Hope', 'Bestow Curse', 'Clairvoyance', 'Create Food and Water', 'Daylight', 'Dispel Magic', 'Feign Death', 'Glyph of Warding', 'Magic Circle', 'Mass Healing Word', 'Meld into Stone', 'Protection from Energy', 'Remove Curse', 'Revivify', 'Sending', 'Speak with Dead', 'Spirit Guardians', 'Tongues', 'Water Walk'],
    },
    cantripsKnown: { 1:3, 2:3, 3:3, 4:4, 5:4, 6:4, 7:4, 8:4, 9:4, 10:5 },
    spellsKnown: { 1:2, 2:3, 3:4, 4:5, 5:6, 6:7, 7:8, 8:9, 9:10, 10:11 },
  },

  Wizard: {
    cantrips: [
      'Acid Splash', 'Blade Ward', 'Chill Touch', 'Control Flames',
      'Dancing Lights', 'Fire Bolt', 'Friends', 'Frostbite', 'Green-Flame Blade',
      'Light', 'Mage Hand', 'Mending', 'Message', 'Mind Sliver',
      'Minor Illusion', 'Poison Spray', 'Prestidigitation', 'Ray of Frost',
      'Shocking Grasp', 'Thunderclap', 'True Strike',
    ],
    spells: {
      1: ['Alarm', 'Burning Hands', 'Charm Person', 'Chromatic Orb', 'Color Spray', 'Comprehend Languages', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life', 'Feather Fall', 'Find Familiar', 'Fog Cloud', 'Grease', 'Ice Knife', 'Identify', 'Illusory Script', 'Jump', 'Longstrider', 'Mage Armor', 'Magic Missile', 'Protection from Evil and Good', 'Ray of Sickness', 'Shield', 'Silent Image', 'Sleep', 'Tasha\'s Hideous Laughter', 'Thunderwave', 'Unseen Servant', 'Witch Bolt'],
      2: ['Alter Self', 'Arcane Lock', 'Blindness/Deafness', 'Blur', 'Cloud of Daggers', 'Continual Flame', 'Crown of Madness', 'Darkness', 'Darkvision', 'Detect Thoughts', 'Enlarge/Reduce', 'Flaming Sphere', 'Gentle Repose', 'Hold Person', 'Invisibility', 'Knock', 'Levitate', 'Locate Object', 'Magic Mouth', 'Magic Weapon', 'Melf\'s Acid Arrow', 'Mirror Image', 'Misty Step', 'Nystul\'s Magic Aura', 'Phantasmal Force', 'Ray of Enfeeblement', 'Rope Trick', 'Scorching Ray', 'See Invisibility', 'Shatter', 'Spider Climb', 'Suggestion', 'Web'],
      3: ['Animate Dead', 'Bestow Curse', 'Blink', 'Clairvoyance', 'Counterspell', 'Dispel Magic', 'Erupting Earth', 'Fear', 'Feign Death', 'Fireball', 'Fly', 'Gaseous Form', 'Glyph of Warding', 'Haste', 'Hypnotic Pattern', 'Leomund\'s Tiny Hut', 'Lightning Bolt', 'Major Image', 'Nondetection', 'Phantom Steed', 'Protection from Energy', 'Remove Curse', 'Sending', 'Sleet Storm', 'Slow', 'Stinking Cloud', 'Tongues', 'Vampiric Touch', 'Water Breathing'],
    },
    cantripsKnown: { 1:3, 2:3, 3:3, 4:4, 5:4, 6:4, 7:4, 8:4, 9:4, 10:5 },
    spellsKnown: { 1:6, 2:8, 3:10, 4:12, 5:14, 6:16, 7:18, 8:20, 9:22, 10:24 },
  },

  Rogue: {
    // Rogues don't have spells by default but Arcane Trickster subclass does
    cantrips: [],
    spells: {},
    infusions: {},
    cantripsKnown: {},
    spellsKnown: {},
    infusionsKnown: {},
  },

  Fighter: {
    cantrips: [],
    spells: {},
    infusions: {},
    cantripsKnown: {},
    spellsKnown: {},
    infusionsKnown: {},
  },

  Illrigger: {
    cantrips: [],
    // Illrigger uses Invoke Hell (subclass abilities) and Interdict Boons, not traditional spells.
    // Spells list below represents Invoke Hell options and key class features available at level.
    spells: {
      1: ['Baleful Interdict', 'Forked Tongue'],
      2: ['Combat Mastery', 'Interdiction', 'Abating Seal', 'Bedevil', 'Soul Eater', 'Styx\'s Apathy', 'Swift Retribution'],
      3: ['Invoke Hell', 'Diabolic Contract'],
      4: ['Ability Score Improvement'],
      5: ['Extra Attack'],
      6: ['Infernal Conduit — Invigorate', 'Infernal Conduit — Devour'],
      7: ['Acheron\'s Chain', 'Conflagrant Channel', 'Eyes of the Gate', 'Shadow Shroud', 'Unleash Hell', 'Vengeful Shot'],
    },
    cantripsKnown: {},
    spellsKnown: { 1:2, 2:5, 3:2, 4:1, 5:1, 6:2, 7:6, 8:0, 9:0, 10:1 },
    infusionsKnown: {},
  },
};

// Get how many of each ability type a class gets at a given level
export const getAbilityCounts = (className, level) => {
  const cls = CLASS_ABILITIES[className];
  if (!cls) return { cantrips: 0, spells: 0, infusions: 0 };
  return {
    cantrips:  cls.cantripsKnown?.[level]  || 0,
    spells:    cls.spellsKnown?.[level]    || 0,
    infusions: cls.infusionsKnown?.[level] || 0,
  };
};

// ── Deity domain spells ────────────────────────────────────────────────────────
// These are added on top of the standard cleric list when a deity is chosen.
// Domain spells are always prepared — they don't count against spell slots.
export const DEITY_DOMAIN_SPELLS = {
  'Selûne': {
    cantrips: ['Dancing Lights', 'Minor Illusion'],
    spells: {
      1: ['Faerie Fire', 'Sleep'],
      2: ['Moonbeam', 'See Invisibility'],
      3: ['Hypnotic Pattern', 'Nondetection'],
    },
  },
  'Lathander': {
    cantrips: ['Light', 'Spare the Dying'],
    spells: {
      1: ['Burning Hands', 'Faerie Fire'],
      2: ['Flaming Sphere', 'Scorching Ray'],
      3: ['Daylight', 'Fireball'],
    },
  },
  'Tempus': {
    cantrips: ['Booming Blade', 'Shillelagh'],
    spells: {
      1: ['Divine Favor', 'Shield of Faith'],
      2: ['Magic Weapon', 'Spiritual Weapon'],
      3: ['Crusader\'s Mantle', 'Spirit Guardians'],
    },
  },
  'Helm': {
    cantrips: ['Guidance', 'Resistance'],
    spells: {
      1: ['Alarm', 'Protection from Evil and Good'],
      2: ['Arcane Lock', 'Warding Bond'],
      3: ['Glyph of Warding', 'Magic Circle'],
    },
  },
  'Mystra': {
    cantrips: ['Mage Hand', 'Prestidigitation'],
    spells: {
      1: ['Detect Magic', 'Magic Missile'],
      2: ['Magic Weapon', 'Nystul\'s Magic Aura'],
      3: ['Dispel Magic', 'Magic Circle'],
    },
  },
  'Bane': {
    cantrips: ['Toll the Dead', 'Chill Touch'],
    spells: {
      1: ['Bane', 'Hellish Rebuke'],
      2: ['Crown of Madness', 'Darkness'],
      3: ['Bestow Curse', 'Fear'],
    },
  },
  'Shar': {
    cantrips: ['Minor Illusion', 'Chill Touch'],
    spells: {
      1: ['Bane', 'Disguise Self'],
      2: ['Darkness', 'Pass Without Trace'],
      3: ['Nondetection', 'Hunger of Hadar'],
    },
  },
};

// Get available options at a given level, optionally merged with deity domains
export const getAvailableAbilities = (className, level, deity = null) => {
  const cls = CLASS_ABILITIES[className];
  if (!cls) return { cantrips: [], spells: [], infusions: [] };
  const spellLevel = Math.ceil(level / 2);
  const spells = [];
  for (let l = 1; l <= spellLevel; l++) {
    if (cls.spells?.[l]) spells.push(...cls.spells[l]);
  }

  // Merge deity domain spells for clerics
  const domainCantrips = [];
  if (className === 'Cleric' && deity) {
    const domain = DEITY_DOMAIN_SPELLS[deity];
    if (domain) {
      domainCantrips.push(...(domain.cantrips || []));
      for (let l = 1; l <= spellLevel; l++) {
        if (domain.spells?.[l]) spells.push(...domain.spells[l]);
      }
    }
  }

  const infusionKeys = Object.keys(cls.infusions || {}).map(Number).filter(k => k <= level);
  const infusions = infusionKeys.length > 0
    ? (cls.infusions[level] || cls.infusions[Math.max(...infusionKeys)] || [])
    : [];
  return {
    cantrips:  [...new Set([...(cls.cantrips || []), ...domainCantrips])],
    spells:    [...new Set(spells)],
    infusions: infusions,
    domainCantrips,  // exposed so modal can label them
    domainSpells: className === 'Cleric' && deity
      ? Object.values(DEITY_DOMAIN_SPELLS[deity]?.spells || {}).flat()
      : [],
  };
};
