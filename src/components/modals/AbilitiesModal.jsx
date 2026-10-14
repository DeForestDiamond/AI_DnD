import { LAND_SPELLS, DIVINE_AFFINITIES } from '../../constants/subclassAbilities.js';
import { INTERDICT_BOONS, interdictBoonCount, availableInterdictBoons, normalizeInterdictAbilities } from '../../constants/interdictBoons.js';
import { useRef, useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';
import { SPELL_INFO, ROLES, ROLE_ORDER } from '../../constants/spellInfo.js';
import { getAvailableAbilities, getAbilityCounts, magicalSecretsCount, availableMagicalSecrets, grantedSubclassMagic } from '../../constants/abilities.js';
import { RACE_TRAITS } from '../../constants/raceTraits.js';
import { SUBCLASSES } from '../../constants/subclasses.js';

export function AbilitiesModal({ character, onSave, onClose }) {
  const classLevels = character.classLevels || { [character.cls?.name]: character.level };
  const existing = normalizeInterdictAbilities(character.abilities || {}, classLevels);
  const abilityInfo = { ...SPELL_INFO, ...INTERDICT_BOONS };
  const deityName = character.deity?.name || null;
  const raceTraits = RACE_TRAITS[character.race?.name]?.traits || [];
  const subEntries = Object.entries(character.subclasses || {})
    .map(([cls, sub]) => ({ cls, sub, data: SUBCLASSES[cls]?.[sub] }))
    .filter(x => x.data);

  const [selected, setSelected] = useState({
    ...existing,
    interdictBoons: [...(existing.interdictBoons || [])],
    magicalSecrets: [...(existing.magicalSecrets || [])],
    subclassOptions: existing.subclassOptions || {},
    cantrips:  [...(existing.cantrips  || [])],
    spells:    [...(existing.spells    || [])],
    martial:   [...(existing.martial   || [])],
    infusions: [...(existing.infusions || [])],
  });
  const boonSectionRef = useRef(null);
  const [showRaceTraits, setShowRaceTraits] = useState(false);
  const [openDesc, setOpenDesc] = useState(null);   // which ability's description is expanded
  const [showSubclass, setShowSubclass] = useState(false);
  const [showGrantedMagic, setShowGrantedMagic] = useState(false);
  const [showSubclassOptions, setShowSubclassOptions] = useState(true);
  const hasSubclassOptions = character.subclasses?.Sorcerer === 'Divine Soul' || character.subclasses?.Druid === 'Circle of the Land';
  const sectionHeading = {fontFamily:fonts.display,fontSize:10,color:colors.gold,letterSpacing:2,marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',userSelect:'none',background:'transparent',border:0,padding:0,width:'100%',textAlign:'left'};
  const optionSelect = {display:'block',width:'100%',boxSizing:'border-box',marginTop:6,background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:'8px 10px',color:colors.textDim,fontFamily:fonts.body,fontSize:13,colorScheme:'dark'};

  // Calculate totals across all classes
  const totals = { cantrips:0, spells:0, martial:0, infusions:0, interdictBoons: interdictBoonCount(classLevels.Illrigger || 0), magicalSecrets: magicalSecretsCount(classLevels.Bard || 0, character.subclasses?.Bard) };
  const available = { cantrips:new Set(), spells:new Set(), martial:new Set(), infusions:new Set(), interdictBoons:new Set(availableInterdictBoons(classLevels.Illrigger || 0)), magicalSecrets:new Set(availableMagicalSecrets(classLevels.Bard || 0)) };
  const domainSet = { cantrips: new Set(), spells: new Set() };

  Object.entries(classLevels).forEach(([cls, lvl]) => {
    const counts = getAbilityCounts(cls, lvl, character.subclasses?.[cls]);
    totals.cantrips  += counts.cantrips;
    totals.spells    += counts.spells;
    totals.martial   += counts.martial || 0;
    totals.infusions += counts.infusions;
    // Pass deity name for Cleric and Warlock (patron system)
    const deity = (cls === 'Cleric' || cls === 'Warlock') ? deityName : null;
    const avail = getAvailableAbilities(cls, lvl, deity, character.subclasses?.[cls]);
    avail.cantrips.forEach(s  => available.cantrips.add(s));
    avail.spells.forEach(s    => available.spells.add(s));
    (avail.martial||[]).forEach(s => available.martial.add(s));
    avail.infusions.forEach(s => available.infusions.add(s));
    // Track which are domain-sourced for visual tagging
    (avail.domainCantrips || []).forEach(s => domainSet.cantrips.add(s));
    (avail.domainSpells   || []).forEach(s => domainSet.spells.add(s));
  });

  const unavailableBoons = selected.interdictBoons.filter(name => !available.interdictBoons.has(name));
  const invalidBoons = unavailableBoons.length > 0;
  const excessBoons = Math.max(0, selected.interdictBoons.length - totals.interdictBoons);
  const boonError = [
    excessBoons ? `You have ${selected.interdictBoons.length}/${totals.interdictBoons} Interdict Boons selected. Deselect ${excessBoons} to confirm.` : '',
    invalidBoons ? `Deselect unavailable boons: ${unavailableBoons.join(', ')}.` : '',
  ].filter(Boolean).join(' ');
  const grantedMagic = grantedSubclassMagic({ ...character, abilities:selected });
  const grantedNames = new Set(grantedMagic.map(x => x.name));
  const selectionCount = (type, names) => names.filter(name => !(['spells','cantrips'].includes(type) && grantedNames.has(name))).length;
  const toggle = (type, name) => {
    setSelected(prev => {
      const current = prev[type];
      if (current.includes(name)) {
        return { ...prev, [type]: current.filter(n => n !== name) };
      }
      if (type === 'interdictBoons' && !available.interdictBoons.has(name)) return prev;
      if (selectionCount(type, current) >= totals[type]) return prev; // at max
      return { ...prev, [type]: [...current, name] };
    });
  };

  const sections = [
    { key:'magicalSecrets', label:'📚 Magical Secrets', list:[...new Set([...available.magicalSecrets, ...selected.magicalSecrets])].sort() },
    { key:'interdictBoons', label:'🔥 Interdict Boons', list:[...new Set([...available.interdictBoons, ...selected.interdictBoons])].sort() },
    { key:'martial',   label:'⚔️ Techniques', list:[...available.martial].sort()   },
    { key:'cantrips',  label:'✨ Cantrips',   list:[...available.cantrips].sort()  },
    { key:'spells',    label:'📖 Spells',     list:[...available.spells].sort()    },
    { key:'infusions', label:'⚙️ Infusions',  list:[...available.infusions].sort() },
  ].filter(s => s.list.length > 0 && (totals[s.key] > 0 || selected[s.key].length > 0));

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:160,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:4,padding:20,maxWidth:480,width:'100%',maxHeight:'85vh',display:'flex',flexDirection:'column'}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:15,marginBottom:4,textAlign:'center'}}>
          📚 SELECT ABILITIES
        </div>
        <div style={{fontSize:11,color:colors.textFaint,marginBottom:4,textAlign:'center',lineHeight:1.5}}>
          Choose your abilities based on your class and level.
          {character.subclasses?.Sorcerer === 'Divine Soul' && classLevels.Sorcerer > 0 && (
            <div>Divine Soul: cleric spells and cantrips are available as sorcerer choices and share your normal selection limits.</div>
          )}
          {Object.entries(totals).map(([type, count]) =>
            count > 0 ? ` ${count} ${type === 'interdictBoons' ? 'Interdict Boons' : type}` : ''
          ).filter(Boolean).join(' ·')}
        </div>
        {deityName && (
          <div style={{fontSize:10,color:colors.gold,marginBottom:12,textAlign:'center',fontStyle:'italic'}}>
            {character.deity?.emoji} {deityName} domain spells are marked with ✦
          </div>
        )}

        <div style={{overflowY:'auto',flex:1,minHeight:0}}>

          {hasSubclassOptions && (
            <div style={{marginBottom:16}}>
              <button type="button" aria-expanded={showSubclassOptions} aria-controls="subclass-options" onClick={()=>setShowSubclassOptions(v=>!v)} style={sectionHeading}>
                <span>🧭 SUBCLASS CHOICES</span>
                <span style={{color:colors.textGhost}}>{showSubclassOptions ? '▲' : '▼'}</span>
              </button>
              {showSubclassOptions && <div id="subclass-options">
          {character.subclasses?.Sorcerer === 'Divine Soul' && (
            <label style={{display:'block',color:colors.gold,fontSize:13,marginBottom:12}}>
              Divine Soul affinity
              <select value={selected.subclassOptions.Sorcerer?.affinity || ''} style={optionSelect}
                onChange={e => { const affinity = e.target.value; setSelected(prev => ({...prev,subclassOptions:{...prev.subclassOptions,Sorcerer:{...prev.subclassOptions.Sorcerer,affinity}}})); }}>
                <option value="">Choose your affinity</option>
                {Object.entries(DIVINE_AFFINITIES).map(([affinity,spell]) => <option key={affinity} value={affinity}>{affinity} — {spell}</option>)}
              </select>
            </label>
          )}
          {character.subclasses?.Druid === 'Circle of the Land' && (
            <label style={{display:'block',color:colors.gold,fontSize:13,marginBottom:12}}>
              Circle of the Land terrain
              <select value={selected.subclassOptions.Druid?.land || ''} style={optionSelect}
                onChange={e => { const land = e.target.value; setSelected(prev => ({...prev,subclassOptions:{...prev.subclassOptions,Druid:{...prev.subclassOptions.Druid,land}}})); }}>
                <option value="">Choose your land</option>
                {Object.keys(LAND_SPELLS).map(land => <option key={land} value={land}>{land}</option>)}
              </select>
            </label>
          )}
              </div>}
            </div>
          )}
          {grantedMagic.length > 0 && (
            <div style={{marginBottom:16}}>
              <button type="button" aria-expanded={showGrantedMagic} aria-controls="subclass-granted-magic" onClick={()=>setShowGrantedMagic(v=>!v)} style={sectionHeading}>
                <span>✨ SUBCLASS GRANTED MAGIC <span style={{color:colors.textGhost}}>({grantedMagic.length})</span></span>
                <span style={{color:colors.textGhost}}>{showGrantedMagic ? '▲' : '▼'}</span>
              </button>
              {showGrantedMagic && <div id="subclass-granted-magic" style={{display:'flex',flexDirection:'column',gap:6}}>
                <div style={{color:colors.textFaint,fontSize:12,lineHeight:1.5,marginBottom:2}}>Available automatically; does not consume your selectable spell or cantrip allowance. Subclass resource costs still apply.</div>
                {grantedMagic.map(({name,cls,sub}) => <div key={cls+name} style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:'6px 10px'}}>
                  <div style={{fontSize:12,color:colors.gold,fontFamily:fonts.display,marginBottom:2}}>{name}</div>
                  <div style={{fontSize:10,color:colors.textGhost,fontStyle:'italic',marginBottom:3}}>{cls} — {sub}</div>
                  {abilityInfo[name]?.desc && <div style={{fontSize:12,color:colors.textFaint,lineHeight:1.5}}>{abilityInfo[name].desc}</div>}
                </div>)}
              </div>}
            </div>
          )}
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
                      <div style={{fontSize:12,color:colors.gold,fontFamily:fonts.display,marginBottom:2}}>{trait.name}</div>
                      <div style={{fontSize:12,color:colors.textFaint,lineHeight:1.5}}>{trait.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subclass paths */}
          {subEntries.length > 0 && (
            <div style={{marginBottom:16}}>
              <div
                onClick={() => setShowSubclass(v => !v)}
                style={{fontFamily:fonts.display,fontSize:10,color:colors.gold,letterSpacing:2,marginBottom:6,display:'flex',justifyContent:'space-between',cursor:'pointer',userSelect:'none'}}
              >
                <span>🧭 SUBCLASS PATHS</span>
                <span style={{color:colors.textGhost}}>{showSubclass ? '▲' : '▼'}</span>
              </div>
              {showSubclass && (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {subEntries.map(({ cls, sub, data }) => (
                    <div key={cls} style={{display:'flex',flexDirection:'column',gap:6}}>
                      <div style={{fontSize:10,color:colors.textGhost,fontStyle:'italic'}}>{data.emoji} {cls} — {sub}</div>
                      {data.features.map(f => (
                        <div key={f.name} style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:'6px 10px'}}>
                          <div style={{fontSize:10,color:colors.gold,fontFamily:fonts.display,marginBottom:2}}>{f.name}</div>
                          <div style={{fontSize:12,color:colors.textFaint,lineHeight:1.5}}>{f.desc}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {sections.length === 0 && (
            <div style={{textAlign:'center',color:colors.textGhost,fontSize:12,padding:'24px 0',fontStyle:'italic'}}>
              Your class doesn't have selectable abilities to manage at this level.
            </div>
          )}
          {sections.map(({ key, label, list }) => (
            <div key={key} ref={key === 'interdictBoons' ? boonSectionRef : undefined} style={{marginBottom:16}}>
              <div style={{fontFamily:fonts.display,fontSize:10,color:colors.gold,letterSpacing:2,marginBottom:6,display:'flex',justifyContent:'space-between'}}>
                <span>{label}</span>
                <span style={{color:selectionCount(key, selected[key]) >= totals[key] ? colors.green : colors.textGhost}}>
                  {selectionCount(key, selected[key])}/{totals[key]}
                </span>
              </div>
              {key === 'interdictBoons' && (
                <div style={{fontSize:12,color:colors.textFaint,lineHeight:1.5,marginBottom:8}}>
                  Boons enhance Baleful Interdict; they are not spells. Choose one at Illrigger level 1, two at 4, three at 7, and four at 9. App class levels use a compressed ten-level progression. Only one non-passive boon can activate per turn. You may replace one boon when gaining an Illrigger level. Descriptions summarize effects; use the class rules for saves and ranges.
                  {(selected[key].length > totals[key] || invalidBoons) && <div style={{color:colors.gold}}>Some saved boons exceed your count or level allowance. Remove those choices before confirming.</div>}
                </div>
              )}
              {(() => {
                // Group by ROLE — what you are reaching for when you pick —
                // rather than alphabetically. Anything without an entry in
                // SPELL_INFO falls into 'other' so nothing is ever hidden.
                const groups = {};
                list.forEach(nm => {
                  const r = abilityInfo[nm]?.role || 'other';
                  (groups[r] = groups[r] || []).push(nm);
                });
                const order = [...ROLE_ORDER.filter(r => groups[r]), ...(groups.other ? ['other'] : [])];
                return order.map(role => (
                  <div key={role} style={{marginBottom:8}}>
                    <div style={{fontSize:11,color:colors.textGhost,letterSpacing:1,marginBottom:4,fontFamily:fonts.display}}>
                      {ROLES[role] ? `${ROLES[role].emoji} ${ROLES[role].label.toUpperCase()}` : '• OTHER'}
                      <span style={{color:colors.textDead}}> {groups[role].length}</span>
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {groups[role].map(name => {
                  const isSelected = selected[key].includes(name);
                  const atMax = selected[key].length >= totals[key];
                  const isDomain = domainSet[key]?.has(name);
                  return (
                    <div key={name}
                      role="button" tabIndex={0} aria-pressed={isSelected}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(key, name); } }}
                      onClick={() => toggle(key, name)}
                      style={{
                        padding:'5px 9px',
                        borderRadius:3,
                        fontSize:13,
                        display:'flex',
                        alignItems:'center',
                        gap:5,
                        cursor: isSelected || !atMax ? 'pointer' : 'default',
                        border:`1px solid ${isSelected ? colors.gold : isDomain ? 'rgba(201,168,76,0.4)' : colors.borderDim}`,
                        background: isSelected ? 'rgba(201,168,76,0.15)' : isDomain ? 'rgba(201,168,76,0.05)' : 'transparent',
                        color: isSelected ? colors.gold : isDomain ? 'rgba(201,168,76,0.8)' : atMax ? colors.textDead : colors.textFaint,
                        transition:'all 0.15s',
                      }}>
                      <span>{isDomain ? '✦ ' : ''}{name}{key === 'interdictBoons' ? ` (Lv ${INTERDICT_BOONS[name]?.level || '?'})` : ''}</span>
                      {abilityInfo[name]?.desc && (
                        <span
                          onClick={(e) => { e.stopPropagation(); setOpenDesc(openDesc === name ? null : name); }}
                          title="What does this do?"
                          style={{fontSize:12,color:openDesc===name?colors.gold:colors.textDead,cursor:'pointer',padding:'0 2px'}}>
                          ⓘ
                        </span>
                      )}
                    </div>
                  );
                })}
                    </div>
                    {/* One description at a time, full width and readable,
                        rather than a wall of tiny text under every chip. */}
                    {openDesc && groups[role].includes(openDesc) && (
                      <div style={{
                        marginTop:6, padding:'8px 10px', borderRadius:4,
                        background:'rgba(201,168,76,0.06)', border:`1px solid ${colors.borderDim}`,
                      }}>
                        <div style={{fontFamily:fonts.display,fontSize:12,color:colors.gold,marginBottom:3}}>{openDesc}</div>
                        <div style={{fontSize:13,color:colors.textFaint,lineHeight:1.55}}>{abilityInfo[openDesc].desc}</div>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          ))}
        </div>

        {boonError && (
          <div role="alert" style={{color:colors.gold,fontSize:12,lineHeight:1.5,marginTop:12}}>
            {boonError}
            <button type="button" style={{...btn(false),width:'100%',marginTop:6,fontSize:11}}
              onClick={() => boonSectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}>
              Review Interdict Boons
            </button>
          </div>
        )}
        <button
          type="button"
          style={{...btn(true),width:'100%',marginTop:12,fontSize:11,opacity:boonError ? 0.45 : 1,cursor:boonError ? 'not-allowed' : 'pointer'}}
          disabled={!!boonError}
          onClick={() => { if (!boonError) onSave({...selected,subclassSpells:[...new Set(grantedMagic.map(x => x.name))]}); }}>
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


