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
rep("  { id: 'ysgard',      label: '⚔️ Ysgard' },\n];","  { id: 'ysgard',      label: '⚔️ Ysgard' },\n  { id: 'celestia',    label: '✨ Mount Celestia' },\n  { id: 'elysium',     label: '🌿 Elysium' },\n  { id: 'ethereal',    label: '👻 Ethereal Plane' },\n];",'env')
h=r'''

  // ── MOUNT CELESTIA ──
  { cr: 0.125, label: '1/8', env: ['celestia'], desc: 'tiny radiant guardians swarm around the player after interpreting an accidental trespass as deliberate disrespect' },
  { cr: 0.25, label: '1/4', env: ['celestia'], desc: 'zealous lantern-spirits attempt to drive the player from a sacred path they did not know they had entered' },
  { cr: 0.5, label: '1/2', env: ['celestia'], desc: 'a celestial hound bars the ascent and tests the player’s resolve with teeth as real as its moral certainty' },
  { cr: 1, label: '1', env: ['celestia'], desc: 'an overzealous guardian challenges the player after detecting a forbidden object among otherwise harmless possessions' },
  { cr: 2, label: '2', env: ['celestia'], desc: 'a radiant lion-like sentinel attacks when the player unknowingly crosses the boundary of a vow-bound sanctuary' },
  { cr: 3, label: '3', env: ['celestia'], desc: 'an aasimar knight undergoing a trial mistakes the player for the obstacle they were told would appear' },
  { cr: 4, label: '4', env: ['celestia'], desc: 'a celestial warden attempts to disarm and detain the player under an interpretation of justice that allows no exceptions' },
  { cr: 5, label: '5', env: ['celestia'], desc: 'a couatl guardian coils from a beam of golden light and attacks only after repeated warnings somehow fail to resolve the misunderstanding' },
  { cr: 6, label: '6', env: ['celestia'], desc: 'an uncompromising angelic adjudicator declares the player’s current course harmful and physically blocks the road upward' },
  { cr: 8, label: '8', env: ['celestia'], desc: 'an elite celestial host conducts a lawful seizure of a dangerous artifact the player has no intention of surrendering' },
  { cr: 10, label: '10', env: ['celestia'], desc: 'a radiant champion descends from a higher terrace and demands a trial by combat before allowing further ascent' },
  { cr: 12, label: '12', env: ['celestia'], desc: 'a mighty celestial enforcer arrives to impose a dangerously literal command whose moral logic leaves no room for mortal nuance' },
  // ── ELYSIUM ──
  { cr: 0.125, label: '1/8', env: ['elysium'], desc: 'protective nature spirits nip and shove the player away from a nesting place with escalating determination' },
  { cr: 0.25, label: '1/4', env: ['elysium'], desc: 'a flock of luminous territorial birds dive-bombs anyone disturbing an otherwise impossibly peaceful grove' },
  { cr: 0.5, label: '1/2', env: ['elysium'], desc: 'a guardian beast mistakes the player’s hurried movement for pursuit of something under its protection' },
  { cr: 1, label: '1', env: ['elysium'], desc: 'a powerful river-spirit blocks passage and turns suddenly hostile when the player cannot answer a question about their intentions' },
  { cr: 2, label: '2', env: ['elysium'], desc: 'a celestial stag with silver antlers charges after the player crosses a hidden sanctuary boundary' },
  { cr: 3, label: '3', env: ['elysium'], desc: 'a pack of luminous hounds tests whether the player is predator, traveler, or threat by forcing the issue physically' },
  { cr: 4, label: '4', env: ['elysium'], desc: 'a guardian dryad animates the surrounding forest after sensing violence clinging to an object the player carries' },
  { cr: 5, label: '5', env: ['elysium'], desc: 'a powerful celestial beast defends a wounded creature the player has not yet even seen' },
  { cr: 6, label: '6', env: ['elysium'], desc: 'an idealistic celestial protector attempts to stop the player from leaving with someone it believes is safer here' },
  { cr: 8, label: '8', env: ['elysium'], desc: 'a river guardian large enough to redirect the current rises to prevent passage toward a region under divine protection' },
  { cr: 10, label: '10', env: ['elysium'], desc: 'a legendary guardian of a hidden sanctuary decides the player’s need does not outweigh the place’s peace' },
  { cr: 12, label: '12', env: ['elysium'], desc: 'an ancient celestial protector awakens from the landscape and treats the player as the first genuine threat it has sensed in centuries' },
  // ── ETHEREAL PLANE ──
  { cr: 0.125, label: '1/8', env: ['ethereal'], desc: 'tiny spectral scavengers cling to the player’s shadowed outline and begin chewing through carried objects from the ethereal side' },
  { cr: 0.25, label: '1/4', env: ['ethereal'], desc: 'a hungry ghost-like predator drifts through a solid wall and attacks before fully realizing the player can see it' },
  { cr: 0.5, label: '1/2', env: ['ethereal'], desc: 'phase-spiders hatch from a web anchored to objects on both the Ethereal and Material planes' },
  { cr: 1, label: '1', env: ['ethereal'], desc: 'an ethereal marauder stalks from behind a wall that is transparent here but solid on the Material Plane' },
  { cr: 2, label: '2', env: ['ethereal'], desc: 'a phase spider hunts the player through overlapping architecture, vanishing behind walls no normal creature could use as cover' },
  { cr: 3, label: '3', env: ['ethereal'], desc: 'a hostile ghost attacks from inside the faded reflection of a building where it died' },
  { cr: 4, label: '4', env: ['ethereal'], desc: 'an ethereal predator with a lamprey-like maw follows the player’s life force through the silver mist' },
  { cr: 5, label: '5', env: ['ethereal'], desc: 'a nightmare-riding hunter emerges from a curtain of vapor and attacks before retreating through solid matter' },
  { cr: 6, label: '6', env: ['ethereal'], desc: 'a pack of phase predators coordinates attacks from several overlapping versions of the same room' },
  { cr: 8, label: '8', env: ['ethereal'], desc: 'an ethereal marauder large enough to swallow a person stalks alongside the player unseen by the Material world inches away' },
  { cr: 10, label: '10', env: ['ethereal'], desc: 'a powerful spectral hunter has learned to manipulate the Border Ethereal itself, folding distance to remain beside its quarry' },
  { cr: 12, label: '12', env: ['ethereal'], desc: 'a colossal deep-ethereal predator emerges from the mist, its body visible only where it overlaps several realities at once' },'''
before("\n];\n\nconst SOCIAL_BY_ENV = {",h,'hostile')
soc=r'''
  celestia: [
    "a lantern archon-like guide offers directions upward and asks only that the player help the next lost traveler they meet",
    "an aasimar pilgrim rests beside a silver road and admits the climb is teaching them far less comfortable lessons than expected",
    "a celestial smith offers to repair a damaged weapon but asks what purpose the player intends it to serve afterward",
    "a couatl scholar shares tea and quietly collects stories of mortals who made good choices for terrible reasons",
    "a lawful celestial clerk helps travelers navigate sanctuary rules and has a surprisingly dry sense of humor about divine bureaucracy",
    "a mortal philosopher has spent years climbing and asks the player whether becoming better requires becoming less themselves",
    "a group of petitioners invites the player to share a meal where nobody is required to agree about anything except passing the bread",
    "an angelic messenger asks for mundane directions because omniscience is apparently not included in their job description",
    "a dwarf pilgrim heading toward a legendary celestial forge wants to compare notes about every impossible metal the player has encountered",
    "a radiant guardian politely warns that the route ahead will test honesty rather than strength and seems almost apologetic about it",
    "a celestial healer offers aid without condition and becomes interested in scars the player considers unimportant",
    "a traveler descending from a higher layer refuses to describe what they saw but offers one piece of advice tailored suspiciously well to the player",
  ],
  elysium: [
    "a river guide offers a quiet boat ride downstream and somehow knows exactly where every passenger most needs to stop",
    "a celestial gardener trades seeds from impossible plants and asks for something ordinary from the player’s home in return",
    "a petitioner family invites the player to supper without asking who they are, where they came from, or what they can pay",
    "a guardinal-like traveler asks for help moving an injured animal and treats the request as neither test nor obligation",
    "a mortal adventurer who intended to stay one night has been here for months and is genuinely uncertain whether leaving is still important",
    "a musician beside the river plays a melody the player recognizes despite being certain they have never heard it",
    "a celestial ranger offers directions to a hidden sanctuary and warns that finding it requires wanting something for somebody else",
    "a village baker hands the player warm bread for the road and refuses payment because there is already enough bread",
    "a luminous fox-like spirit follows the player until they acknowledge it, then leads them toward someone who needs help",
    "a scholar records acts of kindness that nobody else witnessed and asks whether anonymous deeds still belong in history",
    "a healer running a roadside shelter invites the player to rest and makes no attempt to persuade them to stay",
    "a traveler bound for another plane asks the player what makes a place worth returning to rather than what makes it paradise",
  ],
  ethereal: [
    "a ghost who has learned to navigate the Border Ethereal offers directions through the faded architecture of a nearby city",
    "an ethereal explorer marks safe currents in silver mist and eagerly trades notes about demiplanes",
    "a phase-spider researcher insists the enormous web nearby is harmless as long as nobody vibrates it in exactly the wrong rhythm",
    "a lost wizard has been walking beside their own house for hours but cannot find the point where they originally crossed planes",
    "a spectral courier carries messages through walls and asks whether the player knows a reliable portal back to the Material Plane",
    "a deep-ethereal navigator pilots a tiny vessel through curtains of color and offers passage to the edge of a known demiplane",
    "a ghostly merchant sells objects lost behind furniture, inside walls, and in other places that briefly touched the Ethereal",
    "a planar scholar watches Material inhabitants through a translucent wall and hastily explains that this is research, not haunting",
    "a wandering spirit asks the player to verify whether the building visible beside them still exists on the Material Plane",
    "an adventuring party traveling ethereally waves from inside what appears here as a faded mountain and offers to compare routes",
    "a strange ferryman follows a current in the Deep Ethereal and accepts memories of places as navigation rather than payment",
    "a translucent childlike spirit has lost a spectral pet that keeps phasing accidentally into adjacent rooms on the Material Plane",
  ],
'''
before("\n};\n\nconst WEIRD_BY_ENV = {",soc,'social')
w=r'''
  celestia: [
    "a stairway of light appears only when the player stops trying to find a route upward",
    "a clear mountain stream reflects the player as they might look after making one difficult but important choice",
    "a bell sounds once from far above and every lie spoken nearby for the next minute emerges as visible silver smoke",
    "a gate bears no lock but refuses to open while anyone nearby is pretending not to want something",
    "sunlight falls through the mountain in solid golden columns that can briefly support weight",
    "a stone inscription changes wording depending on whether the reader interprets a rule by its letter or its purpose",
    "a tiny roadside shrine contains offerings from civilizations that have not existed for thousands of years and one dated tomorrow",
    "the path forks into seven identical climbs and footprints appear on the route matching the traveler’s stated intention rather than their actual choice",
    "a waterfall flows upward toward a higher layer and carries fallen leaves without wetting them",
    "a radiant feather drifts down and becomes heavier the closer it gets to anyone carrying unresolved guilt",
    "a distant city appears impossibly close whenever someone performs a genuinely selfless act nearby",
    "the mountain casts no shadow until a cloud passes overhead, revealing shapes climbing where no visible path exists",
  ],
  elysium: [
    "a river briefly flows through the player’s memory of a childhood place before returning to its ordinary banks",
    "wildflowers bloom in the footsteps of anyone walking toward somebody they genuinely care about",
    "a rainstorm falls around a single traveler but every drop lands as warm sunlight on everyone else",
    "an empty cottage contains exactly enough beds, food, and supplies for whoever enters, plus one extra place setting",
    "a path becomes easier to walk whenever the traveler carries someone else’s burden and steeper when they carry only their own",
    "a flock of luminous birds forms an arrow toward the nearest person in immediate need rather than the nearest settlement",
    "a calm lake reflects places the viewer considers home, including some they have not yet visited",
    "a tree bears fruit labeled with names rather than varieties and each tastes like a meal shared with that person",
    "the river splits around a tiny island containing a closed door that opens only from the other side",
    "a field of grass produces the sounds of distant laughter with no visible source, and everyone hears different voices",
    "a bridge repairs its own missing boards immediately after somebody helps another traveler cross the gap",
    "the horizon briefly shows every road leading away from Elysium and none of them look quite as beautiful as the road back",
  ],
  ethereal: [
    "a Material Plane building passes slowly through the player as its unseen occupants continue their day inches away",
    "a curtain of silver mist opens onto a demiplane containing a single room, one chair, and a clock running backward",
    "the player sees their Material-plane shadow moving through a wall even though their body is entirely Ethereal",
    "a staircase exists only as a translucent impression of a staircase destroyed centuries ago",
    "a cluster of lost objects floats together exactly where a wall cavity exists on the overlapping Material Plane",
    "a distant color curtain briefly shows an impossible landscape before folding shut like fabric in wind",
    "a ghost walks through the player without noticing them, apparently haunting someone on an adjacent plane",
    "a silver fog current carries sounds from several different Material locations that should be miles apart",
    "a door in faded architecture opens onto the Deep Ethereal even though the corresponding Material door is bricked shut",
    "a spiderweb stretches through multiple solid buildings and trembles when anything phases anywhere along its enormous length",
    "the player’s reflection appears in every translucent Material window despite there being no reflective surface on the Ethereal side",
    "a drifting island of solid matter contains furniture arranged exactly like a room the player knows, but no walls and no explanation",
  ],
'''
before("\n};\n\n// Arc-tied variants",w,'weird')
rep("const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water', 'air', 'earth', 'limbo', 'mechanus', 'sigil', 'hells', 'abyss', 'hades', 'gehenna', 'carceri', 'arborea', 'ysgard']);","const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water', 'air', 'earth', 'limbo', 'mechanus', 'sigil', 'hells', 'abyss', 'hades', 'gehenna', 'carceri', 'arborea', 'ysgard', 'celestia', 'elysium', 'ethereal']);",'native')
for x in ["id: 'celestia'","id: 'elysium'","id: 'ethereal'","env: ['celestia']","env: ['elysium']","env: ['ethereal']"]:
 if x not in s: raise SystemExit('missing '+x)
p.write_text(s,encoding='utf-8')