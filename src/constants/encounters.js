// ── Encounters, pacing, and arc antagonists ────────────────────────────────────
// The app decides WHEN an encounter happens and WHAT it is; the DM only narrates.
// Same philosophy as the dice roller: never trust the model with mechanics.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Arc antagonists (moved from rollAdventureSeed) ─────────────────────────────
const LOW_ANTAGONISTS = [
  'a thieves guild', 'a corrupt local official', 'a gang of bandits', 'a goblin warband',
  'a pack of gnolls', 'a rogue hedge wizard', 'a smuggling ring', 'a rival adventuring party',
  'a cult (not cosmic horror — a mundane power-hungry cult)', 'a pirate captain',
  'a group of hobgoblin soldiers',
];
const HIGHER_ANTAGONISTS = [
  'a troll', 'a young dragon', 'a vampire and their thralls', 'a necromancer raising the local dead',
  'a yuan-ti slaver operation', 'a giant causing problems', 'a hag coven',
];

export const rollAntagonist = (level) =>
  pick(level >= 5 ? [...LOW_ANTAGONISTS, ...HIGHER_ANTAGONISTS] : LOW_ANTAGONISTS);

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

// ── Encounter tables ───────────────────────────────────────────────────────────
// Hostile entries carry real Monster Manual CRs. The app filters to CR <= player
// level (min 1) before rolling — a random ambush is at worst a hard fight, never
// an apex the player didn't choose. Low-CR entries never leave the pool: a level
// 12 character can absolutely still run into goblins.
const HOSTILE = [
  // CR 1/8
  { cr: 0.125, label: '1/8', desc: 'kobold skirmishers harass from range, trying to drive the player toward a snare' },
  { cr: 0.125, label: '1/8', desc: 'a handful of bandits block the way and demand a toll, weapons drawn' },
  { cr: 0.125, label: '1/8', desc: 'a swarm of stirges descends at dusk' },
  { cr: 0.125, label: '1/8', desc: 'giant rats boil out of a culvert or cellar, starving and fearless' },
  { cr: 0.125, label: '1/8', desc: 'twig blights detach from the brush where something foul took root' },
  // CR 1/4
  { cr: 0.25, label: '1/4', desc: 'a band of goblins springs an ambush from cover' },
  { cr: 0.25, label: '1/4', desc: 'a pack of wolves has been trailing the player and now closes in' },
  { cr: 0.25, label: '1/4', desc: 'skeletons claw free of old battlefield soil as the player passes' },
  { cr: 0.25, label: '1/4', desc: 'several zombies shamble out of the treeline, drawn by sound' },
  { cr: 0.25, label: '1/4', desc: 'a wild boar charges out of the undergrowth, furious and territorial' },
  // CR 1/2
  { cr: 0.5, label: '1/2', desc: 'gnoll raiders on the hunt, whooping as they spot fresh prey' },
  { cr: 0.5, label: '1/2', desc: 'hobgoblin soldiers at a makeshift checkpoint turn hostile when refused' },
  { cr: 0.5, label: '1/2', desc: 'an orc raiding party emerges ahead, already spreading out to flank' },
  { cr: 0.5, label: '1/2', desc: 'poachers decide the player has seen too much' },
  { cr: 0.5, label: '1/2', desc: 'worgs — too smart to be wolves — circle with unsettling coordination' },
  // CR 1
  { cr: 1, label: '1', desc: 'a bugbear and its goblin lackeys have strung a tripwire across the way' },
  { cr: 1, label: '1', desc: 'a ghoul pack erupts from shallow graves beside the road' },
  { cr: 1, label: '1', desc: 'a giant spider drops from above — webs already strung across the path' },
  { cr: 1, label: '1', desc: 'a dire wolf, larger than a pony, stalks out of the mist' },
  { cr: 1, label: '1', desc: 'harpies on the cliffs above begin their song' },
  { cr: 1, label: '1', desc: 'a specter rises where someone died badly and was never buried' },
  // CR 2
  { cr: 2, label: '2', desc: 'a pair of ogres arguing over a carcass notice the player' },
  { cr: 2, label: '2', desc: 'a bandit captain and their crew have claimed this stretch of road' },
  { cr: 2, label: '2', desc: 'an ankheg bursts from the earth in a spray of soil and acid' },
  { cr: 2, label: '2', desc: 'berserkers from a raiding band, blood-drunk and looking for a fight' },
  { cr: 2, label: '2', desc: 'a griffon dives — it has decided the player\'s mount or pack animal is lunch' },
  { cr: 2, label: '2', desc: 'a will-o\'-wisp drifts at the edge of sight, luring toward the mire' },
  // CR 3
  { cr: 3, label: '3', desc: 'an owlbear crashes out of the brush, territorial and enraged' },
  { cr: 3, label: '3', desc: 'a wight in ancient war-gear walks the road it died defending' },
  { cr: 3, label: '3', desc: 'a veteran sellsword with a grudge and a contract steps into the road' },
  { cr: 3, label: '3', desc: 'a manticore wheels overhead and looses a volley of tail spikes' },
  { cr: 3, label: '3', desc: 'a displacer beast hunts the player — its image never quite where it is' },
  { cr: 3, label: '3', desc: 'a werewolf, half-changed and past caring who sees' },
  { cr: 3, label: '3', desc: 'a minotaur claims this crossing and accepts no toll but blood' },
  // CR 4-5
  { cr: 4, label: '4', desc: 'an ettin lumbers into view, both heads arguing about how to cook the player' },
  { cr: 4, label: '4', desc: 'a banshee\'s wail rolls across the land as something pale rises ahead' },
  { cr: 5, label: '5', desc: 'a troll lopes out of the rocks, already healing from its last fight' },
  { cr: 5, label: '5', desc: 'a hill giant tears up a tree to use as a club' },
  { cr: 5, label: '5', desc: 'the ground shudders — a bulette breaches like a shark through soil' },
  { cr: 5, label: '5', desc: 'a wraith pours out of a barrow mouth, trailing cold' },
  { cr: 5, label: '5', desc: 'vampire spawn caught out near dusk, hungry and far from their master' },
  // CR 6-8
  { cr: 6, label: '6', desc: 'a chimera descends, three sets of jaws and no patience' },
  { cr: 6, label: '6', desc: 'a wyvern strikes from a high ledge, stinger first' },
  { cr: 6, label: '6', desc: 'a cyclops hurls a boulder as an opening argument' },
  { cr: 7, label: '7', desc: 'a stone giant mistakes the player for the vandals who defaced its carvings' },
  { cr: 8, label: '8', desc: 'a frost giant raiding alone, looking for plunder and a story worth telling' },
  { cr: 8, label: '8', desc: 'a professional assassin has been paid — the first attack comes without warning' },
  // CR 9-10
  { cr: 9, label: '9', desc: 'a fire giant on the march, treating everything in its path as kindling' },
  { cr: 9, label: '9', desc: 'a young blue dragon strafes the road, toying before it commits' },
  { cr: 10, label: '10', desc: 'a young red dragon announces itself by setting the horizon alight' },
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
];
const WEIRD = [
  'a riderless horse, saddled and bloodied, trots down the road',
  'an abandoned camp — fire still warm, meal half-eaten',
  'a faerie ring of mushrooms, with fresh boot prints inside it',
  'a dead messenger bird with an unopened letter on its leg',
  'an overturned wagon, cargo untouched, the team simply gone',
  "a child's toy hanging from a branch, far from any village",
  'an empty gibbet creaking at the crossroads — the chains cut, not broken',
  'strange lights moving across a field at dusk',
  'a fresh grave beside the road with no marker and a shovel still planted in it',
  'every bird in the area goes silent at the same moment',
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

const TABLES     = { social: SOCIAL,     weird: WEIRD };
const ARC_TABLES = { hostile: ARC_HOSTILE, social: ARC_SOCIAL, weird: ARC_WEIRD };

// ── Roll an encounter directive ────────────────────────────────────────────────
// Mix: 60% hostile / 25% social / 15% weird. 1-in-3 ties to the active arc.
// Hostile rolls only from entries with CR <= player level (min 1).
export const rollEncounterDirective = (char) => {
  const r = Math.random();
  const type = r < 0.60 ? 'hostile' : r < 0.85 ? 'social' : 'weird';
  const arcTied = !!char?.arc?.antagonist && Math.random() < (1 / 3);
  const level = Math.max(1, char?.level || 1);

  let desc, crNote = '';
  if (arcTied) {
    desc = pick(ARC_TABLES[type])(char.arc.antagonist);
  } else if (type === 'hostile') {
    const pool = HOSTILE.filter(e => e.cr <= level);
    const entry = pick(pool);
    desc = entry.desc;
    crNote = `This is a CR ${entry.label} threat — keep it at exactly that power, do not escalate it into something bigger. `;
  } else {
    desc = pick(TABLES[type]);
  }

  const directive =
    `\n\n[ENCOUNTER — MANDATORY: This turn, the following occurs: ${desc}. ` +
    `Weave it in at a natural moment of THIS response — do not defer it, do not summarize past it, do not resolve it without the player. ` +
    crNote +
    (arcTied ? `This connects to the active arc antagonist — let that show without naming them outright. Scale any threat to the player's level. ` : '') +
    `End with your usual 4 numbered choices.]`;
  return { type, arcTied, desc, directive };
};
