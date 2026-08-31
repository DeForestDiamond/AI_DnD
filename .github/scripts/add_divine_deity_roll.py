from pathlib import Path

p = Path('src/constants/adventures.js')
s = p.read_text()

anchor = "const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];\n\n"
if s.count(anchor) != 1:
    raise SystemExit(f'expected one pick anchor, found {s.count(anchor)}')

block = r'''const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Divine Adventures roll their deity in the app instead of asking the DM model
// to invent one. The tier roll is intentional: choosing uniformly from one huge
// deity list would make numerous minor powers crowd out the major gods.
// These are story-selection tiers for Forgotten Realms play, not a rules engine;
// divine rank has shifted across editions and the Second Sundering.
export const DIVINE_POWERS = {
  greater: [
    { name:'Asmodeus', portfolio:'indulgence, tyranny, contracts, and the Nine Hells' },
    { name:'Bane', portfolio:'tyranny, fear, ambition, and domination' },
    { name:'Chauntea', portfolio:'agriculture, life, growth, and the land' },
    { name:'Corellon', portfolio:'elves, art, magic, and creation' },
    { name:'Cyric', portfolio:'lies, strife, deception, and murder' },
    { name:'Gruumsh', portfolio:'orcs, conquest, strength, and survival' },
    { name:'Lathander', portfolio:'dawn, renewal, birth, and new beginnings' },
    { name:'Lolth', portfolio:'drow, spiders, intrigue, darkness, and ruthless ambition' },
    { name:'Moradin', portfolio:'dwarves, creation, smithing, and protection' },
    { name:'Mystra', portfolio:'magic, spellcraft, and the Weave' },
    { name:'Oghma', portfolio:'knowledge, invention, inspiration, and ideas' },
    { name:'Shar', portfolio:'darkness, loss, secrets, and forgetfulness' },
    { name:'Silvanus', portfolio:'wild nature, balance, and untamed places' },
    { name:'Sune', portfolio:'love, beauty, passion, and art' },
    { name:'Talos', portfolio:'storms, destruction, rebellion, and natural catastrophe' },
    { name:'Tempus', portfolio:'war, battle, courage, and honorable combat' },
    { name:'Tyr', portfolio:'justice, law, judgment, and righteous order' },
  ],
  intermediate: [
    { name:'Gond', portfolio:'craft, invention, technology, and smithing' },
    { name:'Helm', portfolio:'guardians, protection, duty, and vigilance' },
    { name:'Ilmater', portfolio:'endurance, suffering, perseverance, and compassion' },
    { name:'Kelemvor', portfolio:'death, the dead, judgment, and the proper passage of souls' },
    { name:'Mask', portfolio:'thieves, shadows, intrigue, and deception' },
    { name:'Mielikki', portfolio:'forests, rangers, autumn, and woodland creatures' },
    { name:'Selûne', portfolio:'the moon, stars, navigation, wanderers, and good lycanthropes' },
    { name:'Torm', portfolio:'duty, loyalty, courage, and righteous service' },
    { name:'Tymora', portfolio:'good fortune, skill, adventurers, and daring' },
    { name:'Umberlee', portfolio:'the sea, waves, storms, and sailors\' fear' },
    { name:'Waukeen', portfolio:'trade, wealth, merchants, and commerce' },
    { name:'Kossuth', portfolio:'elemental fire, purification, and flame' },
    { name:'Akadi', portfolio:'elemental air, movement, freedom, and wind' },
    { name:'Grumbar', portfolio:'elemental earth, solidity, endurance, and stone' },
    { name:'Istishia', portfolio:'elemental water, currents, change, and purification' },
  ],
  lesser: [
    { name:'Auril', portfolio:'winter, cold, ice, and harsh endurance' },
    { name:'Bahamut', portfolio:'metallic dragons, justice, protection, and nobility' },
    { name:'Beshaba', portfolio:'misfortune, accidents, bad luck, and ill fate' },
    { name:'Bhaal', portfolio:'murder, assassins, and violent death' },
    { name:'Deneir', portfolio:'writing, glyphs, literature, and scholarship' },
    { name:'Eilistraee', portfolio:'drow redemption, song, moonlight, freedom, and beauty' },
    { name:'Eldath', portfolio:'peace, quiet places, springs, and still waters' },
    { name:'Jergal', portfolio:'fatalism, records of the dead, and proper burial' },
    { name:'Lliira', portfolio:'joy, celebration, freedom, dance, and festivals' },
    { name:'Loviatar', portfolio:'pain, punishment, endurance, and suffering' },
    { name:'Malar', portfolio:'the hunt, predators, bloodlust, and savage nature' },
    { name:'Myrkul', portfolio:'death, decay, mortality, and fear of death' },
    { name:'Red Knight', portfolio:'strategy, tactics, planning, and battlefield calculation' },
    { name:'Savras', portfolio:'divination, fate, truth, and prophecy' },
    { name:'Sharess', portfolio:'festhalls, pleasure, sensuality, and cats' },
    { name:'Shaundakul', portfolio:'travel, wind, portals, exploration, and caravans' },
    { name:'Talona', portfolio:'poison, disease, plague, and contagion' },
    { name:'Tiamat', portfolio:'chromatic dragons, greed, conquest, and vengeance' },
  ],
};

const DIVINE_ADVENTURE_TITLES = new Set([
  'The Wrong Chosen One',
  'A God Has a Favor',
  'The Divine Emissary',
  'The God Who Owes You',
  'Two Gods, One Problem',
  'The Enemy God Needs You',
  'The Church Did Not Ask Permission',
  'A Prayer Answered Sideways',
  'The Missing God',
  'The Petty Request of an Immortal',
  'The Avatar Made You Jump',
  'A God Wants Something Back',
]);

export function rollDivinePower(excludedNames = []) {
  const excluded = new Set(excludedNames);
  const r = Math.random() * 100;
  const rank = r < 40 ? 'greater' : r < 75 ? 'intermediate' : 'lesser';
  const available = DIVINE_POWERS[rank].filter(d => !excluded.has(d.name));
  const deity = pick(available.length ? available : DIVINE_POWERS[rank]);
  return { ...deity, rank };
}

'''
s = s.replace(anchor, block, 1)

old = """  if (!a) return null;\n  return { ...a, location: pick(a.locations), tone: pick(tones), openingStyle: pick(openingStyles) };\n}"""
new = """  if (!a) return null;\n\n  const prepared = { ...a, location: pick(a.locations), tone: pick(tones), openingStyle: pick(openingStyles) };\n  if (!DIVINE_ADVENTURE_TITLES.has(a.title)) return prepared;\n\n  const first = rollDivinePower();\n  const powers = a.title === 'Two Gods, One Problem'\n    ? [first, rollDivinePower([first.name])]\n    : [first];\n  const divineDirective = powers.length === 1\n    ? `APP-ROLLED DIVINE POWER: ${first.name} (${first.rank}; ${first.portfolio}). This exact deity is authoritative for this Adventure. Do not substitute a different god.`\n    : `APP-ROLLED DIVINE POWERS: ${powers.map(d => `${d.name} (${d.rank}; ${d.portfolio})`).join(' AND ')}. These exact deities are authoritative for this Adventure. Do not substitute different gods.`;\n\n  return {\n    ...prepared,\n    deity: first,\n    deities: powers,\n    premise: `${a.premise} ${divineDirective}`,\n  };\n}"""
if s.count(old) != 1:
    raise SystemExit(f'expected one prepare anchor, found {s.count(old)}')
s = s.replace(old, new, 1)

p.write_text(s)
print('Patched src/constants/adventures.js with app-side divine deity rolling')
