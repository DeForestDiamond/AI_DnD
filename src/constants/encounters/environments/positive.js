// Positive energy is raw life and radiance, not a synonym for goodness.
// Ravids and xag-ya are legacy planar creatures; their CRs here are encounter
// bands for adaptation, not claims of official 5e stat blocks.
export const context = 'POSITIVE ENERGY PLANE: a brilliant, surface-less expanse of raw life force and radiant energy. Excess life energy is hazardous, not free unlimited healing. Solid ground, mortal visitors, and settlements need an established refuge, vessel, or protection. Respect the character\'s actual nature, equipment, immunities and planar wards; do not assume a living mortal body, bypass protections, impose automatic damage, or invent unsupported exposure mechanics. Encounter CR describes the opposition, not the safety of the entire plane. Local creatures need not be benevolent or servants of a good deity.';

export const hostile = [
  { cr:0.25, label:'1/4', env:['positive'], desc:'a flying sword animated by a positive-energy current breaks free of a drifting wreck and lunges toward the player' },
  { cr:0.5, label:'1/2', env:['positive'], desc:'two flying swords orbit a luminous shard of wreckage and attack anything entering their defensive circuit' },
  { cr:1, label:'1', env:['positive'], desc:'an animated armor sentinel on a warded platform mistakes the player for an intruder and advances with raised gauntlets' },
  { cr:2, label:'2', env:['positive'], desc:'a rug of smothering animated by overflowing life energy tears loose from an abandoned refuge and reaches to wrap around the player' },
  { cr:4, label:'4', env:['positive'], desc:'a territorial xag-ya energon pulses warning arcs through the radiance, then lashes at an intruder approaching its energy spring' },
  { cr:5, label:'5', env:['positive'], desc:'a ravid and the objects it has animated defend a floating nest of luminous debris, surging toward the approaching player' },
  { cr:6, label:'6', env:['positive'], desc:'a shield guardian commanded by a protected planar researcher blocks the only passage through a warded refuge and moves to seize an intruder' },
  { cr:8, label:'8', env:['positive'], desc:'a stone golem guarding a drifting life-energy condenser awakens as the player approaches its collection apparatus' },
  { cr:10, label:'10', env:['positive'], desc:'a ward-protected deva guarding a stolen reliquary draws a radiant mace and attempts to drive the player from its isolated sanctuary' },
  { cr:16, label:'16', env:['positive'], desc:'an iron golem defending a fortified planar harvesting vessel turns its weapons on anyone approaching the radiant intake' },
  { cr:21, label:'21', env:['positive'], desc:'a solar operating within a protected celestial bastion identifies the player as an enemy of its specific charge and raises its greatsword to bar passage' },
];

export const social = [
  'a ravid drifts beside a trail of animated tools, apparently curious about an unfamiliar visitor rather than interested in a fight',
  'a xag-ya energon communicates through repeating pulses of light near a stable pocket of radiance',
  'a ward-protected aasimar researcher offers charts of energy currents in exchange for observations from another plane',
  'a dwarven engineer inside a sealed survey vessel needs help recovering a detached collector before the current carries it away',
  'a dragonborn healer tends a sheltered experimental garden and trades rare restorative plants grown under carefully regulated exposure',
  'a human navigator signals from a shielded planar skiff, offering passage between two established refuges',
  'a protected deva seeks a lost messenger and offers a concrete reward for information rather than assuming every visitor shares its duty',
  'a gnomish artificer in an insulated workshop demonstrates how controlled positive energy animates tools without making them obedient',
  'a small expedition of elven planar scholars shelters behind layered wards and offers to compare safe exit routes',
  'a tiefling merchant in a warded trading capsule exchanges light-proof equipment and energy vessels for useful salvage',
  'a celestial caretaker requests help repairing the mechanical shutters of a protected sanctuary before its next supply vessel arrives',
  'a visiting necromancer behind intact radiant wards argues with a healer about a failed experiment; each has different practical information to trade',
];

export const weird = [
  'a current of radiance makes loose, unattended tools twitch and begin moving on their own',
  'a translucent seed unfurls into a tree of light, flowers, and collapses into drifting sparks without leaving solid ground',
  'a drifting stone bears a shadow on every side despite having no single source of illumination',
  'a broken sculpture begins knitting itself together inside a narrow energy stream, then separates again when it drifts beyond it',
  'a distant wave of brilliance approaches an abandoned observation platform whose shutters remain open',
  'a bubble of dimmer light contains an old survey station, its boundary marked by slowly revolving brass rings',
  'luminous currents cross like rivers in empty space, revealing a wreck suspended at their intersection',
  'a pocket of regulated energy sustains an impossibly dense garden inside a cracked crystal sphere',
  'a sealed collector fills with liquid-seeming radiance as its mechanical pressure needle creeps toward a red mark',
  'a loose stone briefly sprouts delicate crystalline growth where a bright current brushes its surface',
  'a dark aperture hangs in the brilliance, framed by physical anchors that suggest a deliberately maintained portal',
  'a field of animated wreckage performs the same unfinished repair around the remains of a long-abandoned vessel',
];
