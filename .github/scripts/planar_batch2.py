from pathlib import Path
p=Path('src/constants/encounters.js'); s=p.read_text(encoding='utf-8')
def rep(old,new,label):
 global s
 n=s.count(old)
 if n!=1: raise SystemExit(f'{label}: expected 1, found {n}')
 s=s.replace(old,new,1)
def before(marker,add,label):
 global s
 n=s.count(marker)
 if n!=1: raise SystemExit(f'{label}: expected 1, found {n}')
 s=s.replace(marker,add+marker,1)
rep("  { id: 'water',      label: '🌊 Plane of Water' },\n];","  { id: 'water',      label: '🌊 Plane of Water' },\n  { id: 'air',        label: '🌬️ Plane of Air' },\n  { id: 'earth',      label: '⛰️ Plane of Earth' },\n  { id: 'limbo',      label: '🌀 Limbo' },\n];",'env')
h=r'''

  // ── PLANE OF AIR ──
  { cr: 0.125, label: '1/8', env: ['air'], desc: 'tiny air spirits knot the wind into cutting whips and swarm anything trying to hold a straight course' },
  { cr: 0.25, label: '1/4', env: ['air'], desc: 'dust mephits burst from a drifting cloudbank and try to blind the player before stealing anything loosely fastened' },
  { cr: 0.5, label: '1/2', env: ['air'], desc: 'a flock of razor-winged sky predators folds out of the clouds and attacks from every direction at once' },
  { cr: 1, label: '1', env: ['air'], desc: 'an aarakocra raider dives from a floating crag, convinced the player crossed into claimed hunting air' },
  { cr: 2, label: '2', env: ['air'], desc: 'a living whirlwind forms around loose stone and debris, battering anything that tries to pass through it' },
  { cr: 3, label: '3', env: ['air'], desc: 'an air elemental peels itself out of a storm front and charges like a transparent avalanche' },
  { cr: 4, label: '4', env: ['air'], desc: 'a djinni noble’s corsairs descend from a cloud skiff and attempt to seize the player’s route charts by force' },
  { cr: 5, label: '5', env: ['air'], desc: 'an invisible stalker begins hunting the player through open sky, betrayed only by sudden pressure changes and displaced cloud' },
  { cr: 6, label: '6', env: ['air'], desc: 'a wyvern adapted to endless sky drops from above a floating island and attacks with terrifying speed' },
  { cr: 8, label: '8', env: ['air'], desc: 'a storm-bound giant champion leaps between cloud islands and decides the player is responsible for a stolen relic' },
  { cr: 10, label: '10', env: ['air'], desc: 'a djinni war-captain arrives aboard a crescent-shaped cloud vessel with elite wind-riders closing from both flanks' },
  { cr: 12, label: '12', env: ['air'], desc: 'a sentient supercell condenses into a colossal elemental predator whose lightning outlines a face inside the storm' },
  // ── PLANE OF EARTH ──
  { cr: 0.125, label: '1/8', env: ['earth'], desc: 'crystalline burrowers erupt from a gemstone seam and attack anything carrying worked metal' },
  { cr: 0.25, label: '1/4', env: ['earth'], desc: 'mud and dust mephits spill from a freshly opened fault, pelting the player with grit and spite' },
  { cr: 0.5, label: '1/2', env: ['earth'], desc: 'a young xorn mistakes the player’s coins and jewelry for an unattended meal and becomes aggressive when stopped' },
  { cr: 1, label: '1', env: ['earth'], desc: 'stone-skinned tunnel hunters detach from the cavern wall and close around the player with perfect camouflage' },
  { cr: 2, label: '2', env: ['earth'], desc: 'gargoyles unfold from a carved passage and enforce a dao claim marker that was invisible until crossed' },
  { cr: 3, label: '3', env: ['earth'], desc: 'a territorial xorn rises through solid stone and demands every precious metal the player carries' },
  { cr: 4, label: '4', env: ['earth'], desc: 'an earth elemental tears itself free of the tunnel wall and advances with the inevitability of a cave-in' },
  { cr: 5, label: '5', env: ['earth'], desc: 'dao-employed stone guards emerge from the floor to collect an unauthorized-excavation penalty by force' },
  { cr: 6, label: '6', env: ['earth'], desc: 'a bulette-like planar predator swims through solid rock and erupts beneath the player in a storm of crystal shards' },
  { cr: 8, label: '8', env: ['earth'], desc: 'a stone giant geomancer blocks the tunnel and bends the surrounding cavern into a weapon' },
  { cr: 10, label: '10', env: ['earth'], desc: 'a dao noble’s armored excavation crew closes in with chains designed to bind creatures directly into stone' },
  { cr: 12, label: '12', env: ['earth'], desc: 'a mountain-sized crystalline horror shifts inside the surrounding rock, sending a fighting limb and faceted maw through the cavern wall' },
  // ── LIMBO ──
  { cr: 0.125, label: '1/8', env: ['limbo'], desc: 'a thought-made nuisance becomes real because somebody nearby briefly imagines it biting the player' },
  { cr: 0.25, label: '1/4', env: ['limbo'], desc: 'a clutch of chaos imps changes shape every few seconds while enthusiastically choosing violence' },
  { cr: 0.5, label: '1/2', env: ['limbo'], desc: 'a patch of hostile terrain grows teeth, legs, and a personal objection to being stepped on' },
  { cr: 1, label: '1', env: ['limbo'], desc: 'a red slaad juvenile barrels out of a newly formed wall and attacks the first stable creature it sees' },
  { cr: 2, label: '2', env: ['limbo'], desc: 'a chaos beast copies the player’s silhouette badly and lunges before its anatomy finishes deciding what it is' },
  { cr: 3, label: '3', env: ['limbo'], desc: 'a red slaad hunter bounds between fragments of temporary ground and attacks with delighted certainty' },
  { cr: 4, label: '4', env: ['limbo'], desc: 'a blue slaad enforcer decides the player is carrying something that should belong to chaos instead' },
  { cr: 5, label: '5', env: ['limbo'], desc: 'a rogue githzerai zerth shapes nearby matter into weapons while accusing the player of destabilizing a settlement' },
  { cr: 6, label: '6', env: ['limbo'], desc: 'a green slaad appears from behind a concept that was not there a moment ago and attacks while speaking in future tense' },
  { cr: 8, label: '8', env: ['limbo'], desc: 'a powerful chaos predator repeatedly rewrites its own resistances and body plan as it closes in' },
  { cr: 10, label: '10', env: ['limbo'], desc: 'a gray slaad spellcaster decides the player is the missing variable in an experiment and refuses consent as a meaningful concept' },
  { cr: 12, label: '12', env: ['limbo'], desc: 'a death-slaad warleader arrives with reality buckling around it, intent on turning the entire encounter into an infectious joke' },'''
before("\n];\n\nconst SOCIAL_BY_ENV = {",h,'hostile')
soc=r'''
  air: [
    "an aarakocra courier glides alongside carrying sealed messages between floating islands and offers current wind-route gossip",
    "a djinni merchant’s cloud barge opens a silk awning and invites the player aboard to browse goods too fragile for the Plane of Earth",
    "an air genasi cartographer sketches pressure currents instead of roads and happily trades maps with anyone who has traveled beyond this plane",
    "a pair of cloud giant scholars argue over whether a distant floating ruin is moving or the rest of the plane is moving around it",
    "an aarakocra rescue patrol asks whether the player has seen survivors from a shattered sky-vessel",
    "a djinni poet offers a favor for one genuinely new story because immortality has made novelty irritatingly expensive",
    "an air genasi mechanic repairs a wind-sled while swearing the vehicle only crashes when somebody mentions how reliable it is",
    "a floating market drifts past on linked cloud platforms where merchants tether themselves to stalls with jeweled cords",
    "an aarakocra pilgrim follows a wind said to have once touched Mount Celestia and asks the player to confirm its direction",
    "a storm giant messenger stands comfortably on a thunderhead and requests directions to a palace that has apparently moved again",
    "a djinni customs officer politely asks the player to declare heavy objects because local law considers falling cargo a public menace",
    "a crew of mortal sky-sailors offers food and repairs in exchange for help interpreting a wind that has begun whispering names",
  ],
  earth: [
    "a xorn trader politely offers gemstones for metal scraps and evaluates every buckle the player owns with unsettling hunger",
    "an earth genasi surveyor marks a safe route through stone that will close again in several hours",
    "a dao broker invites the player into a marble office carved instantly from the wall to discuss a contract with exceptionally tiny print",
    "a deep gnome prospecting crew celebrates finding a tunnel that leads somewhere rather than merely into more stone",
    "a dwarven planar miner offers rare ore samples and asks whether one impossible alloy has ever appeared on the Material Plane",
    "an elderly xorn gem-cutter claims crystals taste different depending on who owned them and offers a free appraisal",
    "an earth genasi caravan transports an entire prefabricated bridge through the rock and needs directions to a cavern that refuses to stay put",
    "a dao tax assessor insists conversation is not taxable, then pauses to check a much larger ledger",
    "a crystal cartographer maps vibrations through the plane and asks the player to stamp the map if they survived the route marked in red",
    "a stone giant sculptor is carving a statue from the surrounding mountain and asks an outsider what emotion the face should have",
    "a svirfneblin merchant sells bottled echoes from famous caverns and desperately wants a sound recorded under open sky",
    "a mixed mining camp invites the player to supper while everyone debates whether the enormous fossil they uncovered counts as a workplace hazard",
  ],
  limbo: [
    "a githzerai monk calmly maintains a small island of stone through concentration and offers shelter from the surrounding chaos",
    "a githzerai anarch reshapes a drifting mass into a comfortable tea room because discussing business while falling is apparently rude",
    "a friendly slaad wearing six different hats sells objects that do not consistently remain the objects purchased",
    "a planar refugee caravan travels inside a bubble of remembered hometown streets sustained by everyone thinking about home together",
    "a chaos-surfer rides a wave of temporarily solid color and offers lessons in exchange for something boring from a stable plane",
    "a githzerai scholar asks the player to describe a recent dream because dreams are unusually useful construction material here",
    "a blue slaad philosopher insists it has renounced violence and wants an impartial outsider to judge whether yelling counts as philosophy",
    "a tiny settlement assembled from mutually contradictory architecture invites the player to vote on what gravity should do today",
    "a githzerai courier carries a message physically sculpted from thought and asks the player not to imagine anything embarrassing near it",
    "a traveler whose species changes whenever nobody looks directly at them is lost but otherwise remarkably cheerful",
    "a group of artists deliberately creates short-lived landscapes from emotion and asks the player to contribute one memory to the exhibition",
    "a githzerai patrol warns that a nearby region has begun obeying metaphors literally and recommends choosing words very carefully",
  ],
'''
before("\n};\n\nconst WEIRD_BY_ENV = {",soc,'social')
w=r'''
  air: [
    "a waterfall pours from one floating island to another miles above it without any visible force pushing the water upward",
    "a thunderstorm forms a perfect doorway in its center and blue sky from somewhere else is visible through it",
    "a cloud becomes solid enough to walk on but every footprint drops through and falls away like rain",
    "gravity rotates ninety degrees across an invisible boundary and loose objects begin falling toward the horizon",
    "a flock of birds remains perfectly motionless in the air while the entire world of clouds moves past them",
    "lightning crawls slowly between clouds like glowing vines and flowers into silent branching patterns",
    "a transparent river of breathable air flows through denser atmosphere and carries tiny boats with sails underwater-style",
    "the wind repeats a conversation the player had days ago, including words nobody else should have heard",
    "a floating island casts a shadow upward onto the underside of a cloud far above it",
    "a region of absolute stillness hangs in the open sky, its boundary visible because every cloud stops dead at the edge",
    "an abandoned staircase spirals upward through empty air for miles and ends at a locked trapdoor attached to nothing",
    "a rainbow bends into a complete circle and something appears to be walking along its inner surface",
  ],
  earth: [
    "a gemstone vein displays moving memories of miners who have not arrived yet",
    "a stone door opens onto open sky despite being buried miles inside unbroken rock",
    "gravity flips inside one cavern so loose stones collect across the ceiling like gravel on a road",
    "a fossilized skeleton larger than a city passes through several geological layers without disturbing any of them",
    "an entire mountain shifts several feet with the slow sound of a creature turning in its sleep",
    "a vein of metal hums the names of anyone who touches it, including one name the player does not recognize as their own",
    "a perfectly round tunnel continues through every kind of stone without tool marks, rubble, or any sign it was dug",
    "crystals begin ringing one by one in sequence, producing a melody that makes nearby rock temporarily transparent",
    "a cavern contains a miniature night sky whose stars are embedded gemstones moving in real astronomical patterns",
    "a river of sand flows upward through solid stone and disappears into a ceiling crack narrower than a finger",
    "a statue carved from raw bedrock slowly changes pose whenever vibrations from footsteps stop",
    "a seam of ordinary soil contains fresh grass and worms despite having no connection to any surface for thousands of miles",
  ],
  limbo: [
    "the landscape becomes whatever the player casually compares it to for several uncomfortable seconds",
    "gravity changes direction every time somebody says a proper name",
    "spoken adjectives briefly become physical objects and fall to the nearest available surface",
    "rain begins as water, becomes feathers halfway down, and lands as tiny glass bells",
    "a complete town exists ahead only while at least one person believes there should be a town there",
    "the weather responds to emotion so literally that irritation produces localized hail around whoever is annoyed",
    "three versions of the same road branch apart, each containing the footprints the player would leave if they chose it",
    "a red door appears in open chaos with a sign reading DO NOT THINK ABOUT WHAT IS BEHIND THIS",
    "the player’s reflection walks out of a temporary mirror and spends several seconds looking relieved to be somewhere else",
    "a boulder remembers being a bird and suddenly flies away, leaving confused smaller stones attempting to follow",
    "a sentence written in midair repeatedly rearranges itself until someone reads it aloud, at which point the letters flee",
    "a stable island of ordinary grass and blue sky drifts past, but stepping onto it causes the surrounding chaos to become stable instead",
  ],
'''
before("\n};\n\n// Arc-tied variants",w,'weird')
rep("const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water']);","const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water', 'air', 'earth', 'limbo']);",'native set')
for x in ["id: 'air'","id: 'earth'","id: 'limbo'","env: ['air']","env: ['earth']","env: ['limbo']"]:
 if x not in s: raise SystemExit('missing '+x)
p.write_text(s,encoding='utf-8')
