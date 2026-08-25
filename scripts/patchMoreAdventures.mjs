import fs from 'node:fs';

const path = 'src/constants/adventures.js';
let s = fs.readFileSync(path, 'utf8');

if (s.includes("title: 'The Uninvited Wedding'")) {
  console.log('Expanded Adventure pool already applied.');
  process.exit(0);
}

const anchor = `];\n\nconst tones =`;
if (!s.includes(anchor)) throw new Error('Expanded Adventures: list anchor not found');

const more = `  {
    title: 'The Uninvited Wedding',
    premise: 'A town is preparing for a wedding between two people who insist they each agreed to the marriage, yet neither remembers agreeing to marry the other. Both families possess apparently valid copies of the same magically binding contract, and nobody involved is necessarily lying.',
    locations: ['a town square being decorated for a wedding','a temple hosting wedding preparations','a prosperous family estate full of arriving relatives','a guildhall where marriage contracts are being reviewed','an inn crowded with wedding guests and confused witnesses'],
  },
  {
    title: "The Dragon's Complaint",
    premise: 'A dragon has arrived to pursue a property dispute rather than destroy anyone. A nearby community has unknowingly been quarrying material the dragon considers part of its hoard, and much of that material is now embedded in homes, roads, walls, or public buildings.',
    locations: ['a village square beneath the shadow of a waiting dragon','a quarry outside a frightened settlement','a town hall where residents are arguing over property records','a roadside meeting between local officials and a dragon envoy','a half-built public works project using disputed stone'],
  },
  {
    title: "The Dead Man's Reservation",
    premise: 'An inn has kept the same room reserved for generations because a long-lived traveler paid for it in advance and promised to return. They finally have, but someone else is occupying the room after the current innkeeper decided the ancient agreement was unreasonable. The returning guest is calm, patient, and still has the receipt.',
    locations: ['an old roadside inn with an unusually well-kept locked room','a historic city tavern run by the same family for generations','a coaching house during a busy travel season','a famous inn whose oldest ledger is suddenly relevant','a crowded common room while an ancient receipt is being examined'],
  },
  {
    title: "The Fey Child's Trade",
    premise: 'A young fey believed to be lost actually traded away their way home to a mortal child in exchange for something they desperately wanted. Both children consider the bargain fair. Their families emphatically do not, and the meaning of ownership, promises, and consent may differ across the crossing.',
    locations: ['a village beside a Feywild crossing','a forest clearing where mortal and fey children sometimes meet','an eladrin market near the border between worlds','a midsummer fair attended by both mortal and fey families','a cottage at the edge of an enchanted wood'],
  },
  {
    title: 'The Very Small Kingdom',
    premise: 'Two tiny fey courts are approaching open conflict over a minuscule patch of territory. The disputed land may contain little more than a mushroom, a puddle, and one confused small creature, but both sides have histories, claims, ceremonies, and citizens invested in the outcome.',
    locations: ['a moonlit patch of forest contested by two pixie courts','a garden where tiny banners mark rival borders','a Feywild glade divided by elaborate miniature fortifications','a mushroom ring hosting increasingly hostile diplomatic talks','a hedge maze containing two neighboring sprite settlements'],
  },
  {
    title: 'The Mimic Who Bought a Shop',
    premise: 'An intelligent mimic has legally acquired a storefront and wants to operate a legitimate business. Customers, neighbors, guild representatives, and adventurers are having difficulty accepting furniture that can speak, negotiate, and object to being stabbed. The mimic wants practical help, not conquest.',
    locations: ['a commercial street gathered around a newly opened shop','a guildhall reviewing an unusual business license','a market ward where customers are arguing with furniture','a shop whose sign insists ALL FURNITURE IS STAFF','a city licensing office facing a very patient mimic proprietor'],
  },
  {
    title: "The Ghost Who Isn't Haunting Anyone",
    premise: 'A family wants a ghost removed from their ancestral home. The ghost insists the living family is haunting him: he owned the house first, died there peacefully, and would simply like everyone to stop rearranging his belongings. Both sides believe they are the rightful occupants.',
    locations: ['an old manor whose living and dead residents are exhausted with each other','a family estate where furniture keeps being moved back overnight','a city townhouse inherited through several generations','a rural home built around an older haunted structure','a solicitor’s office handling an unusual property complaint'],
  },
  {
    title: 'The Kobold Patent Dispute',
    premise: 'Two kobold groups independently claim to have invented the same dangerous machine and want an impartial outsider to determine ownership. Both prototypes work, neither works quite the same way, and deciding what counts as the same invention may be harder than surviving the demonstrations.',
    locations: ['a kobold workshop full of competing prototypes','a guildhall hosting a very nervous invention hearing','an abandoned quarry chosen as a safe demonstration ground','a market fair featuring rival kobold inventors','a tunnel settlement where two workshops share one disputed wall'],
  },
  {
    title: 'The Festival of Borrowed Names',
    premise: 'During a fey-influenced annual festival, participants ceremonially exchange names until midnight. Someone has accidentally given away their actual true name, and nobody is certain who received it. The problem begins as supernatural lost-and-found rather than a crime.',
    locations: ['a crowded midsummer festival near a Feywild crossing','a lantern-lit city celebration built around exchanged names','an eladrin revel where mortal guests are participating in local customs','a village festival whose oldest tradition suddenly became literal','a night market where everyone is wearing borrowed name-tags'],
  },
  {
    title: "The Monster's Adventurer Problem",
    premise: 'An intelligent creature wants help because armed adventurers repeatedly enter its home, kill livestock or servants, smash containers, and steal anything that looks valuable. It wants security, negotiation, relocation, legal help, or some other practical solution rather than another fight.',
    locations: ['a tavern where an unusual client has requested a private meeting','the edge of a dungeon whose resident has posted a complaint notice','a guildhall receiving a formal grievance from a monster','a cave entrance marked with newly installed property signs','a roadside meeting place chosen by a nervous intelligent creature'],
  },
  {
    title: "The Wizard's Familiar Quit",
    premise: 'A familiar has terminated its relationship with a spellcaster and is demanding recognition of the separation, accumulated compensation, and ownership of several objects it says were gifts. The wizard insists familiars cannot resign. The familiar has surprisingly thorough documentation.',
    locations: ['a wizarding district where a familiar is seeking representation','a mage guild arbitration chamber','a magical university common room during a very public dispute','a tavern frequented by apprentices and their familiars','a scribe’s office reviewing an unconventional employment claim'],
  },
  {
    title: 'The Prophecy Nobody Wants',
    premise: 'Several unrelated people have each been identified as a chosen figure by credible prophetic traditions. None of them wants the role. Priests, scholars, relatives, and followers are beginning to argue while the supposed chosen ones mainly want help getting their ordinary lives back.',
    locations: ['a temple district crowded with competing pilgrims','a quiet inn where several reluctant prophetic figures are hiding','a scholarly archive hosting a prophecy conference','a city plaza where rival religious delegations have gathered','a monastery attempting to mediate between incompatible prophecies'],
  },
  {
    title: 'The Familiar That Chose You',
    premise: 'An unusual familiar or animal companion appears with evidence that it has voluntarily left its previous owner and has chosen to follow the player for now. The situation is about why it left, whether anyone has the right to make it return, and what relationship—if any—the player chooses to have with it. Never predetermine that the player keeps it.',
    locations: ['a city market where an unusual creature quietly joins the player','a roadside inn where a familiar arrives carrying a written notice','a mage district where an unattended familiar begins following the player','a spelljammer dock crowded enough for a small creature to appear unnoticed','a public garden where a strange animal deliberately chooses the player’s company'],
  },
`;

s = s.replace(anchor, `${more}];\n\nconst tones =`);
fs.writeFileSync(path, s);
console.log('Expanded Adventure pool to 25 premises.');
