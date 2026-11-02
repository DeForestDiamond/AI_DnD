import { normalizeWeaponDamage } from '../utils/weaponDamage.js';

const list = value => Array.isArray(value) ? value : [];
const clean = (value, max=400) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const prose = item => ['label','abilities','desc','role','appearance'].map(k=>clean(item?.[k],100000)).filter(Boolean).join('\n');
const pieces = option => list(option.pieces).length ? option.pieces : [option];
const slot = item => (typeof item.slot==='string' ? item.slot.replace(/^ring[12]$/, 'ring') : '') || (item.type === 'armor' ? 'armor' : item.type === 'weapon' ? 'mainhand' : '');
const isBase = item => ['weapon','armor','magic','construct'].includes(item?.type);
const bonuses = value => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return Object.fromEntries(Object.entries(value).filter(([,v])=>finite(v)).map(([k,v])=>[k,Number(v)]));
  return Object.fromEntries([...String(value||'').matchAll(/([a-z][a-z _-]*):\s*([+-]?\d+(?:\.\d+)?)/gi)].map(m=>[m[1].trim().toLowerCase(),Number(m[2])]));
};
const sourceList = refs => list(refs).map(r=>({item:clean(r?.item,300),quote:clean(r?.quote,240)}));
const supported = (refs, sources) => refs.length > 0 && refs.every(r=>r.quote.length >= 4 && sources.some(s=>s.name===r.item && prose(s).includes(r.quote)));

export function itemMetrics(item) {
  const out = [];
  if (finite(item.ac)) out.push(`Base AC ${Number(item.ac)}`);
  if (item.damage) out.push(`Damage ${item.damage}${item.damageBonus ? ` ${Number(item.damageBonus)>=0?'+':''}${item.damageBonus}` : ''}`);
  if (finite(item.bonus) && Number(item.bonus)) out.push(`Weapon enchantment +${item.bonus}`);
  for (const [key,n] of Object.entries(bonuses(item.bonuses))) out.push(`${key.toUpperCase()} ${n>=0?'+':''}${n}`);
  if (finite(item.cr)) out.push(`CR ${item.cr}`);
  return out;
}

export function setMetrics(items) {
  const out = [];
  const armor = items.filter(i=>finite(i.ac));
  if (armor.length) out.push(armor.map(i=>`${i.name}: base AC ${i.ac}`).join('; '));
  const totals = {};
  for (const item of items) for (const [k,n] of Object.entries(bonuses(item.bonuses))) totals[k]=(totals[k]||0)+n;
  if (Object.keys(totals).length) out.push(`Set bonuses: ${Object.entries(totals).map(([k,n])=>`${k.toUpperCase()} ${n>=0?'+':''}${n}`).join(', ')}`);
  const weapons = items.filter(i=>i.damage);
  if (weapons.length) out.push(weapons.map(i=>`${i.name}: ${i.damage}`).join('; '));
  return out; // Do not sum base armor ratings or claim a character's total AC.
}

const numericChange = (base, result, label, old, next) => {
  if (!finite(old)) return null;
  if (!finite(next)) return {kind:'uncertain',ability:label,explanation:`${base.name}: ${label} ${old} is not specified in ${result.name}; preservation is unverified.`,before:[],after:[],numeric:true};
  if (Number(old) === Number(next)) return null;
  return {kind:Number(next)<Number(old)?'weakened':'improved',ability:label,
    explanation:`${result.name}: ${label} ${old} → ${next}${Number(next)<Number(old)?' — confirmed reduction.':'.'}`,before:[],after:[],numeric:true};
};

const diceAverage = dice => {
  const m=String(dice).match(/^(-?)(\d+)d(\d+)$/);
  return m ? (m[1]?-1:1)*Number(m[2])*(Number(m[3])+1)/2 : null;
};
function damageComponents(item) {
  if (!item.damage) return {};
  const w=normalizeWeaponDamage(item);
  const out={};
  const terms=w.damage.match(/[+-]?\d+d\d+/g)||[];
  if (terms.length) out['Base damage average']=terms.reduce((n,t)=>n+(diceAverage(t.replace(/^\+/,''))||0),0)+w.damageBonus;
  for (const extra of w.extras) {
    const n=diceAverage(extra.dice);
    if (n!==null) out[`${extra.type} damage average`]=(out[`${extra.type} damage average`]||0)+n;
  }
  return out;
}

function comparePiece(base, result) {
  const changes = [];
  const add = c => { if(c) changes.push(c); };
  if (base.type === 'armor') {
    add(numericChange(base,result,'Base AC',base.ac,result.ac));
    const addsDex=result.heavy!=null ? !(result.heavy===true||result.heavy==='true') : result.dexBonus;
    if(base.dexBonus===true && addsDex===false) changes.push({kind:'weakened',ability:'Dexterity contribution',explanation:`${result.name}: no longer adds Dexterity to armor protection.`,numeric:true,before:[],after:[]});
    if(base.dexBonus===true && addsDex===true && finite(base.maxDex)&&finite(result.maxDex)) add(numericChange(base,result,'Maximum Dexterity contribution',base.maxDex,result.maxDex));
    if(base.dexBonus===true && addsDex===true && base.maxDex==null&&finite(result.maxDex)) changes.push({kind:'weakened',ability:'Maximum Dexterity contribution',explanation:`${result.name}: uncapped Dexterity contribution → maximum ${result.maxDex}.`,numeric:true,before:[],after:[]});
    if(base.dexBonus===true && addsDex===true && finite(base.maxDex)&&result.maxDex===null) changes.push({kind:'improved',ability:'Maximum Dexterity contribution',explanation:`${result.name}: maximum Dexterity contribution ${base.maxDex} → uncapped.`,numeric:true,before:[],after:[]});
  }
  if (base.type === 'weapon') {
    add(numericChange(base,result,'Weapon enchantment',base.bonus,result.bonus));
    const old=damageComponents(base), next=damageComponents(result);
    for (const [key,n] of Object.entries(old)) add(numericChange(base,result,key,n,next[key]));
    for (const key of ['range','finesse']) if (base[key]!=null && result[key]!=null && base[key]!==result[key]) {
      changes.push({kind:key==='finesse'&&base[key]===true&&result[key]===false?'weakened':'tradeoff',ability:key,explanation:`${result.name}: ${key} ${base[key]} → ${result[key]}.`,before:[],after:[],numeric:true});
    }
  }
  const old=bonuses(base.bonuses), next=bonuses(result.bonuses);
  for (const [key,n] of Object.entries(old)) add(numericChange(base,result,`${key.toUpperCase()} bonus`,n,next[key]));
  for (const [key,n] of Object.entries(next)) if (!(key in old)) changes.push({kind:'added',ability:`${key} bonus`,explanation:`${result.name}: ${key.toUpperCase()} bonus ${n>=0?'+':''}${n} newly specified.`,before:[],after:[],numeric:true});
  return changes;
}

function validateChange(raw, bases, outputs) {
  if (!raw || !['added','improved','weakened','lost','retained','redundant','uncertain','tradeoff'].includes(raw.kind)) return null;
  const before=sourceList(raw.before), after=sourceList(raw.after);
  const hasBefore=supported(before,bases), hasAfter=supported(after,outputs);
  // Any provided citation must check out. Silently exclude invented sources.
  if ((before.length&&!hasBefore)||(after.length&&!hasAfter)) return null;
  let kind=raw.kind;
  if (['improved','retained','redundant'].includes(kind) && (!hasBefore||!hasAfter)) return null;
  if (['added','tradeoff'].includes(kind) && !hasAfter) return null;
  if (['lost','weakened'].includes(kind)) {
    if (!hasBefore) return null;
    // Silence can only establish uncertainty. An explicit limit/removal is
    // necessary for a narrative regression (numeric regressions are local).
    if (!hasAfter || !after.some(r=>/\b(no longer|cannot|can not|only|limited|loses?|removed?|without|instead|requires?|must)\b/i.test(r.quote))) kind='uncertain';
  }
  if (kind==='uncertain'&&!hasBefore) return null;
  let explanation=clean(raw.explanation);
  if (!explanation || !clean(raw.ability)) return null;
  if (kind==='added') {
    const existing=after.flatMap(ref=>bases.filter(base=>prose(base).includes(ref.quote)).map(base=>({item:base.name,quote:ref.quote})));
    if (existing.length===after.length) {
      kind='redundant'; before.push(...existing);
      explanation=`${clean(raw.ability,100)} is already described in the original; this is not additional power.`;
    }
  }
  if (kind==='improved' && before.length===after.length && before.every((ref,i)=>ref.quote===after[i].quote)) {
    kind='retained'; explanation=`${clean(raw.ability,100)} retains the same quoted function; no improvement is established by these excerpts.`;
  }
  return {kind,ability:clean(raw.ability,100),explanation:kind==='uncertain'&&raw.kind!=='uncertain'?`${clean(raw.ability,100)}: omission or restriction needs review; a loss is not confirmed.`:explanation,before,after,numeric:false};
}

// Pure presentation model: never modifies options, originals, costs or inventory.
export function buildCraftingComparison({options=[],materials=[],analysis=null,intent='',originalOptions=options}={}) {
  const inputs=materials.filter(m=>m?.name && m.data).map(m=>({...m.data,name:m.name}));
  const rows=options.map((option,index)=>{
    const sourceIndex=originalOptions.findIndex(o=>o?.name===option.name);
    const candidates=list(analysis?.options).filter(a=>a?.optionIndex===(sourceIndex<0?index:sourceIndex));
    const meta=candidates.length===1?candidates[0]:null;
    const consumed=new Set(list(option.consumes).filter(m=>Number(m.count)>0).map(m=>m.name));
    const outputs=pieces(option);
    const detected=inputs.filter(m=>consumed.has(m.name)&&isBase(m)&&outputs.some(p=>p.type===m.type));
    const baseNames=list(meta?.baseNames).filter(n=>inputs.some(m=>m.name===n&&consumed.has(n)&&prose(m)));
    const bases=inputs.filter(m=>detected.includes(m)||baseNames.includes(m.name));
    const proofs=sourceList(meta?.evidence);
    const hasSummary=supported(proofs,outputs);
    const narrative=list(meta?.changes).slice(0,8).map(c=>validateChange(c,bases,outputs)).filter(Boolean);
    const details=bases.map(base=>{
      const exact=outputs.filter(p=>p.name===base.name);
      const matches=exact.length?exact:outputs.filter(p=>slot(base)&&slot(p)===slot(base)&&p.type===base.type);
      // Matching is one-to-one; never choose arbitrarily among rings/weapons.
      const result=matches.length===1 && bases.filter(b=>slot(b)===slot(base)&&b.type===base.type).length===1 ? matches[0] : exact.length===1?exact[0]:null;
      return {base:base.name,result:result?.name||null,unchanged:result?itemMetrics(base).filter(metric=>itemMetrics(result).includes(metric)).length:0,changes:result?comparePiece(base,result):[{kind:'uncertain',ability:'Piece mapping',explanation:`${base.name}: no unambiguous replacement; compare its original description.`,numeric:true,before:[],after:[]}]};
    });
    const changes=[...details.flatMap(p=>p.changes),...narrative];
    const seen=new Set();
    const unique=changes.filter(c=>{const key=`${c.kind}:${(c.numeric?c.explanation:c.ability).toLowerCase()}`;if(seen.has(key))return false;seen.add(key);return true;});
    return {index,name:option.name,isSet:outputs.length>1,bases:bases.map(b=>b.name),
      focus:hasSummary?clean(meta.focus,160):'',summary:hasSummary?clean(meta.summary,280):'',evidence:hasSummary?proofs:[],
      metrics:outputs.length>1?setMetrics(outputs):itemMetrics(option),
      costs:list(option.consumes).map(m=>({name:m.name,count:finite(m.count)?Number(m.count):1})),count:finite(option.count)?Number(option.count):1,
      unavailable:list(option.unavailable),changes:unique,pieces:details,unchangedStats:details.reduce((n,d)=>n+d.unchanged,0),
      analyzed:Boolean(hasSummary),
      incomplete:list(meta?.changes).length!==narrative.length || !hasSummary,
    };
  });
  const chosen=analysis?.recommendation;
  const winner=Number.isInteger(chosen?.optionIndex)?rows.find(r=>originalOptions[chosen.optionIndex]?.name===r.name):null;
  const recommendationSources=sourceList(chosen?.evidence);
  const safe=rows.length>1 && rows.every(r=>r.analyzed&&!r.incomplete) && clean(chosen?.reason) && supported(recommendationSources,options.flatMap(pieces));
  const recommendation=safe && (chosen.optionIndex===null || (winner&&!winner.unavailable.length&&!winner.changes.some(c=>['lost','weakened','uncertain'].includes(c.kind))))
    ? {index:winner?.index??null,reason:clean(chosen.reason,500),evidence:recommendationSources} : null;
  return {rows,recommendation,intent:clean(intent,500),
    originals:inputs.filter(m=>rows.some(r=>r.bases.includes(m.name))),
    // Same unit counts, no material value assumptions or universal cost ranking.
    costNames:[...new Set(rows.flatMap(r=>r.costs.map(c=>c.name)))],
  };
}
