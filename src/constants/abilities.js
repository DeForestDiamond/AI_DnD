import { SUBCLASS_CASTERS, SUBCLASS_EXPANDED_SPELLS, subclassBonusSpells, spellsThrough } from './subclassAbilities.js';
// ── Class abilities by level ───────────────────────────────────────────────────
// Defines what spells, cantrips, and infusions are available per class per level

export const CLASS_ABILITIES = {
  Artificer: {
    cantrips: [
      'Fire Bolt', 'Mending', 'Prestidigitation', 'Ray of Frost',
      'Shocking Grasp', 'Spare the Dying', 'Thorn Whip',
    ],
    martial: {
      1: ['Magical Tinkering', 'Infuse Item'],
      2: ['The Right Tool for the Job'],
      3: ['Tool Expertise'],
      4: ['Flash of Genius'],
      5: ['Magic Item Adept'],
      6: ['Spell-Storing Item'],
      7: ['Magic Item Savant'],
      8: ['Improved Infusions'],
      9: ['Magic Item Master'],
      10: ['Soul of Artifice'],
    },
    martialKnown: { 1: 2, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 },
    infusions: {
      1: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot'],
      2: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night'],
      3: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night', 'Homunculus Servant'],
      4: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night', 'Homunculus Servant', 'Bag of Holding', 'Helm of Awareness'],
      5: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night', 'Homunculus Servant', 'Bag of Holding', 'Helm of Awareness', 'Arcane Propulsion Armor', 'Mind Sharpener'],
      6: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night', 'Homunculus Servant', 'Bag of Holding', 'Helm of Awareness', 'Arcane Propulsion Armor', 'Mind Sharpener', 'Radiant Weapon', 'Repulsion Shield'],
      7: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night', 'Homunculus Servant', 'Bag of Holding', 'Helm of Awareness', 'Arcane Propulsion Armor', 'Mind Sharpener', 'Radiant Weapon', 'Repulsion Shield', 'Resistant Armor', 'Returning Weapon'],
      8: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night', 'Homunculus Servant', 'Bag of Holding', 'Helm of Awareness', 'Arcane Propulsion Armor', 'Mind Sharpener', 'Radiant Weapon', 'Repulsion Shield', 'Resistant Armor', 'Returning Weapon', 'Spell-Refueling Ring', 'Armor of Magical Strength'],
      9: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night', 'Homunculus Servant', 'Bag of Holding', 'Helm of Awareness', 'Arcane Propulsion Armor', 'Mind Sharpener', 'Radiant Weapon', 'Repulsion Shield', 'Resistant Armor', 'Returning Weapon', 'Spell-Refueling Ring', 'Armor of Magical Strength', 'Winged Boots'],
      10: ['Enhanced Weapon', 'Enhanced Defense', 'Repeating Shot', 'Boots of the Winding Path', 'Goggles of Night', 'Homunculus Servant', 'Bag of Holding', 'Helm of Awareness', 'Arcane Propulsion Armor', 'Mind Sharpener', 'Radiant Weapon', 'Repulsion Shield', 'Resistant Armor', 'Returning Weapon', 'Spell-Refueling Ring', 'Armor of Magical Strength', 'Winged Boots', 'Cloak of Elvenkind'],
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
      6: ['Heal', 'Harm', 'Blade Barrier', 'Word of Recall', 'True Seeing', 'Forbiddance', 'Planar Ally'],
      7: ['Resurrection', 'Divine Word', 'Fire Storm', 'Conjure Celestial', 'Regenerate', 'Etherealness'],
      8: ['Holy Aura', 'Antimagic Field', 'Earthquake', 'Control Weather'],
      9: ['True Resurrection', 'Mass Heal', 'Gate', 'Astral Projection'],
      10: ['Divine Intervention'],
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
      6: ['Disintegrate', 'Chain Lightning', 'True Seeing', 'Globe of Invulnerability', 'Flesh to Stone', 'Contingency', 'Circle of Death', 'Arcane Gate'],
      7: ['Teleport', 'Finger of Death', 'Forcecage', 'Plane Shift', 'Prismatic Spray', 'Reverse Gravity', 'Simulacrum', 'Mirage Arcane'],
      8: ['Power Word Stun', 'Dominate Monster', 'Maze', 'Feeblemind', 'Sunburst', 'Clone', 'Antimagic Field', 'Demiplane'],
      9: ['Wish', 'Meteor Swarm', 'Time Stop', 'Power Word Kill', 'True Polymorph', 'Gate', 'Foresight', 'Imprisonment', 'Astral Projection', 'Shapechange'],
      10: ['Spell Mastery', 'Signature Spells'],
    },
    cantripsKnown: { 1:3, 2:3, 3:3, 4:4, 5:4, 6:4, 7:4, 8:4, 9:4, 10:5 },
    spellsKnown: { 1:6, 2:8, 3:10, 4:12, 5:14, 6:16, 7:18, 8:20, 9:22, 10:24 },
  },

  Rogue: {
    // Rogues don't have spells by default but Arcane Trickster subclass does
    cantrips: [],
    martial: {
      1: ['Expertise', 'Sneak Attack', "Thieves' Cant", 'Cunning Action - Dash, Disengage or Hide as a bonus action'],
      2: ['Steady Aim', 'Fast Hands'],
      3: ['Uncanny Dodge', 'Expertise (2)'],
      4: ['Evasion'],
      5: ['Second-Story Work'],
      6: ['Reliable Talent'],
      7: ['Blindsense'],
      8: ['Slippery Mind'],
      9: ['Elusive'],
      10: ['Stroke of Luck'],
    },
    martialKnown: { 1: 3, 2: 2, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 },
  },

  Fighter: {
    cantrips: [],
    martial: {
      1: ['Fighting Style - Archery', 'Fighting Style - Defense', 'Fighting Style - Dueling', 'Fighting Style - Great Weapon Fighting', 'Fighting Style - Protection', 'Fighting Style - Two-Weapon Fighting', 'Second Wind', 'Action Surge'],
      2: ['Martial Adept', 'Improved Critical'],
      3: ['Extra Attack', 'Remarkable Athlete'],
      4: ['Indomitable'],
      5: ['Additional Fighting Style', 'Superior Critical'],
      6: ['Extra Attack (2)'],
      7: ['Indomitable (2)', 'Relentless'],
      8: ['Action Surge (2)'],
      9: ['Survivor'],
      10: ['Extra Attack (3)'],
    },
    martialKnown: { 1: 3, 2: 2, 3: 2, 4: 1, 5: 2, 6: 1, 7: 2, 8: 1, 9: 1, 10: 1 },
  },

  Monk: {
    cantrips: [],
    martial: {
      1: ['Martial Arts', 'Unarmored Defense', 'Flurry of Blows', 'Patient Defense', 'Step of the Wind'],
      2: ['Deflect Missiles', 'Slow Fall'],
      3: ['Extra Attack', 'Stunning Strike', 'Ki-Empowered Strikes'],
      4: ['Evasion', 'Stillness of Mind'],
      5: ['Unarmored Movement', 'Purity of Body'],
      6: ['Quickened Healing', 'Focused Aim'],
      7: ['Tongue of the Sun and Moon', 'Diamond Soul'],
      8: ['Timeless Body'],
      9: ['Empty Body'],
      10: ['Perfect Self'],
    },
    martialKnown: { 1: 3, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 1, 9: 1, 10: 1 },
    cantripsKnown: {},
    martialKnown: { 1:2, 2:3, 3:3, 4:4, 5:4, 6:5, 7:5, 8:5, 9:6, 10:6 },
    infusionsKnown: {},
  },

  Barbarian: {
    cantrips: [],
    martial: {
      1: ['Rage', 'Unarmored Defense', 'Reckless Attack'],
      2: ['Danger Sense', 'Bear Totem - Resistance to all damage while raging'],
      3: ['Extra Attack', 'Fast Movement'],
      4: ['Feral Instinct'],
      5: ['Brutal Critical', 'Wolf Totem'],
      6: ['Relentless Rage'],
      7: ['Mindless Rage', 'Brutal Critical (2)'],
      8: ['Persistent Rage'],
      9: ['Indomitable Might - Strength checks can never roll below your Strength score'],
      10: ['Primal Champion'],
    },
    martialKnown: { 1: 3, 2: 2, 3: 2, 4: 1, 5: 2, 6: 1, 7: 2, 8: 1, 9: 1, 10: 1 },
    cantripsKnown: {},
    martialKnown: { 1:2, 2:3, 3:3, 4:4, 5:4, 6:5, 7:5, 8:5, 9:6, 10:6 },
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
      6: ['Mystic Arcanum - Chain Lightning', 'Mystic Arcanum - Circle of Death', 'Mystic Arcanum - True Seeing'],
      7: ['Mystic Arcanum - Finger of Death', 'Mystic Arcanum - Forcecage', 'Mystic Arcanum - Plane Shift'],
      8: ['Mystic Arcanum - Dominate Monster', 'Mystic Arcanum - Feeblemind', 'Mystic Arcanum - Maze'],
      9: ['Mystic Arcanum - Power Word Kill', 'Mystic Arcanum - Imprisonment', 'Mystic Arcanum - True Polymorph'],
      10: ['Eldritch Master'],
    },
    cantripsKnown: { 1:2, 2:2, 3:2, 4:3, 5:3, 6:3, 7:3, 8:3, 9:3, 10:4 },
    spellsKnown: { 1:2, 2:3, 3:4, 4:5, 5:6, 6:7, 7:8, 8:9, 9:10, 10:11 },
    infusionsKnown: {},
  },

  Paladin: {
    cantrips: [],
    martial: {
      1: ['Divine Sense', 'Lay on Hands', 'Fighting Style - Defense', 'Fighting Style - Dueling', 'Fighting Style - Great Weapon Fighting', 'Fighting Style - Protection'],
      2: ['Divine Smite', 'Divine Health'],
      3: ['Channel Divinity'],
      4: ['Extra Attack', 'Aura of Protection'],
      5: ['Aura of Courage'],
      6: ['Improved Divine Smite'],
      7: ['Cleansing Touch'],
      8: ['Aura Expansion'],
      9: ['Undying Sentinel'],
      10: ['Avatar of the Oath'],
    },
    martialKnown: { 1: 3, 2: 2, 3: 1, 4: 2, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 },
    spells: {
      1: ['Bless', 'Command', 'Compelled Duel', 'Cure Wounds', 'Heroism', 'Protection from Evil and Good', 'Searing Smite', 'Shield of Faith', 'Thunderous Smite', 'Wrathful Smite'],
      2: ['Aid', 'Branding Smite', 'Find Steed', 'Lesser Restoration', 'Magic Weapon', 'Zone of Truth'],
      3: ['Blinding Smite', "Crusader's Mantle", 'Dispel Magic', 'Elemental Weapon', 'Remove Curse', 'Revivify'],
      4: ['Aura of Life', 'Aura of Purity', 'Banishment', 'Death Ward', 'Find Greater Steed', 'Guardian of Faith', 'Staggering Smite'],
      5: ['Banishing Smite', 'Circle of Power', 'Destructive Wave', 'Dispel Evil and Good', 'Holy Weapon', 'Raise Dead'],
    },
    cantripsKnown: {},
    martialKnown: { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 },
    spellsKnown: { 1:2, 2:3, 3:4, 4:4, 5:5, 6:5, 7:6, 8:6, 9:7, 10:8 },
    infusionsKnown: {},
  },

  Ranger: {
    cantrips: [],
    martial: {
      1: ['Favored Enemy', 'Natural Explorer', 'Fighting Style - Archery', 'Fighting Style - Defense', 'Fighting Style - Two-Weapon Fighting'],
      2: ['Primeval Awareness'],
      3: ['Extra Attack', 'Favored Enemy (2)'],
      4: ["Land's Stride"],
      5: ['Hide in Plain Sight'],
      6: ['Natural Explorer (2)'],
      7: ['Vanish'],
      8: ['Favored Enemy (3)'],
      9: ['Feral Senses'],
      10: ['Foe Slayer'],
    },
    martialKnown: { 1: 3, 2: 1, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 },
    spells: {
      1: ["Hunter's Mark", 'Absorb Elements', 'Cure Wounds', 'Ensnaring Strike', 'Fog Cloud', 'Goodberry', 'Hail of Thorns', 'Longstrider', 'Zephyr Strike'],
      2: ['Beast Sense', 'Cordon of Arrows', 'Lesser Restoration', 'Pass Without Trace', 'Silence', 'Spike Growth'],
      3: ['Conjure Animals', 'Flame Arrows', 'Lightning Arrow', 'Nondetection', 'Plant Growth', 'Protection from Energy', 'Wind Wall'],
      4: ['Conjure Woodland Beings', 'Freedom of Movement', 'Grasping Vine', 'Guardian of Nature', 'Locate Creature', 'Stoneskin'],
      5: ['Commune with Nature', 'Conjure Volley', 'Steel Wind Strike', 'Swift Quiver', 'Tree Stride'],
    },
    cantripsKnown: {},
    martialKnown: { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1 },
    spellsKnown: { 1:2, 2:3, 3:4, 4:4, 5:5, 6:5, 7:6, 8:6, 9:7, 10:8 },
    infusionsKnown: {},
  },

  'Blood Hunter': {
    cantrips: [],
    martial: {
      1: ["Hunter's Bane", 'Crimson Rite - Rite of the Flame (fire damage)', 'Crimson Rite - Rite of the Frozen (cold damage)'],
      2: ['Blood Maledict - Haemorrhage', 'Crimson Rite - Rite of the Storm (lightning damage)'],
      3: ['Blood Maledict - Sense Vitality', 'Brand of Castigation'],
      4: ['Crimson Rite - Rite of the Dead (necrotic damage)', 'Grim Psychometry'],
      5: ['Extra Attack', 'Dark Augmentation'],
      6: ['Blood Maledict - Curse of the Eyeless', 'Blood Curse of Mutual Suffering'],
      7: ['Brand of Tethering', 'Crimson Rite - Rite of the Dawn (radiant damage)'],
      8: ['Blood Curse of the Fallen Puppet', 'Blood Curse of Bloated Agony'],
      9: ['Crimson Rite - Rite of the Roar (thunder damage)', 'Blood Curse of Corrosion', 'Blood Curse of the Exorcist'],
      10: ['Sanguine Mastery', 'Hardened Soul'],
    },
    martialKnown: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 1, 8: 1, 9: 2, 10: 2 },
    cantripsKnown: {},
    martialKnown: { 1:3, 2:4, 3:5, 4:6, 5:7, 6:8, 7:9, 8:10, 9:11, 10:12 },
    infusionsKnown: {},
  },

  Illrigger: {
    cantrips: [],
    martial: {
      1: ['Baleful Interdict', 'Forked Tongue', 'Combat Mastery', 'Interdiction'],
      2: ['Diabolic Contract', 'Invoke Hell'],
      3: ['Extra Attack', 'Infernal Conduit - Invigorate', 'Infernal Conduit - Devour'],
      5: ['Blood Price'],
      6: ['Terrorizing Force'],
      7: ['Superior Interdict'],
      9: ['Infernal Majesty'],
      10: ['Master of Hell'],
    },
    martialKnown: { 1:4, 2:2, 3:3, 5:1, 6:1, 7:1, 9:1, 10:1 },
    cantripsKnown: {},
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
      6: ['Disintegrate', 'Chain Lightning', 'True Seeing', 'Globe of Invulnerability', 'Arcane Gate', 'Sunbeam'],
      7: ['Teleport', 'Finger of Death', 'Plane Shift', 'Prismatic Spray', 'Reverse Gravity', 'Delayed Blast Fireball'],
      8: ['Power Word Stun', 'Dominate Monster', 'Sunburst', 'Earthquake', 'Incendiary Cloud'],
      9: ['Wish', 'Meteor Swarm', 'Time Stop', 'Power Word Kill', 'Gate'],
      10: ['Sorcerous Restoration', 'Arcane Apotheosis'],
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
      6: ['Heal', 'Heroes\' Feast', 'Sunbeam', 'Wall of Thorns', 'Transport via Plants', 'Find the Path'],
      7: ['Fire Storm', 'Regenerate', 'Reverse Gravity', 'Plane Shift', 'Mirage Arcane'],
      8: ['Earthquake', 'Control Weather', 'Animal Shapes', 'Sunburst', 'Feeblemind'],
      9: ['Shapechange', 'True Resurrection', 'Storm of Vengeance', 'Foresight'],
      10: ['Archdruid'],
    },
    cantripsKnown: { 1:3, 2:3, 3:3, 4:4, 5:4, 6:4, 7:4, 8:4, 9:4, 10:5 },
    spellsKnown: { 1:2, 2:3, 3:4, 4:5, 5:6, 6:7, 7:8, 8:9, 9:10, 10:11 },
  },

  Bard: {
    cantrips:['Dancing Lights','Friends','Light','Mage Hand','Mending','Message','Minor Illusion','Prestidigitation','True Strike','Vicious Mockery'],
    martial:{1:['Bardic Inspiration (d6)','Jack of All Trades'],2:['Song of Rest','Expertise'],3:['Font of Inspiration','Bardic Inspiration (d8)'],4:['Countercharm'],5:['Magical Secrets','Bardic Inspiration (d10)'],6:['Additional Expertise','Additional Magical Secrets'],7:['Bardic Inspiration (d12)','Improved Song of Rest'],8:['Additional Magical Secrets'],9:['Superior Inspiration'],10:['Peerless Bard','Bardic Inspiration (d12)','Magical Secrets Mastery','Superior Inspiration Perfected']},
    martialKnown:{1:2,2:2,3:2,4:1,5:2,6:2,7:2,8:1,9:1,10:4},
    spells:{1:['Charm Person','Cure Wounds','Detect Magic','Disguise Self','Dissonant Whispers','Faerie Fire','Feather Fall','Healing Word','Heroism','Sleep','Thunderwave'],2:['Calm Emotions','Detect Thoughts','Enhance Ability','Hold Person','Invisibility','Knock','Lesser Restoration','See Invisibility','Shatter','Silence','Suggestion'],3:['Clairvoyance','Dispel Magic','Fear','Hypnotic Pattern','Major Image','Sending','Speak with Dead','Tongues'],4:['Dimension Door','Freedom of Movement','Greater Invisibility','Locate Creature','Polymorph'],5:['Animate Objects','Dominate Person','Geas','Greater Restoration','Hold Monster','Legend Lore','Mass Cure Wounds','Raise Dead','Scrying'],6:['Mass Suggestion',"Otto's Irresistible Dance",'True Seeing'],7:['Etherealness','Forcecage','Mirage Arcane','Teleport'],8:['Dominate Monster','Feeblemind','Glibness','Mind Blank'],9:['Foresight','Power Word Heal','True Polymorph'],10:['Magical Secrets - all tiers','Superior Inspiration','Peerless Bard']},
    cantripsKnown:{1:2,2:2,3:2,4:3,5:3,6:3,7:3,8:4,9:4,10:4}, spellsKnown:{1:4,2:5,3:6,4:7,5:8,6:10,7:12,8:14,9:16,10:18},
  },
  'Monster Hunter': {cantrips:[],martial:{1:["Hunter's Lore",'Prepared Arsenal'],2:['Marked Quarry','Monster Slayer'],3:['Field Preparation'],4:['Hardened Hunter'],5:['Extra Attack','Relentless Pursuit'],6:['Exploit Weakness','Improved Marked Quarry'],7:['Unnatural Resilience'],8:['Countermeasure Mastery','Improved Relentless Pursuit'],9:['Apex Quarry','Master Trick Preparation'],10:['Legendary Hunter','Perfect Quarry','Master Exploitation','Supreme Countermeasures']},martialKnown:{1:2,2:2,3:1,4:1,5:2,6:2,7:1,8:2,9:2,10:4}},
  Gunslinger: {cantrips:[],martial:{1:['Grit','Quick Draw','Firearm Proficiency'],2:['Deadeye Shot','Disarming Shot','Forceful Shot'],3:['Trick Shot Mastery'],4:['Fast Reload'],5:['Extra Attack','Expanded Trick Shots'],6:['Piercing Shot','Improved Grit'],7:['Evasive Footwork'],8:['Vicious Intent','Rapid Firearm Handling'],9:['Hemorrhaging Critical','Master Trick Shots'],10:['Legendary Gunslinger','Grit Mastery','Fastest Reload','Perfected Trick Shots']},martialKnown:{1:3,2:3,3:1,4:1,5:2,6:2,7:1,8:2,9:2,10:4}},
};

// Get how many of each ability type a class gets at a given level (cumulative)
// Techniques live in their own `martial` field on each class, parallel to
// `spells` and `cantrips`. Classes whose whole kit is techniques (Fighter,
// Rogue, Monk, Barbarian, Blood Hunter, Illrigger) have no spells at all; the
// half-casters carry both.

export const getAbilityCounts = (className, level, subclass = null) => {
  const cls = CLASS_ABILITIES[className];
  if (!cls) return { cantrips: 0, spells: 0, martial: 0, infusions: 0 };
  // Sum up all counts from level 1 to current level
  let cantrips = 0, spells = 0, martial = 0, infusions = 0;
  for (let l = 1; l <= level; l++) {
    cantrips  += cls.cantripsKnown?.[l]  || 0;
    spells    += cls.spellsKnown?.[l]    || 0;
    martial   += cls.martialKnown?.[l]   || 0;
    infusions += cls.infusionsKnown?.[l] || 0;
  }
  if (className === 'Druid' && subclass === 'Circle of the Land' && level >= 2) cantrips += 1;
  const caster = SUBCLASS_CASTERS[className]?.[subclass];
  if (caster && level >= caster.start) {
    cantrips += caster.cantrips + (level >= 6 ? 1 : 0);
    spells += caster.spells + level - caster.start;
  }
  // For a purely martial class the spell allowance IS the technique allowance.
  // A mixed class gets a small separate budget for its own features.
  return { cantrips, spells, martial, infusions };
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
// Subclasses that expand the source list without granting extra known spells.
export const SUBCLASS_SPELL_ACCESS = {
  Sorcerer: { 'Divine Soul': 'Cleric' },
};

export const getAvailableAbilities = (className, level, deity = null, subclass = null) => {
  const cls = CLASS_ABILITIES[className];
  if (!cls) return { cantrips: [], spells: [], martial: [], infusions: [] };
  // Show all spells unlocked at or below current level
  const spells = [];
  for (let l = 1; l <= level; l++) {
    if (cls.spells?.[l]) spells.push(...cls.spells[l]);
  }

  const subclassCantrips = [];
  const extraClass = CLASS_ABILITIES[SUBCLASS_SPELL_ACCESS[className]?.[subclass]];
  if (extraClass) {
    subclassCantrips.push(...(extraClass.cantrips || []));
    for (let l = 1; l <= level; l++) {
      spells.push(...(extraClass.spells?.[l] || []));
    }
  }

  const caster = SUBCLASS_CASTERS[className]?.[subclass];
  if (caster && level >= caster.start) {
    const source = CLASS_ABILITIES[caster.source];
    const tier = Math.min(caster.maxTier, 1 + Math.floor((level - caster.start) / (caster.maxTier === 6 ? 1.4 : 2)));
    subclassCantrips.push(...(source.cantrips || []));
    spells.push(...spellsThrough(source.spells, tier));
  }
  spells.push(...spellsThrough(SUBCLASS_EXPANDED_SPELLS[className]?.[subclass], level));

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

  const martial = [];
  for (let l = 1; l <= level; l++) if (cls.martial?.[l]) martial.push(...cls.martial[l]);
  return {
    cantrips:  [...new Set([...(cls.cantrips || []), ...subclassCantrips, ...domainCantrips])],
    spells:    [...new Set(spells)],
    martial:   [...new Set(martial)],
    infusions: infusions,
    domainCantrips,
    domainSpells,
  };
};


export const magicalSecretsCount = (level, subclass) =>
  (level >= 9 ? 6 : level >= 7 ? 4 : level >= 5 ? 2 : 0) +
  (subclass === 'College of Lore' && level >= 3 ? 2 : 0);
export const availableMagicalSecrets = level => [...new Set(Object.values(CLASS_ABILITIES)
  .flatMap(cls => spellsThrough(cls.spells, Math.min(level, 9))))];
export function grantedSubclassMagic(char) {
  const levels = char.classLevels || { [char.cls?.name]: char.level };
  const options = char.abilities?.subclassOptions || {};
  return Object.entries(char.subclasses || {}).flatMap(([cls, sub]) =>
    subclassBonusSpells(cls, sub, levels[cls] || 0, options[cls] || {}).map(name => ({name, cls, sub})));
}
