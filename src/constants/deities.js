// D&D 5e deities aligned with common clerical domains

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
    name: 'Mystra',
    emoji: '✨',
    alignment: 'Lawful Neutral',
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
    alignment: 'Chaotic Evil',
    domains: ['Trickery', 'Darkness', 'Deception'],
    desc: 'Goddess of darkness, secrets, and loss. Mother of shadows and lies.',
    flavor: 'You draw power from shadow and deception, spreading secrets and chaos in her name.'
  }
];

export const getDeityByName = (name) => DEITIES.find(d => d.name === name);
