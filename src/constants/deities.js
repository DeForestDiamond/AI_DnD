// Forgotten Realms deity choices. Domains are thematic suggestions, not subclass grants.
// Sources: 2014 Basic Rules, Appendix B; Player's Handbook and Sword Coast Adventurer's Guide.
// Alignments describe the deity; they do not restrict the player's character alignment.

export const DEITIES = [
  {
    name: 'Selûne',
    emoji: '🌙',
    alignment: 'Chaotic Good',
    domains: ['Moon', 'Trickery', 'Knowledge'],
    desc: 'Goddess of the moon and navigation. Protects travelers and those lost in darkness.',
    flavor: 'Your faith is guided by the gentle light of the moon, a beacon for wanderers and rebels alike.'
  },
  {
    name: 'Lathander',
    emoji: '☀️',
    alignment: 'Neutral Good',
    domains: ['Life', 'Light', 'Tempest'],
    desc: 'God of dawn, renewal, and new beginnings. Lord of birth and spring.',
    flavor: 'Your devotion to the sun brings hope of renewal and the strength to face each new day.'
  },
  {
    name: 'Tempus',
    emoji: '⚔️',
    alignment: 'Neutral',
    domains: ['War', 'Tempest', 'Strength'],
    desc: 'God of war, battle, and valor. Honored by warriors and soldiers.',
    flavor: 'You channel the warrior spirit, blessed in glorious combat and honorable conflict.'
  },
  {
    name: 'Helm',
    emoji: '🛡️',
    alignment: 'Lawful Neutral',
    domains: ['Life', 'Order', 'Protection'],
    desc: 'God of protection, duty, and watchfulness. The eternal guardian.',
    flavor: 'Your calling is to protect others—a solemn duty you uphold with unwavering resolve.'
  },
  {
    name: 'Tyr',
    emoji: '⚖️',
    alignment: 'Lawful Good',
    domains: ['Order', 'War', 'Justice'],
    desc: 'God of justice, law, and righteous judgment. The Even-Handed judges wrongdoing without fear or favor.',
    flavor: 'You wield divine authority in the pursuit of justice, holding guilty and powerful alike accountable beneath the law.'
  },
  {
    name: 'Mystra',
    emoji: '✨',
    alignment: 'Neutral Good',
    domains: ['Knowledge', 'Magic', 'Trickery'],
    desc: 'Goddess of magic, mysteries, and the weave. Patroness of wizards and spellcasters.',
    flavor: 'You draw divine magic from the very fabric of reality itself.'
  },
  {
    name: 'Bane',
    emoji: '🔥',
    alignment: 'Lawful Evil',
    domains: ['War', 'Tyranny', 'Ambition'],
    desc: 'God of tyranny, strife, and domination. Lord of fear and conflict.',
    flavor: 'Your power comes from conquest and control—you wield divine might to enforce your will.'
  },
  {
    name: 'Shar',
    emoji: '🌑',
    alignment: 'Neutral Evil',
    domains: ['Trickery', 'Darkness', 'Deception'],
    desc: 'Goddess of darkness, secrets, and loss. Mother of shadows and lies.',
    flavor: 'You draw power from shadow and deception, spreading secrets and chaos in her name.'
  },
  {
    name: 'Kelemvor',
    emoji: '⚖️',
    alignment: 'Lawful Neutral',
    domains: ['Death', 'Grave', 'Order'],
    desc: 'God of the dead and the afterlife. Fair judge of souls, enemy of undeath and those who would cheat death.',
    flavor: 'You serve as a guardian of the natural cycle — ensuring the dead find their rest and the undead are destroyed.'
  },
  {
    "name": "Auril",
    "emoji": "❄️",
    "alignment": "Neutral Evil",
    "domains": [
      "Nature",
      "Tempest"
    ],
    "desc": "Winter deity whose worship centers on bitter cold, endurance, and offerings against the killing frost.",
    "flavor": "Your rites acknowledge winter as a power to command or appease."
  },
  {
    "name": "Azuth",
    "emoji": "🪄",
    "alignment": "Lawful Neutral",
    "domains": [
      "Knowledge",
      "Arcana"
    ],
    "desc": "Patron of wizards, spellcraft, and the disciplined study of magic.",
    "flavor": "Your devotion favors careful practice, magical learning, and mastery earned through study."
  },
  {
    "name": "Beshaba",
    "emoji": "🦌",
    "alignment": "Chaotic Evil",
    "domains": [
      "Trickery"
    ],
    "desc": "Mistress of bad luck, feared at crossroads and wherever a single mishap could ruin a life.",
    "flavor": "You work through ill fortune, ominous signs, and the fear of what might go wrong."
  },
  {
    "name": "Bhaal",
    "emoji": "🗡️",
    "alignment": "Neutral Evil",
    "domains": [
      "Death"
    ],
    "desc": "Lord of murder, served by killers and secretive cults that make death an act of worship.",
    "flavor": "Your faith turns deliberate killing into a sacred calling."
  },
  {
    "name": "Chauntea",
    "emoji": "🌾",
    "alignment": "Neutral Good",
    "domains": [
      "Life",
      "Nature"
    ],
    "desc": "Patron of cultivated land, farming communities, and the labor that feeds them.",
    "flavor": "Your sacred work is rooted in planting, nourishment, and the care of living land."
  },
  {
    "name": "Cyric",
    "emoji": "🌀",
    "alignment": "Chaotic Evil",
    "domains": [
      "Trickery"
    ],
    "desc": "A divine patron of lies and treachery whose cults thrive on division and falsehood.",
    "flavor": "Your faith treats certainty as something to undermine and trust as something to exploit."
  },
  {
    "name": "Deneir",
    "emoji": "📜",
    "alignment": "Neutral Good",
    "domains": [
      "Knowledge"
    ],
    "desc": "Patron of scribes, written records, and the preservation of meaning through language.",
    "flavor": "You honor the written word by recording, deciphering, and preserving what others might lose."
  },
  {
    "name": "Eldath",
    "emoji": "💧",
    "alignment": "Neutral Good",
    "domains": [
      "Life",
      "Nature",
      "Peace"
    ],
    "desc": "Goddess of peaceful waters, quiet sanctuaries, and respite from violence.",
    "flavor": "You carry the promise of shelter and stillness into troubled places."
  },
  {
    "name": "Gond",
    "emoji": "⚙️",
    "alignment": "Neutral",
    "domains": [
      "Knowledge",
      "Forge"
    ],
    "desc": "Patron of invention, workshops, and the practical ingenuity of makers.",
    "flavor": "An elegant mechanism or a useful new tool can be an offering as worthy as a prayer."
  },
  {
    "name": "Ilmater",
    "emoji": "🩹",
    "alignment": "Lawful Good",
    "domains": [
      "Life"
    ],
    "desc": "Patron of endurance and those who bear suffering, especially the oppressed and injured.",
    "flavor": "Your calling is to endure hardship and stand beside those who cannot bear it alone."
  },
  {
    "name": "Leira",
    "emoji": "🌫️",
    "alignment": "Chaotic Neutral",
    "domains": [
      "Trickery"
    ],
    "desc": "Goddess of illusion and concealed truth, honored by those who live behind appearances.",
    "flavor": "You explore the distance between what is seen and what is real."
  },
  {
    "name": "Lliira",
    "emoji": "🎉",
    "alignment": "Chaotic Good",
    "domains": [
      "Life"
    ],
    "desc": "Patron of joy, celebration, and the freedom found in dance and revelry.",
    "flavor": "Your worship makes room for delight even when the world offers little reason to celebrate."
  },
  {
    "name": "Loviatar",
    "emoji": "🩸",
    "alignment": "Lawful Evil",
    "domains": [
      "Death"
    ],
    "desc": "Mistress of pain, whose servants cultivate suffering, discipline, and cruel mastery.",
    "flavor": "Pain is central to your rites, whether imposed, endured, or used to bind others to your will."
  },
  {
    "name": "Malar",
    "emoji": "🐾",
    "alignment": "Chaotic Evil",
    "domains": [
      "Nature"
    ],
    "desc": "Divine patron of the savage hunt, predation, and the pursuit of prey.",
    "flavor": "Your faith follows the chase and the triumph of the hunter."
  },
  {
    "name": "Mask",
    "emoji": "🎭",
    "alignment": "Chaotic Neutral",
    "domains": [
      "Trickery"
    ],
    "desc": "Patron of thieves, stealth, and the opportunities hidden in a crowded street or guarded vault.",
    "flavor": "You trust a subtle hand, a concealed route, and the value of remaining unseen."
  },
  {
    "name": "Mielikki",
    "emoji": "🦄",
    "alignment": "Neutral Good",
    "domains": [
      "Nature"
    ],
    "desc": "Protector of forests and a patron of rangers and those who care for woodland life.",
    "flavor": "Your devotion joins wilderness skill with the protection of the forest."
  },
  {
    "name": "Milil",
    "emoji": "🎶",
    "alignment": "Neutral Good",
    "domains": [
      "Light"
    ],
    "desc": "Patron of song, poetry, and performances that give shape to memory and feeling.",
    "flavor": "You carry your faith through stories, music, and the power of a voice heard at the right moment."
  },
  {
    "name": "Myrkul",
    "emoji": "💀",
    "alignment": "Neutral Evil",
    "domains": [
      "Death"
    ],
    "desc": "A death god whose presence is felt in decay, dread, and the certainty of mortality.",
    "flavor": "Your rites give form to the fear that all living things must one day face death."
  },
  {
    "name": "Oghma",
    "emoji": "📚",
    "alignment": "Neutral",
    "domains": [
      "Knowledge"
    ],
    "desc": "Patron of knowledge, ideas, and the discovery and exchange of understanding.",
    "flavor": "You seek answers, preserve learning, and weigh the power of an idea."
  },
  {
    "name": "Savras",
    "emoji": "🔮",
    "alignment": "Lawful Neutral",
    "domains": [
      "Knowledge"
    ],
    "desc": "Patron of divination and fate, consulted by seers searching for what lies ahead.",
    "flavor": "Your devotion follows visions, hidden patterns, and the limits of foresight."
  },
  {
    "name": "Silvanus",
    "emoji": "🌳",
    "alignment": "Neutral",
    "domains": [
      "Nature"
    ],
    "desc": "An ancient power of wild nature, concerned with its balance beyond mortal convenience.",
    "flavor": "You serve the living wilderness and its cycles of growth, predation, and renewal."
  },
  {
    "name": "Sune",
    "emoji": "🌹",
    "alignment": "Chaotic Good",
    "domains": [
      "Life",
      "Light"
    ],
    "desc": "Goddess of beauty and love, honored through affection, artistry, and the appreciation of life.",
    "flavor": "Your worship finds sacred worth in passion, beauty, and bonds freely formed."
  },
  {
    "name": "Talona",
    "emoji": "☠️",
    "alignment": "Chaotic Evil",
    "domains": [
      "Death"
    ],
    "desc": "Patron of poison and disease, feared by communities threatened by sickness and contamination.",
    "flavor": "Your faith works through venom, contagion, and the dread of an unseen affliction."
  },
  {
    "name": "Talos",
    "emoji": "🌩️",
    "alignment": "Chaotic Evil",
    "domains": [
      "Tempest"
    ],
    "desc": "A destructive storm god whose power is felt in lightning, devastation, and sudden ruin.",
    "flavor": "You invoke the storm as a force that shatters what mortals believed secure."
  },
  {
    "name": "Torm",
    "emoji": "🤚",
    "alignment": "Lawful Good",
    "domains": [
      "War",
      "Order"
    ],
    "desc": "Patron of loyalty, duty, courage, and service maintained even at great personal cost.",
    "flavor": "Your faith is expressed through obligations kept and courage in the service of others."
  },
  {
    "name": "Tymora",
    "emoji": "🪙",
    "alignment": "Chaotic Good",
    "domains": [
      "Trickery"
    ],
    "desc": "Lady of good fortune, favored by adventurers, gamblers, and those willing to take a chance.",
    "flavor": "Your devotion embraces bold attempts and the fortunate opening that changes everything."
  },
  {
    "name": "Umberlee",
    "emoji": "🌊",
    "alignment": "Chaotic Evil",
    "domains": [
      "Tempest"
    ],
    "desc": "A dangerous sea goddess whom sailors placate against drowning, storms, and wrecked ships.",
    "flavor": "You know the sea offers passage on its own terms and can claim its due without warning."
  },
  {
    "name": "Waukeen",
    "emoji": "💰",
    "alignment": "Neutral",
    "domains": [
      "Knowledge",
      "Trickery"
    ],
    "desc": "Patron of commerce, bargaining, and the movement of wealth through markets and trade.",
    "flavor": "Your faith lives in negotiated value, enterprise, and the networks that keep goods moving."
  },
  {
    "name": "Asmodeus",
    "emoji": "👑",
    "alignment": "Lawful Evil",
    "domains": [
      "Knowledge",
      "Order",
      "Trickery"
    ],
    "desc": "Divine ruler of the Nine Hells, associated with indulgence, infernal hierarchy, and binding bargains.",
    "flavor": "You serve infernal authority through calculated ambition, exact terms, and promises with a price."
  },
  {
    "name": "Bahamut",
    "emoji": "🐲",
    "alignment": "Lawful Good",
    "domains": [
      "Life",
      "War"
    ],
    "desc": "The Platinum Dragon, a patron of metallic dragons, justice, and protection.",
    "flavor": "You honor strength used with wisdom and the defense of those threatened by tyranny."
  },
  {
    "name": "Tiamat",
    "emoji": "🐉",
    "alignment": "Lawful Evil",
    "domains": [
      "Trickery",
      "War"
    ],
    "desc": "The five-headed Dragon Queen, revered for chromatic draconic power, greed, and domination.",
    "flavor": "Your devotion seeks treasure, supremacy, and the recognition owed to overwhelming power."
  },
  {
    "name": "Corellon Larethian",
    "emoji": "🌟",
    "alignment": "Chaotic Good",
    "domains": [
      "Light",
      "Arcana"
    ],
    "desc": "An elven deity of artistry and magic, celebrated for creativity and freedom of expression.",
    "flavor": "Your worship finds expression in spellcraft, art, and the refusal to let beauty become static."
  },
  {
    "name": "Deep Sashelas",
    "emoji": "🐬",
    "alignment": "Chaotic Good",
    "domains": [
      "Nature",
      "Tempest"
    ],
    "desc": "An elven sea god associated with aquatic life and the communities beneath the waves.",
    "flavor": "You honor the depths through knowledge of their creatures, currents, and hidden settlements."
  },
  {
    "name": "Eilistraee",
    "emoji": "🌙",
    "alignment": "Chaotic Good",
    "domains": [
      "Life",
      "Light",
      "Nature"
    ],
    "desc": "A drow goddess of moonlight, song, and freedom, offering a path beyond Lolth and life beneath her rule.",
    "flavor": "Your faith is carried in dance, open skies, and a welcome for those seeking another way."
  },
  {
    "name": "Garl Glittergold",
    "emoji": "💎",
    "alignment": "Lawful Good",
    "domains": [
      "Trickery"
    ],
    "desc": "A gnome deity of cleverness, humor, and the ingenuity that helps a community survive.",
    "flavor": "Your devotion values the well-timed trick and the wit that protects rather than merely impresses."
  },
  {
    "name": "Gruumsh",
    "emoji": "👁️",
    "alignment": "Chaotic Evil",
    "domains": [
      "Tempest",
      "War"
    ],
    "desc": "An orc war god whose worship emphasizes conquest, strength, and relentless conflict.",
    "flavor": "You answer a divine demand to seize territory and prevail through strength."
  },
  {
    "name": "Kurtulmak",
    "emoji": "⛏️",
    "alignment": "Lawful Evil",
    "domains": [
      "War"
    ],
    "desc": "A kobold deity of war, survival, and bitter rivalry, honored in defended tunnels and warrens.",
    "flavor": "Your faith prizes collective effort, prepared defenses, and vengeance against old enemies."
  },
  {
    "name": "Lolth",
    "emoji": "🕷️",
    "alignment": "Chaotic Evil",
    "domains": [
      "Trickery"
    ],
    "desc": "The Spider Queen, whose cults pursue power through intrigue, rivalry, and ruthless control.",
    "flavor": "Your devotion moves through webs of ambition, dangerous tests, and shifting alliances."
  },
  {
    "name": "Maglubiyet",
    "emoji": "🪓",
    "alignment": "Lawful Evil",
    "domains": [
      "War"
    ],
    "desc": "A conquering goblinoid god whose worship demands obedience and victory in war.",
    "flavor": "Your sacred order is built through disciplined conquest and service to a relentless war machine."
  },
  {
    "name": "Moradin",
    "emoji": "⚒️",
    "alignment": "Lawful Good",
    "domains": [
      "Knowledge",
      "Forge"
    ],
    "desc": "The dwarven Soul Forger, patron of craftsmanship, creation, and the endurance of dwarven communities.",
    "flavor": "You honor your faith through sound work, enduring bonds, and what you leave strong for those who follow."
  },
  {
    "name": "Sehanine Moonbow",
    "emoji": "🌌",
    "alignment": "Chaotic Good",
    "domains": [
      "Knowledge",
      "Twilight"
    ],
    "desc": "An elven goddess associated with dreams, moonlit mysteries, and journeys beyond mortal life.",
    "flavor": "You attend to dreams, veiled paths, and the passage from one state of being to another."
  },
  {
    "name": "Yondalla",
    "emoji": "🏡",
    "alignment": "Lawful Good",
    "domains": [
      "Life"
    ],
    "desc": "A halfling goddess of protection, plenty, and the security of home and community.",
    "flavor": "Your worship guards the hearth and the small acts of care that make a home endure."
  },
];

export const getDeityByName = (name) => DEITIES.find(d => d.name === name);

// Search the same catalog in creation and multiclass/import pickers.
export const filterDeities = (options, query = '') => {
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return options.filter(option => {
    const text = normalize([option.name, option.alignment, ...(option.domains || []), option.desc].join(' '));
    return terms.every(term => text.includes(term));
  });
};
