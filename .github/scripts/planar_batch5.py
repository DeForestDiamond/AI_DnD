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
rep("  { id: 'gehenna',    label: '🌋 Gehenna' },\n];","  { id: 'gehenna',    label: '🌋 Gehenna' },\n  { id: 'carceri',     label: '⛓️ Carceri' },\n  { id: 'arborea',     label: '🌺 Arborea' },\n  { id: 'ysgard',      label: '⚔️ Ysgard' },\n];",'env')
h=r'''

  // ── CARCERI ──
  { cr: 0.125, label: '1/8', env: ['carceri'], desc: 'prison vermin crawl from a cracked red boulder and attack anything carrying keys, chains, or metal tools' },
  { cr: 0.25, label: '1/4', env: ['carceri'], desc: 'desperate petitioners ambush the player for supplies, convinced every stranger must be someone else’s jailer' },
  { cr: 0.5, label: '1/2', env: ['carceri'], desc: 'a gaunt planar scavenger stalks the player across the curve of the prison-sphere, using the horizon as cover' },
  { cr: 1, label: '1', env: ['carceri'], desc: 'a gang of escaped prisoners attacks to steal anything that might function as a portal key' },
  { cr: 2, label: '2', env: ['carceri'], desc: 'a gehreleth jailer’s lesser servants emerge from iron ruins and demand the player return to a cell they have never seen' },
  { cr: 3, label: '3', env: ['carceri'], desc: 'a monstrous prison hound tracks the player by the sound of spoken promises' },
  { cr: 4, label: '4', env: ['carceri'], desc: 'a gehreleth hunter drops from an inverted fortress and attempts to bind the player in chains that tighten when resisted' },
  { cr: 5, label: '5', env: ['carceri'], desc: 'a powerful exile who has ruled one prison valley for centuries decides the player is a threat to their tiny kingdom' },
  { cr: 6, label: '6', env: ['carceri'], desc: 'a demodand patrol closes from both sides of a bridge linking two impossible prison-spheres' },
  { cr: 8, label: '8', env: ['carceri'], desc: 'an elite jailer arrives with a list of escaped names and insists the player is using an alias' },
  { cr: 10, label: '10', env: ['carceri'], desc: 'an ancient prisoner turned warlord attacks after learning the player may possess a route off the plane' },
  { cr: 12, label: '12', env: ['carceri'], desc: 'a towering gehreleth warden tears open the prison landscape itself to prevent the player reaching a suspected exit' },
  // ── ARBOREA ──
  { cr: 0.125, label: '1/8', env: ['arborea'], desc: 'tiny ecstatic fey swarm around the player, their playful harassment abruptly becoming sharp-toothed violence' },
  { cr: 0.25, label: '1/4', env: ['arborea'], desc: 'territorial sprites and living blossoms attack after interpreting the player’s route as an insult to a sacred grove' },
  { cr: 0.5, label: '1/2', env: ['arborea'], desc: 'a satyr reveler overwhelmed by supernatural rage charges from a festival that continues dancing behind them' },
  { cr: 1, label: '1', env: ['arborea'], desc: 'a mythic hunting beast bursts from flower-heavy undergrowth with silver leaves tangled in its antlers' },
  { cr: 2, label: '2', env: ['arborea'], desc: 'an eladrin duelist challenges the player over an offense neither side remembers committing but both suddenly feel strongly about' },
  { cr: 3, label: '3', env: ['arborea'], desc: 'a centaur warband thunders across the hills after mistaking the player for raiders from a rival legendary valley' },
  { cr: 4, label: '4', env: ['arborea'], desc: 'a dryad champion animates an entire grove after the player accidentally crosses a boundary marked only by perfume' },
  { cr: 5, label: '5', env: ['arborea'], desc: 'a furious eladrin knight arrives in a burst of autumn leaves and demands satisfaction immediately' },
  { cr: 6, label: '6', env: ['arborea'], desc: 'a celestial lion-like guardian attacks after sensing an emotional stain left by someone else on the player’s trail' },
  { cr: 8, label: '8', env: ['arborea'], desc: 'a mythic hunt sweeps over the ridge and its radiant hounds decide the player has become the story’s quarry' },
  { cr: 10, label: '10', env: ['arborea'], desc: 'an eladrin lord’s champion challenges the player while the surrounding landscape reshapes itself into a dramatic arena' },
  { cr: 12, label: '12', env: ['arborea'], desc: 'a colossal beast from an ancient heroic tale emerges because someone nearby has started retelling the wrong ending' },
  // ── YSGARD ──
  { cr: 0.125, label: '1/8', env: ['ysgard'], desc: 'tiny battle-spirits leap from abandoned shields and attack with enormous enthusiasm and almost no strategy' },
  { cr: 0.25, label: '1/4', env: ['ysgard'], desc: 'young warrior petitioners challenge the player to a friendly fight and forget the friendly part halfway through' },
  { cr: 0.5, label: '1/2', env: ['ysgard'], desc: 'a pack of wolfish spirit-beasts races across a floating earthberg and hunts anything that runs' },
  { cr: 1, label: '1', env: ['ysgard'], desc: 'a berserker drops from a rope bridge onto the path and demands a duel worth remembering tomorrow' },
  { cr: 2, label: '2', env: ['ysgard'], desc: 'a band of einherjar mistakes the player for a rival hall’s champion and attacks with delighted apologies' },
  { cr: 3, label: '3', env: ['ysgard'], desc: 'a troll warrior emerges from a feast hall carrying an axe and a grievance that may have begun three deaths ago' },
  { cr: 4, label: '4', env: ['ysgard'], desc: 'a valkyrie-like chooser of the slain tests the player in combat after sensing an unusually stubborn fate' },
  { cr: 5, label: '5', env: ['ysgard'], desc: 'a frost giant raiding captain bounds between floating landmasses and challenges the strongest-looking target' },
  { cr: 6, label: '6', env: ['ysgard'], desc: 'a giant boar sacred to a warrior hall crashes through a battlefield and refuses to remain anyone’s ceremonial dinner' },
  { cr: 8, label: '8', env: ['ysgard'], desc: 'a renowned einherjar champion calls the player out before an entire mead hall and absolutely expects a fight' },
  { cr: 10, label: '10', env: ['ysgard'], desc: 'a storm giant hero arrives riding thunder and interprets the player’s reputation as a personal invitation' },
  { cr: 12, label: '12', env: ['ysgard'], desc: 'a legendary dragon from a saga circles a floating battlefield, apparently alive because enough warriors keep telling its story' },'''
before("\n];\n\nconst SOCIAL_BY_ENV = {",h,'hostile')
soc=r'''
  carceri: [
    "an escaped prisoner offers a hand-drawn map of three failed escape routes and one they have not dared try yet",
    "a weary petitioner trades food for news of any portal discovered within the last century",
    "a gehreleth functionary insists it is off duty and therefore willing to answer exactly one question without arresting anyone",
    "a former tyrant now living in a cave gives surprisingly thoughtful advice about which promises never to make on Carceri",
    "a chained caravan of free prisoners travels between settlements and invites the player along because nobody survives alone for long",
    "a planar smuggler sells tiny contraband comforts and claims to know which prison-sphere currently has the weakest boundaries",
    "a philosopher imprisoned for an argument nobody remembers asks the player whether freedom still counts if every destination is another prison",
    "a mortal adventurer has spent years cataloging false portals and gladly shares the list so someone else does not repeat the mistakes",
    "a petitioner blacksmith reforges broken chains into tools and refuses to make weapons for jailers",
    "an exile from another plane offers a valuable secret in exchange for the player promising to tell their family they are still alive",
    "a tiny settlement built inside a shattered fortress offers shelter but asks every guest to contribute one piece of escape knowledge",
    "a strange jailer quietly warns the player that a nearby route is intentionally left unguarded because what waits beyond it is worse",
  ],
  arborea: [
    "an eladrin poet invites the player to a feast that has lasted three days and insists the best stories are told before anyone remembers sleeping",
    "a centaur courier offers a ride across impossible green hills in exchange for news from the mortal world",
    "a dryad gardener trades fruit that tastes like specific emotions and asks which one the player misses most",
    "a satyr musician challenges the player to invent a song title first and promises to improvise the entire song from it",
    "an elven pilgrim headed toward a legendary grove asks whether the player believes places can remember being loved",
    "a celestial traveler sits beside a bright river and offers healing, conversation, and absolutely no sermon unless requested",
    "an eladrin noble’s messenger carries invitations to three simultaneous celebrations and asks which sounds least politically dangerous",
    "a group of heroic petitioners reenacts an ancient myth every year and urgently needs someone to play a villain who failed to show up",
    "a centaur vintner offers a drink from a vineyard that only appears during thunderstorms",
    "a dryad scholar records mortal stories before Arborea inevitably exaggerates them into legends",
    "a wandering elf artisan offers to craft one beautiful but completely impractical object from materials the player provides",
    "a reveling village invites the player to a dance whose steps trace the route to a hidden valley when seen from above",
  ],
  ysgard: [
    "an einherjar warrior invites the player to breakfast and casually mentions they killed each other yesterday",
    "a valkyrie-like scout asks whether the player has seen a particular warrior whose death is apparently overdue",
    "a dwarven smith offers repairs in exchange for a story about the most ridiculous weapon the player has ever seen",
    "a giant brewer rolls a cask across a floating bridge and offers a cup to anyone willing to help stop it before the next cliff",
    "a mortal visitor has discovered that dying here is less permanent than expected and is handling that realization with concerning enthusiasm",
    "a shieldmaiden courier asks directions to a battle that moves to a new valley every morning",
    "a skald offers to compose a verse about the player but insists embarrassing details improve historical accuracy",
    "a troll cook argues that regeneration makes taste-testing dangerous recipes perfectly sensible and asks for an outsider’s opinion",
    "a clan of petitioners invites the player to a feast celebrating a victory none of them can remember because they all died during it",
    "a wandering giant philosopher wants to discuss whether courage still counts when everyone expects to wake after dying",
    "a warrior merchant sells battered trophies from famous duels and can identify exactly which scars came from which weapon",
    "a longship crew sailing between floating landmasses offers passage if the player takes a rowing bench and does not complain about gravity",
  ],
'''
before("\n};\n\nconst WEIRD_BY_ENV = {",soc,'social')
w=r'''
  carceri: [
    "the horizon curves upward until another prison-sphere hangs overhead like a red moon covered in lights",
    "an open gate stands in a ruined wall but walking through it returns the traveler from the opposite direction",
    "a chain disappears into the ground and sky simultaneously, rattling whenever anyone thinks about leaving",
    "a door labeled FREEDOM opens onto a smaller locked room containing another identical door",
    "the player’s footprints appear several yards ahead as though the plane already knows where they will walk",
    "a black river flows around a boulder in the shape of prison bars despite having no banks",
    "a distant settlement rings bells whenever a portal fails somewhere else on the sphere",
    "an abandoned cell contains a window showing the player’s home but the glass cannot be broken or opened",
    "a narrow path crosses onto the underside of the same world without any sensation of turning upside down",
    "names scratched into a prison wall vanish one by one as their owners finally give up trying to escape",
    "a flock of birds reaches an invisible boundary in the sky and turns back in perfect silence",
    "a rusty key found lying openly on the road fits every lock nearby and opens none of them",
  ],
  arborea: [
    "a field of flowers changes color to match the strongest emotion of whoever walks through it",
    "a river sings harmony with nearby voices and becomes offended if nobody joins in",
    "a sunset lasts several hours because the landscape apparently considers this particular one too beautiful to end",
    "a tree grows a new carved name whenever someone beneath it falls genuinely in love",
    "a thunderstorm approaches in the shape of galloping horses and smells strongly of wine and pine",
    "a mountain in the distance appears closer whenever someone tells a heroic story and farther away after cynical remarks",
    "a ruined temple rebuilds itself during music and crumbles again when the song stops",
    "a flock of bright birds acts out scenes from the player’s recent memories with increasingly dramatic embellishment",
    "a path through the woods changes season every hundred steps without changing temperature",
    "moonlight pools on the ground deeply enough for someone to wade through it",
    "a statue of an unknown hero acquires the player’s face for a few seconds after an act of courage",
    "a small valley is visibly painted rather than real until someone steps inside, at which point everything outside looks painted instead",
  ],
  ysgard: [
    "two floating mountains collide in the distance and warriors immediately begin cheering rather than evacuating",
    "a battlefield resets itself at dawn, returning every broken weapon and body to where it began the previous morning",
    "a drinking horn rolls uphill against the wind and every warrior who notices treats this as a perfectly valid omen",
    "a bridge made from frozen lightning crackles beneath every footstep but never melts",
    "the player hears a skald narrating their current actions from somewhere they cannot locate",
    "a dead warrior sits up long enough to complain about the quality of the blow that killed them, then lies back down",
    "a waterfall pours between two floating islands and turns into snow halfway across the gap",
    "an abandoned sword embedded in stone loudly critiques the technique of everyone who tries to draw it",
    "a feast table stretches farther the more guests sit down, adding chairs and food without visible servants",
    "a thundercloud forms the outline of an enormous wolf and follows one particular longship for miles",
    "a distant horn blast causes every loose weapon nearby to point toward the same battlefield",
    "a valley contains the echo of tomorrow’s battle before any combatants have arrived",
  ],
'''
before("\n};\n\n// Arc-tied variants",w,'weird')
rep("const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water', 'air', 'earth', 'limbo', 'mechanus', 'sigil', 'hells', 'abyss', 'hades', 'gehenna']);","const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water', 'air', 'earth', 'limbo', 'mechanus', 'sigil', 'hells', 'abyss', 'hades', 'gehenna', 'carceri', 'arborea', 'ysgard']);",'native')
for x in ["id: 'carceri'","id: 'arborea'","id: 'ysgard'","env: ['carceri']","env: ['arborea']","env: ['ysgard']"]:
 if x not in s: raise SystemExit('missing '+x)
p.write_text(s,encoding='utf-8')