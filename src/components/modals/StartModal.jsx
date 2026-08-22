import { useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';

// Fresh-campaign chooser. Situation Adventure is deliberately separate from the
// classic random/antagonist generator: its premise owns the starting context.
export function AdventureStartModal({ onRandom, onSituationAdventure, onManual, onChooseAntagonist, antagonists = [], defeatedAntagonists = [] }) {
  const [mode, setMode] = useState(null);
  const [text, setText] = useState('');
  const [antagonist, setAntagonist] = useState('');
  const [search, setSearch] = useState('');
  const [showDefeated, setShowDefeated] = useState(false);

  const defeated = new Set((defeatedAntagonists || []).map(x => String(x).toLowerCase()));
  const visibleAntagonists = antagonists
    .filter(a => showDefeated || !defeated.has(a.toLowerCase()))
    .filter(a => !search.trim() || a.toLowerCase().includes(search.trim().toLowerCase()));

  const card = { background:colors.bg,border:`1px solid ${colors.border}`,borderRadius:6,padding:16,cursor:'pointer',transition:'all 0.15s',textAlign:'left' };
  const hoverOn = e => { e.currentTarget.style.borderColor=colors.gold; e.currentTarget.style.background=colors.bgDark; };
  const hoverOff = e => { e.currentTarget.style.borderColor=colors.border; e.currentTarget.style.background=colors.bg; };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:210,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:4,padding:24,maxWidth:640,width:'100%',maxHeight:'90vh',overflow:'auto'}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:16,marginBottom:16,textAlign:'center'}}>🎲 How should this adventure begin?</div>
        {mode === null ? (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div onClick={onRandom} style={card} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <div style={{fontSize:28,marginBottom:6}}>🎲</div><div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Random Start</div>
              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Roll a fresh setting, scene, hook, and antagonist scaled to your level.</div>
            </div>
            <div onClick={onSituationAdventure} style={card} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <div style={{fontSize:28,marginBottom:6}}>🎭</div><div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Adventure</div>
              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Start from a social or exploratory situation with no predetermined villain or solution. Let the story emerge through play.</div>
            </div>
            <div onClick={()=>setMode('antagonist')} style={card} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <div style={{fontSize:28,marginBottom:6}}>👑</div><div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Choose Antagonist</div>
              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Pick the arc foe yourself, then roll a fresh opening built around them.</div>
            </div>
            <div onClick={()=>setMode('manual')} style={card} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <div style={{fontSize:28,marginBottom:6}}>✍️</div><div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Write My Own Opening</div>
              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Describe where and how the story starts — pick up where you left off, or begin at a home base.</div>
            </div>
          </div>
        ) : mode === 'manual' ? (
          <div>
            <div style={{fontSize:12,color:colors.textGhost,marginBottom:8,lineHeight:1.5}}>Describe the opening. The DM will start exactly here instead of rolling a random scene.</div>
            <textarea value={text} onChange={e=>setText(e.target.value)} autoFocus placeholder={'e.g. I arrive back in Saltmere, my home city, after weeks on the road...'} rows={6}
              style={{width:'100%',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,borderRadius:3,color:colors.textDim,fontSize:13,fontFamily:'inherit',padding:'8px 10px',resize:'vertical',boxSizing:'border-box',marginBottom:12}} />
            <div style={{fontSize:12,color:colors.textGhost,marginBottom:6,lineHeight:1.5}}>Arc antagonist <span style={{color:colors.textFaint}}>(optional — leave blank to roll one)</span></div>
            <input value={antagonist} onChange={e=>setAntagonist(e.target.value)} placeholder={'e.g. a smuggling ring run out of the Saltmere docks'}
              style={{width:'100%',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,borderRadius:3,color:colors.textDim,fontSize:13,fontFamily:'inherit',padding:'8px 10px',boxSizing:'border-box',marginBottom:12}} />
            <div style={{display:'flex',gap:10}}><button style={{...btn(false),flex:'0 0 auto'}} onClick={()=>setMode(null)}>← Back</button><button style={{...btn(true),flex:1,opacity:text.trim()?1:0.4}} disabled={!text.trim()} onClick={()=>text.trim()&&onManual(text.trim(), antagonist.trim() || null)}>Begin Here →</button></div>
          </div>
        ) : (
          <div>
            <div style={{fontSize:12,color:colors.textGhost,marginBottom:10,lineHeight:1.5}}>Choose the hidden antagonist for this arc. The app will roll the opening normally and build toward this foe.</div>
            <input value={search} onChange={e=>setSearch(e.target.value)} autoFocus placeholder="Search antagonists..." style={{width:'100%',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,borderRadius:3,color:colors.textDim,fontSize:13,fontFamily:'inherit',padding:'8px 10px',boxSizing:'border-box',marginBottom:10}} />
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:colors.textFaint,marginBottom:10,cursor:'pointer'}}><input type="checkbox" checked={showDefeated} onChange={e=>setShowDefeated(e.target.checked)} />Show defeated foes ({defeatedAntagonists.length})</label>
            <div style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,maxHeight:'52vh',overflowY:'auto',marginBottom:12}}>
              {visibleAntagonists.length ? visibleAntagonists.map(a => { const wasDefeated=defeated.has(a.toLowerCase()); return <div key={a} onClick={()=>onChooseAntagonist(a)} style={{padding:'10px 12px',borderBottom:`1px solid ${colors.borderFaint}`,cursor:'pointer',fontSize:12,lineHeight:1.4,color:wasDefeated?colors.textGhost:colors.textDim,opacity:wasDefeated?0.65:1}} onMouseEnter={e=>e.currentTarget.style.background=colors.bgDark} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{wasDefeated&&<span style={{marginRight:6}}>☠</span>}{a}{wasDefeated&&<span style={{fontSize:9,marginLeft:8,color:colors.textGhost}}>DEFEATED</span>}</div>; }) : <div style={{padding:18,textAlign:'center',fontSize:11,color:colors.textGhost}}>No antagonists match this filter.</div>}
            </div>
            <button style={{...btn(false),width:'100%'}} onClick={()=>setMode(null)}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
