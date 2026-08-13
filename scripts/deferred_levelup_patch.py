from pathlib import Path
import re

# ---- useCharacter.js ---------------------------------------------------------
p = Path('src/hooks/useCharacter.js')
s = p.read_text()

anchor = "export const calcMaxHp = (clsName, con, level = 1) => {\n  const base   = HP_BASE[clsName]    || 8;\n  const perLv  = HP_PER_LEVEL[clsName] || 5;\n  const conMod = statMod(con);\n  return base + conMod + (level - 1) * (perLv + conMod);\n};\n"
helper = """

// Level-ups are derived from XP instead of stored as transient UI state. This
// makes them safely bankable across turns, saves, and reloads: XP says how many
// levels the character has earned; character.level says how many were spent.
export const levelUpsAvailable = (char) => {
  if (!char) return 0;
  const xp = char.xp || 0;
  const current = Math.max(1, char.level || 1);
  const earned = XP_THRESHOLDS.reduce(
    (lvl, threshold, idx) => (idx > 0 && threshold >= 0 && xp >= threshold ? idx : lvl),
    1
  );
  return Math.max(0, earned - current);
};
"""
assert anchor in s
if 'export const levelUpsAvailable' not in s:
    s = s.replace(anchor, anchor + helper, 1)

s = s.replace("  const [pendingStatPoint, setPendingStatPoint] = useState(false);\n  const [levelUpMsg, setLevelUpMsg]       = useState(null);\n", "")

pat = re.compile(r"\n  const checkLevelUp = \(char\) => \{.*?\n  \};\n\n  // className = which class to advance, stat = which stat to boost", re.S)
m = pat.search(s)
assert m, 'checkLevelUp block not found'
s = s[:m.start()] + "\n  // className = which class to advance, stat = which stat to boost" + s[m.end():]

old = """  const spendStatPoint = (className, stat) => {
    setCharacter(c => {
      const classLevels  = { ...(c.classLevels || {}) };
      classLevels[className] = (classLevels[className] || 0) + 1;
      const newStats  = { ...c.stats, [stat]: c.stats[stat] + 1 };
      const hpPerLevel = HP_PER_LEVEL[className] || 5;
      const conMod     = statMod(newStats.con);
      const hpGain     = Math.max(1, hpPerLevel + conMod);
      const newMaxHp   = c.maxHp + hpGain;
      const withMax = { ...c, stats:newStats, maxHp:newMaxHp, classLevels };
      const nc = { ...withMax, hp: Math.min(c.hp + hpGain, effectiveMaxHp(withMax)) };
      charRef.current = nc;
      return nc;
    });
    setPendingStatPoint(false);
  };
"""
new = """  const spendStatPoint = (className, stat) => {
    setCharacter(c => {
      if (levelUpsAvailable(c) <= 0) return c;
      const classLevels  = { ...(c.classLevels || {}) };
      classLevels[className] = (classLevels[className] || 0) + 1;
      const newStats  = { ...c.stats, [stat]: c.stats[stat] + 1 };
      const hpPerLevel = HP_PER_LEVEL[className] || 5;
      const conMod     = statMod(newStats.con);
      const hpGain     = Math.max(1, hpPerLevel + conMod);
      const newMaxHp   = c.maxHp + hpGain;
      const withMax = { ...c, level:(c.level || 1) + 1, stats:newStats, maxHp:newMaxHp, classLevels };
      const nc = { ...withMax, hp: Math.min(c.hp + hpGain, effectiveMaxHp(withMax)) };
      charRef.current = nc;
      return nc;
    });
  };
"""
assert old in s, 'spendStatPoint block not found'
s = s.replace(old, new, 1)

s = s.replace("    c = skipLevelUp ? c : checkLevelUp(c);\n    // Equipment tags may have changed CON-granting gear; keep the HP ratio.\n", "    // XP no longer auto-spends a level here. Available level-ups are derived\n    // from XP and can be banked until the player chooses to spend them.\n    // Equipment tags may have changed CON-granting gear; keep the HP ratio.\n", 1)

s = s.replace("    setPendingStatPoint(false);\n    setLevelUpMsg(null);\n", "")
s = s.replace("    pendingStatPoint, setPendingStatPoint,\n    levelUpMsg, setLevelUpMsg,\n", "")

p.write_text(s)

# ---- Sidebar.jsx -------------------------------------------------------------
p = Path('src/components/Sidebar.jsx')
s = p.read_text()
s = s.replace("import { useState, Component } from 'react';", "import { useState, Component } from 'react';")
if "MULTICLASS_OPTIONS" not in s:
    s = s.replace("import { XP_THRESHOLDS } from '../constants/progression.js';", "import { XP_THRESHOLDS } from '../constants/progression.js';\nimport { MULTICLASS_OPTIONS } from '../constants/multiclass.js';")

sig_old = "export function Sidebar({ character, onSlotClick, onCompanionSlotClick, onCompanionUnequip, onSaveClick, onClose, onAbilitiesClick, onMoveToStash, onMoveToInventory, onCreateBag, onAddToBag, onRemoveFromBag, onDeleteItem, onRenameItem, onDeleteFromBag, selectedModel, onToggleModel, pacing, onTogglePacing, environment, onChangeEnvironment, arcAntagonist, arcLocation, onClearArc, onRollArc, onSetArc, onToggleContextExclusion, onExtractNPC, onExtractTown, onSaveNPC, onDeleteNPC, onSaveBio, onStartNewCampaign, arcObjectives, arcGoal, onSetArcGoal, onGenerateObjectives, onSetObjectives, disposition, onSaveDisposition, defeatedAntagonists, onReviveAntagonist, onCycleConstructStatus, onPromoteConstruct, onProposeCrafting, onExecuteCrafting, onProposeDismantle, onExecuteDismantle, voiceSettings, showRawTags, onToggleRawTags, debugLog, debugStatus, onExportDebug, onCopyDebug, directives, onChangeDirectives }) {"
sig_new = "export function Sidebar({ character, onSlotClick, onCompanionSlotClick, onCompanionUnequip, onSaveClick, onClose, onAbilitiesClick, onMoveToStash, onMoveToInventory, onCreateBag, onAddToBag, onRemoveFromBag, onDeleteItem, onRenameItem, onDeleteFromBag, selectedModel, onToggleModel, pacing, onTogglePacing, environment, onChangeEnvironment, arcAntagonist, arcLocation, onClearArc, onRollArc, onSetArc, onToggleContextExclusion, onExtractNPC, onExtractTown, onSaveNPC, onDeleteNPC, onSaveBio, onStartNewCampaign, arcObjectives, arcGoal, onSetArcGoal, onGenerateObjectives, onSetObjectives, disposition, onSaveDisposition, defeatedAntagonists, onReviveAntagonist, onCycleConstructStatus, onPromoteConstruct, onProposeCrafting, onExecuteCrafting, onProposeDismantle, onExecuteDismantle, voiceSettings, showRawTags, onToggleRawTags, debugLog, debugStatus, onExportDebug, onCopyDebug, directives, onChangeDirectives, levelUpsAvailable=0, onLevelClassSelect, onLevelStatSelect }) {"
assert sig_old in s, 'Sidebar signature not found'
s = s.replace(sig_old, sig_new, 1)

state_anchor = "  const [activeTab, setActiveTab] = useState('character');\n"
assert state_anchor in s
s = s.replace(state_anchor, state_anchor + "  const [levelClassChoice, setLevelClassChoice] = useState(null);\n", 1)

old_tabs = """        {[
          ['character', '🎲 CHARACTER'],
          ['crafting',  '🔨 CRAFTING'],
          ['settings',  '⚙️ SETTINGS'],
        ].map(([id, label]) => (
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{flex:1,background:activeTab===id?'rgba(201,168,76,0.15)':'transparent',border:`1px solid ${activeTab===id?colors.gold:colors.borderDim}`,color:activeTab===id?colors.gold:colors.textFaint,padding:'8px 2px',fontSize:10,fontFamily:fonts.display,letterSpacing:0.5,borderRadius:3,cursor:'pointer',whiteSpace:'nowrap'}}>
            {label}
          </button>
        ))}
"""
new_tabs = """        {[
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
"""
assert old_tabs in s, 'tab block not found'
s = s.replace(old_tabs, new_tabs, 1)

level_panel = r'''

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
'''
insert_anchor = "\n      {activeTab==='settings' && <>\n      {/* Save button */}"
assert insert_anchor in s, 'settings anchor missing'
s = s.replace(insert_anchor, level_panel + insert_anchor, 1)
p.write_text(s)

# ---- App.jsx -----------------------------------------------------------------
p = Path('src/App.jsx')
s = p.read_text()
s = s.replace("import { useCharacter, modStr, statMod, calcAC, equippableInSlot, allItems } from './hooks/useCharacter.js';", "import { useCharacter, modStr, statMod, calcAC, equippableInSlot, allItems, levelUpsAvailable } from './hooks/useCharacter.js';")
s = s.replace("import { MulticlassModal } from './components/modals/MulticlassModal.jsx';\n", "")

s = s.replace("    toggleContextExclusion,\n    pendingStatPoint, setPendingStatPoint,\n    levelUpMsg,\n  } = useCharacter(log);", "    toggleContextExclusion,\n  } = useCharacter(log);")

# Remove old modal.
pat = re.compile(r"\n      \{pendingStatPoint && \(\n        <MulticlassModal.*?\n      \)\}\n", re.S)
s, n = pat.subn("\n", s, count=1)
assert n == 1, f'old level modal removal count {n}'
# Remove old transient toast.
pat = re.compile(r"\n      \{levelUpMsg && !pendingStatPoint && \(.*?\n      \)\}\n", re.S)
s, n = pat.subn("\n", s, count=1)
assert n == 1, f'old level toast removal count {n}'

# Insert handlers before slot handling.
anchor = "  // ── Slot handling ──────────────────────────────────────────────────────────\n"
handlers = """  const bankedLevelUps = levelUpsAvailable(character);

  const handleLevelClassSelect = (cls) => {
    if (['Cleric','Warlock','Paladin'].includes(cls) && !charRef.current.deity) {
      setDeityModalContext('multiclass');
      setDeityModalClass(cls);
      setShowDeityModal(true);
    }
  };

  const handleLevelStatSelect = (className, stat) => {
    const cur = charRef.current;
    if (levelUpsAvailable(cur) <= 0) return;
    const newLevels = { ...(cur.classLevels || {}), [className]: ((cur.classLevels || {})[className] || 0) + 1 };
    const projected = { ...cur, level:(cur.level || 1) + 1, classLevels:newLevels };
    spendStatPoint(className, stat);
    const owed = owedSubclasses(projected);
    if (owed.length) {
      setSubclassQueue(q => [...new Set([...q, ...owed])]);
      setShowSubclassModal(true);
    }
  };

"""
assert anchor in s
s = s.replace(anchor, handlers + anchor, 1)

# Sidebar props.
prop_anchor = "            character={character}\n            onSlotClick={handleSlotClick}\n"
assert prop_anchor in s
s = s.replace(prop_anchor, "            character={character}\n            levelUpsAvailable={bankedLevelUps}\n            onLevelClassSelect={handleLevelClassSelect}\n            onLevelStatSelect={handleLevelStatSelect}\n            onSlotClick={handleSlotClick}\n", 1)

# Debug status reflects derived banked levels.
s = s.replace("debugStatus={`char: lv${character.level} xp:${character.xp} pending:${String(pendingStatPoint)} | arc:", "debugStatus={`char: lv${character.level} xp:${character.xp} levelups:${bankedLevelUps} | arc:", 1)

# Header marker.
header_anchor = "          <div style={{display:'flex',alignItems:'center',gap:6}}>\n            {/* Story log toggle */}"
marker = """          <div style={{display:'flex',alignItems:'center',gap:6}}>
            {bankedLevelUps > 0 && (
              <span title={`${bankedLevelUps} level-up${bankedLevelUps===1?'':'s'} available — open the LEVEL tab in the sidebar whenever you are ready`}
                style={{fontFamily:fonts.display,fontSize:10,color:colors.gold,letterSpacing:0.6,border:`1px solid ${colors.goldDim}`,background:'rgba(201,168,76,0.10)',padding:'4px 7px',borderRadius:3,whiteSpace:'nowrap'}}>
                ⭐ LEVEL UP{bankedLevelUps > 1 ? ` ×${bankedLevelUps}` : ''}
              </span>
            )}
            {/* Story log toggle */}"""
assert header_anchor in s
s = s.replace(header_anchor, marker, 1)
p.write_text(s)

print('deferred level-up sidebar patch applied')
