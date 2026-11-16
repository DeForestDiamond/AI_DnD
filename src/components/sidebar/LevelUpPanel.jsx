import { FeatsPanel } from './FeatsPanel.jsx';
import { useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';
import { STAT_NAMES } from '../../constants/classes.js';
import { MULTICLASS_OPTIONS } from '../../constants/multiclass.js';
import { modStr } from '../../hooks/useCharacter.js';

export function LevelUpPanel({ character, levelUpsAvailable=0, onLevelClassSelect, onLevelStatSelect, onChooseFeat, onRemoveFeat }) {
  const [levelClassChoice, setLevelClassChoice] = useState(null);

  return <>
    <div style={{padding:'8px 0 2px'}}>
      <div style={{fontFamily:fonts.display,color:levelUpsAvailable>0?colors.gold:colors.textGhost,fontSize:14,letterSpacing:1,marginBottom:4}}>
        ⭐ LEVEL UP {levelUpsAvailable > 1 ? `×${levelUpsAvailable}` : ''}
      </div>
      <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.45,marginBottom:10}}>
        {levelUpsAvailable > 0
          ? `${levelUpsAvailable} level${levelUpsAvailable===1?' is':'s are'} available. Spend one now or leave it banked — earned levels persist until you choose them.`
          : 'No level-up is currently available. Keep adventuring; this tab will light up when your XP reaches the next threshold.'}
      </div>
    </div>

    {levelUpsAvailable > 0 && !levelClassChoice && <>
      <div style={{fontFamily:fonts.display,fontSize:9,color:colors.textGhost,letterSpacing:2,marginBottom:6}}>YOUR CLASSES</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12}}>
        {Object.entries(character.classLevels || { [character.cls?.name]: character.level }).map(([cls, lvl]) => {
          const data = MULTICLASS_OPTIONS[cls];
          const maxed = lvl >= 10;
          const features = data?.features?.[lvl + 1] || [];
          return (
            <div key={cls} onClick={()=>{ if (!maxed) { onLevelClassSelect?.(cls); setLevelClassChoice(cls); } }}
              style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:5,padding:8,cursor:maxed?'default':'pointer',opacity:maxed?0.45:1}}>
              <div style={{display:'flex',gap:5,alignItems:'center',marginBottom:3}}>
                <span style={{fontSize:17}}>{data?.emoji || '🎲'}</span>
                <div>
                  <div style={{fontFamily:fonts.display,fontSize:11,color:colors.gold}}>{cls}</div>
                  <div style={{fontSize:9,color:colors.textGhost}}>{maxed ? 'Class maxed' : `Level ${lvl} → ${lvl+1}`}</div>
                </div>
              </div>
              {!maxed && features.slice(0,3).map((f,i)=><div key={i} style={{fontSize:9,color:colors.textFaint,lineHeight:1.3}}>+ {f}</div>)}
            </div>
          );
        })}
      </div>

      {Object.keys(MULTICLASS_OPTIONS).some(c => !character.classLevels?.[c]) && <>
        <div style={{fontFamily:fonts.display,fontSize:9,color:colors.textGhost,letterSpacing:2,marginBottom:6}}>MULTICLASS INTO</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          {Object.keys(MULTICLASS_OPTIONS).filter(c => !character.classLevels?.[c]).map(cls => {
            const data = MULTICLASS_OPTIONS[cls];
            const features = data?.features?.[1] || [];
            return (
              <div key={cls} onClick={()=>{ onLevelClassSelect?.(cls); setLevelClassChoice(cls); }}
                style={{background:'rgba(255,255,255,0.02)',border:`1px solid ${colors.borderDim}`,borderRadius:5,padding:8,cursor:'pointer'}}>
                <div style={{display:'flex',gap:5,alignItems:'center',marginBottom:3}}>
                  <span style={{fontSize:17}}>{data?.emoji || '🎲'}</span>
                  <div>
                    <div style={{fontFamily:fonts.display,fontSize:11,color:colors.textDim}}>{cls}</div>
                    <div style={{fontSize:9,color:colors.textGhost}}>New — Level 1</div>
                  </div>
                </div>
                {features.slice(0,2).map((f,i)=><div key={i} style={{fontSize:9,color:colors.textGhost,lineHeight:1.3}}>+ {f}</div>)}
              </div>
            );
          })}
        </div>
      </>}
    </>}

    {levelUpsAvailable > 0 && levelClassChoice && (() => {
      const currentClassLevel = character.classLevels?.[levelClassChoice] || 0;
      const newLevel = currentClassLevel + 1;
      const data = MULTICLASS_OPTIONS[levelClassChoice];
      const features = data?.features?.[newLevel] || [];
      return <>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:8}}>
          {data?.emoji || '🎲'} {levelClassChoice} Level {newLevel}
        </div>
        {features.length > 0 && (
          <div style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:8,marginBottom:10}}>
            <div style={{fontFamily:fonts.display,fontSize:9,color:colors.textGhost,letterSpacing:2,marginBottom:5}}>NEW FEATURES</div>
            {features.map((f,i)=><div key={i} style={{fontSize:10,color:colors.green,marginBottom:2}}>✦ {f}</div>)}
          </div>
        )}
        <div style={{fontSize:11,color:colors.textFaint,marginBottom:8}}>Choose a stat to increase by 1.</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          {Object.entries(character.stats).map(([k,v]) => (
            <div key={k} onClick={()=>{ onLevelStatSelect?.(levelClassChoice, k); setLevelClassChoice(null); }}
              style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:5,padding:'8px 6px',cursor:'pointer',textAlign:'center'}}>
              <div style={{fontFamily:fonts.display,fontSize:9,color:colors.textFaint,letterSpacing:1}}>{STAT_NAMES[k]?.toUpperCase()}</div>
              <div style={{fontFamily:fonts.mono,fontSize:18,color:colors.gold,fontWeight:'bold'}}>{v}</div>
              <div style={{fontSize:9,color:colors.textGhost}}>→ {v+1} ({modStr(v+1)})</div>
            </div>
          ))}
        </div>
        <button onClick={()=>setLevelClassChoice(null)} style={{...btn(false),width:'100%',marginTop:10,fontSize:10}}>← Back to class selection</button>
      </>;
    })()}
    <FeatsPanel character={character} onChooseFeat={onChooseFeat} onRemoveFeat={onRemoveFeat}/>
  </>;
}
