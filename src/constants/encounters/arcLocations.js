import { rollAntagonist } from './antagonists.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Arc locations ──────────────────────────────────────────────────────────────
// The app owns WHERE an arc happens just as it owns WHO the antagonist is.
// Resolve once when the arc is created; char.arc.arcLocation is then save state.
export const FAERUN_LOCATION_POOLS = {
  // Broad continental pool used for ordinary arcs and the 5% chaos roll.
  // Mix regions and specific destinations so campaigns actually cross Faerûn.
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
const FIXED_ARC_LOCATIONS = new Map([
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
  ['a shadar-kai raiding party out of the Shadowfell','Shadowfell'],
  ['an archdevil moving pieces through mortal proxies','Nine Hells'],
  ["a demon lord's vanguard testing a way through",'Abyss'],
  ['a darklord extending their domain past its borders','Domains of Dread'],
]);
const locationPoolFor = (antagonist) => {
  const a=String(antagonist||'').toLowerCase();
  if (/pirate|smuggl|kraken|coast|sail|ship|press gang/.test(a)) return 'coastal';
  if (/thieves|official|merchant|sheriff|moneylender|crime|counterfeit|protection racket|town|city|infiltration/.test(a)) return 'urban';
  if (/duergar|umber hulk|mine|underdark/.test(a)) return 'underdark';
  if (/necroman|grave|tomb|ruin|cult|lich|dead|wight|ghoul/.test(a)) return 'ruins';
  if (/wolf|owlbear|boar|spider|harpy|dragon|giant|roc|wyvern|bulette|hydra|behir|remorhaz|worg|gorgon|chimera/.test(a)) return 'wilderness';
  return 'general';
};
export const resolveArcLocation = (antagonist) => {
  if (!antagonist) return null;
  const fixed=FIXED_ARC_LOCATIONS.get(antagonist); if (fixed) return fixed;
  const a=String(antagonist).toLowerCase();
  if (/archfey|fey court|wild hunt/.test(a)) return 'Feywild';
  if (/night hag|gray waste/.test(a)) return 'Hades, the Gray Waste';
  if (/pit fiend|erinyes|infernal duke|devil contract/.test(a)) return 'Nine Hells';
  if (/balor|marilith|demon prince|demon cult/.test(a)) return 'Abyss';
  if (/city of brass|efreeti|azersmith|phoenix/.test(a)) return 'Elemental Plane of Fire';
  if (/dao|zaratan|xorn/.test(a)) return 'Elemental Plane of Earth';
  if (/marid|leviathan elemental/.test(a)) return 'Elemental Plane of Water';
  if (/djinni|elder tempest/.test(a)) return 'Elemental Plane of Air';
  if (/shadow dragon|death giant|shadar-kai|shadow demon/.test(a)) return 'Shadowfell';
  if (/fomorian|satyr revel|eladrin war-host|primordial hag/.test(a)) return 'Feywild';
  if (/astral dreadnought|astral pirate|astral lich|githyanki warlord|spelljammer armada/.test(a)) return 'Astral Plane';
  if (/slaad|githzerai/.test(a)) return 'Limbo';
  if (/modron|inevitable|marut/.test(a)) return 'Mechanus';
  if (/carceri|gehreleth/.test(a)) return 'Carceri';
  if (/gehenna|ultroloth|yugoloth/.test(a)) return 'Gehenna';
  if (/empyrean exile/.test(a)) return 'Ysgard';
  if (/mount celestia|fallen celestial|corrupted celestial/.test(a)) return 'Mount Celestia';
  if (/arborea|radiant idol/.test(a)) return 'Arborea';
  if (/outlands|rilmani|gate-town|sphinx moving/.test(a)) return 'Outlands';
  if (/ethereal/.test(a)) return 'Ethereal Plane';
  if (/negative plane|nightwalker/.test(a)) return 'Negative Plane';
  if (/living demiplane/.test(a)) return 'Demiplane';
  if (/githyanki/.test(a)) return 'Astral Plane';
  if (/efreeti/.test(a)) return 'Elemental Plane of Fire';
  if (/dao architect/.test(a)) return 'Elemental Plane of Earth';
  if (/slaad/.test(a)) return 'Limbo';
  if (/modron/.test(a)) return 'Mechanus';
  const sensible=FAERUN_LOCATION_POOLS[locationPoolFor(antagonist)] || FAERUN_LOCATION_POOLS.general;
  // 5% chaos roll: occasionally a weird location wins and the DM explains why.
  return pick(Math.random() < 0.05 ? FAERUN_LOCATION_POOLS.general : sensible);
};
export const makeArc = (antagonist) => ({ antagonist, arcLocation: resolveArcLocation(antagonist) });
export const rollArc = (level, exclude = null, defeated = []) => {
  const antagonist=rollAntagonist(level, exclude, defeated);
  return makeArc(antagonist);
};
