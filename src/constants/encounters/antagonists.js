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
