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
  calm:      { label: '🕊️ Pacing: Calm',      grace: 8, base: 0.10, perTurn: 0.08 },
  normal:    { label: '⚖️ Pacing: Normal',    grace: 4, base: 0.20, perTurn: 0.12 },
  dangerous: { label: '⚔️ Pacing: Dangerous', grace: 2, base: 0.30, perTurn: 0.18 },
};
export const PACING_ORDER = ['calm', 'normal', 'dangerous'];

export const encounterChance = (turnsSince, pacing) => {
  const p = PACING[pacing] || PACING.normal;
  if (turnsSince < p.grace) return 0;
  return Math.min(0.9, p.base + (turnsSince - p.grace) * p.perTurn);
};

// ── Encounter tables ───────────────────────────────────────────────────────────
// Concrete, Monster-Manual-grounded, zero invention burden on the DM.
const HOSTILE = [
  'a band of goblins (4-6 of them) springs an ambush from cover',
  'a pack of wolves has been trailing the player and now closes in',
  'a handful of bandits block the way and demand a toll, weapons drawn',
  'a pair of ogres arguing over a carcass notice the player',
  'kobold skirmishers harass from range, trying to drive the player toward a snare',
  'several zombies shamble out of the treeline, drawn by sound',
  'a giant spider drops from above — webs already strung across the path',
  'gnoll raiders on the hunt, whooping as they spot fresh prey',
  'hobgoblin soldiers at a makeshift checkpoint turn hostile when refused',
  'a swarm of stirges descends at dusk',
  'an owlbear crashes out of the brush, territorial and enraged',
  'a ghoul pack erupts from shallow graves beside the road',
  'an orc raiding party emerges ahead, already spreading out to flank',
  'a bugbear and its goblin lackeys have strung a tripwire across the way',
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

const TABLES     = { hostile: HOSTILE,     social: SOCIAL,     weird: WEIRD };
const ARC_TABLES = { hostile: ARC_HOSTILE, social: ARC_SOCIAL, weird: ARC_WEIRD };

// ── Roll an encounter directive ────────────────────────────────────────────────
// Mix: 60% hostile / 25% social / 15% weird. 1-in-3 ties to the active arc.
export const rollEncounterDirective = (char) => {
  const r = Math.random();
  const type = r < 0.60 ? 'hostile' : r < 0.85 ? 'social' : 'weird';
  const arcTied = !!char?.arc?.antagonist && Math.random() < (1 / 3);
  const desc = arcTied
    ? pick(ARC_TABLES[type])(char.arc.antagonist)
    : pick(TABLES[type]);
  const directive =
    `\n\n[ENCOUNTER — MANDATORY: This turn, the following occurs: ${desc}. ` +
    `Weave it in at a natural moment of THIS response — do not defer it, do not summarize past it, do not resolve it without the player. ` +
    (type === 'hostile' ? `Scale the threat to the player's level. ` : '') +
    (arcTied ? `This connects to the active arc antagonist — let that show without naming them outright. ` : '') +
    `End with your usual 4 numbered choices.]`;
  return { type, arcTied, desc, directive };
};
