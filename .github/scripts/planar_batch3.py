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
rep("  { id: 'limbo',      label: '🌀 Limbo' },\n];","  { id: 'limbo',      label: '🌀 Limbo' },\n  { id: 'mechanus',   label: '⚙️ Mechanus' },\n  { id: 'sigil',      label: '🚪 Sigil / Outlands' },\n  { id: 'hells',      label: '😈 Nine Hells' },\n];",'env')
h=r'''

  // ── MECHANUS ──
  { cr: 0.125, label: '1/8', env: ['mechanus'], desc: 'tiny rogue clockwork mites begin dismantling the player’s equipment to correct an unauthorized asymmetry' },
  { cr: 0.25, label: '1/4', env: ['mechanus'], desc: 'a malfunctioning monodrone identifies the player as an unscheduled obstruction and attempts removal' },
  { cr: 0.5, label: '1/2', env: ['mechanus'], desc: 'a pair of duodrones blocks the gear-road and escalates immediately when the player cannot provide a valid transit number' },
  { cr: 1, label: '1', env: ['mechanus'], desc: 'a tridrone patrol interprets contradictory orders in the most hostile mathematically consistent way possible' },
  { cr: 2, label: '2', env: ['mechanus'], desc: 'a quadrone enforcement unit descends from a rotating gear and declares the player temporarily unlawful' },
  { cr: 3, label: '3', env: ['mechanus'], desc: 'a pentadrone supervises a squad of lesser modrons attempting to quarantine the entire roadway around the player' },
  { cr: 4, label: '4', env: ['mechanus'], desc: 'a rogue clockwork adjudicator attacks after calculating that negotiation has only a 0.03 percent chance of efficiency' },
  { cr: 5, label: '5', env: ['mechanus'], desc: 'an inevitable servitor arrives to enforce a minor cosmic clause whose penalty is wildly disproportionate to the offense' },
  { cr: 6, label: '6', env: ['mechanus'], desc: 'a modron war-engine unfolds from the surface of a gear and begins a perfectly systematic attack pattern' },
  { cr: 8, label: '8', env: ['mechanus'], desc: 'a hierarch’s elite correction squad surrounds the player after a prediction engine flags them as an unacceptable source of variance' },
  { cr: 10, label: '10', env: ['mechanus'], desc: 'a massive inevitable hunter steps through synchronized portals with a warrant written in equations' },
  { cr: 12, label: '12', env: ['mechanus'], desc: 'a rogue law-engine awakens beneath the gear-road and tries to erase every variable it cannot reconcile, beginning with the player' },
  // ── SIGIL / OUTLANDS ──
  { cr: 0.125, label: '1/8', env: ['sigil'], desc: 'a swarm of razorvine sprouts across an alley in seconds and lashes at anything attempting to push through' },
  { cr: 0.25, label: '1/4', env: ['sigil'], desc: 'petty planar cutpurses backed by a tiny summoned nuisance decide the newcomer looks easier than the locals' },
  { cr: 0.5, label: '1/2', env: ['sigil'], desc: 'a gate-town street gang attempts to collect a toll for a portal they absolutely do not own' },
  { cr: 1, label: '1', env: ['sigil'], desc: 'a hostile planar mercenary steps from a crowd and demands an item the player has never heard of' },
  { cr: 2, label: '2', env: ['sigil'], desc: 'a faction enforcer mistakes the player for someone who skipped a binding arbitration and moves to detain them' },
  { cr: 3, label: '3', env: ['sigil'], desc: 'a bariaur bruiser and hired muscle close an alley after receiving a very convincing but apparently false description of the player' },
  { cr: 4, label: '4', env: ['sigil'], desc: 'a planar bounty hunter emerges through a doorway that was a bakery five seconds ago and announces the player’s full description' },
  { cr: 5, label: '5', env: ['sigil'], desc: 'a gang of veteran cross-planar smugglers attacks to recover contraband hidden in cargo the player did not pack' },
  { cr: 6, label: '6', env: ['sigil'], desc: 'a hostile outsider from an unknown plane forces its way through a malfunctioning portal and chooses the player as the nearest obstacle' },
  { cr: 8, label: '8', env: ['sigil'], desc: 'an elite faction strike team seals both ends of the street and attempts a very public arrest under a law nobody nearby recognizes' },
  { cr: 10, label: '10', env: ['sigil'], desc: 'a powerful planar hunter pursues its quarry through three portals at once and mistakes the player’s intervention for allegiance' },
  { cr: 12, label: '12', env: ['sigil'], desc: 'a gate-town crisis spills violently into the street as an outsider champion tries to force the district toward another plane' },
  // ── NINE HELLS (beyond Avernus) ──
  { cr: 0.125, label: '1/8', env: ['hells'], desc: 'a swarm of infernal vermin bearing tiny stamped ownership seals attacks anyone without matching paperwork' },
  { cr: 0.25, label: '1/4', env: ['hells'], desc: 'lemures seep from an unattended processing trench and reach blindly for the nearest living soul' },
  { cr: 0.5, label: '1/2', env: ['hells'], desc: 'imps from a minor household surround the player and attempt to seize them on the strength of a forged summons' },
  { cr: 1, label: '1', env: ['hells'], desc: 'a spine devil patrol blocks the road and escalates a routine document check into violence' },
  { cr: 2, label: '2', env: ['hells'], desc: 'bearded devil bailiffs arrive to enforce a debt against someone whose name differs from the player’s by one letter' },
  { cr: 3, label: '3', env: ['hells'], desc: 'a barbed devil overseer decides the player’s presence is disrupting productivity and orders immediate correction' },
  { cr: 4, label: '4', env: ['hells'], desc: 'an erinyes junior officer descends with a sealed warrant and refuses to explain which infernal court issued it' },
  { cr: 5, label: '5', env: ['hells'], desc: 'a chain devil collector tries to repossess an object the player acquired legally on another plane' },
  { cr: 6, label: '6', env: ['hells'], desc: 'a horned devil tax-enforcer arrives with armed clerks and a terrifyingly organized inventory of the player’s possessions' },
  { cr: 8, label: '8', env: ['hells'], desc: 'an erinyes strike captain and infernal escorts attempt to compel the player’s attendance at a trial already in progress' },
  { cr: 10, label: '10', env: ['hells'], desc: 'a senior devil magistrate’s champion attacks after declaring the player in contempt of a court they have never entered' },
  { cr: 12, label: '12', env: ['hells'], desc: 'a pit-fiend administrator arrives personally to enforce a contract clause whose signature appears genuine despite being impossible' },'''
before("\n];\n\nconst SOCIAL_BY_ENV = {",h,'hostile')
soc=r'''
  mechanus: [
    "a modron survey team asks the player to stand exactly still for seventeen seconds while it recalibrates a road that is drifting one millimeter per century",
    "a rogue modron quietly asks what it feels like to want something that was not assigned",
    "a clockwork merchant sells tools measured to impossible tolerances and becomes delighted by any object that is handmade and slightly crooked",
    "an inevitable clerk offers directions after verifying the player is not currently the subject of any cosmically binding warrants",
    "a mortal mathematician living on a rotating gear invites the player to dinner and complains that the neighbors schedule every conversation months ahead",
    "a quadrone courier has two equally valid delivery routes and asks an outsider to introduce randomness into the decision",
    "a gearwright repairs planar mechanisms and offers to inspect any device that behaves unpredictably because unpredictability is fascinating contraband here",
    "a modron census procession politely asks the player to select the category that least inaccurately describes them",
    "a visiting gnome artificer has been having the time of their life and desperately wants someone less orderly to talk to",
    "a hierarch’s assistant requests testimony about a tiny irregularity that has somehow generated six thousand pages of proceedings",
    "a clockwork pilgrim follows a sequence of numbered gears toward a place where Primus supposedly issued a single unanswered question",
    "an awakened construct asks whether changing one’s own purpose counts as theft if the original purpose belonged to its creator",
  ],
  sigil: [
    "a tiefling tout offers a walking tour of three impossible neighborhoods and promises to identify which alleys are currently portals",
    "a bariaur trader sells maps whose usefulness depends entirely on knowing the correct portal key",
    "a planar courier asks the player to hold a package for ten seconds while they step through a door and return from a different direction",
    "a githzerai café owner serves food from six planes and trades rumors more readily than coin",
    "a faction philosopher aggressively invites the player to debate the nature of reality over cheap drinks",
    "a portal scholar wants to examine an ordinary object the player carries because it opened a gate yesterday for reasons nobody understands",
    "a gate-town refugee needs directions to a district that has moved after their home settlement partially slid into another plane",
    "a dabus silently repairs a street overhead while rebus symbols politely instruct everyone below to stop standing where gravity is about to change",
    "a celestial and a fiend share a table under truce and ask the player to settle a completely mundane card-game dispute",
    "a merchant from the Great Bazaar offers a discount to anyone who can identify which plane an unlabeled crate came from without opening it",
    "a veteran planeswalker offers free advice: never follow a portal just because somebody painted FREE TREASURE above it",
    "an Outlands caravan headed toward a gate-town invites the player along because the road is safer when every traveler knows a different kind of trouble",
  ],
  hells: [
    "an infernal clerk behind a portable brass desk offers directions and three stamped forms proving the player was never here",
    "an imp notary advertises contract review and appears genuinely offended by clauses that are merely deceptive instead of elegantly deceptive",
    "a tiefling merchant with legal residency sells mortal food at absurd prices and gives excellent advice for free",
    "an erinyes advocate asks whether the player needs representation before speaking to literally anyone important",
    "a damned soul assigned to records quietly offers information in exchange for a message delivered to descendants on the Material Plane",
    "a devil customs agent explains exactly which possessions are taxable, which are prohibited, and which technically count as visiting dignitaries",
    "a night hag broker runs a neutral tea stall where infernal contracts are bought, sold, and complained about",
    "a chain devil off duty asks the player to settle an argument about whether a particular punishment violates departmental policy",
    "a mortal lawyer who voluntarily moved here has become disturbingly successful and offers one piece of advice: read the definitions section first",
    "a horned devil quartermaster trades equipment and battlefield news while expressing profound relief that this conversation requires no screaming",
    "an infernal archivist wants an outsider’s opinion on a contract written before several modern concepts technically existed",
    "a minor devil household invites the player to dinner because hosting a mortal traveler grants obscure social prestige in this particular layer",
  ],
'''
before("\n};\n\nconst WEIRD_BY_ENV = {",soc,'social')
w=r'''
  mechanus: [
    "every gear in sight stops for exactly one second and the resulting silence feels physically heavier than sound",
    "a tiny brass cube rolls uphill, crosses three rotating gears, and slots perfectly into a machine nobody can see",
    "an entire district repeats the previous minute exactly except the player remembers both versions",
    "a numbered door opens once every 997 rotations and reveals a room containing only an unfinished equation carved into light",
    "a gear the size of a continent turns backward by a single tooth and distant alarms begin ringing in perfect sequence",
    "a flock of clockwork birds rearranges into a mathematical symbol that does not exist in any known notation",
    "the player’s footsteps begin landing exactly on a beat generated by machinery miles away regardless of walking speed",
    "a line painted across a roadway marks the point where probability becomes visibly more predictable on one side",
    "a fallen screw larger than a tower bears microscopic serial numbers that continue far below what vision can resolve",
    "a perfectly ordinary flower grows from a seam between gears and nearby modrons have erected a formal observation perimeter",
    "a passing shadow belongs to a machine that will not arrive for another several minutes",
    "two adjacent gears rotate in mathematically incompatible directions without slipping, grinding, or acknowledging the contradiction",
  ],
  sigil: [
    "an ordinary broom closet opens onto an endless snowy battlefield until somebody closes the door and tries again",
    "a doorway accepts a copper coin as a portal key, but only if the coin was previously refused as payment somewhere else",
    "gravity points toward the nearest wall for one city block and locals continue shopping without comment",
    "a chalk symbol appears on several unrelated doors, each opening onto a different view of the same unknown room",
    "a street curves upward until people on the far side are visibly walking overhead, then levels out without any corner",
    "a public fountain begins producing sand from a desert plane and a municipal worker arrives with exactly the correct shovel",
    "a portal opens for one second every time someone nearby lies and nobody can determine which liar is causing it",
    "an alley contains the smell, weather, and distant sounds of another plane without any visible portal at all",
    "a shop sign changes language depending on the viewer and gives each person a slightly different business name",
    "a locked door has accumulated dozens of warning signs written by people who clearly went through it anyway",
    "a shadow crosses the street from wall to wall despite Sigil having no sun and no obvious object casting it",
    "a ring-shaped view of the city overhead briefly shows a district that does not appear to exist anywhere else on Sigil",
  ],
  hells: [
    "a contract nailed to a wall quietly rewrites one clause whenever nobody reads it aloud",
    "a queue of damned souls stretches through several buildings and nobody can remember what service is being provided at the front",
    "a brass elevator opens in the middle of nowhere and its floor buttons list layers, courts, and one destination labeled APPEAL",
    "every flame nearby turns blue while an invisible official reads a verdict somewhere beyond hearing",
    "a road sign points toward the same courthouse in three mutually exclusive directions and all three routes are legally correct",
    "a river of ink flows through carved channels in the floor carrying signatures that occasionally scream",
    "a sealed office door bears the player’s name on a brass appointment plaque dated centuries before their birth",
    "a stack of infernal forms fills itself out using details from the player’s life, then stamps the application INCOMPLETE",
    "a bell rings and every devil in sight freezes for exactly six seconds before continuing without explanation",
    "snow falls in a single corridor despite the surrounding furnace heat, each flake shaped like a tiny legal seal",
    "a courtroom with no walls drifts past on a platform of iron while witnesses testify to an empty chair",
    "a portal labeled EMERGENCY EXIT opens onto another part of the Nine Hells that is visibly much worse",
  ],
'''
before("\n};\n\n// Arc-tied variants",w,'weird')
rep("const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water', 'air', 'earth', 'limbo']);","const NATIVE_ONLY_ENVIRONMENTS = new Set(['astral', 'shadowfell', 'fire', 'water', 'air', 'earth', 'limbo', 'mechanus', 'sigil', 'hells']);",'native')
for x in ["id: 'mechanus'","id: 'sigil'","id: 'hells'","env: ['mechanus']","env: ['sigil']","env: ['hells']"]:
 if x not in s: raise SystemExit('missing '+x)
p.write_text(s,encoding='utf-8')