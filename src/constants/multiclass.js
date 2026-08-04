// Multiclass definitions

export const MULTICLASS_OPTIONS = {
  Fighter: {
    emoji: '\u2694\uFE0F',
    desc: 'Advance your martial training. +HP, improved combat abilities.',
    hpPerLevel: 6,
    features: {
      1: ['Martial Weapon Proficiency', 'Heavy Armor Proficiency'],
      2: ['Action Surge - one extra action per rest'],
      3: ['Combat Mastery - +1 to all attack rolls'],
      5: ['Extra Attack - attack twice per action'],
    },
  },
  Rogue: {
    emoji: '\uD83D\uDDE1\uFE0F',
    desc: 'Advance your roguish skills. Sneak Attack, Expertise, and cunning.',
    hpPerLevel: 5,
    features: {
      1: [
        'Sneak Attack - +1d6 damage when attacking with advantage or from hiding',
        "Expertise - double proficiency on Stealth and Deception",
        "Thieves' Cant",
      ],
      2: ['Cunning Action - bonus Hide, Dash, or Disengage action'],
      3: ['Sneak Attack increases to +2d6'],
      4: ['Uncanny Dodge - halve damage from one attack per round'],
      5: ['Sneak Attack increases to +3d6', 'Evasion - no damage on successful DEX saves'],
    },
  },
  Wizard: {
    emoji: '\uD83D\uDD2E',
    desc: 'Learn arcane magic. Spellcasting and magical utility.',
    hpPerLevel: 4,
    features: {
      1: ['Spellcasting - learn 3 cantrips and 2 first-level spells', 'Arcane Recovery'],
      2: ['Spell Slots increase'],
      3: ['Learn 2nd level spells'],
      4: ['Learn 3rd level spells', 'Cantrip Formulae - swap a prepared cantrip on a rest'],
      5: ['Learn 4th level spells', 'Arcane Recovery improves - regain more slots on a short rest'],
    },
  },
  Cleric: {
    emoji: '\u2728',
    desc: 'Channel divine power. Healing, holy damage, and divine smite.',
    hpPerLevel: 5,
    features: {
      1: ['Divine Domain - choose your patron deity domain', 'Channel Divinity once per rest', 'Turn Undead'],
      2: ['Channel Divinity improves'],
      3: ['2nd level divine spells'],
      4: ['3rd level divine spells', 'Destroy Undead - the weakest undead crumble rather than flee'],
      5: ['4th level divine spells', 'Channel Divinity twice per rest'],
    },
  },
  Artificer: {
    emoji: '\u2699\uFE0F',
    desc: 'Master of magical invention. Infusions, arcane firearms, and construct craft.',
    hpPerLevel: 5,
    features: {
      1: [
        'Magical Tinkering - imbue small objects with minor magical effects',
        "Tool Proficiency - thieves tools, tinker's tools, one artisan's tool type",
        'Spellcasting - INT based, prepare spells from the Artificer list',
      ],
      2: [
        'Infuse Item - infuse up to 2 items with magical properties per long rest',
        'Infusions known: Enhanced Weapon (+1), Enhanced Defense (+1 AC), Repeating Shot',
      ],
      3: [
        'Arcane Firearm - use a firearm as spellcasting focus, +1d8 damage on Artificer spells',
        'Battle Smith or Alchemist subclass features',
      ],
      4: ['Additional Infusion slot', 'Infusions: Boots of the Winding Path, Goggles of Night'],
      5: [
        'Extra Attack - attack twice when taking the attack action',
        'Infusions: Homunculus Servant - create a small magical construct companion',
      ],
    },
  },
  Illrigger: {
    emoji: '\uD83D\uDC41\uFE0F',
    desc: 'Infernal knight pledged to an archdevil. Hellfire seals, interdict boons, and dark power.',
    hpPerLevel: 6,
    features: {
      1: [
        'Baleful Interdict - place invisible seals on enemies that burn for fire/necrotic damage',
        'Invoke Hell - spend Interdict charges for powerful infernal abilities',
      ],
      2: ['Interdict Boons - bonus effects when burning seals', 'Hellfire damage increases'],
      3: ['Seal of Damnation - cursed enemies take extra damage from all sources'],
      4: ['Additional Interdict charges per rest'],
      5: [
        'Extra Attack - attack twice when taking the attack action',
        'Consume the Wicked - restore HP equal to Interdict damage dealt',
      ],
    },
  },
  Monk: {
    emoji: '\uD83D\uDC4A',
    desc: 'Channel Ki energy. Fast unarmed strikes, stunning blows, and evasion.',
    hpPerLevel: 5,
    features: {
      1: [
        'Unarmored Defense - WIS mod added to AC when unarmored',
        'Martial Arts - unarmed strikes use DEX, deal 1d4 damage',
      ],
      2: ['Ki Points - spend to Flurry of Blows, Patient Defense, or Step of the Wind'],
      3: ['Deflect Missiles - catch and redirect ranged attacks', 'Monastic Tradition subclass'],
      4: ['Slow Fall - reduce fall damage by 5x Monk level'],
      5: ['Extra Attack', 'Stunning Strike - spend Ki to stun on hit'],
    },
  },
  Barbarian: {
    emoji: '\uD83E\uDEA3',
    desc: 'Enter a primal Rage. Massive damage resistance and brutal STR attacks.',
    hpPerLevel: 7,
    features: {
      1: [
        'Rage - advantage on STR checks, +2 damage, resistance to physical damage',
        'Unarmored Defense - CON mod added to AC when unarmored',
      ],
      2: ['Reckless Attack - advantage on attacks, enemies get advantage back', 'Danger Sense'],
      3: ['Primal Path subclass', 'Bear Totem - resistance to ALL damage while raging'],
      4: ['Ability Score Improvement'],
      5: ['Extra Attack', 'Fast Movement - +10ft speed when not in heavy armor'],
    },
  },
  Warlock: {
    emoji: '\uD83C\uDF11',
    desc: 'Eldritch power from a dark patron. CHA-based blasts and curses.',
    hpPerLevel: 5,
    features: {
      1: [
        'Eldritch Blast cantrip',
        'Patron spells added to spell list',
        'Hex - bonus action curse, +1d6 damage to target',
      ],
      2: [
        'Eldritch Invocations - Agonizing Blast (+CHA to Eldritch Blast)',
        "Devil's Sight - darkvision 120ft through magical darkness",
      ],
      3: ['Pact Boon - Pact of the Blade (summon weapon), Chain (familiar), or Tome (spellbook)'],
      4: ['Additional Eldritch Invocation'],
      5: ['3rd level patron spells', 'Contact Other Plane ritual'],
    },
  },
  'Blood Hunter': {
    emoji: '\uD83E\uDE78',
    desc: 'Spend your own HP to fuel Crimson Rites and brand enemies.',
    hpPerLevel: 5,
    features: {
      1: [
        "Hunter's Bane - advantage vs. undead and fey",
        'Blood Maledict - curse enemies with haemorrhage or sense vitality',
        'Crimson Rite - spend HP to imbue weapon with elemental damage',
      ],
      2: ['Fighting Style', 'Crimson Rite damage increases'],
      3: ['Blood Hunter Order subclass', 'Brand of Castigation'],
      4: ['Ability Score Improvement'],
      5: ['Extra Attack', 'Grim Psychometry - read psychic impressions from objects'],
    },
  },
  Paladin: {
    emoji: '🛡️',
    desc: 'Holy knight sworn to a deity. Smites, healing touch, protective auras. STR/CHA.',
    hpPerLevel: 6,
    features: {
      1: ['Lay on Hands - heal with a touch from a pool of hit points', 'Divine Sense - detect celestials, fiends, and undead'],
      2: ['Divine Smite - burn spell energy for radiant damage on a hit', 'Fighting style', 'Spellcasting (half-caster)'],
      3: ['Sacred Oath subclass', 'Channel Divinity'],
      5: ['Extra Attack'],
      6: ['Aura of Protection - you and nearby allies add your CHA mod to saves'],
    },
  },
  Ranger: {
    emoji: '🏹',
    desc: 'Wilderness hunter and tracker. Marked prey, nature magic. DEX/WIS.',
    hpPerLevel: 6,
    features: {
      1: ['Favored Enemy - advantage tracking and recalling info on chosen prey', 'Natural Explorer - master of chosen terrain'],
      2: ['Spellcasting (half-caster)', "Hunter's Mark - bonus damage and tracking on marked prey", 'Fighting style'],
      3: ['Ranger Conclave subclass', 'Primeval Awareness'],
      5: ['Extra Attack'],
    },
  },
  Sorcerer: {
    emoji: '🔥',
    desc: 'Innate arcane magic from your bloodline, shaped by Metamagic.',
    hpPerLevel: 4,
    features: {
      1: ['Spellcasting - learn 4 cantrips and 2 first-level spells', 'Sorcerous Origin subclass'],
      2: ['Font of Magic - Sorcery Points'],
      3: ['Metamagic - bend spells with options like Twin and Quicken'],
      4: ['Learn 3rd level spells', 'More Sorcery Points, and spell slots can be traded for them'],
      5: ['Learn 4th level spells', 'A second Metamagic option'],
    },
  },
  Druid: {
    emoji: '🍃',
    desc: 'Primal nature magic and the power to take beast forms.',
    hpPerLevel: 5,
    features: {
      1: ['Spellcasting - learn 2 cantrips and prepared spells', 'Druidic - the secret language of druids'],
      2: ['Wild Shape - transform into beasts', 'Druid Circle subclass'],
      3: ['Learn 2nd-level spells'],
      4: ['Learn 3rd-level spells', 'Wild Shape improves - swimming forms'],
      5: ['Learn 4th-level spells', 'Wild Shape improves again - flying forms'],
    },
  },
};

// Sneak attack dice by total rogue levels
export const SNEAK_ATTACK_DICE = {
  1: '1d6', 2: '1d6', 3: '2d6', 4: '2d6', 5: '3d6',
  6: '3d6', 7: '4d6', 8: '4d6', 9: '5d6', 10: '5d6',
};

export const getClassFeatures = (className, level) => {
  const cls = MULTICLASS_OPTIONS[className];
  if (!cls) return [];
  const features = [];
  for (let i = 1; i <= level; i++) {
    if (cls.features[i]) features.push(...cls.features[i]);
  }
  return features;
};

export const getTotalLevel = (classLevels) => {
  return Object.values(classLevels).reduce((sum, lvl) => sum + lvl, 0);
};

export const getSneakAttackDice = (classLevels) => {
  const rogueLevels = classLevels?.Rogue || 0;
  if (rogueLevels === 0) return null;
  return SNEAK_ATTACK_DICE[Math.min(rogueLevels, 10)] || '5d6';
};

export const shouldApplySneakAttack = (userMsg) => {
  return /\b(hiding|hidden|shadow|stealth|sneak|ambush|surprise|dark|darkness|unseen|undetected|ghost|backstab)\b/i.test(userMsg);
};
