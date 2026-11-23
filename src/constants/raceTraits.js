// Racial traits — single source of truth used by both the system prompt and abilities modal

export const RACE_TRAITS = {
  'Human': {
    traits: [
      { name: 'Extra Skill',         desc: 'Proficiency in one extra skill of your choice.' },
      { name: 'Bonus Feat',          desc: 'Gain one extra feat at level 1.' },
      { name: 'No Darkvision',       desc: 'Humans rely on light sources in the dark.' },
    ],
  },
  'Elf': {
    traits: [
      { name: 'Darkvision 60ft',     desc: 'See in dim light as if it were bright, and in darkness as if dim.' },
      { name: 'Keen Senses',         desc: 'Proficiency in Perception.' },
      { name: 'Fey Ancestry',        desc: 'Advantage on saves vs. charm. Immune to magical sleep.' },
      { name: 'Trance',              desc: 'Meditate for 4 hours instead of sleeping. Fully rested.' },
      { name: 'Weapon Training',     desc: 'Proficiency with longswords, shortswords, shortbows, longbows.' },
    ],
  },
  'Sun Elf': {
    traits: [
      { name: 'Darkvision 60ft',     desc: 'See in dim light as if it were bright, and in darkness as if dim.' },
      { name: 'Keen Senses',         desc: 'Proficiency in Perception.' },
      { name: 'Fey Ancestry',        desc: 'Advantage on saves vs. charm. Immune to magical sleep.' },
      { name: 'Trance',              desc: 'Meditate for 4 hours instead of sleeping. Fully rested.' },
      { name: 'Cantrip',             desc: 'Know one wizard cantrip of your choice. Intelligence is your spellcasting ability for it.' },
      { name: 'Sun Elf Weapon Training', desc: 'Proficiency with longswords, shortswords, shortbows, and longbows.' },
    ],
  },
  'Moon Elf': {
    traits: [
      { name: 'Darkvision 60ft',     desc: 'See in dim light as if it were bright, and in darkness as if dim.' },
      { name: 'Keen Senses',         desc: 'Proficiency in Perception.' },
      { name: 'Fey Ancestry',        desc: 'Advantage on saves vs. charm. Immune to magical sleep.' },
      { name: 'Trance',              desc: 'Meditate for 4 hours instead of sleeping. Fully rested.' },
      { name: 'Cantrip',             desc: 'Know one wizard cantrip of your choice. Intelligence is your spellcasting ability for it.' },
      { name: 'Moon Elf Weapon Training', desc: 'Proficiency with longswords, shortswords, shortbows, and longbows.' },
    ],
  },
  'Dwarf': {
    traits: [
      { name: 'Darkvision 60ft',     desc: 'See in dim light as if bright, darkness as if dim.' },
      { name: 'Dwarven Resilience',  desc: 'Advantage on poison saves. Resistance to poison damage.' },
      { name: 'Stonecunning',        desc: 'Expertise on History checks related to stonework.' },
      { name: 'Weapon Training',     desc: 'Proficiency with battleaxes, handaxes, throwing hammers, warhammers.' },
    ],
  },
  'Halfling': {
    traits: [
      { name: 'Lucky',               desc: 'Reroll any attack, ability, or save roll of 1. Must use the new result.' },
      { name: 'Brave',               desc: 'Advantage on saving throws vs. the frightened condition.' },
      { name: 'Nimbleness',          desc: 'Move through the space of any creature larger than you.' },
      { name: 'Small',               desc: 'About 3 feet tall. No darkvision.' },
    ],
  },
  'Kender': {
    traits: [
      { name: 'Fearless',            desc: 'Advantage on saving throws to avoid or end the frightened condition.' },
      { name: 'Kender Aptitude',      desc: 'Choose proficiency in one skill from Insight, Investigation, Sleight of Hand, Stealth, or Survival.' },
      { name: 'Taunt',               desc: 'Bonus action: provoke a creature within 60ft that can hear and understand you. On a failed Wisdom save, it has disadvantage on attacks against targets other than you until your next turn.' },
      { name: 'Small',               desc: 'Roughly halfling-sized, quick, nimble, and famously difficult to intimidate.' },
    ],
  },
  'Tiefling': {
    traits: [
      { name: 'Darkvision 60ft',     desc: 'See in dim light as if bright, darkness as if dim.' },
      { name: 'Fire Resistance',     desc: 'Resistance to fire damage.' },
      { name: 'Thaumaturgy',         desc: 'Innate cantrip — minor magical effects (booming voice, flickering flames, etc.).' },
      { name: 'Hellish Rebuke',      desc: '1/day: reaction to being damaged — deal 2d10 fire damage to attacker.' },
      { name: 'Darkness',            desc: '1/day: create a 15ft sphere of magical darkness.' },
    ],
  },
  'Cambion': {
    traits: [
      { name: 'Darkvision 60ft', desc: 'Within 60ft, see in dim light as if it were bright and in darkness as if it were dim.' },
      { name: 'Fiendish Wings', desc: 'Your wings grant a flying speed of 30ft while you wear light armor or no armor.' },
      { name: 'Fire Resistance', desc: 'You have resistance to fire damage.' },
      { name: 'Alter Self', desc: 'Once per long rest, cast Alter Self without a spell slot. Charisma is your spellcasting ability for it.' },
    ],
  },
  'Shadar-kai': {
    traits: [
      { name: 'Darkvision 60ft',     desc: 'See in dim light as if bright, darkness as if dim.' },
      { name: 'Necrotic Resistance', desc: 'Resistance to necrotic damage.' },
      { name: 'Blessing of the Raven Queen', desc: '1/long rest: teleport up to 30ft as a bonus action. Briefly become incorporeal — resistance to all damage until start of next turn.' },
    ],
  },
  'Half-Elf': {
    traits: [
      { name: 'Darkvision 60ft',     desc: 'See in dim light as if bright, darkness as if dim.' },
      { name: 'Fey Ancestry',        desc: 'Advantage on saves vs. charm. Immune to magical sleep.' },
      { name: 'Skill Versatility',   desc: 'Proficiency in any two skills of your choice.' },
    ],
  },
  'Half-Orc': {
    traits: [
      { name: 'Darkvision 60ft',     desc: 'See in dim light as if bright, darkness as if dim.' },
      { name: 'Relentless Endurance', desc: '1/long rest: when reduced to 0 HP, drop to 1 HP instead.' },
      { name: 'Savage Attacks',      desc: 'On a critical hit with a melee weapon, add one extra weapon damage die.' },
    ],
  },
  'Gnome': {
    traits: [
      { name: 'Darkvision 60ft',     desc: 'See in dim light as if bright, darkness as if dim.' },
      { name: 'Gnome Cunning',       desc: 'Advantage on ALL Intelligence, Wisdom, and Charisma saving throws vs. magic.' },
      { name: 'Tinker',              desc: 'Proficiency with artisan tools. Can craft small clockwork devices.' },
      { name: 'Small',               desc: '3 to 4 feet tall.' },
    ],
  },
  'Dragonborn': {
    traits: [
      { name: 'Breath Weapon',       desc: '1/rest: 15ft cone or 30ft line of elemental damage. Dex save (DC 8 + CON mod + proficiency). Damage type matches your draconic color.' },
      { name: 'Elemental Resistance', desc: 'Resistance to the damage type of your breath weapon.' },
      { name: 'Draconic Appearance', desc: 'Scales, clawed hands, and reptilian features. Commanding presence.' },
    ],
  },
  'Aasimar': {
    traits: [
      { name: 'Darkvision 60ft',     desc: 'See in dim light as if bright, darkness as if dim.' },
      { name: 'Healing Hands',       desc: '1/long rest: touch a creature to heal HP equal to your level.' },
      { name: 'Light Cantrip',       desc: 'Innate Light cantrip — no spell slot required.' },
      { name: 'Radiant Soul',        desc: '1/long rest: wings sprout for 1 minute. Fly speed 30ft. Add radiant damage equal to your level to one attack per turn.' },
    ],
  },
  'Githyanki': {
    traits: [
      { name: 'Astral Knowledge',    desc: '1/long rest: gain proficiency in any one skill until next rest.' },
      { name: 'Martial Prodigy',     desc: 'Proficiency with light armor, medium armor, shortswords, longswords, greatswords.' },
      { name: 'Mage Hand',           desc: 'Innate Mage Hand cantrip — psionically conjure a spectral hand.' },
      { name: 'Jump (Psionic)',       desc: '1/day at level 3: triple jump distance for 1 minute.' },
      { name: 'Misty Step (Psionic)', desc: '1/day at level 5: teleport up to 30ft to an unoccupied space you can see.' },
    ],
  },
  'Astral Elf': {
    traits: [
      { name: 'Astral Fire',      desc: 'Innate cantrip — choose Dancing Lights, Light, or Sacred Flame (Int, Wis, or Cha based).' },
      { name: 'Darkvision 60ft',  desc: 'See in dim light as if bright, darkness as if dim.' },
      { name: 'Fey Ancestry',     desc: 'Advantage on saves vs. charm. Magic cannot put you to sleep.' },
      { name: 'Keen Senses',      desc: 'Proficiency in one of Perception, Insight, Investigation, or Survival.' },
      { name: 'Starlight Step',   desc: 'Bonus action: teleport up to 30ft to a space you can see. Proficiency-bonus times per long rest.' },
      { name: 'Astral Trance',    desc: 'Meditate 4 hours instead of sleeping. Each long rest, gain two chosen proficiencies (skills, tools, or weapons).' },
    ],
  },
  'Reborn': {
    traits: [
      { name: 'Ancestral Legacy',           desc: 'Keep skill or tool proficiencies from the race you were before, or gain two new ones.' },
      { name: 'Deathless Nature',           desc: 'No need to eat, drink, breathe, or sleep. Advantage on death saves and saves vs. disease and poison; resistance to poison damage.' },
      { name: 'Knowledge from a Past Life', desc: 'Add 1d6 to an ability check for a skill you lack. Proficiency-bonus times per long rest.' },
    ],
  },
  'Kalashtar': {
    traits: [
      { name: 'Dual Mind',           desc: 'Advantage on all Wisdom saving throws.' },
      { name: 'Mental Discipline',   desc: 'Resistance to psychic damage.' },
      { name: 'Mind Link',           desc: 'Speak telepathically to any creature you can see (range scales with level). Can let one creature reply telepathically.' },
      { name: 'Severed from Dreams', desc: 'Immune to magic that affects dreams or causes magical sleep. You do not dream and rest in a wakeful trance.' },
    ],
  },
  'Dhampir': {
    traits: [
      { name: 'Darkvision',     desc: 'See in dim light as if bright, darkness as if dim — out to 120ft.' },
      { name: 'Spider Climb',   desc: 'Climb difficult surfaces, including ceilings, without a check. Climb speed equal to your walking speed (higher levels).' },
      { name: 'Trace of Undeath', desc: 'Touched by undeath — you need only half the food and sleep of the living, and read as faintly undead to some magic.' },
      { name: 'Vampiric Bite',  desc: 'A Constitution-based bite that damages a creature and lets you regain hit points or empower your next roll.' },
    ],
  },
  'Warforged': {
    traits: [
      { name: 'Constructed Resilience', desc: 'Advantage on saves against poison, resistance to poison damage, immunity to disease, and no need to eat, drink, or breathe.' },
      { name: 'Sentry’s Rest',          desc: 'When taking a long rest, remain motionless and inactive for 6 hours while staying conscious and aware of your surroundings.' },
      { name: 'Integrated Protection',  desc: 'Your body incorporates protective plating. Gain +1 AC, and armor you wear integrates into your frame and cannot be removed against your will while you live.' },
      { name: 'Specialized Design',     desc: 'Gain proficiency in one skill and one tool of your choice.' },
    ],
  },
};

// Flat string version for the DM system prompt
export const RACE_TRAIT_STRINGS = {
  'Human':      'Versatile and ambitious. Proficiency in one extra skill. Gains one extra feat at level 1. No darkvision.',
  'Elf':        'Darkvision 60ft. Keen Senses (proficiency in Perception). Fey Ancestry (advantage on saves vs. charm, immune to magical sleep). Trance (meditate 4hrs instead of sleeping). Proficiency with longswords, shortswords, shortbows, longbows.',
  'Sun Elf':    'Darkvision 60ft. Keen Senses (proficiency in Perception). Fey Ancestry (advantage on saves vs. charm, immune to magical sleep). Trance (meditate 4hrs instead of sleeping). Knows one wizard cantrip using Intelligence. Proficiency with longswords, shortswords, shortbows, and longbows. Ancient, patient, and steeped in high elven arcane tradition.',
  'Moon Elf':   'Darkvision 60ft. Keen Senses (proficiency in Perception). Fey Ancestry (advantage on saves vs. charm, immune to magical sleep). Trance (meditate 4hrs instead of sleeping). Knows one wizard cantrip using Intelligence. Proficiency with longswords, shortswords, shortbows, and longbows. Curious, expressive, widely traveled, and unusually comfortable among other peoples.',
  'Dwarf':      'Darkvision 60ft. Dwarven Resilience (advantage on poison saves, resistance to poison damage). Stonecunning (expertise on History checks about stonework). Proficiency with battleaxes, handaxes, throwing hammers, warhammers.',
  'Halfling':   'Lucky (reroll any attack/ability/save roll of 1, must use new roll). Brave (advantage on saves vs. frightened). Halfling Nimbleness (move through space of larger creatures). Small — 3 feet tall. No darkvision.',
  'Kender':     'Fearless (advantage on saves to avoid or end frightened). Kender Aptitude: proficiency in one of Insight, Investigation, Sleight of Hand, Stealth, or Survival. Taunt: bonus action to provoke a creature within 60ft; on a failed Wisdom save it has disadvantage attacking targets other than you until your next turn. Small, nimble, intensely curious, and notoriously difficult to intimidate.',
  'Tiefling':   'Darkvision 60ft. Resistance to fire damage. Infernal Legacy: Thaumaturgy cantrip, Hellish Rebuke 1/day, Darkness 1/day. Horns, tail, and unusual eye color — may face prejudice.',
  'Cambion':    'Darkvision 60ft. Fiendish Wings: fly 30ft in light armor or no armor. Resistance to fire damage. Innate Alter Self: cast once per long rest without a spell slot, using Charisma.',
  'Shadar-kai': 'Darkvision 60ft. Resistance to necrotic damage. Blessing of the Raven Queen: teleport up to 30ft as bonus action 1/long rest, briefly become incorporeal. Pale and unnervingly still in appearance.',
  'Half-Elf':   'Darkvision 60ft. Fey Ancestry (advantage on saves vs. charm, immune to magical sleep). Skill Versatility: proficiency in any two skills. Charming and adaptable.',
  'Half-Orc':   'Darkvision 60ft. Relentless Endurance: drop to 1 HP instead of 0 once per rest. Savage Attacks: add one extra weapon damage die on a critical hit. Imposing and battle-hardened.',
  'Gnome':      'Darkvision 60ft. Gnome Cunning: advantage on ALL INT, WIS, and CHA saving throws vs. magic. Tinker proficiency. Small — 3 to 4 feet tall.',
  'Dragonborn': 'Breath Weapon: 15ft cone or 30ft line of elemental damage (Dex save DC 8+CON+proficiency), usable once per rest. Damage resistance matching breath type. Draconic appearance.',
  'Aasimar':    'Darkvision 60ft. Healing Hands: heal HP equal to level 1/long rest. Light cantrip (innate). Radiant Soul 1/long rest: wings for 1 minute, fly speed 30ft, add radiant damage equal to level on one attack per turn.',
  'Githyanki':  'Astral Knowledge: gain proficiency in any one skill 1/long rest. Martial Prodigy: proficiency with light/medium armor, shortswords, longswords, greatswords. Psionics: Mage Hand cantrip; Jump 1/day at level 3; Misty Step 1/day at level 5.',
  'Astral Elf': 'Darkvision 60ft. Astral Fire (innate Dancing Lights, Light, or Sacred Flame cantrip). Fey Ancestry (advantage vs. charm, immune to magical sleep). Keen Senses. Starlight Step: bonus-action 30ft teleport, proficiency-bonus times per long rest. Astral Trance: meditate 4hrs, gain two chosen proficiencies each long rest. Ethereal, divine-touched bearing.',
  'Reborn': 'Deathless Nature: no need to eat, drink, breathe, or sleep; advantage on death saves and vs. disease/poison; resistance to poison. Ancestral Legacy from a former life. Knowledge from a Past Life: add 1d6 to an unproficient ability check, proficiency-bonus times per long rest. Carries fragmented memories of who they were.',
  'Kalashtar': 'Dual Mind (advantage on all Wisdom saves). Mental Discipline (resistance to psychic damage). Mind Link: telepathy with creatures you can see. Severed from Dreams: immune to dream magic and magical sleep, rests in a wakeful trance. Quietly serene, bonded to a spirit of the plane of dreams.',
  'Dhampir': 'Darkvision up to 120ft. Spider Climb: scale sheer surfaces and ceilings, climb speed equal to walking speed. Vampiric Bite: Constitution-based bite that drains life to heal you or empower a roll. Trace of Undeath: needs only half normal food and sleep. Cursed with a macabre hunger.',
  'Warforged': 'Constructed Resilience: advantage on poison saves, resistance to poison damage, immunity to disease, and no need to eat, drink, or breathe. Sentry’s Rest: remain conscious and aware while resting motionless. Integrated Protection: +1 AC and armor integrates into the body. Specialized Design: proficiency in one skill and one tool. A living construct built for war but capable of becoming far more than its intended purpose.',
};
