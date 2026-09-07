import { useState, Component } from 'react';
import { PACING, ENVIRONMENTS } from '../constants/encounters.js';
import { colors, fonts, btn } from '../styles/theme.js';
import { SLOTS } from '../constants/items.js';
import { STAT_NAMES } from '../constants/classes.js';
import { statMod, modStr, profBonus, calcAC, getMainWeapon, effectiveStats, equippableInSlot, allItems, skillBonuses, effectiveMaxHp, gearHpBonus } from '../hooks/useCharacter.js';
import { stackInventory, SKILL_ABILITY, SKILL_LIST } from '../hooks/useGame.js';
import { coinsToString, parseCoinAmount } from '../constants/currency.js';
import { XP_THRESHOLDS } from '../constants/progression.js';
import { MULTICLASS_OPTIONS } from '../constants/multiclass.js';
import { stackCounts, stackCount, stackHas } from '../utils/itemStacks.js';
import { categorizeItem, CATEGORY_META, hasInspectableItemInfo } from './sidebar/inventory/categorization.js';
import { HPBar, XPBar, PanelErrorBoundary, CollapsibleSection } from './sidebar/common/index.jsx';
import { VoiceSettings, DispositionEditor, ObjectivesPanel, DirectivesEditor, DebugViewer } from './sidebar/settings/Controls.jsx';
import { CraftingPanel, ConsolidatePanel, SalvagePanel } from './sidebar/crafting/Panels.jsx';
import { BioEditor, TownManager, NPCManager, CompanionSlots } from './sidebar/world/Panels.jsx';
export { resetCraftingPanels } from './sidebar/crafting/Panels.jsx';

// ── Main Sidebar ───────────────────────────────────────────────────────────────
export function Sidebar({ character, onSlotClick, onCompanionSlotClick, onCompanionUnequip, onSaveClick, onClose, onAbilitiesClick, onMoveToStash, onMoveToInventory, onBankCoins, onWithdrawCoins, onCreateBag, onAddToBag, onRemoveFromBag, onDeleteItem, onRenameItem, onDeleteFromBag, selectedModel, onToggleModel, pacing, onTogglePacing, lootDestination, onToggleLootDestination, environment, onChangeEnvironment, arcAntagonist, arcLocation, onClearArc, onRollArc, onSetArc, adventure, onClearAdventure, onRollAdventure, onToggleContextExclusion, onExtractNPC, onExtractTown, onSaveNPC, onDeleteNPC, onSaveBio, onStartNewCampaign, arcObjectives, arcGoal, onSetArcGoal, onGenerateObjectives, onSetObjectives, disposition, onSaveDisposition, defeatedAntagonists, onReviveAntagonist, completedAdventures, onRestoreAdventure, onCycleConstructStatus, onPromoteConstruct, onProposeCrafting, onExecuteCrafting, onProposeConsolidation, onExecuteConsolidation, onProposeDismantle, onExecuteDismantle, voiceSettings, showRawTags, onToggleRawTags, debugLog, debugStatus, onExportDebug, onCopyDebug, directives, onChangeDirectives, levelUpsAvailable=0, onLevelClassSelect, onLevelStatSelect }) {
  const db       = allItems(character.items || {});
  const [activeTab, setActiveTab] = useState('character');
  const [levelClassChoice, setLevelClassChoice] = useState(null);
  const [stashFilter, setStashFilter] = useState('');
  const [bankDraft, setBankDraft] = useState('');
  const [arcCustomOpen, setArcCustomOpen] = useState(false);
  // Track WHICH antagonist was revealed, not just that one was: if an arc
  // completes mid-play and rolls a new one, it re-hides itself rather than
  // spoiling the next arc through a panel left open.
  const [revealedFor, setRevealedFor] = useState(null);
  const [newCampaignArmed, setNewCampaignArmed] = useState(false);
  const [renaming, setRenaming] = useState(null);   // { name, draft }
  const [actionsFor, setActionsFor] = useState(null);   // which row has its edit/delete revealed
  const [arcCustomText, setArcCustomText] = useState('');
  const effStats = character.stats.dex ? effectiveStats(character.stats, character.slots, character.items||{}) : character.stats;
  const gearSkills = skillBonuses(character.slots, character.items || {});
  const ac       = character.stats.dex ? calcAC(character.slots, character.stats, character.items||{}) : '—';
  const weapon   = character.stats.dex ? getMainWeapon(character.slots, character.stats, character.items||{}) : null;
  const pb       = profBonus(character.level);

  // Bag creation state
  const [bagMode, setBagMode] = useState(false);       // are we in bag creation mode?
  const [bagSelected, setBagSelected] = useState({});  // { itemName: count }
  const [bagName, setBagName] = useState('');
  const [addingToBag, setAddingToBag] = useState(null); // bag name we're adding to
  const [expandedBags, setExpandedBags] = useState({});  // { bagName: true } — show contents
  const [expandedLabels, setExpandedLabels] = useState({}); // { itemName: true } — show full label

  // Select or deselect ALL copies of an item at once (fixes 100-click problem)
  const toggleBagItemAll = (itemName, maxCount) => {
    setBagSelected(prev => {
      const next = { ...prev };
      if (next[itemName] >= maxCount) delete next[itemName];
      else next[itemName] = maxCount;
      return next;
    });
  };

  const iconBtn = {background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textDead,fontSize:9,padding:'1px 4px',borderRadius:2,cursor:'pointer',flexShrink:0,lineHeight:1.4};
  const delBtn = {background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.redFaint||'#8a3a3a',fontSize:9,padding:'1px 4px',borderRadius:2,cursor:'pointer',flexShrink:0,lineHeight:1.4};

  const existingBags = Object.entries(character.items || {})
    .filter(([name, v]) => v.type === 'bag' && stackHas(character.inventory, name))
    .map(([name]) => name);

  const toggleBagItem = (itemName) => {
    setBagSelected(prev => {
      const current = prev[itemName] || 0;
      const max = stackCount(character.inventory, itemName);
      if (current >= max) {
        const next = { ...prev };
        delete next[itemName];
        return next;
      }
      return { ...prev, [itemName]: current + 1 };
    });
  };

  const confirmBag = () => {
    const items = Object.entries(bagSelected).filter(([, qty]) => qty > 0).map(([name, qty]) => ({ name, qty }));
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const sidebarStyle = {
    width: isMobile ? '100vw' : 285, flexShrink:0,
    height:'100vh',
    background:'rgba(10,7,3,0.97)',
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
        <button onClick={onClose} style={{width:'100%',background:'rgba(201,168,76,0.08)',border:`1px solid ${colors.border}`,color:colors.gold,padding:'12px 0',fontSize:16,fontFamily:fonts.display,letterSpacing:2,borderRadius:4,cursor:'pointer'}}>
          ✕  CLOSE
        </button>
      )}

      {/* Tab bar */}
      <div style={{display:'flex',gap:6,marginBottom:4}}>
        {[
          ['character', '🎲 CHAR'],
          ['levelup',   `⭐ LEVEL${levelUpsAvailable > 0 ? ` · ${levelUpsAvailable}` : ''}`],
          ['crafting',  '🔨 CRAFT'],
          ['settings',  '⚙️ SET'],
        ].map(([id, label]) => (
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{flex:1,background:activeTab===id?'rgba(201,168,76,0.15)':'transparent',border:`1px solid ${activeTab===id?colors.gold:(id==='levelup'&&levelUpsAvailable>0?colors.goldFaint:colors.borderDim)}`,color:activeTab===id?colors.gold:(id==='levelup'&&levelUpsAvailable>0?colors.goldFaint:colors.textFaint),padding:'8px 1px',fontSize:9,fontFamily:fonts.display,letterSpacing:0.2,borderRadius:3,cursor:'pointer',whiteSpace:'nowrap'}}>
            {label}
          </button>
        ))}
      </div>


      {activeTab==='levelup' && <>
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
      </>}

      {activeTab==='settings' && <>
      {/* Save button */}
      <button onClick={onSaveClick} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0'}}>
        💾 Save / Load
      </button>
      </>}

      {activeTab==='character' && <>
      {/* Abilities button */}
      {onAbilitiesClick && (
        <button onClick={onAbilitiesClick} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0'}}>
          📚 Manage Abilities
        </button>
      )}
      </>}

      {activeTab==='settings' && <>
      {/* Model toggle */}
      {onToggleModel && (
        <button onClick={onToggleModel} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',borderColor:selectedModel==='sonnet'?colors.gold:(selectedModel==='gpt'||selectedModel==='terra')?'#7aa7ff':colors.border}}>
          {selectedModel==='sonnet' ? '✨ DM: Sonnet' : selectedModel==='haiku' ? '⚡ DM: Haiku' : selectedModel==='gpt' ? '🧠 DM: GPT Sol' : '🌍 DM: GPT Terra'}
        </button>
      )}

      {voiceSettings && <VoiceSettings {...voiceSettings} />}

      {/* Pacing knob — how often the world pushes back */}
      {onTogglePacing && (
        <button onClick={onTogglePacing} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',marginTop:6,opacity:pacing==='off'?0.6:1,borderColor:pacing==='dangerous'?colors.red:pacing==='normal'?colors.gold:colors.border}}>
          {PACING[pacing]?.label || PACING.normal.label}
        </button>
      )}

      {onChangeEnvironment && (
        <select value={environment || 'wilderness'} onChange={e=>onChangeEnvironment(e.target.value)}
          title="Where you are — encounters match your surroundings"
          style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:13,padding:'7px 8px',borderRadius:4,outline:'none',marginTop:6,cursor:'pointer'}}>
          {ENVIRONMENTS.map(env => <option key={env.id} value={env.id}>📍 {env.label}</option>)}
        </select>
      )}

      {/* Situation Adventure — mutually exclusive with antagonist arcs */}
      {onRollAdventure && (
        <div style={{marginTop:6,padding:'7px 9px',background:'rgba(0,0,0,0.25)',border:`1px solid ${colors.borderDim}`,borderRadius:3}}>
          <div style={{fontSize:10,color:colors.textGhost,letterSpacing:0.5,marginBottom:3}}>ADVENTURE</div>
          <div style={{fontSize:12,color:adventure?colors.textDim:colors.textFaint,fontStyle:'italic',marginBottom:6,lineHeight:1.35}}>
            {adventure ? adventure.title : (arcAntagonist ? 'Inactive — antagonist arc is the current story driver.' : 'Open — no Adventure is active.')}
          </div>
          {adventure?.premise && (
            <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.4,marginBottom:6}}>{adventure.premise}</div>
          )}
          {adventure?.location && (
            <div style={{fontSize:10,color:colors.textGhost,lineHeight:1.35,marginBottom:6}}>📍 {adventure.location}</div>
          )}
          <div style={{display:'flex',gap:6}}>
            <button onClick={onRollAdventure} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>🎭 {adventure?'Reroll':'Roll Adventure'}</button>
            {adventure && <button onClick={onClearAdventure} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>✕ Clear</button>}
          </div>
          <div style={{fontSize:9,color:colors.textDead,lineHeight:1.35,marginTop:5}}>
            Rolling an Adventure clears any antagonist. [ADVENTURE COMPLETE] clears it without rolling a replacement.
          </div>
        </div>
      )}

      {/* Story arc — the hidden antagonist all foreshadowing builds toward */}
      {onClearArc && (
        <div style={{marginTop:6,padding:'7px 9px',background:'rgba(0,0,0,0.25)',border:`1px solid ${colors.borderDim}`,borderRadius:3}}>
          <div style={{fontSize:10,color:colors.textGhost,letterSpacing:0.5,marginBottom:3}}>STORY ARC</div>
          <div style={{fontSize:12,color:arcAntagonist?colors.textDim:colors.textFaint,fontStyle:'italic',marginBottom:6,lineHeight:1.35}}>
            {arcAntagonist ? 'A hidden antagonist is in play.' : 'Open — no antagonist. The story drifts where you take it.'}
          </div>
          {/* Hidden behind a tap: knowing who it is spoils the arc, but there
              has to be a way to check when a story feels off the rails. */}
          {arcAntagonist && (
            <div style={{marginBottom:6}}>
              {revealedFor === arcAntagonist ? (
                <div style={{padding:'6px 8px',borderRadius:4,background:'rgba(201,168,76,0.06)',border:`1px solid ${colors.borderDim}`}}>
                  <div style={{fontSize:12,color:colors.gold,lineHeight:1.4}}>{arcAntagonist}</div>
                  {arcLocation && (
                    <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.4,marginTop:3}}>📍 {arcLocation}</div>
                  )}
                  <div onClick={()=>setRevealedFor(null)}
                    style={{fontSize:10,color:colors.textDead,cursor:'pointer',marginTop:4}}>🙈 hide</div>
                </div>
              ) : (
                <button onClick={()=>setRevealedFor(arcAntagonist)}
                  style={{...btn(false),width:'100%',fontSize:10,padding:'3px 0',color:colors.textDead}}>
                  👁 Reveal antagonist (spoiler)
                </button>
              )}
            </div>
          )}
          <div style={{display:'flex',gap:6}}>
            <button onClick={onRollArc} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>🎲 {arcAntagonist?'Reroll':'Roll'}</button>
            <button onClick={()=>setArcCustomOpen(v=>!v)} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>✎ Custom</button>
            {arcAntagonist && <button onClick={onClearArc} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>✕ Clear</button>}
          </div>
          {arcCustomOpen && (
            <div style={{marginTop:6}}>
              <input value={arcCustomText} onChange={e=>setArcCustomText(e.target.value)}
                placeholder="e.g. a rival dhampir elder and her brood"
                style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:12,padding:'5px 8px',borderRadius:4,outline:'none',marginBottom:4}}/>
              <div style={{fontSize:10,color:colors.textGhost,marginBottom:4,lineHeight:1.35}}>Write it as a noun phrase — it fills sentences like "scouts of ___ attack".</div>
              <button onClick={()=>{ const t=arcCustomText.trim(); if(t){ onSetArc?.(t); setArcCustomText(''); setArcCustomOpen(false);} }}
                style={{...btn(false),width:'100%',fontSize:11,padding:'4px 0'}}>✓ SET ANTAGONIST</button>
            </div>
          )}
        </div>
      )}

      {onRestoreAdventure && (completedAdventures?.length > 0) && (
        <CollapsibleSection title="📚 COMPLETED ADVENTURES" count={completedAdventures.length} defaultOpen={false}>
          <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
            Adventures you've completed. These stay out of the Adventure shuffle — remove one to let it be rolled again.
          </div>
          {completedAdventures.map((entry, i) => {
            const title = typeof entry === 'string' ? entry : entry?.title || 'Adventure';
            return (
              <div key={title + i} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
                <span style={{flex:1,minWidth:0,fontSize:12,color:colors.textDim,lineHeight:1.4}}>{title}</span>
                <button title="Return this Adventure to the shuffle"
                  onClick={()=>onRestoreAdventure(title)}
                  style={{...btn(false),flexShrink:0,fontSize:10,padding:'2px 6px'}}>↺</button>
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      {onReviveAntagonist && (defeatedAntagonists?.length > 0) && (
        <CollapsibleSection title="⚰️ DEFEATED FOES" count={defeatedAntagonists.length} defaultOpen={false}>
          <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
            Arcs you've finished. These are never rolled as a new antagonist again — remove one to let it return.
          </div>
          {defeatedAntagonists.map(name => (
            <div key={name} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
              <span style={{flex:1,minWidth:0,fontSize:12,color:colors.textDim,lineHeight:1.4}}>{name}</span>
              <button title="Let this foe return — makes it rollable again"
                onClick={()=>onReviveAntagonist(name)}
                style={{...btn(false),flexShrink:0,fontSize:10,padding:'2px 6px'}}>↺</button>
            </div>
          ))}
        </CollapsibleSection>
      )}
      </>}

      {activeTab==='character' && <>
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

      <HPBar current={character.hp} max={effectiveMaxHp(character)}/>
      {gearHpBonus(character) !== 0 && (
        <div style={{fontSize:9,color:colors.textGhost,textAlign:'right',marginTop:-2}}>
          includes {gearHpBonus(character) > 0 ? '+' : ''}{gearHpBonus(character)} from gear CON
        </div>
      )}
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
            {(weapon.extras||[]).map((e,i) => (
              <span key={i} style={{color:colors.goldFaint}}> + {e.dice} {e.type}</span>
            ))}
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

      {/* Skills — all 18, with any gear bonus folded in */}
      {character.stats.dex && (
        <CollapsibleSection
          title="SKILLS"
          count={Object.keys(gearSkills).length || undefined}
          defaultOpen={false}
        >
          {SKILL_LIST.map(({ key, label, ability }) => {
            // gear may name a skill by an alias (sleight vs sleightofhand)
            const gear = Object.entries(gearSkills)
              .filter(([g]) => g.toLowerCase() === key || SKILL_ABILITY[g.toLowerCase()] === ability && g.toLowerCase().replace(/\s+/g,'') === key)
              .reduce((sum, [, v]) => sum + v, 0);
            const aMod  = statMod(effStats[ability]);
            const total = aMod + pb + gear;
            return (
              <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
                <span style={{fontSize:12,color:gear?colors.text:colors.textFaint}}>
                  {label}
                  <span style={{color:colors.textGhost,fontSize:10}}> {ability.toUpperCase()}</span>
                </span>
                <span style={{fontFamily:fonts.mono,fontSize:13,color:gear?colors.gold:colors.text,fontWeight:gear?'bold':'normal'}}>
                  {total >= 0 ? `+${total}` : total}
                  {gear > 0 && <span style={{color:colors.textDead,fontSize:11}}> (+{gear} gear)</span>}
                </span>
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      {/* Gold — banked wealth stays out of the DM prompt */}
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
            <input
              value={bankDraft}
              onChange={e=>setBankDraft(e.target.value)}
              placeholder="Amount (e.g. 500gp)"
              inputMode="text"
              style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.35)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.mono,fontSize:11,padding:'4px 6px',borderRadius:3,outline:'none',marginBottom:4}}
            />
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

      </>}

      {activeTab==='crafting' && <PanelErrorBoundary>
      {/* Crafting — turn materials into gear */}
      {onProposeCrafting && (
        <CraftingPanel character={character} db={db} onProposeCrafting={onProposeCrafting} onExecuteCrafting={onExecuteCrafting} />
      )}

      {/* Consolidate — collapse verbose material variants into one stack */}
      {onExecuteConsolidation && (
        <ConsolidatePanel character={character} db={db} onProposeConsolidation={onProposeConsolidation} onExecuteConsolidation={onExecuteConsolidation} />
      )}

      {/* Salvage — break items back into materials */}
      {onProposeDismantle && (
        <SalvagePanel character={character} db={db} onProposeDismantle={onProposeDismantle} onExecuteDismantle={onExecuteDismantle} />
      )}
      </PanelErrorBoundary>}

      {activeTab==='settings' && <>
      {/* Start over with the same character */}
      {onStartNewCampaign && (
        <CollapsibleSection title="🗺️ NEW CAMPAIGN" defaultOpen={false}>
          <div style={{fontSize:11,color:colors.textDim,marginBottom:8,lineHeight:1.45}}>
            Keeps everything the character <b>is</b> — level, XP, gear, inventory, companions, NPCs, towns, bio, disposition — and clears everything the last campaign <b>was</b>: the story log, the summary and the arc. The same as exporting the character and loading it back.
          </div>
          {newCampaignArmed ? (
            <div style={{display:'flex',gap:4}}>
              <button onClick={()=>{ setNewCampaignArmed(false); onStartNewCampaign(); }}
                style={{...btn(true),flex:1,fontSize:11,padding:'5px 0'}}>✓ Yes, start fresh</button>
              <button onClick={()=>setNewCampaignArmed(false)}
                style={{...btn(false),flex:1,fontSize:11,padding:'5px 0'}}>Cancel</button>
            </div>
          ) : (
            <button onClick={()=>setNewCampaignArmed(true)}
              style={{...btn(false),width:'100%',fontSize:11,padding:'5px 0'}}>🗺️ Start a new campaign</button>
          )}
          <div style={{fontSize:10,color:colors.textDead,marginTop:6,lineHeight:1.4}}>
            Save first if you want to come back to this story — it cannot be undone.
          </div>
        </CollapsibleSection>
      )}

      {/* Arc objectives — the campaign skeleton */}
      {onGenerateObjectives && (
        <ObjectivesPanel arcObjectives={arcObjectives} onGenerateObjectives={onGenerateObjectives} onSetObjectives={onSetObjectives} />
      )}

      {/* Disposition — who the character actually is */}
      {onSaveDisposition && (
        <DispositionEditor key={JSON.stringify(disposition)} disposition={disposition} onSaveDisposition={onSaveDisposition} />
      )}

      {/* Bio — the DM's behavior anchor */}
      {onSaveBio && <BioEditor key={character.bio || 'empty'} character={character} onSaveBio={onSaveBio} />}

      {/* NPC Manager — extract from log, edit, add, delete */}
      {(onExtractNPC || onSaveNPC) && (
        <NPCManager character={character} onExtractNPC={onExtractNPC} onSaveNPC={onSaveNPC} onDeleteNPC={onDeleteNPC} />
      )}

      {/* Town Manager — extract from log, edit, add, delete */}
      {(onExtractTown || onSaveNPC) && (
        <TownManager character={character} onExtractTown={onExtractTown} onSaveNPC={onSaveNPC} onDeleteNPC={onDeleteNPC} />
      )}

      {/* DM loot destination — affects only [ITEM:] rewards from gameplay. Crafting/salvage keep their own destinations. */}
      {onToggleLootDestination && (
        <div style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:8,marginTop:6}}>
          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:2,marginBottom:5}}>LOOT DESTINATION</div>
          <div style={{display:'flex',gap:4}}>
            {['inventory','stash'].map(dest => (
              <button key={dest} onClick={() => dest !== (lootDestination || 'inventory') && onToggleLootDestination()}
                style={{...btn(dest === (lootDestination || 'inventory')),flex:1,fontSize:11,padding:'5px 0'}}>
                {dest === 'inventory' ? '🎒 Inventory' : '📦 Stash'}
              </button>
            ))}
          </div>
          <div style={{fontSize:9,color:colors.textDead,marginTop:5,lineHeight:1.35}}>New loot granted by the DM goes here. Crafted and salvaged items keep their existing destination controls.</div>
        </div>
      )}

      {/* Raw tag visibility (moved from the header) */}
      {onToggleRawTags && (
        <button onClick={onToggleRawTags} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',marginTop:6,borderColor:showRawTags?colors.gold:colors.border}}>
          🏷️ Raw tags: {showRawTags ? 'shown' : 'hidden'}
        </button>
      )}

      {/* Standing instructions (moved from the header) */}
      {onChangeDirectives && <DirectivesEditor directives={directives} onChangeDirectives={onChangeDirectives} />}

      {/* Debug log (moved from the header) */}
      {debugLog !== undefined && <DebugViewer debugLog={debugLog} debugStatus={debugStatus} onExportDebug={onExportDebug} onCopyDebug={onCopyDebug} />}
      </>}

      {activeTab==='character' && <>
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
            {Object.keys(bagSelected).length === 0 ? 'Tap items to select · use "all" to grab a whole stack' : Object.entries(bagSelected).map(([n,c]) => `${n}${c>1?` x${c}`:''}`).join(', ')}
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
        const items = (categorized[cat] || []).slice().sort((a, b) => a.name.localeCompare(b.name));
        if (items.length === 0) return null;
        return (
          <CollapsibleSection key={cat} title={meta.label} count={items.length} defaultOpen={false}>
            {onMoveToStash && !bagMode && (
              <button
                onClick={() => items.forEach(({ name }) => onMoveToStash(name, true))}
                title={`Move every item in ${meta.label} to stash`}
                style={{...btn(false),width:'100%',fontSize:9,padding:'3px 0',marginBottom:5}}>
                📦 MOVE ALL ${meta.label.replace(/^[^ ]+\s*/, '').toUpperCase()} TO STASH
              </button>
            )}
            {items.map(({ name, count }) => {
              // Resolve from both stores: an item held in inventory AND stash may
              // have its definition in either one.
              const data = db[name];
              const isBag = data?.type === 'bag';
              const statLabel = data?.type==='weapon'?`(${data.damage}${data.bonus?`+${data.bonus}`:''})`
                : data?.type==='armor'?`(AC${data.ac})`
                : '';
              const fullLabel = data?.label || (isBag ? data?.label : '');
              const selectedCount = bagSelected[name] || 0;
              const labelOpen = expandedLabels[name];
              const bagOpen = expandedBags[name];
              return (
                <div key={name} style={{borderBottom:`1px solid ${colors.borderFaint}`,
                  background: bagMode && selectedCount > 0 ? 'rgba(201,168,76,0.08)' : 'transparent'}}>
                  <div style={{fontSize:14,color:data?colors.textFaint:colors.textGhost,padding:'3px 0',display:'flex',alignItems:'center',gap:4}}>
                    {/* One fixed-width column so names always line up. Edit and delete
                        stay hidden behind it — three live buttons beside every row is
                        both wider than the space allows and easy to hit by accident. */}
                    {!bagMode && (
                      <span style={{width:actionsFor === name ? 74 : 22,flexShrink:0,display:'flex',justifyContent:'flex-start',gap:3,transition:'width 0.12s'}}>
                        {actionsFor === name ? (
                          <>
                            {onRenameItem && <button title="Rename — merges with an existing item of that name" onClick={() => { setRenaming({ name, draft: name }); setActionsFor(null); }} style={delBtn}>✎</button>}
                            {onDeleteItem && <button title="Delete one" onClick={() => onDeleteItem(name, false)} style={delBtn}>✕</button>}
                            {onDeleteItem && count > 1 && <button title="Delete all" onClick={() => onDeleteItem(name, true)} style={delBtn}>✕✕</button>}
                          </>
                        ) : (
                          <button title="Edit or delete" onClick={() => setActionsFor(name)}
                            style={{...delBtn, color:colors.textDead, borderColor:'transparent'}}>⋯</button>
                        )}
                      </span>
                    )}
                    {bagMode && !isBag && (
                      <span style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
                        <span onClick={() => toggleBagItem(name)}
                          style={{cursor:'pointer',color:selectedCount>0?colors.gold:colors.textDead,fontSize:12,width:14,textAlign:'center'}}>
                          {selectedCount > 0 ? `${selectedCount}` : '○'}
                        </span>
                        {count > 1 && (
                          <button title={`Select all ${count}`} onClick={() => toggleBagItemAll(name, count)}
                            style={{...iconBtn,color:selectedCount>=count?colors.gold:colors.textDead,borderColor:selectedCount>=count?colors.gold:colors.borderDim}}>
                            all
                          </button>
                        )}
                      </span>
                    )}
                    {/* name — truncated, tap to expand label if it has one */}
                    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0,cursor:(bagMode&&!isBag)?'pointer':(fullLabel?'pointer':'default')}}
                      onClick={bagMode && !isBag ? () => toggleBagItem(name) : (actionsFor ? () => setActionsFor(null) : (fullLabel ? () => setExpandedLabels(p=>({...p,[name]:!p[name]})) : undefined))}>
                      {name} {statLabel && <span style={{color:colors.textDead}}>{statLabel}</span>}{fullLabel && !labelOpen && <span style={{color:colors.textDead}}> ⓘ</span>}
                    </span>
                    {/* construct status — tap to cycle dormant/active/bound */}
                    {data?.type === 'construct' && onCycleConstructStatus && !bagMode && (
                      <button
                        title="Tap to cycle: dormant → active → bound"
                        onClick={(e) => { e.stopPropagation(); onCycleConstructStatus(name); }}
                        style={{flexShrink:0,background:'transparent',border:`1px solid ${(data.status||'dormant')==='active'?colors.gold:colors.borderDim}`,
                          color:(data.status||'dormant')==='active'?colors.gold:colors.textDead,
                          fontFamily:fonts.display,fontSize:9,letterSpacing:1,padding:'1px 5px',borderRadius:3,cursor:'pointer'}}>
                        {(data.status || 'dormant').toUpperCase()}
                      </button>
                    )}
                    {/* Promote an actual entity to a companion — components
                        (spare cores, phylacteries) are better left as items. */}
                    {data?.type === 'construct' && onPromoteConstruct && !bagMode && (
                      <button
                        title="Make this a companion — gives it a full description, abilities and equipment slots"
                        onClick={(e) => { e.stopPropagation(); onPromoteConstruct(name); }}
                        style={{flexShrink:0,background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textFaint,
                          fontFamily:fonts.display,fontSize:9,letterSpacing:1,padding:'1px 5px',borderRadius:3,cursor:'pointer'}}>
                        →👥
                      </button>
                    )}
                    {/* qty — pinned to the line, never pushed off */}
                    {count > 1 && <span style={{color:colors.gold,fontFamily:fonts.mono,fontSize:14,flexShrink:0}}>x{count}</span>}
                    {/* bag expand toggle */}
                    {isBag && !bagMode && (
                      <span onClick={()=>setExpandedBags(p=>({...p,[name]:!p[name]}))}
                        style={{cursor:'pointer',color:colors.textDead,fontSize:10,flexShrink:0,padding:'0 2px'}}>{bagOpen?'▲':'▼'}</span>
                    )}
                    {!bagMode && (
                      <span style={{display:'flex',gap:3,flexShrink:0}}>
                        {onMoveToStash && (
                          <>
                            <button title="Move one to stash" onClick={() => onMoveToStash(name, false)} style={iconBtn}>📦</button>
                            {count > 1 && <button title="Move all to stash" onClick={() => onMoveToStash(name, true)} style={iconBtn}>📦📦</button>}
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  {/* expanded full label */}
                  {renaming?.name === name && onRenameItem && (
                    <div style={{display:'flex',gap:4,padding:'4px 0 6px 8px'}}>
                      <input autoFocus value={renaming.draft}
                        onChange={e => setRenaming({ name, draft: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { onRenameItem(name, renaming.draft); setRenaming(null); }
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        style={{...npcInput, flex:1}}/>
                      <button onClick={() => { onRenameItem(name, renaming.draft); setRenaming(null); }}
                        style={{...btn(true), flexShrink:0, fontSize:10, padding:'0 8px'}}>✓</button>
                      <button onClick={() => setRenaming(null)}
                        style={{...btn(false), flexShrink:0, fontSize:10, padding:'0 8px'}}>✕</button>
                    </div>
                  )}
                  {fullLabel && labelOpen && (
                    <div style={{fontSize:13,color:colors.textDead,padding:'0 0 4px 44px',lineHeight:1.4,fontStyle:'italic'}}>{fullLabel}</div>
                  )}
                  {/* expanded bag contents */}
                  {isBag && bagOpen && (
                    <div style={{padding:'2px 0 6px 14px'}}>
                      {Object.keys(data.contents||{}).length === 0 && (
                        <div style={{fontSize:11,color:colors.textDead,fontStyle:'italic'}}>Empty bag.</div>
                      )}
                      {Object.entries(data.contents||{}).map(([itemName, itemCount]) => {
                        const idata = db[itemName];
                        const ilabel = idata?.label;
                        return (
                          <div key={itemName} style={{fontSize:13,color:colors.textDead,padding:'2px 0',display:'flex',alignItems:'center',gap:4,borderBottom:`1px solid ${colors.borderFaint}`}}>
                            {onDeleteFromBag && (
                              <span style={{width:22,flexShrink:0,display:'flex',justifyContent:'flex-start'}}>
                                <button title="Delete from bag" onClick={()=>onDeleteFromBag(name,itemName,itemCount>1?false:true)} style={delBtn}>✕</button>
                              </span>
                            )}
                            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0}}>– {itemName}{ilabel?` [${ilabel}]`:''}</span>
                            {itemCount > 1 && <span style={{color:colors.goldFaint,fontFamily:fonts.mono,fontSize:13,flexShrink:0}}>x{itemCount}</span>}
                            {onRemoveFromBag && (
                              <>
                                <button title="Take one out" onClick={()=>onRemoveFromBag(name,itemName,false)} style={iconBtn}>↑</button>
                                {itemCount>1 && <button title="Take all out" onClick={()=>onRemoveFromBag(name,itemName,true)} style={iconBtn}>↑↑</button>}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
        const allStashEntries = Object.entries(stackedStash).sort((a, b) => a[0].localeCompare(b[0]));
        // Case-insensitive substring filter — stashes run to hundreds of distinct
        // entries, so scrolling to find one thing is impractical.
        const q = stashFilter.trim().toLowerCase();
        const stashEntries = q
          ? allStashEntries.filter(([name]) => {
              const data = db[name];
              return name.toLowerCase().includes(q) || (data?.label || '').toLowerCase().includes(q);
            })
          : allStashEntries;
        return (
          <CollapsibleSection
            title="📦 STASH"
            count={allStashEntries.length}
            defaultOpen={false}
          >
            <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
              Stored items — invisible to the DM. Quest relics, old gear, keepsakes.
            </div>
            {allStashEntries.length > 0 && (
              <div style={{display:'flex',gap:4,marginBottom:6}}>
                <input
                  value={stashFilter}
                  onChange={e => setStashFilter(e.target.value)}
                  placeholder={`Search ${allStashEntries.length} entries…`}
                  style={{flex:1,minWidth:0,boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:12,padding:'5px 8px',borderRadius:4,outline:'none'}}
                />
                {stashFilter && (
                  <button onClick={()=>setStashFilter('')} title="Clear search"
                    style={{...btn(false),flexShrink:0,fontSize:11,padding:'0 8px'}}>✕</button>
                )}
              </div>
            )}
            {allStashEntries.length === 0 && (
              <div style={{fontSize:12,color:colors.textDead,fontStyle:'italic',padding:'2px 0'}}>Empty — move items here to hide them from the DM.</div>
            )}
            {allStashEntries.length > 0 && stashEntries.length === 0 && (
              <div style={{fontSize:12,color:colors.textDead,fontStyle:'italic',padding:'2px 0'}}>No stash items match “{stashFilter}”.</div>
            )}
            {(() => {
              // Group by the same categories the inventory uses. A stash can run
              // to hundreds of entries, so a flat list is unscannable.
              const stashData = nm => db[nm];
              const groups = {};
              stashEntries.forEach(entry => {
                const cat = categorizeItem(entry[0], stashData(entry[0]));
                (groups[cat] = groups[cat] || []).push(entry);
              });
              return Object.entries(CATEGORY_META).map(([cat, meta]) => {
                const rows = groups[cat];
                if (!rows?.length) return null;
                return (
                  <CollapsibleSection key={cat + (q ? ':search' : '')} title={meta.label} count={rows.length} defaultOpen={!!q}>
                    {onMoveToInventory && (
                      <button
                        onClick={() => rows.forEach(([name]) => onMoveToInventory(name, true))}
                        title={`Return every visible item in ${meta.label} to inventory`}
                        style={{...btn(false),width:'100%',fontSize:9,padding:'3px 0',marginBottom:5}}>
                        ↑ MOVE ALL ${meta.label.replace(/^[^ ]+\s*/, '').toUpperCase()} TO INVENTORY
                      </button>
                    )}
                    {rows.map(([name, count]) => {
              const data = stashData(name);
              const fullLabel = data?.label || '';
              const labelOpen = expandedLabels['stash:'+name];
              return (
                <div key={name} style={{borderBottom:`1px solid ${colors.borderFaint}`}}>
                  <div style={{fontSize:14,color:colors.textGhost,padding:'3px 0',display:'flex',alignItems:'center',gap:4}}>
                    <span style={{width:44,flexShrink:0}}/>
                    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0,opacity:0.7,cursor:fullLabel?'pointer':'default'}}
                      onClick={fullLabel?()=>setExpandedLabels(p=>({...p,['stash:'+name]:!p['stash:'+name]})):undefined}>
                      {name}{fullLabel && !labelOpen && <span style={{color:colors.textDead}}> ⓘ</span>}
                    </span>
                    {count > 1 && <span style={{color:colors.goldFaint,fontFamily:fonts.mono,fontSize:14,flexShrink:0}}>x{count}</span>}
                    {onMoveToInventory && (
                      <>
                        <button title="Return one to inventory" onClick={() => onMoveToInventory(name, false)} style={iconBtn}>↑</button>
                        {count > 1 && <button title="Return all to inventory" onClick={() => onMoveToInventory(name, true)} style={iconBtn}>↑↑</button>}
                      </>
                    )}
                  </div>
                  {fullLabel && labelOpen && (
                    <div style={{fontSize:13,color:colors.textDead,padding:'0 0 4px 44px',lineHeight:1.4,fontStyle:'italic'}}>{fullLabel}</div>
                  )}
                </div>
              );
                    })}
                  </CollapsibleSection>
                );
              });
            })()}
          </CollapsibleSection>
        );
      })()}

      </>}

      <button style={{...btn(false),width:'100%',fontSize:12,marginTop:'auto'}} onClick={onSaveClick}>
        💾 Save / Export
      </button>

      <div style={{minHeight:40,flexShrink:0}}/>
    </div>
  );
}
