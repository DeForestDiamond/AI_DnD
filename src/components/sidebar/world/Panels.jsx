import { useState } from 'react';
import { colors, fonts, btn } from '../../../styles/theme.js';
import { SLOTS } from '../../../constants/items.js';
import { equippableInSlot } from '../../../hooks/useCharacter.js';
import { CollapsibleSection, npcInput } from '../common/index.jsx';

export function BioEditor({ character, onSaveBio }) {
  const [text, setText] = useState(character.bio || '');
  const [dirty, setDirty] = useState(false);
  return (
    <CollapsibleSection title="📖 BIO" defaultOpen={false}>
      <textarea value={text} rows={7}
        onChange={e=>{ setText(e.target.value); setDirty(true); }}
        placeholder="Backstory / bio — who this character is, how they act, what drives them. The DM reads this every message."
        style={{...npcInput, resize:'vertical', lineHeight:1.5, marginBottom:6}}/>
      <button onClick={()=>{ onSaveBio(text.trim()); setDirty(false); }} disabled={!dirty}
        style={{...btn, width:'100%', opacity:dirty?1:0.4}}>{dirty ? '✓ SAVE BIO' : 'SAVED'}</button>
    </CollapsibleSection>
  );
}

// ── Town Manager: extract-from-log + edit/add/delete for towns/locations ──────
const dictToLines = (d) => Object.entries(d || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
const linesToDict = (text) => {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim(); if (!line) continue;
    const i = line.indexOf(':');
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    else out[line] = '';
  }
  return out;
};
export function TownManager({ character, onExtractTown, onSaveNPC, onDeleteNPC }) {
  const [exName, setExName] = useState('');
  const [exFrom, setExFrom] = useState('');
  const [exTo, setExTo]     = useState('');
  const [busy, setBusy]     = useState(false);
  const [exNote, setExNote] = useState('');
  const [status, setStatus] = useState('');
  const [editKey, setEditKey] = useState('');   // '' | 'new' | name
  const [tName, setTName]   = useState('');
  const [tDesc, setTDesc]   = useState('');
  const [tStatus, setTStatus] = useState('');
  const [tLocs, setTLocs]   = useState('');
  const [tRes, setTRes]     = useState('');

  const runExtract = async () => {
    const from = parseInt(exFrom, 10), to = parseInt(exTo, 10);
    if (Number.isNaN(from) || Number.isNaN(to)) { setStatus('✗ Enter the message # range'); return; }
    setBusy(true); setStatus('Extracting…');
    try {
      const { applied } = await onExtractTown({ name: exName, from, to, note: exNote });
      setStatus(applied.length ? `✓ Saved: ${applied.join(', ')}` : 'No locations found in that range');
      if (applied.length) { setExName(''); setExNote(''); }
    } catch (e) { setStatus('✗ ' + e.message); }
    setBusy(false);
  };

  const openEdit = (n) => {
    const e = character.towns?.[n] || {};
    setEditKey(n); setTName(n); setTDesc(e.desc || ''); setTStatus(e.status || '');
    setTLocs(dictToLines(e.notable_locations)); setTRes(dictToLines(e.minor_residents));
  };
  const openNew = () => { setEditKey('new'); setTName(''); setTDesc(''); setTStatus(''); setTLocs(''); setTRes(''); };
  const saveEdit = () => {
    const finalName = tName.trim();
    if (!finalName) { setStatus('✗ Name required'); return; }
    const isNew = editKey === 'new';
    const entry = { ...((!isNew && character.towns?.[editKey]) || {}) };
    const put = (k, v) => { const t = v.trim(); if (t) entry[k] = t; else delete entry[k]; };
    put('desc', tDesc); put('status', tStatus);
    const locs = linesToDict(tLocs), res = linesToDict(tRes);
    if (Object.keys(locs).length) entry.notable_locations = locs; else delete entry.notable_locations;
    if (Object.keys(res).length) entry.minor_residents = res; else delete entry.minor_residents;
    onSaveNPC('towns', finalName, entry, !isNew ? editKey : null);
    setStatus(`✓ Saved ${finalName}`); setEditKey('');
  };
  const deleteEdit = () => {
    if (editKey === 'new') { setEditKey(''); return; }
    onDeleteNPC('towns', editKey); setStatus(`✓ Deleted ${editKey}`); setEditKey('');
  };

  const townNames = Object.keys(character.towns || {});
  return (
    <CollapsibleSection title="🏘️ TOWN MANAGER" count={townNames.length} defaultOpen={false}>
      <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,margin:'4px 0 4px'}}>EXTRACT FROM LOG</div>
      <input value={exName} onChange={e=>setExName(e.target.value)} placeholder="Town name (blank = find all significant)" style={{...npcInput, marginBottom:4}}/>
      <div style={{display:'flex', gap:4, marginBottom:6}}>
        <input value={exFrom} onChange={e=>setExFrom(e.target.value)} placeholder="From #" inputMode="numeric" style={{...npcInput, flex:1}}/>
        <input value={exTo} onChange={e=>setExTo(e.target.value)} placeholder="To #" inputMode="numeric" style={{...npcInput, flex:1}}/>
      </div>
      <input value={exNote} onChange={e=>setExNote(e.target.value)}
        placeholder="What changed? (optional)"
        style={{...npcInput, marginBottom:6}}/>
      <button onClick={runExtract} disabled={busy} style={{...btn, width:'100%', opacity:busy?0.5:1}}>{busy ? '…' : '📥 EXTRACT'}</button>
      {status && <div style={{fontSize:12,color:status.startsWith('✗')?'#c96a4c':colors.goldFaint,marginTop:4,lineHeight:1.4}}>{status}</div>}

      <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,margin:'10px 0 4px'}}>EDIT ENTRIES</div>
      <div style={{display:'flex',gap:4,marginBottom:4}}>
        <select value={editKey !== 'new' ? editKey : ''} onChange={e=>{ if (e.target.value) openEdit(e.target.value); }} style={{...npcInput, flex:1}}>
          <option value="">Select a town to edit…</option>
          {townNames.map(n=><option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={openNew} style={{...btn, flexShrink:0}}>+ New</button>
      </div>

      {editKey && (
        <div style={{border:`1px solid ${colors.borderDim}`, borderRadius:4, padding:8, marginTop:2}}>
          <input value={tName} onChange={e=>setTName(e.target.value)} placeholder="Town name" style={{...npcInput, marginBottom:4}}/>
          <input value={tStatus} onChange={e=>setTStatus(e.target.value)} placeholder="Status (e.g. established base, hostile)" style={{...npcInput, marginBottom:4}}/>
          <textarea value={tDesc} onChange={e=>setTDesc(e.target.value)} placeholder="Description — what this place is" rows={3} style={{...npcInput, resize:'vertical', marginBottom:4}}/>
          <textarea value={tLocs} onChange={e=>setTLocs(e.target.value)} placeholder={"Notable locations, one per line:\nGilded Peacock: high-end inn, Garden District"} rows={4} style={{...npcInput, resize:'vertical', marginBottom:4}}/>
          <textarea value={tRes} onChange={e=>setTRes(e.target.value)} placeholder={"Minor residents, one per line:\nJhasso: nervous spice merchant, owes a favor"} rows={4} style={{...npcInput, resize:'vertical', marginBottom:6}}/>
          <div style={{fontSize:10,color:colors.textGhost,marginBottom:6,lineHeight:1.4}}>Full detail is sent to the DM only while the location tag matches this town — otherwise just name, description and status.</div>
          <div style={{display:'flex',gap:4}}>
            <button onClick={saveEdit} style={{...btn, flex:1}}>✓ SAVE</button>
            {editKey !== 'new' && <button onClick={deleteEdit} style={{...btn, flex:1, color:'#c96a4c', borderColor:'#5a2a1a'}}>✕ DELETE</button>}
            <button onClick={closeEditTown(setEditKey)} style={{...btn, flexShrink:0}}>CANCEL</button>
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
const closeEditTown = (set) => () => set('');

// ── NPC Manager: extract-from-log + edit/add/delete for npcs & companions ──────
export function NPCManager({ character, onExtractNPC, onSaveNPC, onDeleteNPC }) {
  const [exName, setExName] = useState('');
  const [exFrom, setExFrom] = useState('');
  const [exTo, setExTo]     = useState('');
  const [exComp, setExComp] = useState(false);
  const [exNote, setExNote] = useState('');
  const [busy, setBusy]     = useState(false);
  const [status, setStatus] = useState('');
  const [editKey, setEditKey] = useState('');   // '' | 'new' | 'group|name'
  const [eGroup, setEGroup] = useState('npcs');
  const [eName, setEName]   = useState('');
  const [eLoc, setELoc]     = useState('');
  const [eRel, setERel]     = useState('');
  const [eDesc, setEDesc]   = useState('');
  const [eNotes, setENotes] = useState('');
  // companion-only structured fields (prompt uses these when desc is empty)
  const [eRace, setERace]   = useState('');
  const [eRole, setERole]   = useState('');
  const [eApp, setEApp]     = useState('');
  const [ePers, setEPers]   = useState('');
  const [eStatus, setEStatus] = useState('');
  const [eTrue, setETrue]   = useState('');
  const [eAbil, setEAbil]   = useState('');

  const runExtract = async () => {
    const from = parseInt(exFrom, 10), to = parseInt(exTo, 10);
    if (Number.isNaN(from) || Number.isNaN(to)) { setStatus('✗ Enter the message # range (numbers next to messages)'); return; }
    setBusy(true); setStatus('Extracting… (reads those messages via a separate AI call)');
    try {
      const { applied } = await onExtractNPC({ name: exName, from, to, asCompanion: exComp, note: exNote });
      setStatus(applied.length ? `✓ Saved: ${applied.join(', ')}` : 'No one found in that range');
      if (applied.length) { setExName(''); setExNote(''); }
    } catch (e) { setStatus('✗ ' + e.message); }
    setBusy(false);
  };

  const openEdit = (group, n) => {
    const e = character[group]?.[n] || {};
    setEditKey(group + '|' + n); setEGroup(group); setEName(n);
    setELoc(e.location || ''); setERel(e.relationship || ''); setEDesc(e.desc || '');
    setENotes(e.notes || ''); setERace(e.race || ''); setERole(e.role || '');
    setEApp(e.appearance || ''); setEPers(e.personality || ''); setEStatus(e.status || '');
    setETrue(e.trueName || '');
    setEAbil(Array.isArray(e.abilities) ? e.abilities.join(', ') : (e.abilities || ''));
  };
  const openNew = () => {
    setEditKey('new'); setEGroup('npcs'); setEName(''); setELoc(''); setERel(''); setEDesc('');
    setENotes(''); setERace(''); setERole(''); setEApp(''); setEPers(''); setEStatus(''); setETrue(''); setEAbil('');
  };
  const closeEdit = () => setEditKey('');
  const saveEdit = () => {
    const finalName = eName.trim();
    if (!finalName) { setStatus('✗ Name required'); return; }
    const isNew = editKey === 'new';
    const [origGroup, origName] = isNew ? [eGroup, null] : editKey.split('|');
    // Carry ALL original fields (slots, tier, anything unknown) even across a
    // group move, so promoting an NPC to companion never drops data.
    const entry = { ...((!isNew && character[origGroup]?.[origName]) || {}) };
    // Set-or-remove: an emptied field is deleted, not silently kept.
    const put = (key, val) => { const v = val.trim(); if (v) entry[key] = v; else delete entry[key]; };
    put('location', eLoc); put('relationship', eRel); put('desc', eDesc); put('notes', eNotes);
    put('race', eRace); put('role', eRole); put('appearance', eApp);
    put('personality', ePers); put('status', eStatus); put('trueName', eTrue); put('abilities', eAbil);
    if (!isNew && origGroup !== eGroup) onDeleteNPC(origGroup, origName);
    onSaveNPC(eGroup, finalName, entry, (!isNew && origGroup === eGroup) ? origName : null);
    setStatus(`✓ Saved ${finalName}`); setEditKey('');
  };
  const deleteEdit = () => {
    if (editKey === 'new') { setEditKey(''); return; }
    const [g, n] = editKey.split('|');
    onDeleteNPC(g, n); setStatus(`✓ Deleted ${n}`); setEditKey('');
  };

  const npcNames  = Object.keys(character.npcs || {});
  const compNames = Object.keys(character.companions || {});

  return (
    <CollapsibleSection title="📇 NPC MANAGER" count={npcNames.length + compNames.length} defaultOpen={false}>
      {/* Extract from log */}
      <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,margin:'4px 0 4px'}}>EXTRACT FROM LOG</div>
      <input value={exName} onChange={e=>setExName(e.target.value)} placeholder="Name (blank = find everyone significant)" style={{...npcInput, marginBottom:4}}/>
      <div style={{display:'flex', gap:4, marginBottom:4}}>
        <input value={exFrom} onChange={e=>setExFrom(e.target.value)} placeholder="From #" inputMode="numeric" style={{...npcInput, flex:1}}/>
        <input value={exTo} onChange={e=>setExTo(e.target.value)} placeholder="To #" inputMode="numeric" style={{...npcInput, flex:1}}/>
      </div>
      <input value={exNote} onChange={e=>setExNote(e.target.value)}
        placeholder="What changed? (optional — e.g. 'she married Grimjaw')"
        style={{...npcInput, marginBottom:4}}/>
      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:colors.textDim,marginBottom:6,cursor:'pointer'}}>
        <input type="checkbox" checked={exComp} onChange={()=>setExComp(v=>!v)} style={{accentColor:colors.gold}}/>
        Save as companion
      </label>
      <button onClick={runExtract} disabled={busy} style={{...btn, width:'100%', opacity:busy?0.5:1}}>{busy ? '…' : '📥 EXTRACT'}</button>
      {status && <div style={{fontSize:12,color:status.startsWith('✗')?'#c96a4c':colors.goldFaint,marginTop:4,lineHeight:1.4}}>{status}</div>}

      {/* Edit / add */}
      <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,margin:'10px 0 4px'}}>EDIT ENTRIES</div>
      <div style={{display:'flex',gap:4,marginBottom:4}}>
        <select value={editKey.includes('|') ? editKey : ''} onChange={e=>{ const v=e.target.value; if (v) { const [g,n]=v.split('|'); openEdit(g,n);} }} style={{...npcInput, flex:1}}>
          <option value="">Select an entry to edit…</option>
          {npcNames.length > 0 && <optgroup label="NPCs">{npcNames.map(n=><option key={'n'+n} value={'npcs|'+n}>{n}</option>)}</optgroup>}
          {compNames.length > 0 && <optgroup label="Companions">{compNames.map(n=><option key={'c'+n} value={'companions|'+n}>{n}</option>)}</optgroup>}
        </select>
        <button onClick={openNew} style={{...btn, flexShrink:0}}>+ New</button>
      </div>

      {editKey && (
        <div style={{border:`1px solid ${colors.borderDim}`, borderRadius:4, padding:8, marginTop:2}}>
          <input value={eName} onChange={e=>setEName(e.target.value)} placeholder="Name" style={{...npcInput, marginBottom:4}}/>
          <div style={{display:'flex',gap:8,marginBottom:4,fontSize:12,color:colors.textDim}}>
            <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
              <input type="radio" checked={eGroup==='npcs'} onChange={()=>setEGroup('npcs')} style={{accentColor:colors.gold}}/> NPC
            </label>
            <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
              <input type="radio" checked={eGroup==='companions'} onChange={()=>setEGroup('companions')} style={{accentColor:colors.gold}}/> Companion
            </label>
          </div>
          {/* Location is an NPC concept only: companions travel with the player,
              anything that stays put belongs in NPCs. Showing the field for a
              companion invites setting something that is ignored. */}
          {eGroup !== 'companions' && (
            <input value={eLoc} onChange={e=>setELoc(e.target.value)} placeholder="Location (e.g. Calimport - Gem Quarter)" style={{...npcInput, marginBottom:4}}/>
          )}
          {eGroup === 'companions' && (
            <div style={{fontSize:10,color:colors.textGhost,marginBottom:4,lineHeight:1.4}}>
              Companions travel with you — no location. If it stays somewhere, make it an NPC instead.
            </div>
          )}
          <input value={eRel} onChange={e=>setERel(e.target.value)} placeholder="Relationship to the player" style={{...npcInput, marginBottom:4}}/>
          {eGroup === 'companions' && (
            <>
              <div style={{display:'flex',gap:4,marginBottom:4}}>
                <input value={eRace} onChange={e=>setERace(e.target.value)} placeholder="Race" style={{...npcInput, flex:1}}/>
                <input value={eRole} onChange={e=>setERole(e.target.value)} placeholder="Role" style={{...npcInput, flex:1}}/>
              </div>
              <input value={eApp} onChange={e=>setEApp(e.target.value)} placeholder="Appearance" style={{...npcInput, marginBottom:4}}/>
              <input value={ePers} onChange={e=>setEPers(e.target.value)} placeholder="Personality" style={{...npcInput, marginBottom:4}}/>
              <input value={eStatus} onChange={e=>setEStatus(e.target.value)} placeholder="Status (current state / condition)" style={{...npcInput, marginBottom:4}}/>
              <input value={eTrue} onChange={e=>setETrue(e.target.value)} placeholder="True name (if any)" style={{...npcInput, marginBottom:4}}/>
              <input value={eAbil} onChange={e=>setEAbil(e.target.value)} placeholder="Abilities (comma-separated)" style={{...npcInput, marginBottom:4}}/>
            </>
          )}
          <textarea value={eDesc} onChange={e=>setEDesc(e.target.value)} placeholder="Description — appearance, personality, notable facts" rows={4} style={{...npcInput, resize:'vertical', marginBottom:2}}/>
          {eGroup === 'companions' && (
            <div style={{fontSize:10,color:colors.textGhost,marginBottom:4,lineHeight:1.4}}>Every filled field is sent to the AI. Use the structured fields, the Description, or both — Description no longer replaces them.</div>
          )}
          <textarea value={eNotes} onChange={e=>setENotes(e.target.value)} placeholder="Notes (always sent alongside, e.g. behavior rules)" rows={2} style={{...npcInput, resize:'vertical', marginBottom:6}}/>
          <div style={{display:'flex',gap:4}}>
            <button onClick={saveEdit} style={{...btn, flex:1}}>✓ SAVE</button>
            {editKey !== 'new' && <button onClick={deleteEdit} style={{...btn, flex:1, color:'#c96a4c', borderColor:'#5a2a1a'}}>✕ DELETE</button>}
            <button onClick={closeEdit} style={{...btn, flexShrink:0}}>CANCEL</button>
          </div>
        </div>
      )}
    </CollapsibleSection>
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
export function CompanionSlots({ companion, name, db, character, onSlotClick, onUnequip }) {
  const slots = companion.slots || {};
  const slotDefs = companion.type === 'wolf'
    ? [{ id:'neck', label:'Collar', emoji:'📿' }, { id:'armor', label:'Barding', emoji:'🥋' }]
    : SLOTS;
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
