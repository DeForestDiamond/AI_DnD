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
];

const tones = ['lighthearted and social','warm with room for real stakes','comedic with grounded consequences','adventurous and curious','low-key intrigue','lively and character-driven','strange but welcoming'];
const openingStyles = ['open on dialogue with a stranger','begin during an ordinary social interaction','begin as the player arrives and can freely look around','begin with a small public event already unfolding around the player','begin during food, drink, shopping, travel, or another grounded activity'];

export function rollSituationAdventure() {
  const a = pick(ADVENTURES);
  return { ...a, location: pick(a.locations), tone: pick(tones), openingStyle: pick(openingStyles) };
}

export { ADVENTURES };
