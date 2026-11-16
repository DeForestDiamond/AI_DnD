import { useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';
import { RACES, CLASSES, STAT_NAMES } from '../../constants/classes.js';
import { DEITIES } from '../../constants/deities.js';
import { WARLOCK_PATRONS } from './DeityModal.jsx';
import { EMPTY_CHAR } from '../../hooks/character/defaults.js';
import { levelUpsAvailable } from '../../hooks/character/stats.js';
import { ABILITY_KEYS, effectiveMaxHp } from '../../hooks/character/items.js';
import { CARRY_OPTIONS, buildCharacterRevision, startingStats } from '../../helpers/characterTools.js';

export function CharacterToolsModal({ character, onClose, onApply, onExport }) {
  const [source] = useState(()=>structuredClone(character));
  const [mode, setMode] = useState('edit');
  const [draft, setDraft] = useState(()=>structuredClone(source));
  const [keep, setKeep] = useState({});
  const [keepXp, setKeepXp] = useState(true);
  const [resetLevels, setResetLevels] = useState(false);
  const [startingGear, setStartingGear] = useState(false);
  const [error, setError] = useState('');
  const rebuilding = mode !== 'edit' || resetLevels || draft.cls?.name !== source.cls?.name;
  const changeMode = value => {
    setMode(value); setResetLevels(false); setKeepXp(value !== 'fresh'); setStartingGear(value === 'fresh'); setError('');
    const base = value === 'fresh' ? {...structuredClone(EMPTY_CHAR),race:RACES[0],cls:CLASSES[0]} : structuredClone(source);
    if (value !== 'edit') base.stats = startingStats(base.race, base.cls);
    setDraft(base);
  };
  const changeRace = race => setDraft(d=>({...d,race,stats:rebuilding ? startingStats(race,d.cls) : Object.fromEntries(ABILITY_KEYS.map(key=>[key,d.stats[key] - (d.race?.bonus?.[key] || 0) + (race.bonus?.[key] || 0)]))}));
  const changeClass = cls => setDraft(d=>({...d,cls,deity:cls.name === source.cls?.name ? structuredClone(source.deity) : null,stats:mode === 'edit' && !resetLevels && cls.name === source.cls?.name ? Object.fromEntries(ABILITY_KEYS.map(key=>[key,source.stats[key] - (source.race?.bonus?.[key] || 0) + (d.race?.bonus?.[key] || 0)])) : startingStats(d.race,cls)}));
  const toggleReset = value => {
    setResetLevels(value);
    setDraft(d=>({...d,stats:value || d.cls.name !== source.cls?.name ? startingStats(d.race,d.cls) : Object.fromEntries(ABILITY_KEYS.map(key=>[key,source.stats[key] - (source.race?.bonus?.[key] || 0) + (d.race?.bonus?.[key] || 0)]))}));
  };
  const patronClass = !rebuilding && source.classLevels?.Warlock ? 'Warlock' : draft.cls?.name;
  const needsDeity = ['Cleric','Warlock','Paladin'].includes(patronClass) || (!rebuilding && Object.keys(source.classLevels || {}).some(c=>['Cleric','Warlock','Paladin'].includes(c)));
  const deityOptions = patronClass === 'Warlock' ? WARLOCK_PATRONS : DEITIES;
  const options = {...draft, mode, keep, keepXp, resetLevels, startingGear};
  let preview = null, validation = '';
  try { preview = buildCharacterRevision(source, options); } catch (e) { validation = e.message; }
  const input = {display:'block',width:'100%',boxSizing:'border-box',background:colors.bgDark,color:colors.text,border:`1px solid ${colors.border}`,borderRadius:4,padding:10,fontSize:14,marginTop:5,colorScheme:'dark'};
  const label = {display:'block',fontSize:12,color:colors.gold,marginBottom:12};
  const check = (text, checked, change, disabled=false) => <label style={{display:'flex',gap:9,alignItems:'center',margin:'10px 0',fontSize:13,color:colors.textDim,opacity:disabled?0.5:1}}><input type="checkbox" checked={Boolean(checked)} onChange={e=>change(e.target.checked)} disabled={disabled}/>{text}</label>;
  const withOriginal = (list, original) => original?.name && !list.some(x=>x.name === original.name) ? [original,...list] : list;

  return <div style={{position:'fixed',inset:0,zIndex:250,background:'rgba(0,0,0,0.88)',display:'flex',justifyContent:'center',alignItems:'center',padding:12}}>
    <section role="dialog" aria-modal="true" aria-labelledby="character-tools-title" style={{width:'100%',maxWidth:650,maxHeight:'92dvh',overflowY:'auto',boxSizing:'border-box',padding:20,background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:6,fontFamily:fonts.body}}>
      <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'space-between'}}>
        <h2 id="character-tools-title" style={{fontFamily:fonts.display,color:colors.gold,fontSize:18}}>Character Tools</h2>
        <button style={btn(false)} onClick={onClose} aria-label="Close character tools">✕</button>
      </div>
      <label style={label}>Action<select aria-label="Action" style={input} value={mode} onChange={e=>changeMode(e.target.value)}>
        <option value="edit">Edit current character / reset levels</option>
        <option value="fresh">Create a fresh character</option>
        <option value="carry">Create a character with selected carry-over</option>
      </select></label>
      <p style={{fontSize:12,color:colors.textFaint,lineHeight:1.5}}>{mode === 'edit' ? 'Keep the current story and possessions. Changing primary class rebuilds progression from level 1. Race and profile edits can keep existing levels.' : 'Start a new story with a level 1 character. The previous story, memory, active quests, location, and timed pressures are cleared.'}</p>
      {mode === 'carry' && <fieldset style={{border:`1px solid ${colors.border}`,borderRadius:4,margin:'16px 0'}}>
        <legend style={{color:colors.gold,fontSize:12}}>Choose what to keep</legend>
        {CARRY_OPTIONS.map(([key,text])=><div key={key}>{check(text,keep[key],value=>setKeep(k=>({...k,[key]:value})))}</div>)}
      </fieldset>}
      <label style={label}>Name<input style={input} value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/></label>
      <label style={label}>Race<select aria-label="Race" style={input} value={draft.race?.name || ''} onChange={e=>changeRace(withOriginal(RACES,source.race).find(x=>x.name === e.target.value))}>
        {withOriginal(RACES,source.race).map(r=><option key={r.name}>{r.name}</option>)}
      </select></label>
      <label style={label}>Primary class<select aria-label="Primary class" style={input} value={draft.cls?.name || ''} onChange={e=>changeClass(withOriginal(CLASSES,source.cls).find(x=>x.name === e.target.value))}>
        {withOriginal(CLASSES,source.cls).map(c=><option key={c.name}>{c.name}</option>)}
      </select></label>
      {mode === 'edit' && check('Reset levels and class choices to level 1',resetLevels,toggleReset)}
      {rebuilding && <p style={{fontSize:12,color:colors.textFaint}}>Rebuilds class levels, HP, ability scores, subclasses, feats, and selected spells/abilities. Scores below start from the class and racial defaults and can be edited. Re-select class choices through the Level and Abilities panels.</p>}
      {mode !== 'fresh' && check(`Keep current XP (${source.xp || 0})`,keepXp,setKeepXp)}
      {mode !== 'edit' && check('Use new class starting equipment',startingGear,setStartingGear,mode === 'carry' && (keep.inventory || keep.equipment))}
      {mode === 'carry' && (keep.inventory || keep.equipment) && <p style={{fontSize:12,color:colors.textFaint}}>Retained inventory/equipment replaces the starter loadout.</p>}
      {needsDeity && <label style={label}>Deity / patron<select aria-label="Deity / patron" style={input} value={draft.deity?.name || ''} onChange={e=>setDraft(d=>({...d,deity:withOriginal(deityOptions,source.deity).find(x=>x.name === e.target.value) || null}))}>
        <option value="">Choose deity / patron…</option>
        {withOriginal(deityOptions,source.deity).map(d=><option key={d.name}>{d.name}</option>)}
      </select></label>}
      <fieldset style={{border:`1px solid ${colors.border}`,borderRadius:4,margin:'16px 0'}}>
        <legend style={{color:colors.gold,fontSize:12}}>Ability scores (including race; before gear)</legend>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:10}}>
          {ABILITY_KEYS.map(key=><label style={label} key={key}>{STAT_NAMES[key]}<input type="number" min="1" max="100" step="1" style={input} value={draft.stats?.[key] ?? ''} onChange={e=>setDraft(d=>({...d,stats:{...d.stats,[key]:e.target.value}}))}/></label>)}
        </div>
      </fieldset>
      {[['bio','Bio'],['appearance','Appearance']].map(([key,text])=><label key={key} style={label}>{text}<textarea rows={3} style={input} value={draft[key] || ''} onChange={e=>setDraft(d=>({...d,[key]:e.target.value}))}/></label>)}
      <details style={{marginBottom:16,color:colors.gold,fontSize:13}}><summary>Disposition</summary>
        {[['alignment','Alignment'],['cares','Cares about'],['indifferent','Indifferent to'],['methods','Methods'],['lines','Lines they will not cross']].map(([key,text])=><label key={key} style={{...label,marginTop:10}}>{text}<textarea rows={2} style={input} value={draft.disposition?.[key] || ''} onChange={e=>setDraft(d=>({...d,disposition:{...d.disposition,[key]:e.target.value}}))}/></label>)}
      </details>
      {preview && <div role="status" style={{padding:12,border:`1px solid ${colors.border}`,color:colors.textDim,fontSize:13,lineHeight:1.7}}>
        {preview.name} · {preview.race.name} {preview.cls.name}<br/>
        Level {preview.level} · {preview.xp} XP · {effectiveMaxHp(preview)} max HP · {levelUpsAvailable(preview)} available level-ups<br/>
        {mode === 'edit' ? 'Current story and possessions kept.' : 'New story; the browser autosave slot will hold this character.'}
      </div>}
      {(error || validation) && <p role="alert" style={{color:'#e7ad84',fontSize:13}}>{error || validation}</p>}
      <button style={{...btn(false),width:'100%',marginTop:16}} onClick={onExport}>Download current Full Save</button>
      <div style={{display:'flex',gap:10,marginTop:12}}>
        <button style={{...btn(false),flex:1}} onClick={onClose}>Cancel</button>
        <button disabled={!preview} style={{...btn(true),flex:2,opacity:preview?1:0.4}} onClick={()=>{
          try { onApply(buildCharacterRevision(source,options), {newStory:mode !== 'edit',resetLevels:rebuilding}); } catch(e) {setError(e.message);}
        }}>{mode === 'edit' ? 'Apply character changes' : 'Create character & choose opening'}</button>
      </div>
    </section>
  </div>;
}
