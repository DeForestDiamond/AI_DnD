import fs from 'node:fs';

const path = 'src/components/Sidebar.jsx';
let src = fs.readFileSync(path, 'utf8');

const oldHead = `const categorizeItem = (name, data) => {
  const n = name.toLowerCase();
  // 1. Explicit type wins (but magic falls through to name checks for better sorting)
  if (data?.type === 'construct') return 'constructs';
  if (data?.type === 'weapon') return 'weapons';
  if (data?.type === 'armor' || data?.type === 'shield') return 'worn';
  if (data?.type === 'bag') return 'gear';
  if (data?.type === 'consumable' || data?.type === 'potion') return 'consumables';
`;
const newHead = `const categorizeItem = (name, data) => {
  const n = name.toLowerCase();
  const slot = (data?.slot || '').toLowerCase();
  const heldSlots = new Set(['mainhand', 'offhand']);
  const wornSlots = new Set(['armor', 'face', 'head', 'neck', 'shoulders', 'cloak', 'torso', 'arms', 'hands', 'waist', 'ring', 'ring1', 'ring2', 'feet']);

  // Equipment categories trust structured item data, not English words in names.
  // Held equipment (weapons, shields, foci, wands, etc.) lives together.
  if (heldSlots.has(slot)) return 'weapons';
  if (wornSlots.has(slot)) return 'worn';
  if (data?.type === 'construct') return 'constructs';
  if (data?.type === 'weapon' || data?.type === 'shield' || data?.type === 'focus') return 'weapons';
  if (data?.type === 'armor') return 'worn';
  if (data?.type === 'bag') return 'gear';
  if (data?.type === 'consumable' || data?.type === 'potion') return 'consumables';
`;

if (!src.includes(oldHead)) throw new Error('Inventory sort head anchor not found');
src = src.replace(oldHead, newHead);

const weaponFallback = `  // Weapons — THE BIG MISS in the old version (no name fallback existed)\n  if (/\\b(sword|longsword|shortsword|greatsword|broadsword|scimitar|rapier|sabre|saber|katana|falchion|dagger|daggers|knife|knives|dirk|kukri|stiletto|axe|handaxe|greataxe|hatchet|mace|maul|hammer|warhammer|flail|morningstar|club|quarterstaff|staff|spear|lance|pike|halberd|glaive|trident|javelin|bow|longbow|shortbow|crossbow|sling|whip|rod|scythe|sickle|cleaver|blade|pistol|musket|rifle|firearm|hilt)\\b/.test(n)) return 'weapons';\n`;
if (!src.includes(weaponFallback)) throw new Error('Weapon keyword fallback anchor not found');
src = src.replace(weaponFallback, '');

const oldWorn = `  // Worn: armor, shields, jewelry, clothing — anything you put on\n  if (/\\b(armor|armour|mail|chainmail|plate|breastplate|cuirass|brigandine|shield|buckler|helm|helmet|coif|circlet|crown|tiara|diadem|bracer|bracers|vambrace|gauntlet|gauntlets|glove|gloves|greave|greaves|boot|boots|sabaton|pauldron|mantle|cloak|cape|robe|robes|vestment|vestments|dress|outfit|tunic|shirt|vest|jerkin|garb|attire|uniform|belt|girdle|sash|ring|rings|necklace|amulet|pendant|choker|torc|brooch|earring|bracelet|locket|collar|mask|goggles|spectacles|lenses)\\b/.test(n)) return 'worn';\n`;
const newWorn = `  // Worn-name fallback is only for clothing/jewelry that often predates structured slots.\n  // Armor words are intentionally excluded: actual armor must be tagged/typed or slotted.\n  if (/\\b(helm|helmet|coif|circlet|crown|tiara|diadem|bracer|bracers|vambrace|gauntlet|gauntlets|glove|gloves|greave|greaves|boot|boots|sabaton|pauldron|mantle|cloak|cape|robe|robes|vestment|vestments|dress|outfit|tunic|shirt|vest|jerkin|garb|attire|uniform|belt|girdle|sash|ring|rings|necklace|amulet|pendant|choker|torc|brooch|earring|bracelet|locket|collar|mask|goggles|spectacles|lenses)\\b/.test(n)) return 'worn';\n`;
if (!src.includes(oldWorn)) throw new Error('Worn keyword fallback anchor not found');
src = src.replace(oldWorn, newWorn);

fs.writeFileSync(path, src);
console.log('Inventory categorization now trusts equipment slots/types for weapons and armor.');
