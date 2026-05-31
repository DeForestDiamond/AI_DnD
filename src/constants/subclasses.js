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
  Illrigger: 3, 'Blood Hunter': 3,
};

export const SUBCLASSES = {
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
