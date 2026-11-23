import { getFeat, featName, hasFeat } from '../constants/feats.js';
import { statMod } from '../hooks/character/stats.js';
import { reconcileHp } from '../hooks/character/items.js';

export const earnedFeatSlots = char => {
  const slots = [];
  if (char.race?.name === 'Human') slots.push({id:'Human:1',label:'Human bonus feat'});
  const levels = Object.keys(char.classLevels || {}).length ? char.classLevels : {[char.cls?.name]:char.level || 1};
  for(const [cls,level] of Object.entries(levels)) {
    if (!cls || cls === 'undefined') continue;
    const milestones = cls === 'Fighter' ? [4,6,8] : cls === 'Rogue' ? [4,8,10] : [4,8];
    for(const at of milestones) if(level >= at) slots.push({id:`${cls}:${at}`,label:`${cls} level ${at}`});
  }
  return slots;
};
export const normalizeFeatRecords = char => {
  const slots=earnedFeatSlots(char), used=new Set(), seen=new Set();
  return (Array.isArray(char.feats) ? char.feats : []).flatMap(record=>{
    const name=featName(record);
    if(typeof name !== 'string' || !name.trim() || seen.has(name.toLowerCase())) return [];
    seen.add(name.toLowerCase());
    const entry=typeof record === 'string' ? {name} : {...record};
    const source=entry.source && !used.has(entry.source) ? entry.source : slots.find(slot=>!used.has(slot.id))?.id;
    if(source) used.add(source);
    return [{...entry,name:getFeat(name)?.name || name,source:source || null}];
  });
};
export const availableFeatSlots = char => {
  const used=new Set(normalizeFeatRecords(char).map(f=>f.source));
  return earnedFeatSlots(char).filter(slot=>!used.has(slot.id));
};
const canCast = char => {
  const levels=Object.keys(char.classLevels || {}).length ? char.classLevels : {[char.cls?.name]:char.level};
  return Object.entries(levels).some(([cls,n])=>n >= (['Paladin','Ranger'].includes(cls)?2:1) && ['Artificer','Bard','Cleric','Druid','Paladin','Ranger','Sorcerer','Warlock','Wizard'].includes(cls)) ||
    Boolean(char.abilities?.cantrips?.length || char.abilities?.spells?.length || hasFeat(char,'Magic Initiate') || hasFeat(char,'Ritual Caster')) ||
    ['Elf','Sun Elf','Moon Elf','Tiefling','Cambion','Aasimar','Astral Elf','Githyanki'].includes(char.race?.name);
};
export const featPrerequisite = (char,feat) => {
  if(feat.spellcasting && !canCast(char)) return 'Requires the ability to cast at least one spell.';
  if(feat.minStats) for(const [stat,value] of Object.entries(feat.minStats)) if((char.stats?.[stat] || 0)<value) return `Requires ${stat.toUpperCase()} ${value}.`;
  if(feat.eitherStats && !Object.entries(feat.eitherStats).some(([stat,value])=>(char.stats?.[stat] || 0)>=value)) return 'Requires Intelligence or Wisdom 13.';
  return '';
};
export const chooseFeat = (char,{name,source,ability,choices=''}) => {
  const feat=getFeat(name);
  if(!feat) throw new Error('Choose a listed feat.');
  if(hasFeat(char,feat.name)) throw new Error('This feat is already selected.');
  if(!availableFeatSlots(char).some(slot=>slot.id === source)) throw new Error('That feat pick is not available.');
  const reason=featPrerequisite(char,feat);
  if(reason) throw new Error(reason);
  if(feat.abilityOptions && !feat.abilityOptions.includes(ability)) throw new Error('Choose the feat’s ability score.');
  const selection=String(choices).trim();
  if(feat.choiceLabel && !selection) throw new Error(`Choose ${feat.choiceLabel.toLowerCase()}.`);
  if(feat.choiceOptions && !feat.choiceOptions.includes(selection)) throw new Error('Choose a valid feat option.');
  const abilityIncrease=feat.abilityOptions && Number(char.stats[ability])<20 ? 1 : 0;
  const stats={...char.stats,...(abilityIncrease ? {[ability]:char.stats[ability]+1} : {})};
  const next={...char,stats,feats:[...normalizeFeatRecords(char),{name:feat.name,source, ...(feat.abilityOptions ? {ability,abilityIncrease} : {}),...(selection ? {choices:selection} : {})}],
    maxHp:char.maxHp + (statMod(stats.con)-statMod(char.stats.con)) * char.level};
  return reconcileHp(char,next);
};
export const removeFeat = (char,name) => {
  const records=normalizeFeatRecords(char), removing=records.find(f=>f.name === name);
  if(!removing) throw new Error('That feat is not selected.');
  const stats={...char.stats};
  if(removing.ability && removing.abilityIncrease) stats[removing.ability]-=removing.abilityIncrease;
  const next={...char,stats,feats:records.filter(f=>f !== removing),maxHp:char.maxHp+(statMod(stats.con)-statMod(char.stats.con))*char.level};
  for(const record of next.feats) {
    const feat=getFeat(record.name);
    if(feat && featPrerequisite(next,feat)) throw new Error(`Remove ${record.name} first; it depends on this feat’s benefits.`);
  }
  return reconcileHp(char,next);
};
export const reconcileFeatSources = char => {
  const earned=new Set(earnedFeatSlots(char).map(slot=>slot.id));
  const records=normalizeFeatRecords(char), stats={...char.stats};
  const feats=records.filter(record=>{
    if(!record.source || earned.has(record.source)) return true;
    if(record.ability && record.abilityIncrease) stats[record.ability]-=record.abilityIncrease;
    return false;
  });
  return {...char,stats,feats};
};
