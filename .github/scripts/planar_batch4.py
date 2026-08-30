from pathlib import Path
p=Path('src/constants/encounters.js'); s=p.read_text(encoding='utf-8')
def rep(a,b,l):
 global s
 n=s.count(a)
 if n!=1: raise SystemExit(f'{l}: {n}')
 s=s.replace(a,b,1)
def before(m,a,l):
 global s
 n=s.count(m)
 if n!=1: raise SystemExit(f'{l}: {n}')
 s=s.replace(m,a+m,1)
rep("  { id: 'hells',      label: '😈 Nine Hells' },\n];","  { id: 'hells',      label: '😈 Nine Hells' },\n  { id: 'abyss',      label: '🩸 Abyss' },\n  { id: 'hades',      label: '🌫️ Gray Waste of Hades' },\n  { id: 'gehenna',    label: '🌋 Gehenna' },\n];",'env')
h=r'''

  // ── ABYSS ──
  { cr: 0.125, label: '1/8', env: ['abyss'], desc: 'a swarm of abyssal vermin with too many mouths pours from a crack that closes behind them' },
  { cr: 0.25, label: '1/4', env: ['abyss'], desc: 'dretches claw their way from a heap of living mud and charge anything cleaner than they are' },
  { cr: 0.5, label: '1/2', env: ['abyss'], desc: 'a malformed lesser demon hunts by scent through terrain that pulses like muscle' },
  { cr: 1, label: '1', env: ['abyss'], desc: 'a maw demon barrels downhill with several smaller horrors fleeing ahead of it' },
  { cr: 2, label: '2', env: ['abyss'], desc: 'quasits lead a pack of abyssal scavengers into an ambush that becomes chaotic almost immediately' },
  { cr: 3, label: '3', env: ['abyss'], desc: 'a shadow demon rises from a crack in the landscape and attacks from angles the local light should not permit' },
  { cr: 4, label: '4', env: ['abyss'], desc: 'a babau stalker steps from a curtain of black rain with a blade already wet with something corrosive' },
  { cr: 5, label: '5', env: ['abyss'], desc: 'a barlgura crashes through unstable terrain, hurling pieces of the plane itself as improvised weapons' },
  { cr: 6, label: '6', env: ['abyss'], desc: 'a chasme descends through a cloud of screaming insects and the air begins vibrating around its wings' },
  { cr: 8, label: '8', env: ['abyss'], desc: 'a hezrou war-leader and lesser demons emerge from a river of filth to claim the player as tribute' },
  { cr: 10, label: '10', env: ['abyss'], desc: 'a glabrezu offers exactly one chance to make a terrible bargain before all four arms move to violence' },
  { cr: 12, label: '12', env: ['abyss'], desc: 'a marilith commander arrives through a wound in reality with enough blades to make negotiation visibly optional' },
  // ── GRAY WASTE OF HADES ──
  { cr: 0.125, label: '1/8', env: ['hades'], desc: 'gray scavengers crawl from a battlefield trench and attack without hunger, anger, or any visible emotion at all' },
  { cr: 0.25, label: '1/4', env: ['hades'], desc: 'a pack of larval souls drags itself from the mud and reaches mechanically toward the nearest living warmth' },
  { cr: 0.5, label: '1/2', env: ['hades'], desc: 'a colorless predator follows the player’s emotional trail rather than their scent' },
  { cr: 1, label: '1', env: ['hades'], desc: 'a pair of yugoloth auxiliaries tries to seize the player for an employer neither can be bothered to name' },
  { cr: 2, label: '2', env: ['hades'], desc: 'a mezzoloth patrol blocks a road of ash and demands payment for a war whose sides have both forgotten this battlefield' },
  { cr: 3, label: '3', env: ['hades'], desc: 'a sorrow-wraith rises from abandoned armor and attacks whoever still seems capable of caring about survival' },
  { cr: 4, label: '4', env: ['hades'], desc: 'a night hag’s collectors attempt to drag a marked soul away and decide the player counts as interfering property' },
  { cr: 5, label: '5', env: ['hades'], desc: 'a nycaloth mercenary lands in the mud and presents a bounty contract before deciding paperwork is no longer necessary' },
  { cr: 6, label: '6', env: ['hades'], desc: 'a pack of emotion-starved fiends circles the player as colors begin fading from their equipment' },
  { cr: 8, label: '8', env: ['hades'], desc: 'an elite yugoloth retrieval team emerges from gray fog looking for an asset whose description matches the player disturbingly well' },
  { cr: 10, label: '10', env: ['hades'], desc: 'an arcanaloth war-broker attacks after concluding the player’s continued independence is bad for several contracts' },
  { cr: 12, label: '12', env: ['hades'], desc: 'an ultroloth commander arrives without visible urgency, and every mercenary nearby immediately obeys it' },
  // ── GEHENNA ──
  { cr: 0.125, label: '1/8', env: ['gehenna'], desc: 'razor-hoofed scavengers scramble across the impossible slope and attack to steal anything that can be sold' },
  { cr: 0.25, label: '1/4', env: ['gehenna'], desc: 'a gang of minor yugoloth camp-followers tries to rob the player while everyone struggles for footing' },
  { cr: 0.5, label: '1/2', env: ['gehenna'], desc: 'a volcanic parasite bursts from cooling rock and skitters sideways across the steep ground' },
  { cr: 1, label: '1', env: ['gehenna'], desc: 'armed petitioners turned brigands roll burning debris downhill before charging behind it' },
  { cr: 2, label: '2', env: ['gehenna'], desc: 'mezzoloth mercenaries demand a transit fee on a slope where stopping is almost as dangerous as fighting' },
  { cr: 3, label: '3', env: ['gehenna'], desc: 'a barghest hunter stalks the player along a ridge of black volcanic glass' },
  { cr: 4, label: '4', env: ['gehenna'], desc: 'a yugoloth debt-collector arrives with a contract bought from someone the player has never met' },
  { cr: 5, label: '5', env: ['gehenna'], desc: 'a nycaloth dives from above the slope using gravity like a weapon and attempts to knock the player into the fire below' },
  { cr: 6, label: '6', env: ['gehenna'], desc: 'a volcanic fiend emerges from a vent just as the ground begins sliding toward a lake of magma' },
  { cr: 8, label: '8', env: ['gehenna'], desc: 'a mercenary company’s advance squad blocks the only stable ledge and offers surrender terms nobody sane would accept' },
  { cr: 10, label: '10', env: ['gehenna'], desc: 'an arcanaloth fixer’s bodyguards close in after the player accidentally witnesses a transaction meant to remain deniable' },
  { cr: 12, label: '12', env: ['gehenna'], desc: 'an ultroloth warlord rides a floating iron platform across the slope and orders the player removed from a strategically valuable path' },'''
before("\n];\n\nconst SOCIAL_BY_ENV = {",h,'hostile')
soc=r'''
  abyss: [
    "a terrified planar explorer shelters inside a circle of salt and asks whether the player knows which layer this currently is",
    "a surprisingly articulate quasit offers directions in exchange for being taken literally anywhere else",
    "a demon deserter from an endless internal war wants passage and possesses useful information about a nearby portal",
    "a tiefling scavenger operates a tiny mobile shop built on the back of something that refuses to stop moving",
    "a mortal cultist who clearly regrets every life choice asks for help reaching the portal their companions used without them",
    "a yugoloth observer under strict neutrality offers current battlefield intelligence for coin and emphasizes they are not technically involved",
    "a captured celestial has escaped its restraints but cannot leave the layer and offers knowledge in exchange for a route out",
    "a bizarre demon that claims to have discovered pacifism asks the player to explain whether constantly threatening people invalidates the philosophy",
    "a planar cartographer maps layers by taste, smell, and how loudly the ground screams and offers a copy of the least terrible route",
    "a wandering witch trades charms designed for specific Abyssal hazards and refuses to explain how long she has lived here",
    "a group of exhausted adventurers has fortified a ruined shrine and invites the player to share information before everyone makes separate bad decisions",
    "a demon merchant offers perfectly ordinary supplies at reasonable prices, which is immediately the most suspicious thing the player has seen",
  ],
  hades: [
    "a yugoloth mercenary on break offers battlefield directions with the exhausted professionalism of someone giving bus routes",
    "a color-faded pilgrim asks the player to describe something beautiful so they can remember why they are still traveling",
    "a night hag soul-broker offers tea and insists browsing the merchandise does not constitute agreement to anything",
    "a mortal healer tends casualties from several unrelated wars and asks for supplies rather than money",
    "a petitioner has forgotten their own name but carries a letter addressed to someone who might know it",
    "an arcanaloth clerk buys and sells military intelligence from a folding desk set up in the mud",
    "a gray-robed guide offers a route through terrain that drains motivation and warns that resting there is more dangerous than marching",
    "a deserter from a yugoloth company wants directions to a portal and is willing to trade the company’s current contracts",
    "a tiny camp keeps one brightly colored banner protected under glass because everyone nearby swears it helps them remember emotions",
    "a wandering musician plays aggressively cheerful songs to people who no longer react and asks the player whether the music still sounds happy",
    "a soul searching for a lost companion carries two cups everywhere and asks if the player has seen anyone matching a fading sketch",
    "a neutral ferryman crosses a black marsh and accepts stories of genuine joy as payment because coin has become boring here",
  ],
  gehenna: [
    "a yugoloth quartermaster sells climbing gear, mercenary rumors, and directions to whichever ledges are currently not collapsing",
    "a barghest trader offers safe passage information in exchange for food from a world with actual seasons",
    "a mortal caravan has anchored itself to the slope with chains and invites the player inside before the next rockfall",
    "an arcanaloth broker conducts business beneath a floating iron awning and offers to buy information about wars on other planes",
    "a tiefling guide demonstrates three different ways to sleep on a forty-degree slope without waking in lava",
    "a yugoloth recruiter makes an impressively professional employment pitch and accepts no as a complete answer, which feels deeply suspicious",
    "a volcanic prospector sells obsidian maps etched with routes to temporary safe plateaus",
    "a petitioner merchant runs a shop mounted on rails so the entire building can be winched uphill when the ground shifts",
    "a nycaloth courier lands nearby with the wrong sealed orders and asks whether the player knows another traveler with a similar name",
    "a mercenary medic treats anyone who can pay and offers free advice about which armies are currently shooting across the road",
    "a planar refugee has built a tiny garden on a stable ledge and proudly offers the player the only fresh vegetable for miles",
    "an old yugoloth veteran claims neutrality, sells stories of every major planar war, and is annoyingly good company",
  ],
'''
before("\n};\n\nconst WEIRD_BY_ENV = {",soc,'social')
w=r'''
  abyss: [
    "the ground opens an eye beneath the player, watches for several seconds, and closes without attacking",
    "a staircase made of teeth climbs into a red sky and each step whispers a different destination",
    "rain falls upward as black blood and disappears into clouds shaped like screaming faces",
    "a distant mountain turns around, revealing that what looked like its slope was the back of something enormous",
    "an iron door grows from living flesh and opens onto a peaceful meadow that may be the most dangerous thing visible",
    "the player’s shadow becomes horned for several minutes while the player remains unchanged",
    "a river changes from acid to insects to cold clean water in the span of a few hundred feet",
    "a ruined tower repeatedly rebuilds and collapses itself as though trapped in a furious memory",
    "a patch of empty air screams whenever anyone looks directly through it",
    "dozens of tiny moons orbit a dead tree whose roots vanish upward into the sky",
    "a road made of bone leads exactly where the player wants to go until someone acknowledges that fact aloud",
    "the horizon splits open briefly and reveals another Abyssal layer looking back through the wound",
  ],
  hades: [
    "every color on the player’s equipment fades to gray except one small object with personal meaning",
    "a battlefield stretches to the horizon but every corpse is wearing armor from a different century",
    "a campfire burns with no heat while producing the smell of the player’s favorite meal",
    "a road marker lists distances in regrets instead of miles and somehow the player understands the scale",
    "a gray flower blooms under a footprint and briefly regains color when touched",
    "distant laughter echoes across the Waste and everyone who hears it remembers a different person",
    "a river carries broken weapons but no water, flowing silently through a trench of ash",
    "an abandoned inn has warm beds, hot food, and a sign asking guests not to sleep longer than they intend to live",
    "the player’s reflection in a black puddle looks increasingly tired while the player feels unchanged",
    "a flock of pale birds flies overhead carrying small bright objects stolen from forgotten memories",
    "a patch of fog removes all sound except heartbeats and spoken names",
    "a single tree grows vivid autumn leaves in the gray waste while hundreds of petitioners sit around it simply watching",
  ],
  gehenna: [
    "the slope steepens whenever anyone complains about how steep it already is",
    "a river of lava flows uphill past the player carrying intact iron coins on its surface",
    "an avalanche stops in midair for several seconds, then resumes sideways",
    "a narrow ledge has thousands of names carved into it, each followed by a price rather than a date",
    "a floating fortress passes beneath the player because on this section of the plane down has changed sides",
    "black snow falls upward from volcanic glass and melts into sparks high above",
    "a chain anchored into the mountain disappears into the sky and jerks periodically as though towing something enormous",
    "a cave mouth opens only while nobody stands on level ground, which is conveniently almost always",
    "the echoes of footsteps arrive several seconds before the actual steps are taken",
    "an abandoned war camp remains perfectly horizontal despite being built on a near-vertical mountainside",
    "a distant volcano erupts coins, contracts, and weapons instead of lava before returning to normal",
    "a stone sign reads THIS WAY IS SAFER and rotates to point toward whichever route currently looks worst",
  ],
'''
before("\n};\n\n// Arc-tied variants",w,'weird')
rep("const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water', 'air', 'earth', 'limbo', 'mechanus', 'sigil', 'hells']);","const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water', 'air', 'earth', 'limbo', 'mechanus', 'sigil', 'hells', 'abyss', 'hades', 'gehenna']);",'native')
for x in ["id: 'abyss'","id: 'hades'","id: 'gehenna'","env: ['abyss']","env: ['hades']","env: ['gehenna']"]:
 if x not in s: raise SystemExit('missing '+x)
p.write_text(s,encoding='utf-8')