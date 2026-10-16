// Situation-driven adventure openings. Unlike antagonist arcs these are premises,
// not plots: they deliberately do not define a villain, solution, or final reveal.
// Each premise owns its compatible starting contexts so a Feywild problem cannot
// randomly begin in an unrelated prison visiting room.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Divine Adventures roll their deity in the app instead of asking the DM model
// to invent one. The tier roll is intentional: choosing uniformly from one huge
// deity list would make numerous minor powers crowd out the major gods.
// These are story-selection tiers for Forgotten Realms play, not a rules engine;
// divine rank has shifted across editions and the Second Sundering.
export const DIVINE_POWERS = {
  greater: [
    { name:'Asmodeus', portfolio:'indulgence, tyranny, contracts, and the Nine Hells' },
    { name:'Bane', portfolio:'tyranny, fear, ambition, and domination' },
    { name:'Chauntea', portfolio:'agriculture, life, growth, and the land' },
    { name:'Corellon', portfolio:'elves, art, magic, and creation' },
    { name:'Cyric', portfolio:'lies, strife, deception, and murder' },
    { name:'Gruumsh', portfolio:'orcs, conquest, strength, and survival' },
    { name:'Lathander', portfolio:'dawn, renewal, birth, and new beginnings' },
    { name:'Lolth', portfolio:'drow, spiders, intrigue, darkness, and ruthless ambition' },
    { name:'Moradin', portfolio:'dwarves, creation, smithing, and protection' },
    { name:'Mystra', portfolio:'magic, spellcraft, and the Weave' },
    { name:'Oghma', portfolio:'knowledge, invention, inspiration, and ideas' },
    { name:'Shar', portfolio:'darkness, loss, secrets, and forgetfulness' },
    { name:'Silvanus', portfolio:'wild nature, balance, and untamed places' },
    { name:'Sune', portfolio:'love, beauty, passion, and art' },
    { name:'Talos', portfolio:'storms, destruction, rebellion, and natural catastrophe' },
    { name:'Tempus', portfolio:'war, battle, courage, and honorable combat' },
    { name:'Tyr', portfolio:'justice, law, judgment, and righteous order' },
  ],
  intermediate: [
    { name:'Gond', portfolio:'craft, invention, technology, and smithing' },
    { name:'Helm', portfolio:'guardians, protection, duty, and vigilance' },
    { name:'Ilmater', portfolio:'endurance, suffering, perseverance, and compassion' },
    { name:'Kelemvor', portfolio:'death, the dead, judgment, and the proper passage of souls' },
    { name:'Mask', portfolio:'thieves, shadows, intrigue, and deception' },
    { name:'Mielikki', portfolio:'forests, rangers, autumn, and woodland creatures' },
    { name:'Selûne', portfolio:'the moon, stars, navigation, wanderers, and good lycanthropes' },
    { name:'Torm', portfolio:'duty, loyalty, courage, and righteous service' },
    { name:'Tymora', portfolio:'good fortune, skill, adventurers, and daring' },
    { name:'Umberlee', portfolio:'the sea, waves, storms, and sailors\' fear' },
    { name:'Waukeen', portfolio:'trade, wealth, merchants, and commerce' },
    { name:'Kossuth', portfolio:'elemental fire, purification, and flame' },
    { name:'Akadi', portfolio:'elemental air, movement, freedom, and wind' },
    { name:'Grumbar', portfolio:'elemental earth, solidity, endurance, and stone' },
    { name:'Istishia', portfolio:'elemental water, currents, change, and purification' },
  ],
  lesser: [
    { name:'Auril', portfolio:'winter, cold, ice, and harsh endurance' },
    { name:'Bahamut', portfolio:'metallic dragons, justice, protection, and nobility' },
    { name:'Beshaba', portfolio:'misfortune, accidents, bad luck, and ill fate' },
    { name:'Bhaal', portfolio:'murder, assassins, and violent death' },
    { name:'Deneir', portfolio:'writing, glyphs, literature, and scholarship' },
    { name:'Eilistraee', portfolio:'drow redemption, song, moonlight, freedom, and beauty' },
    { name:'Eldath', portfolio:'peace, quiet places, springs, and still waters' },
    { name:'Jergal', portfolio:'fatalism, records of the dead, and proper burial' },
    { name:'Lliira', portfolio:'joy, celebration, freedom, dance, and festivals' },
    { name:'Loviatar', portfolio:'pain, punishment, endurance, and suffering' },
    { name:'Malar', portfolio:'the hunt, predators, bloodlust, and savage nature' },
    { name:'Myrkul', portfolio:'death, decay, mortality, and fear of death' },
    { name:'Red Knight', portfolio:'strategy, tactics, planning, and battlefield calculation' },
    { name:'Savras', portfolio:'divination, fate, truth, and prophecy' },
    { name:'Sharess', portfolio:'festhalls, pleasure, sensuality, and cats' },
    { name:'Shaundakul', portfolio:'travel, wind, portals, exploration, and caravans' },
    { name:'Talona', portfolio:'poison, disease, plague, and contagion' },
    { name:'Tiamat', portfolio:'chromatic dragons, greed, conquest, and vengeance' },
  ],
};

const DIVINE_ADVENTURE_TITLES = new Set([
  'The Wrong Chosen One',
  'A God Has a Favor',
  'The Divine Emissary',
  'The God Who Owes You',
  'Two Gods, One Problem',
  'The Enemy God Needs You',
  'The Church Did Not Ask Permission',
  'A Prayer Answered Sideways',
  'The Missing God',
  'The Petty Request of an Immortal',
  'The Avatar Made You Jump',
  'A God Wants Something Back',
]);

export function rollDivinePower(excludedNames = []) {
  const excluded = new Set(excludedNames);
  const r = Math.random() * 100;
  const rank = r < 40 ? 'greater' : r < 75 ? 'intermediate' : 'lesser';
  const available = DIVINE_POWERS[rank].filter(d => !excluded.has(d.name));
  const deity = pick(available.length ? available : DIVINE_POWERS[rank]);
  return { ...deity, rank };
}

export const DIVINE_POWER_OPTIONS = Object.entries(DIVINE_POWERS)
  .flatMap(([rank, powers]) => powers.map(power => ({ ...power, rank })))
  .sort((a, b) => a.name.localeCompare(b.name));

export function adventureDeityCount(adventureOrTitle) {
  const title = typeof adventureOrTitle === 'string' ? adventureOrTitle : adventureOrTitle?.title;
  return DIVINE_ADVENTURE_TITLES.has(title) ? (title === 'Two Gods, One Problem' ? 2 : 1) : 0;
}

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
  {
    title: "The Dead God's Wake",
    premise: 'The player begins aboard a damaged spelljammer drifting through the Astral Sea beside the petrified corpse of a dead god. Repairs, survivors, salvage, rival interests, and the impossible knocking now coming from somewhere inside the divine corpse create the opening situation. Do not predetermine what is causing the knocking.',
    locations: ['a crippled spelljammer drifting beside a dead god in the Astral Sea','an Astral Sea debris field caught around the corpse of a forgotten deity','the exposed deck of a damaged vessel slowly orbiting a petrified divine hand','a makeshift survivor camp assembled on the hull of a wrecked spelljammer beside a dead god'],
  },
  {
    title: 'Shipbreaker',
    premise: 'The player begins among the weightless wreckage of two spelljammers that have catastrophically collided in the Astral Sea. Survivors from both crews blame one another, a githyanki patrol is approaching, and the actual cause of the collision is not yet known.',
    locations: ['a weightless field of shattered spelljammer wreckage in the Astral Sea','the broken deck of one of two entangled astral vessels','a drifting cargo cluster between two ruined spelljammers','a surviving air pocket inside a wreck rotating slowly through the Astral Sea'],
  },
  {
    title: 'The Stolen Morning',
    premise: 'The player begins in the Feywild where dawn has failed to arrive. A nearby community remembers yesterday but nobody can clearly account for the missing night, and claims that someone stole the sunrise are spreading. Do not decide in advance whether the sunrise was literally stolen, why dawn has stopped, or who is responsible.',
    locations: ['a Feywild village trapped beneath a sky that refuses to brighten','an eladrin settlement where every clock insists dawn should have happened hours ago','a glowing Feywild forest caught in an unnaturally prolonged predawn','a roadside fey inn whose guests have watched the same horizon for hours'],
  },
  {
    title: 'The Hunt Without End',
    premise: 'The adventure opens already in motion: the player is being hunted through the Feywild by riders whose faces become impossible to remember whenever they leave sight. The player does not begin knowing why they are prey, whether the hunters are justified, or what will end the pursuit.',
    locations: ['a moonlit Feywild forest during a supernatural chase','a shifting hedge maze with distant hunting horns behind the player','a silver-grass Feywild plain crossed by impossible hoofprints','a glowing woodland road that keeps changing while unseen riders close in'],
  },
  {
    title: 'Infernal Processing',
    premise: 'The player begins in Dis, standing in a bureaucratic queue with a numbered brass token and no satisfactory explanation for why they are there. When their number is called, the infernal clerk examines the paperwork and discovers that according to the records the player is not supposed to exist. The clerks are not automatically hostile; treat Hell as a functioning society with laws, interests, and opportunities rather than a mandatory combat encounter.',
    locations: ['an infernal processing hall in Dis packed with petitioners and brass-numbered queues','a bureaucratic annex beneath the iron towers of Dis','a crowded records office where devils process arrivals from across the planes','a smoky waiting chamber outside an infernal civil-service counter'],
  },
  {
    title: 'Deserter',
    premise: 'The player begins attached to an infernal military force on an active Blood War front in Avernus when an order, disaster, opportunity, or revelation makes remaining with the unit immediately questionable. The player may obey, desert, sabotage, negotiate, defect, steal transport, or invent another solution; do not force a moral interpretation or a particular side of the Blood War.',
    locations: ['an infernal field camp on an active Avernian front','the crew compartment of a war machine minutes before deployment','a trench line overlooking a Blood War battlefield','a mobile infernal column crossing the wastes of Avernus'],
  },
  {
    title: 'The Empty Fortress',
    premise: 'The player begins inside an infernal fortress whose entire population appears to have vanished in the middle of ordinary activity. Meals are still hot, weapons and documents lie unattended, one abandoned prisoner was left partway through interrogation, and the gates are locked from the inside. Do not predetermine what happened.',
    locations: ['an abandoned infernal fortress in Avernus with its gates locked from within','a silent fortress in Dis where every post was deserted at once','an empty Hellish keep with fresh meals still sitting on tables','a fortified infernal waystation whose occupants vanished minutes ago'],
  },
  {
    title: 'The Town That Forgot It Died',
    premise: 'The player begins in a seemingly ordinary Shadowfell settlement whose residents work, argue, eat, trade, and sleep as though nothing is wrong. Evidence gradually suggests the entire town died long ago, but the residents themselves do not know or accept that fact. Do not decide in advance why the town persists or what should be done about it.',
    locations: ['a gray but busy Shadowfell town whose residents behave entirely normally','a roadside settlement beneath a permanently overcast Shadowfell sky','a walled Shadowfell market town with strangely old records','a quiet village where every gravestone bears a familiar local name'],
  },
  {
    title: 'City of Brass Job',
    premise: 'The player begins in the City of Brass already owing a meaningful debt to someone with the standing to collect it. The debt can be settled by obtaining one difficult object, favor, signature, person, or piece of information. Several other interested parties want the same thing for unrelated reasons. Do not predetermine the correct way to pay, escape, renegotiate, or exploit the debt.',
    locations: ['a crowded bazaar in the City of Brass','an efreeti creditor’s office overlooking the City of Brass','a smoke-filled café where debts and favors are quietly traded','a brass-plated market district under the impossible heat of the Plane of Fire'],
  },
  {
    title: 'No Surface',
    premise: 'The player begins submerged on the Elemental Plane of Water. Their immediate problem is survival and orientation: there is no meaningful surface above them, and safety depends on finding air, magic, shelter, inhabitants, transport, or another solution appropriate to their abilities. Do not assume the player is helpless if their species, equipment, spells, or inventory already solve the breathing problem.',
    locations: ['the open endless ocean of the Elemental Plane of Water','a drifting reef settlement far from any stable portal','the dark water outside an enormous air-filled coral structure','a current carrying debris and travelers through the Plane of Water'],
  },
  {
    title: 'Make Something',
    premise: 'The player begins on a tiny island of stable reality surrounded by the raw chaos of Limbo. Thoughts, discipline, instinct, and magic can reshape nearby matter. Something else in the area is also shaping reality and appears substantially better at it. Do not predetermine whether that presence is hostile, intelligent, aware of the player, or even a creature.',
    locations: ['a tiny island of stable stone suspended in the chaos of Limbo','a fragment of landscape being continuously rewritten by Limbo','a pocket of breathable stable reality surrounded by elemental chaos','a half-formed structure whose architecture changes whenever the player looks away'],
  },
  {
    title: 'Three Years Late',
    premise: 'The player enters Sigil through an ordinary-looking doorway or portal that immediately closes behind them. Someone waiting nearby recognizes them—or believes they do—and says they are three years late. The stranger’s expectation is genuine, but what they expected, why the timing is wrong, and whether they have the right person must emerge through play.',
    locations: ['a crowded street in Sigil beside a portal that has just closed','a rain-slick alley in the City of Doors','a market ward in Sigil where someone has clearly been waiting a very long time','a quiet doorway between two Sigil buildings that no longer leads where it did a moment ago'],
  },
  {
    title: 'Wrong Door',
    premise: 'The player is doing something utterly mundane—usually entering a tavern room, storeroom, washroom, rented chamber, shop, or other ordinary doorway—when stepping through places them somewhere wildly unexpected. The door closes or vanishes and there is no immediately obvious route back. The destination may be another plane or simply an absurdly distant place on the same world. Define the problem, not the solution: do not prescribe how the player returns, and treat any plausible solution they devise as valid with appropriate consequences.',
    locations: [
      'the purple-dust plains of the Shaar overlooking Brightstar Lake, effectively the opposite side of Faerûn from Waterdeep',
      'a blasted plain in Avernus with no portal or doorway visible behind the player',
      'a luminous Feywild forest beneath unfamiliar stars',
      'the Astral Sea on a drifting fragment of stone with a spelljammer visible far away',
      'a crowded street in Sigil where nobody finds the sudden arrival especially remarkable',
      'the edge of the City of Brass under a sky full of flame',
      'a silent ridge in the Shadowfell overlooking a distant settlement',
      'an isolated Underdark cavern containing absolutely no tavern door',
      'a windswept island hundreds of miles from the player’s previous location',
      'a snowy road in a perfectly ordinary but extremely distant part of Toril',
    ],
  },
  {
    title: 'The Tentacle Problem',
    premise: 'A respectable community has developed a deeply embarrassing problem: enormous extraplanar tentacles periodically emerge from portals, drains, wells, alleys, cellars, harbor water, or other increasingly inconvenient places and behave in ways witnesses insist are best described as obscene. Local officials desperately want the situation contained without becoming the subject of regional gossip. Do not predetermine what the tentacles belong to, whether they are all connected to the same creature, or whether the behavior is intentional; keep the humor suggestive and absurd rather than sexually explicit.',
    locations: ['a respectable coastal town whose council has begun issuing emergency tentacle ordinances','a harbor district where dockworkers refuse to discuss what happened to the customs shed','a market square currently closed for what officials are calling an extraplanar infrastructure incident','a seaside inn where several witnesses are giving mutually incompatible descriptions of the same tentacle','a town hall meeting where the mayor visibly regrets allowing public comment'],
  },
  {
    title: 'Three Gnomes in a Trench Coat',
    premise: 'The player is minding their own business when an unusually lumpy figure in a long trench coat approaches with unmistakable purpose. The coat opens, revealing three gnomes standing on one another’s shoulders. Without explanation, the middle gnome punches the player in the crotch. The coat snaps shut and the trio attempts an immediate, extremely unconvincing escape. Do not require the player to pursue them and do not predetermine why they did it; if ignored, three gnomes may simply have committed an inexplicable drive-by crotch punching and vanished into local history.',
    locations: ['a crowded city street with plenty of witnesses and absolutely no useful explanation','a tavern common room where the lumpy stranger has been staring at the player for several minutes','a busy market aisle that becomes an obstacle course during the getaway','a festival street where the trench coat almost blends in until it very much does not','a quiet roadside inn where the gnomes have nowhere sensible to run and try anyway'],
  },
  {
    title: 'The Wrong Chosen One',
    premise: 'A divine emissary arrives with unmistakable ceremony and confidently identifies the player as the chosen champion of a specific deity. The player has every reason to believe this is a mistake. The emissary has convincing prophetic evidence, the actual intended chosen person may still be somewhere in the world, and the deity has not necessarily noticed the error yet. Never force the player to correct the mistake; they may confess, investigate, exploit the title, commit to the role, or deliberately see how long they can get away with it.',
    locations: ['a temple courtyard interrupted by a column of divine light','a crowded city square where a celestial publicly kneels before the player','a roadside inn where an exhausted divine messenger finally finds the person they think they seek','a festival where priests suddenly recognize the player from an old prophecy','a planar crossroads where a celestial entourage has been waiting for the wrong person'],
  },
  {
    title: 'A God Has a Favor',
    premise: 'A deity directly contacts the player and asks for a favor that matters to that god but does not dictate how the player must respond or accomplish it. Choose a deity whose personality, portfolio, and interests make the request distinctive. The request may be important, strange, personal, inconvenient, or surprisingly petty. The player is free to refuse, bargain, insult the god, demand payment, or solve the problem in an unexpected way.',
    locations: ['an ordinary room where every reflective surface suddenly shows the same divine visitor','a quiet roadside shrine that becomes unmistakably occupied by its god','a dream that remains physically present after the player wakes','a planar realm where the deity can speak without intermediaries','a crowded public place where time briefly stops for everyone except the player'],
  },
  {
    title: 'The Divine Emissary',
    premise: 'An avatar, celestial, herald, chosen priest, talking animal, or other unmistakable emissary approaches on behalf of a deity with a request. The emissary has its own personality and interpretation of the god’s wishes and may not understand the player at all. Do not make obedience mandatory and do not assume the emissary is infallible.',
    locations: ['a tavern where an impossible stranger calmly takes the empty chair opposite the player','a temple district where a divine herald intercepts the player in public','a wilderness road where every animal falls silent before an emissary arrives','a spelljammer dock where a celestial has been asking increasingly confused workers for the player','a planar marketplace where a divine servant is trying very hard to remain inconspicuous'],
  },
  {
    title: 'The God Who Owes You',
    premise: 'A deity intervenes in a meaningful way before asking anything in return: opening an impossible escape, preventing a death, revealing vital information, protecting something the player values, or otherwise providing an unsolicited favor. The god does not immediately state a price. What the deity eventually wants, whether the player considers the favor a debt, and whether the intervention was genuinely altruistic must emerge through play.',
    locations: ['the immediate aftermath of an impossible escape marked by a divine symbol','a battlefield or disaster site where the player alone received inexplicable protection','a temple where a priest recognizes the sign of an unsolicited divine favor','a planar crossing that opened exactly when the player needed it','a quiet morning after a dream supplied information the player could not otherwise know'],
  },
  {
    title: 'Two Gods, One Problem',
    premise: 'Two deities with different values or interests independently approach the player about the same developing situation and want incompatible outcomes. Neither request is automatically correct, neither deity controls the player, and there may be solutions neither god anticipated. Their rivalry should create choices and consequences rather than a forced alignment test.',
    locations: ['a neutral temple where two divine signs appear at once','a Sigil café where rival emissaries have accidentally scheduled the same meeting','a battlefield shrine claimed by two faiths','a dream that abruptly becomes contested territory between two divine voices','a planar crossroads where two celestial delegations are refusing to leave first'],
  },
  {
    title: 'The Enemy God Needs You',
    premise: 'A deity whose values, church, or history should make the player an unlikely ally asks for help because the player is unusually suited to a problem the god cannot conveniently solve. The god is not required to become friendly, trustworthy, or redeemed. The player may refuse, exploit the need, negotiate outrageous terms, help for their own reasons, or make the situation worse.',
    locations: ['a desecrated shrine where the last voice the player expects answers back','a private audience arranged by visibly uncomfortable enemy clergy','a neutral planar meeting place chosen because neither side trusts the other','a dream in which a hostile deity makes an irritatingly reasonable request','a battlefield after both sides discover they currently need the same thing'],
  },
  {
    title: 'The Church Did Not Ask Permission',
    premise: 'A powerful church, priesthood, or divine order recruits the player for a mission they insist serves their god. The deity has not actually endorsed the plan and may be unaware of it, opposed to it, or merely curious what happens. Do not reveal the god’s true opinion automatically; let the discrepancy emerge if the player investigates or divine attention is attracted.',
    locations: ['a wealthy temple office where senior clergy present a supposedly sacred assignment','a monastery preparing an expedition under questionable divine authority','a public ceremony where the player is volunteered before anyone asks them','a military chapel where a holy order needs an outsider','a pilgrimage camp whose leaders claim to possess private instructions from their god'],
  },
  {
    title: 'A Prayer Answered Sideways',
    premise: 'Someone else prays desperately for divine intervention and the answer appears to be the player. The deity may have deliberately sent them, manipulated coincidence, merely opened an opportunity, or had nothing to do with it at all. The petitioner is convinced. Do not force the player to accept responsibility or confirm the divine interpretation.',
    locations: ['a roadside shrine where a desperate stranger finishes praying as the player arrives','a besieged neighborhood whose priest has just asked for help from above','a hospital or sanctuary where someone recognizes the player as an answer to prayer','a storm-battered ship where a prayer ends seconds before the player appears','a remote village whose inhabitants have been waiting for a sign that looks inconveniently like the player'],
  },
  {
    title: 'The Missing God',
    premise: 'A deity has stopped answering its clergy, granting expected signs, or appearing where divine servants know it should be reachable. The faith is beginning to notice, but there is no predetermined explanation: the god may be trapped, distracted, hiding, wounded, transformed, deliberately silent, or dealing with something stranger. The player becomes involved before certainty exists.',
    locations: ['a major temple where every divination has failed at once','a divine realm whose inhabitants cannot locate their own ruler','a pilgrimage site where a centuries-old miracle suddenly stopped','a celestial embassy quietly seeking an outsider before panic spreads','a remote shrine where the final known divine message ended mid-sentence'],
  },
  {
    title: 'The Petty Request of an Immortal',
    premise: 'A deity asks the player to handle something astonishingly minor by mortal standards but personally important to an immortal: recover a sentimental object, settle an ancient insult, deliver a message, correct an embarrassing historical record, retrieve a beloved mortal artifact, or inconvenience someone the god has disliked for centuries. Treat the god’s personality seriously even when the request is absurd.',
    locations: ['a luxurious divine audience chamber prepared for an embarrassingly small problem','a roadside shrine where a god whispers a request nobody would believe','a museum containing an object a deity insists belongs somewhere else','a library whose obscure historical footnote has attracted divine attention','a Sigil tavern chosen for a meeting concerning an eight-hundred-year-old grudge'],
  },
  {
    title: 'The Avatar Made You Jump',
    premise: 'A deity’s avatar manifests suddenly within arm’s reach of the player to deliver an important request. The opening must stop immediately after the manifestation and allow the player to react before the avatar explains anything. If the player attacks, flees, insults, embraces, ignores, or otherwise derails the divine entrance, preserve that reaction and let the avatar respond in character rather than resetting the scene. The avatar came to ask for something, not to railroad the player.',
    locations: ['a private room abruptly filled with divine light','a quiet alley where an avatar appears directly behind the player','a campsite where a divine figure materializes beside the fire','a rented tavern room whose wall may shortly become structurally relevant','a temple courtyard where the god apparently assumes appearing without warning is acceptable'],
  },
  {
    title: 'A God Wants Something Back',
    premise: 'A deity claims that an object, creature, secret, name, memory, soul, piece of territory, or other unusual thing currently in mortal or planar hands belongs to them and asks the player to recover it. The god’s claim may be legitimate, debatable, ancient, technically correct, or deeply self-serving. Do not predetermine ownership, guilt, or the method of recovery.',
    locations: ['a divine archive where the missing thing is recorded in impossibly old ledgers','a temple treasury displaying an obviously empty place of honor','a planar market where the disputed possession has recently resurfaced','a mortal city where the current owner has no idea a god claims their property','a private divine audience where the god is unusually specific about not damaging what they want returned'],
  },

  {
    title: 'The Royal Invitation',
    premise: 'The player receives a genuine invitation to a royal court because someone there specifically wants them present. Establish who invited them and a clear immediate reason to attend, without predetermining the deeper motive or making attendance compulsory. Court offers people with their own interests, opportunities, rivalries, hospitality, and room for unexpected friendships or alliances. Do not automatically turn the invitation into a trap, assassination attempt, or mandatory service to the crown.',
    locations: ['a palace reception where a royal host has reserved a place for the player','a royal garden party where a courtier recognizes the newly arrived guest','a castle gate where the player’s invitation causes a sudden change in treatment','a royal hunting lodge preparing to receive an unusually mixed company','a harbor pavilion hosting a visiting monarch’s reception'],
  },
  {
    title: 'The Runaway Royal',
    premise: 'An adult royal traveling in disguise asks the player for help avoiding their own guards and has no intention of going home just yet. Give the royal an understandable personal goal, useful abilities, and a personality beyond being troublesome cargo. The guards may be concerned, controlling, politically compromised, or simply doing their job; do not predetermine that either side is villainous. The player may help, negotiate, expose the disguise, refuse, or pursue another arrangement.',
    locations: ['a crowded market where a disguised royal asks to share the player’s table as guards approach','a roadside inn whose newest guest is conspicuously bad at pretending to be ordinary','a festival street where a royal escort has just lost track of its charge','a busy ferry landing where an incognito royal needs to leave before the next patrol','a tavern back room where a royal has finally found someone outside the court to ask for help'],
  },
  {
    title: 'The Crown Needs Discretion',
    premise: 'A royal privately asks the player for a personal favor that their ministers must never hear about. Explain the request clearly enough for the player to judge it, and give the royal a specific reason to approach an outsider. The favor may concern family, an old friendship, a private ambition, an embarrassing mistake, or something unexpectedly ordinary. Secrecy does not automatically mean treason or evil. The player can refuse, bargain, help, disclose the request, or find an unconventional solution.',
    locations: ['a quiet palace conservatory after the official audience has ended','a private room above an ordinary inn where a royal has arranged a discreet meeting','a royal chapel temporarily cleared of attendants','a secluded terrace during a crowded court celebration','a hunting lodge where the royal has found a brief escape from their ministers'],
  },
  {
    title: 'Two Heirs, One Throne',
    premise: 'Two adult claimants to a throne independently seek the player’s support while a succession remains unsettled. Make each claimant’s immediate offer, claim, and personal interests understandable without declaring either the rightful or morally superior choice. Both have supporters, strengths, weaknesses, and something concrete the player might want. Support may mean diplomacy, public endorsement, investigation, protection, bargaining, or other action rather than compulsory warfare. The player can back either, play them against each other, propose another outcome, or walk away.',
    locations: ['a royal capital preparing for a succession council','a neutral estate hosting rival claimants and their delegations','a border fortress whose officers have not yet recognized either heir','a court reception where two rival households both request a private conversation','a provincial city whose support could materially affect the succession'],
  },
  {
    title: 'The Unwanted Betrothal',
    premise: 'A marriage between consenting-age adult royals is supposed to secure a political alliance, but someone directly involved wants another outcome and approaches the player. Establish who wants what and what the alliance means in practical terms. Neither prospective spouse must be cruel, helpless, secretly in love, or an obstacle to be killed. Let their own wishes matter. The player may help negotiate, find an alternative alliance, arrange an escape, support the marriage, exploit the dispute, or decline; romance is possible only where mutual interest develops.',
    locations: ['a palace preparing for the formal announcement of a royal engagement','a neutral border estate hosting tense marriage negotiations','a royal wedding celebration several days before the actual vows','a private garden where one prospective spouse has arranged to meet the player','a court banquet where an apparently successful alliance is making its intended couple miserable'],
  },
  {
    title: 'The Monarch Goes Missing',
    premise: 'A monarch has disappeared, and a small circle at court is concealing the absence while seeking help from someone outside its factions. Give the player concrete last-known facts and a clear request rather than a pile of unexplained clues. Do not predetermine whether the monarch was kidnapped, fled, took a private excursion, suffered a mishap, or has another reason for being absent. The player may investigate, negotiate payment, expose the disappearance, exploit the vacancy, or refuse. The court’s cover story and ordinary business continue according to what its people actually know.',
    locations: ['a palace antechamber where an increasingly strained official asks for a private word','a royal hunting lodge whose staff cannot account for their sovereign','a capital preparing for a public appearance the absent monarch cannot currently make','a castle library where the monarch was last reliably seen','a discreet meeting with a chamberlain at an inn beyond the palace district'],
  },
  {
    title: 'An Insult to the Crown',
    premise: 'The player is summoned over an alleged offense against a royal or the crown. State the accusation and the evidence or report behind it plainly; do not invent an unplayed action, insult, or confession by the player as established fact. The allegation may be mistaken, fabricated, technically accurate, or based on something already established in play. Court officials and royals have individual attitudes rather than one unanimous reaction. The player can apologize, contest the accusation, bargain, demand proof, refuse the summons, or deliberately make matters worse, with consequences grounded in what they actually do.',
    locations: ['a palace audience chamber where a formal complaint is about to be heard','a royal magistrate’s office with an unusually prominent complainant','an inn where a royal messenger presents a summons and the stated allegation','a court reception interrupted by a public demand for an explanation','a castle gate where an officer has orders to request the player’s attendance'],
  },
  {
    title: 'The Royal Wants a Day Off',
    premise: 'An adult monarch or heir recruits the player for an outing their security detail would absolutely forbid. The royal wants a real experience beyond their managed public life: an ordinary tavern evening, a festival, a local competition, exploring somewhere interesting, or pursuing a neglected hobby. Give them a distinct personality, some competence, and a reason to choose the player. Fun, friendship, mischief, romance where mutually desired, and ordinary inconvenience are valid developments; do not automatically replace the outing with a kidnapping, coup, or assassination plot. The player can accept, set terms, inform the guards, or decline.',
    locations: ['a palace service gate where an incognito royal is attempting an undignified exit','a festival tavern where the player recognizes a royal trying to order unnoticed','a royal garden where an heir proposes a remarkably poorly authorized excursion','a town market near a royal summer residence','a tournament pavilion where a bored royal has an idea their guards will hate'],
  },
  {
    title: 'The Princess Chose You',
    premise: 'An adult princess deliberately seeks out the player for something personal: companionship beyond court, help pursuing an ambition, or an adventure she has been forbidden to take. She has a distinct personality, useful abilities, responsibilities, preferences, and a concrete reason for choosing this particular person. This Adventure explicitly offers a genuine opportunity for a relationship with her: she begins with sincere personal attraction and curiosity, shows that interest clearly, and responds warmly if the player reciprocates. Do not repeatedly reject reasonable approaches, bury every sign of interest under ambiguous hints, or turn her interest into a recruitment trick, humiliation, secret betrayal, or an unavailable-romance bait and switch. Let mutual interest grow into meaningful courtship and an ongoing relationship through shared experiences; court obligations and differences can create choices without endlessly resetting progress. Her agency and boundaries still matter, and neither the player’s attraction nor acceptance is assumed. Friendship, declining romance, or another alliance are equally valid if that is what the player wants. No mandatory kidnapping, arranged marriage, or rescue is required to bring them together.',
    locations: ['a palace garden where the princess has personally arranged an informal meeting with the player','a court reception where the princess leaves the formal introductions to approach the player herself','a quiet inn terrace where an incognito princess admits she came specifically to meet the player','a royal workshop or library where the princess invites the player to share a personal project','a festival near the royal residence where the princess asks the player to spend the evening with her'],
  },
];

const tones = ['lighthearted and social','warm with room for real stakes','comedic with grounded consequences','adventurous and curious','low-key intrigue','lively and character-driven','strange but welcoming'];
const openingStyles = ['open on dialogue with a stranger','begin during an ordinary social interaction','begin as the player arrives and can freely look around','begin with a small public event already unfolding around the player','begin during food, drink, shopping, travel, or another grounded activity'];

export function prepareSituationAdventure(adventureOrTitle, { deities = [] } = {}) {
  const a = typeof adventureOrTitle === 'string'
    ? ADVENTURES.find(x => x.title === adventureOrTitle)
    : adventureOrTitle;
  if (!a) return null;

  const prepared = { ...a, location: pick(a.locations), tone: pick(tones), openingStyle: pick(openingStyles) };
  const deityCount = adventureDeityCount(a);
  if (!deityCount) return prepared;

  // Reserve all explicit choices before rolling any empty slot, so a random
  // first deity cannot accidentally duplicate the player's chosen second god.
  const choices = Array.from({ length:deityCount }, (_, i) => deities[i] || null);
  const named = choices.filter(Boolean);
  if (new Set(named).size !== named.length || named.some(name => !DIVINE_POWER_OPTIONS.some(d => d.name === name))) return null;
  const reserved = [...named];
  const powers = choices.map(name => {
    const power = name ? { ...DIVINE_POWER_OPTIONS.find(d => d.name === name) } : rollDivinePower(reserved);
    reserved.push(power.name);
    return power;
  });
  const first = powers[0];
  const divineDirective = powers.length === 1
    ? `APP-SELECTED DIVINE POWER: ${first.name} (${first.rank}; ${first.portfolio}). This exact deity is authoritative for this Adventure. Do not substitute a different god.`
    : `APP-SELECTED DIVINE POWERS: ${powers.map(d => `${d.name} (${d.rank}; ${d.portfolio})`).join(' AND ')}. These exact deities are authoritative for this Adventure. Do not substitute different gods.`;

  return {
    ...prepared,
    deity: first,
    deities: powers,
    premise: `${a.premise} ${divineDirective}`,
  };
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

