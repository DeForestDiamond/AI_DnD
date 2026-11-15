import { stackNames } from '../utils/itemStacks.js';

const nameKey = value => String(value || '').trim().toLowerCase();
const labelKey = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

// Provider results may repeat a material across sources. A different label is
// a different variant, never a reason to concatenate properties onto all units.
export const stackSalvageRecoveries = recoveries => {
  const groups = new Map();
  for (const row of recoveries || []) {
    const name = String(row.salvageOriginalName || row.name || '').trim();
    if (!name) continue;
    const label = labelKey(row.label);
    const key = JSON.stringify([nameKey(name), label]);
    const count = Math.max(1, Number(row.count) || 1);
    if (groups.has(key)) groups.get(key).count += count;
    else groups.set(key, {name, count, label:label || null});
  }
  return [...groups.values()];
};

const plainMaterial = item => !item || (
  (!item.type || item.type === 'misc') &&
  !['damage','ac','bonuses','bonus','contents','slot'].some(key => item[key] && (typeof item[key] !== 'object' || Object.keys(item[key]).length))
);

// Reserve the global item namespace, including stash, bag contents and gear.
// Names are case-insensitive because the item parser treats them that way.
export const prepareSalvageNames = (result, character) => {
  const registry = new Map(Object.entries(character.items || {}).map(([name,item])=>[nameKey(name),{name,item}]));
  const reserve = name => {
    if (name && !registry.has(nameKey(name))) registry.set(nameKey(name),{name,item:null});
  };
  [...stackNames(character.inventory),...stackNames(character.stash),...Object.values(character.slots || {}),
    ...Object.values(character.companions || {}).flatMap(c=>Object.values(c.slots || {})),
    ...Object.values(character.items || {}).flatMap(item=>item.type === 'bag' ? Object.keys(item.contents || {}) : [])].forEach(reserve);
  const recovers = stackSalvageRecoveries(result.recovers).map(row=>{
    const base = row.name;
    const matches = entry => plainMaterial(entry.item) && labelKey(entry.item?.label) === labelKey(row.label);
    const existing = registry.get(nameKey(base));
    let name = existing && matches(existing) ? existing.name : base;
    if (!existing || !matches(existing)) {
      // Reuse an already-numbered matching variant before filling a free hole.
      const variants = [...registry.values()].filter(entry=>{
        const prefix = nameKey(base) + ' (';
        const suffix = nameKey(entry.name).slice(prefix.length);
        return nameKey(entry.name).startsWith(prefix) && /^[1-9]\d*\)$/.test(suffix);
      }).sort((a,b)=>Number(a.name.match(/\((\d+)\)$/)[1])-Number(b.name.match(/\((\d+)\)$/)[1]));
      const matching = variants.find(matches);
      if (matching) name = matching.name;
      else if (existing) {
        let index=1;
        while (registry.has(nameKey(`${base} (${index})`))) index++;
        name=`${base} (${index})`;
      }
    }
    if (!registry.has(nameKey(name))) registry.set(nameKey(name),{name,item:{type:'misc',label:row.label}});
    return {...row,name,salvageOriginalName:base};
  });
  return {...result,recovers};
};

export const originalSalvageNames = result => ({...result,recovers:(result.recovers || []).map(row=>({...row,name:row.salvageOriginalName || row.name}))});
