// Situation-driven adventure openings. Unlike antagonist arcs these are premises,
// not plots: they deliberately do not define a villain, solution, or final reveal.
// Each premise owns its compatible starting contexts so a Feywild problem cannot
// randomly begin in an unrelated prison visiting room.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const ADVENTURES = [
  {
    title: 'The Missing Fey Child',
    premise: 'A young fey has gone missing somewhere between the Feywild and the mortal world. Someone close to the situation needs help finding them, but what happened and why are not yet known.',
    locations: ['a village beside a known Feywild crossing','an eladrin revel near a crossing between worlds','the edge of an enchanted forest where offerings are left for the fey','a midsummer festival where mortal and fey guests mingle','the Feywild near a crossing used by mortal travelers'],
  },
  {
    title: 'The Price of a Bargain',
    premise: 'A community accepted desperately needed help from the fey years ago. The promised payment is now coming due, and the people have discovered that what they agreed to means something very different under fey custom.',
    locations: ['a village bordering an enchanted wood','a market town preparing for the arrival of a fey envoy','a roadside shrine where the original bargain was sworn','a seasonal revel at a Feywild crossing','a village green decorated for a celebration nobody now wants to attend'],
  },
  {
    title: 'Festival Season',
    premise: 'A major festival has filled a prosperous city with merchants, performers, minor nobles, travelers, parties, competitions, courtship, gossip, and opportunities. The player has arrived while the celebration is in full swing.',
    locations: ['a crowded festival square in a major Faerûnian city','a merchant quarter covered in festival banners','a tournament ground beside a packed street fair','a noble district hosting public feasts and private parties','a riverside festival market crowded with visiting families'],
  },
  {
    title: 'A Discreet Bodyguard',
    premise: 'Someone attending an important social event wants a capable bodyguard for a short engagement. Their concern may be justified, exaggerated, mistaken, or about something other than physical danger.',
    locations: ['a noble reception in a major Faerûnian city','a merchant-family banquet during a festival','an auction house before a prestigious sale','a theater district on opening night','a busy inn hosting wealthy travelers and their entourages'],
  },
  {
    title: 'The Unpaid Contract',
    premise: 'A planar visitor is stranded away from home because a mortal fled before completing payment on a binding contract. The visitor wants the matter settled and has reasons not to simply hunt the debtor down by force.',
    locations: ['a fashionable restaurant where planar travelers can pass unnoticed','a tavern near a known planar portal','a busy trade ward frequented by foreign merchants','a temple district where contracts and oaths are witnessed','a gate-town or planar crossroads used by travelers between worlds'],
  },
  {
    title: 'Someone Is Missing',
    premise: 'A person has failed to arrive where they were expected. There is not yet evidence of murder, kidnapping, or a villain; the interesting question is where they went and what the player discovers while looking.',
    locations: ['a coaching inn on a major trade road','a busy city market where the missing person was last expected','a caravanserai at the edge of a city','a harbor where a ship arrived without one expected passenger','a rural estate waiting for a family member who never arrived'],
  },
  {
    title: 'The Inheritance Problem',
    premise: 'A recent inheritance has created a practical, social, or magical problem among the people connected to it. Nobody necessarily committed a crime, and ownership may depend on custom, promises, family relationships, or unusual terms.',
    locations: ['a solicitor or scribe’s office in a prosperous city','a country estate during the reading of a will','a family townhouse crowded with relatives','a guildhall asked to witness an inheritance dispute','a temple archive holding the deceased person’s sealed instructions'],
  },
  {
    title: 'An Unusual Escort',
    premise: 'Someone or something needs to reach a destination safely, discreetly, or without causing a diplomatic incident. The challenge is as much about the traveler and the journey as any danger encountered on the road.',
    locations: ['a caravan yard preparing to depart','a city gate at dawn','a spelljammer dock preparing for departure','a river port beside a passenger barge','a border town where the traveler cannot safely continue alone'],
  },
  {
    title: 'The Magical Mishap',
    premise: 'A magical accident has created a strange local problem. It is disruptive, inconvenient, fascinating, or dangerous, but it is not automatically the work of a villain and may require experimentation, negotiation, or investigation to resolve.',
    locations: ['a university city of mages','an artificer’s district after a public demonstration','a village built around an old magical landmark','a wizard’s fair crowded with experimental enchantments','a market where one stall’s merchandise has begun behaving impossibly'],
  },
  {
    title: 'A Guest From Elsewhere',
    premise: 'A visitor from another plane has arrived in Faerûn and needs something they cannot easily obtain or understand on their own. Their goals are not inherently hostile, but their customs, appearance, obligations, or presence create complications.',
    locations: ['a tavern beside a known planar crossing','a cosmopolitan market in a major city','a temple courtyard accustomed to strange pilgrims','a spelljammer port used by planar travelers','a remote crossing where locals are unsure what just arrived'],
  },
  {
    title: 'The Local Tradition',
    premise: 'The player arrives while a community is preparing for an unusual local tradition, contest, rite, celebration, or obligation. Outsiders are welcome enough to become involved, but the custom has relationships and history the player does not yet understand.',
    locations: ['a village square being decorated for a local rite','a small city during an annual competition','a rural fair drawing visitors from surrounding farms','a coastal town preparing for a traditional night festival','a mountain settlement gathering for a seasonal ceremony'],
  },
  {
    title: 'A Favor Between Strangers',
    premise: 'A stranger asks the player for a limited, plausible favor that seems simple enough to consider. The request creates opportunities to meet people and become involved in local life; any deeper complication must emerge through play rather than being announced at the start.',
    locations: ['a crowded market in a major city','a roadside inn during dinner','a guildhall waiting room','a harbor-side café','a public garden or plaza busy with locals'],
  },
  {
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
];

const tones = ['lighthearted and social','warm with room for real stakes','comedic with grounded consequences','adventurous and curious','low-key intrigue','lively and character-driven','strange but welcoming'];
const openingStyles = ['open on dialogue with a stranger','begin during an ordinary social interaction','begin as the player arrives and can freely look around','begin with a small public event already unfolding around the player','begin during food, drink, shopping, travel, or another grounded activity'];

export function prepareSituationAdventure(adventureOrTitle) {
  const a = typeof adventureOrTitle === 'string'
    ? ADVENTURES.find(x => x.title === adventureOrTitle)
    : adventureOrTitle;
  if (!a) return null;
  return { ...a, location: pick(a.locations), tone: pick(tones), openingStyle: pick(openingStyles) };
}

export function rollSituationAdventure(completedAdventures = []) {
  // completedAdventures may contain full Adventure records (current saves) or
  // title strings (defensive support for older/imported saves). Completed titles
  // stay out of the shuffle until the player removes them from the ledger.
  const completedTitles = new Set(
    (Array.isArray(completedAdventures) ? completedAdventures : [])
      .map(entry => typeof entry === 'string' ? entry : entry?.title)
      .filter(Boolean)
  );
  const available = ADVENTURES.filter(a => !completedTitles.has(a.title));
  if (!available.length) return null;
  const a = pick(available);
  return prepareSituationAdventure(a);
}

export { ADVENTURES };
