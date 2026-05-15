// ── Multiclass definitions ─────────────────────────────────────────────────────
// Each entry defines what a class gives at each level taken as a multiclass

export const MULTICLASS_OPTIONS = {
  Fighter: {
    emoji: '⚔️',
    desc: 'Advance your martial training. +HP, improved combat abilities.',
    hpPerLevel: 6,
    features: {
      1: ['Martial Weapon Proficiency', 'Heavy Armor Proficiency'],
      2: ['Action Surge — one extra action per rest'],
      3: ['Combat Mastery — +1 to all attack rolls'],
      5: ['Extra Attack — attack twice per action'],
    },
  },
  Rogue: {
    emoji: '🗡️',
    desc: 'Advance your roguish skills. Sneak Attack, Expertise, and cunning.',
    hpPerLevel: 5,
    features: {
      1: ['Sneak Attack — +1d6 damage when attacking from hiding or with advantage', 'Expertise — double proficiency on Stealth and Deception', 'Thieves\' Cant'],
      2: ['Cunning Action — bonus Hide, Dash, or Disengage action'],
      3: ['Sneak Attack increases to +2d6'],
      4: ['Uncanny Dodge — halve damage from one attack per round'],
      5: ['Sneak Attack increases to +3d6', 'Evasion — no damage on successful DEX saves'],
    },
  },
  Wizard: {
    emoji: '🔮',
    desc: 'Learn arcane magic. Spellcasting and magical utility.',
    hpPerLevel: 4,
    features: {
      1: ['Spellcasting — learn 3 cantrips and 2 first-level spells', 'Arcane Recovery'],
      2: ['Spell Slots increase'],
      3: ['Learn 2nd level spells'],
    },
  },
  Cleric: {
    emoji: '✨',
    desc: 'Channel divine power. Healing, holy damage, and divine smite.',
    hpPerLevel: 5,
    features: {
      1: ['Divine Domain — choose Dawn, Life, or War', 'Channel Divinity once per rest', 'Turn Undead'],
      2: ['Channel Divinity improves'],
      3: ['2nd level divine spells'],
    },
  },
  Artificer: {
    emoji: '⚙️',
    desc: 'Master of magical invention. Infusions, arcane firearms, and construct craft.',
    hpPerLevel: 5,
    features: {
      1: ['Magical Tinkering — imbue small objects with minor magical effects', 'Tool Proficiency — thieves tools, tinker\'s tools, one type of artisan\'s tools', 'Spellcasting — INT based, prep[...]
      2: ['Infuse Item — infuse up to 2 items with magical properties per long rest', 'Infusions known: Enhanced Weapon (+1), Enhanced Defense (+1 AC), Repeating Shot (ranged weapon, no ammo nee[...]
      3: ['Arcane Firearm — use a firearm as spellcasting focus, +1d8 damage on firearm attacks', 'Battle Smith or Alchemist subclass features'],
      4: ['Additional Infusion slot', 'Infusions: Boots of the Winding Path, Goggles of Night'],
      5: ['Extra Attack — attack twice when taking attack action', 'Infusions: Homunculus Servant — create a small magical construct companion'],
    },
  },
  Illrigger: {
    emoji: '👁️',
    desc: 'Master of illusions and deception. Illusion magic, trickery, and mind-bending spells.',
    hpPerLevel: 5,
    features: {
      1: ['Spellcasting — learn 2 cantrips and 2 first-level spells (Illusion focus)', 'Deceptive Sight — gain advantage on Deception and Insight checks'],
      2: ['Illusion Spell Slots increase', 'Phantom Image — create a non-interactive illusory duplicate of yourself'],
      3: ['Learn 2nd level illusion spells', 'Mind Trick — impose disadvantage on one creature\'s next attack or save'],
      4: ['Phantasmagoria — create complex layered illusions affecting multiple creatures'],
      5: ['Master Illusionist — creatures have disadvantage on saves against your illusion spells', 'Major Image — create persistent illusions'],
    },
  },
};

// Sneak attack dice by total rogue levels
export const SNEAK_ATTACK_DICE = {
  1: '1d6', 2: '1d6', 3: '2d6', 4: '2d6', 5: '3d6',
  6: '3d6', 7: '4d6', 8: '4d6', 9: '5d6', 10: '5d6',
};

// Get all features earned up to a given level in a class
export const getClassFeatures = (className, level) => {
  const cls = MULTICLASS_OPTIONS[className];
  if (!cls) return [];
  const features = [];
  for (let i = 1; i <= level; i++) {
    if (cls.features[i]) features.push(...cls.features[i]);
  }
  return features;
};

// Calculate total character level across all classes
export const getTotalLevel = (classLevels) => {
  return Object.values(classLevels).reduce((sum, lvl) => sum + lvl, 0);
};

// Get sneak attack bonus if character has rogue levels
export const getSneakAttackDice = (classLevels) => {
  const rogueLevels = classLevels?.Rogue || 0;
  if (rogueLevels === 0) return null;
  return SNEAK_ATTACK_DICE[Math.min(rogueLevels, 10)] || '5d6';
};

// Check if sneak attack should apply (attacking from hiding)
export const shouldApplySneakAttack = (userMsg) => {
  return /\b(hiding|hidden|shadow|stealth|sneak|ambush|surprise|dark|darkness|unseen|undetected|ghost|backstab)\b/i.test(userMsg);
};
