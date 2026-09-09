import { useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';
import { SLOTS } from '../../constants/items.js';
import { STAT_NAMES } from '../../constants/classes.js';
import {
  statMod, modStr, profBonus, calcAC, getMainWeapon, effectiveStats,
  equippableInSlot, skillBonuses, effectiveMaxHp, gearHpBonus,
} from '../../hooks/useCharacter.js';
import { SKILL_ABILITY, SKILL_LIST } from '../../hooks/useGame.js';
import { coinsToString, parseCoinAmount } from '../../constants/currency.js';
import { slotItemLabel } from './inventory/labels.js';
import { HPBar, XPBar, CollapsibleSection } from './common/index.jsx';
import { CompanionSlots } from './world/Panels.jsx';
import { InventoryPanel } from './inventory/InventoryPanel.jsx';

export function CharacterPanel({
  character,
  db,
  onAbilitiesClick,
  onSlotClick,
  onCompanionSlotClick,
  onCompanionUnequip,
  onBankCoins,
  onWithdrawCoins,
  onToggleContextExclusion,
  onMoveToStash,
  onMoveToInventory,
  onCreateBag,
  onAddToBag,
  onRemoveFromBag,
  onDeleteItem,
  onRenameItem,
  onDeleteFromBag,
  onCycleConstructStatus,
  onPromoteConstruct,
}) {
  const [bankDraft, setBankDraft] = useState('');
  const effStats = character.stats.dex ? effectiveStats(character.stats, character.slots, character.items||{}) : character.stats;
  const gearSkills = skillBonuses(character.slots, character.items || {});
  const ac = character.stats.dex ? calcAC(character.slots, character.stats, character.items||{}) : '—';
  const weapon = character.stats.dex ? getMainWeapon(character.slots, character.stats, character.items||{}) : null;
  const pb = profBonus(character.level);

  const sectionLabel = (text) => (
    <div style={{fontFamily:fonts.display,fontSize:13,color:colors.textGhost,letterSpacing:3,marginBottom:4}}>{text}</div>
  );
  const statBox = (label, value) => (
    <div style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:'5px 6px',textAlign:'center'}}>
      <div style={{fontFamily:fonts.display,fontSize:12,color:colors.goldFaint,letterSpacing:2}}>{label}</div>
      <div style={{fontFamily:fonts.mono,fontSize:18,color:colors.gold,fontWeight:'bold'}}>{value}</div>
    </div>
  );

  return <>
    {onAbilitiesClick && (
      <button onClick={onAbilitiesClick} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0'}}>
        📚 Manage Abilities
      </button>
    )}

    <div>
      {sectionLabel('ADVENTURER')}
      <div style={{fontSize:20,marginBottom:2}}>{character.cls?.emoji}</div>
      <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13}}>{character.name}</div>
      <div style={{fontSize:12,color:colors.textFaint}}>{character.race?.name} · Lv {character.level}</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>
        {Object.entries(character.classLevels || { [character.cls?.name]: character.level }).map(([cls, lvl]) => (
          <div key={cls} style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:3,padding:'2px 6px',fontSize:13,color:colors.textFaint,fontFamily:fonts.display}}>
            {cls} {lvl}
          </div>
        ))}
      </div>
    </div>

    <HPBar current={character.hp} max={effectiveMaxHp(character)}/>
    {gearHpBonus(character) !== 0 && (
      <div style={{fontSize:9,color:colors.textGhost,textAlign:'right',marginTop:-2}}>
        includes {gearHpBonus(character) > 0 ? '+' : ''}{gearHpBonus(character)} from gear CON
      </div>
    )}
    <XPBar xp={character.xp||0} level={character.level}/>

    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
      {statBox('ARMOR CLASS', ac)}
      {statBox('PROF BONUS', `+${pb}`)}
    </div>

    {weapon && (
      <div style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:'6px 8px'}}>
        {sectionLabel('WEAPON')}
        <div style={{fontSize:13,color:colors.gold,fontFamily:fonts.display}}>{weapon.name}</div>
        <div style={{fontSize:12,color:colors.textFaint}}>
          Dmg: {weapon.damage}{weapon.bonus?`+${weapon.bonus}`:''} {weapon.statBonus>=0?`+ ${weapon.statBonus}`:`- ${Math.abs(weapon.statBonus)}`} · Atk: +{weapon.statBonus+pb+(weapon.bonus||0)}
          {(weapon.extras||[]).map((e,i) => <span key={i} style={{color:colors.goldFaint}}> + {e.dice} {e.type}</span>)}
        </div>
        {weapon.finesse && <div style={{fontSize:12,color:colors.textDead}}>finesse · using DEX</div>}
      </div>
    )}

    <div>
      {sectionLabel('STATS')}
      {Object.entries(effStats).map(([k,v]) => (
        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
          <span style={{fontSize:12,color:colors.textFaint}}>{STAT_NAMES[k]}</span>
          <span style={{fontFamily:fonts.mono,fontSize:13,color:v>=15?colors.gold:colors.text,fontWeight:'bold'}}>
            {v} <span style={{color:colors.textDead,fontSize:12}}>({modStr(v)})</span>
          </span>
        </div>
      ))}
    </div>

    {character.stats.dex && (
      <CollapsibleSection title="SKILLS" count={Object.keys(gearSkills).length || undefined} defaultOpen={false}>
        {SKILL_LIST.map(({ key, label, ability }) => {
          const gear = Object.entries(gearSkills)
            .filter(([g]) => g.toLowerCase() === key || SKILL_ABILITY[g.toLowerCase()] === ability && g.toLowerCase().replace(/\s+/g,'') === key)
            .reduce((sum, [, v]) => sum + v, 0);
          const total = statMod(effStats[ability]) + pb + gear;
          return (
            <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
              <span style={{fontSize:12,color:gear?colors.text:colors.textFaint}}>
                {label}<span style={{color:colors.textGhost,fontSize:10}}> {ability.toUpperCase()}</span>
              </span>
              <span style={{fontFamily:fonts.mono,fontSize:13,color:gear?colors.gold:colors.text,fontWeight:gear?'bold':'normal'}}>
                {total >= 0 ? `+${total}` : total}{gear > 0 && <span style={{color:colors.textDead,fontSize:11}}> (+{gear} gear)</span>}
              </span>
            </div>
          );
        })}
      </CollapsibleSection>
    )}

    <div>
      {sectionLabel('GOLD')}
      <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'baseline'}}>
        <span style={{fontSize:10,color:colors.textGhost,fontFamily:fonts.display,letterSpacing:1}}>CARRIED</span>
        <span style={{fontFamily:fonts.display,color:colors.gold,fontSize:13}}>⚜ {coinsToString(character.coins)}</span>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'baseline',marginTop:2}}>
        <span style={{fontSize:10,color:colors.textGhost,fontFamily:fonts.display,letterSpacing:1}}>BANKED</span>
        <span style={{fontFamily:fonts.display,color:colors.textFaint,fontSize:12}}>⚜ {coinsToString(character.bankedCoins || 0)}</span>
      </div>
      {(onBankCoins || onWithdrawCoins) && (
        <div style={{marginTop:5}}>
          <input value={bankDraft} onChange={e=>setBankDraft(e.target.value)} placeholder="Amount (e.g. 500gp)" inputMode="text"
            style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.35)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.mono,fontSize:11,padding:'4px 6px',borderRadius:3,outline:'none',marginBottom:4}} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:4}}>
            <button onClick={()=>{ const n=Math.max(0,parseCoinAmount(bankDraft)); if(n){onBankCoins?.(n);setBankDraft('');} }}
              disabled={Math.max(0,parseCoinAmount(bankDraft)) <= 0 || (character.coins || 0) <= 0}
              style={{...btn(false),fontSize:9,padding:'3px 2px'}}>↓ BANK</button>
            <button onClick={()=>{ const n=Math.max(0,parseCoinAmount(bankDraft)); if(n){onWithdrawCoins?.(n);setBankDraft('');} }}
              disabled={Math.max(0,parseCoinAmount(bankDraft)) <= 0 || (character.bankedCoins || 0) <= 0}
              style={{...btn(false),fontSize:9,padding:'3px 2px'}}>↑ WITHDRAW</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
            <button onClick={()=>onBankCoins?.(character.coins || 0)} disabled={(character.coins || 0) <= 0}
              style={{...btn(false),fontSize:8,padding:'2px 2px',color:colors.textGhost}}>BANK ALL</button>
            <button onClick={()=>onWithdrawCoins?.(character.bankedCoins || 0)} disabled={(character.bankedCoins || 0) <= 0}
              style={{...btn(false),fontSize:8,padding:'2px 2px',color:colors.textGhost}}>WITHDRAW ALL</button>
          </div>
        </div>
      )}
    </div>

    <CollapsibleSection title="EQUIPMENT" count={Object.values(character.slots).filter(Boolean).length} defaultOpen={false}>
      {SLOTS.map(slot => {
        const itemName = character.slots[slot.id];
        const data = itemName ? db[itemName] : null;
        const label = itemName ? slotItemLabel(itemName, data) : null;
        const canEquip = !itemName && equippableInSlot(character, slot.id).length > 0;
        return (
          <div key={slot.id} onClick={() => onSlotClick(slot.id)}
            style={{display:'flex',alignItems:'center',gap:5,padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`,cursor:itemName||canEquip?'pointer':'default',opacity:itemName||canEquip?1:0.4}}>
            <span style={{fontSize:13,flexShrink:0}}>{slot.emoji}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,color:colors.textGhost,fontFamily:fonts.display}}>{slot.label}</div>
              {itemName
                ? <div style={{fontSize:12,color:colors.gold,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</div>
                : <div style={{fontSize:13,color:colors.textDead,fontStyle:'italic'}}>{canEquip?'tap to equip':'—'}</div>}
            </div>
            {itemName && <span style={{fontSize:12,color:colors.textDead,flexShrink:0}}>✕</span>}
          </div>
        );
      })}
    </CollapsibleSection>

    {character.abilities && <>
      {character.abilities.cantrips?.length > 0 && (
        <CollapsibleSection title="✨ CANTRIPS" count={character.abilities.cantrips.length} defaultOpen={false}>
          {character.abilities.cantrips.map(name => <div key={name} style={{fontSize:12,color:colors.textFaint,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>· {name}</div>)}
        </CollapsibleSection>
      )}
      {character.abilities.spells?.length > 0 && (
        <CollapsibleSection title="📖 SPELLS" count={character.abilities.spells.length} defaultOpen={false}>
          {character.abilities.spells.map(name => <div key={name} style={{fontSize:12,color:colors.textFaint,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>· {name}</div>)}
        </CollapsibleSection>
      )}
      {character.abilities.infusions?.length > 0 && (
        <CollapsibleSection title="⚙️ INFUSIONS" count={character.abilities.infusions.length} defaultOpen={false}>
          {character.abilities.infusions.map(name => <div key={name} style={{fontSize:12,color:colors.textFaint,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>· {name}</div>)}
        </CollapsibleSection>
      )}
    </>}

    {character.companions && Object.keys(character.companions).length > 0 && (
      <CollapsibleSection title="COMPANIONS" count={Object.keys(character.companions).length} defaultOpen={false}>
        {Object.entries(character.companions).map(([name, data]) => {
          const excluded = character.contextExclusions?.companions?.[name];
          return (
            <div key={name} style={{padding:'4px 0',borderBottom:`1px solid ${colors.borderFaint}`,opacity:excluded?0.4:1}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="checkbox" checked={!excluded} onChange={()=>onToggleContextExclusion?.('companions',name)}
                  style={{cursor:'pointer',accentColor:colors.gold,flexShrink:0}} title={excluded?'Excluded from AI context':'Included in AI context'}/>
                <div style={{color:colors.gold,fontFamily:fonts.display,fontSize:12}}>{data.emoji||'👤'} {name}</div>
              </div>
              {data.desc && <div style={{color:colors.textGhost,fontSize:13,marginTop:1,lineHeight:1.4}}>{data.desc}</div>}
              <CompanionSlots companion={data} name={name} db={db} character={character} onSlotClick={onCompanionSlotClick} onUnequip={onCompanionUnequip}/>
            </div>
          );
        })}
      </CollapsibleSection>
    )}

    {character.npcs && Object.keys(character.npcs).length > 0 && (
      <CollapsibleSection title="KEY NPCs" count={Object.keys(character.npcs).length} defaultOpen={false}>
        {Object.entries(character.npcs).map(([name, data]) => {
          const excluded = character.contextExclusions?.npcs?.[name];
          return (
            <div key={name} style={{padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`,opacity:excluded?0.4:1}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="checkbox" checked={!excluded} onChange={()=>onToggleContextExclusion?.('npcs',name)}
                  style={{cursor:'pointer',accentColor:colors.gold,flexShrink:0}} title={excluded?'Excluded from AI context':'Included in AI context'}/>
                <div style={{color:colors.textDim,fontFamily:fonts.display,fontSize:12}}>{name}</div>
              </div>
              <div style={{color:colors.textGhost,fontSize:13}}>{data.location}</div>
              <div style={{color:colors.textGhost,fontSize:13,fontStyle:'italic'}}>{data.relationship}</div>
            </div>
          );
        })}
      </CollapsibleSection>
    )}

    {character.towns && Object.keys(character.towns).length > 0 && (
      <CollapsibleSection title="🏙️ TOWNS" count={Object.keys(character.towns).length} defaultOpen={false}>
        {Object.entries(character.towns).map(([townName, data]) => {
          const isCurrent = character.currentLocation
            ? character.currentLocation.toLowerCase().includes(townName.toLowerCase()) || townName.toLowerCase().includes(character.currentLocation.toLowerCase())
            : false;
          const excluded = character.contextExclusions?.towns?.[townName];
          return (
            <div key={townName} style={{padding:'4px 0',borderBottom:`1px solid ${colors.borderFaint}`,opacity:excluded?0.4:1}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="checkbox" checked={!excluded} onChange={()=>onToggleContextExclusion?.('towns',townName)}
                  style={{cursor:'pointer',accentColor:colors.gold,flexShrink:0}} title={excluded?'Excluded from AI context':'Included in AI context'}/>
                <div style={{color:isCurrent?colors.gold:colors.textDim,fontFamily:fonts.display,fontSize:12}}>{townName}</div>
                {isCurrent && <span style={{fontSize:10,color:colors.gold}}>◆ HERE</span>}
              </div>
              {data.desc && <div style={{color:colors.textGhost,fontSize:12,marginTop:1}}>{data.desc}</div>}
              {data.status && <div style={{color:colors.textDead,fontSize:11,fontStyle:'italic',marginTop:1}}>{data.status}</div>}
              {data.notable_locations && Object.keys(data.notable_locations).length > 0 && (
                <div style={{marginTop:3}}>{Object.entries(data.notable_locations).map(([loc, desc]) => (
                  <div key={loc} style={{fontSize:11,color:colors.textGhost,paddingLeft:6}}>· <span style={{color:colors.textFaint}}>{loc}</span>: {desc}</div>
                ))}</div>
              )}
              {data.minor_residents && Object.keys(data.minor_residents).length > 0 && (
                <div style={{marginTop:3}}>{Object.entries(data.minor_residents).map(([res, desc]) => (
                  <div key={res} style={{fontSize:11,color:colors.textGhost,paddingLeft:6}}>· <span style={{color:colors.textFaint}}>{res}</span>: {desc}</div>
                ))}</div>
              )}
            </div>
          );
        })}
      </CollapsibleSection>
    )}

    <InventoryPanel
      character={character}
      db={db}
      onMoveToStash={onMoveToStash}
      onMoveToInventory={onMoveToInventory}
      onCreateBag={onCreateBag}
      onAddToBag={onAddToBag}
      onRemoveFromBag={onRemoveFromBag}
      onDeleteItem={onDeleteItem}
      onRenameItem={onRenameItem}
      onDeleteFromBag={onDeleteFromBag}
      onCycleConstructStatus={onCycleConstructStatus}
      onPromoteConstruct={onPromoteConstruct}
    />
  </>;
}
