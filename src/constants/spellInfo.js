// ── Spell & ability reference ─────────────────────────────────────────────────
// UI-only data: a role tag and a one-line description for each entry in
// CLASS_ABILITIES. None of this reaches the DM — the prompt sends bare names —
// so it costs nothing at runtime and exists purely so the player can tell what
// they are choosing in the abilities picker.
//
// Roles are what you are reaching for when you pick, not schools of magic:
//   damage   — it hurts something
//   defense  — it protects you or an ally
//   healing  — it restores hit points or removes a condition
//   control  — it takes away the enemy's options
//   utility  — everything else: movement, senses, exploration, social
//
// Entries are shared across classes: a spell described once is described for
// every class that has it. Anything missing simply renders without a
// description, so this can be filled in class by class.

export const ROLES = {
  damage:  { label: 'Damage',  emoji: '⚔️' },
  defense: { label: 'Defence', emoji: '🛡️' },
  healing: { label: 'Healing', emoji: '✚'  },
  control: { label: 'Control', emoji: '🌀' },
  utility: { label: 'Utility', emoji: '🔮' },
};
export const ROLE_ORDER = ['damage', 'control', 'defense', 'healing', 'utility'];

export const SPELL_INFO = {
  // ── Paladin ────────────────────────────────────────────────────────────────
  // Class features
  'Lay on Hands':          { role:'healing', desc:'A pool of healing equal to five times your level, spent a few points at a time by touch. Can also cure a disease or neutralise a poison.' },
  'Divine Sense':          { role:'utility', desc:'For a moment you know the location of every celestial, fiend and undead within 60 feet, and any consecrated or desecrated ground.' },
  'Divine Smite':          { role:'damage',  desc:'Burn a spell slot as you hit to add a burst of radiant damage — 2d8, and more against undead and fiends. Declared after the hit lands.' },
  'Extra Attack':          { role:'damage',  desc:'Attack twice whenever you take the Attack action.' },
  'Aura of Protection':    { role:'defense', desc:'You and every ally within 10 feet add your Charisma modifier to all saving throws.' },
  'Aura of Courage':       { role:'defense', desc:'You and allies within 10 feet cannot be frightened while you are conscious.' },
  'Improved Divine Smite': { role:'damage',  desc:'Every melee weapon hit carries an extra 1d8 radiant damage, no slot spent.' },
  'Cleansing Touch':       { role:'utility', desc:'End one spell on yourself or a willing creature you touch, a number of times per long rest equal to your Charisma modifier.' },

  // Spells
  'Bless':                 { role:'defense', desc:'Up to three creatures add 1d4 to attack rolls and saving throws for a minute.' },
  'Command':               { role:'control', desc:'A one-word order a creature must obey on its next turn — drop, flee, halt, grovel — if it fails a Wisdom save.' },
  'Compelled Duel':        { role:'control', desc:'One creature is drawn to fight you: it takes a penalty to attack anyone else and struggles to move away from you.' },
  'Cure Wounds':           { role:'healing', desc:'Restore hit points by touch. Does nothing for constructs and undead.' },
  'Heroism':               { role:'defense', desc:'A creature becomes immune to fear and gains temporary hit points at the start of each of its turns.' },
  'Protection from Evil and Good': { role:'defense', desc:'Aberrations, celestials, elementals, fey, fiends and undead have disadvantage attacking the warded creature, and cannot charm or frighten it.' },
  'Searing Smite':         { role:'damage',  desc:'Your next hit sets the target alight — extra fire damage, and it keeps burning each turn until it makes a save.' },
  'Shield of Faith':       { role:'defense', desc:'+2 AC to one creature for up to ten minutes.' },
  'Thunderous Smite':      { role:'damage',  desc:'Your next hit cracks like thunder: extra thunder damage, and the target is knocked prone and pushed back if it fails a save.' },
  'Wrathful Smite':        { role:'damage',  desc:'Your next hit carries extra psychic damage and leaves the target frightened of you until it can shake off the dread.' },
  'Aid':                   { role:'healing', desc:'Three creatures gain +5 to their hit point maximum and current hit points for eight hours.' },
  'Branding Smite':        { role:'damage',  desc:'Your next hit brands the target with light — extra radiant damage, and it sheds light and cannot turn invisible.' },
  'Find Steed':            { role:'utility', desc:'Summon a bonded spirit mount that understands you, moves with your intent, and shares spells you cast on yourself.' },
  'Lesser Restoration':    { role:'healing', desc:'End one disease, or one condition: blinded, deafened, paralysed or poisoned.' },
  'Magic Weapon':          { role:'damage',  desc:'A weapon becomes magical and gains +1 to attack and damage for an hour.' },
  'Zone of Truth':         { role:'utility', desc:'Creatures in a 15-foot sphere cannot speak a deliberate lie, and you know who resisted.' },
  'Blinding Smite':        { role:'control', desc:'Your next hit bursts with light — extra radiant damage, and the target is blinded until it saves.' },
  "Crusader's Mantle":     { role:'damage',  desc:'Allies within 30 feet add 1d4 radiant damage to every weapon hit while the aura holds.' },
  'Dispel Magic':          { role:'utility', desc:'End a spell on a creature, object or area. Higher-level magic may resist.' },
  'Elemental Weapon':      { role:'damage',  desc:'A weapon gains +1 to hit and an extra 1d4 of an element you choose.' },
  'Remove Curse':          { role:'utility', desc:'Break one curse, including the bond tying a cursed item to its owner.' },
  'Revivify':              { role:'healing', desc:'Bring back a creature that died within the last minute, at 1 hit point. Cannot regrow missing parts.' },
  'Aura of Life':          { role:'defense', desc:'You and nearby allies resist necrotic damage and cannot have your hit point maximum reduced.' },
  'Aura of Purity':        { role:'defense', desc:'You and nearby allies resist poison, cannot be diseased, and have advantage against a long list of conditions.' },
  'Banishment':            { role:'control', desc:'Send a creature to a harmless demiplane for a minute. If it came from elsewhere, it stays there.' },
  'Death Ward':            { role:'defense', desc:'The next time the warded creature would drop to 0 hit points, it drops to 1 instead — or shrugs off an outright kill effect.' },
  'Find Greater Steed':    { role:'utility', desc:'As Find Steed, but the mount is a griffon, pegasus, peryton, dire wolf, rhinoceros or saber-toothed tiger.' },
  'Guardian of Faith':     { role:'damage',  desc:'A spectral guardian holds a spot for eight hours, dealing radiant damage to enemies who come near, until it has dealt 60.' },
  'Staggering Smite':      { role:'control', desc:'Your next hit rattles the mind — extra psychic damage, and the target loses its reaction and staggers on its next turn.' },
  'Banishing Smite':       { role:'damage',  desc:'Your next hit deals heavy force damage and banishes a badly wounded target outright.' },
  'Circle of Power':       { role:'defense', desc:'Allies within 30 feet gain advantage on saves against magic, and take no damage at all when they succeed on a save-for-half effect.' },
  'Destructive Wave':      { role:'damage',  desc:'The ground erupts around you — thunder damage plus radiant or necrotic to every enemy within 30 feet, knocking them prone.' },
  'Dispel Evil and Good':  { role:'defense', desc:'Extraplanar creatures have disadvantage attacking you, and you can break a possession, dismiss a fiend, or end a charm with a touch.' },
  'Holy Weapon':           { role:'damage',  desc:'A weapon blazes with light: an extra 2d8 radiant on every hit, and it can be detonated for a burst of radiance that blinds.' },
  'Raise Dead':            { role:'healing', desc:'Return a creature dead up to ten days to life, though it returns weakened for a few days.' },
};
