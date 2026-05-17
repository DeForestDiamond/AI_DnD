import { useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';
import { DEITIES } from '../../constants/deities.js';
import { WARLOCK_PATRON_SPELLS } from '../../constants/abilities.js';

const WARLOCK_PATRONS = [
  { name:'The Archfey',             emoji:'🌿', alignment:'Chaotic Neutral', desc:'A powerful and capricious lord of the Feywild. Grants enchantment and illusion magic.' },
  { name:'The Great Old One',       emoji:'🐙', alignment:'Chaotic Neutral', desc:'An incomprehensible cosmic entity from beyond the stars. Telepathy and mind-warping power.' },
  { name:'Asmodeus',                emoji:'👑', alignment:'Lawful Evil',     desc:'Lord of the Nine Hells. Power through infernal contracts and hellfire.' },
  { name:'Shar',                    emoji:'🌑', alignment:'Chaotic Evil',    desc:'Goddess of darkness and secrets. Grants shadow magic and deception.' },
  { name:'Dendar the Night Serpent',emoji:'🐍', alignment:'Neutral Evil',    desc:'Ancient primordial serpent of nightmares. Grants fear and poison magic.' },
];

export function DeityModal({ onSelectDeity, context = 'multiclass', cls = null }) {
  const [pending, setPending] = useState(null);

  const isWarlock = cls === 'Warlock';
  const options = isWarlock ? WARLOCK_PATRONS : DEITIES;

  const isMulticlass = context === 'multiclass';
  const title = isWarlock
    ? (isMulticlass ? 'Choose Your Patron' : 'Select Your Patron')
    : (isMulticlass ? 'Choose Your Patron Deity' : 'Select Your Deity');
  const subtitle = isWarlock
    ? (isMulticlass ? "You've made a pact with a dark power. Who holds your soul?" : "Your warlock never chose a patron. Select one now.")
    : (isMulticlass ? "You've entered the Cleric path. Which god do you now serve?" : 'Your cleric character never chose a patron. Select one now.');

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:4,padding:24,maxWidth:700,width:'100%',maxHeight:'90vh',overflow:'auto'}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:16,marginBottom:4,textAlign:'center'}}>{isWarlock ? '🌑' : '✨'} {title}</div>
        <div style={{fontSize:12,color:colors.textGhost,marginBottom:24,textAlign:'center',lineHeight:1.6}}>{subtitle}</div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
          {options.map((option) => {
            const isSelected = pending?.name === option.name;
            return (
              <div key={option.name} onClick={() => setPending(option)}
                style={{background:isSelected?colors.bgDark:colors.bg, border:isSelected?`2px solid ${colors.gold}`:`1px solid ${colors.border}`, borderRadius:6, padding:12, cursor:'pointer', transition:'all 0.15s'}}
                onMouseEnter={e=>{ if(!isSelected){e.currentTarget.style.borderColor=colors.gold;e.currentTarget.style.background=colors.bgDark;} }}
                onMouseLeave={e=>{ if(!isSelected){e.currentTarget.style.borderColor=colors.border;e.currentTarget.style.background=colors.bg;} }}
              >
                <div style={{fontSize:32,marginBottom:6}}>{option.emoji}</div>
                <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:2}}>{option.name}</div>
                <div style={{fontSize:9,color:colors.textGhost,marginBottom:8}}>{option.alignment}</div>
                <div style={{fontSize:10,color:colors.textFaint,lineHeight:1.5,marginBottom:6}}>{option.desc}</div>
                {isSelected && option.flavor && (
                  <div style={{fontSize:10,color:colors.gold,fontStyle:'italic',paddingTop:6,borderTop:`1px solid ${colors.border}`}}>✓ {option.flavor}</div>
                )}
              </div>
            );
          })}
        </div>

        <button style={{...btn(true),width:'100%',opacity:pending?1:0.4}} disabled={!pending} onClick={()=>pending&&onSelectDeity(pending)}>
          {isWarlock ? 'SEAL THE PACT →' : 'CONFIRM DEVOTION →'}
        </button>
      </div>
    </div>
  );
}
