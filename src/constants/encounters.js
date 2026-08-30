// ── Encounters, pacing, and arc antagonists ────────────────────────────────────
// The app decides WHEN an encounter happens and WHAT it is; the DM only narrates.
// Same philosophy as the dice roller: never trust the model with mechanics.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Arc antagonists (shared by adventure seeds and arc re-rolls) ───────────────
// Three tiers, gated by level. An arc villain is built up over many sessions and
// fought on the player's terms, so tiers run ahead of the random-encounter CR cap.
const LOW_ANTAGONISTS = [ // levels 1+: local, mundane, street-level
  // — the planes leaking in: small, local, deniable —
  'a hag whose bargains are coming due', 'a redcap gang loose in the hedgerows',
  'a fey door someone left open', 'a shadow that follows the wrong person home',
  'a bound elemental that has slipped its circle',
  // — humanoid / organized —
  'a thieves guild', 'a corrupt local official', 'a gang of bandits', 'a goblin warband',
  'a pack of gnolls', 'a rogue hedge wizard', 'a smuggling ring', 'a rival adventuring party',
  'a cult (not cosmic horror — a mundane power-hungry cult)', 'a pirate captain',
  'a group of hobgoblin soldiers',
  'a kobold nest with an ambitious chief', 'an orc raiding band', 'a press gang shanghaiing workers',
  'a crooked merchant consortium', 'a poaching outfit stripping the land', 'a counterfeiting operation',
  'a crew of grave robbers', 'a protection racket squeezing the district', 'deserters turned brigands',
  'a cattle-rustling crew', 'a crooked sheriff and their deputies', 'a fence moving stolen goods through town',
  'a den of wererats under the streets', 'an extortionist moneylender with hired muscle',
  'a bugbear gang shaking down travelers', 'a kenku forgery ring', 'an arsonist-for-hire and whoever pays them',
  // — beasts & monsters (a hungry thing is a problem at any level) —
  'a dire wolf pack hunting the roads', 'a giant spider infestation in the old mine',
  'an owlbear gone territorial over a trade route', 'a swarm of stirges nesting in the rafters',
  'a basilisk lairing in the quarry', 'a pack of ghouls rising from a plague pit',
  'a chimera-sized predator nobody can name', 'a rampaging boar the size of a cart',
  'a nest of giant scorpions under the dunes', 'a harpy flock preying on the cliff road',
  'a cockatrice loose in the vineyards', 'a displacer beast stalking the woods',
  'a giant constrictor in the sewers', 'a hungry pack of worgs with goblin riders',
];
const MID_ANTAGONISTS = [ // levels 5+: regional threats, real monsters
  // — planar —
  'an archfey collecting on a debt nobody remembers making',
  'a fey court that has decided the region belongs to it',
  'the Wild Hunt, and whoever it was sent for',
  'a shadar-kai raiding party out of the Shadowfell',
  'a githyanki raid crew stripping a crashed nautiloid',
  'a cambion building a mortal power base',
  'a cult trying to open a permanent gate',
  'a dao architect who has bought the land beneath the town',
  'an efreeti collecting on a wish granted badly',
  'star spawn seeded under a quiet village',
  'a night hag running a soul market from the Gray Waste',
  'a devil contract broker buying mortal debts for an infernal patron',
  'a demon cult whose summoned patron refuses to go home',
  'a mephit syndicate stealing elemental reagents for an unseen master',
  'an azersmith whose stolen forge-heart is destabilizing the Plane of Fire',
  'a marid noble demanding repayment for an inherited promise',
  'a djinni vizier quietly replacing a mortal court with air elementals',
  'a xorn migration following a vein of impossible gemstones from the Plane of Earth',
  'a shadar-kai collector stealing memories for a Raven Queen cabal',
  'a shadow demon nesting in the reflection of a local noble',
  'a satyr revel that has trapped an entire village in one endless night',
  'a fomorian raiding party hunting escaped servants through the Feywild',
  'a githzerai splinter sect kidnapping psionically gifted mortals',
  'a slaad infestation spreading from a hidden portal to Limbo',
  'a rogue modron trying to impose perfect order on a mortal district',
  'an astral pirate crew preying on spelljammers and planar travelers',
  'a yugoloth mercenary company collecting on both sides of the same war',
  'an ethereal marauder stalking victims from just beyond sight',
  // — humanoid / organized —
  'a vampire and their thralls', 'a necromancer raising the local dead',
  'a yuan-ti slaver operation', 'a hag coven',
  'an ogre warband under a cunning leader', 'a wight commanding restless dead',
  'a doppelganger infiltration ring', 'a green hag quietly running a town',
  'a werewolf pack claiming territory', 'a duergar slaving operation',
  'the vanguard of a hobgoblin legion', 'a medusa building a court of statues',
  'a cult with a real fiend on retainer', 'an oni preying on a town in disguise',
  'a bandit army unifying the local gangs',
  // — beasts & monsters —
  'a troll terrorizing the lowlands', 'a young dragon claiming a territory',
  'a giant rampaging across the farms', 'a manticore with a taste for travelers',
  'a wyvern nesting above the only mountain pass', 'a bulette breaching the trade road',
  'a hydra in the marsh that keeps coming back', 'a pack of hell hounds loosed from somewhere',
  'a gorgon herd trampling the borderlands', 'a roc carrying off livestock and people',
  'a chimera that has claimed the high country', 'a behir hunting the river canyon',
  'an umber hulk collapsing the mine tunnels', 'a remorhaz under the ice fields',
];
const HIGH_ANTAGONISTS = [ // levels 9+: campaign-scale villains
  // — planar and beyond —
  'an archfey whose bargain is unravelling reality around it',
  "a demon lord's vanguard testing a way through",
  'an archdevil moving pieces through mortal proxies',
  "a githyanki lich-queen's fleet in the Astral",
  'the corpse of a dead god, and what is nesting inside it',
  'a Far Realm intrusion that should not have a shape',
  'an elemental prince whose plane is bleeding into this one',
  'a slaad lord spreading chaos through a bloodline',
  'a modron march that has gone wrong and will not stop',
  'a darklord extending their domain past its borders',
  'an archfey court waging a succession war that is rewriting the Feywild around it',
  'a primordial hag trying to steal a season from the mortal world',
  'an eladrin war-host whose shifting allegiance threatens two planes',
  'a nightwalker loose from the Negative Plane and following a stolen soul home',
  'a shadow dragon carving a kingdom out of the Shadowfell',
  'a death giant harvesting souls for a fortress in the Shadowfell',
  'an astral dreadnought being deliberately steered toward a divine dominion',
  'a githyanki warlord launching a private crusade from the Astral Plane',
  'an astral lich collecting fragments of dead gods for a phylactery',
  'an efreeti pasha preparing a planar invasion from the City of Brass',
  'a dao khan collapsing mortal cities to expand a vault on the Plane of Earth',
  'a marid shah whose feud is drowning coastlines on two worlds',
  'a djinni sultan whose stolen citadel is dragging pieces of the Material Plane into Air',
  'a phoenix whose rebirth cycle has become catastrophically unstable',
  'a leviathan elemental awakening in the Plane of Water',
  'an elder tempest turning the Plane of Air into a continent-spanning storm',
  'a zaratan carrying an enemy fortress across the Plane of Earth',
  'a pit fiend general trying to open a second front in the Blood War',
  'an erinyes spymaster engineering a mortal succession crisis for the Nine Hells',
  'an infernal duke building an illegal fortress between layers of the Nine Hells',
  'a balor general assembling a horde for an invasion out of the Abyss',
  'a marilith strategist stealing mortal armies for the Blood War',
  'a demon prince cult attempting to turn a mortal city into a new layer of the Abyss',
  'a yugoloth arcanaloth selling the same apocalypse to devils, demons, and mortals',
  'a death slaad gathering fragments of a chaos artifact in Limbo',
  'a slaad warlord trying to infect a stable planar gate network with chaos phage',
  'a rogue inevitable hunting everyone who benefited from a broken cosmic contract',
  'a modron hierarch rewriting planar routes to satisfy an impossible equation',
  'a corrupted marut enforcing a law that no living creature can obey',
  'a githzerai anarch whose fortress has become a weapon in Limbo',
  'a titan in Carceri trying to trade an entire kingdom for its freedom',
  'a gehreleth jailer dragging innocent souls into Carceri to fill an ancient quota',
  'a yugoloth army turning Gehenna into the staging ground for a private planar war',
  'an ultroloth manipulating three planar powers into mutual annihilation',
  'an empyrean exile trying to conquer a realm in Ysgard',
  'a fallen celestial building a false paradise on Mount Celestia’s border',
  'a radiant idol demanding worship in Arborea and punishing cities that refuse',
  'a corrupted celestial host enforcing a dangerously literal interpretation of goodness',
  'an ancient sphinx moving its temple through the Outlands and rewriting history with every stop',
  'a rilmani faction trying to erase a kingdom to restore cosmic balance',
  'a gate-town faction trying to force its settlement to slide permanently into another plane',
  'an ethereal citadel harvesting dreams from entire cities',
  'a Far Realm prophet whose followers are making its impossible visions physically real',
  'a living demiplane consuming portals and adding their destinations to itself',
  'a spelljammer armada blockading the Astral routes between divine realms',
  // — humanoid / organized —
  'a vampire lord and their web of thralls',
  'a necromancer on the verge of something terrible',
  'a mind flayer cell harvesting a city', 'a beholder running a criminal empire',
  'an archmage cabal bending a kingdom', 'a death knight raising an army',
  'a yuan-ti conspiracy seated in high places',
  // — beasts & monsters & giants —
  'a young adult dragon carving out a domain', 'a fire giant warlord forging a conquest',
  'a frost giant jarl raiding the lowlands', 'an adult dragon waking to reclaim its old range',
  'a kraken stirring off the coast', 'a purple worm devouring everything beneath a region',
  'a colossal roc that has claimed the mountains', 'a pair of hunting chimeras no army can stop',
  'an ancient guardian beast roused from a ruin', 'a storm giant whose moods are wrecking the coast',
];


// ── Named antagonists ──────────────────────────────────────────────────────────
// Specific Faerûnian villains rather than archetypes. Once an arc against one is
// completed they're recorded in character.defeatedAntagonists and never rolled
// again — no being sent after a dragon you killed last week. The ledger is
// editable in Settings, because in the Realms almost nothing stays dead.
const NAMED_MID = [ // levels 5+
  'Xanathar, the beholder crime lord of Waterdeep',
  'Manshoon, the Zhentarim founder — and his clones',
  'Claugiyliamatar, "Old Gnawbone", the green dragon of Kryptgarden Forest',
  'Jarlaxle Baenre, whose schemes are never what they appear',
  'the Cult of the Dragon, working to raise a dracolich',
  'Ythryn cultists digging up something better left buried',
];
const NAMED_HIGH = [ // levels 9+
  'Klauth, "Old Snarl", the ancient red dragon of the Sword Coast North',
  'Szass Tam, lich and Zulkir of Necromancy, ruler of Thay',
  'Halaster Blackcloak, the mad archmage of Undermountain',
  'Larloch, the Shadow King, demilich of Warlock\'s Crypt',
  'Iymrith, the ancient blue dragon of Anauroch',
  'Arauthator, "Old White Death", the ancient white dragon',
  'Acererak, the demilich, and the tombs he leaves as traps',
  'Zariel, Archduchess of Avernus, and her Blood War legions',
  'Tiamat\'s faithful, working to bring the Dragon Queen through',
];
const NAMED_EPIC = [ // level 10 only — equivalent to D&D level 20
  'Vlaakith CLVII, lich-queen of the githyanki and ruler of Tu’narath',
  'Orcus, Demon Prince of Undeath, wielder of the Wand of Orcus',
  'Demogorgon, Prince of Demons, the two-headed terror of the Abyss',
  'Graz’zt, the Dark Prince, schemer and ruler of Azzagrat',
  'Juiblex, the Faceless Lord, Demon Prince of Slimes and Oozes',
  'Mephistopheles, Archduke of Cania and master of hellfire',
  'Asmodeus, Lord of the Nine Hells',
  'Vecna, lich-god of secrets and forbidden knowledge',
  'Gromph Baenre, archmage of Menzoberranzan',
  'Arkhan the Cruel, dragonborn champion of Tiamat bearing the Hand of Vecna',
];

// ── Arc locations ──────────────────────────────────────────────────────────────
// The app owns WHERE an arc happens just as it owns WHO the antagonist is.
// Resolve once when the arc is created; char.arc.arcLocation is then save state.
export const FAERUN_LOCATION_POOLS = {
  // Broad continental pool used for ordinary arcs and the 5% chaos roll.
  // Mix regions and specific destinations so campaigns actually cross Faerûn.
  general: [
    'Waterdeep','Neverwinter','Baldur’s Gate','Luskan','Silverymoon','Elturel','Daggerford','Mirabar','Longsaddle','Yartar','Triboar',
    'The Dalelands','Shadowdale','Mistledale','Cormyr','Suzail','Arabel','Marsember','Sembia','Selgaunt','The Moonsea','Hillsfar','Mulmaster','Zhentil Keep',
    'The High Forest','Neverwinter Wood','The Sword Mountains','The Spine of the World','The Western Heartlands','The Trollbark Forest','The Mere of Dead Men',
    'The Moonshae Isles','The Nelanther Isles','The Pirate Isles','The Sea of Fallen Stars','The Trackless Sea coast','The Dragon Coast','The Vilhon Reach','Turmish',
    'Amn','Athkatla','Tethyr','Darromar','Calimshan','Calimport','Memnon','The Lake of Steam','The Border Kingdoms','Halruaa','Lantan',
    'Chult','Port Nyanzaru','The Shaar','The Great Rift','The Eastern Shaar','Dambrath','The Shining South',
    'Thay','Eltabbar','Bezantur','Rashemen','Immilmar','Aglarond','Velprintalar','The Yuirwood','Thesk','The Great Dale','Damara','Vaasa','The Vast',
    'Mulhorand','Skuld, City of Shadows','Unther','Chessenta','Cimbar','The Old Empires','The Hordelands','The Endless Wastes',
    'Icewind Dale','Ten-Towns','The Great Glacier','Anauroch','The High Ice','The Underdark','The Northdark'
  ],
  urban: [
    'Waterdeep','Neverwinter','Baldur’s Gate','Luskan','Silverymoon','Elturel','Mirabar','Suzail','Arabel','Marsember','Selgaunt','Hillsfar','Mulmaster','Zhentil Keep',
    'Athkatla','Darromar','Calimport','Memnon','Port Nyanzaru','Eltabbar','Bezantur','Immilmar','Velprintalar','Skuld, City of Shadows','Cimbar','Ten-Towns'
  ],
  coastal: [
    'The Sword Coast','Luskan','Waterdeep','Neverwinter','Baldur’s Gate','The Moonshae Isles','The Nelanther Isles','The Pirate Isles','The Sea of Fallen Stars',
    'The Trackless Sea coast','The Dragon Coast','The Vilhon Reach','Turmish','Athkatla','Calimport','Memnon','The Lake of Steam','Lantan','Chult','Port Nyanzaru',
    'Aglarond','Velprintalar','Bezantur','Mulhorand','Skuld, City of Shadows','Unther','Chessenta','Cimbar'
  ],
  wilderness: [
    'The High Forest','Neverwinter Wood','The Sword Mountains','The Spine of the World','The Dalelands','The Western Heartlands','The Trollbark Forest','The Mere of Dead Men',
    'The Moonshae Isles','Chult','The Shaar','The Great Rift','The Eastern Shaar','Dambrath','Rashemen','The Yuirwood','The Great Dale','Damara','Vaasa','The Vast',
    'The Hordelands','The Endless Wastes','Icewind Dale','The Great Glacier','Anauroch','The High Ice','Cormyr','Thesk','Mulhorand'
  ],
  ruins: [
    'Anauroch','The High Forest','The Dalelands','Chult','The Sword Mountains','The Mere of Dead Men','The Underdark','Thay','The Moonshae Isles','The Shaar',
    'The Great Rift','Dambrath','Mulhorand','The Old Empires','Unther','Chessenta','The Great Dale','Vaasa','The Hordelands','The High Ice','Warlock’s Crypt'
  ],
  underdark: [
    'The Underdark','Menzoberranzan’s outskirts','Gracklstugh’s tunnels','The Northdark','The Upperdark beneath the Sword Coast','The Deep Wastes',
    'The Underdark beneath Anauroch','The Underdark beneath the Dalelands','The Underdark beneath Thay','The Underdark beneath the Old Empires'
  ],
};
const FIXED_ARC_LOCATIONS = new Map([
  ['Xanathar, the beholder crime lord of Waterdeep','Waterdeep'],
  ['Manshoon, the Zhentarim founder — and his clones','Waterdeep'],
  ['Claugiyliamatar, "Old Gnawbone", the green dragon of Kryptgarden Forest','Kryptgarden Forest'],
  ['Klauth, "Old Snarl", the ancient red dragon of the Sword Coast North','Klauthen Vale'],
  ['Szass Tam, lich and Zulkir of Necromancy, ruler of Thay','Thay'],
  ['Halaster Blackcloak, the mad archmage of Undermountain','Undermountain'],
  ["Larloch, the Shadow King, demilich of Warlock's Crypt","Warlock’s Crypt"],
  ['Iymrith, the ancient blue dragon of Anauroch','Anauroch'],
  ['Zariel, Archduchess of Avernus, and her Blood War legions','Avernus'],
  ['Vlaakith CLVII, lich-queen of the githyanki and ruler of Tu’narath','Astral Plane'],
  ['Orcus, Demon Prince of Undeath, wielder of the Wand of Orcus','Abyss'],
  ['Demogorgon, Prince of Demons, the two-headed terror of the Abyss','Abyss'],
  ['Graz’zt, the Dark Prince, schemer and ruler of Azzagrat','Abyss'],
  ['Juiblex, the Faceless Lord, Demon Prince of Slimes and Oozes','Abyss'],
  ['Mephistopheles, Archduke of Cania and master of hellfire','Cania, the Eighth Hell'],
  ['Asmodeus, Lord of the Nine Hells','Nessus, the Ninth Hell'],
  ['Gromph Baenre, archmage of Menzoberranzan','Menzoberranzan'],
  ['Arkhan the Cruel, dragonborn champion of Tiamat bearing the Hand of Vecna','Avernus'],
  ["a githyanki lich-queen's fleet in the Astral",'Astral Plane'],
  ['the corpse of a dead god, and what is nesting inside it','Astral Plane'],
  ['a Far Realm intrusion that should not have a shape','Far Realm'],
  ['a shadar-kai raiding party out of the Shadowfell','Shadowfell'],
  ['an archdevil moving pieces through mortal proxies','Nine Hells'],
  ["a demon lord's vanguard testing a way through",'Abyss'],
  ['a darklord extending their domain past its borders','Domains of Dread'],
]);
const locationPoolFor = (antagonist) => {
  const a=String(antagonist||'').toLowerCase();
  if (/pirate|smuggl|kraken|coast|sail|ship|press gang/.test(a)) return 'coastal';
  if (/thieves|official|merchant|sheriff|moneylender|crime|counterfeit|protection racket|town|city|infiltration/.test(a)) return 'urban';
  if (/duergar|umber hulk|mine|underdark/.test(a)) return 'underdark';
  if (/necroman|grave|tomb|ruin|cult|lich|dead|wight|ghoul/.test(a)) return 'ruins';
  if (/wolf|owlbear|boar|spider|harpy|dragon|giant|roc|wyvern|bulette|hydra|behir|remorhaz|worg|gorgon|chimera/.test(a)) return 'wilderness';
  return 'general';
};
export const resolveArcLocation = (antagonist) => {
  if (!antagonist) return null;
  const fixed=FIXED_ARC_LOCATIONS.get(antagonist); if (fixed) return fixed;
  const a=String(antagonist).toLowerCase();
  if (/archfey|fey court|wild hunt/.test(a)) return 'Feywild';
  if (/night hag|gray waste/.test(a)) return 'Hades, the Gray Waste';
  if (/pit fiend|erinyes|infernal duke|devil contract/.test(a)) return 'Nine Hells';
  if (/balor|marilith|demon prince|demon cult/.test(a)) return 'Abyss';
  if (/city of brass|efreeti|azersmith|phoenix/.test(a)) return 'Elemental Plane of Fire';
  if (/dao|zaratan|xorn/.test(a)) return 'Elemental Plane of Earth';
  if (/marid|leviathan elemental/.test(a)) return 'Elemental Plane of Water';
  if (/djinni|elder tempest/.test(a)) return 'Elemental Plane of Air';
  if (/shadow dragon|death giant|shadar-kai|shadow demon/.test(a)) return 'Shadowfell';
  if (/fomorian|satyr revel|eladrin war-host|primordial hag/.test(a)) return 'Feywild';
  if (/astral dreadnought|astral pirate|astral lich|githyanki warlord|spelljammer armada/.test(a)) return 'Astral Plane';
  if (/slaad|githzerai/.test(a)) return 'Limbo';
  if (/modron|inevitable|marut/.test(a)) return 'Mechanus';
  if (/carceri|gehreleth/.test(a)) return 'Carceri';
  if (/gehenna|ultroloth|yugoloth/.test(a)) return 'Gehenna';
  if (/empyrean exile/.test(a)) return 'Ysgard';
  if (/mount celestia|fallen celestial|corrupted celestial/.test(a)) return 'Mount Celestia';
  if (/arborea|radiant idol/.test(a)) return 'Arborea';
  if (/outlands|rilmani|gate-town|sphinx moving/.test(a)) return 'Outlands';
  if (/ethereal/.test(a)) return 'Ethereal Plane';
  if (/negative plane|nightwalker/.test(a)) return 'Negative Plane';
  if (/living demiplane/.test(a)) return 'Demiplane';
  if (/githyanki/.test(a)) return 'Astral Plane';
  if (/efreeti/.test(a)) return 'Elemental Plane of Fire';
  if (/dao architect/.test(a)) return 'Elemental Plane of Earth';
  if (/slaad/.test(a)) return 'Limbo';
  if (/modron/.test(a)) return 'Mechanus';
  const sensible=FAERUN_LOCATION_POOLS[locationPoolFor(antagonist)] || FAERUN_LOCATION_POOLS.general;
  // 5% chaos roll: occasionally a weird location wins and the DM explains why.
  return pick(Math.random() < 0.05 ? FAERUN_LOCATION_POOLS.general : sensible);
};
export const makeArc = (antagonist) => ({ antagonist, arcLocation: resolveArcLocation(antagonist) });
export const rollArc = (level, exclude = null, defeated = []) => {
  const antagonist=rollAntagonist(level, exclude, defeated);
  return makeArc(antagonist);
};

export const antagonistsForLevel = (level) => {
  const pool = [...LOW_ANTAGONISTS];
  if (level >= 5) pool.push(...MID_ANTAGONISTS, ...NAMED_MID);
  if (level >= 9) pool.push(...HIGH_ANTAGONISTS, ...NAMED_HIGH);
  if (level >= 10) pool.push(...NAMED_EPIC);
  return pool;
};

export const rollAntagonist = (level, exclude = null, defeated = []) => {
  let pool = antagonistsForLevel(level);
  // Never re-roll a named foe whose arc is already finished.
  if (defeated?.length) {
    const done = new Set(defeated.map(d => String(d).toLowerCase()));
    const filtered = pool.filter(a => !done.has(a.toLowerCase()));
    if (filtered.length) pool = filtered;
  }
  if (exclude) {
    const filtered = pool.filter(a => a !== exclude);
    if (filtered.length) pool = filtered;
  }
  return pick(pool);
};

// Exposed so the UI can tell a named foe from a generic one.
export const NAMED_ANTAGONISTS = [...NAMED_MID, ...NAMED_HIGH, ...NAMED_EPIC];

// ── Pacing knob ────────────────────────────────────────────────────────────────
// grace: turns with zero encounter chance. After that, chance = base + perTurn per turn, capped.
// perTurn is the key knob: a gentle slope means the chance climbs gradually
// instead of spiking to near-certainty a few turns past grace (which stacked
// encounters back-to-back). Ladder runs off → calm → sparse → normal → dangerous.
export const PACING = {
  off:       { label: '🚫 Encounters: Off',   grace: Infinity, base: 0,    perTurn: 0 },
  calm:      { label: '🕊️ Pacing: Calm',      grace: 8, base: 0.08, perTurn: 0.04 },
  sparse:    { label: '🍃 Pacing: Sparse',    grace: 6, base: 0.10, perTurn: 0.05 },
  normal:    { label: '⚖️ Pacing: Normal',    grace: 4, base: 0.12, perTurn: 0.07 },
  dangerous: { label: '⚔️ Pacing: Dangerous', grace: 3, base: 0.20, perTurn: 0.11 },
};
export const PACING_ORDER = ['off', 'calm', 'sparse', 'normal', 'dangerous'];

// Player-selected environment — drives which encounters can appear.
export const ENVIRONMENTS = [
  { id: 'wilderness', label: '🌲 Wilderness' },
  { id: 'city',       label: '🏛️ City' },
  { id: 'ocean',      label: '🌊 Ocean / Coast' },
  { id: 'underdark',  label: '🕳️ Underdark' },
  { id: 'avernus',    label: '🔥 Avernus' },
  { id: 'feywild',    label: '🍄 Feywild' },
  { id: 'astral',     label: '🌌 Astral Sea' },
  { id: 'shadowfell', label: '🌑 Shadowfell' },
  { id: 'fire',       label: '🔥 Plane of Fire' },
  { id: 'water',      label: '🌊 Plane of Water' },
];

export const encounterChance = (turnsSince, pacing) => {
  const p = PACING[pacing] || PACING.normal;
  if (turnsSince < p.grace) return 0;
  return Math.min(0.9, p.base + (turnsSince - p.grace) * p.perTurn);
};

// ── Random-encounter CR ceiling ────────────────────────────────────────────────
// CR ratings assume a party of FOUR — this is solo play, so CR <= level runs hot.
// Levels also come fast early. The ceiling climbs at ~60% of level, saving the
// big monsters for the back half of the 1-20 journey:
//   lvl 1 → 1/2 | lvl 3 → 1 | lvl 5 → 3 | lvl 8 → 4 | lvl 10 → 6
//   lvl 13 → 7  | lvl 15 → 9 | lvl 17 → 10 | lvl 20 → 12
export const encounterCRCap = (level) => {
  const lvl = Math.max(1, level || 1);
  if (lvl <= 1) return 0.5;
  if (lvl <= 3) return 1;
  return Math.max(2, Math.floor(lvl * 0.6));
};

// ── Encounter tables ───────────────────────────────────────────────────────────
// Hostile entries carry real Monster Manual CRs. The app filters to the ceiling
// above BEFORE rolling. Low-CR entries never leave the pool — a level 20 can
// absolutely still meet goblins; they just stop being the whole bestiary.
const HOSTILE = [
  // ── CR 1/8 ──
  { cr: 0.125, label: '1/8', env: ['wilderness'], desc: 'kobold skirmishers harass from range, trying to drive the player toward a snare' },
  { cr: 0.125, label: '1/8', env: ['anywhere'], desc: 'a handful of bandits block the way and demand a toll, weapons drawn' },
  { cr: 0.125, label: '1/8', env: ['wilderness'], desc: 'a swarm of stirges descends at dusk' },
  { cr: 0.125, label: '1/8', env: ['city'], desc: 'giant rats boil out of a culvert or cellar, starving and fearless' },
  { cr: 0.125, label: '1/8', env: ['wilderness'], desc: 'twig blights detach from the brush where something foul took root' },
  { cr: 0.125, label: '1/8', env: ['anywhere'], desc: 'robed cultists decide the player has witnessed their gathering' },
  { cr: 0.125, label: '1/8', env: ['wilderness'], desc: 'feral dogs, ribs showing, follow at a distance that keeps shrinking' },
  { cr: 0.125, label: '1/8', env: ['wilderness'], desc: 'blood hawks dive in shrieking pairs, going for the eyes' },
  { cr: 0.125, label: '1/8', env: ['wilderness'], desc: 'a venomous snake strikes from the grass at the worst possible moment' },
  // ── CR 1/4 ──
  { cr: 0.25, label: '1/4', env: ['wilderness'], desc: 'a band of goblins springs an ambush from cover' },
  { cr: 0.25, label: '1/4', env: ['wilderness'], desc: 'a pack of wolves has been trailing the player and now closes in' },
  { cr: 0.25, label: '1/4', env: ['anywhere'], desc: 'skeletons claw free of old battlefield soil as the player passes' },
  { cr: 0.25, label: '1/4', env: ['anywhere'], desc: 'several zombies shamble out of the treeline, drawn by sound' },
  { cr: 0.25, label: '1/4', env: ['wilderness'], desc: 'a wild boar charges out of the undergrowth, furious and territorial' },
  { cr: 0.25, label: '1/4', env: ['anywhere'], desc: 'kenku ambushers strike, mimicking voices the player has heard before' },
  { cr: 0.25, label: '1/4', env: ['wilderness'], desc: 'a swarm of ravens descends with un-birdlike purpose' },
  { cr: 0.25, label: '1/4', env: ['wilderness'], desc: 'a giant wolf spider has webbed the only easy path through' },
  { cr: 0.25, label: '1/4', env: ['wilderness'], desc: 'winged kobolds drop rocks from above, hooting at every near miss' },
  { cr: 0.25, label: '1/4', env: ['wilderness'], desc: 'mephits burst from the muck, all spite and bad breath' },
  { cr: 0.25, label: '1/4', env: ['wilderness'], desc: 'a panther stalks the player through the brush, patient and silent' },
  { cr: 0.25, label: '1/4', env: ['wilderness'], desc: 'territorial axe beaks charge in a flurry of feathers and bad temper' },
  // ── CR 1/2 ──
  { cr: 0.5, label: '1/2', env: ['wilderness'], desc: 'gnoll raiders on the hunt, whooping as they spot fresh prey' },
  { cr: 0.5, label: '1/2', env: ['city'], desc: 'hobgoblin soldiers at a makeshift checkpoint turn hostile when refused' },
  { cr: 0.5, label: '1/2', env: ['wilderness'], desc: 'an orc raiding party emerges ahead, already spreading out to flank' },
  { cr: 0.5, label: '1/2', env: ['wilderness'], desc: 'poachers decide the player has seen too much' },
  { cr: 0.5, label: '1/2', env: ['wilderness'], desc: 'worgs — too smart to be wolves — circle with unsettling coordination' },
  { cr: 0.5, label: '1/2', env: ['wilderness'], desc: 'a black bear, woken early and hungry, will not be talked out of the food' },
  { cr: 0.5, label: '1/2', env: ['wilderness'], desc: 'a cockatrice flaps out of a hedge, snapping at anything that moves' },
  { cr: 0.5, label: '1/2', env: ['wilderness'], desc: 'a rust monster scuttles straight for the player\'s metal gear' },
  { cr: 0.5, label: '1/2', env: ['anywhere'], desc: 'a shadow peels away from the rest of the dark and reaches out' },
  { cr: 0.5, label: '1/2', env: ['underdark'], desc: 'a gray ooze drops from above, nearly indistinguishable from wet stone' },
  { cr: 0.5, label: '1/2', env: ['ocean'], desc: 'sahuagin slip out of the surf with hooked nets and worse intentions' },
  { cr: 0.5, label: '1/2', env: ['ocean','wilderness'], desc: 'a crocodile explodes from still water at the crossing point' },
  // ── CR 1 ──
  { cr: 1, label: '1', env: ['anywhere'], desc: 'a bugbear and its goblin lackeys have strung a tripwire across the way' },
  { cr: 1, label: '1', env: ['anywhere'], desc: 'a ghoul pack erupts from shallow graves beside the road' },
  { cr: 1, label: '1', env: ['wilderness'], desc: 'a giant spider drops from above — webs already strung across the path' },
  { cr: 1, label: '1', env: ['wilderness'], desc: 'a dire wolf, larger than a pony, stalks out of the mist' },
  { cr: 1, label: '1', env: ['wilderness'], desc: 'harpies on the cliffs above begin their song' },
  { cr: 1, label: '1', env: ['anywhere'], desc: 'a specter rises where someone died badly and was never buried' },
  { cr: 1, label: '1', env: ['city'], desc: 'a suit of animated armor lurches to attack, dragging a rusted blade' },
  { cr: 1, label: '1', env: ['wilderness'], desc: 'a scarecrow in a fallow field turns its head to watch — then steps off its post' },
  { cr: 1, label: '1', env: ['anywhere'], desc: 'death dogs — two heads each, all teeth — pace the player at the road\'s edge' },
  { cr: 1, label: '1', env: ['anywhere'], desc: 'a goblin boss and its retinue want everything the player is carrying' },
  { cr: 1, label: '1', env: ['wilderness'], desc: 'giant hyenas laugh somewhere close, then closer' },
  { cr: 1, label: '1', env: ['wilderness'], desc: 'a brown bear rears up between the player and the only path through' },
  { cr: 1, label: '1', env: ['underdark','city'], desc: 'duergar slavers surface from a tunnel mouth with manacles ready' },
  { cr: 1, label: '1', env: ['avernus'], desc: 'an imp in some borrowed animal shape has been spying — and is caught at it' },
  // ── CR 2 ──
  { cr: 2, label: '2', env: ['wilderness'], desc: 'a pair of ogres arguing over a carcass notice the player' },
  { cr: 2, label: '2', env: ['anywhere'], desc: 'a bandit captain and their crew have claimed this stretch of road' },
  { cr: 2, label: '2', env: ['wilderness'], desc: 'an ankheg bursts from the earth in a spray of soil and acid' },
  { cr: 2, label: '2', env: ['anywhere'], desc: 'berserkers from a raiding band, blood-drunk and looking for a fight' },
  { cr: 2, label: '2', env: ['wilderness'], desc: 'a griffon dives — it has decided the player\'s mount or pack animal is lunch' },
  { cr: 2, label: '2', env: ['wilderness'], desc: 'a will-o\'-wisp drifts at the edge of sight, luring toward the mire' },
  { cr: 2, label: '2', env: ['underdark'], desc: 'a carrion crawler ripples down a wall, paralytic tentacles tasting the air' },
  { cr: 2, label: '2', env: ['wilderness'], desc: 'an ettercap and its web-trapped larder — some of it still moving' },
  { cr: 2, label: '2', env: ['wilderness'], desc: 'gargoyles detach from a ruin\'s eaves with a sound like grinding millstones' },
  { cr: 2, label: '2', env: ['underdark'], desc: 'a gelatinous cube fills the corridor ahead, nearly invisible until it moves' },
  { cr: 2, label: '2', env: ['anywhere'], desc: 'a ghast and its ghoul pack — this one is smart, and it gives orders' },
  { cr: 2, label: '2', env: ['city','underdark'], desc: 'a gibbering mouther burbles out of a drain, all eyes and babble' },
  { cr: 2, label: '2', env: ['underdark'], desc: 'a grick uncoils from a crevice, beak clicking' },
  { cr: 2, label: '2', env: ['ocean'], desc: 'merrow drag a net to shore — and decide to fill it with the player' },
  { cr: 2, label: '2', env: ['underdark'], desc: 'an ochre jelly seeps under the door, around the frame, through the cracks' },
  { cr: 2, label: '2', env: ['wilderness'], desc: 'a peryton stoops out of the sun, hungering for a heart specifically' },
  { cr: 2, label: '2', env: ['ocean'], desc: 'a sea hag surfaces beside the boat or bank, smiling with green teeth' },
  { cr: 2, label: '2', env: ['wilderness'], desc: 'a white dragon wyrmling, young and vicious, claims this stretch as hunting ground' },
  { cr: 2, label: '2', env: ['anywhere'], desc: 'cult fanatics with real magic decide the player is an omen — a bad one' },
  { cr: 2, label: '2', env: ['city'], desc: 'a wererat gang corners the player somewhere narrow' },
  { cr: 2, label: '2', env: ['wilderness'], desc: 'a gnoll pack lord drives its cackling hunters forward' },
  { cr: 2, label: '2', env: ['anywhere'], desc: 'a mimic — that chest, door, or cart was never furniture' },
  // ── CR 3 ──
  { cr: 3, label: '3', env: ['wilderness'], desc: 'an owlbear crashes out of the brush, territorial and enraged' },
  { cr: 3, label: '3', env: ['anywhere'], desc: 'a wight in ancient war-gear walks the road it died defending' },
  { cr: 3, label: '3', env: ['anywhere'], desc: 'a veteran sellsword with a grudge and a contract steps into the road' },
  { cr: 3, label: '3', env: ['wilderness'], desc: 'a manticore wheels overhead and looses a volley of tail spikes' },
  { cr: 3, label: '3', env: ['wilderness'], desc: 'a displacer beast hunts the player — its image never quite where it is' },
  { cr: 3, label: '3', env: ['wilderness'], desc: 'a werewolf, half-changed and past caring who sees' },
  { cr: 3, label: '3', env: ['wilderness'], desc: 'a minotaur claims this crossing and accepts no toll but blood' },
  { cr: 3, label: '3', env: ['wilderness'], desc: 'a basilisk suns itself ahead — the statues nearby are very lifelike' },
  { cr: 3, label: '3', env: ['anywhere'], desc: 'a doppelganger wearing a familiar face gets close before the knife comes out' },
  { cr: 3, label: '3', env: ['wilderness'], desc: 'a giant scorpion erupts from beneath the sand and stones' },
  { cr: 3, label: '3', env: ['wilderness'], desc: 'a green hag has been wearing a kindly disguise — until now' },
  { cr: 3, label: '3', env: ['avernus'], desc: 'hell hounds course across the land, smoke trailing from their jaws' },
  { cr: 3, label: '3', env: ['anywhere'], desc: 'a knight in tarnished colors demands satisfaction for an imagined slight' },
  { cr: 3, label: '3', env: ['anywhere'], desc: 'a mummy walks a ruined processional, drawn by trespass' },
  { cr: 3, label: '3', env: ['wilderness'], desc: 'a winter wolf speaks before it attacks — it likes prey that understands' },
  { cr: 3, label: '3', env: ['wilderness'], desc: 'a yeti comes down with the weather, white on white until it is too close' },
  { cr: 3, label: '3', env: ['underdark'], desc: 'hook horrors clatter and echo-click through the dark toward the player' },
  { cr: 3, label: '3', env: ['underdark'], desc: 'a grell floats silently overhead, tentacles unfurling' },
  // ── CR 4 ──
  { cr: 4, label: '4', env: ['wilderness'], desc: 'an ettin lumbers into view, both heads arguing about how to cook the player' },
  { cr: 4, label: '4', env: ['anywhere'], desc: 'a banshee\'s wail rolls across the land as something pale rises ahead' },
  { cr: 4, label: '4', env: ['ocean'], desc: 'a chuul hauls itself out of the water, claws wide — some things never change' },
  { cr: 4, label: '4', env: ['anywhere'], desc: 'a flameskull spirals up from old wizard bones, cackling fire' },
  { cr: 4, label: '4', env: ['anywhere'], desc: 'a ghost manifests mid-road, replaying its last hour — and the player is in the script now' },
  { cr: 4, label: '4', env: ['wilderness'], desc: 'a lamia\'s caravan of comforts is a honeyed trap, and it is sprung' },
  { cr: 4, label: '4', env: ['wilderness'], desc: 'a red dragon wyrmling with a stolen hoard and a point to prove' },
  { cr: 4, label: '4', env: ['wilderness'], desc: 'a wereboar bursts through a fence line, tusks first' },
  { cr: 4, label: '4', env: ['underdark'], desc: 'a black pudding pours out of a ceiling crack, dissolving what it touches' },
  { cr: 4, label: '4', env: ['city'], desc: 'a helmed horror stands sentinel over a door no one remembers — and the player is trespassing' },
  { cr: 4, label: '4', env: ['anywhere'], desc: 'a bone naga rises from a plundered shrine, hissing in a dead tongue' },
  // ── CR 5 ──
  { cr: 5, label: '5', env: ['wilderness'], desc: 'a troll lopes out of the rocks, already healing from its last fight' },
  { cr: 5, label: '5', env: ['wilderness'], desc: 'a hill giant tears up a tree to use as a club' },
  { cr: 5, label: '5', env: ['wilderness'], desc: 'the ground shudders — a bulette breaches like a shark through soil' },
  { cr: 5, label: '5', env: ['anywhere'], desc: 'a wraith pours out of a barrow mouth, trailing cold' },
  { cr: 5, label: '5', env: ['anywhere'], desc: 'vampire spawn caught out near dusk, hungry and far from their master' },
  { cr: 5, label: '5', env: ['wilderness','underdark','avernus'], desc: 'an elemental — fire, water, earth, or air to match the place — tears loose of its surroundings' },
  { cr: 5, label: '5', env: ['wilderness'], desc: 'a flesh golem off its leash, following its last order much too literally' },
  { cr: 5, label: '5', env: ['anywhere'], desc: 'a famed gladiator collects duels with strangers — and does not ask twice' },
  { cr: 5, label: '5', env: ['wilderness'], desc: 'a gorgon\'s iron hooves spark on stone as it charges, breath fogging green' },
  { cr: 5, label: '5', env: ['wilderness'], desc: 'a night hag has been riding someone\'s dreams here — and dislikes interruptions' },
  { cr: 5, label: '5', env: ['underdark'], desc: 'an otyugh erupts from the refuse it was sleeping under' },
  { cr: 5, label: '5', env: ['anywhere'], desc: 'a revenant arrives, asking for someone by name — wrong someone, same fury' },
  { cr: 5, label: '5', env: ['wilderness'], desc: 'a shambling mound rises out of the wet green, absorbing as it comes' },
  { cr: 5, label: '5', env: ['underdark'], desc: 'an umber hulk bursts through the wall — do not meet its eyes' },
  { cr: 5, label: '5', env: ['underdark'], desc: 'a xorn surfaces through solid rock, smelling the player\'s coin and gems' },
  { cr: 5, label: '5', env: ['anywhere'], desc: 'a beholder zombie drifts crooked through the air, dead eyestalks still sparking' },
  { cr: 5, label: '5', env: ['avernus'], desc: 'a salamander coils out of the heat haze, spear glowing' },
  // ── CR 6 ──
  { cr: 6, label: '6', env: ['wilderness'], desc: 'a chimera descends, three sets of jaws and no patience' },
  { cr: 6, label: '6', env: ['wilderness'], desc: 'a wyvern strikes from a high ledge, stinger first' },
  { cr: 6, label: '6', env: ['wilderness'], desc: 'a cyclops hurls a boulder as an opening argument' },
  { cr: 6, label: '6', env: ['wilderness'], desc: 'a medusa\'s garden of statues — and its keeper, lifting her veil' },
  { cr: 6, label: '6', env: ['underdark'], desc: 'a drider descends headfirst from the dark above, silent as falling silk' },
  { cr: 6, label: '6', env: ['anywhere'], desc: 'an invisible stalker arrives — sent by someone, for the player specifically' },
  { cr: 6, label: '6', env: ['wilderness'], desc: 'a mammoth stampedes, driven mad by something stuck in its hide' },
  { cr: 6, label: '6', env: ['wilderness'], desc: 'a hobgoblin warlord and honor guard accept the player\'s existence as a challenge' },
  { cr: 6, label: '6', env: ['wilderness'], desc: 'a young white dragon hits like an avalanche with grudges' },
  // ── CR 7 ──
  { cr: 7, label: '7', env: ['wilderness'], desc: 'a stone giant mistakes the player for the vandals who defaced its carvings' },
  { cr: 7, label: '7', env: ['ocean','underdark'], desc: 'a young black dragon rises out of black water, acid dripping' },
  { cr: 7, label: '7', env: ['wilderness'], desc: 'an oni in human guise has been hunting this road — and drops the disguise' },
  { cr: 7, label: '7', env: ['wilderness'], desc: 'a giant ape crashes through the canopy, beating its chest' },
  { cr: 7, label: '7', env: ['underdark'], desc: 'a mind flayer steps out of a fold in the dark, tentacles tasting thought' },
  { cr: 7, label: '7', env: ['wilderness'], desc: 'a yuan-ti abomination uncoils from ruin shadows, scripture hissing from its jaws' },
  { cr: 7, label: '7', env: ['wilderness'], desc: 'a shield guardian with no master left strides forward, executing a dead command' },
  // ── CR 8 ──
  { cr: 8, label: '8', env: ['wilderness'], desc: 'a frost giant raiding alone, looking for plunder and a story worth telling' },
  { cr: 8, label: '8', env: ['anywhere'], desc: 'a professional assassin has been paid — the first attack comes without warning' },
  { cr: 8, label: '8', env: ['ocean'], desc: 'a hydra wades out of the shallows — count the heads, then count again' },
  { cr: 8, label: '8', env: ['anywhere'], desc: 'a spirit naga the locals thought permanently dead is back, and remembers' },
  { cr: 8, label: '8', env: ['wilderness'], desc: 'a young green dragon has been listening from the trees for some time' },
  { cr: 8, label: '8', env: ['underdark','feywild'], desc: 'a fomorian surfaces from a sinkhole, its evil eye already fixing on the player' },
  { cr: 8, label: '8', env: ['underdark'], desc: 'a cloaker detaches from where the ceiling pretended to have a shadow' },
  // ── CR 9-10 ──
  { cr: 9, label: '9', env: ['wilderness'], desc: 'a fire giant on the march, treating everything in its path as kindling' },
  { cr: 9, label: '9', env: ['wilderness'], desc: 'a young blue dragon strafes the road, toying before it commits' },
  { cr: 9, label: '9', env: ['wilderness'], desc: 'a clay golem with its command word lost runs its last instruction forever' },
  { cr: 9, label: '9', env: ['wilderness'], desc: 'an abominable yeti is the blizzard — the storm has teeth' },
  { cr: 9, label: '9', env: ['wilderness'], desc: 'a treant wakes wrathful — someone burned its grove, and the player is holding fire' },
  { cr: 10, label: '10', env: ['wilderness'], desc: 'a young red dragon announces itself by setting the horizon alight' },
  { cr: 10, label: '10', env: ['ocean'], desc: 'an aboleth\'s presence slicks the water — and its voice is already inside the player\'s head' },
  { cr: 10, label: '10', env: ['wilderness'], desc: 'a stone golem steps off a temple plinth where it stood for a century' },
  // ── CR 11-12 ──
  { cr: 11, label: '11', env: ['wilderness'], desc: 'a behir pours down the cliffside like lightning given legs' },
  { cr: 11, label: '11', env: ['wilderness'], desc: 'a roc\'s shadow swallows the road whole — then it banks back around' },
  { cr: 11, label: '11', env: ['wilderness'], desc: 'a remorhaz breaches in a gout of steam, the snow melting around it' },
  { cr: 11, label: '11', env: ['avernus'], desc: 'an efreeti arrives in a column of smoke, taking inventory of what it now owns' },
  { cr: 12, label: '12', env: ['anywhere'], desc: 'an archmage with a grudge and prepared spells has chosen the time and place' },
  { cr: 12, label: '12', env: ['avernus'], desc: 'an erinyes descends on burning wings to collect on a contract — someone sold a debt' },

  // ── AVERNUS (the First of the Nine — fire, war, and the damned) ──
  { cr: 2, label: '2', env: ['avernus'], desc: 'a pack of lemures oozes up out of the ash in a tide of weeping, half-formed flesh — individually pathetic, together a drowning wave' },
  { cr: 3, label: '3', env: ['avernus'], desc: 'spined devils wheel overhead on leathery wings, flinging barbed tails before diving' },
  { cr: 3, label: '3', env: ['avernus'], desc: 'a bearded devil advances with a glaive, its writhing beard snapping at the air, hungry for a wound to infect' },
  { cr: 4, label: '4', env: ['avernus'], desc: 'a chain devil unspools from a wrecked war-machine, barbed chains rising around it like the legs of a spider' },
  { cr: 5, label: '5', env: ['avernus'], desc: 'a barbed devil stalks out of the heat-shimmer, every inch of it a razor, grinning at the prospect of a grip' },
  { cr: 5, label: '5', env: ['avernus'], desc: 'a merchant of the Wandering Emporium names a price the player did not agree to — and the honor guard of chained souls steps forward to collect' },
  { cr: 6, label: '6', env: ['avernus'], desc: 'a soul shell wall breaks and the damned pour through — a mob of husks driven forward by something crueler behind them' },
  { cr: 6, label: '6', env: ['avernus'], desc: 'a bone devil clicks forward on insectile legs, stinger arched, herding the player toward a drop into the Styx' },
  { cr: 7, label: '7', env: ['avernus'], desc: 'a warlord of the Blood War demands a toll in blood or service, its infernal warband spreading to cut off retreat' },
  { cr: 8, label: '8', env: ['avernus'], desc: 'a horned devil descends in a column of flame, fork raised, treating the encounter as beneath its dignity to prolong' },
  { cr: 9, label: '9', env: ['avernus'], desc: 'an infernal war machine grinds over the ridge crewed by the damned, its cannon already traversing toward the player' },
  { cr: 11, label: '11', env: ['avernus'], desc: 'an ice devil arrives on a wave of unnatural cold, spear glittering, sent specifically to end whatever the player is doing here' },

  // ── FEYWILD (whimsy with teeth — beauty that means harm) ──
  { cr: 2, label: '2', env: ['feywild'], desc: 'a mob of pixies turns from giggling to malice in an instant, a glittering cloud of poisoned pinpricks and cruel enchantment' },
  { cr: 3, label: '3', env: ['feywild'], desc: 'blink dogs phase in and out around the player, herding — they answer to something, and it is coming' },
  { cr: 3, label: '3', env: ['feywild'], desc: 'a redcap trundles out of the bramble, boots caked, sickle bright, its hat wanting a fresh dip of red' },
  { cr: 4, label: '4', env: ['feywild'], desc: 'a satyr proposes a game with laughing eyes — and the forest has already agreed to the stakes, whether the player has or not' },
  { cr: 4, label: '4', env: ['feywild'], desc: 'quicklings blur through the glade, too fast to track, opening shallow cuts and vanishing before the blood wells' },
  { cr: 5, label: '5', env: ['feywild'], desc: 'an annis hag steps from a ring of pale mushrooms, arms too long, offering a bargain that is really a trap' },
  { cr: 5, label: '5', env: ['feywild'], desc: 'a dryad whose oak the player has wronged calls the whole grove to answer — roots stir, branches reach' },
  { cr: 6, label: '6', env: ['feywild'], desc: 'a fey noble extends an invitation to a revel that cannot politely be refused — and refusing is exactly what the player must now do, at knifepoint' },
  { cr: 7, label: '7', env: ['feywild'], desc: 'the light goes wrong and time slips — the player has been standing here for a moment or a year, and something patient has closed the distance' },
  { cr: 8, label: '8', env: ['feywild'], desc: 'a green hag coven completes a rhyme, and the glamour drops: the lovely glade was always teeth and bog and hunger' },
  { cr: 9, label: '9', env: ['feywild'], desc: 'the Wild Hunt sounds its horn on the wind — spectral hounds and a cruel huntsman have chosen the player as tonight\'s quarry' },
  { cr: 11, label: '11', env: ['feywild'], desc: 'an archfey\'s bored attention settles on the player like a spotlight, and reality bends to make the encounter more entertaining for a watcher who cannot be fought directly' },

  // ── ASTRAL SEA (spelljammers, gith, wrecks, and things between worlds) ──
  { cr: 0.125, label: '1/8', env: ['astral'], desc: 'neogi hatchlings spill from a cracked cargo pod, skittering across the deck toward anything warm' },
  { cr: 0.25, label: '1/4', env: ['astral'], desc: 'a pair of lightly armed astral pirates drift from behind wreckage with hand-crossbows and a very optimistic demand for surrender' },
  { cr: 0.5, label: '1/2', env: ['astral'], desc: 'a scavenger skiff crew tries to board under the assumption that the player is easier salvage than the wreck beside them' },
  { cr: 1, label: '1', env: ['astral'], desc: 'a thri-kreen raider springs from a drifting stone, four arms already moving as its companions close from another angle' },
  { cr: 2, label: '2', env: ['astral'], desc: 'an intellect devourer crawls out of a shattered nautiloid compartment and immediately searches for a better body' },
  { cr: 2, label: '2', env: ['astral'], desc: 'a githzerai monk mistakes the player for an agent pursuing them and chooses violence before explanations' },
  { cr: 3, label: '3', env: ['astral'], desc: 'a githyanki warrior intercepts the route on a small skiff and orders the player to heave to for seizure and questioning' },
  { cr: 3, label: '3', env: ['astral'], desc: 'a neogi raider emerges from a captured spelljammer with enslaved crew behind it and decides the player is fresh inventory' },
  { cr: 4, label: '4', env: ['astral'], desc: 'a neogi master directs a boarding action from the safety of a hooked skiff, treating every living thing aboard as merchandise' },
  { cr: 5, label: '5', env: ['astral'], desc: 'a veteran spelljammer pirate captain and hardened boarding crew swing in on lines, targeting the helm first' },
  { cr: 6, label: '6', env: ['astral'], desc: 'a githzerai zerth steps across open astral space with impossible calm and demands an artifact the player does not remember taking' },
  { cr: 7, label: '7', env: ['astral'], desc: 'a mind flayer glides from a damaged nautiloid with enthralled survivors screening its approach' },
  { cr: 8, label: '8', env: ['astral'], desc: 'a githyanki knight on a war skiff declares the vessel, cargo, and everyone aboard property of Vlaakith pending inspection' },
  { cr: 9, label: '9', env: ['astral'], desc: 'a gray slaad bursts from a flickering color pool and attacks whatever stable reality it finds first' },
  { cr: 10, label: '10', env: ['astral'], desc: 'a young red dragon bearing githyanki tack sweeps across the bow, rider absent and temper very much present' },
  { cr: 11, label: '11', env: ['astral'], desc: 'a heavily armed githyanki war party closes around the player while a dragon-mounted commander blocks the clearest escape route' },
  { cr: 12, label: '12', env: ['astral'], desc: 'an arcanaloth aboard a black-hulled planar cutter decides the player possesses something more valuable than continued neutrality' },

  // ── SHADOWFELL ──
  { cr: 0.125, label: '1/8', env: ['shadowfell'], desc: 'a knot of shadow-touched vermin pours from a ruined doorway, moving as though one mind controls them' },
  { cr: 0.25, label: '1/4', env: ['shadowfell'], desc: 'a gloom-stalker scavenger made of rags, bone, and borrowed shadow lunges from a dead hedge' },
  { cr: 0.5, label: '1/2', env: ['shadowfell'], desc: 'a living shadow detaches from a broken monument and reaches for the player with strength-draining hands' },
  { cr: 1, label: '1', env: ['shadowfell'], desc: 'a darkling hunter drops from a roofline, blades already blackened to keep them from reflecting light' },
  { cr: 2, label: '2', env: ['shadowfell'], desc: 'a shadow mastiff pads out of the fog, its silhouette wrong even by Shadowfell standards' },
  { cr: 3, label: '3', env: ['shadowfell'], desc: 'a pack of meenlocks stalks through the ruins, psychic whispers arriving before their clicking claws' },
  { cr: 4, label: '4', env: ['shadowfell'], desc: 'a shadar-kai executioner mistakes the player for a marked fugitive and attacks before the error can be sorted out' },
  { cr: 5, label: '5', env: ['shadowfell'], desc: 'a wraith rises from a battlefield that has forgotten the war but not the dying' },
  { cr: 6, label: '6', env: ['shadowfell'], desc: 'a bodak emerges from a lightless chapel while every nearby flame gutters toward it' },
  { cr: 8, label: '8', env: ['shadowfell'], desc: 'a sorrow-swollen horror crawls from a ravine, drawn toward the strongest emotion it can sense' },
  { cr: 10, label: '10', env: ['shadowfell'], desc: 'an elite shadar-kai hunter steps through a fold in space with a chain-blade and an unmistakable kill order' },
  { cr: 12, label: '12', env: ['shadowfell'], desc: 'a colossal shadow beast rises from beneath a dead city street, its body made from the darkness of dozens of missing buildings' },

  // ── PLANE OF FIRE ──
  { cr: 0.125, label: '1/8', env: ['fire'], desc: 'embers gather into tiny spiteful firelings that swarm toward anything cooler than the ground' },
  { cr: 0.25, label: '1/4', env: ['fire'], desc: 'a smoke mephit flock erupts from a volcanic vent, shrieking insults through choking ash' },
  { cr: 0.5, label: '1/2', env: ['fire'], desc: 'magma mephits bubble out of a cooling lava shelf and immediately make the crossing worse' },
  { cr: 1, label: '1', env: ['fire'], desc: 'a fire snake coils out from beneath a sheet of glowing slag and strikes at the nearest moving shape' },
  { cr: 2, label: '2', env: ['fire'], desc: 'an azer patrol decides the player is trespassing on forge territory and draws heated weapons' },
  { cr: 3, label: '3', env: ['fire'], desc: 'a hell hound escaped from an efreeti kennel catches the player scent and charges through the flames' },
  { cr: 4, label: '4', env: ['fire'], desc: 'a salamander raiding party crosses a basalt bridge and chooses the player as its next source of metal and captives' },
  { cr: 5, label: '5', env: ['fire'], desc: 'a veteran salamander coils around a black iron pillar and blocks the route with a blazing spear' },
  { cr: 6, label: '6', env: ['fire'], desc: 'a greater fire elemental erupts from a lava fall and begins consuming every worked object in reach' },
  { cr: 8, label: '8', env: ['fire'], desc: 'an efreeti noble’s armored enforcers descend on a brass skiff to seize property for an alleged unpaid debt' },
  { cr: 10, label: '10', env: ['fire'], desc: 'a fire giant champion strides across the molten landscape carrying a forge-chain thick enough to anchor a ship' },
  { cr: 12, label: '12', env: ['fire'], desc: 'an enraged efreeti warlord arrives in a cyclone of sparks with orders to confiscate everything the player brought from another plane' },

  // ── PLANE OF WATER ──
  { cr: 0.125, label: '1/8', env: ['water'], desc: 'territorial merfolk scouts rise from a forest of kelp with spears leveled and no patience left' },
  { cr: 0.25, label: '1/4', env: ['water'], desc: 'a cloud of razor-finned planar fish turns as one and begins circling the player' },
  { cr: 0.5, label: '1/2', env: ['water'], desc: 'sahuagin hunters emerge from the blue gloom, using the endless water to attack from every direction' },
  { cr: 1, label: '1', env: ['water'], desc: 'a giant octopus unfolds from what looked like a drifting reef and grabs for equipment before flesh' },
  { cr: 2, label: '2', env: ['water'], desc: 'a hunter shark scarred with ritual markings charges from below while distant sahuagin whistles guide it' },
  { cr: 3, label: '3', env: ['water'], desc: 'a water weird spirals out of a current that should not exist and tries to drag the player into a darker layer of water' },
  { cr: 4, label: '4', env: ['water'], desc: 'a merrow salvage crew attacks from a wrecked tower, weighted nets spreading through the water like spiderwebs' },
  { cr: 5, label: '5', env: ['water'], desc: 'a water elemental condenses from an entire wall of current and slams forward with the weight of a river' },
  { cr: 6, label: '6', env: ['water'], desc: 'a sahuagin baron and honor guard rise from a trench to enforce a territorial claim written in blood' },
  { cr: 8, label: '8', env: ['water'], desc: 'an ancient sea beast with translucent jaws coils through a drowned ruin and decides the player is inside its nest' },
  { cr: 10, label: '10', env: ['water'], desc: 'a marid noble’s bound leviathan breaks its control harness and attacks everything near the shattered palace' },
  { cr: 12, label: '12', env: ['water'], desc: 'a furious marid war-prince arrives inside a rotating palace of water, accusing the player of violating a law nobody mentioned' },
];

const SOCIAL_BY_ENV = {
  wilderness: [
    "a merchant with a broken wagon wheel flags the player down and offers road gossip with the repair job",
    "a traveling tinker has made camp beside the trail and wants to trade oddments and rumors",
    "a ranger patrol asks whether the player has seen signs of whatever has been troubling the local roads",
    "a fellow traveler asks to share camp for the night and has a problem they are deciding whether to admit",
    "pilgrims invite the player to share a meal in exchange for news from the road behind them",
    "a farmer begs for help with something that has been killing livestock beyond the last fence line",
    "a courier offers coin for company through a stretch of country they do not want to cross alone",
    "two caravan drivers in a spectacular argument ask the player to settle who is actually at fault",
    "a wandering priest offers a blessing and a warning about something seen farther up the road",
    "a rival adventurer wants to compare maps, brag about recent work, and quietly fish for useful information",
    "an old soldier recognizes something about the player's gear and asks to sit for a drink and talk shop",
    "a hedge-witch's roadside stall offers remedies, charms, and gossip that is better than the merchandise",
  ],
  city: [
    "a guild representative mistakes the player for someone expected at an awkward meeting and needs the misunderstanding resolved",
    "a street vendor quietly asks the player to watch the stall for one minute and then disappears much longer than promised",
    "a city watch patrol wants a witness statement about something the player may or may not have noticed",
    "a courier with three sealed letters realizes one address does not exist and asks the player whether they know the district",
    "a tavern keeper offers a free meal if the player can settle a dispute without wrecking the furniture",
    "a minor noble's exhausted servant asks for discreet help finding their employer before anyone notices they are missing",
    "a fence recognizes valuable gear and makes an unsolicited, surprisingly fair offer for something the player owns",
    "two shopkeepers with neighboring businesses recruit the player as an impartial judge in a ridiculous property dispute",
    "a local performer recognizes the player as adventuring material and asks permission to turn one of their exploits into a song",
    "a temple attendant asks the player to escort a nervous petitioner through a hostile crowd outside",
    "a neighborhood child confidently appoints the player to solve a problem the adults have been ignoring",
    "an off-duty guard shares a table and has extremely strong opinions about which local rumors are complete nonsense",
  ],
  ocean: [
    "a fishing boat signals for help after losing its mast but insists the catch is more important than the vessel",
    "a passing merchant ship offers trade, fresh water, and gossip from ports weeks away",
    "a triton or sea-elf envoy surfaces nearby looking for someone who can carry a message to shore",
    "a lighthouse keeper rows out personally because they need a favor that cannot be written down",
    "a stranded sailor on a tiny rock is furious rather than grateful and has a complicated explanation",
    "a coastal patrol vessel hails the player to ask about pirates reported in the area",
    "a salvager offers to split the rights to a newly discovered wreck if the player supplies muscle or magic",
    "a pod of unusually intelligent sea creatures shadows the vessel until one produces a clearly deliberate gift",
    "a mariner priest conducts a small rite for safe passage and invites the player to participate",
    "two captains anchored dangerously close together demand the player arbitrate whose chart is wrong",
    "a water genasi trader approaches in a narrow skiff carrying goods that were definitely not purchased on land",
    "a ship with a mixed crew invites the player aboard for dinner because they have not seen another friendly face in days",
  ],
  underdark: [
    "a deep gnome prospector offers directions in exchange for help identifying a sound coming through the rock",
    "a duergar trader wants to barter tools, ore, and information without pretending either side trusts the other",
    "a drow exile asks whether the player knows a route to the surface and is willing to trade a safer route in return",
    "a mushroom farmer invites the player into a warm cavern for food and immediately begins complaining about neighbors",
    "a caravan of subterranean merchants has stopped because two guides violently disagree about which tunnel still exists",
    "a frightened scout offers payment for company through a stretch of tunnels where nobody has actually been attacked yet",
    "a deep gnome cartwright needs help moving a broken axle before something follows the noise",
    "a wandering priest of an underground faith offers sanctuary for the night and asks for news from beyond the cavern network",
    "a miner breaks through a thin wall beside the player and is just as surprised by the encounter as they are",
    "a myconid messenger communicates a polite request through spores and waits patiently for an answer",
    "an Underdark guide offers their services but refuses to explain why one perfectly ordinary tunnel is excluded from the route",
    "a small trading post is holding a communal meal and treats the arrival of a traveler as tonight's entertainment",
  ],
  avernus: [
    "a soul-coin broker offers directions, fuel, and information while insisting that conversation itself is still free",
    "a war-machine crew has broken an axle and offers a disturbingly reasonable trade for mechanical help",
    "a tiefling scavenger has mapped several nearby battlefields and will sell the route that is least actively lethal",
    "an imp courier has lost the infernal official they were supposed to deliver a sealed document to and asks for help interpreting the address",
    "a mortal deserter from the Blood War wants food, water, and absolutely no questions about which army they fled",
    "a wandering infernal merchant unfolds a tiny stall from a larger impossible box and invites the player to browse",
    "a devil clerk conducting a roadside census politely demands to know whether the player is resident, visitor, invader, or unclassified",
    "a scavenger crew offers to split salvage from a fresh war-machine wreck if the player helps reach it before anyone else",
    "a damned soul recognizes something about the player and begs them to carry one message if they ever return to the mortal world",
    "a mercenary yugoloth representative offers neutral information about the front lines for a price and seems genuinely uninterested in a fight",
    "a caravan bound for the Wandering Emporium invites the player to travel with them because numbers discourage opportunists",
    "an exhausted infernal quartermaster needs an uninvolved outsider to settle a supply dispute between two units that both have valid paperwork",
  ],
  feywild: [
    "an eladrin traveler invites the player to tea and asks a question that sounds casual but clearly matters enormously",
    "a satyr musician offers directions in exchange for a song, story, joke, or other entertainment of the player's choosing",
    "a sprite patrol stops the player to ask whether they have permission to be exactly where they are standing",
    "a dryad asks for news of the mortal world and is far more interested in ordinary gossip than heroic deeds",
    "a gnome merchant's tiny cart contains far more merchandise than its dimensions permit and everything has a peculiar price",
    "a fey courier has three contradictory invitations for the same person and wants an outsider's opinion on which one is least insulting",
    "a group of revelers invites the player to join a meal where nobody agrees what time of day it currently is",
    "a talking animal asks for a simple favor and becomes offended when anyone treats its ability to speak as noteworthy",
    "an eladrin noble's servant discreetly asks the player to locate something embarrassing before the next court gathering",
    "a firbolg herbalist offers a trade and warns the player that one nearby path is in a bad mood today",
    "two minor fey argue over ownership of a shadow and ask the player to adjudicate before the shadow itself gets involved",
    "a mortal traveler who has clearly been in the Feywild too long asks what year it is before asking for directions",
  ],

  astral: [
    "an astral elf navigator hails the player to compare routes around a drifting dead god and trade current portal sightings",
    "a battered spelljammer pulls alongside asking to barter repair materials, water, and news before its next crossing",
    "a giff captain offers an absurdly formal salute and proposes a perfectly legal cargo job with a suspiciously generous hazard bonus",
    "a plasmoid salvager has claimed a tumbling wreck and wants help proving the derelict is actually abandoned",
    "a thri-kreen courier asks for directions to a color pool that its chart insists should be visible from here",
    "a githyanki deserter wants passage somewhere that Vlaakith's patrols will not think to look and has valuable intelligence to trade",
    "an autognome repairer drifts alongside in a tiny chair-shaped craft offering hull work while cheerfully denying that anything nearby is dangerous",
    "a spelljamming merchant caravan invites the player to dock and browse goods collected from half a dozen worlds and planes",
    "an astral elf pilgrim bound for a divine dominion asks whether the player has seen a particular silver beacon on the horizon",
    "a scavenger crew working the ribs of a dead god offers a share of whatever is inside one sealed chamber if the player helps open it",
    "a Rock of Bral dockhand on a courier skiff recognizes the player's vessel type and starts asking extremely specific questions about where it came from",
    "a githzerai traveler calmly requests a brief conversation about a psychic disturbance that seems to be following the player's route",
    "a giff privateer offers to exchange charts and rumors, then casually mentions a bounty posted on a vessel matching one nearby",
    "a tiny spelljammer crew celebrating a successful run waves the player over for food, drink, and increasingly unbelievable stories",
    "an astral fisherman towing translucent silver creatures offers one as a gift and insists it tastes like whatever food you miss most",
    "a priest from a distant divine realm asks for help locating a pilgrim ship that vanished only a few hours from its destination",
    "a neutral githyanki trader operating far from Tu'narath offers dragon-rider intelligence, weapons, and absolutely no explanation for their independence",
    "a shipwreck survivor drifting inside a sphere of breathable air asks for rescue and is more worried about a locked chest than the missing ship",
    "a planar cartographer wants to pay for firsthand descriptions of any color pools, wrecks, dominions, or impossible landmarks the player has seen",
    "a spelljammer customs cutter hails the player for a routine inspection that becomes socially awkward when the crew notices something unusual about the ship",
  ],
  shadowfell: [
    "a shadar-kai ferryman offers passage across a black river but accepts memories, secrets, or favors instead of coin",
    "a raven-feathered shadar-kai scout asks whether the player has seen a particular ghost and becomes visibly relieved if the answer is no",
    "a hollow-eyed human refugee from a Domain of Dread wants directions to anywhere that still has a sunrise",
    "a dusk elf historian camps beside a ruined road, recording names from gravestones before the stones forget them",
    "a shadar-kai chain-smith offers repairs using metal that remembers every weapon it has ever been part of",
    "a pale tiefling herbalist trades remedies grown from grave-moss and insists one of them cures homesickness",
    "a raven familiar carrying a tiny silver tag lands nearby and waits for the player to read the message tied beneath its wing",
    "a shadar-kai pilgrim headed toward the Fortress of Memories asks the player to describe one thing from home they never want to forget",
    "a ghost who knows it is dead politely requests help finding the living descendant still carrying its family name",
    "a kenku scavenger has collected dozens of cheerful sounds from the Material Plane and trades them like rare music",
    "a shadar-kai patrol offers a warning about a region where despair has become physically dangerous and marks a safer route on the player’s map",
    "a mortal caravan huddled beneath cold lanterns invites the player to share food because everyone agrees being alone here is worse",
  ],
  fire: [
    "an azer smith invites the player beneath a heat shield to inspect a blade forged from metal mined on another plane",
    "a fire genasi courier rides a basalt sled over molten rock and offers current news from the City of Brass",
    "an efreeti factor wants to buy something utterly mundane from the player because it cannot be manufactured correctly in elemental fire",
    "a salamander artisan argues with an azer engineer over whose design caused a forge collapse and recruits the player as neutral testimony",
    "a brass dragon traveler lounges in an impossible pocket of cool air and asks for gossip from colder worlds",
    "a magma mephit messenger delivers a sealed invitation to somebody with almost the player’s name and refuses to admit the mistake",
    "an azer caravan transporting ingots asks to travel together through a region plagued by firestorms that steal metal instead of burning it",
    "a fire genasi cook runs a roadside stall where every dish is served directly from glowing stone and somehow tastes excellent",
    "an efreeti bureaucrat performing customs inspections is surprisingly reasonable and deeply offended by the reputation of their profession",
    "a salamander glassworker offers to trade a flawless vessel containing a captured flame from a famous volcano",
    "an azer prospector claims to have found a vein of cold iron and wants an outsider to verify that the impossible ore is real",
    "a smoke-scarred mortal adventurer repairing planar gear offers maps, warnings, and a sincere recommendation to never trust a bridge made of obsidian",
  ],
  water: [
    "a merfolk navigator offers to guide the player through a region where currents connect places farther apart than continents",
    "a water genasi trader travels inside a transparent bubble packed with dry books and is eager to buy anything printed recently",
    "a marid courtier invites the player to a floating pavilion for tea, news, and an argument about etiquette that has lasted seventy years",
    "a triton patrol asks whether the player has seen signs of a migrating leviathan and shares its route to prevent an accidental encounter",
    "a sea elf cartographer paints maps onto sheets of living kelp that rearrange themselves as currents change",
    "a merfolk pearl diver offers a gemstone containing a tiny moving image of another ocean in exchange for help identifying it",
    "a water genasi pilgrim follows a current said to pass through every ocean in existence and asks the player where they think it begins",
    "a marid merchant operates a drifting bazaar contained entirely inside one enormous air bubble",
    "a triton historian examines the ruins of a city floating upside down and happily trades information for help translating a surface inscription",
    "a sea elf musician carries an instrument designed to be heard through miles of water and offers a performance for news from another plane",
    "a merfolk family towing a tiny house of woven coral asks for directions after a familiar current abruptly changed destination",
    "a marid envoy requests the player’s opinion on a dispute between two communities because an outsider has no inherited obligation to either side",
  ],

};

const WEIRD_BY_ENV = {
  wilderness: [
    "a riderless horse, saddled and bloodied, trots down the road",
    "an abandoned camp sits beside the trail with the fire still warm and a meal half-eaten",
    "a faerie ring of mushrooms contains fresh boot prints entering it but none leaving",
    "a dead messenger bird lies beside the path with an unopened letter still tied to its leg",
    "an overturned wagon has untouched cargo but no sign of the team or driver",
    "every bird in the area goes silent at exactly the same moment",
    "a door stands upright in open country, closed, recently painted, and attached to nothing",
    "a milestone's distances have been carefully chiseled out and recarved with impossible numbers",
    "the same fox watches the player from three widely separated places within an hour",
    "distant music remains exactly one hill away no matter how far the player travels",
    "a boat rests aground a long walk from any water with wet footprints around it",
    "a row of standing stones absent from every map has acquired one freshly broken member",
  ],
  city: [
    "an entire busy street goes silent for several seconds except for one person who keeps talking normally",
    "a locked shop has changed its sign, merchandise, and apparent owner overnight while every neighbor insists it has always been that way",
    "dozens of identical keys have been left on windowsills along one block",
    "a public statue is facing a different direction than it was yesterday and nobody admits moving it",
    "every clock visible from one intersection disagrees by exactly thirteen minutes",
    "a narrow alley appears between two buildings where the player is certain no alley existed before",
    "fresh chalk arrows on the pavement point toward the player from every direction",
    "a fountain begins producing seawater and tiny living fish despite being nowhere near the coast",
    "a posted notice bears the player's name in handwriting they do not recognize and gives no instructions",
    "one house on a crowded street has no doors at all, though voices and dinner smells come from inside",
    "a flock of pigeons lands in a perfect circle around an empty patch of street and refuses to cross the boundary",
    "a city bell rings once from a tower that has not contained a bell in decades",
  ],
  ocean: [
    "a ship's bell rings from beneath perfectly calm water with no vessel visible above it",
    "a dense bank of fog contains the smell of pine forest and distant birdsong",
    "a floating dining table drifts past fully set for a meal, candles still burning",
    "the sea becomes mirror-smooth in a perfect circle around the vessel while waves continue beyond it",
    "a school of fish swims in the shape of an enormous arrow pointing somewhere off course",
    "a lighthouse beam sweeps across the horizon from a direction where no land exists",
    "a sealed bottle bumps against the hull repeatedly as though trying to be noticed",
    "the water below briefly reveals rooftops and streets impossibly far beneath the surface",
    "a patch of rain falls upward from the sea into one stationary cloud",
    "an empty rowboat keeps pace with the vessel regardless of wind or current",
    "a whale surfaces nearby bearing old masonry and living plants across its back like a tiny island",
    "for several minutes every compass aboard points toward the same moving object on the horizon",
  ],
  underdark: [
    "a tunnel wall is warm and faintly pulses like something breathing behind the stone",
    "fresh footprints cross the cavern ceiling without any matching tracks on the floor",
    "a field of mushrooms repeats the last spoken sentence in soft overlapping whispers",
    "an underground stream begins flowing uphill at the exact point the player reaches it",
    "a perfectly ordinary wooden door is set into raw stone with lamplight visible beneath it",
    "a huge abandoned camp has warm food but every bedroll and possession is sized for someone much smaller than expected",
    "a vein of crystal displays moving reflections of places that are not this cavern",
    "distant hammering answers whenever the player makes a loud noise and stops whenever they stop",
    "a shaft descends farther than light can reach while a steady breeze blows upward carrying flower petals",
    "a stone bridge crosses a chasm that was not present on the map and has fresh toll marks carved into its rail",
    "hundreds of tiny cave creatures are migrating silently in one direction with unusual urgency",
    "a patch of absolute darkness remains opaque even to mundane light but moves several feet whenever nobody watches it",
  ],
  avernus: [
    "a battlefield falls completely silent as thousands of distant combatants stop and look toward the same empty point in the sky",
    "a river of blood or ichor briefly runs clear enough to reveal coins, weapons, and faces beneath its surface",
    "an abandoned infernal war machine is still hot, fully fueled, and has no tracks leading to or from it",
    "a legal notice nailed to a blackened post names the player as a witness to an event that has not happened yet",
    "a rain of harmless ash falls upward for several minutes and forms letters nobody nearby can read",
    "a patch of Avernian wasteland is covered in fresh green grass surrounding one ordinary mortal apple tree",
    "the Styx briefly reflects a bright blue mortal sky instead of the hellish landscape above it",
    "an enormous distant fortress appears upside down on the horizon and slowly fades when approached",
    "hundreds of soul coins scattered across a crater all whisper the same unfamiliar name",
    "a column of marching lemures passes without reacting to the player and continues directly into a solid cliff face",
    "a smoking crater contains a perfectly intact dining room set for four",
    "an infernal road sign lists one destination as the player's current location even though the arrow points away",
  ],
  feywild: [
    "the sun sets, immediately rises from the same horizon, and nobody nearby considers this unusual",
    "a path forks into three routes whose signposts each claim to be the path the player just came from",
    "the player's shadow stops for a moment before hurrying to catch up",
    "a tree politely asks the player to move because they are blocking its view",
    "rain falls only beneath one small cloud that follows a particular animal through the forest",
    "a pond reflects the same clearing in a completely different season",
    "a ring of flowers blooms in sequence to spell a name the player does not recognize",
    "the player passes the same picnic three times despite never turning around, and the diners wave more enthusiastically each time",
    "all spoken words become visible as glowing moths for several minutes before flying away",
    "a staircase rises unsupported into the canopy and ends at a closed trapdoor hanging in open air",
    "a fox wearing a tiny formal coat waits beside the road with a pocket watch and refuses to explain itself",
    "the forest ahead is nighttime while the forest behind remains in full daylight, divided by a perfectly straight line",
  ],

  astral: [
    "a color pool hangs in the silver void like a perfectly still disk, showing a place the player recognizes despite having no reason to",
    "the colossal petrified corpse of a dead god drifts past close enough to reveal structures built into its ribs",
    "an abandoned spelljammer tumbles slowly with its running lights still on and no visible damage anywhere on the hull",
    "a distress beacon repeats a message in the player's own voice even though they have never recorded it",
    "a field of debris is made entirely of doors, each intact, locked, and from a visibly different culture or world",
    "a silver cord stretches across the void from nowhere to nowhere and vibrates when the player approaches",
    "a distant divine dominion becomes visible for several minutes even though every chart says it should be impossibly far away",
    "a wrecked nautiloid has been carefully arranged into the shape of an enormous warning symbol visible only from one direction",
    "a cluster of floating stones carries fresh campfires whose flames burn normally despite nobody being present",
    "the player's vessel casts a shadow across empty astral light even though there is no obvious source that could cast it",
    "a tiny moon with buildings on its surface drifts by close enough to see lights moving inside, then vanishes when looked at through a spyglass",
    "an immense astral dreadnought passes far below the route, not attacking, while every smaller creature in sight flees in the opposite direction",
    "a color pool opens for only a few seconds and something on the other side notices the player before it snaps shut",
    "hundreds of pieces of parchment drift together into a readable map whose destination moves whenever the map is rotated",
    "a shattered statue larger than a city floats in pieces, but its stone eyes track passing ships from separate fragments",
    "a derelict githyanki skiff rotates slowly in place with warm controls, fresh supplies, and absolutely no crew",
    "a patch of the Astral Sea contains falling rain that never disperses, each drop holding a tiny reflected sky",
    "a procession of ghostly spelljammers crosses the route in complete silence and passes through solid debris without changing course",
    "the stars and distant lights disappear for one heartbeat, leaving only the player's vessel and one unfamiliar light directly behind it",
    "a perfectly ordinary tavern sign spins slowly in the void, pointing toward an invisible doorway that only appears when nobody faces it directly",
  ],
  shadowfell: [
    "the player’s shadow continues walking for several steps after they stop, then slowly returns to the correct position",
    "a ruined village appears completely intact whenever nobody looks directly at it",
    "cold rain falls everywhere except within a perfect circle centered on a nameless grave",
    "a flock of ravens circles an empty patch of road and their shadows form the outline of a person who is not there",
    "a distant sunrise sits frozen on the horizon for several minutes before dimming back into gray",
    "a stone bridge crosses a ravine filled not with darkness but with hundreds of softly whispered regrets",
    "the player hears their own footsteps approaching from ahead while standing completely still",
    "a dead tree bears one bright red apple that remains warm no matter how cold the surrounding air becomes",
    "an abandoned house contains a dinner table set for people the player knows, including one place that should be impossible",
    "a patch of fog shows reflections of the Material Plane version of the landscape rather than what actually surrounds the player",
    "every written word carried by the player briefly changes into the same unfamiliar name and then returns to normal",
    "a black pool reflects a star-filled night sky even though the Shadowfell above it has no visible stars",
  ],
  fire: [
    "a river of lava flows vertically up a cliff and pours into the underside of a cloud of incandescent ash",
    "a field of flame burns in perfect silence and each flame contains the image of a different fireplace on another world",
    "a black iron door stands unsupported above molten rock and frost forms around its handle",
    "a firestorm sweeps across the horizon but carefully bends around one tiny abandoned chair",
    "a chunk of basalt floats past carrying a thriving garden whose leaves are made of blue fire",
    "the player’s shadow becomes visibly hotter than the surrounding ground and briefly leaves glowing footprints of its own",
    "a rain of cooling glass falls from a clear sky and shatters into tiny maps when it strikes stone",
    "a volcano in the distance erupts downward, drawing ash and lava back into its crater for several impossible seconds",
    "a perfectly spherical pocket of winter air drifts across the landscape with snow falling inside it",
    "an enormous brass chain disappears upward into the glowing sky and downward into lava, vibrating as if something is climbing it",
    "a flame the size of a candle follows the player at walking pace without consuming fuel or responding to wind",
    "every nearby fire abruptly turns green and leans toward the same unseen point beyond the horizon",
  ],
  water: [
    "a perfectly dry staircase descends through open water with breathable air clinging to every step",
    "an upside-down island drifts overhead with trees growing toward its stone underside and fish swimming through its branches",
    "a current carries hundreds of sealed letters through the water without wetting any of the paper",
    "a whale-sized transparent creature passes at a distance with an entire illuminated village visible inside its body",
    "a vertical boundary separates warm tropical water from dark freezing water as cleanly as a pane of glass",
    "a bell rings from somewhere below and every nearby bubble stops rising until the sound fades",
    "a school of silver fish arranges itself into written words that change depending on who looks at them",
    "a floating doorway opens onto a sunlit desert and seawater refuses to cross the threshold in either direction",
    "a ruined tower drifts sideways through the ocean while gravity inside its windows still points toward its original floor",
    "a sphere of water the size of a house contains no water at all, only rain falling through empty air",
    "the surrounding ocean becomes completely transparent for one heartbeat, revealing structures impossibly far away in every direction",
    "a slow spiral of glowing plankton forms a map of another plane before scattering when approached",
  ],

};

// Arc-tied variants: the encounter doubles as guaranteed foreshadowing,
// because the app picked both the encounter AND the villain it points at.
const ARC_HOSTILE = [
  (a) => `scouts or agents of ${a} attack — they have clearly been watching the player`,
  (a) => `the player walks into an ambush laid by ${a}`,
  (a) => `enforcers working for ${a} try to warn the player off — it goes badly`,
];
const ARC_SOCIAL = [
  (a) => `a survivor fleeing ${a} stumbles onto the road, desperate to warn anyone who will listen`,
  (a) => `someone hunting ${a} for reasons of their own wants to compare notes`,
  (a) => `a frightened local quietly admits they have been paying off ${a} to be left alone`,
];
const ARC_WEIRD = [
  (a) => `the fresh aftermath of an attack by ${a} — and one detail worth following`,
  (a) => `a coded message, mark, or token that traces back to ${a}`,
  (a) => `evidence that ${a} passed through here recently, and was looking for something`,
];

const TABLES = { social: SOCIAL_BY_ENV, weird: WEIRD_BY_ENV };
const ARC_TABLES = { hostile: ARC_HOSTILE, social: ARC_SOCIAL, weird: ARC_WEIRD };

// ── NPC race/gender roll for social encounters ─────────────────────────────────
// The app rolls who you meet — humans and half-elves are deliberately a minority
// weight so the DM's training-data default can't dominate the road.
const NPC_RACES = [
  'dwarf', 'dwarf', 'elf', 'elf', 'halfling', 'halfling', 'gnome', 'gnome',
  'tiefling', 'tiefling', 'dragonborn', 'dragonborn', 'half-orc', 'half-orc',
  'goliath', 'tabaxi', 'kenku', 'firbolg', 'aasimar', 'genasi', 'lizardfolk', 'orc',
  'human', 'human', 'half-elf',
];
const NPC_RACES_BY_ENV = {
  astral: [
    'astral elf', 'astral elf', 'githyanki', 'githzerai', 'giff', 'plasmoid',
    'autognome', 'thri-kreen', 'hadozee', 'human', 'elf', 'dwarf', 'tiefling',
    'dragonborn', 'aasimar', 'genasi',
  ],
  shadowfell: ['shadar-kai', 'dusk elf', 'human', 'tiefling', 'kenku', 'ghost', 'ravenfolk'],
  fire: ['azer', 'fire genasi', 'efreeti', 'salamander', 'brass dragonborn', 'human', 'tiefling'],
  water: ['merfolk', 'water genasi', 'marid', 'triton', 'sea elf', 'human', 'dragonborn'],
};
const rollNpcDescriptor = (environment = 'wilderness') => {
  const races = NPC_RACES_BY_ENV[environment] || NPC_RACES;
  return `${Math.random() < 0.5 ? 'male' : 'female'} ${pick(races)}`;
};

const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water']);

// ── Roll an encounter directive ────────────────────────────────────────────────
// Mix: 60% hostile / 25% social / 15% weird. 1-in-3 ties to the active arc.
// Hostile rolls only from entries at or under the level's CR ceiling.
export const rollEncounterDirective = (char) => {
  const r = Math.random();
  const type = r < 0.60 ? 'hostile' : r < 0.85 ? 'social' : 'weird';
  const arcTied = !!char?.arc?.antagonist && Math.random() < (1 / 3);
  const cap = encounterCRCap(char?.level);

  let desc, crNote = '', npcNote = '';
  if (arcTied) {
    desc = pick(ARC_TABLES[type])(char.arc.antagonist);
  } else if (type === 'hostile') {
    // Native planar environments stay native; ordinary 'anywhere' trouble is only
    // mixed into Material-style environments. Then apply the CR ceiling.
    const envHere = char?.environment || 'wilderness';
    let pool = HOSTILE.filter(e => e.cr <= cap && (e.env?.includes(envHere) || (!NATIVE_ONLY_ENVIRONMENTS.has(envHere) && e.env?.includes('anywhere'))));
    if (!pool.length && !NATIVE_ONLY_ENVIRONMENTS.has(envHere)) pool = HOSTILE.filter(e => e.cr <= cap); // material safety net
    const entry = pick(pool);
    desc = entry.desc;
    crNote = `This is a CR ${entry.label} threat — keep it at exactly that power, do not escalate it into something bigger. `;
  } else {
    const envHere = char?.environment || 'wilderness';
    const envTable = TABLES[type]?.[envHere] || TABLES[type]?.wilderness || [];
    desc = pick(envTable);
  }
  if (type === 'social') {
    const envHere = char?.environment || 'wilderness';
    if (!NATIVE_ONLY_ENVIRONMENTS.has(envHere)) {
      npcNote = `The person at the center of this encounter is a ${rollNpcDescriptor(envHere)} — use exactly that race and gender, and give them one fresh memorable detail (no scars, no travel leathers, no merchant's clothes). `;
    }
  }

  const directive =
    `\n\n[ENCOUNTER — MANDATORY: This turn, the following occurs: ${desc}. ` +
    `OPEN the encounter at the MOMENT OF FIRST CONTACT — the creature appears, the stranger steps out, the thing is noticed — and then STOP for the player's choice. Do NOT start the scene already in progress, do NOT narrate the player dodging, drawing, striking, or reacting, and do NOT resolve any of it. Do NOT call any [ROLL:] in this message — the player has made no choice yet, so there is nothing to roll for; the roll (if any) comes AFTER they state what they do. Describe only what happens TO them and around them, then hand control back. ` +
    crNote + npcNote +
    (arcTied ? `This connects to the active arc antagonist — let that show without naming them outright. Scale any threat to the player's level. ` : '') +
    `End with your usual 4 numbered choices.]`;
  return { type, arcTied, desc, directive };
};
