import { colors, fonts, btn } from '../../styles/theme.js';
import { modStr } from '../../hooks/useCharacter.js';
import { STAT_NAMES } from '../../constants/classes.js';

export function LevelUpModal({ stats, onChoose }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:150,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:4,padding:20,maxWidth:340,width:'100%'}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:15,marginBottom:4,textAlign:'center'}}>⭐ LEVEL UP!</div>
        <div style={{fontSize:12,color:colors.textFaint,marginBottom:16,textAlign:'center',lineHeight:1.6}}>
          Choose a stat to increase by 1. This is permanent.
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} onClick={() => onChoose(k)}
              style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:6,padding:'10px 8px',cursor:'pointer',textAlign:'center',transition:'all 0.2s'}}
              onMouseEnter={e => e.currentTarget.style.borderColor = colors.gold}
              onMouseLeave={e => e.currentTarget.style.borderColor = colors.borderDim}>
              <div style={{fontFamily:fonts.display,fontSize:9,color:colors.textFaint,letterSpacing:2,marginBottom:4}}>{STAT_NAMES[k]?.toUpperCase()}</div>
              <div style={{fontFamily:fonts.mono,fontSize:20,color:colors.gold,fontWeight:'bold'}}>{v}</div>
              <div style={{fontSize:9,color:colors.textGhost,marginTop:2}}>→ {v+1} ({modStr(v+1)})</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
