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
      4: ['Arcane Eye', 'Elemental Bane', 'Fabricate', 'Freedom of Movement', 'Leomund\'s Secret Chest', 'Mordenkainen\'s Faithful Hound', 'Mordenkainen\'s Private Sanctum', 'Otiluke\'s Resilient Sphere', 'Stone Shape', 'Stoneskin', 'Summon Construct'],
      5: ['Animate Objects', 'Bigby\'s Hand', 'Creation', 'Greater Restoration', 'Skill Empowerment', 'Transmute Rock', 'Wall of Stone'],
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
      4: ['Banishment', 'Control Water', 'Death Ward', 'Divination', 'Freedom of Movement', 'Guardian of Faith', 'Locate Creature', 'Stone Shape'],
      5: ['Commune', 'Contagion', 'Dispel Evil and Good', 'Flame Strike', 'Geas', 'Greater Restoration', 'Hallow', 'Insect Plague', 'Mass Cure Wounds', 'Raise Dead', 'Scrying'],
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
      4: ['Arcane Eye', 'Banishment', 'Blight', 'Confusion', 'Dimension Door', 'Evard\'s Black Tentacles', 'Fire Shield', 'Greater Invisibility', 'Ice Storm', 'Phantasmal Killer', 'Polymorph', 'Stone Shape', 'Stoneskin', 'Wall of Fire'],
      5: ['Animate Objects', 'Bigby\'s Hand', 'Cloudkill', 'Cone of Cold', 'Conjure Elemental', 'Dominate Person', 'Geas', 'Hold Monster', 'Passwall', 'Scrying', 'Telekinesis', 'Teleportation Circle', 'Wall of Force', 'Wall of Stone'],
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

  Monk: {
    cantrips: [],
    spells: {
      1: ['Flurry of Blows', 'Patient Defense', 'Step of the Wind'],
      2: ['Stunning Strike', 'Ki-Empowered Strikes', 'Deflect Missiles'],
      3: ['Slow Fall', 'Extra Attack', 'Evasion'],
    },
    cantripsKnown: {},
    spellsKnown: { 1:2, 2:3, 3:3, 4:4, 5:4, 6:5, 7:5, 8:5, 9:6, 10:6 },
    infusionsKnown: {},
  },

  Barbarian: {
    cantrips: [],
    spells: {
      1: ['Rage', 'Unarmored Defense', 'Reckless Attack'],
      2: ['Danger Sense', 'Reckless Attack', 'Bear Totem - Resistance to all damage while raging'],
      3: ['Extra Attack', 'Fast Movement', 'Feral Instinct'],
    },
    cantripsKnown: {},
    spellsKnown: { 1:2, 2:3, 3:3, 4:4, 5:4, 6:5, 7:5, 8:5, 9:6, 10:6 },
    infusionsKnown: {},
  },

  Warlock: {
    cantrips: [
      'Eldritch Blast', 'Chill Touch', 'Minor Illusion',
      'Mage Hand', 'Prestidigitation', 'Toll the Dead',
      'Poison Spray', 'True Strike', 'Thunderclap',
    ],
    spells: {
      1: ['Armor of Agathys', 'Arms of Hadar', 'Charm Person', 'Comprehend Languages', 'Expeditious Retreat', 'Hellish Rebuke', 'Hex', 'Illusory Script', 'Protection from Evil and Good', 'Unseen Servant', 'Witch Bolt'],
      2: ['Cloud of Daggers', 'Crown of Madness', 'Darkness', 'Enthrall', 'Hold Person', 'Invisibility', 'Mirror Image', 'Misty Step', 'Ray of Enfeeblement', 'Shatter', 'Spider Climb', 'Suggestion'],
      3: ['Counterspell', 'Dispel Magic', 'Fear', 'Fly', 'Gaseous Form', 'Hunger of Hadar', 'Hypnotic Pattern', 'Magic Circle', 'Major Image', 'Remove Curse', 'Tongues', 'Vampiric Touch'],
      4: ['Banishment', 'Blight', 'Charm Monster', 'Dimension Door', 'Hallucinatory Terrain', 'Shadow of Moil', 'Summon Greater Demon'],
      5: ['Contact Other Plane', 'Danse Macabre', 'Dream', 'Enervation', 'Hold Monster', 'Infernal Calling', 'Negative Energy Flood', 'Scrying', 'Synaptic Static'],
    },
    cantripsKnown: { 1:2, 2:2, 3:2, 4:3, 5:3, 6:3, 7:3, 8:3, 9:3, 10:4 },
    spellsKnown: { 1:2, 2:3, 3:4, 4:5, 5:6, 6:7, 7:8, 8:9, 9:10, 10:11 },
    infusionsKnown: {},
  },

  Paladin: {
    cantrips: [],
    spells: {
      1: ['Lay on Hands', 'Divine Sense', 'Divine Smite', 'Bless', 'Command', 'Compelled Duel', 'Cure Wounds', 'Heroism', 'Protection from Evil and Good', 'Searing Smite', 'Shield of Faith', 'Thunderous Smite', 'Wrathful Smite'],
      2: ['Extra Attack', 'Aura of Protection', 'Aid', 'Branding Smite', 'Find Steed', 'Lesser Restoration', 'Magic Weapon', 'Zone of Truth'],
      3: ['Aura of Courage', 'Improved Divine Smite', 'Blinding Smite', 'Crusader\'s Mantle', 'Dispel Magic', 'Elemental Weapon', 'Remove Curse', 'Revivify'],
      4: ['Cleansing Touch', 'Aura of Life', 'Aura of Purity', 'Banishment', 'Death Ward', 'Find Greater Steed', 'Guardian of Faith', 'Staggering Smite'],
      5: ['Banishing Smite', 'Circle of Power', 'Destructive Wave', 'Dispel Evil and Good', 'Holy Weapon', 'Raise Dead'],
    },
    cantripsKnown: {},
    spellsKnown: { 1:2, 2:3, 3:4, 4:4, 5:5, 6:5, 7:6, 8:6, 9:7, 10:8 },
    infusionsKnown: {},
  },

  Ranger: {
    cantrips: [],
    spells: {
      1: ['Favored Enemy', 'Natural Explorer', 'Hunter\'s Mark', 'Absorb Elements', 'Cure Wounds', 'Ensnaring Strike', 'Fog Cloud', 'Goodberry', 'Hail of Thorns', 'Longstrider', 'Zephyr Strike'],
      2: ['Extra Attack', 'Primeval Awareness', 'Beast Sense', 'Cordon of Arrows', 'Lesser Restoration', 'Pass Without Trace', 'Silence', 'Spike Growth'],
      3: ['Land\'s Stride', 'Conjure Animals', 'Flame Arrows', 'Lightning Arrow', 'Nondetection', 'Plant Growth', 'Protection from Energy', 'Wind Wall'],
      4: ['Vanish', 'Conjure Woodland Beings', 'Freedom of Movement', 'Grasping Vine', 'Guardian of Nature', 'Locate Creature', 'Stoneskin'],
      5: ['Feral Senses', 'Foe Slayer', 'Commune with Nature', 'Conjure Volley', 'Steel Wind Strike', 'Swift Quiver', 'Tree Stride'],
    },
    cantripsKnown: {},
    spellsKnown: { 1:2, 2:3, 3:4, 4:4, 5:5, 6:5, 7:6, 8:6, 9:7, 10:8 },
    infusionsKnown: {},
  },

  'Blood Hunter': {
    cantrips: [],
    spells: {
      1: ['Crimson Rite - Rite of the Flame (fire damage)', 'Crimson Rite - Rite of the Frozen (cold damage)', 'Crimson Rite - Rite of the Storm (lightning damage)', 'Hunter\'s Bane', 'Blood Maledict - Haemorrhage'],
      2: ['Crimson Rite - Rite of the Dead (necrotic damage)', 'Blood Maledict - Sense Vitality', 'Brand of Castigation', 'Grim Psychometry'],
      3: ['Extra Attack', 'Brand of Tethering', 'Blood Maledict - Curse of the Eyeless', 'Blood Curse of Mutual Suffering'],
    },
    cantripsKnown: {},
    spellsKnown: { 1:3, 2:4, 3:5, 4:6, 5:7, 6:8, 7:9, 8:10, 9:11, 10:12 },
    infusionsKnown: {},
  },

  Illrigger: {
    cantrips: [],
    // Illrigger uses Invoke Hell (subclass abilities) and Interdict Boons, not traditional spells.
    // Spells list below represents Invoke Hell options and key class features available at level.
    spells: {
      1: ['Baleful Interdict', 'Forked Tongue', 'Command'],
      2: ['Combat Mastery', 'Interdiction', 'Abating Seal', 'Bedevil', 'Soul Eater', 'Styx\'s Apathy', 'Swift Retribution'],
      3: ['Invoke Hell', 'Diabolic Contract'],
      4: ['Ability Score Improvement'],
      5: ['Extra Attack'],
      6: ['Infernal Conduit - Invigorate', 'Infernal Conduit - Devour'],
      7: ['Acheron\'s Chain', 'Conflagrant Channel', 'Eyes of the Gate', 'Shadow Shroud', 'Unleash Hell', 'Vengeful Shot'],
    },
    cantripsKnown: {},
    spellsKnown: { 1:2, 2:5, 3:2, 4:1, 5:1, 6:2, 7:6, 8:0, 9:0, 10:1 },
    infusionsKnown: {},
  },
  Sorcerer: {
    cantrips: ['Acid Splash', 'Blade Ward', 'Booming Blade', 'Chill Touch', 'Control Flames', 'Create Bonfire', 'Dancing Lights', 'Fire Bolt', 'Friends', 'Frostbite', 'Green-Flame Blade', 'Light', 'Mage Hand', 'Mending', 'Message', 'Mind Sliver', 'Minor Illusion', 'Poison Spray', 'Prestidigitation', 'Ray of Frost', 'Shocking Grasp', 'Thunderclap', 'True Strike'],
    spells: {
      1: ['Burning Hands', 'Charm Person', 'Chromatic Orb', 'Color Spray', 'Comprehend Languages', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life', 'Feather Fall', 'Fog Cloud', 'Jump', 'Mage Armor', 'Magic Missile', 'Ray of Sickness', 'Shield', 'Silent Image', 'Sleep', 'Thunderwave', 'Witch Bolt'],
      2: ['Aganazzar\'s Scorcher', 'Alter Self', 'Blindness/Deafness', 'Blur', 'Cloud of Daggers', 'Crown of Madness', 'Darkness', 'Darkvision', 'Detect Thoughts', 'Enhance Ability', 'Enlarge/Reduce', 'Gust of Wind', 'Hold Person', 'Invisibility', 'Knock', 'Levitate', 'Mirror Image', 'Misty Step', 'Phantasmal Force', 'Scorching Ray', 'See Invisibility', 'Shatter', 'Spider Climb', 'Suggestion', 'Web'],
      3: ['Blink', 'Clairvoyance', 'Counterspell', 'Daylight', 'Dispel Magic', 'Fear', 'Fireball', 'Fly', 'Gaseous Form', 'Haste', 'Hypnotic Pattern', 'Lightning Bolt', 'Major Image', 'Protection from Energy', 'Sleet Storm', 'Slow', 'Stinking Cloud', 'Tongues', 'Wall of Water', 'Water Breathing'],
      4: ['Banishment', 'Blight', 'Confusion', 'Dimension Door', 'Greater Invisibility', 'Ice Storm', 'Polymorph', 'Stoneskin', 'Wall of Fire'],
      5: ['Animate Objects', 'Cloudkill', 'Cone of Cold', 'Dominate Person', 'Hold Monster', 'Insect Plague', 'Telekinesis', 'Wall of Stone'],
    },
    cantripsKnown: { 1:3, 2:3, 3:3, 4:4, 5:4, 6:4, 7:4, 8:4, 9:4, 10:5 },
    spellsKnown: { 1:2, 2:3, 3:4, 4:5, 5:6, 6:7, 7:8, 8:9, 9:10, 10:11 },
  },
  Druid: {
    cantrips: ['Control Flames', 'Create Bonfire', 'Druidcraft', 'Frostbite', 'Gust', 'Infestation', 'Magic Stone', 'Mending', 'Mold Earth', 'Poison Spray', 'Primal Savagery', 'Produce Flame', 'Resistance', 'Shape Water', 'Shillelagh', 'Thorn Whip', 'Thunderclap'],
    spells: {
      1: ['Animal Friendship', 'Charm Person', 'Create or Destroy Water', 'Cure Wounds', 'Detect Magic', 'Detect Poison and Disease', 'Entangle', 'Faerie Fire', 'Fog Cloud', 'Goodberry', 'Healing Word', 'Jump', 'Longstrider', 'Purify Food and Drink', 'Speak with Animals', 'Thunderwave'],
      2: ['Animal Messenger', 'Barkskin', 'Beast Sense', 'Darkvision', 'Enhance Ability', 'Find Traps', 'Flame Blade', 'Flaming Sphere', 'Gust of Wind', 'Heat Metal', 'Hold Person', 'Lesser Restoration', 'Locate Animals or Plants', 'Locate Object', 'Moonbeam', 'Pass Without Trace', 'Protection from Poison', 'Spike Growth'],
      3: ['Call Lightning', 'Conjure Animals', 'Daylight', 'Dispel Magic', 'Feign Death', 'Meld into Stone', 'Plant Growth', 'Protection from Energy', 'Sleet Storm', 'Speak with Plants', 'Wall of Water', 'Water Breathing', 'Water Walk', 'Wind Wall'],
      4: ['Blight', 'Confusion', 'Conjure Woodland Beings', 'Control Water', 'Freedom of Movement', 'Giant Insect', 'Ice Storm', 'Polymorph', 'Stone Shape', 'Stoneskin', 'Wall of Fire'],
      5: ['Antilife Shell', 'Awaken', 'Commune with Nature', 'Conjure Elemental', 'Geas', 'Greater Restoration', 'Insect Plague', 'Mass Cure Wounds', 'Reincarnate', 'Tree Stride', 'Wall of Stone'],
    },
    cantripsKnown: { 1:3, 2:3, 3:3, 4:4, 5:4, 6:4, 7:4, 8:4, 9:4, 10:5 },
    spellsKnown: { 1:2, 2:3, 3:4, 4:5, 5:6, 6:7, 7:8, 8:9, 9:10, 10:11 },
  },
};

// Get how many of each ability type a class gets at a given level (cumulative)
export const getAbilityCounts = (className, level) => {
  const cls = CLASS_ABILITIES[className];
  if (!cls) return { cantrips: 0, spells: 0, infusions: 0 };
  // Sum up all counts from level 1 to current level
  let cantrips = 0, spells = 0, infusions = 0;
  for (let l = 1; l <= level; l++) {
    cantrips  += cls.cantripsKnown?.[l]  || 0;
    spells    += cls.spellsKnown?.[l]    || 0;
    infusions += cls.infusionsKnown?.[l] || 0;
  }
  return { cantrips, spells, infusions };
};

// ── Deity domain spells ────────────────────────────────────────────────────────
// These are added on top of the standard cleric list when a deity is chosen.
// Domain spells are always prepared - they don't count against spell slots.
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
  'Kelemvor': {
    cantrips: ['Toll the Dead', 'Spare the Dying'],
    spells: {
      1: ['False Life', 'Ray of Sickness'],
      2: ['Gentle Repose', 'Ray of Enfeeblement'],
      3: ['Animate Dead', 'Speak with Dead'],
    },
  },
};

// ── Warlock patron spells ──────────────────────────────────────────────────────
// Warlocks pick a patron (via the same deity selection system as Clerics).
// These expand the available spell list based on patron.
export const WARLOCK_PATRON_SPELLS = {
  'The Archfey': {
    cantrips: ['Dancing Lights', 'Friends'],
    spells: {
      1: ['Faerie Fire', 'Sleep'],
      2: ['Calm Emotions', 'Phantasmal Force'],
      3: ['Blink', 'Plant Growth'],
    },
  },
  'The Great Old One': {
    cantrips: ['Mind Sliver', 'Guidance'],
    spells: {
      1: ['Dissonant Whispers', 'Tasha\'s Hideous Laughter'],
      2: ['Detect Thoughts', 'Phantasmal Force'],
      3: ['Clairvoyance', 'Sending'],
    },
  },
  'Asmodeus': {
    cantrips: ['Toll the Dead', 'Chill Touch'],
    spells: {
      1: ['Burning Hands', 'Command'],
      2: ['Scorching Ray', 'Suggestion'],
      3: ['Fireball', 'Stinking Cloud'],
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
  'Bane': {
    cantrips: ['Toll the Dead', 'Chill Touch'],
    spells: {
      1: ['Bane', 'Hellish Rebuke'],
      2: ['Crown of Madness', 'Hold Person'],
      3: ['Bestow Curse', 'Fear'],
    },
  },
  'Dendar the Night Serpent': {
    cantrips: ['Poison Spray', 'Thunderclap'],
    spells: {
      1: ['Cause Fear', 'Ray of Sickness'],
      2: ['Crown of Madness', 'Web'],
      3: ['Fear', 'Gaseous Form'],
    },
  },
};
export const getAvailableAbilities = (className, level, deity = null) => {
  const cls = CLASS_ABILITIES[className];
  if (!cls) return { cantrips: [], spells: [], infusions: [] };
  // Show all spells unlocked at or below current level
  const spells = [];
  for (let l = 1; l <= level; l++) {
    if (cls.spells?.[l]) spells.push(...cls.spells[l]);
  }

  const domainCantrips = [];
  // Cleric - merge deity domain spells
  if (className === 'Cleric' && deity) {
    const domain = DEITY_DOMAIN_SPELLS[deity];
    if (domain) {
      domainCantrips.push(...(domain.cantrips || []));
      for (let l = 1; l <= level; l++) {
        if (domain.spells?.[l]) spells.push(...domain.spells[l]);
      }
    }
  }
  // Warlock - merge patron spells
  if (className === 'Warlock' && deity) {
    const patron = WARLOCK_PATRON_SPELLS[deity];
    if (patron) {
      domainCantrips.push(...(patron.cantrips || []));
      for (let l = 1; l <= level; l++) {
        if (patron.spells?.[l]) spells.push(...patron.spells[l]);
      }
    }
  }

  const infusionKeys = Object.keys(cls.infusions || {}).map(Number).filter(k => k <= level);
  const infusions = infusionKeys.length > 0
    ? (cls.infusions[level] || cls.infusions[Math.max(...infusionKeys)] || [])
    : [];

  const domainSpells = className === 'Cleric' && deity
    ? Object.values(DEITY_DOMAIN_SPELLS[deity]?.spells || {}).flat()
    : className === 'Warlock' && deity
    ? Object.values(WARLOCK_PATRON_SPELLS[deity]?.spells || {}).flat()
    : [];

  return {
    cantrips:  [...new Set([...(cls.cantrips || []), ...domainCantrips])],
    spells:    [...new Set(spells)],
    infusions: infusions,
    domainCantrips,
    domainSpells,
  };
};
