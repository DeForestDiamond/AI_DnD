// ── Encounters, pacing, and arc antagonists ────────────────────────────────────
// The app decides WHEN an encounter happens and WHAT it is; the DM only narrates.
// Same philosophy as the dice roller: never trust the model with mechanics.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Arc antagonists (shared by adventure seeds and arc re-rolls) ───────────────
// Three tiers, gated by level. An arc villain is built up over many sessions and
// fought on the player's terms, so tiers run ahead of the random-encounter CR cap.
const LOW_ANTAGONISTS = [ // levels 1+: local, mundane, street-level
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
];
const MID_ANTAGONISTS = [ // levels 5+: regional threats, real monsters
  'a troll', 'a young dragon', 'a vampire and their thralls', 'a necromancer raising the local dead',
  'a yuan-ti slaver operation', 'a giant causing problems', 'a hag coven',
  'an ogre warband under a cunning leader', 'a wight commanding restless dead',
  'a doppelganger infiltration ring', 'a green hag quietly running a town',
  'a werewolf pack claiming territory', 'a duergar slaving operation',
  'the vanguard of a hobgoblin legion', 'a medusa building a court of statues',
  'a cult with a real fiend on retainer', 'an oni preying on a town in disguise',
  'a bandit army unifying the local gangs',
];
const HIGH_ANTAGONISTS = [ // levels 9+: campaign-scale villains
  'a young adult dragon carving out a domain', 'a vampire lord and their web of thralls',
  'a fire giant warlord forging a conquest', 'a necromancer on the verge of something terrible',
  'a mind flayer cell harvesting a city', 'a beholder running a criminal empire',
  'an archmage cabal bending a kingdom', 'a death knight raising an army',
  'a yuan-ti conspiracy seated in high places', 'a frost giant jarl raiding the lowlands',
];

export const rollAntagonist = (level, exclude = null) => {
  let pool = [...LOW_ANTAGONISTS];
  if (level >= 5) pool.push(...MID_ANTAGONISTS);
  if (level >= 9) pool.push(...HIGH_ANTAGONISTS);
  if (exclude) {
    const filtered = pool.filter(a => a !== exclude);
    if (filtered.length) pool = filtered;
  }
  return pick(pool);
};

// ── Pacing knob ────────────────────────────────────────────────────────────────
// grace: turns with zero encounter chance. After that, chance = base + perTurn per turn, capped.
export const PACING = {
  off:       { label: '🚫 Encounters: Off',   grace: Infinity, base: 0, perTurn: 0 },
  calm:      { label: '🕊️ Pacing: Calm',      grace: 8, base: 0.10, perTurn: 0.08 },
  normal:    { label: '⚖️ Pacing: Normal',    grace: 4, base: 0.20, perTurn: 0.12 },
  dangerous: { label: '⚔️ Pacing: Dangerous', grace: 2, base: 0.30, perTurn: 0.18 },
};
export const PACING_ORDER = ['off', 'calm', 'normal', 'dangerous'];

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
  { cr: 0.125, label: '1/8', desc: 'kobold skirmishers harass from range, trying to drive the player toward a snare' },
  { cr: 0.125, label: '1/8', desc: 'a handful of bandits block the way and demand a toll, weapons drawn' },
  { cr: 0.125, label: '1/8', desc: 'a swarm of stirges descends at dusk' },
  { cr: 0.125, label: '1/8', desc: 'giant rats boil out of a culvert or cellar, starving and fearless' },
  { cr: 0.125, label: '1/8', desc: 'twig blights detach from the brush where something foul took root' },
  { cr: 0.125, label: '1/8', desc: 'robed cultists decide the player has witnessed their gathering' },
  { cr: 0.125, label: '1/8', desc: 'feral dogs, ribs showing, follow at a distance that keeps shrinking' },
  { cr: 0.125, label: '1/8', desc: 'blood hawks dive in shrieking pairs, going for the eyes' },
  { cr: 0.125, label: '1/8', desc: 'a venomous snake strikes from the grass at the worst possible moment' },
  // ── CR 1/4 ──
  { cr: 0.25, label: '1/4', desc: 'a band of goblins springs an ambush from cover' },
  { cr: 0.25, label: '1/4', desc: 'a pack of wolves has been trailing the player and now closes in' },
  { cr: 0.25, label: '1/4', desc: 'skeletons claw free of old battlefield soil as the player passes' },
  { cr: 0.25, label: '1/4', desc: 'several zombies shamble out of the treeline, drawn by sound' },
  { cr: 0.25, label: '1/4', desc: 'a wild boar charges out of the undergrowth, furious and territorial' },
  { cr: 0.25, label: '1/4', desc: 'kenku ambushers strike, mimicking voices the player has heard before' },
  { cr: 0.25, label: '1/4', desc: 'a swarm of ravens descends with un-birdlike purpose' },
  { cr: 0.25, label: '1/4', desc: 'a giant wolf spider has webbed the only easy path through' },
  { cr: 0.25, label: '1/4', desc: 'winged kobolds drop rocks from above, hooting at every near miss' },
  { cr: 0.25, label: '1/4', desc: 'mephits burst from the muck, all spite and bad breath' },
  { cr: 0.25, label: '1/4', desc: 'a panther stalks the player through the brush, patient and silent' },
  { cr: 0.25, label: '1/4', desc: 'territorial axe beaks charge in a flurry of feathers and bad temper' },
  // ── CR 1/2 ──
  { cr: 0.5, label: '1/2', desc: 'gnoll raiders on the hunt, whooping as they spot fresh prey' },
  { cr: 0.5, label: '1/2', desc: 'hobgoblin soldiers at a makeshift checkpoint turn hostile when refused' },
  { cr: 0.5, label: '1/2', desc: 'an orc raiding party emerges ahead, already spreading out to flank' },
  { cr: 0.5, label: '1/2', desc: 'poachers decide the player has seen too much' },
  { cr: 0.5, label: '1/2', desc: 'worgs — too smart to be wolves — circle with unsettling coordination' },
  { cr: 0.5, label: '1/2', desc: 'a black bear, woken early and hungry, will not be talked out of the food' },
  { cr: 0.5, label: '1/2', desc: 'a cockatrice flaps out of a hedge, snapping at anything that moves' },
  { cr: 0.5, label: '1/2', desc: 'a rust monster scuttles straight for the player\'s metal gear' },
  { cr: 0.5, label: '1/2', desc: 'a shadow peels away from the rest of the dark and reaches out' },
  { cr: 0.5, label: '1/2', desc: 'a gray ooze drops from above, nearly indistinguishable from wet stone' },
  { cr: 0.5, label: '1/2', desc: 'sahuagin slip out of the surf with hooked nets and worse intentions' },
  { cr: 0.5, label: '1/2', desc: 'a crocodile explodes from still water at the crossing point' },
  // ── CR 1 ──
  { cr: 1, label: '1', desc: 'a bugbear and its goblin lackeys have strung a tripwire across the way' },
  { cr: 1, label: '1', desc: 'a ghoul pack erupts from shallow graves beside the road' },
  { cr: 1, label: '1', desc: 'a giant spider drops from above — webs already strung across the path' },
  { cr: 1, label: '1', desc: 'a dire wolf, larger than a pony, stalks out of the mist' },
  { cr: 1, label: '1', desc: 'harpies on the cliffs above begin their song' },
  { cr: 1, label: '1', desc: 'a specter rises where someone died badly and was never buried' },
  { cr: 1, label: '1', desc: 'a suit of animated armor lurches to attack, dragging a rusted blade' },
  { cr: 1, label: '1', desc: 'a scarecrow in a fallow field turns its head to watch — then steps off its post' },
  { cr: 1, label: '1', desc: 'death dogs — two heads each, all teeth — pace the player at the road\'s edge' },
  { cr: 1, label: '1', desc: 'a goblin boss and its retinue want everything the player is carrying' },
  { cr: 1, label: '1', desc: 'giant hyenas laugh somewhere close, then closer' },
  { cr: 1, label: '1', desc: 'a brown bear rears up between the player and the only path through' },
  { cr: 1, label: '1', desc: 'duergar slavers surface from a tunnel mouth with manacles ready' },
  { cr: 1, label: '1', desc: 'an imp in some borrowed animal shape has been spying — and is caught at it' },
  // ── CR 2 ──
  { cr: 2, label: '2', desc: 'a pair of ogres arguing over a carcass notice the player' },
  { cr: 2, label: '2', desc: 'a bandit captain and their crew have claimed this stretch of road' },
  { cr: 2, label: '2', desc: 'an ankheg bursts from the earth in a spray of soil and acid' },
  { cr: 2, label: '2', desc: 'berserkers from a raiding band, blood-drunk and looking for a fight' },
  { cr: 2, label: '2', desc: 'a griffon dives — it has decided the player\'s mount or pack animal is lunch' },
  { cr: 2, label: '2', desc: 'a will-o\'-wisp drifts at the edge of sight, luring toward the mire' },
  { cr: 2, label: '2', desc: 'a carrion crawler ripples down a wall, paralytic tentacles tasting the air' },
  { cr: 2, label: '2', desc: 'an ettercap and its web-trapped larder — some of it still moving' },
  { cr: 2, label: '2', desc: 'gargoyles detach from a ruin\'s eaves with a sound like grinding millstones' },
  { cr: 2, label: '2', desc: 'a gelatinous cube fills the corridor ahead, nearly invisible until it moves' },
  { cr: 2, label: '2', desc: 'a ghast and its ghoul pack — this one is smart, and it gives orders' },
  { cr: 2, label: '2', desc: 'a gibbering mouther burbles out of a drain, all eyes and babble' },
  { cr: 2, label: '2', desc: 'a grick uncoils from a crevice, beak clicking' },
  { cr: 2, label: '2', desc: 'merrow drag a net to shore — and decide to fill it with the player' },
  { cr: 2, label: '2', desc: 'an ochre jelly seeps under the door, around the frame, through the cracks' },
  { cr: 2, label: '2', desc: 'a peryton stoops out of the sun, hungering for a heart specifically' },
  { cr: 2, label: '2', desc: 'a sea hag surfaces beside the boat or bank, smiling with green teeth' },
  { cr: 2, label: '2', desc: 'a white dragon wyrmling, young and vicious, claims this stretch as hunting ground' },
  { cr: 2, label: '2', desc: 'cult fanatics with real magic decide the player is an omen — a bad one' },
  { cr: 2, label: '2', desc: 'a wererat gang corners the player somewhere narrow' },
  { cr: 2, label: '2', desc: 'a gnoll pack lord drives its cackling hunters forward' },
  { cr: 2, label: '2', desc: 'a mimic — that chest, door, or cart was never furniture' },
  // ── CR 3 ──
  { cr: 3, label: '3', desc: 'an owlbear crashes out of the brush, territorial and enraged' },
  { cr: 3, label: '3', desc: 'a wight in ancient war-gear walks the road it died defending' },
  { cr: 3, label: '3', desc: 'a veteran sellsword with a grudge and a contract steps into the road' },
  { cr: 3, label: '3', desc: 'a manticore wheels overhead and looses a volley of tail spikes' },
  { cr: 3, label: '3', desc: 'a displacer beast hunts the player — its image never quite where it is' },
  { cr: 3, label: '3', desc: 'a werewolf, half-changed and past caring who sees' },
  { cr: 3, label: '3', desc: 'a minotaur claims this crossing and accepts no toll but blood' },
  { cr: 3, label: '3', desc: 'a basilisk suns itself ahead — the statues nearby are very lifelike' },
  { cr: 3, label: '3', desc: 'a doppelganger wearing a familiar face gets close before the knife comes out' },
  { cr: 3, label: '3', desc: 'a giant scorpion erupts from beneath the sand and stones' },
  { cr: 3, label: '3', desc: 'a green hag has been wearing a kindly disguise — until now' },
  { cr: 3, label: '3', desc: 'hell hounds course across the land, smoke trailing from their jaws' },
  { cr: 3, label: '3', desc: 'a knight in tarnished colors demands satisfaction for an imagined slight' },
  { cr: 3, label: '3', desc: 'a mummy walks a ruined processional, drawn by trespass' },
  { cr: 3, label: '3', desc: 'a winter wolf speaks before it attacks — it likes prey that understands' },
  { cr: 3, label: '3', desc: 'a yeti comes down with the weather, white on white until it is too close' },
  { cr: 3, label: '3', desc: 'hook horrors clatter and echo-click through the dark toward the player' },
  { cr: 3, label: '3', desc: 'a grell floats silently overhead, tentacles unfurling' },
  // ── CR 4 ──
  { cr: 4, label: '4', desc: 'an ettin lumbers into view, both heads arguing about how to cook the player' },
  { cr: 4, label: '4', desc: 'a banshee\'s wail rolls across the land as something pale rises ahead' },
  { cr: 4, label: '4', desc: 'a chuul hauls itself out of the water, claws wide — some things never change' },
  { cr: 4, label: '4', desc: 'a flameskull spirals up from old wizard bones, cackling fire' },
  { cr: 4, label: '4', desc: 'a ghost manifests mid-road, replaying its last hour — and the player is in the script now' },
  { cr: 4, label: '4', desc: 'a lamia\'s caravan of comforts is a honeyed trap, and it is sprung' },
  { cr: 4, label: '4', desc: 'a red dragon wyrmling with a stolen hoard and a point to prove' },
  { cr: 4, label: '4', desc: 'a wereboar bursts through a fence line, tusks first' },
  { cr: 4, label: '4', desc: 'a black pudding pours out of a ceiling crack, dissolving what it touches' },
  { cr: 4, label: '4', desc: 'a helmed horror stands sentinel over a door no one remembers — and the player is trespassing' },
  { cr: 4, label: '4', desc: 'a bone naga rises from a plundered shrine, hissing in a dead tongue' },
  // ── CR 5 ──
  { cr: 5, label: '5', desc: 'a troll lopes out of the rocks, already healing from its last fight' },
  { cr: 5, label: '5', desc: 'a hill giant tears up a tree to use as a club' },
  { cr: 5, label: '5', desc: 'the ground shudders — a bulette breaches like a shark through soil' },
  { cr: 5, label: '5', desc: 'a wraith pours out of a barrow mouth, trailing cold' },
  { cr: 5, label: '5', desc: 'vampire spawn caught out near dusk, hungry and far from their master' },
  { cr: 5, label: '5', desc: 'an elemental — fire, water, earth, or air to match the place — tears loose of its surroundings' },
  { cr: 5, label: '5', desc: 'a flesh golem off its leash, following its last order much too literally' },
  { cr: 5, label: '5', desc: 'a famed gladiator collects duels with strangers — and does not ask twice' },
  { cr: 5, label: '5', desc: 'a gorgon\'s iron hooves spark on stone as it charges, breath fogging green' },
  { cr: 5, label: '5', desc: 'a night hag has been riding someone\'s dreams here — and dislikes interruptions' },
  { cr: 5, label: '5', desc: 'an otyugh erupts from the refuse it was sleeping under' },
  { cr: 5, label: '5', desc: 'a revenant arrives, asking for someone by name — wrong someone, same fury' },
  { cr: 5, label: '5', desc: 'a shambling mound rises out of the wet green, absorbing as it comes' },
  { cr: 5, label: '5', desc: 'an umber hulk bursts through the wall — do not meet its eyes' },
  { cr: 5, label: '5', desc: 'a xorn surfaces through solid rock, smelling the player\'s coin and gems' },
  { cr: 5, label: '5', desc: 'a beholder zombie drifts crooked through the air, dead eyestalks still sparking' },
  { cr: 5, label: '5', desc: 'a salamander coils out of the heat haze, spear glowing' },
  // ── CR 6 ──
  { cr: 6, label: '6', desc: 'a chimera descends, three sets of jaws and no patience' },
  { cr: 6, label: '6', desc: 'a wyvern strikes from a high ledge, stinger first' },
  { cr: 6, label: '6', desc: 'a cyclops hurls a boulder as an opening argument' },
  { cr: 6, label: '6', desc: 'a medusa\'s garden of statues — and its keeper, lifting her veil' },
  { cr: 6, label: '6', desc: 'a drider descends headfirst from the dark above, silent as falling silk' },
  { cr: 6, label: '6', desc: 'an invisible stalker arrives — sent by someone, for the player specifically' },
  { cr: 6, label: '6', desc: 'a mammoth stampedes, driven mad by something stuck in its hide' },
  { cr: 6, label: '6', desc: 'a hobgoblin warlord and honor guard accept the player\'s existence as a challenge' },
  { cr: 6, label: '6', desc: 'a young white dragon hits like an avalanche with grudges' },
  // ── CR 7 ──
  { cr: 7, label: '7', desc: 'a stone giant mistakes the player for the vandals who defaced its carvings' },
  { cr: 7, label: '7', desc: 'a young black dragon rises out of black water, acid dripping' },
  { cr: 7, label: '7', desc: 'an oni in human guise has been hunting this road — and drops the disguise' },
  { cr: 7, label: '7', desc: 'a giant ape crashes through the canopy, beating its chest' },
  { cr: 7, label: '7', desc: 'a mind flayer steps out of a fold in the dark, tentacles tasting thought' },
  { cr: 7, label: '7', desc: 'a yuan-ti abomination uncoils from ruin shadows, scripture hissing from its jaws' },
  { cr: 7, label: '7', desc: 'a shield guardian with no master left strides forward, executing a dead command' },
  // ── CR 8 ──
  { cr: 8, label: '8', desc: 'a frost giant raiding alone, looking for plunder and a story worth telling' },
  { cr: 8, label: '8', desc: 'a professional assassin has been paid — the first attack comes without warning' },
  { cr: 8, label: '8', desc: 'a hydra wades out of the shallows — count the heads, then count again' },
  { cr: 8, label: '8', desc: 'a spirit naga the locals thought permanently dead is back, and remembers' },
  { cr: 8, label: '8', desc: 'a young green dragon has been listening from the trees for some time' },
  { cr: 8, label: '8', desc: 'a fomorian surfaces from a sinkhole, its evil eye already fixing on the player' },
  { cr: 8, label: '8', desc: 'a cloaker detaches from where the ceiling pretended to have a shadow' },
  // ── CR 9-10 ──
  { cr: 9, label: '9', desc: 'a fire giant on the march, treating everything in its path as kindling' },
  { cr: 9, label: '9', desc: 'a young blue dragon strafes the road, toying before it commits' },
  { cr: 9, label: '9', desc: 'a clay golem with its command word lost runs its last instruction forever' },
  { cr: 9, label: '9', desc: 'an abominable yeti is the blizzard — the storm has teeth' },
  { cr: 9, label: '9', desc: 'a treant wakes wrathful — someone burned its grove, and the player is holding fire' },
  { cr: 10, label: '10', desc: 'a young red dragon announces itself by setting the horizon alight' },
  { cr: 10, label: '10', desc: 'an aboleth\'s presence slicks the water — and its voice is already inside the player\'s head' },
  { cr: 10, label: '10', desc: 'a stone golem steps off a temple plinth where it stood for a century' },
  // ── CR 11-12 ──
  { cr: 11, label: '11', desc: 'a behir pours down the cliffside like lightning given legs' },
  { cr: 11, label: '11', desc: 'a roc\'s shadow swallows the road whole — then it banks back around' },
  { cr: 11, label: '11', desc: 'a remorhaz breaches in a gout of steam, the snow melting around it' },
  { cr: 11, label: '11', desc: 'an efreeti arrives in a column of smoke, taking inventory of what it now owns' },
  { cr: 12, label: '12', desc: 'an archmage with a grudge and prepared spells has chosen the time and place' },
  { cr: 12, label: '12', desc: 'an erinyes descends on burning wings to collect on a contract — someone sold a debt' },
];

const SOCIAL = [
  'a merchant with a broken wagon wheel flags the player down',
  'a traveling tinker offers a trade and shares road gossip',
  'a patrol stops the player with questions about trouble up ahead',
  'a fellow traveler asks to share camp for the night — and has an agenda of their own',
  'pilgrims invite the player to share a meal in exchange for news',
  'a bounty hunter sizes the player up and asks pointed questions',
  'a farmer begs for help — something has been killing livestock',
  'a courier offers coin for safe escort to the next waypoint',
  'two wagoneers mid-argument try to pull the player in as judge',
  'a deserter trades what they know for food and a head start',
  'a wandering priest offers a blessing — and a warning about the road ahead',
  'a fence quietly offers to buy anything the player should not be carrying',
  'children from a nearby steading shadow the player, daring each other closer',
  'a rival adventurer wants to compare notes, brag, and maybe poach a job',
  'a tax collector with an escort insists on inspecting the player\'s goods',
  'a minstrel collecting stories offers a song for a true account of a deed',
  'an old soldier recognizes the player\'s gear and wants to talk shop',
  'a betrothed runaway begs for discretion — pursuers are an hour behind',
  'a hedge-witch trades remedies and rumors from a roadside stall',
  'a funeral procession needs one more bearer, and the road is watched',
];

const WEIRD = [
  'a riderless horse, saddled and bloodied, trots down the road',
  'an abandoned camp — fire still warm, meal half-eaten',
  'a faerie ring of mushrooms, with fresh boot prints inside it',
  'a dead messenger bird with an unopened letter on its leg',
  'an overturned wagon, cargo untouched, the team simply gone',
  'a child\'s toy hanging from a branch, far from any village',
  'an empty gibbet creaking at the crossroads — the chains cut, not broken',
  'strange lights moving across a field at dusk',
  'a fresh grave beside the road with no marker and a shovel still planted in it',
  'every bird in the area goes silent at the same moment',
  'a door standing upright in open country — closed, and recently painted',
  'a milestone whose distances have been chiseled out and recarved wrong',
  'a tree full of shoes, some of them new',
  'a perfectly circular patch of dead grass, still warm at the center',
  'the same fox watches from three different places in one hour',
  'distant music with no source, always one hill away',
  'a scarecrow holding a sword that looks far too good for a field',
  'a boat aground a long walk from any water',
  'all the player\'s food has gone inexplicably and identically stale overnight',
  'a row of standing stones that does not appear on any map — and one has fallen, recently',
];

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

const TABLES     = { social: SOCIAL, weird: WEIRD };
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
const rollNpcDescriptor = () =>
  `${Math.random() < 0.5 ? 'male' : 'female'} ${pick(NPC_RACES)}`;

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
    const entry = pick(HOSTILE.filter(e => e.cr <= cap));
    desc = entry.desc;
    crNote = `This is a CR ${entry.label} threat — keep it at exactly that power, do not escalate it into something bigger. `;
  } else {
    desc = pick(TABLES[type]);
  }
  if (type === 'social') {
    npcNote = `The person at the center of this encounter is a ${rollNpcDescriptor()} — use exactly that race and gender, and give them one fresh memorable detail (no scars, no travel leathers, no merchant's clothes). `;
  }

  const directive =
    `\n\n[ENCOUNTER — MANDATORY: This turn, the following occurs: ${desc}. ` +
    `OPEN the encounter at the MOMENT OF FIRST CONTACT — the creature appears, the stranger steps out, the thing is noticed — and then STOP for the player's choice. Do NOT start the scene already in progress, do NOT narrate the player dodging, drawing, striking, or reacting, and do NOT resolve any of it. Do NOT call any [ROLL:] in this message — the player has made no choice yet, so there is nothing to roll for; the roll (if any) comes AFTER they state what they do. Describe only what happens TO them and around them, then hand control back. ` +
    crNote + npcNote +
    (arcTied ? `This connects to the active arc antagonist — let that show without naming them outright. Scale any threat to the player's level. ` : '') +
    `End with your usual 4 numbered choices.]`;
  return { type, arcTied, desc, directive };
};
