// The Negative Plane is distinct from the Shadowfell. Ordinary visitors here
// need a refuge or protection; undead and energy beings need no mortal ecology.
// The xeg-yi is a legacy energon adapted to the listed encounter power band.
export const context = 'NEGATIVE ENERGY PLANE: a lightless expanse of necrotic energy and life-draining emptiness, distinct from the Shadowfell. Solid islands and living visitors need an established refuge, vessel, or protection. Respect the character\'s actual nature, equipment, immunities and planar wards; do not assume a living mortal body, bypass protections, impose automatic damage, or invent unsupported exposure mechanics. Encounter CR describes the opposition, not the safety of the entire plane. Nightwalkers are real inhabitants, but selecting this environment does not itself release one elsewhere or create a forced escape quest.';

export const hostile = [
  { cr:0.25, label:'1/4', env:['negative'], desc:'a skeleton scout picks its way across a drifting ash-covered ruin and raises a bow toward the approaching player' },
  { cr:0.5, label:'1/2', env:['negative'], desc:'a shadow peels away from a broken refuge wall and reaches toward the player\'s silhouette' },
  { cr:1, label:'1', env:['negative'], desc:'a specter emerges from a cracked sarcophagus floating among fragments of a necromantic outpost' },
  { cr:2, label:'2', env:['negative'], desc:'a ghast guards a cache of preserved remains inside the husk of a drifting mausoleum and attacks anyone approaching' },
  { cr:3, label:'3', env:['negative'], desc:'a wight captain on a shattered necromantic skiff draws its blade and orders the player away from its salvage' },
  { cr:4, label:'4', env:['negative'], desc:'a xeg-yi energon gathers into a dark globe and lashes out at an intruder nearing its negative-energy confluence' },
  { cr:5, label:'5', env:['negative'], desc:'a wraith glides out of the blackness around a ruined soul vault and attacks the approaching player' },
  { cr:6, label:'6', env:['negative'], desc:'a bodak stands motionless on a floating slab of black stone, then turns its killing gaze toward the nearest intruder' },
  { cr:8, label:'8', env:['negative'], desc:'a deathlock mastermind directing a necrotic collector orders its undead sentries aside and prepares to attack the player personally' },
  { cr:13, label:'13', env:['negative'], desc:'a vampire spellcaster protected within a drifting tomb-vessel moves to seize the player as a captive for its own schemes' },
  { cr:17, label:'17', env:['negative'], desc:'a death knight defending a fortress fragment advances across its black causeway with a drawn hellfire blade' },
  { cr:20, label:'20', env:['negative'], desc:'a nightwalker resolves from the darkness beside an isolated planar anchor and reaches toward the approaching player' },
  { cr:21, label:'21', env:['negative'], desc:'a lich interrupts the player\'s approach to its necrotic research citadel with an immediate spellcasting gesture' },
];

export const social = [
  'a lich archivist offers access to a specific funerary record in exchange for a lost research instrument, regarding the player as a possible customer',
  'a ward-protected shadar-kai navigator signals from a sheltered skiff and offers a route toward a maintained portal',
  'a wight salvage captain proposes a temporary truce to divide the contents of a ruined necromantic transport',
  'a xeg-yi energon circles a broken collector, reacting to repeated energy pulses rather than spoken language',
  'a ward-protected dwarf scholar in a sealed observatory trades measurements of necrotic currents for help restoring its shutter mechanism',
  'a ghost remembers where an abandoned refuge kept its exit key but wants news of the world it left behind',
  'an undead courier carrying sealed correspondence asks for directions to a known necromancer\'s outpost',
  'a protected tiefling artificer repairs the shielding of a stranded research vessel and offers salvage rights for a replacement component',
  'a death knight honoring an old compact permits conversation at a fortress gate, provided the player does not cross its clearly marked boundary',
  'a ward-protected human necromancer seeks a missing specimen vessel and is willing to pay rather than command another capable traveler',
  'a preserved skeletal cartographer spreads engraved metal charts across a tomb-ship\'s deck and offers to exchange portal bearings',
  'a vampire scholar within a sealed, protected sanctuary offers information about a nearby ruin in return for an unrelated scholarly favor',
];

export const weird = [
  'a stream of necrotic darkness strips color from floating scraps of cloth before they crumble to dust',
  'the last lantern on a ruined observation platform flickers behind layers of intact protective glass',
  'a broken tomb-ship drifts past with all its doors chained shut from the outside',
  'a crystal vessel contains a small light that dims whenever the surrounding energy current strengthens',
  'a trail of funerary masks revolves around an empty iron throne suspended in the void',
  'a ruined portal anchor still outlines a rectangle of distant stars despite lacking enough power to open',
  'a dark current carries fragments of statues toward a necromantic condenser mounted on a distant fortress fragment',
  'an ash-covered island shelters an intact refuge whose boundary excludes the surrounding necrotic current',
  'a soul-vessel rings like a bell when a distant undead procession crosses an unseen causeway',
  'a discarded metal tool remains intact while its wooden handle disintegrates outside the edge of a protective field',
  'the exposed pages of a floating spellbook become blank while writing protected beneath its metal clasp remains readable',
  'a procession of skeletal laborers carries black stone blocks past a ruined observation lens toward an unfinished outpost',
];
