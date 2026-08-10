from pathlib import Path
import subprocess

p = Path('src/App.jsx')
s = p.read_text()
old = "debugStatus={`char: lv${character.level} xp:${character.xp} pending:${String(pendingStatPoint)}`}"
new = "debugStatus={`char: lv${character.level} xp:${character.xp} pending:${String(pendingStatPoint)} | arc: ${character.arc?.antagonist || 'none'} | arcLocation: ${character.arc?.arcLocation || 'none'}`}"
if old not in s: raise SystemExit('debugStatus marker missing')
s = s.replace(old, new, 1)
old = "arcAntagonist={character.arc?.antagonist || null}\n"
new = "arcAntagonist={character.arc?.antagonist || null}\n            arcLocation={character.arc?.arcLocation || null}\n"
if old not in s: raise SystemExit('arcAntagonist prop marker missing')
s = s.replace(old, new, 1)
p.write_text(s)

p = Path('src/components/Sidebar.jsx')
s = p.read_text()
old = "environment, onChangeEnvironment, arcAntagonist, onClearArc, onRollArc, onSetArc,"
new = "environment, onChangeEnvironment, arcAntagonist, arcLocation, onClearArc, onRollArc, onSetArc,"
if old not in s: raise SystemExit('Sidebar signature marker missing')
s = s.replace(old, new, 1)
old = """                  <div style={{fontSize:12,color:colors.gold,lineHeight:1.4}}>{arcAntagonist}</div>\n                  <div onClick={()=>setRevealedFor(null)}"""
new = """                  <div style={{fontSize:12,color:colors.gold,lineHeight:1.4}}>{arcAntagonist}</div>\n                  {arcLocation && (\n                    <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.4,marginTop:3}}>📍 {arcLocation}</div>\n                  )}\n                  <div onClick={()=>setRevealedFor(null)}"""
if old not in s: raise SystemExit('spoiler marker missing')
s = s.replace(old, new, 1)
p.write_text(s)

# Validate before persisting anything.
subprocess.run(['npm','ci'], check=True)
subprocess.run(['npm','run','build'], check=True)

# Commit from this step so the stale follow-up step in the old workflow cannot
# prevent the validated UI fix from landing on the feature branch.
subprocess.run(['git','config','user.name','github-actions[bot]'], check=True)
subprocess.run(['git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com'], check=True)
subprocess.run(['git','add','src/App.jsx','src/components/Sidebar.jsx'], check=True)
subprocess.run(['git','commit','-m','Show arc location in debug and spoiler UI'], check=True)
subprocess.run(['git','push'], check=True)
print('arc location UI patched, built, and committed')
