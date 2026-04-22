import { useState } from 'react';
import { btn, panel, colors, fonts } from '../../styles/theme.js';

export function SaveModal({ onClose, generateFullSave, generateCharExport, loadFromCode }) {
  const [saveCode,     setSaveCode]     = useState('');
  const [charCode,     setCharCode]     = useState('');
  const [loadInput,    setLoadInput]    = useState('');
  const [msg,          setMsg]          = useState('');

  const ta = {
    width:'100%', boxSizing:'border-box',
    background: colors.bg, border:`1px solid ${colors.border}`,
    color: colors.gold, fontFamily: fonts.mono, fontSize:9,
    padding:8, borderRadius:4, height:56, resize:'none', outline:'none',
  };

  const doFullSave = () => {
    const code = generateFullSave();
    setSaveCode(code); setCharCode(''); setMsg('');
  };
  const doCharExport = () => {
    const code = generateCharExport();
    setCharCode(code); setSaveCode(''); setMsg('');
  };
  const doCopy = (code) => {
    navigator.clipboard.writeText(code)
      .then(() => setMsg('✓ Copied!'))
      .catch(() => setMsg('Select text above and copy manually.'));
  };
  const doLoad = () => {
    try {
      const { notes, isFullSave } = loadFromCode(loadInput);
      const type = isFullSave ? 'Full save' : 'Character';
      setMsg(`✓ ${type} loaded!${notes.length ? ' (' + notes.join(', ') + ')' : ''}`);
      setTimeout(onClose, 1200);
    } catch (e) {
      setMsg('✗ Invalid save code. Please try again.');
    }
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
      <div style={{...panel,maxWidth:460,width:'100%',display:'flex',flexDirection:'column',gap:14,margin:'auto'}}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontFamily:fonts.display,color:colors.gold,fontSize:14,letterSpacing:2}}>📜 SAVE / LOAD</span>
          <button style={{...btn(false),padding:'4px 10px'}} onClick={onClose}>✕</button>
        </div>

        {/* Full save */}
        <div>
          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textFaint,letterSpacing:2,marginBottom:6}}>FULL SAVE — character + story</div>
          <button style={{...btn(true),width:'100%',marginBottom:6}} onClick={doFullSave}>⚡ Generate Full Save</button>
          {saveCode && <>
            <textarea readOnly value={saveCode} onClick={e=>e.target.select()} style={{...ta,color:colors.gold}}/>
            <button style={{...btn(false),width:'100%',marginTop:4,fontSize:11}} onClick={()=>doCopy(saveCode)}>📋 Copy Full Save</button>
          </>}
        </div>

        {/* Character export */}
        <div style={{borderTop:`1px solid ${colors.borderDim}`,paddingTop:12}}>
          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textFaint,letterSpacing:2,marginBottom:4}}>CHARACTER EXPORT — portable character sheet</div>
          <div style={{fontSize:11,color:colors.textGhost,marginBottom:6,lineHeight:1.5}}>Carries your character into a new adventure or future version of the game.</div>
          <button style={{...btn(false),width:'100%',marginBottom:6}} onClick={doCharExport}>🧝 Export Character Sheet</button>
          {charCode && <>
            <textarea readOnly value={charCode} onClick={e=>e.target.select()} style={{...ta,color:colors.textFaint}}/>
            <button style={{...btn(false),width:'100%',marginTop:4,fontSize:11}} onClick={()=>doCopy(charCode)}>📋 Copy Character Export</button>
          </>}
        </div>

        {/* Load */}
        <div style={{borderTop:`1px solid ${colors.borderDim}`,paddingTop:12}}>
          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textFaint,letterSpacing:2,marginBottom:4}}>LOAD — paste any save or character export</div>
          <div style={{fontSize:11,color:colors.textGhost,marginBottom:6,lineHeight:1.5}}>Old saves are automatically migrated to the current version.</div>
          <textarea value={loadInput} onChange={e=>setLoadInput(e.target.value)} placeholder="Paste save code here..."
            style={{...ta,color:colors.text}}/>
          <button style={{...btn(true),width:'100%',marginTop:8,opacity:loadInput.trim()?1:0.4}} disabled={!loadInput.trim()} onClick={doLoad}>
            Load →
          </button>
        </div>

        {msg && <div style={{textAlign:'center',fontSize:12,color:msg.startsWith('✓')?colors.green:colors.red,fontFamily:fonts.display}}>{msg}</div>}
      </div>
    </div>
  );
}
