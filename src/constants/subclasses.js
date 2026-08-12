// Subclasses — narrative reference data, mirroring the RACE_TRAITS shape.
// Each subclass is a name + emoji + short desc + a flat list of {name, desc}
// features. Consumed by the abilities modal (display) and the system prompt.
//
// Curated: a handful of iconic subclasses per class, expandable over time.
// VERTICAL SLICE: Monk only for now. Add more class keys here and they light
// up automatically — the level gate and old-save prompt are data-driven.

// Level at which each class chooses its subclass (5e-accurate).
export const SUBCLASS_PICK_LEVEL = {
  Cleric: 1, Warlock: 1, Wizard: 2,
  Fighter: 3, Rogue: 3, Monk: 3, Barbarian: 3, Artificer: 3,
  Illrigger: 3, 'Blood Hunter': 3, Paladin: 3, Ranger: 3,
  Sorcerer: 1, Druid: 2, Bard: 3, 'Monster Hunter': 3, Gunslinger: 3,
};

export const SUBCLASSES = {
  Bard: {
    'College of Lore': {emoji:'📚',desc:'Collector of secrets, skills, and stolen magic.',features:[{name:'Cutting Words',desc:'Spend inspiration to undermine an enemy.'},{name:'Additional Magical Secrets',desc:'Learn magic normally unavailable to bards.'}]},
    'College of Valor': {emoji:'⚔️',desc:'Battlefield bard who turns inspiration into martial courage.',features:[{name:'Combat Inspiration',desc:'Allies can use inspiration for offense or defense.'},{name:'Battle Magic',desc:'Weave spellcasting and weapon attacks together.'}]},
  },
  'Monster Hunter': {
    'Occult Slayer': {emoji:'🕯️',desc:'Specialist in curses, undead, fiends, and hostile magic.',features:[{name:'Warded Mind',desc:'Harden yourself against supernatural intrusion.'},{name:'Ritual Countermeasures',desc:'Prepare wards and banes against identified prey.'}]},
    'Beast Stalker': {emoji:'🐾',desc:'Tracks apex monsters until nowhere remains safe.',features:[{name:'Predator Tracking',desc:'Read impossible trails and monster signs.'},{name:'Ambush Preparation',desc:'Build traps and choose terrain to counter your quarry.'}]},
  },
  Gunslinger: {
    Deadeye: {emoji:'🎯',desc:'Precision shooter built around one impossible shot.',features:[{name:'Called Shot',desc:'Spend grit to target a weak point.'},{name:'Steady Aim',desc:'Trade movement for extreme accuracy.'}]},
    Pistolero: {emoji:'💨',desc:'Aggressive close-range gunfighter built around movement and draw speed.',features:[{name:'Fan the Hammer',desc:'Unleash a rapid burst of close-range shots.'},{name:'Lightning Draw',desc:'React to danger before slower opponents can act.'}]},
  },
  Paladin: {
    'Oath of Devotion': {
      emoji: '🕊️',
      desc: 'The classic knight — honesty, courage, compassion. A shining ideal made flesh, holding themselves to the highest code.',
      features: [
        { name: 'Sacred Weapon',       desc: 'Channel Divinity: imbue your weapon with radiant power — add your CHA modifier to attack rolls and it sheds bright light.' },
        { name: 'Turn the Unholy',     desc: 'Channel Divinity: fiends and undead that fail a save must flee from you.' },
        { name: 'Aura of Devotion',    desc: 'You and allies near you cannot be charmed while you are conscious.' },
        { name: 'Purity of Spirit',    desc: 'You are permanently under Protection from Evil and Good.' },
      ],
    },
    'Oath of Vengeance': {
      emoji: '⚖️',
      desc: 'The dark knight — an avenger who set aside purity to punish the guilty. The oath is a hunt, and mercy is not part of it.',
      features: [
        { name: 'Abjure Enemy',        desc: 'Channel Divinity: one creature must save or be frightened of you and rooted in place.' },
        { name: 'Vow of Enmity',       desc: 'Channel Divinity: mark a creature — you gain advantage on all attacks against it for one minute.' },
        { name: 'Relentless Avenger',  desc: 'When your opportunity attack hits, you can move without provoking to stay on your prey.' },
        { name: 'Soul of Vengeance',   desc: 'When your Vow of Enmity target attacks, you can strike it as a reaction.' },
      ],
    },
    'Oathbreaker': {
      emoji: '💀',
      desc: 'A paladin who broke their sacred vow and embraced the dark power left in its place. Feared by the faithful, courted by the wicked.',
      features: [
        { name: 'Control Undead',      desc: 'Channel Divinity: bend an undead creature to your will for 24 hours.' },
        { name: 'Dreadful Aspect',     desc: 'Channel Divinity: nearby enemies must save or be frightened of you.' },
        { name: 'Aura of Hate',        desc: 'You and nearby fiends and undead add your CHA modifier to melee weapon damage.' },
        { name: 'Supernatural Resistance', desc: 'Resistance to bludgeoning, piercing, and slashing damage from nonmagical weapons.' },
      ],
    },
  },

  Ranger: {
    'Hunter': {
      emoji: '🎯',
      desc: 'The purest form of the hunt — a specialist in killing dangerous prey, whatever shape it takes.',
      features: [
        { name: 'Colossus Slayer',     desc: 'Once per turn, deal an extra 1d8 when you hit a creature that is below its hit point maximum.' },
        { name: 'Multiattack Defense', desc: 'After a creature hits you, its further attacks that turn take a penalty against you.' },
        { name: 'Volley',              desc: 'Make a ranged attack against any number of creatures within 10 feet of a chosen point.' },
        { name: 'Evasion',             desc: 'When a save-for-half effect hits you, take no damage on a success and half on a failure.' },
      ],
    },
    'Gloom Stalker': {
      emoji: '🌒',
      desc: 'A hunter of the dark places — unseen in shadow, terrifying in ambush, at home where light fears to go.',
      features: [
        { name: 'Dread Ambusher',      desc: 'Bonus initiative, extra movement on your first turn, and an additional attack with +1d8 damage on it.' },
        { name: 'Umbral Sight',        desc: 'Darkvision — and you are INVISIBLE to creatures relying on darkvision to see you in darkness.' },
        { name: 'Iron Mind',           desc: 'Proficiency in Wisdom saving throws.' },
        { name: 'Stalker\'s Flurry',   desc: 'When you miss with a weapon attack, make another attack immediately.' },
      ],
    },
    'Beast Master': {
      emoji: '🐺',
      desc: 'Bonded to a loyal beast that fights at your side — two hunters moving as one.',
      features: [
        { name: 'Animal Companion',    desc: 'Gain a beast companion that travels and fights with you (it joins your COMPANIONS — equip and command it like any other).' },
        { name: 'Exceptional Training', desc: 'Your companion can Dash, Disengage, or Help as a bonus-action command, and its attacks count as magical.' },
        { name: 'Bestial Fury',        desc: 'Your companion attacks twice when commanded to attack.' },
        { name: 'Share Spells',        desc: 'Spells you cast on yourself can also affect your companion.' },
      ],
    },
  },

  Monk: {
    'Way of the Open Hand': {
      emoji: '👊',
      desc: 'The purest expression of monastic combat — body and ki as one, turning unarmed strikes into a storm of control.',
      features: [
        { name: 'Open Hand Technique', desc: 'When you hit with Flurry of Blows, you can knock the target prone, push it 15 feet, or deny it reactions until your next turn.' },
        { name: 'Wholeness of Body',   desc: 'As an action, heal yourself for a burst of hit points once per long rest.' },
        { name: 'Tranquility',         desc: 'End a long rest with a sanctuary effect — creatures must save to attack you until your next rest or you break it.' },
        { name: 'Quivering Palm',      desc: 'Set up lethal vibrations in a creature you strike, which you can later trigger to devastating, potentially fatal effect.' },
      ],
    },
    'Way of Shadow': {
      emoji: '🌑',
      desc: 'Shadow monks — ninja-like assassins who fold ki into darkness, slipping between shadows to strike unseen.',
      features: [
        { name: 'Shadow Arts',     desc: 'Spend ki to produce Darkness, Darkvision, Pass Without Trace, or Silence without material components, plus the Minor Illusion cantrip.' },
        { name: 'Shadow Step',     desc: 'As a bonus action, teleport up to 60 feet between two patches of dim light or darkness, gaining advantage on your next melee attack.' },
        { name: 'Cloak of Shadows', desc: 'Become invisible in dim light or darkness until you attack, cast a spell, or step into light.' },
        { name: 'Opportunist',     desc: 'When a creature near you is hit by someone else, you can use a reaction to strike it too.' },
      ],
    },
    'Way of Mercy': {
      emoji: '⚕️',
      desc: 'Wandering physicians of body and soul who wield the same ki to mend the living and hasten the deaths of foes.',
      features: [
        { name: 'Hand of Healing', desc: 'Spend ki to restore hit points to a creature you touch, instead of part of a Flurry of Blows.' },
        { name: 'Hand of Harm',    desc: 'Spend ki to deal extra necrotic damage when you hit with an unarmed strike, once per turn.' },
        { name: 'Flurry of Healing and Harm', desc: 'Weave healing and harm into your Flurry of Blows without spending extra ki.' },
        { name: 'Hand of Ultimate Mercy', desc: 'Touch a recently dead creature and return it to life with a burst of healing, once per long rest.' },
      ],
    },
    'Way of the Four Elements': {
      emoji: '🌪️',
      desc: 'Monks who bend ki into raw elemental force — flame, wind, stone, and wave answering their discipline.',
      features: [
        { name: 'Elemental Attunement', desc: 'Manipulate the elements around you for minor, harmless magical effects.' },
        { name: 'Elemental Disciplines', desc: 'Spend ki to unleash effects such as Fangs of the Fire Snake, Fist of Unbroken Air, Water Whip, or Sweeping Cinder Strike.' },
        { name: 'Ranged Ki',            desc: 'Project martial power at a distance through elemental blasts, unusual for a monk.' },
      ],
    },
  },
  "Fighter": {
    "Champion": {
      "emoji": "🛡️",
      "desc": "A peerless warrior who wins through honed physical perfection rather than tricks — simple, reliable, devastating.",
      "features": [
        {
          "name": "Improved Critical",
          "desc": "Your weapon attacks score a critical hit on a roll of 19 or 20."
        },
        {
          "name": "Remarkable Athlete",
          "desc": "Add half your proficiency to physical checks you lack, and jump farther."
        },
        {
          "name": "Survivor",
          "desc": "At high levels, regain hit points each turn while wounded but still standing."
        }
      ]
    },
    "Battle Master": {
      "emoji": "⚔️",
      "desc": "A student of war who wields combat maneuvers like a toolkit — trips, feints, ripostes, and battlefield commands.",
      "features": [
        {
          "name": "Combat Superiority",
          "desc": "Spend superiority dice to fuel special maneuvers in combat."
        },
        {
          "name": "Maneuvers",
          "desc": "Master techniques like Disarming Attack, Riposte, Trip Attack, and Commander's Strike."
        },
        {
          "name": "Know Your Enemy",
          "desc": "Study a creature to gauge its relative strengths and weaknesses."
        }
      ]
    },
    "Eldritch Knight": {
      "emoji": "🔮",
      "desc": "A fighter who braids wizard magic into swordplay — abjuration and evocation in one armored fist.",
      "features": [
        {
          "name": "Spellcasting",
          "desc": "Learn wizard cantrips and spells, drawn mainly from abjuration and evocation."
        },
        {
          "name": "Weapon Bond",
          "desc": "Bond with a weapon so it can never be disarmed and can be summoned to your hand."
        },
        {
          "name": "War Magic",
          "desc": "Cast a cantrip and make a weapon attack in the same turn."
        }
      ]
    },
    "Samurai": {
      "emoji": "🗡️",
      "desc": "A relentless warrior whose iron will and fighting spirit push past fear and exhaustion.",
      "features": [
        {
          "name": "Fighting Spirit",
          "desc": "Grant yourself advantage and temporary hit points through sheer resolve."
        },
        {
          "name": "Elegant Courtier",
          "desc": "Add Wisdom to Persuasion and resist being charmed or frightened."
        },
        {
          "name": "Rapid Strike",
          "desc": "Trade advantage on an attack for an extra strike."
        }
      ]
    }
  },
  "Wizard": {
    "School of Evocation": {
      "emoji": "🔥",
      "desc": "Masters of raw destructive magic — fire, lightning, and force shaped with surgical control.",
      "features": [
        {
          "name": "Sculpt Spells",
          "desc": "Carve safe pockets in your area spells so allies are unharmed."
        },
        {
          "name": "Potent Cantrip",
          "desc": "Your damaging cantrips still hurt even when targets save."
        },
        {
          "name": "Empowered Evocation",
          "desc": "Add your Intelligence modifier to evocation spell damage."
        }
      ]
    },
    "School of Abjuration": {
      "emoji": "🛡️",
      "desc": "Protective mages who specialize in wards, counters, and banishing the dangerous.",
      "features": [
        {
          "name": "Arcane Ward",
          "desc": "Casting abjuration spells raises a damage-absorbing ward around you."
        },
        {
          "name": "Projected Ward",
          "desc": "Extend your ward to shield a nearby ally."
        },
        {
          "name": "Improved Abjuration",
          "desc": "Add proficiency to checks made with Counterspell and Dispel Magic."
        }
      ]
    },
    "School of Divination": {
      "emoji": "🔮",
      "desc": "Seers who peer past the veil of time to glimpse what is to come.",
      "features": [
        {
          "name": "Portent",
          "desc": "Roll two d20s after a long rest and replace any later roll with them."
        },
        {
          "name": "Expert Divination",
          "desc": "Casting a divination partially refunds a lower spell slot."
        },
        {
          "name": "The Third Eye",
          "desc": "Grant yourself darkvision, ethereal sight, or the ability to read any language."
        }
      ]
    },
    "School of Necromancy": {
      "emoji": "💀",
      "desc": "Mages who command the boundary between life and death, raising the dead to serve.",
      "features": [
        {
          "name": "Undead Thralls",
          "desc": "Animate Dead raises an extra, tougher undead minion."
        },
        {
          "name": "Grim Harvest",
          "desc": "Regain hit points whenever you kill a creature with a spell."
        },
        {
          "name": "Inured to Undeath",
          "desc": "Resist necrotic damage and immunity to having your maximum HP reduced."
        }
      ]
    }
  },
  "Rogue": {
    "Thief": {
      "emoji": "🗝️",
      "desc": "A nimble burglar and treasure hunter — fast hands, fast feet, and a knack for using anything.",
      "features": [
        {
          "name": "Fast Hands",
          "desc": "Use Cunning Action to pick locks, disarm traps, or use an object."
        },
        {
          "name": "Second-Story Work",
          "desc": "Climb at full speed and jump unusually far."
        },
        {
          "name": "Use Magic Device",
          "desc": "Ignore class, race, and level requirements on magic items."
        }
      ]
    },
    "Assassin": {
      "emoji": "🔪",
      "desc": "A cold killer specializing in infiltration, disguise, and ending fights before they begin.",
      "features": [
        {
          "name": "Assassinate",
          "desc": "Advantage on creatures that haven't acted; automatic crits against the surprised."
        },
        {
          "name": "Infiltration Expertise",
          "desc": "Craft believable false identities."
        },
        {
          "name": "Impostor",
          "desc": "Mimic the speech, writing, and mannerisms of others."
        }
      ]
    },
    "Arcane Trickster": {
      "emoji": "🎴",
      "desc": "A rogue who laces thievery with enchantment and illusion magic.",
      "features": [
        {
          "name": "Spellcasting",
          "desc": "Learn wizard spells focused on enchantment and illusion."
        },
        {
          "name": "Mage Hand Legerdemain",
          "desc": "Control an invisible Mage Hand to pickpocket and plant from afar."
        },
        {
          "name": "Magical Ambush",
          "desc": "Foes have disadvantage to save against your spells while you're hidden."
        }
      ]
    },
    "Swashbuckler": {
      "emoji": "🤺",
      "desc": "A daring duelist and charmer who turns one-on-one combat into an art.",
      "features": [
        {
          "name": "Fancy Footwork",
          "desc": "A creature you attack can't make opportunity attacks against you."
        },
        {
          "name": "Rakish Audacity",
          "desc": "Add Charisma to initiative and sneak attack in a duel without advantage."
        },
        {
          "name": "Panache",
          "desc": "Charm or goad a creature with sheer charisma."
        }
      ]
    }
  },
  "Cleric": {
    "Life Domain": {
      "emoji": "❤️‍🩹",
      "desc": "Healers and protectors who channel positive energy to mend wounds and hold back death.",
      "features": [
        {
          "name": "Disciple of Life",
          "desc": "Your healing spells restore extra hit points."
        },
        {
          "name": "Preserve Life",
          "desc": "Channel Divinity to pour out a burst of healing among the wounded."
        },
        {
          "name": "Blessed Healer",
          "desc": "Healing others also heals you."
        }
      ]
    },
    "Light Domain": {
      "emoji": "☀️",
      "desc": "Warriors of radiance who scorch foes with searing flame and banish the dark.",
      "features": [
        {
          "name": "Warding Flare",
          "desc": "Impose disadvantage on an attacker with a flash of light."
        },
        {
          "name": "Radiance of the Dawn",
          "desc": "Channel Divinity to dispel magical darkness and sear nearby foes."
        },
        {
          "name": "Improved Flare",
          "desc": "Use Warding Flare to protect allies too."
        }
      ]
    },
    "War Domain": {
      "emoji": "⚔️",
      "desc": "Militant priests who fight on the front line with divine fury and weapon mastery.",
      "features": [
        {
          "name": "War Priest",
          "desc": "Make a bonus-action weapon attack several times per rest."
        },
        {
          "name": "Guided Strike",
          "desc": "Channel Divinity to add +10 to an attack roll."
        },
        {
          "name": "Divine Strike",
          "desc": "Infuse weapon strikes with extra divine damage."
        }
      ]
    },
    "Death Domain": {
      "emoji": "💀",
      "desc": "Reapers who wield necrotic power and the cold mathematics of mortality.",
      "features": [
        {
          "name": "Reaper",
          "desc": "Necromancy cantrips that target one creature can strike two."
        },
        {
          "name": "Touch of Death",
          "desc": "Channel Divinity for a burst of extra necrotic damage on a melee hit."
        },
        {
          "name": "Divine Strike",
          "desc": "Imbue weapon attacks with necrotic damage."
        }
      ]
    }
  },
  "Artificer": {
    "Alchemist": {
      "emoji": "⚗️",
      "desc": "A chemist of magic who brews healing elixirs and corrosive, fiery concoctions.",
      "features": [
        {
          "name": "Experimental Elixir",
          "desc": "Brew beneficial elixirs after a rest — healing, swiftness, flight, and more."
        },
        {
          "name": "Alchemical Savant",
          "desc": "Boost the healing and damage of your spells with your tools."
        },
        {
          "name": "Restorative Reagents",
          "desc": "Elixirs grant temporary HP; cast Lesser Restoration for free."
        }
      ]
    },
    "Artillerist": {
      "emoji": "💥",
      "desc": "A siege-mage who conjures an Eldritch Cannon to bombard the battlefield.",
      "features": [
        {
          "name": "Eldritch Cannon",
          "desc": "Summon a small cannon that blasts foes, shields allies, or repels enemies."
        },
        {
          "name": "Arcane Firearm",
          "desc": "Channel spells through a wand or staff for extra damage."
        },
        {
          "name": "Explosive Cannon",
          "desc": "Your cannon hits harder and can be detonated."
        }
      ]
    },
    "Battle Smith": {
      "emoji": "🔧",
      "desc": "A protector who fights alongside a loyal mechanical Steel Defender.",
      "features": [
        {
          "name": "Steel Defender",
          "desc": "Build a faithful construct companion that guards and attacks."
        },
        {
          "name": "Battle Ready",
          "desc": "Use Intelligence for attacks with magic weapons."
        },
        {
          "name": "Arcane Jolt",
          "desc": "Channel magic through attacks for extra force damage or to heal an ally."
        }
      ]
    },
    "Armorer": {
      "emoji": "🦾",
      "desc": "An inventor who lives inside magical power armor, tuned for defense or infiltration.",
      "features": [
        {
          "name": "Arcane Armor",
          "desc": "Turn armor into a magical exosuit that can't be removed against your will."
        },
        {
          "name": "Armor Model",
          "desc": "Configure as Guardian (frontline tank) or Infiltrator (stealthy striker)."
        },
        {
          "name": "Extra Attack",
          "desc": "Attack twice whenever you take the Attack action."
        }
      ]
    }
  },
  "Barbarian": {
    "Path of the Berserker": {
      "emoji": "🪓",
      "desc": "Warriors who give themselves to unbridled fury, becoming engines of slaughter.",
      "features": [
        {
          "name": "Frenzy",
          "desc": "Rage harder for an extra bonus-action attack each turn, at the cost of exhaustion."
        },
        {
          "name": "Mindless Rage",
          "desc": "Can't be charmed or frightened while raging."
        },
        {
          "name": "Intimidating Presence",
          "desc": "Strike fear into a creature with your sheer menace."
        }
      ]
    },
    "Path of the Totem Warrior": {
      "emoji": "🐻",
      "desc": "Spiritual barbarians who draw power from animal totem spirits.",
      "features": [
        {
          "name": "Spirit Seeker",
          "desc": "Commune with beasts through ritual magic."
        },
        {
          "name": "Totem Spirit",
          "desc": "Choose Bear, Eagle, or Wolf for resilience, mobility, or pack tactics."
        },
        {
          "name": "Aspect of the Beast",
          "desc": "Gain a lasting boon from your chosen animal."
        }
      ]
    },
    "Path of the Zealot": {
      "emoji": "⚡",
      "desc": "Holy warriors filled with divine fury — hard to keep down and harder to kill.",
      "features": [
        {
          "name": "Divine Fury",
          "desc": "Deal extra radiant or necrotic damage on your first hit each turn while raging."
        },
        {
          "name": "Warrior of the Gods",
          "desc": "Allies can revive you without costly material components."
        },
        {
          "name": "Rage Beyond Death",
          "desc": "Keep fighting at 0 hit points until your rage ends."
        }
      ]
    },
    "Path of the Storm Herald": {
      "emoji": "⛈️",
      "desc": "Barbarians whose rage erupts as a primal aura of desert, sea, or tundra.",
      "features": [
        {
          "name": "Storm Aura",
          "desc": "Your rage emits a damaging or supportive aura of your chosen environment."
        },
        {
          "name": "Storm Soul",
          "desc": "Gain resistance tied to your environment."
        },
        {
          "name": "Shielding Storm",
          "desc": "Extend your aura's protection to nearby allies."
        }
      ]
    }
  },
  "Warlock": {
    "The Fiend": {
      "emoji": "🔥",
      "desc": "A pact with a lord of the Lower Planes — hellish power bought with a soul.",
      "features": [
        {
          "name": "Dark One's Blessing",
          "desc": "Gain temporary hit points whenever you drop an enemy."
        },
        {
          "name": "Dark One's Own Luck",
          "desc": "Call on your patron to boost a roll once per rest."
        },
        {
          "name": "Fiendish Resilience",
          "desc": "Choose a damage type to resist after each rest."
        }
      ]
    },
    "The Great Old One": {
      "emoji": "🐙",
      "desc": "A pact with an incomprehensible cosmic entity from beyond the stars.",
      "features": [
        {
          "name": "Awakened Mind",
          "desc": "Speak telepathically to any creature you can see."
        },
        {
          "name": "Entropic Ward",
          "desc": "Impose disadvantage on an attacker, then gain advantage in return."
        },
        {
          "name": "Thought Shield",
          "desc": "Resist psychic damage and shield your mind from being read."
        }
      ]
    },
    "The Archfey": {
      "emoji": "🌿",
      "desc": "A pact with a capricious lord of the Feywild — beguiling, fey, and mercurial.",
      "features": [
        {
          "name": "Fey Presence",
          "desc": "Charm or frighten the creatures around you in a burst."
        },
        {
          "name": "Misty Escape",
          "desc": "Turn invisible and teleport when you take damage."
        },
        {
          "name": "Beguiling Defenses",
          "desc": "Immunity to being charmed, and the power to turn charms back on foes."
        }
      ]
    },
    "The Hexblade": {
      "emoji": "⚔️",
      "desc": "A pact with a sentient weapon-spirit of the Shadowfell — martial and cursed.",
      "features": [
        {
          "name": "Hexblade's Curse",
          "desc": "Curse a foe for bonus damage, easier crits, and healing when it dies."
        },
        {
          "name": "Hex Warrior",
          "desc": "Use Charisma for your weapon attacks with a bound weapon."
        },
        {
          "name": "Accursed Specter",
          "desc": "Slay a foe and raise its spirit to fight for you."
        }
      ]
    }
  },
  "Illrigger": {
    "Architect of Ruin": {
      "emoji": "🏛️",
      "desc": "Cool, calculating arcane knights of Asmodeus who win at any cost with spell, steel, and subterfuge.",
      "features": [
        {
          "name": "Arcane Mastery",
          "desc": "Augment your infernal spells using your Baleful Seals."
        },
        {
          "name": "Spell and Steel",
          "desc": "Blend martial combat with a wider arsenal of diabolic magic."
        },
        {
          "name": "Servant of Asmodeus",
          "desc": "Serve the Lord of the Nine Hells with patient, ruthless strategy."
        }
      ]
    },
    "Hellspeaker": {
      "emoji": "🗣️",
      "desc": "Silver-tongued servants of Moloch who turn enemies into unwitting allies.",
      "features": [
        {
          "name": "Honeyed Words",
          "desc": "Coerce, charm, and deceive in both combat and court."
        },
        {
          "name": "Master of the Charmed",
          "desc": "Specialize in the Charmed condition to bend foes to your will."
        },
        {
          "name": "Subtle Manipulation",
          "desc": "Slip about the battlefield as a master of mental manipulation."
        }
      ]
    },
    "Painkiller": {
      "emoji": "🛡️",
      "desc": "Heavily armored death troopers of Dispater who lead Hell's battles from the front.",
      "features": [
        {
          "name": "Heavy Plate",
          "desc": "Improve to heavy armor and frontline battlefield dominance."
        },
        {
          "name": "Command",
          "desc": "Direct allies to strike and hold the line."
        },
        {
          "name": "Champion of Dispater",
          "desc": "Inspire dread and crush enemies with ruthless efficiency."
        }
      ]
    },
    "Sanguine Knight": {
      "emoji": "🩸",
      "desc": "Blood-knights of Sutekh who drain enemies' vitality to heal and empower allies.",
      "features": [
        {
          "name": "Blood Magic",
          "desc": "Drain the life force from your foes."
        },
        {
          "name": "Vital Transfer",
          "desc": "Pour stolen vitality into healing and empowering your team."
        },
        {
          "name": "Servant of Sutekh",
          "desc": "Turn the tide of battle through forbidden blood sorcery."
        }
      ]
    },
    "Shadowmaster": {
      "emoji": "🌑",
      "desc": "Hidden assassins of Belial — masters of stealth, disguise, and the killing strike.",
      "features": [
        {
          "name": "Hidden Killer",
          "desc": "Strike from darkness with precision and stealth."
        },
        {
          "name": "Master of Disguise",
          "desc": "Excel at infiltration and deception."
        },
        {
          "name": "Servant of Belial",
          "desc": "Move unseen as Hell's deadliest skirmisher."
        }
      ]
    }
  },
  "Blood Hunter": {
    "Order of the Ghostslayer": {
      "emoji": "👻",
      "desc": "The oldest order, dedicated to hunting and destroying the undead.",
      "features": [
        {
          "name": "Rite of the Dawn",
          "desc": "Your Crimson Rite deals radiant damage, devastating to the undead."
        },
        {
          "name": "Curse Specialist",
          "desc": "Empower your Hunter's Bane against the dead."
        },
        {
          "name": "Ethereal Step",
          "desc": "Briefly walk the boundary between worlds to evade harm."
        }
      ]
    },
    "Order of the Lycan": {
      "emoji": "🐺",
      "desc": "Hunters who embrace a controlled curse of lycanthropy, fighting monsters as one of them.",
      "features": [
        {
          "name": "Hybrid Transformation",
          "desc": "Shift into a savage half-beast form with claws and resilience."
        },
        {
          "name": "Heightened Senses",
          "desc": "Gain keen, predatory perception."
        },
        {
          "name": "Bloodlust",
          "desc": "Master the beast within so the curse serves you, not the reverse."
        }
      ]
    },
    "Order of the Profane Soul": {
      "emoji": "🔮",
      "desc": "Blood hunters who strike a pact with an otherworldly patron for eldritch power.",
      "features": [
        {
          "name": "Otherworldly Patron",
          "desc": "Gain warlock spellcasting and an Eldritch invocation."
        },
        {
          "name": "Rite Focus",
          "desc": "Channel spells through your rite-marked weapon."
        },
        {
          "name": "Mutated Magic",
          "desc": "Blend hex magic with your hemocraft."
        }
      ]
    },
    "Order of the Mutant": {
      "emoji": "🧬",
      "desc": "Alchemists of their own blood, brewing mutagens that reshape body and mind.",
      "features": [
        {
          "name": "Mutagencraft",
          "desc": "Formulate mutagens that grant powerful boons with side effects."
        },
        {
          "name": "Strange Metabolism",
          "desc": "Resist poison and shrug off toxins."
        },
        {
          "name": "Mutagenic Mastery",
          "desc": "Drink multiple mutagens at once for combined effects."
        }
      ]
    }
  },
  "Sorcerer": {
    "Draconic Bloodline": {
      "emoji": "🐉",
      "desc": "Magic born of draconic ancestry — your blood carries a dragon's might and resilience.",
      "features": [
        {
          "name": "Dragon Ancestor",
          "desc": "Choose a dragon type; speak Draconic and gain a commanding edge with dragons."
        },
        {
          "name": "Draconic Resilience",
          "desc": "Extra hit points and a scaly toughness that sets your base armor class."
        },
        {
          "name": "Elemental Affinity",
          "desc": "Add your Charisma modifier to one damage type tied to your dragon."
        }
      ]
    },
    "Wild Magic": {
      "emoji": "🎲",
      "desc": "Raw, unpredictable chaos magic that surges at the edges of your spells.",
      "features": [
        {
          "name": "Wild Magic Surge",
          "desc": "Your spells can trigger random magical effects from a table of chaos."
        },
        {
          "name": "Tides of Chaos",
          "desc": "Gain advantage on a roll once per rest — at the cost of a likely surge."
        },
        {
          "name": "Bend Luck",
          "desc": "Spend sorcery points to nudge another creature's roll up or down."
        }
      ]
    },
    "Divine Soul": {
      "emoji": "✨",
      "desc": "A spark of divine power lets you weave both arcane and clerical magic.",
      "features": [
        {
          "name": "Divine Magic",
          "desc": "Add cleric spells to your known list, blending faith with raw sorcery."
        },
        {
          "name": "Favored by the Gods",
          "desc": "Bolster a failed save or a missed attack with a burst of divine luck."
        },
        {
          "name": "Empowered Healing",
          "desc": "Reroll dice when you or an ally restores hit points nearby."
        }
      ]
    },
    "Shadow Magic": {
      "emoji": "🌑",
      "desc": "Your magic wells up from the Shadowfell, the plane of darkness and death.",
      "features": [
        {
          "name": "Eyes of the Dark",
          "desc": "Gain darkvision and cast Darkness, seeing through your own gloom."
        },
        {
          "name": "Strength of the Grave",
          "desc": "When dropped to 0 hit points, a save can leave you standing at 1."
        },
        {
          "name": "Hound of Ill Omen",
          "desc": "Summon a shadow hound to hunt and hamper a chosen foe."
        }
      ]
    }
  },
  "Druid": {
    "Circle of the Land": {
      "emoji": "🌳",
      "desc": "Druids of the old faith — keepers of sacred groves and ancient lore.",
      "features": [
        {
          "name": "Natural Recovery",
          "desc": "Regain expended spell slots during a short rest."
        },
        {
          "name": "Circle Spells",
          "desc": "Gain extra always-prepared spells tied to your chosen land."
        },
        {
          "name": "Land's Stride",
          "desc": "Move through nonmagical difficult terrain and hazards unhindered."
        }
      ]
    },
    "Circle of the Moon": {
      "emoji": "🌕",
      "desc": "Fierce shapeshifters who become powerful beasts to guard the wilds.",
      "features": [
        {
          "name": "Combat Wild Shape",
          "desc": "Transform as a bonus action and spend spell slots to heal in beast form."
        },
        {
          "name": "Circle Forms",
          "desc": "Take the shape of far more dangerous beasts than other druids."
        },
        {
          "name": "Primal Strike",
          "desc": "Your beast-form attacks count as magical for overcoming resistance."
        }
      ]
    },
    "Circle of the Stars": {
      "emoji": "⭐",
      "desc": "Druids who chart the heavens and channel the power of constellations.",
      "features": [
        {
          "name": "Star Map",
          "desc": "Carry a guiding celestial chart that grants you bonus spells."
        },
        {
          "name": "Starry Form",
          "desc": "Take an Archer, Chalice, or Dragon constellation form for ranged power, healing, or focus."
        },
        {
          "name": "Cosmic Omen",
          "desc": "Read the stars each day to aid allies or hinder foes with reactions."
        }
      ]
    },
    "Circle of Spores": {
      "emoji": "🍄",
      "desc": "Druids who embrace decay as part of nature's cycle, commanding fungus and the risen dead.",
      "features": [
        {
          "name": "Halo of Spores",
          "desc": "A reactive aura of spores deals necrotic damage to creatures near you."
        },
        {
          "name": "Symbiotic Entity",
          "desc": "Spend Wild Shape for temporary hit points and empowered spore attacks."
        },
        {
          "name": "Fungal Infestation",
          "desc": "Raise a slain creature as a short-lived fungal zombie under your command."
        }
      ]
    }
  }
};

// Which classes does this character still owe a subclass choice for?
// A class is "owed" when it has subclass options defined, the character is at or
// past its pick-level, and no subclass has been chosen yet. Computed live on load
// so adding new class data later prompts existing saves without a version bump.
export const owedSubclasses = (char) => {
  if (!char) return [];
  const levels = char.classLevels || (char.cls ? { [char.cls.name]: char.level } : {});
  const chosen = char.subclasses || {};
  return Object.entries(levels)
    .filter(([cls, lvl]) =>
      SUBCLASSES[cls] && lvl >= (SUBCLASS_PICK_LEVEL[cls] || 99) && !chosen[cls]
    )
    .map(([cls]) => cls);
};

// Compact one-line blurb for the system prompt.
export const subclassBlurb = (className, subName) => {
  const sc = SUBCLASSES[className]?.[subName];
  if (!sc) return '';
  const feats = sc.features.map(f => f.name).join(', ');
  return `${subName} (${className}): ${sc.desc} Key features: ${feats}.`;
};

// All chosen subclasses as prompt lines (handles multiclass).
export const subclassPromptLines = (char) => {
  const chosen = char?.subclasses || {};
  return Object.entries(chosen)
    .map(([cls, sub]) => subclassBlurb(cls, sub))
    .filter(Boolean)
    .map(line => `\n- SUBCLASS: ${line}`)
    .join('');
};
