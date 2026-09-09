const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── NPC race/gender roll for social encounters ─────────────────────────────────
// The app rolls who you meet — humans and half-elves are deliberately a minority
// weight so the DM's training-data default can't dominate the road.
export const NPC_RACES = [
  'dwarf', 'dwarf', 'elf', 'elf', 'halfling', 'halfling', 'gnome', 'gnome',
  'tiefling', 'tiefling', 'dragonborn', 'dragonborn', 'half-orc', 'half-orc',
  'goliath', 'tabaxi', 'kenku', 'firbolg', 'aasimar', 'genasi', 'lizardfolk', 'orc',
  'human', 'human', 'half-elf',
];
export const NPC_RACES_BY_ENV = {
  astral: [
    'astral elf', 'astral elf', 'githyanki', 'githzerai', 'giff', 'plasmoid',
    'autognome', 'thri-kreen', 'hadozee', 'human', 'elf', 'dwarf', 'tiefling',
    'dragonborn', 'aasimar', 'genasi',
  ],
  shadowfell: ['shadar-kai', 'dusk elf', 'human', 'tiefling', 'kenku', 'ghost', 'ravenfolk'],
  fire: ['azer', 'fire genasi', 'efreeti', 'salamander', 'brass dragonborn', 'human', 'tiefling'],
  water: ['merfolk', 'water genasi', 'marid', 'triton', 'sea elf', 'human', 'dragonborn'],
};
export const rollNpcDescriptor = (environment = 'wilderness') => {
  const races = NPC_RACES_BY_ENV[environment] || NPC_RACES;
  return `${Math.random() < 0.5 ? 'male' : 'female'} ${pick(races)}`;
};

export const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water', 'air', 'earth', 'limbo', 'mechanus', 'sigil', 'hells', 'abyss', 'hades', 'gehenna', 'carceri', 'arborea', 'ysgard', 'celestia', 'elysium', 'ethereal']);
