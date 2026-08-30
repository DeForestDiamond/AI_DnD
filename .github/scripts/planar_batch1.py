from pathlib import Path

p = Path('src/constants/encounters.js')
s = p.read_text(encoding='utf-8')


def insert_before_once(marker, addition, label):
    global s
    n = s.count(marker)
    if n != 1:
        raise SystemExit(f'{label}: expected one marker, found {n}')
    s = s.replace(marker, addition + marker, 1)


def replace_once(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected one anchor, found {n}')
    s = s.replace(old, new, 1)

replace_once("  { id: 'astral',     label: '🌌 Astral Sea' },\n];", "  { id: 'astral',     label: '🌌 Astral Sea' },\n  { id: 'shadowfell', label: '🌑 Shadowfell' },\n  { id: 'fire',       label: '🔥 Plane of Fire' },\n  { id: 'water',      label: '🌊 Plane of Water' },\n];", 'environment list')

hostile = r'''

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
  { cr: 12, label: '12', env: ['water'], desc: 'a furious marid war-prince arrives inside a rotating palace of water, accusing the player of violating a law nobody mentioned' },'''
insert_before_once("\n];\n\nconst SOCIAL_BY_ENV = {", hostile, 'hostile insertion')

social = r'''
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
'''
insert_before_once("\n};\n\nconst WEIRD_BY_ENV = {", social, 'social insertion')

weird = r'''
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
'''
insert_before_once("\n};\n\n// Arc-tied variants", weird, 'weird insertion')

npc = r'''  shadowfell: ['shadar-kai', 'dusk elf', 'human', 'tiefling', 'kenku', 'ghost', 'ravenfolk'],
  fire: ['azer', 'fire genasi', 'efreeti', 'salamander', 'brass dragonborn', 'human', 'tiefling'],
  water: ['merfolk', 'water genasi', 'marid', 'triton', 'sea elf', 'human', 'dragonborn'],
'''
insert_before_once("};\nconst rollNpcDescriptor", npc, 'npc pools')
insert_before_once("// ── Roll an encounter directive", "const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water']);\n\n", 'native-only set')
replace_once("    // Filter to the player's current environment (+ the always-valid 'anywhere'\n    // pool of mundane trouble and restless undead), then to the CR ceiling.\n    const envHere = char?.environment || 'wilderness';\n    let pool = HOSTILE.filter(e => e.cr <= cap && (e.env?.includes(envHere) || e.env?.includes('anywhere')));\n    if (!pool.length) pool = HOSTILE.filter(e => e.cr <= cap); // safety net", "    // Native planar environments stay native; ordinary 'anywhere' trouble is only\n    // mixed into Material-style environments. Then apply the CR ceiling.\n    const envHere = char?.environment || 'wilderness';\n    let pool = HOSTILE.filter(e => e.cr <= cap && (e.env?.includes(envHere) || (!NATIVE_ONLY_ENVIRONMENTS.has(envHere) && e.env?.includes('anywhere'))));\n    if (!pool.length && !NATIVE_ONLY_ENVIRONMENTS.has(envHere)) pool = HOSTILE.filter(e => e.cr <= cap); // material safety net", 'hostile native filter')
replace_once("  if (type === 'social') {\n    const envHere = char?.environment || 'wilderness';\n    npcNote = `The person at the center of this encounter is a ${rollNpcDescriptor(envHere)} — use exactly that race and gender, and give them one fresh memorable detail (no scars, no travel leathers, no merchant's clothes). `;\n  }", "  if (type === 'social') {\n    const envHere = char?.environment || 'wilderness';\n    if (!NATIVE_ONLY_ENVIRONMENTS.has(envHere)) {\n      npcNote = `The person at the center of this encounter is a ${rollNpcDescriptor(envHere)} — use exactly that race and gender, and give them one fresh memorable detail (no scars, no travel leathers, no merchant's clothes). `;\n    }\n  }", 'planar social descriptor')

for needle in ["id: 'shadowfell'", "id: 'fire'", "id: 'water'", "env: ['shadowfell']", "env: ['fire']", "env: ['water']", "NATIVE_ONLY_ENVIRONMENTS"]:
    if needle not in s:
        raise SystemExit(f'missing expected content: {needle}')
p.write_text(s, encoding='utf-8')
