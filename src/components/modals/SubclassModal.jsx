import { useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';
import { SUBCLASSES, SUBCLASS_PICK_LEVEL } from '../../constants/subclasses.js';

// Picks the subclass for ONE class. When several classes are owed a choice
// (e.g. a multiclass old save), App steps through them one at a time and the
// `remaining` count shows progress.
export function SubclassModal({ className, onSelect, context = 'levelup', remaining = 0 }) {
  const [pending, setPending] = useState(null);
  const options = Object.entries(SUBCLASSES[className] || {});

  const pickLevel = SUBCLASS_PICK_LEVEL[className];
  const title = `Choose Your ${className} Path`;
  const subtitle = context === 'oldSave'
    ? `Your ${className} (level ${pickLevel}+) never chose a subclass. Select one now.`
    : `Your ${className} reaches the level where it specializes. Choose your path.`;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:4,padding:24,maxWidth:700,width:'100%',maxHeight:'90vh',overflow:'auto'}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:16,marginBottom:4,textAlign:'center'}}>🧭 {title}</div>
        <div style={{fontSize:12,color:colors.textGhost,marginBottom:remaining>0?8:24,textAlign:'center',lineHeight:1.6}}>{subtitle}</div>
        {remaining > 0 && (
          <div style={{fontSize:10,color:colors.textFaint,marginBottom:20,textAlign:'center'}}>{remaining} more subclass choice{remaining>1?'s':''} after this</div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
          {options.map(([name, data]) => {
            const isSelected = pending === name;
            return (
              <div key={name} onClick={() => setPending(name)}
                style={{background:isSelected?colors.bgDark:colors.bg, border:isSelected?`2px solid ${colors.gold}`:`1px solid ${colors.border}`, borderRadius:6, padding:12, cursor:'pointer', transition:'all 0.15s'}}
                onMouseEnter={e=>{ if(!isSelected){e.currentTarget.style.borderColor=colors.gold;e.currentTarget.style.background=colors.bgDark;} }}
                onMouseLeave={e=>{ if(!isSelected){e.currentTarget.style.borderColor=colors.border;e.currentTarget.style.background=colors.bg;} }}
              >
                <div style={{fontSize:32,marginBottom:6}}>{data.emoji}</div>
                <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:6}}>{name}</div>
                <div style={{fontSize:10,color:colors.textFaint,lineHeight:1.5,marginBottom:6}}>{data.desc}</div>
                {isSelected && (
                  <div style={{paddingTop:6,borderTop:`1px solid ${colors.border}`,display:'flex',flexDirection:'column',gap:4}}>
                    {data.features.map(f => (
                      <div key={f.name} style={{fontSize:9,color:colors.gold,lineHeight:1.4}}>✓ {f.name}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button style={{...btn(true),width:'100%',opacity:pending?1:0.4}} disabled={!pending} onClick={()=>pending&&onSelect(pending)}>
          WALK THIS PATH →
        </button>
      </div>
    </div>
  );
}
