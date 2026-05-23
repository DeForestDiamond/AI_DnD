import { useState, useRef } from 'react';
import { btn, panel, colors, fonts } from '../../styles/theme.js';

export function SaveModal({ onClose, generateFullSave, generateCharExport, loadFromFile, loadFromCode, hasAutoSave, loadAutoSave, onLoadFull, onLoadCharacter }) {
  const [msg, setMsg]           = useState('');
  const [loadCode, setLoadCode] = useState('');
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef(null);

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

  const doLoadAuto = () => {
    try {
      const state = loadAutoSave();
      if (!state) { setMsg('No autosave found.'); return; }
      if (state._type === 'fullsave' || state.messages) {
        onLoadFull(state.character, state.messages || [], state.storySummary || '');
      } else {
        onLoadCharacter(state.character);
      }
      setMsg('✓ Autosave restored!');
      setTimeout(onClose, 1200);
    } catch { setMsg('✗ Failed to load autosave.'); }
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
        {hasAutoSave() && (
          <div style={{borderTop:`1px solid ${colors.borderDim}`,paddingTop:12}}>
            <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textFaint,letterSpacing:2,marginBottom:6}}>AUTOSAVE</div>
            <div style={{fontSize:11,color:colors.textGhost,marginBottom:6}}>A browser autosave exists from your last session.</div>
            <button style={{...btn(false),width:'100%'}} onClick={doLoadAuto}>⚡ Restore Autosave</button>
          </div>
        )}

        {/* Load from file */}
        <div style={{borderTop:`1px solid ${colors.borderDim}`,paddingTop:12}}>
          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textFaint,letterSpacing:2,marginBottom:6}}>LOAD</div>
          <input ref={fileRef} type="file" accept=".json" onChange={doLoadFile} style={{display:'none'}}/>
          <button style={{...btn(true),width:'100%',marginBottom:8}} onClick={()=>fileRef.current?.click()}>
            📂 Load from File (.json)
          </button>

          {/* Legacy code support */}
          <div style={{fontFamily:fonts.display,fontSize:9,color:colors.textGhost,letterSpacing:2,marginBottom:4}}>OR PASTE OLD SAVE CODE</div>
          <textarea value={loadCode} onChange={e=>setLoadCode(e.target.value)} placeholder="Paste legacy base64 save code here..." style={{...ta,color:colors.text}}/>
          <button style={{...btn(false),width:'100%',marginTop:6,opacity:loadCode.trim()?1:0.4}} disabled={!loadCode.trim()} onClick={doLoadCode}>
            Load from Code →
          </button>
        </div>

        {msg && <div style={{textAlign:'center',fontSize:12,color:msg.startsWith('✓')?colors.green:colors.red,fontFamily:fonts.display}}>{msg}</div>}
      </div>
    </div>
  );
}
