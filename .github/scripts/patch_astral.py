from pathlib import Path

p = Path('src/constants/encounters.js')
s = p.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    s = s.replace(old, new, 1)


replace_once(
    "  { id: 'feywild',    label: '🍄 Feywild' },\n];",
    "  { id: 'feywild',    label: '🍄 Feywild' },\n  { id: 'astral',     label: '🌌 Astral Sea' },\n];",
    'environment list',
)

hostile = r'''

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
  { cr: 12, label: '12', env: ['astral'], desc: 'an arcanaloth aboard a black-hulled planar cutter decides the player possesses something more valuable than continued neutrality' },'''
replace_once(
    "  { cr: 11, label: '11', env: ['feywild'], desc: 'an archfey\\'s bored attention settles on the player like a spotlight, and reality bends to make the encounter more entertaining for a watcher who cannot be fought directly' },\n];",
    "  { cr: 11, label: '11', env: ['feywild'], desc: 'an archfey\\'s bored attention settles on the player like a spotlight, and reality bends to make the encounter more entertaining for a watcher who cannot be fought directly' }," + hostile + "\n];",
    'hostile table',
)

social = r'''
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
  ],'''
replace_once(
    "    \"the forest ahead is nighttime while the forest behind remains in full daylight, divided by a perfectly straight line\",\n  ],\n};\n\nconst WEIRD_BY_ENV",
    "    \"the forest ahead is nighttime while the forest behind remains in full daylight, divided by a perfectly straight line\",\n  ],\n" + social + "\n};\n\nconst WEIRD_BY_ENV",
    'social table',
)

weird = r'''
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
  ],'''
replace_once(
    "    \"the forest ahead is nighttime while the forest behind remains in full daylight, divided by a perfectly straight line\",\n  ],\n};\n\n// Arc-tied variants",
    "    \"the forest ahead is nighttime while the forest behind remains in full daylight, divided by a perfectly straight line\",\n  ],\n" + weird + "\n};\n\n// Arc-tied variants",
    'weird table',
)

old_npc = '''const rollNpcDescriptor = () =>\n  `${Math.random() < 0.5 ? 'male' : 'female'} ${pick(NPC_RACES)}`;'''
new_npc = '''const NPC_RACES_BY_ENV = {\n  astral: [\n    'astral elf', 'astral elf', 'githyanki', 'githzerai', 'giff', 'plasmoid',\n    'autognome', 'thri-kreen', 'hadozee', 'human', 'elf', 'dwarf', 'tiefling',\n    'dragonborn', 'aasimar', 'genasi',\n  ],\n};\nconst rollNpcDescriptor = (environment = 'wilderness') => {\n  const races = NPC_RACES_BY_ENV[environment] || NPC_RACES;\n  return `${Math.random() < 0.5 ? 'male' : 'female'} ${pick(races)}`;\n};'''
replace_once(old_npc, new_npc, 'NPC descriptor')

old_note = '''  if (type === 'social') {\n    npcNote = `The person at the center of this encounter is a ${rollNpcDescriptor()} — use exactly that race and gender, and give them one fresh memorable detail (no scars, no travel leathers, no merchant's clothes). `;\n  }'''
new_note = '''  if (type === 'social') {\n    const envHere = char?.environment || 'wilderness';\n    npcNote = `The person at the center of this encounter is a ${rollNpcDescriptor(envHere)} — use exactly that race and gender, and give them one fresh memorable detail (no scars, no travel leathers, no merchant's clothes). `;\n  }'''
replace_once(old_note, new_note, 'social NPC note')

p.write_text(s, encoding='utf-8')

required = [
    "{ id: 'astral',     label: '🌌 Astral Sea' }",
    "env: ['astral']",
    'const NPC_RACES_BY_ENV',
    'an immense astral dreadnought passes far below the route',
    'a Rock of Bral dockhand on a courier skiff',
]
for needle in required:
    if needle not in s:
        raise SystemExit(f'missing required Astral content: {needle}')
