from pathlib import Path

p = Path('src/components/Sidebar.jsx')
s = p.read_text()

# Encounters: pacing + environment
old = """      {/* Pacing knob — how often the world pushes back */}
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
"""
new = """      <CollapsibleSection title="⚔️ ENCOUNTERS" defaultOpen={false}>
        {/* Pacing knob — how often the world pushes back */}
        {onTogglePacing && (
          <button onClick={onTogglePacing} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',opacity:pacing==='off'?0.6:1,borderColor:pacing==='dangerous'?colors.red:pacing==='normal'?colors.gold:colors.border}}>
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
      </CollapsibleSection>
"""
if old not in s: raise SystemExit('encounters block not found')
s = s.replace(old, new, 1)

# Adventure section
start = """      {/* Situation Adventure — mutually exclusive with antagonist arcs */}
      {onRollAdventure && (
        <div style={{marginTop:6,padding:'7px 9px',background:'rgba(0,0,0,0.25)',border:`1px solid ${colors.borderDim}`,borderRadius:3}}>
"""
repl = """      {/* Situation Adventure — mutually exclusive with antagonist arcs */}
      {onRollAdventure && (
        <CollapsibleSection title="🎭 ADVENTURE" defaultOpen={false}>
"""
if start not in s: raise SystemExit('adventure start not found')
s = s.replace(start, repl, 1)
end = """          <div style={{fontSize:9,color:colors.textDead,lineHeight:1.35,marginTop:5}}>
            Rolling an Adventure clears any antagonist. [ADVENTURE COMPLETE] clears it without rolling a replacement.
          </div>
        </div>
      )}
"""
end_repl = """          <div style={{fontSize:9,color:colors.textDead,lineHeight:1.35,marginTop:5}}>
            Rolling an Adventure clears any antagonist. [ADVENTURE COMPLETE] clears it without rolling a replacement.
          </div>
        </CollapsibleSection>
      )}
"""
if end not in s: raise SystemExit('adventure end not found')
s = s.replace(end, end_repl, 1)

# Antagonist section
start = """      {/* Story arc — the hidden antagonist all foreshadowing builds toward */}
      {onClearArc && (
        <div style={{marginTop:6,padding:'7px 9px',background:'rgba(0,0,0,0.25)',border:`1px solid ${colors.borderDim}`,borderRadius:3}}>
"""
repl = """      {/* Story arc — the hidden antagonist all foreshadowing builds toward */}
      {onClearArc && (
        <CollapsibleSection title="👁️ ANTAGONIST" defaultOpen={false}>
"""
if start not in s: raise SystemExit('antagonist start not found')
s = s.replace(start, repl, 1)
# anchor on the custom antagonist close immediately before completed adventures
end = """          )}
        </div>
      )}

      {onRestoreAdventure && (completedAdventures?.length > 0) && (
"""
end_repl = """          )}
        </CollapsibleSection>
      )}

      {onRestoreAdventure && (completedAdventures?.length > 0) && (
"""
if end not in s: raise SystemExit('antagonist end not found')
s = s.replace(end, end_repl, 1)

# Loot destination
start = """      {/* DM loot destination — affects only [ITEM:] rewards from gameplay. Crafting/salvage keep their own destinations. */}
      {onToggleLootDestination && (
        <div style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:8,marginTop:6}}>
          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:2,marginBottom:5}}>LOOT DESTINATION</div>
"""
repl = """      {/* DM loot destination — affects only [ITEM:] rewards from gameplay. Crafting/salvage keep their own destinations. */}
      {onToggleLootDestination && (
        <CollapsibleSection title="🎒 DM LOOT LOCATION" defaultOpen={false}>
"""
if start not in s: raise SystemExit('loot start not found')
s = s.replace(start, repl, 1)
end = """          <div style={{fontSize:9,color:colors.textDead,marginTop:5,lineHeight:1.35}}>New loot granted by the DM goes here. Crafted and salvaged items keep their existing destination controls.</div>
        </div>
      )}
"""
end_repl = """          <div style={{fontSize:9,color:colors.textDead,marginTop:5,lineHeight:1.35}}>New loot granted by the DM goes here. Crafted and salvaged items keep their existing destination controls.</div>
        </CollapsibleSection>
      )}
"""
if end not in s: raise SystemExit('loot end not found')
s = s.replace(end, end_repl, 1)

# Raw tags
old = """      {/* Raw tag visibility (moved from the header) */}
      {onToggleRawTags && (
        <button onClick={onToggleRawTags} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',marginTop:6,borderColor:showRawTags?colors.gold:colors.border}}>
          🏷️ Raw tags: {showRawTags ? 'shown' : 'hidden'}
        </button>
      )}
"""
new = """      {/* Raw tag visibility (moved from the header) */}
      {onToggleRawTags && (
        <CollapsibleSection title="🏷️ TAGS" defaultOpen={false}>
          <button onClick={onToggleRawTags} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',borderColor:showRawTags?colors.gold:colors.border}}>
            Raw tags: {showRawTags ? 'shown' : 'hidden'}
          </button>
        </CollapsibleSection>
      )}
"""
if old not in s: raise SystemExit('tags block not found')
s = s.replace(old, new, 1)

p.write_text(s)
