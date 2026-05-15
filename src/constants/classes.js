import { EMPTY_SLOTS } from './items.js';

export const CLASSES = [
  { name:'Fighter',   emoji:'⚔️', desc:'Strong warrior, great with weapons and armor. Best for beginners.',        stats:{str:16,dex:12,con:14,int:10,wis:10,cha:8 } },
  { name:'Wizard',    emoji:'🔮', desc:'Casts powerful spells. Fragile but devastating from a distance.',           stats:{str:8, dex:14,con:10,int:17,wis:12,cha:10} },
  { name:'Rogue',     emoji:'🗡️', desc:'Sneaky and quick. Deals huge damage from the shadows.',                    stats:{str:10,dex:17,con:12,int:12,wis:10,cha:14} },
  { name:'Cleric',    emoji:'✨', desc:'Holy warrior devoted to a deity. Heal, fight, and channel divine power. Choose a god to serve during creation.',                      stats:{str:14,dex:10,con:13,int:10,wis:16,cha:12} },
  { name:'Artificer',  emoji:'⚙️', desc:'Master of magical invention. Uses INT for combat and spellcasting. Infuses items with magic and wields arcane firearms.', stats:{str:8, dex:13,con:12,int:17,wis:10,cha:10} },
  { name:'Illrigger',  emoji:'😈', desc:'Infernal knight pledged to an archdevil. Places hellfire seals on enemies and burns them for devastating damage. STR or DEX primary, CHA secondary.', stats:{str:16,dex:12,con:14,int:8, wis:10,cha:14} },
];

export const RACES = [
  { name:'Human',      emoji:'👤', desc:'Adaptable and ambitious. +2 Strength, +1 Constitution.',                                                                                          bonus:{str:2,dex:0,con:1,int:0,wis:0,cha:0} },
  { name:'Elf',        emoji:'🧝', desc:'Graceful and perceptive. +2 Dexterity, +1 Intelligence.',                                                                                        bonus:{str:0,dex:2,con:0,int:1,wis:0,cha:0} },
  { name:'Dwarf',      emoji:'⛏️', desc:'Tough and resilient. +2 Constitution, +1 Strength.',                                                                                             bonus:{str:1,dex:0,con:2,int:0,wis:0,cha:0} },
  { name:'Halfling',   emoji:'🍀', desc:'Lucky and nimble. +2 Dexterity, +1 Charisma.',                                                                                                  bonus:{str:0,dex:2,con:0,int:0,wis:0,cha:1} },
  { name:'Tiefling',   emoji:'😈', desc:'Infernal heritage — born with devil\'s blood. Darkvision, fire resistance, and natural dark magic. +2 Charisma, +1 Intelligence.',               bonus:{str:0,dex:0,con:0,int:1,wis:0,cha:2} },
  { name:'Shadar-kai', emoji:'🌑', desc:'Shadow-touched elves from the Shadowfell. Necrotic resistance, Blessing of the Raven Queen teleport, and supernatural calm. +2 Dexterity, +1 Wisdom.', bonus:{str:0,dex:2,con:0,int:0,wis:1,cha:0} },
];

export const STAT_NAMES = {
  str:'Strength', dex:'Dexterity', con:'Constitution',
  int:'Intelligence', wis:'Wisdom', cha:'Charisma',
};

export const STAT_DESC = {
  str:'Physical power — melee attacks',
  dex:'Agility — dodging, stealth',
  con:'Toughness — hit points',
  int:'Smarts — magic power',
  wis:'Awareness — perception',
  cha:'Personality — persuasion',
};

export const STARTING_GEAR = {
  Fighter:   { slots:{ ...EMPTY_SLOTS, mainhand:'Shortsword', offhand:'Shield', armor:'Chain Shirt' },  inventory:['Torch','Rations x3'] },
  Wizard:    { slots:{ ...EMPTY_SLOTS, mainhand:'Dagger' },                                             inventory:['Spellbook','Arcane Focus','Torch','Rations x3'] },
  Rogue:     { slots:{ ...EMPTY_SLOTS, mainhand:'Shortsword' },                                         inventory:['Dagger','Hunting Knife','Thieves\' Tools','Torch','Rations x3'] },
  Cleric:    { slots:{ ...EMPTY_SLOTS, mainhand:'Mace', offhand:'Shield' },                             inventory:['Holy Symbol','Torch','Rations x3'] },
  Artificer:  { slots:{ ...EMPTY_SLOTS, mainhand:'Arcane Pistol' },                                      inventory:['Thieves\' Tools','Tinker\'s Tools','Component Pouch','Torch','Rations x3'] },
  Illrigger:  { slots:{ ...EMPTY_SLOTS, mainhand:'Longsword', armor:'Chain Shirt' },                      inventory:['Javelin x5','Torch','Rations x3'] },
};
