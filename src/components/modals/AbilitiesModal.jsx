import { useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';
import { getAvailableAbilities, getAbilityCounts } from '../../constants/abilities.js';
import { RACE_TRAITS } from '../../constants/raceTraits.js';

export function AbilitiesModal({ character, onSave, onClose }) {
  const classLevels = character.classLevels || { [character.cls?.name]: character.level };
  const existing = character.abilities || {};
  const deityName = character.deity?.name || null;
  const raceTraits = RACE_TRAITS[character.race?.name]?.traits || [];

  const [selected, setSelected] = useState({
    cantrips:  [...(existing.cantrips  || [])],
    spells:    [...(existing.spells    || [])],
    infusions: [...(existing.infusions || [])],
  });
  const [showRaceTraits, setShowRaceTraits] = useState(false);

  // Calculate totals across all classes
  const totals = { cantrips:0, spells:0, infusions:0 };
  const available = { cantrips:new Set(), spells:new Set(), infusions:new Set() };
  const domainSet = { cantrips: new Set(), spells: new Set() };

  Object.entries(classLevels).forEach(([cls, lvl]) => {
    const counts = getAbilityCounts(cls, lvl);
    totals.cantrips  += counts.cantrips;
    totals.spells    += counts.spells;
    totals.infusions += counts.infusions;
    // Pass deity name only for Cleric entries
    const deity = cls === 'Cleric' ? deityName : null;
    const avail = getAvailableAbilities(cls, lvl, deity);
    avail.cantrips.forEach(s  => available.cantrips.add(s));
    avail.spells.forEach(s    => available.spells.add(s));
    avail.infusions.forEach(s => available.infusions.add(s));
    // Track which are domain-sourced for visual tagging
    (avail.domainCantrips || []).forEach(s => domainSet.cantrips.add(s));
    (avail.domainSpells   || []).forEach(s => domainSet.spells.add(s));
  });

  const toggle = (type, name) => {
    setSelected(prev => {
      const current = prev[type];
      if (current.includes(name)) {
        return { ...prev, [type]: current.filter(n => n !== name) };
      }
      if (current.length >= totals[type]) return prev; // at max
      return { ...prev, [type]: [...current, name] };
    });
  };

  const sections = [
    { key:'cantrips',  label:'✨ Cantrips',   list:[...available.cantrips].sort()  },
    { key:'spells',    label:'📖 Spells',     list:[...available.spells].sort()    },
    { key:'infusions', label:'⚙️ Infusions',  list:[...available.infusions].sort() },
  ].filter(s => s.list.length > 0 && totals[s.key] > 0);

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:160,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:4,padding:20,maxWidth:480,width:'100%',maxHeight:'85vh',display:'flex',flexDirection:'column'}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:15,marginBottom:4,textAlign:'center'}}>
          📚 SELECT ABILITIES
        </div>
        <div style={{fontSize:11,color:colors.textFaint,marginBottom:4,textAlign:'center',lineHeight:1.5}}>
          Choose your known spells, cantrips, and infusions based on your class and level.
          {Object.entries(totals).map(([type, count]) =>
            count > 0 ? ` ${count} ${type}` : ''
          ).filter(Boolean).join(' ·')}
        </div>
        {deityName && (
          <div style={{fontSize:10,color:colors.gold,marginBottom:12,textAlign:'center',fontStyle:'italic'}}>
            {character.deity?.emoji} {deityName} domain spells are marked with ✦
          </div>
        )}

        <div style={{overflowY:'auto',flex:1}}>

          {/* Racial Traits */}
          {raceTraits.length > 0 && (
            <div style={{marginBottom:16}}>
              <div
                onClick={() => setShowRaceTraits(v => !v)}
                style={{fontFamily:fonts.display,fontSize:10,color:colors.gold,letterSpacing:2,marginBottom:6,display:'flex',justifyContent:'space-between',cursor:'pointer',userSelect:'none'}}
              >
                <span>🧬 {character.race?.name?.toUpperCase()} RACIAL TRAITS</span>
                <span style={{color:colors.textGhost}}>{showRaceTraits ? '▲' : '▼'}</span>
              </div>
              {showRaceTraits && (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {raceTraits.map(trait => (
                    <div key={trait.name} style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:'6px 10px'}}>
                      <div style={{fontSize:10,color:colors.gold,fontFamily:fonts.display,marginBottom:2}}>{trait.name}</div>
                      <div style={{fontSize:10,color:colors.textFaint,lineHeight:1.5}}>{trait.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {sections.length === 0 && (
            <div style={{textAlign:'center',color:colors.textGhost,fontSize:12,padding:'24px 0',fontStyle:'italic'}}>
              Your class doesn't have spells, cantrips, or infusions to manage at this level.
            </div>
          )}
          {sections.map(({ key, label, list }) => (
            <div key={key} style={{marginBottom:16}}>
              <div style={{fontFamily:fonts.display,fontSize:10,color:colors.gold,letterSpacing:2,marginBottom:6,display:'flex',justifyContent:'space-between'}}>
                <span>{label}</span>
                <span style={{color:selected[key].length >= totals[key] ? colors.green : colors.textGhost}}>
                  {selected[key].length}/{totals[key]}
                </span>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {list.map(name => {
                  const isSelected = selected[key].includes(name);
                  const atMax = selected[key].length >= totals[key];
                  const isDomain = domainSet[key]?.has(name);
                  return (
                    <div key={name}
                      onClick={() => toggle(key, name)}
                      style={{
                        padding:'4px 8px',
                        borderRadius:3,
                        fontSize:10,
                        cursor: isSelected || !atMax ? 'pointer' : 'default',
                        border:`1px solid ${isSelected ? colors.gold : isDomain ? 'rgba(201,168,76,0.4)' : colors.borderDim}`,
                        background: isSelected ? 'rgba(201,168,76,0.15)' : isDomain ? 'rgba(201,168,76,0.05)' : 'transparent',
                        color: isSelected ? colors.gold : isDomain ? 'rgba(201,168,76,0.8)' : atMax ? colors.textDead : colors.textFaint,
                        transition:'all 0.15s',
                      }}>
                      {isDomain ? '✦ ' : ''}{name}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          style={{...btn(true),width:'100%',marginTop:12,fontSize:11}}
          onClick={() => onSave(selected)}>
          Confirm Abilities
        </button>
        {onClose && (
          <button
            style={{...btn(false),width:'100%',marginTop:8,fontSize:11}}
            onClick={onClose}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
