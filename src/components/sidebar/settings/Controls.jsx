import { useRef, useState } from 'react';
import { colors, fonts, btn } from '../../../styles/theme.js';
import { CollapsibleSection, npcInput } from '../common/index.jsx';
import {
  clearPersistentOpenAiMap,
  getPersistentOpenAiMap,
  setPersistentOpenAiMap,
} from '../../../helpers/openai/pendingImage.js';
import { clearPersistentXaiMap, setPersistentXaiMap } from '../../../helpers/xai/pendingImage.js';

export function CampaignMapSettings() {
  const [campaignMap, setCampaignMap] = useState(() => getPersistentOpenAiMap());
  const fileRef = useRef(null);

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type?.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('That image is over 10 MB. Crop or resize it and try again.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const next = { name: file.name || 'campaign map', dataUrl };
      setCampaignMap(next);
      setPersistentOpenAiMap(next);
      setPersistentXaiMap(next);
    };
    reader.readAsDataURL(file);
  };

  const clearMap = () => {
    // Deliberately require confirmation here. A persistent map can represent a
    // large, annoying-to-find reference image and should not disappear to a
    // stray thumb tap on mobile.
    if (!window.confirm('Clear the persistent campaign map?')) return;
    setCampaignMap(null);
    clearPersistentOpenAiMap();
    clearPersistentXaiMap();
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <CollapsibleSection title="🗺️ CAMPAIGN MAP" count={campaignMap ? 'ACTIVE' : undefined} defaultOpen={false}>
      <div style={{fontSize:10,color:colors.textFaint,marginBottom:7,lineHeight:1.45}}>
        Persistent visual reference for GPT Terra / Sol and Grok. The map is sent before changing conversation history so its visual context can benefit from prompt caching. It is not written into campaign saves or summaries.
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handlePick} style={{display:'none'}} />
      {campaignMap ? (
        <>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:7,border:`1px solid ${colors.borderDim}`,borderRadius:4,background:'rgba(201,168,76,0.05)',marginBottom:7}}>
            <img src={campaignMap.dataUrl} alt="Campaign map" style={{width:64,height:48,objectFit:'cover',borderRadius:3,border:`1px solid ${colors.borderDim}`}} />
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:10,color:colors.gold,fontFamily:fonts.display,letterSpacing:1}}>ACTIVE / CACHED</div>
              <div style={{fontSize:10,color:colors.textGhost,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{campaignMap.name}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>fileRef.current?.click()} style={{...btn(false),flex:1,fontSize:10,padding:'5px 0'}}>🗺️ Replace Map</button>
            <button onClick={clearMap} style={{...btn(false),flex:1,fontSize:10,padding:'5px 0',color:'#c96a4c'}}>✕ Clear Map</button>
          </div>
        </>
      ) : (
        <button onClick={()=>fileRef.current?.click()} style={{...btn(false),width:'100%',fontSize:11,padding:'6px 0'}}>🗺️ Set Campaign Map</button>
      )}
    </CollapsibleSection>
  );
}

// ── Voice settings: pick an installed TTS voice + speaking speed ──────────────
export function VoiceSettings({ voiceName, setVoiceName, rate, setRate, pitch, setPitch, pronounce, setPronounce, availableVoices, preview }) {
  const nameCounts = {};
  availableVoices.forEach(v => { nameCounts[v.name] = (nameCounts[v.name] || 0) + 1; });
  const seen = {};
  const labelFor = (v) => {
    seen[v.name] = (seen[v.name] || 0) + 1;
    const numbered = nameCounts[v.name] > 1 ? `${v.name} ${seen[v.name]}` : v.name;
    return numbered + (v.localService === false ? ' (online)' : '');
  };
  const [open, setOpen] = useState(false);
  return (
    <>
      <div style={{marginBottom:8}}>
        <button onClick={()=>setOpen(o=>!o)} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0'}}>
          🔊 Voice {open ? '▲' : '▼'}
        </button>
        {open && (
          <div style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:8,marginTop:4}}>
            <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:3}}>VOICE</div>
            <select value={voiceName} onChange={e=>setVoiceName(e.target.value)}
              style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:12,padding:'5px 8px',borderRadius:4,outline:'none',marginBottom:8}}>
              <option value="">Auto (system default)</option>
              {availableVoices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{labelFor(v)}</option>)}
            </select>
            <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:3}}>SPEED — {rate.toFixed(2)}×</div>
            <input type="range" min="0.5" max="1.5" step="0.05" value={rate}
              onChange={e=>setRate(parseFloat(e.target.value))}
              style={{width:'100%',accentColor:colors.gold,marginBottom:8}}/>
            <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:3}}>PITCH — {pitch.toFixed(2)}</div>
            <input type="range" min="0.5" max="1.5" step="0.05" value={pitch}
              onChange={e=>setPitch(parseFloat(e.target.value))}
              style={{width:'100%',accentColor:colors.gold,marginBottom:8}}/>
            <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:3}}>PRONUNCIATION</div>
            <textarea value={pronounce || ''} onChange={e=>setPronounce(e.target.value)} rows={3}
              placeholder={"One per line — word: how to say it\nSseth'karix: Seth ka rix\nVyn: Vinn"}
              style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:11,padding:'5px 8px',borderRadius:4,outline:'none',resize:'vertical',marginBottom:8,lineHeight:1.4}}/>
            <button onClick={preview} style={{...btn(false),width:'100%',fontSize:11,padding:'4px 0'}}>▶ Preview</button>
            {availableVoices.length === 0 && (
              <div style={{fontSize:10,color:colors.textGhost,marginTop:6,lineHeight:1.4}}>No voices detected yet — they load a moment after the page. To add better ones, install a TTS engine in your device's accessibility settings.</div>
            )}
          </div>
        )}
      </div>
      <CampaignMapSettings />
    </>
  );
}

// ── Disposition: who the character actually is, so the DM stops assuming heroism ──
export function DispositionEditor({ disposition, onSaveDisposition }) {
  const [d, setD] = useState(disposition || {});
  const [dirty, setDirty] = useState(false);
  const set = (k, v) => { setD(prev => ({ ...prev, [k]: v })); setDirty(true); };
  const FIELDS = [
    ['alignment',   'Alignment',                'e.g. Neutral Evil'],
    ['cares',       'Cares about',              'profit, power, his own survival, the few people he has claimed'],
    ['indifferent', 'Indifferent to',           'slavery, law, strangers suffering, his reputation among the righteous'],
    ['methods',     'How they solve problems',  'violence when cheaper than talking; deception; buying people'],
    ['lines',       'Lines they will not cross','will not harm those under his protection'],
  ];
  return (
    <CollapsibleSection title="🎭 DISPOSITION" defaultOpen={false}>
      <div style={{fontSize:10,color:colors.textFaint,marginBottom:6,lineHeight:1.4}}>
        Sent every turn. The DM assumes heroism unless told otherwise — <b>Indifferent to</b> is what stops NPCs appealing to things your character does not care about.
      </div>
      {FIELDS.map(([k, label, ph]) => (
        <div key={k} style={{marginBottom:5}}>
          <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:2}}>{label.toUpperCase()}</div>
          <textarea value={d[k] || ''} onChange={e=>set(k, e.target.value)} placeholder={ph} rows={k==='alignment'?1:2}
            style={{...npcInput, resize:'vertical', lineHeight:1.4}}/>
        </div>
      ))}
      <button onClick={()=>{ onSaveDisposition(d); setDirty(false); }} disabled={!dirty}
        style={{...btn, width:'100%', opacity:dirty?1:0.4}}>{dirty ? '✓ SAVE DISPOSITION' : 'SAVED'}</button>
    </CollapsibleSection>
  );
}

// ── Arc objectives: the authoritative record of a multi-part hunt ─────────────
export function ObjectivesPanel({ arcObjectives, arcGoal, onSetArcGoal, onGenerateObjectives, onSetObjectives }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [adding, setAdding] = useState('');
  const objs = arcObjectives || [];
  const done = objs.filter(o => o.done).length;
  const liveIdx = objs.findIndex(o => !o.done);

  const regen = async () => {
    setBusy(true); setStatus('Building the campaign…');
    try { const list = await onGenerateObjectives(); setStatus(`✓ ${list.length} objectives`); }
    catch (e) { setStatus('✗ ' + e.message); }
    setBusy(false);
  };
  const toggle = (i) => onSetObjectives(objs.map((o, j) => j === i ? { ...o, done: !o.done } : o));
  const remove = (i) => onSetObjectives(objs.filter((_, j) => j !== i));
  const edit = (i, text) => onSetObjectives(objs.map((o, j) => j === i ? { ...o, text } : o));
  const add = () => { const t = adding.trim(); if (!t) return; onSetObjectives([...objs, { text: t, done: false }]); setAdding(''); };

  return (
    <CollapsibleSection title="🗺️ ARC OBJECTIVES" count={objs.length ? `${done}/${objs.length}` : undefined} defaultOpen={false}>
      <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
        One objective runs at a time; the DM writes the next when the last is finished. The GOAL holds the arc's endpoint and its count, so a long hunt can't lose track. The DM never announces any of this — look here when a story feels off the rails.
      </div>
      <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:2}}>GOAL</div>
      <textarea value={arcGoal || ''} onChange={e=>onSetArcGoal(e.target.value)} rows={2}
        placeholder="What finishing this arc means — include any count, e.g. 'recover all twelve vault objects'"
        style={{...npcInput, resize:'vertical', marginBottom:6, lineHeight:1.4}}/>
      {objs.length === 0 && <div style={{fontSize:12,color:colors.textDead,fontStyle:'italic',marginBottom:6}}>No objectives — generate a campaign for the current antagonist.</div>}
      {objs.map((o, i) => (
        <div key={i} style={{display:'flex',alignItems:'flex-start',gap:6,padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`,
          background: i === liveIdx ? 'rgba(201,168,76,0.06)' : 'transparent'}}>
          <input type="checkbox" checked={!!o.done} onChange={()=>toggle(i)} style={{accentColor:colors.gold,marginTop:3,flexShrink:0,cursor:'pointer'}}/>
          <textarea value={o.text} onChange={e=>edit(i, e.target.value)} rows={2}
            style={{...npcInput, flex:1, minWidth:0, resize:'vertical', fontSize:12, lineHeight:1.4,
              color:o.done?colors.textDead:colors.text, textDecoration:o.done?'line-through':'none'}}/>
          <button onClick={()=>remove(i)} title="Remove" style={{...btn, flexShrink:0, fontSize:10, padding:'2px 6px', color:'#c96a4c'}}>✕</button>
        </div>
      ))}
      <div style={{display:'flex',gap:4,marginTop:6}}>
        <input value={adding} onChange={e=>setAdding(e.target.value)} placeholder="Add an objective…"
          onKeyDown={e=>{ if (e.key==='Enter') add(); }} style={{...npcInput, flex:1}}/>
        <button onClick={add} style={{...btn, flexShrink:0}}>+</button>
      </div>
      <button onClick={regen} disabled={busy} style={{...btn, width:'100%', marginTop:6, opacity:busy?0.5:1}}>
        {busy ? '…' : (objs.length || arcGoal ? '🎲 REGENERATE ARC GOAL' : '🎲 GENERATE ARC GOAL')}
      </button>
      {status && <div style={{fontSize:12,color:status.startsWith('✗')?'#c96a4c':colors.goldFaint,marginTop:4,lineHeight:1.4}}>{status}</div>}
    </CollapsibleSection>
  );
}

// ── Standing instructions: always-sent DM directives (moved from the header) ──
export function DirectivesEditor({ directives, onChangeDirectives }) {
  return (
    <CollapsibleSection title="📌 STANDING INSTRUCTIONS" defaultOpen={false}>
      <div style={{fontSize:10,color:colors.textFaint,marginBottom:6,lineHeight:1.4}}>Sent to the DM every turn — lasting directions that should not be forgotten. Leave blank for none.</div>
      <textarea
        value={directives}
        onChange={e => onChangeDirectives(e.target.value)}
        placeholder={'e.g. The current journey should play out as its own arc — give it encounters and events along the way, not a single skip.'}
        rows={4}
        style={{...npcInput, resize:'vertical', lineHeight:1.5}}
      />
    </CollapsibleSection>
  );
}

// ── Debug log viewer (moved from the header) ──────────────────────────────────
export function DebugViewer({ debugLog, debugStatus, onExportDebug, onCopyDebug }) {
  return (
    <CollapsibleSection title="🐛 DEBUG LOG" count={debugLog?.length || 0} defaultOpen={false}>
      <div style={{fontFamily:'monospace',fontSize:9,color:'#7fc97f',maxHeight:220,overflowY:'auto'}}>
        {debugStatus && <div style={{color:'#c9a84c',marginBottom:4}}>{debugStatus}</div>}
        {(debugLog||[]).map((entry, i) => <div key={i} style={{borderBottom:'1px solid #1a1208',paddingBottom:2,marginBottom:2,wordBreak:'break-all'}}>{entry}</div>)}
        {(!debugLog || debugLog.length === 0) && <div style={{color:'#4a3a20'}}>no logs yet</div>}
      </div>
      {debugLog?.length > 0 && (onExportDebug || onCopyDebug) && (
        <div style={{display:'flex',gap:4,marginTop:6}}>
          {onCopyDebug && <button onClick={onCopyDebug} style={{...btn, flex:1, fontSize:10}}>⧉ Copy</button>}
          {onExportDebug && <button onClick={onExportDebug} style={{...btn, flex:1, fontSize:10}}>⬇ Download .txt</button>}
        </div>
      )}
    </CollapsibleSection>
  );
}

// ── Crafting: pick materials, ask what they could become, confirm, create ─────
// Panel state lives outside React so a proposal survives switching tabs or
// collapsing the section — both of which unmount the component. Cleared only by
// the reset button, a completed craft, or loading a save.
//
// The SELECTION is additionally persisted to localStorage, because picking out
// a hundred materials is real work and losing it to a page reload — a deploy, a
// stray refresh, a phone dropping the tab — is infuriating. Proposals are not
// persisted: they are cheap to regenerate and go stale.