import { useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';

// Shown when a fresh adventure begins (new game or loading a character with no
// saved history). Lets the player roll a random opening or write their own —
// e.g. picking up in a home city or where they left off.
export function AdventureStartModal({ onRandom, onManual }) {
  const [mode, setMode] = useState(null); // null = choosing | 'manual'
  const [text, setText] = useState('');
  const [antagonist, setAntagonist] = useState('');

  const card = {
    background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 6,
    padding: 16, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:210,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:4,padding:24,maxWidth:560,width:'100%',maxHeight:'90vh',overflow:'auto'}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:16,marginBottom:16,textAlign:'center'}}>🎲 How should this adventure begin?</div>

        {mode === null ? (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div onClick={onRandom} style={card}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=colors.gold;e.currentTarget.style.background=colors.bgDark;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=colors.border;e.currentTarget.style.background=colors.bg;}}>
              <div style={{fontSize:28,marginBottom:6}}>🎲</div>
              <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Random Start</div>
              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Roll a fresh setting, scene, and hook scaled to your level.</div>
            </div>
            <div onClick={()=>setMode('manual')} style={card}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=colors.gold;e.currentTarget.style.background=colors.bgDark;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=colors.border;e.currentTarget.style.background=colors.bg;}}>
              <div style={{fontSize:28,marginBottom:6}}>✍️</div>
              <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Write My Own Opening</div>
              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Describe where and how the story starts — pick up where you left off, or begin at a home base.</div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{fontSize:12,color:colors.textGhost,marginBottom:8,lineHeight:1.5}}>Describe the opening. The DM will start exactly here instead of rolling a random scene.</div>
            <textarea
              value={text}
              onChange={e=>setText(e.target.value)}
              autoFocus
              placeholder={'e.g. I arrive back in Saltmere, my home city, after weeks on the road. It is market day, the docks are busy, and I am headed to my usual tavern when...'}
              rows={6}
              style={{width:'100%',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,borderRadius:3,color:colors.textDim,fontSize:13,fontFamily:'inherit',padding:'8px 10px',resize:'vertical',boxSizing:'border-box',marginBottom:12}}
            />
            <div style={{fontSize:12,color:colors.textGhost,marginBottom:6,lineHeight:1.5}}>Arc antagonist <span style={{color:colors.textFaint}}>(optional — the hidden villain all foreshadowing builds toward; leave blank to roll one)</span></div>
            <input
              value={antagonist}
              onChange={e=>setAntagonist(e.target.value)}
              placeholder={'e.g. a smuggling ring run out of the Saltmere docks'}
              style={{width:'100%',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,borderRadius:3,color:colors.textDim,fontSize:13,fontFamily:'inherit',padding:'8px 10px',boxSizing:'border-box',marginBottom:12}}
            />
            <div style={{display:'flex',gap:10}}>
              <button style={{...btn(false),flex:'0 0 auto'}} onClick={()=>setMode(null)}>← Back</button>
              <button style={{...btn(true),flex:1,opacity:text.trim()?1:0.4}} disabled={!text.trim()} onClick={()=>text.trim()&&onManual(text.trim(), antagonist.trim() || null)}>Begin Here →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
