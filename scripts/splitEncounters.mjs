import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const root = process.cwd();
const srcPath = path.join(root,'src/constants/encounters.js');
const src = fs.readFileSync(srcPath,'utf8');
if (!src.includes('export const FAERUN_LOCATION_POOLS') || !src.includes('const SOCIAL_BY_ENV = {') || !src.includes('const WEIRD_BY_ENV = {') || !src.includes('export const rollEncounterDirective')) {
  throw new Error('encounters.js does not match expected monolith; refusing to split');
}
const lines = src.split(/\r?\n/);
const slice = (a,b) => lines.slice(a-1,b).join('\n');
const outDir = path.join(root,'src/constants/encounters');
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});

const tmpPath = path.join(root,'.encounters-snapshot.mjs');
fs.writeFileSync(tmpPath, src + '\nexport { HOSTILE, SOCIAL_BY_ENV, WEIRD_BY_ENV, NPC_RACES, NPC_RACES_BY_ENV, NATIVE_ONLY_ENVIRONMENTS };\n');
const snap = await import(pathToFileURL(tmpPath).href + `?t=${Date.now()}`);
fs.unlinkSync(tmpPath);

const write=(rel,body)=>{const p=path.join(outDir,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body.trimEnd()+'\n');};
const js=(v)=>JSON.stringify(v,null,2);

write('antagonists.js', `const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];\n\n${slice(6,190)}\n\n${slice(309,333)}`);
write('arcLocations.js', `import { rollAntagonist } from './antagonists.js';\n\nconst pick = (arr) => arr[Math.floor(Math.random() * arr.length)];\n\n${slice(192,307)}`);
write('pacing.js', slice(335,396));

const envs = Object.keys(snap.SOCIAL_BY_ENV);
const planar = new Set(['avernus','feywild','astral','shadowfell','fire','water','air','earth','limbo','mechanus','sigil','hells','abyss','hades','gehenna','carceri','arborea','ysgard','celestia','elysium','ethereal']);
const pathFor = (env) => {
  if (['wilderness','city','ocean','underdark'].includes(env)) return `environments/faerun/${env}.js`;
  if (env === 'avernus') return 'environments/nineHells/avernus.js';
  if (env === 'hells') return 'environments/nineHells/general.js';
  if (['fire','water','air','earth'].includes(env)) return `environments/elemental/${env}.js`;
  return `environments/${env}.js`;
};

const hostileByOwner = Object.fromEntries(envs.map(e=>[e,[]]));
const faerunCommon=[];
for (const entry of snap.HOSTILE) {
  const p = (entry.env || []).find(e=>planar.has(e));
  if (p) hostileByOwner[p].push(entry);
  else faerunCommon.push(entry);
}
write('environments/faerun/common.js', `export const hostile = ${js(faerunCommon)};`);

for (const env of envs) {
  const hostile = hostileByOwner[env] || [];
  write(pathFor(env), `export const hostile = ${js(hostile)};\n\nexport const social = ${js(snap.SOCIAL_BY_ENV[env] || [])};\n\nexport const weird = ${js(snap.WEIRD_BY_ENV[env] || [])};`);
}

const importRows=[];
const objRows=[];
for (const env of envs) {
  const id = env.replace(/[^a-zA-Z0-9]/g,'_');
  const rel = './' + path.relative(path.join(outDir,'environments'), path.join(outDir,pathFor(env))).replace(/\\/g,'/');
  importRows.push(`import * as ${id} from '${rel}';`);
  objRows.push(`  ${JSON.stringify(env)}: ${id},`);
}
write('environments/index.js', `${importRows.join('\n')}\nimport { hostile as faerunCommonHostile } from './faerun/common.js';\n\nconst ENV = {\n${objRows.join('\n')}\n};\n\nexport const HOSTILE = [faerunCommonHostile, ...Object.values(ENV).map(e => e.hostile || [])].flat();\nexport const SOCIAL_BY_ENV = Object.fromEntries(Object.entries(ENV).map(([k,v]) => [k, v.social || []]));\nexport const WEIRD_BY_ENV = Object.fromEntries(Object.entries(ENV).map(([k,v]) => [k, v.weird || []]));`);

const npcSlice = slice(1615,1639)
  .replace('const NPC_RACES =', 'export const NPC_RACES =')
  .replace('const NPC_RACES_BY_ENV =', 'export const NPC_RACES_BY_ENV =')
  .replace('const rollNpcDescriptor =', 'export const rollNpcDescriptor =')
  .replace('const NATIVE_ONLY_ENVIRONMENTS =', 'export const NATIVE_ONLY_ENVIRONMENTS =');
write('npcRaces.js', `const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];\n\n${npcSlice}`);

const rollBlock = slice(1594,1613) + '\n\n' + slice(1641,1681);
write('roller.js', `import { HOSTILE, SOCIAL_BY_ENV, WEIRD_BY_ENV } from './environments/index.js';\nimport { encounterCRCap } from './pacing.js';\nimport { rollNpcDescriptor, NATIVE_ONLY_ENVIRONMENTS } from './npcRaces.js';\n\nconst pick = (arr) => arr[Math.floor(Math.random() * arr.length)];\n\n${rollBlock}`);

write('index.js', `export {\n  antagonistsForLevel, rollAntagonist, NAMED_ANTAGONISTS\n} from './antagonists.js';\nexport {\n  FAERUN_LOCATION_POOLS, resolveArcLocation, makeArc, rollArc\n} from './arcLocations.js';\nexport {\n  PACING, PACING_ORDER, ENVIRONMENTS, encounterChance, encounterCRCap\n} from './pacing.js';\nexport { rollEncounterDirective } from './roller.js';`);

fs.writeFileSync(srcPath, `// Compatibility barrel: encounter data now lives in ./encounters/.\nexport * from './encounters/index.js';\n`);

const ownedCount = faerunCommon.length + Object.values(hostileByOwner).flat().length;
if (ownedCount !== snap.HOSTILE.length) throw new Error(`Hostile table count changed: ${snap.HOSTILE.length} -> ${ownedCount}`);
console.log(`Split encounters.js into ${envs.length} environment modules plus managers.`);
console.log(`Hostile count preserved: ${ownedCount}`);
