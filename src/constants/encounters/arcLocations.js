import { rollAntagonist } from './antagonists.js';

// ── Arc locations ──────────────────────────────────────────────────────────────
// Only required or player-selected destinations belong in arcLocation.
// Flexible arcs retain their localArea without rolling a new travel destination.
export const FAERUN_LOCATION_POOLS = {
  // Available opening locations and explicit player destination choices.
  general: [
    'Waterdeep','Neverwinter','Baldur’s Gate','Luskan','Silverymoon','Elturel','Daggerford','Mirabar','Longsaddle','Yartar','Triboar',
    'The Dalelands','Shadowdale','Mistledale','Cormyr','Suzail','Arabel','Marsember','Sembia','Selgaunt','The Moonsea','Hillsfar','Mulmaster','Zhentil Keep',
    'The High Forest','Neverwinter Wood','The Sword Mountains','The Spine of the World','The Western Heartlands','The Trollbark Forest','The Mere of Dead Men',
    'The Moonshae Isles','The Nelanther Isles','The Pirate Isles','The Sea of Fallen Stars','The Trackless Sea coast','The Dragon Coast','The Vilhon Reach','Turmish',
    'Amn','Athkatla','Tethyr','Darromar','Calimshan','Calimport','Memnon','The Lake of Steam','The Border Kingdoms','Halruaa','Lantan',
    'Chult','Port Nyanzaru','The Shaar','The Great Rift','The Eastern Shaar','Dambrath','The Shining South',
    'Thay','Eltabbar','Bezantur','Rashemen','Immilmar','Aglarond','Velprintalar','The Yuirwood','Thesk','The Great Dale','Damara','Vaasa','The Vast',
    'Mulhorand','Skuld, City of Shadows','Unther','Chessenta','Cimbar','The Old Empires','The Hordelands','The Endless Wastes',
    'Icewind Dale','Ten-Towns','The Great Glacier','Anauroch','The High Ice','The Underdark','The Northdark'
  ],
  urban: [
    'Waterdeep','Neverwinter','Baldur’s Gate','Luskan','Silverymoon','Elturel','Mirabar','Suzail','Arabel','Marsember','Selgaunt','Hillsfar','Mulmaster','Zhentil Keep',
    'Athkatla','Darromar','Calimport','Memnon','Port Nyanzaru','Eltabbar','Bezantur','Immilmar','Velprintalar','Skuld, City of Shadows','Cimbar','Ten-Towns'
  ],
  coastal: [
    'The Sword Coast','Luskan','Waterdeep','Neverwinter','Baldur’s Gate','The Moonshae Isles','The Nelanther Isles','The Pirate Isles','The Sea of Fallen Stars',
    'The Trackless Sea coast','The Dragon Coast','The Vilhon Reach','Turmish','Athkatla','Calimport','Memnon','The Lake of Steam','Lantan','Chult','Port Nyanzaru',
    'Aglarond','Velprintalar','Bezantur','Mulhorand','Skuld, City of Shadows','Unther','Chessenta','Cimbar'
  ],
  wilderness: [
    'The High Forest','Neverwinter Wood','The Sword Mountains','The Spine of the World','The Dalelands','The Western Heartlands','The Trollbark Forest','The Mere of Dead Men',
    'The Moonshae Isles','Chult','The Shaar','The Great Rift','The Eastern Shaar','Dambrath','Rashemen','The Yuirwood','The Great Dale','Damara','Vaasa','The Vast',
    'The Hordelands','The Endless Wastes','Icewind Dale','The Great Glacier','Anauroch','The High Ice','Cormyr','Thesk','Mulhorand'
  ],
  ruins: [
    'Anauroch','The High Forest','The Dalelands','Chult','The Sword Mountains','The Mere of Dead Men','The Underdark','Thay','The Moonshae Isles','The Shaar',
    'The Great Rift','Dambrath','Mulhorand','The Old Empires','Unther','Chessenta','The Great Dale','Vaasa','The Hordelands','The High Ice','Warlock’s Crypt'
  ],
  underdark: [
    'The Underdark','Menzoberranzan’s outskirts','Gracklstugh’s tunnels','The Northdark','The Upperdark beneath the Sword Coast','The Deep Wastes',
    'The Underdark beneath Anauroch','The Underdark beneath the Dalelands','The Underdark beneath Thay','The Underdark beneath the Old Empires'
  ],
};
export const FIXED_ARC_LOCATIONS = new Map([
  ['Xanathar, the beholder crime lord of Waterdeep','Waterdeep'],
  ['Manshoon, the Zhentarim founder — and his clones','Waterdeep'],
  ['Claugiyliamatar, "Old Gnawbone", the green dragon of Kryptgarden Forest','Kryptgarden Forest'],
  ['Klauth, "Old Snarl", the ancient red dragon of the Sword Coast North','Klauthen Vale'],
  ['Szass Tam, lich and Zulkir of Necromancy, ruler of Thay','Thay'],
  ['Halaster Blackcloak, the mad archmage of Undermountain','Undermountain'],
  ["Larloch, the Shadow King, demilich of Warlock's Crypt","Warlock’s Crypt"],
  ['Iymrith, the ancient blue dragon of Anauroch','Anauroch'],
  ['Zariel, Archduchess of Avernus, and her Blood War legions','Avernus'],
  ['Vlaakith CLVII, lich-queen of the githyanki and ruler of Tu’narath','Astral Plane'],
  ['Orcus, Demon Prince of Undeath, wielder of the Wand of Orcus','Abyss'],
  ['Demogorgon, Prince of Demons, the two-headed terror of the Abyss','Abyss'],
  ['Graz’zt, the Dark Prince, schemer and ruler of Azzagrat','Abyss'],
  ['Juiblex, the Faceless Lord, Demon Prince of Slimes and Oozes','Abyss'],
  ['Mephistopheles, Archduke of Cania and master of hellfire','Cania, the Eighth Hell'],
  ['Asmodeus, Lord of the Nine Hells','Nessus, the Ninth Hell'],
  ['Gromph Baenre, archmage of Menzoberranzan','Menzoberranzan'],
  ['Arkhan the Cruel, dragonborn champion of Tiamat bearing the Hand of Vecna','Avernus'],
  ["a githyanki lich-queen's fleet in the Astral",'Astral Plane'],
  ['the corpse of a dead god, and what is nesting inside it','Astral Plane'],
  ['a Far Realm intrusion that should not have a shape','Far Realm'],
  ['a fomorian raiding party hunting escaped servants through the Feywild','Feywild'],
  ['an azersmith whose stolen forge-heart is destabilizing the Plane of Fire','Elemental Plane of Fire'],
  ['an archfey court waging a succession war that is rewriting the Feywild around it','Feywild'],
  ['a shadow dragon carving a kingdom out of the Shadowfell','Shadowfell'],
  ['a death giant harvesting souls for a fortress in the Shadowfell','Shadowfell'],
  ['a leviathan elemental awakening in the Plane of Water','Elemental Plane of Water'],
  ['an elder tempest turning the Plane of Air into a continent-spanning storm','Elemental Plane of Air'],
  ['a zaratan carrying an enemy fortress across the Plane of Earth','Elemental Plane of Earth'],
  ['an infernal duke building an illegal fortress between layers of the Nine Hells','Nine Hells'],
  ['a death slaad gathering fragments of a chaos artifact in Limbo','Limbo'],
  ['a githzerai anarch whose fortress has become a weapon in Limbo','Limbo'],
  ['a titan in Carceri trying to trade an entire kingdom for its freedom','Carceri'],
  ['a yugoloth army turning Gehenna into the staging ground for a private planar war','Gehenna'],
  ['an empyrean exile trying to conquer a realm in Ysgard','Ysgard'],
  ['a fallen celestial building a false paradise on Mount Celestia’s border','Mount Celestia'],
  ['a radiant idol demanding worship in Arborea and punishing cities that refuse','Arborea'],
  ['an ancient sphinx moving its temple through the Outlands and rewriting history with every stop','Outlands'],
  ['a spelljammer armada blockading the Astral routes between divine realms','Astral Plane'],
]);
export const locationPoolFor = (antagonist) => {
  const a=String(antagonist||'').toLowerCase();
  if (/pirate|smuggl|kraken|coast|sail|ship|press gang/.test(a)) return 'coastal';
  if (/thieves|official|merchant|sheriff|moneylender|crime|counterfeit|protection racket|town|city|infiltration/.test(a)) return 'urban';
  if (/duergar|umber hulk|mine|underdark/.test(a)) return 'underdark';
  if (/necroman|grave|tomb|ruin|cult|lich|dead|wight|ghoul/.test(a)) return 'ruins';
  if (/wolf|owlbear|boar|spider|harpy|dragon|giant|roc|wyvern|bulette|hydra|behir|remorhaz|worg|gorgon|chimera/.test(a)) return 'wilderness';
  return 'general';
};
export const fixedArcLocationFor = (antagonist) => FIXED_ARC_LOCATIONS.get(antagonist) || null;

export const ARC_LOCATION_CHOICES = [...new Set([
  ...FAERUN_LOCATION_POOLS.general,
  'Feywild','Shadowfell','Astral Plane','Nine Hells','Avernus','Cania, the Eighth Hell','Nessus, the Ninth Hell',
  'Abyss','Hades, the Gray Waste','Gehenna','Carceri','Mechanus','Limbo','Outlands','Mount Celestia','Arborea','Ysgard',
  'Elemental Plane of Fire','Elemental Plane of Water','Elemental Plane of Air','Elemental Plane of Earth','Ethereal Plane',
  'Positive Plane','Negative Plane','Domains of Dread','Far Realm','Demiplane'
])].sort((a,b)=>a.localeCompare(b));

export const arcLocationOptionsFor = (antagonist) => {
  const fixed = fixedArcLocationFor(antagonist);
  if (fixed) return [fixed];
  const sensible = FAERUN_LOCATION_POOLS[locationPoolFor(antagonist)] || FAERUN_LOCATION_POOLS.general;
  return [...new Set([...sensible, ...ARC_LOCATION_CHOICES])];
};

export const resolveArcLocation = (antagonist, override = null) => {
  if (!antagonist) return null;
  const fixed = fixedArcLocationFor(antagonist);
  if (fixed) return fixed;
  return override && String(override).trim() ? String(override).trim() : null;
};

export const makeArc = (antagonist, arcLocationOverride = null, currentLocation = '') => ({
  antagonist,
  arcLocation: resolveArcLocation(antagonist, arcLocationOverride),
  localArea: String(currentLocation || '').trim(),
});
export const rollArc = (level, exclude = null, defeated = [], currentLocation = '') => {
  const antagonist = rollAntagonist(level, exclude, defeated);
  return makeArc(antagonist, null, currentLocation);
};

