import { useState, useRef, useEffect } from 'react';
import { btn, panel, colors, fonts } from '../../styles/theme.js';

export function SaveModal({ onClose, generateFullSave, generateCharExport, loadFromFile, loadFromCode, loadAutoSave, onLoadFull, onLoadCharacter, autoSaveStatus }) {
  const [msg, setMsg]           = useState('');
  const [loadCode, setLoadCode] = useState('');
  const fileRef = useRef(null);
  const [browserSave,setBrowserSave] = useState({loading:true});
  useEffect(() => {
    let active=true;
    Promise.resolve().then(loadAutoSave).then(state=>{
      if(active) setBrowserSave({loading:false,state});
    }).catch(error=>{ if(active) setBrowserSave({loading:false,error:error.message}); });
    return ()=>{active=false;};
  },[autoSaveStatus?.savedAt]);

  const doFullSave = () => {
    generateFullSave();
    setMsg('✓ Save file downloaded!');
  };

  const doCharExport = () => {
    generateCharExport();
    setMsg('✓ Character exported!');
  };

  const doLoadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { notes, isFullSave } = await loadFromFile(file);
      const type = isFullSave ? 'Full save' : 'Character';
      setMsg(`✓ ${type} loaded!${notes.length ? ' (' + notes.join(', ') + ')' : ''}`);
      setTimeout(onClose, 1200);
    } catch { setMsg('✗ Invalid save file.'); }
  };

  const doLoadCode = () => {
    if (!loadCode.trim()) return;
    try {
      const { notes, isFullSave } = loadFromCode(loadCode);
      const type = isFullSave ? 'Full save' : 'Character';
      setMsg(`✓ ${type} loaded!${notes.length ? ' (' + notes.join(', ') + ')' : ''}`);
      setTimeout(onClose, 1200);
    } catch { setMsg('✗ Invalid save code.'); }
  };

  const doLoadAuto = async () => {
    try {
      const state = await loadAutoSave();
      if (!state) { setMsg('No autosave found.'); return; }
      if (state._type === 'fullsave' || state.messages) {
        onLoadFull(state.character, state.messages || [], state.storySummary || '', state.settings, state.tokenCostLog || [], state.cacheStateSnapshot || null);
      } else {
        onLoadCharacter(state.character, state.settings);
      }
      setMsg('✓ Autosave restored!');
      setTimeout(onClose, 1200);
    } catch(error) { setMsg(`✗ Failed to load autosave: ${error.message}`); }
  };

  const ta = {
    width:'100%', boxSizing:'border-box',
    background: colors.bg, border:`1px solid ${colors.border}`,
    color: colors.gold, fontFamily: fonts.mono, fontSize:9,
    padding:8, borderRadius:4, height:48, resize:'none', outline:'none',
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
      <div style={{...panel,maxWidth:460,width:'100%',display:'flex',flexDirection:'column',gap:14,margin:'auto'}}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontFamily:fonts.display,color:colors.gold,fontSize:14,letterSpacing:2}}>📜 SAVE / LOAD</span>
          <button style={{...btn(false),padding:'4px 10px'}} onClick={onClose}>✕</button>
        </div>

        {/* Save options */}
        <div>
          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textFaint,letterSpacing:2,marginBottom:6}}>SAVE</div>
          <div style={{display:'flex',gap:8}}>
            <button style={{...btn(true),flex:2}} onClick={doFullSave}>💾 Full Save</button>
            <button style={{...btn(false),flex:1}} onClick={doCharExport}>🧝 Export Character</button>
          </div>
          <div style={{fontSize:10,color:colors.textGhost,marginTop:6,lineHeight:1.5}}>
            Full save downloads a .json file with your character and story. Character export is portable — use it to start a new adventure or future game version.
          </div>
        </div>

        {/* Autosave */}
        <>
          <div style={{borderTop:`1px solid ${colors.borderDim}`,paddingTop:12}}>
            <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textFaint,letterSpacing:2,marginBottom:6}}>AUTOSAVE</div>
            <div style={{fontSize:11,color:colors.textGhost,marginBottom:6}}>
              {browserSave.loading ? 'Checking browser autosave…' : browserSave.error ? `Cannot read browser autosave: ${browserSave.error}` : browserSave.state ?
                `${browserSave.state.messages?.length || 0} messages${browserSave.state._savedAt ? ` · ${new Date(browserSave.state._savedAt).toLocaleString()}` : ' · older save, timestamp unavailable'}` : 'No browser autosave found.'}
            </div>
            {autoSaveStatus?.state==='saving' && <div role="status" style={{fontSize:11,color:colors.textGhost}}>Saving browser backup…</div>}
            {autoSaveStatus?.state==='error' && <div role="alert" style={{fontSize:11,color:'#e8947b',marginBottom:6}}>{autoSaveStatus.message}</div>}
            <button disabled={!browserSave.state || browserSave.loading} style={{...btn(false),width:'100%',opacity:browserSave.state?1:0.5}} onClick={doLoadAuto}>⚡ Restore Autosave</button>
          </div>
        </>

        {/* Load from file */}
        <div style={{borderTop:`1px solid ${colors.borderDim}`,paddingTop:12}}>
          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textFaint,letterSpacing:2,marginBottom:6}}>LOAD</div>
          <input ref={fileRef} type="file" accept=".json" onChange={doLoadFile} style={{display:'none'}}/>
          <button style={{...btn(true),width:'100%',marginBottom:8}} onClick={()=>fileRef.current?.click()}>
            📂 Load from File (.json)
          </button>

          {/* Paste raw save JSON (alternative to file load) */}
          <div style={{fontFamily:fonts.display,fontSize:9,color:colors.textGhost,letterSpacing:2,marginBottom:4}}>OR PASTE SAVE JSON</div>
          <textarea value={loadCode} onChange={e=>setLoadCode(e.target.value)} placeholder="Paste the contents of a .json save file here..." style={{...ta,color:colors.text}}/>
          <button style={{...btn(false),width:'100%',marginTop:6,opacity:loadCode.trim()?1:0.4}} disabled={!loadCode.trim()} onClick={doLoadCode}>
            Load from Pasted JSON →
          </button>
        </div>

        {msg && <div style={{textAlign:'center',fontSize:12,color:msg.startsWith('✓')?colors.green:colors.red,fontFamily:fonts.display}}>{msg}</div>}
      </div>
    </div>
  );
}

