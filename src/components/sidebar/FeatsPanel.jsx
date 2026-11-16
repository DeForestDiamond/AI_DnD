import { useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';
import { FEATS, getFeat, hasFeat } from '../../constants/feats.js';
import { availableFeatSlots, featPrerequisite, normalizeFeatRecords } from '../../helpers/feats.js';

export function FeatsPanel({character,onChooseFeat,onRemoveFeat}) {
  const [query,setQuery]=useState(''), [name,setName]=useState(''), [ability,setAbility]=useState(''), [choices,setChoices]=useState(''), [error,setError]=useState('');
  const slots=availableFeatSlots(character), [source,setSource]=useState('');
  const selected=getFeat(name), records=normalizeFeatRecords(character);
  const chosenSource=slots.some(slot=>slot.id === source) ? source : slots[0]?.id || '';
  const input={display:'block',width:'100%',boxSizing:'border-box',background:colors.bgDark,color:colors.text,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:9,fontSize:12,margin:'6px 0 12px',colorScheme:'dark'};
  return <section aria-labelledby="feats-title" style={{marginTop:22,paddingTop:14,borderTop:`1px solid ${colors.border}`}}>
    <h3 id="feats-title" style={{fontFamily:fonts.display,fontSize:13,color:colors.gold,margin:'0 0 8px'}}>✦ FEATS · {slots.length} available</h3>
    <p style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Additional picks at class levels 4 and 8, plus Fighter 6 and Rogue 10. Humans also receive their listed level 1 bonus feat. Your usual +1 ability score every level is unchanged. Earned picks can be saved for later.</p>
    {records.map(record=><details key={record.name} style={{padding:'8px 0',fontSize:12,color:colors.textDim,borderBottom:`1px solid ${colors.borderDim}`}}>
      <summary style={{cursor:'pointer',color:colors.gold}}>{record.name}</summary>
      <p style={{lineHeight:1.5}}>{getFeat(record.name)?.desc || record.desc}</p>
      <div style={{fontSize:11,color:colors.textFaint}}>{record.source}{record.ability ? ` · ${record.ability.toUpperCase()}` : ''}{record.choices ? ` · ${record.choices}` : ''}</div>
      <button style={{...btn(false),fontSize:10,marginTop:8}} onClick={()=>{try{onRemoveFeat(record.name);setError('');}catch(e){setError(e.message);}}}>Undo {record.name}</button>
    </details>)}
    {slots.length > 0 && <>
      <label style={{fontSize:11,color:colors.gold}}>Feat pick<select aria-label="Feat pick" style={input} value={chosenSource} onChange={e=>setSource(e.target.value)}>{slots.map(slot=><option key={slot.id} value={slot.id}>{slot.label}</option>)}</select></label>
      <label style={{fontSize:11,color:colors.gold}}>Search feats<input aria-label="Search feats" type="search" style={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, category, or effect"/></label>
      <label style={{fontSize:11,color:colors.gold}}>Choose feat<select aria-label="Choose feat" style={input} value={name} onChange={e=>{setName(e.target.value);setAbility('');setChoices('');setError('');}}>
        <option value="">Choose a feat…</option>
        {FEATS.filter(feat=>`${feat.name} ${feat.category} ${feat.desc}`.toLowerCase().includes(query.toLowerCase()) || feat.name === name).map(feat=>{
          const reason=hasFeat(character,feat.name) ? 'Already selected' : featPrerequisite(character,feat);
          return <option key={feat.name} value={feat.name} disabled={Boolean(reason)}>{feat.name}{reason ? ` — ${reason}` : ''}</option>;
        })}
      </select></label>
      {selected && <>
        <p style={{fontSize:12,color:colors.textDim,lineHeight:1.6}}>{selected.desc}</p>
        {selected.abilityOptions && <label style={{fontSize:11,color:colors.gold}}>Ability score<select aria-label="Feat ability score" style={input} value={ability} onChange={e=>setAbility(e.target.value)}>
          <option value="">Choose ability…</option>{selected.abilityOptions.map(stat=><option key={stat} value={stat}>{stat.toUpperCase()} ({character.stats[stat]}){character.stats[stat]<20 ? ' → +1' : ' — already at or above 20'}</option>)}
        </select></label>}
        {selected.choiceOptions ? <label style={{fontSize:11,color:colors.gold}}>{selected.choiceLabel}<select aria-label="Feat selections" style={input} value={choices} onChange={e=>setChoices(e.target.value)}><option value="">Choose…</option>{selected.choiceOptions.map(value=><option key={value}>{value}</option>)}</select></label> : selected.choiceLabel && <label style={{fontSize:11,color:colors.gold}}>{selected.choiceLabel}<textarea aria-label="Feat selections" style={input} rows={3} value={choices} onChange={e=>setChoices(e.target.value)} placeholder="Record your selections for the DM"/></label>}
        <button style={{...btn(true),width:'100%',fontSize:11}} onClick={()=>{
          try {onChooseFeat({name,source:chosenSource,ability,choices});setName('');setQuery('');setAbility('');setChoices('');setError('');} catch(e){setError(e.message);}
        }}>Take {selected.name}</button>
      </>}
    </>}
    <p style={{fontSize:10,color:colors.textFaint,lineHeight:1.5}}>Ability increases and Tough’s HP are applied to the sheet. The DM receives every selected feat and resolves its other effects. Spell, skill, maneuver, and proficiency selections are recorded for the DM; they are not independently checked by the picker. Undo refunds the feat pick and reverses its sheet bonuses.</p>
    {error && <p role="alert" style={{color:'#e7ad84',fontSize:12}}>{error}</p>}
  </section>;
}
