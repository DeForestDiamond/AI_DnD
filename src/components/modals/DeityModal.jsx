import { useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';
import { DEITIES } from '../../constants/deities.js';

export function DeityModal({ onSelectDeity, context = 'multiclass' }) {
  const [pending, setPending] = useState(null);

  const isMulticlass = context === 'multiclass';
  const title = isMulticlass ? 'Choose Your Patron Deity' : 'Select Your Deity';
  const subtitle = isMulticlass
    ? "You've entered the Cleric path. Which god do you now serve?"
    : 'Your cleric character never chose a patron. Select one now.';

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:4,padding:24,maxWidth:700,width:'100%',maxHeight:'90vh',overflow:'auto'}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:16,marginBottom:4,textAlign:'center'}}>✨ {title}</div>
        <div style={{fontSize:12,color:colors.textGhost,marginBottom:24,textAlign:'center',lineHeight:1.6}}>
          {subtitle}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
          {DEITIES.map((deity) => {
            const isSelected = pending?.name === deity.name;
            return (
              <div
                key={deity.name}
                onClick={() => setPending(deity)}
                style={{
                  background: isSelected ? colors.bgDark : colors.bg,
                  border: isSelected ? `2px solid ${colors.gold}` : `1px solid ${colors.border}`,
                  borderRadius: 6,
                  padding: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = colors.gold;
                    e.currentTarget.style.background = colors.bgDark;
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.background = colors.bg;
                  }
                }}
              >
                <div style={{fontSize:32,marginBottom:6}}>{deity.emoji}</div>
                <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:2}}>{deity.name}</div>
                <div style={{fontSize:9,color:colors.textGhost,marginBottom:8}}>{deity.alignment}</div>
                <div style={{fontSize:10,color:colors.textFaint,lineHeight:1.5,marginBottom:6}}>{deity.desc}</div>
                {isSelected && (
                  <div style={{fontSize:10,color:colors.gold,fontStyle:'italic',paddingTop:6,borderTop:`1px solid ${colors.border}`}}>
                    ✓ {deity.flavor}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          style={{...btn(true), width:'100%', opacity: pending ? 1 : 0.4}}
          disabled={!pending}
          onClick={() => pending && onSelectDeity(pending)}
        >
          CONFIRM DEVOTION →
        </button>
      </div>
    </div>
  );
}
