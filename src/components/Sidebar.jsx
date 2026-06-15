import { useState } from 'react';
import { PACING } from '../constants/encounters.js';
import { colors, fonts, btn } from '../styles/theme.js';
import { SLOTS } from '../constants/items.js';
import { STAT_NAMES } from '../constants/classes.js';
import { statMod, modStr, profBonus, calcAC, getMainWeapon, effectiveStats, equippableInSlot, allItems } from '../hooks/useCharacter.js';
import { stackInventory } from '../hooks/useGame.js';
import { XP_THRESHOLDS } from '../constants/progression.js';

// ── Inventory categorization ───────────────────────────────────────────────────
const categorizeItem = (name, data) => {
  const n = name.toLowerCase();
  // Check explicit type first
  if (data?.type === 'weapon') return 'weapons';
  if (data?.type === 'armor' || data?.type === 'shield' || data?.type === 'magic') return 'armor';
  if (data?.type === 'bag') return 'misc';
  if (data?.type === 'loot' || data?.type === 'crafting') return 'loot';
  if (data?.type === 'valuable' || data?.type === 'gem' || data?.type === 'currency') return 'valuables';
  if (data?.type === 'quest') return 'quest';
  if (data?.type === 'consumable' || data?.type === 'potion') return 'consumables';
  // Keyword fallback
  if (n.includes('book') || n.includes('codex') || n.includes('tome') ||
      n.includes('compendium') || n.includes('guide') || n.includes('liturgy') ||
      n.includes('accord') || n.includes('testimony') ||
      n.includes('contracts of') || n.includes('scholar') || n.includes('fundamentals') ||
      n.includes('theory') || n.includes('artisan') || n.includes('binding magic') ||
      n.includes('sacred materials') || n.includes('construct design') ||
      n.includes('nocturnal') || n.includes('lunar binding') || n.includes('lunar sight') ||
      n.includes('advanced lunar') || n.includes('grimoire') || n.includes('scroll')) return 'books';
  if (n.includes('potion') || n.includes('vial') || n.includes('oil') ||
      n.includes('holy water') || n.includes('antitoxin') || n.includes('draught') ||
      n.includes('tincture') || n.includes('alchemist') || n.includes('knockout') ||
      n.includes('resistance') || n.includes('fortitude') || n.includes('acuity') ||
      n.includes('berserk') || n.includes('clarity') || n.includes('incendiary') ||
      n.includes('elixir') || n.includes('salve') || n.includes('moonwater')) return 'consumables';
  if (n.includes('camping') || n.includes('bedroll') || n.includes('torch') ||
      n.includes('rope') || n.includes('hook') || n.includes('lantern') ||
      n.includes('flint') || n.includes('rations') || n.includes('cooking') ||
      n.includes('water skin') || n.includes('waterskin') || n.includes('oilskin') ||
      n.includes('satchel') || n.includes('dried meat') || n.includes('hard biscuit') ||
      n.includes('blanket') || n.includes('honey')) return 'camping';
  if (n.includes('document') || n.includes('token') || n.includes('insignia') ||
      n.includes('vessel') || n.includes('sealed') || n.includes('communication') ||
      n.includes('wolf insignia') || n.includes('glass jar') || n.includes('binding kit') ||
      n.includes('wire spool') || n.includes('binding stone') ||
      n.includes('shar') || n.includes('ammunition') || n.includes('key') ||
      n.includes('relic') || n.includes('artifact') || n.includes('seal') ||
      n.includes('sigil') || n.includes('ward') || n.includes('journal') ||
      n.includes('map') || n.includes('letter') || n.includes('note') ||
      n.includes('contract') || n.includes('deed') || n.includes('orders') ||
      n.includes('mission') || n.includes('blueprint') || n.includes('plans')) return 'quest';
  // Armor, shields, and jewelry
  if (n.includes('armor') || n.includes('armour') || n.includes('mail') ||
      n.includes('plate') || n.includes('leather') || n.includes('shield') ||
      n.includes('bracer') || n.includes('gauntlet') || n.includes('helm') ||
      n.includes('helmet') || n.includes('pauldron') || n.includes('greave') ||
      n.includes('ring') || n.includes('necklace') || n.includes('crown') ||
      n.includes('circlet') || n.includes('amulet') || n.includes('brooch') ||
      n.includes('earring') || n.includes('bracelet') || n.includes('choker') ||
      n.includes('tiara') || n.includes('diadem') || n.includes('locket') ||
      n.includes('pendant')) return 'armor';
  // Monster parts, crafting materials, harvested loot
  if (n.includes('scale') || n.includes('claw') || n.includes('tooth') || n.includes('fang') ||
      n.includes('bone') || n.includes('hide') || n.includes('pelt') || n.includes('skin') ||
      n.includes('wing') || n.includes('talon') || n.includes('tentacle') || n.includes('eye') ||
      n.includes('horn') || n.includes('hoof') || n.includes('carapace') || n.includes('shell') ||
      n.includes('venom') || n.includes('ichor') || n.includes('essence') || n.includes('gland') ||
      n.includes('heart') || n.includes('brain') || n.includes('liver') || n.includes('plate') ||
      n.includes('dust') || n.includes('ore') || n.includes('ingot') || n.includes('shard') ||
      n.includes('fragment') || n.includes('chunk') || n.includes('sample') ||
      n.includes('parts') || n.includes('components') || n.includes('materials') ||
      n.includes('reagent') || n.includes('herb') || n.includes('root') || n.includes('bark') ||
      n.includes('feather') || n.includes('fur') || n.includes('wool')) return 'loot';
  // Gems, coins, valuables
  if (n.includes('gem') || n.includes('ruby') || n.includes('sapphire') || n.includes('emerald') ||
      n.includes('diamond') || n.includes('pearl') || n.includes('opal') || n.includes('topaz') ||
      n.includes('amethyst') || n.includes('gold') || n.includes('silver') || n.includes('platinum') ||
      n.includes('jewel') || n.includes('coin') || n.includes('treasure') || n.includes('crown')) return 'valuables';
  return 'misc';
};

const CATEGORY_META = {
  weapons:     { label: '⚔️ Weapons',          emoji: '⚔️' },
  armor:       { label: '🛡️ Armor & Jewelry',  emoji: '🛡️' },
  books:       { label: '📚 Books & Scrolls',  emoji: '📚' },
  consumables: { label: '⚗️ Consumables',      emoji: '⚗️' },
  camping:     { label: '🎒 Camping & Food',   emoji: '🎒' },
  quest:       { label: '📜 Quest Items',      emoji: '📜' },
  loot:        { label: '🦴 Loot & Materials', emoji: '🦴' },
  valuables:   { label: '💎 Gems & Valuables', emoji: '💎' },
  misc:        { label: '🗃️ Misc',             emoji: '🗃️' },
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function HPBar({ current, max }) {
  const pct   = max > 0 ? Math.max(0, (current / max) * 100) : 0;
  const color = pct > 60 ? colors.green : pct > 30 ? colors.yellow : colors.red;
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontFamily:fonts.display,fontSize:12,color:colors.gold,letterSpacing:1}}>HIT POINTS</span>
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
        <span style={{fontFamily:fonts.display,fontSize:13,color:colors.textGhost,letterSpacing:1}}>XP</span>
        <span style={{fontFamily:fonts.mono,color:colors.textGhost,fontSize:12}}>{xp}{max?' (max)':`/${next}`}</span>
      </div>
      <div style={{background:colors.borderFaint,borderRadius:3,height:4,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:colors.goldFaint,borderRadius:3,transition:'all 0.8s'}}/>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div onClick={() => setOpen(v => !v)}
        style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',padding:'3px 0',borderBottom:`1px solid ${colors.borderDim}`,marginBottom: open ? 4 : 0}}>
        <span style={{fontFamily:fonts.display,fontSize:13,color:colors.textFaint,letterSpacing:2}}>{title}</span>
        <span style={{fontFamily:fonts.mono,fontSize:13,color:colors.textGhost}}>
          {count > 0 && <span style={{color:colors.gold,marginRight:4}}>{count}</span>}
          {open ? '▲' : '▼'}
        </span>
      </div>
      {open && children}
    </div>
  );
}

const slotItemLabel = (name, data) => {
  if (!data) return name;
  if (data.type === 'weapon') return `${name} (${data.damage}${data.bonus?`+${data.bonus}`:''})`;
  if (data.type === 'armor')  return `${name} (AC ${data.ac})`;
  if (data.type === 'shield') return `${name} (+${data.ac||2}AC)`;
  if (data.type === 'focus')  return `${name} [${data.label}]`;
  if (data.label)             return `${name} [${data.label}]`;
  return name;
};

// Companion equipment slots — interactive, mirroring the player's slot list.
// Tap an empty slot to open the item picker; tap the ✕ to return gear to inventory.
function CompanionSlots({ companion, name, db, character, onSlotClick, onUnequip }) {
  const slots = companion.slots || {};
  const slotDefs = companion.type === 'wolf'
    ? [{ id:'neck', label:'Collar', emoji:'📿' }, { id:'armor', label:'Barding', emoji:'🥋' }]
    : [
        { id:'mainhand', label:'Main Hand', emoji:'⚔️' },
        { id:'offhand',  label:'Off Hand',  emoji:'🛡️' },
        { id:'armor',    label:'Armor',     emoji:'🥋' },
        { id:'head',     label:'Head',      emoji:'⛑️' },
        { id:'neck',     label:'Neck',      emoji:'📿' },
      ];
  return (
    <div style={{marginTop:4,paddingLeft:6,borderLeft:`1px solid ${colors.borderFaint}`}}>
      {slotDefs.map(slot => {
        const itemName = slots[slot.id];
        const data     = itemName ? db[itemName] : null;
        const canEquip = !itemName && character && equippableInSlot(character, slot.id).length > 0;
        const active   = itemName || canEquip;
        return (
          <div key={slot.id}
            onClick={() => active && onSlotClick?.(name, slot.id)}
            style={{display:'flex',alignItems:'center',gap:5,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`,cursor:active?'pointer':'default',opacity:active?1:0.4}}>
            <span style={{fontSize:11,flexShrink:0}}>{slot.emoji}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:colors.textGhost,fontFamily:fonts.display}}>{slot.label}</div>
              {itemName
                ? <div style={{fontSize:12,color:colors.gold,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{slotItemLabel(itemName, data)}</div>
                : <div style={{fontSize:12,color:colors.textDead,fontStyle:'italic'}}>{canEquip?'tap to equip':'—'}</div>
              }
            </div>
            {itemName && (
              <span onClick={(e)=>{ e.stopPropagation(); onUnequip?.(name, slot.id); }}
                style={{fontSize:12,color:colors.textDead,flexShrink:0,cursor:'pointer',padding:'0 4px'}} title="Unequip">✕</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────────────────────
export function Sidebar({ character, onSlotClick, onCompanionSlotClick, onCompanionUnequip, onSaveClick, onClose, onAbilitiesClick, onMoveToStash, onMoveToInventory, onCreateBag, onAddToBag, selectedModel, onToggleModel, pacing, onTogglePacing, arcAntagonist, onClearArc, onRollArc, onToggleContextExclusion }) {
  const db       = allItems(character.customItems || {});
  const effStats = character.stats.dex ? effectiveStats(character.stats, character.slots, character.customItems||{}) : character.stats;
  const ac       = character.stats.dex ? calcAC(character.slots, character.stats, character.customItems||{}) : '—';
  const weapon   = character.stats.dex ? getMainWeapon(character.slots, character.stats, character.customItems||{}) : null;
  const pb       = profBonus(character.level);

  // Bag creation state
  const [bagMode, setBagMode] = useState(false);       // are we in bag creation mode?
  const [bagSelected, setBagSelected] = useState({});  // { itemName: count }
  const [bagName, setBagName] = useState('');
  const [addingToBag, setAddingToBag] = useState(null); // bag name we're adding to

  const existingBags = Object.entries(character.customItems || {})
    .filter(([, v]) => v.type === 'bag')
    .map(([name]) => name);

  const toggleBagItem = (itemName) => {
    setBagSelected(prev => {
      const current = prev[itemName] || 0;
      const max = character.inventory.filter(i => i === itemName).length;
      if (current >= max) {
        const next = { ...prev };
        delete next[itemName];
        return next;
      }
      return { ...prev, [itemName]: current + 1 };
    });
  };

  const confirmBag = () => {
    const items = Object.entries(bagSelected).flatMap(([name, count]) => Array(count).fill(name));
    if (addingToBag) {
      onAddToBag?.(addingToBag, items);
    } else {
      if (!bagName.trim()) return;
      onCreateBag?.(bagName.trim(), items);
    }
    setBagMode(false);
    setBagSelected({});
    setBagName('');
    setAddingToBag(null);
  };

  const startAddToBag = (name) => {
    setAddingToBag(name);
    setBagMode(true);
    setBagSelected({});
  };

  const sidebarStyle = {
    width:285, flexShrink:0,
    height:'100vh',
    background:'rgba(10,7,3,0.95)',
    borderRight:`1px solid ${colors.border}`,
    overflowY:'auto',
    overflowX:'hidden',
    display:'flex', flexDirection:'column', gap:10, padding:12,
    boxSizing:'border-box',
  };

  const sectionLabel = (text) => (
    <div style={{fontFamily:fonts.display,fontSize:13,color:colors.textGhost,letterSpacing:3,marginBottom:4}}>{text}</div>
  );

  const statBox = (label, value) => (
    <div style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:'5px 6px',textAlign:'center'}}>
      <div style={{fontFamily:fonts.display,fontSize:12,color:colors.goldFaint,letterSpacing:2}}>{label}</div>
      <div style={{fontFamily:fonts.mono,fontSize:18,color:colors.gold,fontWeight:'bold'}}>{value}</div>
    </div>
  );

  // Categorize inventory
  const stacked = stackInventory(character.inventory);
  const categorized = {};
  Object.entries(stacked).forEach(([name, count]) => {
    const cat = categorizeItem(name, db[name]);
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push({ name, count });
  });

  return (
    <div style={sidebarStyle}>

      {/* Mobile close button */}
      {onClose && (
        <button onClick={onClose} style={{alignSelf:'flex-end',background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textFaint,padding:'2px 8px',fontSize:12,borderRadius:3,cursor:'pointer',marginBottom:-4}}>
          ✕
        </button>
      )}

      {/* Save button */}
      <button onClick={onSaveClick} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0'}}>
        💾 Save / Load
      </button>

      {/* Abilities button */}
      {onAbilitiesClick && (
        <button onClick={onAbilitiesClick} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0'}}>
          📚 Manage Abilities
        </button>
      )}

      {/* Model toggle */}
      {onToggleModel && (
        <button onClick={onToggleModel} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',borderColor:selectedModel==='sonnet'?colors.gold:colors.border}}>
          {selectedModel==='sonnet' ? '✨ DM: Sonnet' : '⚡ DM: Haiku'}
        </button>
      )}

      {/* Pacing knob — how often the world pushes back */}
      {onTogglePacing && (
        <button onClick={onTogglePacing} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',marginTop:6,opacity:pacing==='off'?0.6:1,borderColor:pacing==='dangerous'?colors.red:pacing==='normal'?colors.gold:colors.border}}>
          {PACING[pacing]?.label || PACING.normal.label}
        </button>
      )}

      {/* Story arc — the hidden antagonist all foreshadowing builds toward */}
      {onClearArc && (
        <div style={{marginTop:6,padding:'7px 9px',background:'rgba(0,0,0,0.25)',border:`1px solid ${colors.borderDim}`,borderRadius:3}}>
          <div style={{fontSize:10,color:colors.textGhost,letterSpacing:0.5,marginBottom:3}}>STORY ARC</div>
          <div style={{fontSize:12,color:arcAntagonist?colors.textDim:colors.textFaint,fontStyle:arcAntagonist?'normal':'italic',marginBottom:6,lineHeight:1.35}}>
            {arcAntagonist || 'Open — no antagonist. The story drifts where you take it.'}
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={onRollArc} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>🎲 {arcAntagonist?'Reroll':'Roll'}</button>
            {arcAntagonist && <button onClick={onClearArc} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>✕ Clear</button>}
          </div>
        </div>
      )}

      {/* Identity */}
      <div>
        {sectionLabel('ADVENTURER')}
        <div style={{fontSize:20,marginBottom:2}}>{character.cls?.emoji}</div>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13}}>{character.name}</div>
        <div style={{fontSize:12,color:colors.textFaint}}>
          {character.race?.name} · Lv {character.level}
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>
          {Object.entries(character.classLevels || { [character.cls?.name]: character.level }).map(([cls, lvl]) => (
            <div key={cls} style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:3,padding:'2px 6px',fontSize:13,color:colors.textFaint,fontFamily:fonts.display}}>
              {cls} {lvl}
            </div>
          ))}
        </div>
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
          <div style={{fontSize:13,color:colors.gold,fontFamily:fonts.display}}>{weapon.name}</div>
          <div style={{fontSize:12,color:colors.textFaint}}>
            Dmg: {weapon.damage}{weapon.bonus?`+${weapon.bonus}`:''} {weapon.statBonus>=0?`+ ${weapon.statBonus}`:`- ${Math.abs(weapon.statBonus)}`} · Atk: +{weapon.statBonus+pb+(weapon.bonus||0)}
          </div>
          {weapon.finesse && <div style={{fontSize:12,color:colors.textDead}}>finesse · using DEX</div>}
        </div>
      )}

      {/* Stats */}
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

      {/* Gold */}
      <div>
        {sectionLabel('GOLD')}
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13}}>⚜ {character.gold}gp</div>
      </div>

      {/* Equipment slots */}
      <CollapsibleSection title="EQUIPMENT" count={Object.values(character.slots).filter(Boolean).length} defaultOpen={false}>
        {SLOTS.map(slot => {
          const itemName = character.slots[slot.id];
          const data     = itemName ? db[itemName] : null;
          const label    = itemName ? slotItemLabel(itemName, data) : null;
          const canEquip = !itemName && equippableInSlot(character, slot.id).length > 0;
          return (
            <div key={slot.id} onClick={() => onSlotClick(slot.id)}
              style={{display:'flex',alignItems:'center',gap:5,padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`,cursor:itemName||canEquip?'pointer':'default',opacity:itemName||canEquip?1:0.4}}>
              <span style={{fontSize:13,flexShrink:0}}>{slot.emoji}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,color:colors.textGhost,fontFamily:fonts.display}}>{slot.label}</div>
                {itemName
                  ? <div style={{fontSize:12,color:colors.gold,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</div>
                  : <div style={{fontSize:13,color:colors.textDead,fontStyle:'italic'}}>{canEquip?'tap to equip':'—'}</div>
                }
              </div>
              {itemName && <span style={{fontSize:12,color:colors.textDead,flexShrink:0}}>✕</span>}
            </div>
          );
        })}
      </CollapsibleSection>

      {/* Abilities — spells, cantrips, infusions */}
      {character.abilities && (
        <>
          {character.abilities.cantrips?.length > 0 && (
            <CollapsibleSection title="✨ CANTRIPS" count={character.abilities.cantrips.length} defaultOpen={false}>
              {character.abilities.cantrips.map(name => (
                <div key={name} style={{fontSize:12,color:colors.textFaint,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
                  · {name}
                </div>
              ))}
            </CollapsibleSection>
          )}
          {character.abilities.spells?.length > 0 && (
            <CollapsibleSection title="📖 SPELLS" count={character.abilities.spells.length} defaultOpen={false}>
              {character.abilities.spells.map(name => (
                <div key={name} style={{fontSize:12,color:colors.textFaint,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
                  · {name}
                </div>
              ))}
            </CollapsibleSection>
          )}
          {character.abilities.infusions?.length > 0 && (
            <CollapsibleSection title="⚙️ INFUSIONS" count={character.abilities.infusions.length} defaultOpen={false}>
              {character.abilities.infusions.map(name => (
                <div key={name} style={{fontSize:12,color:colors.textFaint,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
                  · {name}
                </div>
              ))}
            </CollapsibleSection>
          )}
        </>
      )}

      {/* Companions */}
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

      {/* Key NPCs */}
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

      {/* Towns */}
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
                  <div style={{marginTop:3}}>
                    {Object.entries(data.notable_locations).map(([loc, desc]) => (
                      <div key={loc} style={{fontSize:11,color:colors.textGhost,paddingLeft:6}}>· <span style={{color:colors.textFaint}}>{loc}</span>: {desc}</div>
                    ))}
                  </div>
                )}
                {data.minor_residents && Object.keys(data.minor_residents).length > 0 && (
                  <div style={{marginTop:3}}>
                    {Object.entries(data.minor_residents).map(([res, desc]) => (
                      <div key={res} style={{fontSize:11,color:colors.textGhost,paddingLeft:6}}>· <span style={{color:colors.textFaint}}>{res}</span>: {desc}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      {/* Bag mode toolbar */}
      {bagMode && (
        <div style={{background:colors.bgDark,border:`1px solid ${colors.gold}`,borderRadius:4,padding:'8px 10px',marginBottom:8}}>
          <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:10,letterSpacing:2,marginBottom:6}}>
            {addingToBag ? `ADDING TO: ${addingToBag}` : '🎒 CREATE BAG'}
          </div>
          {!addingToBag && (
            <input
              value={bagName}
              onChange={e => setBagName(e.target.value)}
              placeholder="Bag name..."
              style={{width:'100%',boxSizing:'border-box',background:colors.bg,border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.body,fontSize:12,padding:'4px 8px',borderRadius:3,marginBottom:6,outline:'none'}}
            />
          )}
          <div style={{fontSize:10,color:colors.textGhost,marginBottom:6}}>
            {Object.keys(bagSelected).length === 0 ? 'Tap items below to select' : Object.entries(bagSelected).map(([n,c]) => `${n}${c>1?` x${c}`:''}`).join(', ')}
          </div>
          <div style={{display:'flex',gap:4}}>
            <button onClick={confirmBag} disabled={Object.keys(bagSelected).length === 0 || (!addingToBag && !bagName.trim())}
              style={{...btn(true),flex:2,fontSize:10,opacity:(Object.keys(bagSelected).length>0&&(addingToBag||bagName.trim()))?1:0.4}}>
              {addingToBag ? 'ADD TO BAG' : 'CREATE'}
            </button>
            <button onClick={()=>{setBagMode(false);setBagSelected({});setBagName('');setAddingToBag(null);}}
              style={{...btn(false),flex:1,fontSize:10}}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Bag creation / add-to-bag trigger */}
      {!bagMode && (
        <div style={{display:'flex',gap:4,marginBottom:6,flexWrap:'wrap'}}>
          <button onClick={()=>{setBagMode(true);setAddingToBag(null);}}
            style={{...btn(false),fontSize:9,padding:'2px 8px'}}>🎒 Create Bag</button>
          {existingBags.map(name => (
            <button key={name} onClick={() => startAddToBag(name)}
              style={{...btn(false),fontSize:9,padding:'2px 8px'}}>+ {name}</button>
          ))}
        </div>
      )}

      {/* Collapsible inventory sections */}
      {Object.entries(CATEGORY_META).map(([cat, meta]) => {
        const items = categorized[cat] || [];
        if (items.length === 0) return null;
        return (
          <CollapsibleSection key={cat} title={meta.label} count={items.length} defaultOpen={false}>
            {items.map(({ name, count }) => {
              const data = db[name];
              const isBag = data?.type === 'bag';
              const statLabel = data?.type==='weapon'?` (${data.damage}${data.bonus?`+${data.bonus}`:''})`
                : data?.type==='armor'?` (AC${data.ac})`
                : data?.label?` [${data.label}]`:'';
              const selectedCount = bagSelected[name] || 0;
              return (
                <div key={name} style={{fontSize:12,color:data?colors.textFaint:colors.textGhost,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`,display:'flex',alignItems:'center',gap:4,
                  background: bagMode && selectedCount > 0 ? 'rgba(201,168,76,0.08)' : 'transparent',
                }}>
                  {bagMode && !isBag && (
                    <span onClick={() => toggleBagItem(name)}
                      style={{cursor:'pointer',color:selectedCount>0?colors.gold:colors.textDead,fontSize:12,flexShrink:0,width:14,textAlign:'center'}}>
                      {selectedCount > 0 ? `${selectedCount}` : '○'}
                    </span>
                  )}
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,cursor:bagMode&&!isBag?'pointer':'default'}}
                    onClick={bagMode && !isBag ? () => toggleBagItem(name) : undefined}>
                    · {name}{statLabel}{count > 1 && <span style={{color:colors.gold,fontFamily:fonts.mono,fontSize:12,marginLeft:4}}>x{count}</span>}
                  </span>
                  {!bagMode && onMoveToStash && (
                    <>
                      <button title="Move one to stash" onClick={() => onMoveToStash(name, false)}
                        style={{background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textDead,fontSize:9,padding:'1px 4px',borderRadius:2,cursor:'pointer',flexShrink:0,lineHeight:1.4}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=colors.gold;e.currentTarget.style.color=colors.gold;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=colors.borderDim;e.currentTarget.style.color=colors.textDead;}}>
                        📦
                      </button>
                      {count > 1 && (
                        <button title="Move all to stash" onClick={() => onMoveToStash(name, true)}
                          style={{background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textDead,fontSize:9,padding:'1px 4px',borderRadius:2,cursor:'pointer',flexShrink:0,lineHeight:1.4}}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor=colors.gold;e.currentTarget.style.color=colors.gold;}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor=colors.borderDim;e.currentTarget.style.color=colors.textDead;}}>
                          📦📦
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </CollapsibleSection>
        );
      })}

      {/* Stash — hidden from DM, persists in save */}
      {(() => {
        const stash = character.stash || [];
        const stackedStash = stackInventory(stash);
        const stashEntries = Object.entries(stackedStash);
        return (
          <CollapsibleSection
            title="📦 STASH"
            count={stashEntries.length}
            defaultOpen={false}
          >
            <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
              Stored items — invisible to the DM. Quest relics, old gear, keepsakes.
            </div>
            {stashEntries.length === 0 && (
              <div style={{fontSize:12,color:colors.textDead,fontStyle:'italic',padding:'2px 0'}}>Empty — move items here to hide them from the DM.</div>
            )}
            {stashEntries.map(([name, count]) => {
              const data = db[name] || (character.stashedCustomItems || {})[name];
              const statLabel = data?.label ? ` [${data.label}]` : '';
              return (
                <div key={name} style={{fontSize:12,color:colors.textGhost,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`,display:'flex',alignItems:'center',gap:4}}>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,opacity:0.7}}>
                    · {name}{statLabel}{count > 1 && <span style={{color:colors.goldFaint,fontFamily:fonts.mono,fontSize:12,marginLeft:4}}>x{count}</span>}
                  </span>
                  {onMoveToInventory && (
                    <>
                      <button title="Return one to inventory" onClick={() => onMoveToInventory(name, false)}
                        style={{background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textDead,fontSize:9,padding:'1px 4px',borderRadius:2,cursor:'pointer',flexShrink:0,lineHeight:1.4}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=colors.gold;e.currentTarget.style.color=colors.gold;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=colors.borderDim;e.currentTarget.style.color=colors.textDead;}}>
                        ↑
                      </button>
                      {count > 1 && (
                        <button title="Return all to inventory" onClick={() => onMoveToInventory(name, true)}
                          style={{background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textDead,fontSize:9,padding:'1px 4px',borderRadius:2,cursor:'pointer',flexShrink:0,lineHeight:1.4}}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor=colors.gold;e.currentTarget.style.color=colors.gold;}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor=colors.borderDim;e.currentTarget.style.color=colors.textDead;}}>
                          ↑↑
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </CollapsibleSection>
        );
      })()}

      <button style={{...btn(false),width:'100%',fontSize:12,marginTop:'auto'}} onClick={onSaveClick}>
        💾 Save / Export
      </button>

      <div style={{minHeight:40,flexShrink:0}}/>
    </div>
  );
}
