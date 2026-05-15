import { useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';
import { MULTICLASS_OPTIONS, getClassFeatures } from '../../constants/multiclass.js';
import { STAT_NAMES } from '../../constants/classes.js';
import { modStr } from '../../hooks/useCharacter.js';

export function MulticlassModal({ character, classLevels, onChooseClass, onChooseStat }) {
  const [selectedClass, setSelectedClass] = useState(null);

  const availableClasses = Object.keys(MULTICLASS_OPTIONS);

  const handleClassSelect = (className) => {
    setSelectedClass(className);
  };

  const handleConfirmClass = () => {
    if (selectedClass) onChooseClass(selectedClass);
  };

  // Step 1 — choose class to advance
  if (!selectedClass) return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:150,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:4,padding:20,maxWidth:480,width:'100%'}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:15,marginBottom:4,textAlign:'center'}}>⭐ LEVEL UP!</div>
        <div style={{fontSize:12,color:colors.textFaint,marginBottom:16,textAlign:'center',lineHeight:1.6}}>
          Choose a class to advance. You can continue your current path or multiclass into something new.
        </div>

        {/* Current classes */}
        <div style={{fontFamily:fonts.display,fontSize:9,color:colors.textGhost,letterSpacing:3,marginBottom:8}}>YOUR CLASSES</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
          {Object.entries(classLevels).map(([cls, lvl]) => {
            const data = MULTICLASS_OPTIONS[cls];
            const newFeatures = data?.features[lvl + 1] || [];
            return (
              <div key={cls} onClick={() => handleClassSelect(cls)}
                style={{background:colors.bgDark,border:`1px solid ${colors.border}`,borderRadius:6,padding:10,cursor:'pointer',transition:'all 0.2s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=colors.gold}
                onMouseLeave={e=>e.currentTarget.style.borderColor=colors.border}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                  <span style={{fontSize:18}}>{data?.emoji}</span>
                  <div>
                    <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:12}}>{cls}</div>
                    <div style={{fontSize:10,color:colors.textGhost}}>Level {lvl} → {lvl+1}</div>
                  </div>
                </div>
                {newFeatures.length > 0 && (
                  <div style={{fontSize:9,color:colors.textFaint,lineHeight:1.4}}>
                    {newFeatures.map((f,i) => <div key={i}>+ {f}</div>)}
                  </div>
                )}
                {newFeatures.length === 0 && (
                  <div style={{fontSize:9,color:colors.textGhost}}>+ {data?.hpPerLevel} HP per level</div>
                )}
              </div>
            );
          })}
        </div>

        {/* New multiclass options */}
        {availableClasses.filter(c => !classLevels[c]).length > 0 && (
          <>
            <div style={{fontFamily:fonts.display,fontSize:9,color:colors.textGhost,letterSpacing:3,marginBottom:8}}>MULTICLASS INTO</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {availableClasses.filter(c => !classLevels[c]).map(cls => {
                const data = MULTICLASS_OPTIONS[cls];
                const firstFeatures = data?.features[1] || [];
                return (
                  <div key={cls} onClick={() => handleClassSelect(cls)}
                    style={{background:'rgba(255,255,255,0.02)',border:`1px solid ${colors.borderDim}`,borderRadius:6,padding:10,cursor:'pointer',transition:'all 0.2s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=colors.gold}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=colors.borderDim}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                      <span style={{fontSize:18}}>{data?.emoji}</span>
                      <div>
                        <div style={{fontFamily:fonts.display,color:colors.textDim,fontSize:12}}>{cls}</div>
                        <div style={{fontSize:10,color:colors.textGhost}}>New — Level 1</div>
                      </div>
                    </div>
                    <div style={{fontSize:9,color:colors.textGhost,lineHeight:1.4}}>
                      {firstFeatures.slice(0,2).map((f,i) => <div key={i}>+ {f}</div>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Step 2 — choose stat to increase
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:150,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:4,padding:20,maxWidth:380,width:'100%'}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:15,marginBottom:2,textAlign:'center'}}>
          {MULTICLASS_OPTIONS[selectedClass]?.emoji} {selectedClass} Level {(classLevels[selectedClass]||0)+1}
        </div>

        {/* New features gained */}
        {(() => {
          const newLvl = (classLevels[selectedClass]||0) + 1;
          const features = MULTICLASS_OPTIONS[selectedClass]?.features[newLvl] || [];
          return features.length > 0 ? (
            <div style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:10,marginBottom:14}}>
              <div style={{fontFamily:fonts.display,fontSize:9,color:colors.textGhost,letterSpacing:2,marginBottom:6}}>NEW FEATURES</div>
              {features.map((f,i) => (
                <div key={i} style={{fontSize:11,color:colors.green,marginBottom:3}}>✦ {f}</div>
              ))}
            </div>
          ) : null;
        })()}

        <div style={{fontSize:12,color:colors.textFaint,marginBottom:12,textAlign:'center'}}>
          Choose a stat to increase by 1.
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          {Object.entries(character.stats).map(([k,v]) => (
            <div key={k} onClick={() => onChooseStat(selectedClass, k)}
              style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:6,padding:'10px 8px',cursor:'pointer',textAlign:'center',transition:'all 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=colors.gold}
              onMouseLeave={e=>e.currentTarget.style.borderColor=colors.borderDim}>
              <div style={{fontFamily:fonts.display,fontSize:9,color:colors.textFaint,letterSpacing:2,marginBottom:4}}>{STAT_NAMES[k]?.toUpperCase()}</div>
              <div style={{fontFamily:fonts.mono,fontSize:20,color:colors.gold,fontWeight:'bold'}}>{v}</div>
              <div style={{fontSize:9,color:colors.textGhost,marginTop:2}}>→ {v+1} ({modStr(v+1)})</div>
            </div>
          ))}
        </div>

        <button style={{...btn(false),width:'100%',marginTop:12,fontSize:10}} onClick={()=>setSelectedClass(null)}>
          ← Back to class selection
        </button>
      </div>
    </div>
  );
}
