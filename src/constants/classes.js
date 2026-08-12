import { EMPTY_SLOTS } from './items.js';

export const CLASSES = [
  { name:'Fighter',     emoji:'⚔️',  desc:'Strong warrior, great with weapons and armor. Best for beginners.',                                                                                              stats:{str:16,dex:12,con:14,int:10,wis:10,cha:8 } },
  { name:'Wizard',      emoji:'🔮',  desc:'Casts powerful spells. Fragile but devastating from a distance.',                                                                                               stats:{str:8, dex:14,con:10,int:17,wis:12,cha:10} },
  { name:'Rogue',       emoji:'🗡️',  desc:'Sneaky and quick. Deals huge damage from the shadows.',                                                                                                        stats:{str:10,dex:17,con:12,int:12,wis:10,cha:14} },
  { name:'Cleric',      emoji:'✨',  desc:'Holy warrior devoted to a deity. Heal, fight, and channel divine power. Choose a god to serve during creation.',                                                stats:{str:14,dex:10,con:13,int:10,wis:16,cha:12} },
  { name:'Artificer',   emoji:'⚙️',  desc:'Master of magical invention. Uses INT for combat and spellcasting. Infuses items with magic and wields arcane firearms.',                                      stats:{str:8, dex:13,con:12,int:17,wis:10,cha:10} },
  { name:'Illrigger',   emoji:'😈',  desc:'Infernal knight pledged to an archdevil. Places hellfire seals on enemies and burns them for devastating damage. STR or DEX primary, CHA secondary.',          stats:{str:16,dex:12,con:14,int:8, wis:10,cha:14} },
  { name:'Monk',        emoji:'👊',  desc:'Disciplined martial artist who channels Ki energy. Fast, precise, and deadly with unarmed strikes and finesse weapons. DEX and WIS primary.',                   stats:{str:10,dex:17,con:13,int:10,wis:15,cha:8 } },
  { name:'Barbarian',   emoji:'🪓',  desc:'Savage warrior who enters a primal Rage. Massive HP, brutal STR damage, and damage resistance while raging. Nearly impossible to kill.',                       stats:{str:17,dex:12,con:16,int:8, wis:10,cha:10} },
  { name:'Warlock',     emoji:'🌑',  desc:'Wielder of eldritch power granted by a dark patron. CHA-based blasts and curses. Choose a patron during creation — your power comes with a price.',            stats:{str:8, dex:13,con:12,int:12,wis:10,cha:17} },
  { name:'Blood Hunter', emoji:'🩸', desc:'Monster slayer who brands enemies with Crimson Rites, spending their own HP to imbue weapons with elemental power. CON and STR primary. Dark and relentless.', stats:{str:15,dex:12,con:16,int:10,wis:12,cha:8 } },
  { name:'Paladin',     emoji:'🛡️',  desc:'Holy knight sworn to a deity and an oath. Smites enemies with divine power, heals with a touch, and radiates protective auras. STR and CHA primary.', stats:{str:16,dex:10,con:14,int:8, wis:10,cha:14} },
  { name:'Ranger',      emoji:'🏹',  desc:'Wilderness hunter and tracker. Marks prey, strikes from range or blade, and bends nature magic to the hunt. DEX and WIS primary.',                 stats:{str:10,dex:17,con:13,int:10,wis:14,cha:8 } },
  { name:'Sorcerer',    emoji:'🔥',  desc:'Innate arcane caster who channels raw magic from their bloodline. CHA-based spellcasting with Metamagic to bend spells to their will. Fragile but flexible.', stats:{str:8, dex:14,con:13,int:10,wis:11,cha:17} },
  { name:'Druid',       emoji:'🍃',  desc:'Guardian of the natural world, wielding primal magic. WIS-based spellcasting and Wild Shape to transform into beasts.',                                       stats:{str:10,dex:14,con:14,int:10,wis:17,cha:8 } },
  { name:'Bard',        emoji:'🎵',  desc:'Versatile performer and full spellcaster. Inspires allies, masters skills, and bends magic through force of personality. CHA primary.', stats:{str:8, dex:14,con:12,int:10,wis:10,cha:17} },
  { name:'Monster Hunter', emoji:'🗡️', desc:'Specialist in hunting supernatural threats. Studies weaknesses, prepares tools and traps, and turns monster lore into lethal precision. DEX and WIS primary.', stats:{str:10,dex:17,con:14,int:12,wis:15,cha:8 } },
  { name:'Gunslinger',  emoji:'🔫',  desc:'Deadly firearm specialist who wins through speed, precision, trick shots, and nerve. DEX primary, WIS secondary.', stats:{str:8, dex:17,con:14,int:10,wis:14,cha:10} },
];

export const RACES = [
  { name:'Human',      emoji:'👤', desc:'Adaptable and ambitious. +2 Strength, +1 Constitution.',                                                                                                                bonus:{str:2,dex:0,con:1,int:0,wis:0,cha:0} },
  { name:'Elf',        emoji:'🧝', desc:'Graceful and perceptive. +2 Dexterity, +1 Intelligence.',                                                                                                             bonus:{str:0,dex:2,con:0,int:1,wis:0,cha:0} },
  { name:'Dwarf',      emoji:'⛏️', desc:'Tough and resilient. +2 Constitution, +1 Strength.',                                                                                                                  bonus:{str:1,dex:0,con:2,int:0,wis:0,cha:0} },
  { name:'Halfling',   emoji:'🍀', desc:'Lucky and nimble. +2 Dexterity, +1 Charisma.',                                                                                                                       bonus:{str:0,dex:2,con:0,int:0,wis:0,cha:1} },
  { name:'Tiefling',   emoji:'😈', desc:'Infernal heritage — born with devil\'s blood. Darkvision, fire resistance, and natural dark magic. +2 Charisma, +1 Intelligence.',                                    bonus:{str:0,dex:0,con:0,int:1,wis:0,cha:2} },
  { name:'Shadar-kai', emoji:'🌑', desc:'Shadow-touched elves from the Shadowfell. Necrotic resistance, Blessing of the Raven Queen teleport, and supernatural calm. +2 Dexterity, +1 Wisdom.',               bonus:{str:0,dex:2,con:0,int:0,wis:1,cha:0} },
  { name:'Half-Elf',   emoji:'🧬', desc:'Born of two worlds — human ambition and elven grace. Darkvision, Fey Ancestry (charm resistance), and a free +1 to any two stats of your choice. +1 Charisma, +1 Dexterity, +1 Wisdom.', bonus:{str:0,dex:1,con:0,int:0,wis:1,cha:1} },
  { name:'Half-Orc',   emoji:'💪', desc:'Fierce and relentless. Relentless Endurance lets you survive a killing blow once per rest. Savage Attacks add an extra weapon die on crits. +2 Strength, +1 Constitution.', bonus:{str:2,dex:0,con:1,int:0,wis:0,cha:0} },
  { name:'Gnome',      emoji:'🔬', desc:'Small but brilliant. Gnome Cunning grants advantage on all INT, WIS, and CHA saves vs. magic. Tinker proficiency. +2 Intelligence, +1 Constitution.',                 bonus:{str:0,dex:0,con:1,int:2,wis:0,cha:0} },
  { name:'Dragonborn', emoji:'🐉', desc:'Draconic heritage runs through your veins. Choose a color — each grants a breath weapon and elemental resistance. Commanding presence. +2 Strength, +1 Charisma.',    bonus:{str:2,dex:0,con:0,int:0,wis:0,cha:1} },
  { name:'Aasimar',    emoji:'😇', desc:'Celestial lineage — touched by divine light. Healing Hands, Darkvision, and Radiant Soul form that adds radiant damage and grants flight. +2 Charisma, +1 Wisdom.',   bonus:{str:0,dex:0,con:0,int:0,wis:1,cha:2} },
  { name:'Githyanki',  emoji:'⚔️', desc:'Astral warriors bred to hunt mind flayers. Psionic abilities, martial training, and Astral Knowledge for situational expertise. Proud and ruthless. +2 Strength, +1 Intelligence.', bonus:{str:2,dex:0,con:0,int:1,wis:0,cha:0} },
  { name:'Astral Elf', emoji:'✨', desc:'Elves who dwelt on the Astral Plane near their gods, their souls touched by divine light. Astral Fire cantrip, Fey Ancestry, Starlight Step teleport, and Astral Trance for shifting proficiencies. +2 Dexterity, +1 Wisdom.', bonus:{str:0,dex:2,con:0,int:0,wis:1,cha:0} },
  { name:'Reborn', emoji:'🪦', desc:'Those who died and yet still live, carrying memories from a past life. Deathless Nature (no need to eat, drink, or breathe; advantage on death saves) and Knowledge from a Past Life. +2 Constitution, +1 Intelligence.', bonus:{str:0,dex:0,con:2,int:1,wis:0,cha:0} },
  { name:'Kalashtar', emoji:'🌙', desc:'A compound people born of humanity bonded with renegade spirits from the plane of dreams. Dual Mind, psychic resistance, telepathic Mind Link, and immunity to dream magic. +2 Wisdom, +1 Charisma.', bonus:{str:0,dex:0,con:0,int:0,wis:2,cha:1} },
  { name:'Dhampir', emoji:'🧛', desc:'Living people cursed with vampiric hunger and prowess. Darkvision, Spider Climb, a life-draining Vampiric Bite, and a trace of undeath. +2 Dexterity, +1 Constitution.', bonus:{str:0,dex:2,con:1,int:0,wis:0,cha:0} },
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
  Fighter:      { slots:{ ...EMPTY_SLOTS, mainhand:'Shortsword', offhand:'Shield', armor:'Chain Shirt' },  inventory:['Torch','Rations','Rations','Rations'] },
  Wizard:       { slots:{ ...EMPTY_SLOTS, mainhand:'Dagger' },                                             inventory:['Spellbook','Arcane Focus','Torch','Rations','Rations','Rations'] },
  Rogue:        { slots:{ ...EMPTY_SLOTS, mainhand:'Shortsword' },                                         inventory:['Dagger','Hunting Knife','Thieves\' Tools','Torch','Rations','Rations','Rations'] },
  Cleric:       { slots:{ ...EMPTY_SLOTS, mainhand:'Mace', offhand:'Shield' },                             inventory:['Holy Symbol','Torch','Rations','Rations','Rations'] },
  Artificer:    { slots:{ ...EMPTY_SLOTS, mainhand:'Arcane Pistol' },                                      inventory:['Thieves\' Tools','Tinker\'s Tools','Component Pouch','Torch','Rations','Rations','Rations'] },
  Illrigger:    { slots:{ ...EMPTY_SLOTS, mainhand:'Longsword', armor:'Chain Shirt' },                     inventory:['Javelin','Javelin','Javelin','Javelin','Javelin','Torch','Rations','Rations','Rations'] },
  Monk:         { slots:{ ...EMPTY_SLOTS, mainhand:'Shortsword' },                                         inventory:[...Array(10).fill('Dart'),'Meditation Beads','Rations','Rations','Rations'] },
  Barbarian:    { slots:{ ...EMPTY_SLOTS, mainhand:'Greataxe', armor:'Hide Armor' },                       inventory:['Handaxe','Handaxe','Torch','Rations','Rations','Rations'] },
  Warlock:      { slots:{ ...EMPTY_SLOTS, mainhand:'Dagger' },                                             inventory:['Arcane Focus','Component Pouch','Torch','Rations','Rations','Rations'] },
  'Blood Hunter': { slots:{ ...EMPTY_SLOTS, mainhand:'Longsword', armor:'Studded Leather' },               inventory:['Hunter\'s Kit','Torch','Rations','Rations','Rations'] },
  Paladin:      { slots:{ ...EMPTY_SLOTS, mainhand:'Longsword', offhand:'Shield', armor:'Chain Mail' },     inventory:['Holy Symbol','Javelin','Javelin','Javelin','Javelin','Javelin','Torch','Rations','Rations','Rations'] },
  Ranger:       { slots:{ ...EMPTY_SLOTS, mainhand:'Longbow', armor:'Studded Leather' },                      inventory:['Shortsword','Shortsword','Hunter\'s Kit','Torch','Rations','Rations','Rations'] },
  Sorcerer:     { slots:{ ...EMPTY_SLOTS, mainhand:'Dagger' },                                             inventory:['Arcane Focus','Component Pouch','Torch','Rations','Rations','Rations'] },
  Druid:        { slots:{ ...EMPTY_SLOTS, mainhand:'Quarterstaff', offhand:'Shield' },                     inventory:['Druidic Focus','Herbalism Kit','Torch','Rations','Rations','Rations'] },
  Bard:         { slots:{ ...EMPTY_SLOTS, mainhand:'Rapier', armor:'Leather Armor' },                    inventory:['Lute','Dagger','Torch','Rations','Rations','Rations'] },
  'Monster Hunter': { slots:{ ...EMPTY_SLOTS, mainhand:'Longsword', armor:'Studded Leather' },                  inventory:['Hand Crossbow',"Hunter's Kit",'Torch','Rations','Rations','Rations'] },
  Gunslinger:    { slots:{ ...EMPTY_SLOTS, mainhand:'Pistol', armor:'Leather Armor' },                         inventory:['Dagger','Gunsmith Tools','Torch','Rations','Rations','Rations'] },
};
