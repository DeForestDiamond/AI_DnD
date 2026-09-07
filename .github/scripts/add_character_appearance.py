from pathlib import Path
import re

# App.jsx: creation state, finalize call, creation textarea, sidebar save callback
p = Path('src/App.jsx')
s = p.read_text()

old = "  const [bioInput, setBioInput] = useState('');\n  const [dispInput, setDispInput] = useState({ alignment:'', cares:'', indifferent:'', methods:'', lines:'' });"
new = "  const [bioInput, setBioInput] = useState('');\n  const [appearanceInput, setAppearanceInput] = useState('');\n  const [dispInput, setDispInput] = useState({ alignment:'', cares:'', indifferent:'', methods:'', lines:'' });"
if old not in s: raise SystemExit('App creation state anchor not found')
s = s.replace(old, new, 1)

old = "const char = finalizeCharacter(nameInput, bioInput, dispInput);"
new = "const char = finalizeCharacter(nameInput, bioInput, appearanceInput, dispInput);"
if old not in s: raise SystemExit('finalizeCharacter call anchor not found')
s = s.replace(old, new, 1)

# Insert appearance textarea directly after the bio textarea in character creation.
pat = re.compile(r"(\s*<textarea value=\{bioInput\} onChange=\{e=>setBioInput\(e\.target\.value\)\} rows=\{5\}\n\s*placeholder=\"Backstory / bio \(optional\)[^\n]*\n\s*style=\{\{[^\n]*\}\}/>)")
m = pat.search(s)
if not m: raise SystemExit('bio textarea anchor not found')
insert = m.group(1) + "\n        <textarea value={appearanceInput} onChange={e=>setAppearanceInput(e.target.value)} rows={4}\n          placeholder=\"Physical appearance (optional) — build, features, hair, eyes, clothing, scars, mannerisms, or anything the DM should consistently remember.\"\n          style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.35)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:13,padding:'8px 10px',borderRadius:4,marginBottom:10,outline:'none',resize:'vertical'}}/>"
s = s[:m.start()] + insert + s[m.end():]

old = "            onSaveBio={(bio) => { updateChar({ ...charRef.current, bio }); log('[BIO] Updated by player'); }}"
new = old + "\n            onSaveAppearance={(appearance) => { updateChar({ ...charRef.current, appearance }); log('[APPEARANCE] Updated by player'); }}"
if old not in s: raise SystemExit('Sidebar bio callback anchor not found')
s = s.replace(old, new, 1)
p.write_text(s)

# useCharacter: finalize includes appearance
p = Path('src/hooks/character/useCharacter.js')
s = p.read_text()
old = "const finalizeCharacter = (name, bio = '', disposition = null) => {\n    const char = { ...charRef.current, name: name.trim() || 'Adventurer', bio: bio.trim(),\n      ...(disposition ? { disposition } : {}), xp:0, _v:SAVE_VERSION };"
new = "const finalizeCharacter = (name, bio = '', appearance = '', disposition = null) => {\n    const char = { ...charRef.current, name: name.trim() || 'Adventurer', bio: bio.trim(), appearance: appearance.trim(),\n      ...(disposition ? { disposition } : {}), xp:0, _v:SAVE_VERSION };"
if old not in s: raise SystemExit('finalizeCharacter definition anchor not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Defaults
p = Path('src/hooks/character/defaults.js')
s = p.read_text()
old = "  bio: '',\n  directives: '',"
new = "  bio: '',\n  appearance: '',\n  directives: '',"
if old not in s: raise SystemExit('defaults bio anchor not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Save migration + version bump
p = Path('src/constants/progression.js')
s = p.read_text()
if 'export const SAVE_VERSION = 20;' not in s: raise SystemExit('SAVE_VERSION is not 20')
s = s.replace('export const SAVE_VERSION = 20;', 'export const SAVE_VERSION = 21;', 1)
p.write_text(s)

p = Path('src/hooks/character/migration.js')
s = p.read_text()
anchor = "  c.bankedCoins = Math.max(0, Math.floor(Number(c.bankedCoins) || 0));"
if anchor not in s: raise SystemExit('migration v20 anchor not found')
block = "  if (v < 21) {\n    if (typeof c.appearance !== 'string') {\n      c.appearance = '';\n      notes.push('Physical appearance field initialized');\n    }\n  }\n" + anchor
s = s.replace(anchor, block, 1)
p.write_text(s)

# Prompt context: keep the existing ctx.bio API, but include appearance before backstory.
p = Path('src/prompts/state.js')
s = p.read_text()
old = "  const bio = char.bio ? `\\nBACKSTORY: ${char.bio}\\n` : '';"
new = "  const appearance = char.appearance ? `\\nPHYSICAL APPEARANCE: ${char.appearance}\\n` : '';\n  const bio = `${appearance}${char.bio ? `\\nBACKSTORY: ${char.bio}\\n` : ''}`;"
if old not in s: raise SystemExit('state bio anchor not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Sidebar: pass appearance editor callback into BioEditor
p = Path('src/components/Sidebar.jsx')
s = p.read_text()
old = "onDeleteNPC, onSaveBio, onStartNewCampaign"
new = "onDeleteNPC, onSaveBio, onSaveAppearance, onStartNewCampaign"
if old not in s: raise SystemExit('Sidebar prop anchor not found')
s = s.replace(old, new, 1)
old = "{onSaveBio && <BioEditor key={character.bio || 'empty'} character={character} onSaveBio={onSaveBio} />}"
new = "{onSaveBio && <BioEditor key={`${character.bio || 'empty'}|${character.appearance || 'empty'}`} character={character} onSaveBio={onSaveBio} onSaveAppearance={onSaveAppearance} />}"
if old not in s: raise SystemExit('BioEditor render anchor not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Bio dropdown now edits both bio and appearance and saves them together.
p = Path('src/components/sidebar/world/Panels.jsx')
s = p.read_text()
old = """export function BioEditor({ character, onSaveBio }) {
  const [text, setText] = useState(character.bio || '');
  const [dirty, setDirty] = useState(false);
  return (
    <CollapsibleSection title=\"📖 BIO\" defaultOpen={false}>
      <textarea value={text} rows={7}
        onChange={e=>{ setText(e.target.value); setDirty(true); }}
        placeholder=\"Backstory / bio — who this character is, how they act, what drives them. The DM reads this every message.\"
        style={{...npcInput, resize:'vertical', lineHeight:1.5, marginBottom:6}}/>
      <button onClick={()=>{ onSaveBio(text.trim()); setDirty(false); }} disabled={!dirty}
        style={{...btn, width:'100%', opacity:dirty?1:0.4}}>{dirty ? '✓ SAVE BIO' : 'SAVED'}</button>
    </CollapsibleSection>
  );
}
"""
new = """export function BioEditor({ character, onSaveBio, onSaveAppearance }) {
  const [text, setText] = useState(character.bio || '');
  const [appearance, setAppearance] = useState(character.appearance || '');
  const [dirty, setDirty] = useState(false);
  return (
    <CollapsibleSection title=\"📖 BIO & APPEARANCE\" defaultOpen={false}>
      <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:4}}>PHYSICAL APPEARANCE</div>
      <textarea value={appearance} rows={5}
        onChange={e=>{ setAppearance(e.target.value); setDirty(true); }}
        placeholder=\"Build, features, hair, eyes, clothing, scars, mannerisms — what the DM should consistently remember about how you look.\"
        style={{...npcInput, resize:'vertical', lineHeight:1.5, marginBottom:8}}/>
      <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:4}}>BACKSTORY / BIO</div>
      <textarea value={text} rows={7}
        onChange={e=>{ setText(e.target.value); setDirty(true); }}
        placeholder=\"Backstory / bio — who this character is, how they act, what drives them. The DM reads this every message.\"
        style={{...npcInput, resize:'vertical', lineHeight:1.5, marginBottom:6}}/>
      <button onClick={()=>{ onSaveAppearance?.(appearance.trim()); onSaveBio(text.trim()); setDirty(false); }} disabled={!dirty}
        style={{...btn, width:'100%', opacity:dirty?1:0.4}}>{dirty ? '✓ SAVE BIO & APPEARANCE' : 'SAVED'}</button>
    </CollapsibleSection>
  );
}
"""
if old not in s: raise SystemExit('BioEditor definition anchor not found')
s = s.replace(old, new, 1)
p.write_text(s)

print('appearance patch applied')
