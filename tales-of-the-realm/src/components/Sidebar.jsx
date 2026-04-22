import { colors, fonts, btn } from '../styles/theme.js';
import { SLOTS } from '../constants/items.js';
import { STAT_NAMES } from '../constants/classes.js';
import { statMod, modStr, profBonus, calcAC, getMainWeapon, effectiveStats, equippableInSlot, allItems } from '../hooks/useCharacter.js';

const XP_THRESHOLDS = [0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000];

function HPBar({ current, max }) {
  const pct   = max > 0 ? Math.max(0, (current / max) * 100) : 0;
  const color = pct > 60 ? colors.green : pct > 30 ? colors.yellow : colors.red;
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontFamily:fonts.display,fontSize:10,color:colors.gold,letterSpacing:1}}>HIT POINTS</span>
        <span style={{fontFamily:fonts.mono,color,fontWeight:'bold',fontSize:12}}>{current}/{max}</span>
      </div>
      <div style={{background:colors.borderFaint,borderRadius:3,height:7,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:3,transition:'all 0.5s'}}/>
      </div>
    </div>
  );
}

function XPBar({ xp, level }) {
  const next = XP_THRESHOLDS[Math.min(level+1, XP_THRESHOLDS.length-1)];
  const cur  = XP_THRESHOLDS[level] || 0;
  const pct  = next > cur ? Math.min(100, ((xp-cur)/(next-cur))*100) : 100;
  const max  = level >= XP_THRESHOLDS.length-1;
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
        <span style={{fontFamily:fonts.display,fontSize:9,color:colors.textGhost,letterSpacing:1}}>XP</span>
        <span style={{fontFamily:fonts.mono,color:colors.textGhost,fontSize:10}}>{xp}{max?' (max)':`/${next}`}</span>
      </div>
      <div style={{background:colors.borderFaint,borderRadius:3,height:4,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:colors.goldFaint,borderRadius:3,transition:'all 0.8s'}}/>
      </div>
    </div>
  );
}

const slotItemLabel = (name, data) => {
  if (!data) return name;
  if (data.type === 'weapon') return `${name} (${data.damage}${data.bonus?`+${data.bonus}`:''})`;
  if (data.type === 'armor')  return `${name} (AC ${data.ac})`;
  if (data.type === 'shield') return `${name} (+${data.ac||2}AC)`;
  if (data.label)             return `${name} [${data.label}]`;
  return name;
};

export function Sidebar({ character, onSlotClick, onSaveClick }) {
  const db       = allItems(character.customItems || {});
  const effStats = character.stats.dex ? effectiveStats(character.stats, character.slots, character.customItems||{}) : character.stats;
  const ac       = character.stats.dex ? calcAC(character.slots, character.stats, character.customItems||{}) : '—';
  const weapon   = character.stats.dex ? getMainWeapon(character.slots, character.stats, character.customItems||{}) : null;
  const pb       = profBonus(character.level);

  const sidebarStyle = {
    width:220, flexShrink:0,
    background:'rgba(10,7,3,0.95)',
    borderRight:`1px solid ${colors.border}`,
    overflowY:'auto',
    display:'flex', flexDirection:'column', gap:10, padding:12,
  };

  const sectionLabel = (text) => (
    <div style={{fontFamily:fonts.display,fontSize:9,color:colors.textGhost,letterSpacing:3,marginBottom:4}}>{text}</div>
  );

  const statBox = (label, value) => (
    <div style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:'5px 6px',textAlign:'center'}}>
      <div style={{fontFamily:fonts.display,fontSize:8,color:colors.goldFaint,letterSpacing:2}}>{label}</div>
      <div style={{fontFamily:fonts.mono,fontSize:18,color:colors.gold,fontWeight:'bold'}}>{value}</div>
    </div>
  );

  return (
    <div style={sidebarStyle}>

      {/* Identity */}
      <div>
        {sectionLabel('ADVENTURER')}
        <div style={{fontSize:20,marginBottom:2}}>{character.cls?.emoji}</div>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13}}>{character.name}</div>
        <div style={{fontSize:10,color:colors.textFaint}}>{character.race?.name} {character.cls?.name} · Lv {character.level}</div>
      </div>

      <HPBar current={character.hp} max={character.maxHp}/>
      <XPBar xp={character.xp||0} level={character.level}/>

      {/* Combat stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
        {statBox('ARMOR CLASS', ac)}
        {statBox('PROF BONUS', `+${pb}`)}
      </div>

      {/* Active weapon */}
      {weapon && (
        <div style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:'6px 8px'}}>
          {sectionLabel('WEAPON')}
          <div style={{fontSize:11,color:colors.gold,fontFamily:fonts.display}}>{weapon.name}</div>
          <div style={{fontSize:10,color:colors.textFaint}}>
            Dmg: {weapon.damage}{weapon.bonus?`+${weapon.bonus}`:''} + {modStr(weapon.statBonus)} · Atk: +{weapon.statBonus+pb+(weapon.bonus||0)}
          </div>
          {weapon.finesse && <div style={{fontSize:8,color:colors.textDead}}>finesse · using DEX</div>}
        </div>
      )}

      {/* Stats */}
      <div>
        {sectionLabel('STATS')}
        {Object.entries(effStats).map(([k,v]) => (
          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
            <span style={{fontSize:10,color:colors.textFaint}}>{STAT_NAMES[k]}</span>
            <span style={{fontFamily:fonts.mono,fontSize:11,color:v>=15?colors.gold:colors.text,fontWeight:'bold'}}>
              {v} <span style={{color:colors.textDead,fontSize:8}}>({modStr(v)})</span>
            </span>
          </div>
        ))}
      </div>

      {/* Gold */}
      <div>
        {sectionLabel('GOLD')}
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13}}>⚜ {character.gold}gp</div>
      </div>

      {/* Equipment slots */}
      <div>
        {sectionLabel('EQUIPMENT')}
        {SLOTS.map(slot => {
          const itemName = character.slots[slot.id];
          const data     = itemName ? db[itemName] : null;
          const label    = itemName ? slotItemLabel(itemName, data) : null;
          const canEquip = !itemName && equippableInSlot(character, slot.id).length > 0;
          return (
            <div key={slot.id} onClick={() => onSlotClick(slot.id)}
              style={{display:'flex',alignItems:'center',gap:5,padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`,cursor:itemName||canEquip?'pointer':'default',opacity:itemName||canEquip?1:0.4}}>
              <span style={{fontSize:11,flexShrink:0}}>{slot.emoji}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:8,color:colors.textGhost,fontFamily:fonts.display}}>{slot.label}</div>
                {itemName
                  ? <div style={{fontSize:10,color:colors.gold,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</div>
                  : <div style={{fontSize:9,color:colors.textDead,fontStyle:'italic'}}>{canEquip?'tap to equip':'—'}</div>
                }
              </div>
              {itemName && <span style={{fontSize:8,color:colors.textDead,flexShrink:0}}>✕</span>}
            </div>
          );
        })}
      </div>

      {/* Backpack */}
      <div>
        {sectionLabel('BACKPACK')}
        {character.inventory.length === 0
          ? <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic'}}>empty</div>
          : character.inventory.map((name,i) => {
            const data = db[name];
            const statLabel = data?.type==='weapon'?` (${data.damage})`:data?.type==='armor'?` (AC${data.ac})`:data?.type==='shield'?` (+${data.ac||2}AC)`:data?.label?` [${data.label}]`:'';
            return (
              <div key={i} style={{fontSize:10,color:data?colors.textFaint:colors.textGhost,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
                · {name}{statLabel}
              </div>
            );
          })
        }
      </div>

      <button style={{...btn(false),width:'100%',fontSize:10,marginTop:'auto'}} onClick={onSaveClick}>
        💾 Save / Export
      </button>
    </div>
  );
}
