import { colors } from '../styles/theme.js';

export function StoryOptions({ character = {}, onChange, embedded = false }) {
  const selectStyle = { width:'100%', boxSizing:'border-box', background:colors.bgDark, color:colors.textDim, border:`1px solid ${colors.borderDim}`, borderRadius:4, padding:'8px', fontSize:12, marginTop:5 };
  return <div style={embedded ? {padding:'8px 0'} : {padding:12,border:`1px solid ${colors.borderDim}`,borderRadius:6,background:colors.bgDark}}>
    <label style={{display:'block',fontSize:12,color:colors.gold}}>Story structure
      <select value={character.storyMode || 'arcs'} onChange={e=>onChange?.({storyMode:e.target.value})} style={selectStyle}>
        <option value="arcs">Structured stories</option>
        <option value="continuous">Long Story</option>
      </select>
    </label>
    <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5,marginTop:5}}>{character.storyMode === 'continuous' ? 'One evolving story. No assigned antagonist, arc ending, or escalation ceiling. Existing people and consequences continue.' : 'Use antagonist arcs or situation Adventures with natural resolution and aftermath.'}</div>
    <label style={{display:'block',fontSize:12,color:colors.gold,marginTop:12}}>Fantasy tone
      <select value={character.fantasyTone || 'standard'} onChange={e=>onChange?.({fantasyTone:e.target.value})} style={selectStyle}>
        <option value="standard">Standard</option>
        <option value="full-dark">Full Dark Fantasy</option>
      </select>
    </label>
    <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5,marginTop:5}}>{character.fantasyTone === 'full-dark' ? 'Cruelty, corruption, horror, and lasting loss. No guaranteed rescue or fair fight. Victories and refuge still matter.' : 'The opening and ongoing events establish the tone.'}</div>
    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:colors.gold,marginTop:14,cursor:'pointer'}}>
      <input type="checkbox" checked={character.combatFirst === true} onChange={e=>onChange?.({combatFirst:e.target.checked})} />
      Combat-first encounters
    </label>
    <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5,marginTop:5}}>Hostile encounters default to a fight. Enemies act first when appropriate; talking your way out requires a credible reason for them to stop.</div>
  </div>;
}
