// Published 2014-era paladin oaths, with app-authored summaries.
// Sources: PHB (Ancients), SCAG (Crown), XGtE (Conquest/Redemption), TCoE (Glory/Watchers).
// Keep the app's subclass pick at 3. Later feature gates use ceil(tabletop / 2).
// Oath spells follow the existing app tiers 3, 4, 5, 7, 9.
const feature = (name, level, desc) => ({name,level,desc});
export const PALADIN_OATH_TENETS = {
  'Oath of Devotion':['Tell the truth and keep your promises.','Meet danger with courage.','Temper strength with compassion and honor.','Accept responsibility for those entrusted to you.'],
  'Oath of Vengeance':['Pursue the greater evil.','Show no mercy to your sworn enemies.','Use the means necessary to end their wrongdoing.','Make restitution for the harm they cause.'],
  Oathbreaker:['A former sacred oath was abandoned in pursuit of dark ambition; the character’s history determines what was broken and why.'],
  'Oath of the Ancients':['Nurture hope, joy, and beauty.','Protect life and those who preserve its light.','Keep your own capacity for delight.','Give others a reason to hope.'],
  'Oath of the Crown':['Uphold the law and the order you have sworn to serve.','Remain loyal to your pledged obligations.','Meet difficult duties with courage.','Own the consequences of your decisions.'],
  'Oath of Conquest':['Break an enemy’s will to resist.','Establish an order that tolerates no defiance.','Prove authority through strength and victory.'],
  'Oath of Redemption':['Seek peace before violence.','Recognize the possibility of change.','Allow redemption the time it needs.','Use judgment when mercy cannot safely end a threat.'],
  'Oath of Glory':['Let deeds establish your worth.','Meet challenges rather than avoiding them.','Train your body for exceptional effort.','Discipline yourself to overcome failure.'],
  'Oath of the Watchers':['Remain alert to threats from beyond the mortal world.','Protect your allies from outside powers and their bargains.','Maintain the discipline your watch demands.'],
};
export const ADDITIONAL_PALADIN_OATHS = {
  'Oath of the Ancients': {
    emoji:'🌿',desc:'A green knight defending life, beauty, and the world’s capacity for joy. A natural fit for a fey-touched guardian, woodland champion, or survivor determined to preserve hope.',
    features:[
      feature("Nature's Wrath",3,'Channel Divinity: use an action to summon vines around a creature within 10 feet. It chooses a Strength or Dexterity save against restraint and can repeat the save at the end of its turns.'),
      feature('Turn the Faithless',3,'Channel Divinity: use an action to turn fey and fiends within 30 feet that fail Wisdom saves for up to a minute or until damaged. A creature concealing its true form through illusion or shapeshifting reveals it while turned.'),
      feature('Aura of Warding',4,'While conscious, you and friendly creatures within 10 feet resist damage from spells. This does not resist every magical effect or all damage.'),
      feature('Undying Sentinel',8,'Once per long rest, remain at 1 HP when reduced to 0 without being killed outright. You also avoid the frailty of old age and cannot be magically aged.'),
      feature('Expanded Warding',9,'Aura of Warding reaches 30 feet.'),
      feature('Elder Champion',10,'Once per long rest, use an action to assume a primeval form for a minute: regain 10 HP at the start of each turn, cast one-action paladin spells as bonus actions, and impose disadvantage on enemies within 10 feet saving against your paladin spells and Channel Divinity.'),
    ],
  },
  'Oath of the Crown': {
    emoji:'🏰',desc:'A sworn defender of civilization, a sovereign, or an enduring legal order. This oath can shape a royal bodyguard, loyal magistrate, disciplined knight, or protector of an institution greater than themselves.',
    features:[
      feature('Champion Challenge',3,'Channel Divinity: a bonus-action challenge forces chosen creatures within 30 feet to make Wisdom saves. Failures cannot willingly move more than 30 feet from you; the restriction ends if you are incapacitated or die, or the creature is more than 30 feet away.'),
      feature('Turn the Tide',3,'Channel Divinity: as a bonus action, chosen creatures within 30 feet that can hear you and are below half HP regain 1d6 + your Charisma modifier HP, with a minimum of 1.'),
      feature('Divine Allegiance',4,'When a creature within 5 feet takes damage, use your reaction to take that damage instead. Damage transferred this way cannot be reduced or prevented.'),
      feature('Unyielding Spirit',8,'Gain advantage on saves against being paralyzed or stunned.'),
      feature('Exalted Champion',10,'Once per long rest, use an action to become a champion for an hour: resist bludgeoning, piercing, and slashing damage from nonmagical weapons; allies within 30 feet gain advantage on death saves; you and allies within 30 feet gain advantage on Wisdom saves. These benefits end early if you are incapacitated or die.'),
    ],
  },
  'Oath of Conquest': {
    emoji:'👑',desc:'A conqueror who imposes order through strength, fear, and decisive victory. This path suits a warlord, imperial champion, iron-fisted peacekeeper, or enforcer who believes authority must be powerful enough to command obedience.',
    features:[
      feature('Conquering Presence',3,'Channel Divinity: use an action to force chosen creatures you can see within 30 feet to make Wisdom saves or fear you for a minute. Each can repeat its save at the end of its turns.'),
      feature('Guided Strike',3,'Channel Divinity: add +10 to one attack roll after seeing the roll but before the DM declares its outcome.'),
      feature('Aura of Conquest',4,'While not incapacitated, creatures frightened of you within 10 feet have speed 0. Starting a turn there deals psychic damage equal to half your paladin class level. The aura does not automatically frighten anyone.'),
      feature('Scornful Rebuke',8,'While you are not incapacitated, a creature hitting you with an attack takes psychic damage equal to your Charisma modifier, minimum 1. No reaction is required.'),
      feature('Expanded Conquest',9,'Aura of Conquest reaches 30 feet.'),
      feature('Invincible Conqueror',10,'Once per long rest, use an action to transform for a minute: resist all damage, make one additional attack when taking the Attack action, and score weapon critical hits on natural 19 or 20.'),
    ],
  },
  'Oath of Redemption': {
    emoji:'🕊️',desc:'A patient negotiator and protector who tries to end violence by giving people a path away from it. This can suit a former killer seeking change, a prisoner’s advocate, or a shield-bearer willing to suffer for others.',
    features:[
      feature('Emissary of Peace',3,'Channel Divinity: use a bonus action for +5 to Persuasion checks for 10 minutes.'),
      feature('Rebuke the Violent',3,'Channel Divinity: after an attacker within 30 feet damages someone other than you, use your reaction to force a Wisdom save. It takes radiant damage equal to the damage it just dealt on failure, half on success.'),
      feature('Aura of the Guardian',4,'When a creature within 10 feet takes damage, use your reaction to take it instead. The transferred damage cannot be reduced or prevented.'),
      feature('Protective Spirit',8,'At the end of your turn in combat, if you are above 0 HP but below half maximum HP, regain 1d6 + half your paladin class level HP.'),
      feature('Expanded Guardianship',9,'Aura of the Guardian reaches 30 feet.'),
      feature('Emissary of Redemption',10,'Passively resist damage from other creatures; creatures hitting you with attacks take radiant damage equal to half the damage dealt. Attacking, casting a spell on, or otherwise damaging a creature suspends both benefits against it until your next long rest, except damage from this feature itself.'),
    ],
  },
  'Oath of Glory': {
    emoji:'🏆',desc:'An aspirant to legend who tests courage and discipline through great deeds. A natural oath for a champion athlete, monster-slayer, ambitious adventurer, or hero trying to earn a name that will outlive them.',
    features:[
      feature('Peerless Athlete',3,'Channel Divinity: as a bonus action, gain 10 minutes of advantage on Athletics and Acrobatics, double carrying and lifting capacity, and 10 extra feet of jumping distance, still limited by available movement.'),
      feature('Inspiring Smite',3,'Channel Divinity: immediately after dealing Divine Smite damage, use a bonus action to distribute 2d8 + your paladin class level temporary HP among chosen creatures within 30 feet, including yourself.'),
      feature('Aura of Alacrity',4,'Your walking speed increases by 10 feet. Allies starting their turns within 5 feet of you gain that same walking-speed increase until the end of their turns, while you are not incapacitated.'),
      feature('Glorious Defense',8,'When you or a creature you can see within 10 feet is hit, use your reaction to add your Charisma modifier, minimum 1, to its AC against that attack. If it misses, you may make a weapon attack against the attacker if in reach. Uses equal your Charisma modifier, minimum 1, per long rest.'),
      feature('Expanded Alacrity',9,'Aura of Alacrity extends to allies starting their turns within 10 feet.'),
      feature('Living Legend',10,'As a bonus action, manifest legendary power for a minute: advantage on Charisma checks, turn one missed weapon attack into a hit on each of your turns, and use a reaction to reroll a failed save, keeping the new result. One use per long rest; a 5th-level spell slot can restore its use.'),
    ],
  },
  'Oath of the Watchers': {
    emoji:'👁️',desc:'A vigilant guardian against extraplanar intrusion, infiltration, and influence. This oath can belong to a portal warden, fiend-hunter, sentinel of a planar border, or investigator shaped by contact with something beyond the world.',
    features:[
      feature("Watcher's Will",3,'Channel Divinity: use an action to grant chosen creatures within 30 feet advantage on Intelligence, Wisdom, and Charisma saves for a minute. Choose up to your Charisma modifier in creatures, minimum one.'),
      feature('Abjure the Extraplanar',3,'Channel Divinity: use an action to turn nearby aberrations, celestials, elementals, fey, and fiends that fail Wisdom saves, for up to a minute or until damaged. This does not target ordinary undead simply for being undead.'),
      feature('Aura of the Sentinel',4,'While not incapacitated, you and chosen creatures within 10 feet gain your proficiency bonus on initiative rolls.'),
      feature('Vigilant Rebuke',8,'When you or a creature you can see within 30 feet succeeds on an Intelligence, Wisdom, or Charisma save, use your reaction to deal 2d8 + your Charisma modifier force damage to the creature that forced the save. It need not have been a spell.'),
      feature('Expanded Sentinel',9,'Aura of the Sentinel reaches 30 feet.'),
      feature('Mortal Bulwark',10,'As a bonus action, gain a minute of truesight to 120 feet and advantage attacking aberrations, celestials, elementals, fey, and fiends. An attack that deals damage can force a Charisma save to banish a creature to its native plane if elsewhere; a successful save protects it from this banishment for 24 hours. One use per long rest, or restore it with a 5th-level spell slot.'),
    ],
  },
};
export const ADDITIONAL_PALADIN_SPELLS = {
  'Oath of the Ancients': {3:['Ensnaring Strike','Speak with Animals'],4:['Moonbeam','Misty Step'],5:['Plant Growth','Protection from Energy'],7:['Ice Storm','Stoneskin'],9:['Commune with Nature','Tree Stride']},
  'Oath of the Crown': {3:['Command','Compelled Duel'],4:['Warding Bond','Zone of Truth'],5:['Aura of Vitality','Spirit Guardians'],7:['Banishment','Guardian of Faith'],9:['Circle of Power','Geas']},
  'Oath of Conquest': {3:['Armor of Agathys','Command'],4:['Hold Person','Spiritual Weapon'],5:['Bestow Curse','Fear'],7:['Dominate Beast','Stoneskin'],9:['Cloudkill','Dominate Person']},
  'Oath of Redemption': {3:['Sanctuary','Sleep'],4:['Calm Emotions','Hold Person'],5:['Counterspell','Hypnotic Pattern'],7:["Otiluke's Resilient Sphere",'Stoneskin'],9:['Hold Monster','Wall of Force']},
  'Oath of Glory': {3:['Guiding Bolt','Heroism'],4:['Enhance Ability','Magic Weapon'],5:['Haste','Protection from Energy'],7:['Compulsion','Freedom of Movement'],9:['Commune','Flame Strike']},
  'Oath of the Watchers': {3:['Alarm','Detect Magic'],4:['Moonbeam','See Invisibility'],5:['Counterspell','Nondetection'],7:['Aura of Purity','Banishment'],9:['Hold Monster','Scrying']},
};
