from pathlib import Path

p = Path('src/constants/adventures.js')
s = p.read_text()
anchor = "  {\n    title: 'Three Gnomes in a Trench Coat',"
if anchor not in s:
    raise SystemExit('Expected final adventure anchor not found')
if "title: 'The Wrong Chosen One'" in s:
    raise SystemExit('Divine adventures already present')
insert_at = s.index('\n];', s.index(anchor))
block = r'''
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
'''
s = s[:insert_at] + block + s[insert_at:]
p.write_text(s)
