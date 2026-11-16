import { ADDITIONAL_PALADIN_SPELLS } from './paladinOaths.js';
// Narrative subclass magic for the app's ten-level progression.
// Selection allowances are app budgets, not spell-slot calculations.
export const SUBCLASS_CASTERS = {
  Fighter: { 'Eldritch Knight': { source:'Wizard', start:3, maxTier:4, cantrips:2, spells:3 } },
  Rogue: { 'Arcane Trickster': { source:'Wizard', start:3, maxTier:4, cantrips:2, spells:3 } },
  'Blood Hunter': { 'Order of the Profane Soul': { source:'Warlock', start:3, maxTier:4, cantrips:2, spells:2 } },
  Illrigger: { 'Architect of Ruin': { source:'Wizard', start:3, maxTier:6, cantrips:2, spells:3 } },
};
export const SUBCLASS_BONUS_SPELLS = {
  Cleric: {
    'Life Domain': {1:['Bless','Cure Wounds'],2:['Lesser Restoration','Spiritual Weapon'],3:['Beacon of Hope','Revivify'],4:['Death Ward','Guardian of Faith'],5:['Mass Cure Wounds','Raise Dead']},
    'Light Domain': {1:['Burning Hands','Faerie Fire'],2:['Flaming Sphere','Scorching Ray'],3:['Daylight','Fireball'],4:['Guardian of Faith','Wall of Fire'],5:['Flame Strike','Scrying']},
    'War Domain': {1:['Divine Favor','Shield of Faith'],2:['Magic Weapon','Spiritual Weapon'],3:["Crusader's Mantle",'Spirit Guardians'],4:['Freedom of Movement','Stoneskin'],5:['Flame Strike','Hold Monster']},
  },
  Paladin: {
    ...ADDITIONAL_PALADIN_SPELLS,
    'Oath of Devotion': {3:['Protection from Evil and Good','Sanctuary'],4:['Lesser Restoration','Zone of Truth'],5:['Beacon of Hope','Dispel Magic'],7:['Freedom of Movement','Guardian of Faith'],9:['Commune','Flame Strike']},
    'Oath of Vengeance': {3:['Bane',"Hunter's Mark"],4:['Hold Person','Misty Step'],5:['Haste','Protection from Energy'],7:['Banishment','Dimension Door'],9:['Hold Monster','Scrying']},
    Oathbreaker: {3:['Hellish Rebuke','Inflict Wounds'],4:['Crown of Madness','Darkness'],5:['Animate Dead','Bestow Curse'],7:['Blight','Confusion'],9:['Contagion','Dominate Person']},
  },
  Artificer: {
    Alchemist: {3:['Healing Word','Ray of Sickness'],4:['Flaming Sphere','Melf’s Acid Arrow'],5:['Gaseous Form','Mass Healing Word'],7:['Blight','Death Ward'],9:['Cloudkill','Raise Dead']},
    Artillerist: {3:['Shield','Thunderwave'],4:['Scorching Ray','Shatter'],5:['Fireball','Wind Wall'],7:['Ice Storm','Wall of Fire'],9:['Cone of Cold','Wall of Force']},
    'Battle Smith': {3:['Heroism','Shield'],4:['Branding Smite','Warding Bond'],5:['Aura of Vitality','Conjure Barrage'],7:['Aura of Purity','Fire Shield'],9:['Banishing Smite','Mass Cure Wounds']},
    Armorer: {3:['Magic Missile','Thunderwave'],4:['Mirror Image','Shatter'],5:['Hypnotic Pattern','Lightning Bolt'],7:['Fire Shield','Greater Invisibility'],9:['Passwall','Wall of Force']},
  },
  Ranger: { 'Gloom Stalker': {3:['Disguise Self'],4:['Rope Trick'],5:['Fear'],7:['Greater Invisibility'],9:['Seeming']} },
  Sorcerer: { 'Shadow Magic': {2:['Darkness']} },
  Druid: {
    'Circle of the Stars': {2:['Guidance','Guiding Bolt']},
    'Circle of Spores': {2:['Chill Touch','Blindness/Deafness','Gentle Repose'],3:['Animate Dead','Gaseous Form'],4:['Blight','Confusion'],5:['Cloudkill','Contagion']},
  },
  Rogue: { 'Arcane Trickster': {3:['Mage Hand']} },
  Monk: { 'Way of Shadow': {3:['Minor Illusion','Darkness','Darkvision','Pass Without Trace','Silence']} },
  Barbarian: { 'Path of the Totem Warrior': {3:['Beast Sense','Speak with Animals'],5:['Commune with Nature']} },
};
export const SUBCLASS_EXPANDED_SPELLS = {
  Warlock: {
    'The Fiend': {1:['Burning Hands','Command'],2:['Blindness/Deafness','Scorching Ray'],3:['Fireball','Stinking Cloud'],4:['Fire Shield','Wall of Fire'],5:['Flame Strike','Hallow']},
    'The Great Old One': {1:['Dissonant Whispers',"Tasha's Hideous Laughter"],2:['Detect Thoughts','Phantasmal Force'],3:['Clairvoyance','Sending'],4:['Dominate Beast',"Evard's Black Tentacles"],5:['Dominate Person','Telekinesis']},
    'The Archfey': {1:['Faerie Fire','Sleep'],2:['Calm Emotions','Phantasmal Force'],3:['Blink','Plant Growth'],4:['Dominate Beast','Greater Invisibility'],5:['Dominate Person','Seeming']},
    'The Hexblade': {1:['Shield','Wrathful Smite'],2:['Blur','Branding Smite'],3:['Blink','Elemental Weapon'],4:['Phantasmal Killer','Staggering Smite'],5:['Banishing Smite','Cone of Cold']},
  },
};
export const LAND_SPELLS = {
  Arctic:{2:['Hold Person','Spike Growth'],3:['Sleet Storm','Slow'],4:['Freedom of Movement','Ice Storm'],5:['Commune with Nature','Cone of Cold']},
  Coast:{2:['Mirror Image','Misty Step'],3:['Water Breathing','Water Walk'],4:['Control Water','Freedom of Movement'],5:['Conjure Elemental','Scrying']},
  Desert:{2:['Blur','Silence'],3:['Create Food and Water','Protection from Energy'],4:['Blight','Hallucinatory Terrain'],5:['Insect Plague','Wall of Stone']},
  Forest:{2:['Barkskin','Spider Climb'],3:['Call Lightning','Plant Growth'],4:['Divination','Freedom of Movement'],5:['Commune with Nature','Tree Stride']},
  Grassland:{2:['Invisibility','Pass Without Trace'],3:['Daylight','Haste'],4:['Divination','Freedom of Movement'],5:['Dream','Insect Plague']},
  Mountain:{2:['Spider Climb','Spike Growth'],3:['Lightning Bolt','Meld into Stone'],4:['Stone Shape','Stoneskin'],5:['Passwall','Wall of Stone']},
  Swamp:{2:['Darkness',"Melf's Acid Arrow"],3:['Water Walk','Stinking Cloud'],4:['Freedom of Movement','Locate Creature'],5:['Insect Plague','Scrying']},
  Underdark:{2:['Spider Climb','Web'],3:['Gaseous Form','Stinking Cloud'],4:['Greater Invisibility','Stone Shape'],5:['Cloudkill','Insect Plague']},
};
export const spellsThrough = (table = {}, level = 0) => [...new Set(Object.entries(table).filter(([tier]) => +tier <= level).flatMap(([,names]) => names))];
export const DIVINE_AFFINITIES = {Good:'Cure Wounds',Evil:'Inflict Wounds',Law:'Bless',Chaos:'Bane',Neutrality:'Protection from Evil and Good'};
export const subclassBonusSpells = (cls, sub, level, options = {}) =>
  cls === 'Sorcerer' && sub === 'Divine Soul' && level >= 1
    ? (DIVINE_AFFINITIES[options.affinity] ? [DIVINE_AFFINITIES[options.affinity]] : [])
    : spellsThrough(cls === 'Druid' && sub === 'Circle of the Land' ? LAND_SPELLS[options.land] : SUBCLASS_BONUS_SPELLS[cls]?.[sub], level);
