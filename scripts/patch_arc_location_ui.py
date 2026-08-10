from pathlib import Path

# App: pass arc location to Sidebar and include it in compact debug status.
p = Path('src/App.jsx')
s = p.read_text()
s = s.replace(
    "debugStatus={`char: lv${character.level} xp:${character.xp} pending:${String(pendingStatPoint)}`}",
    "debugStatus={`char: lv${character.level} xp:${character.xp} pending:${String(pendingStatPoint)} | arc: ${character.arc?.antagonist || 'none'} | arcLocation: ${character.arc?.arcLocation || 'none'}`}"
)
s = s.replace(
    "arcAntagonist={character.arc?.antagonist || null}\n",
    "arcAntagonist={character.arc?.antagonist || null}\n            arcLocation={character.arc?.arcLocation || null}\n"
)
p.write_text(s)

# Sidebar: accept location prop and show it inside the spoiler card.
p = Path('src/components/Sidebar.jsx')
s = p.read_text()
s = s.replace(
    "environment, onChangeEnvironment, arcAntagonist, onClearArc, onRollArc, onSetArc,",
    "environment, onChangeEnvironment, arcAntagonist, arcLocation, onClearArc, onRollArc, onSetArc,"
)
old = """                  <div style={{fontSize:12,color:colors.gold,lineHeight:1.4}}>{arcAntagonist}</div>\n                  <div onClick={()=>setRevealedFor(null)}"""
new = """                  <div style={{fontSize:12,color:colors.gold,lineHeight:1.4}}>{arcAntagonist}</div>\n                  {arcLocation && (\n                    <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.4,marginTop:3}}>📍 {arcLocation}</div>\n                  )}\n                  <div onClick={()=>setRevealedFor(null)}"""
if old not in s:
    raise SystemExit('spoiler marker not found')
s = s.replace(old, new, 1)
p.write_text(s)

assert 'arcLocation={character.arc?.arcLocation || null}' in Path('src/App.jsx').read_text()
assert '📍 {arcLocation}' in Path('src/components/Sidebar.jsx').read_text()
print('arc location UI patched')
