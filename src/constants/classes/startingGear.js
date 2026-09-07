import { EMPTY_SLOTS } from '../items.js';

export const STARTING_GEAR = {
  Fighter: { slots:{ ...EMPTY_SLOTS, mainhand:'Shortsword', offhand:'Shield', armor:'Chain Shirt' }, inventory:['Torch','Rations','Rations','Rations'] },
  Wizard: { slots:{ ...EMPTY_SLOTS, mainhand:'Dagger' }, inventory:['Spellbook','Arcane Focus','Torch','Rations','Rations','Rations'] },
  Rogue: { slots:{ ...EMPTY_SLOTS, mainhand:'Shortsword' }, inventory:['Dagger','Hunting Knife','Thieves\' Tools','Torch','Rations','Rations','Rations'] },
  Cleric: { slots:{ ...EMPTY_SLOTS, mainhand:'Mace', offhand:'Shield' }, inventory:['Holy Symbol','Torch','Rations','Rations','Rations'] },
  Artificer: { slots:{ ...EMPTY_SLOTS, mainhand:'Arcane Pistol' }, inventory:['Thieves\' Tools','Tinker\'s Tools','Component Pouch','Torch','Rations','Rations','Rations'] },
  Illrigger: { slots:{ ...EMPTY_SLOTS, mainhand:'Longsword', armor:'Chain Shirt' }, inventory:['Javelin','Javelin','Javelin','Javelin','Javelin','Torch','Rations','Rations','Rations'] },
  Monk: { slots:{ ...EMPTY_SLOTS, mainhand:'Shortsword' }, inventory:[...Array(10).fill('Dart'),'Meditation Beads','Rations','Rations','Rations'] },
  Barbarian: { slots:{ ...EMPTY_SLOTS, mainhand:'Greataxe', armor:'Hide Armor' }, inventory:['Handaxe','Handaxe','Torch','Rations','Rations','Rations'] },
  Warlock: { slots:{ ...EMPTY_SLOTS, mainhand:'Dagger' }, inventory:['Arcane Focus','Component Pouch','Torch','Rations','Rations','Rations'] },
  'Blood Hunter': { slots:{ ...EMPTY_SLOTS, mainhand:'Longsword', armor:'Studded Leather' }, inventory:['Hunter\'s Kit','Torch','Rations','Rations','Rations'] },
  Paladin: { slots:{ ...EMPTY_SLOTS, mainhand:'Longsword', offhand:'Shield', armor:'Chain Mail' }, inventory:['Holy Symbol','Javelin','Javelin','Javelin','Javelin','Javelin','Torch','Rations','Rations','Rations'] },
  Ranger: { slots:{ ...EMPTY_SLOTS, mainhand:'Longbow', armor:'Studded Leather' }, inventory:['Shortsword','Shortsword','Hunter\'s Kit','Torch','Rations','Rations','Rations'] },
  Sorcerer: { slots:{ ...EMPTY_SLOTS, mainhand:'Dagger' }, inventory:['Arcane Focus','Component Pouch','Torch','Rations','Rations','Rations'] },
  Druid: { slots:{ ...EMPTY_SLOTS, mainhand:'Quarterstaff', offhand:'Shield' }, inventory:['Druidic Focus','Herbalism Kit','Torch','Rations','Rations','Rations'] },
  Bard: { slots:{ ...EMPTY_SLOTS, mainhand:'Rapier', armor:'Leather Armor' }, inventory:['Lute','Dagger','Torch','Rations','Rations','Rations'] },
  'Monster Hunter': { slots:{ ...EMPTY_SLOTS, mainhand:'Longsword', armor:'Studded Leather' }, inventory:['Hand Crossbow',"Hunter's Kit",'Torch','Rations','Rations','Rations'] },
  Gunslinger: { slots:{ ...EMPTY_SLOTS, mainhand:'Pistol', armor:'Leather Armor' }, inventory:['Dagger','Gunsmith Tools','Torch','Rations','Rations','Rations'] },
};
