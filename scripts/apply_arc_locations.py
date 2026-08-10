from pathlib import Path


def replace_once(path, old, new):
    p=Path(path); s=p.read_text()
    if old not in s: raise SystemExit(f'Missing pattern in {path}: {old[:80]!r}')
    p.write_text(s.replace(old,new,1))

# encounters: authoritative location resolution lives beside antagonist rolling.
p=Path('src/constants/encounters.js'); s=p.read_text()
marker='export const rollAntagonist = (level, exclude = null, defeated = []) => {'
if marker not in s: raise SystemExit('rollAntagonist marker missing')
block=r'''// ── Arc locations ──────────────────────────────────────────────────────────────
// The app owns WHERE an arc happens just as it owns WHO the antagonist is.
// Locations are resolved once when an arc is created and then saved on char.arc.
// Generic Faerûn threats normally use a sensible pool; 5% of the time they use
// the unrestricted pool and the DM must explain the weird result in-world.
export const FAERUN_LOCATION_POOLS = {
  general: ['Waterdeep','Neverwinter','Baldur’s Gate','Luskan','The Dalelands','Cormyr','The High Forest','The Sword Mountains','The Moonshae Isles','Chult','Calimshan','Thay','Icewind Dale','Anauroch','The Underdark'],
  urban: ['Waterdeep','Neverwinter','Baldur’s Gate','Luskan','Silverymoon','Elturel','Athkatla','Suzail','Neverwinter Wood settlements','The Dalelands'],
  coastal: ['The Sword Coast','Luskan','Waterdeep','Baldur’s Gate','The Moonshae Isles','The Nelanther Isles','The Sea of Fallen Stars','The Trackless Sea coast','Chult'],
  wilderness: ['The High Forest','Neverwinter Wood','The Sword Mountains','The Spine of the World','The Dalelands','Chult','The Moonshae Isles','Icewind Dale','Anauroch','The Trollbark Forest'],
  ruins: ['Anauroch','The High Forest','The Dalelands','Chult','The Sword Mountains','The Mere of Dead Men','The Underdark','Thay','The Moonshae Isles'],
  underdark: ['The Underdark','Menzoberranzan’s outskirts','Gracklstugh’s tunnels','The Northdark','The Upperdark beneath the Sword Coast'],
};

const FIXED_ARC_LOCATIONS = new Map([
  // Named/canonical Realms antagonists.
  ['Xanathar, the beholder crime lord of Waterdeep','Waterdeep'],
  ['Manshoon, the Zhentarim founder — and his clones','Waterdeep'],
  ['Claugiyliamatar, "Old Gnawbone", the green dragon of Kryptgarden Forest','Kryptgarden Forest'],
  ['Klauth, "Old Snarl", the ancient red dragon of the Sword Coast North','Klauthen Vale'],
  ['Szass Tam, lich and Zulkir of Necromancy, ruler of Thay','Thay'],
  ['Halaster Blackcloak, the mad archmage of Undermountain','Undermountain'],
  ["Larloch, the Shadow King, demilich of Warlock's Crypt","Warlock’s Crypt"],
  ['Iymrith, the ancient blue dragon of Anauroch','Anauroch'],
  ['Zariel, Archduchess of Avernus, and her Blood War legions','Avernus'],
  // Explicit planar arcs.
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
  const fixed=FIXED_ARC_LOCATIONS.get(antagonist);
  if (fixed) return fixed;
  // Some planar concepts are broad enough to infer safely from their own name.
  const a=String(antagonist).toLowerCase();
  if (/archfey|fey court|wild hunt/.test(a)) return 'Feywild';
  if (/githyanki/.test(a)) return 'Astral Plane';
  if (/efreeti/.test(a)) return 'Elemental Plane of Fire';
  if (/dao architect/.test(a)) return 'Elemental Plane of Earth';
  if (/slaad/.test(a)) return 'Limbo';
  if (/modron/.test(a)) return 'Mechanus';

  const poolName=locationPoolFor(antagonist);
  const sensible=FAERUN_LOCATION_POOLS[poolName] || FAERUN_LOCATION_POOLS.general;
  const pool=Math.random() < 0.05 ? FAERUN_LOCATION_POOLS.general : sensible;
  return pick(pool);
};

export const makeArc = (antagonist) => ({ antagonist, arcLocation: resolveArcLocation(antagonist) });
export const rollArc = (level, exclude = null, defeated = []) => {
  const antagonist=rollAntagonist(level, exclude, defeated);
  return makeArc(antagonist);
};

'''
s=s.replace(marker,block+marker,1); p.write_text(s)

# Save schema version.
replace_once('src/constants/progression.js','export const SAVE_VERSION = 17;','export const SAVE_VERSION = 18;')

# useCharacter: new arc creation + migration.
p=Path('src/hooks/useCharacter.js'); s=p.read_text()
s=s.replace("import { rollAntagonist } from '../constants/encounters.js';","import { rollArc, resolveArcLocation } from '../constants/encounters.js';")
s=s.replace('c.arc = { antagonist: rollAntagonist(c.level, finished, defeated) };','c.arc = rollArc(c.level, finished, defeated);')
# Insert migration immediately before final version stamp, regardless of intervening migrations.
stamp='  c._v = SAVE_VERSION;'
if stamp not in s: raise SystemExit('migration version stamp missing')
mig="""  if (v < 18) {\n    // Arc destinations became authoritative save state in v18. Existing active\n    // arcs get one location now; once the migrated save is written it never rerolls.\n    if (c.arc?.antagonist && !c.arc.arcLocation) {\n      c.arc = { ...c.arc, arcLocation: resolveArcLocation(c.arc.antagonist) };\n      notes.push(`Arc location assigned: ${c.arc.arcLocation}`);\n    }\n  }\n"""
s=s.replace(stamp,mig+stamp,1); p.write_text(s)

# App: fresh adventure arcs use rollArc instead of a bare antagonist.
p=Path('src/App.jsx'); s=p.read_text()
s=s.replace("import { rollAntagonist, encounterChance, rollEncounterDirective, PACING_ORDER } from './constants/encounters.js';","import { rollArc, encounterChance, rollEncounterDirective, PACING_ORDER } from './constants/encounters.js';")
# All fresh-arc constructions in App have this shape.
s=s.replace('{ antagonist: rollAntagonist(', 'rollArc(')
# close the object wrapper created by the old shape: rollAntagonist(args) } -> rollArc(args)
s=s.replace(') }\n', ')\n') if False else s
# targeted common forms, discovered by grep in CI if anything remains.
s=s.replace('rollArc(c.level) }', 'rollArc(c.level)')
s=s.replace('rollArc(char.level) }', 'rollArc(char.level)')
s=s.replace('rollArc(character.level) }', 'rollArc(character.level)')
p.write_text(s)

# Prompt: include destination and tell DM to build a route, not teleport.
p=Path('src/hooks/useGame.js'); s=p.read_text()
needle='ACTIVE ARC ANTAGONIST (HIDDEN — never name or reveal them directly until the story does): ${char.arc.antagonist}.\n'
if needle not in s: raise SystemExit('arc prompt marker missing')
addition=needle + 'ARC LOCATION (HIDDEN CAMPAIGN STATE): ${char.arc.arcLocation || \'Faerûn\'}. This is where the assigned antagonist arc ultimately leads. If the player is not there, progressively provide believable clues and ways to reach it — roads, ships, guides, portals, spells, NPC knowledge, or other setting-appropriate travel. Never teleport or railroad the player there. If the location seems bizarre for the antagonist, MAKE THE COMBINATION MAKE SENSE IN-WORLD rather than changing either fact.\n'
s=s.replace(needle,addition,1); p.write_text(s)

# Sanity checks before build.
assert 'rollAntagonist(' not in Path('src/hooks/useCharacter.js').read_text()
assert 'arcLocation' in Path('src/hooks/useGame.js').read_text()
assert 'SAVE_VERSION = 18' in Path('src/constants/progression.js').read_text()
print('arc-location patch applied')
