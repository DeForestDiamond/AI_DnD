import { useState } from 'react';
import { btn, colors } from '../../../styles/theme.js';
import { CollapsibleSection } from '../common/index.jsx';
import { capturedInputTokens, exportDMRequest, formatDMRequest } from '../../../helpers/debug/dmRequestCapture.js';

export function PromptRequestViewer({ requests = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const [notice, setNotice] = useState('');
  const selected = requests.find(r=>r.id===selectedId) || requests[requests.length - 1];
  const download = (json) => {
    const text = json ? JSON.stringify(exportDMRequest(selected), null, 2) : formatDMRequest(selected);
    const url = URL.createObjectURL(new Blob([text], {type:json?'application/json':'text/plain'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = `dm-request-${selected.at.replace(/[:.]/g,'-')}.${json?'json':'txt'}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(formatDMRequest(selected)); setNotice('Full request copied.'); }
    catch { setNotice('Copy unavailable. Use Download instead.'); }
  };
  const actual = capturedInputTokens(selected);
  return <CollapsibleSection title="📨 AI REQUEST / PROMPT" count={requests.length} defaultOpen={false}>
    <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5,marginBottom:8}}>Captures the last 3 DM requests this session, including openings, roll follow-ups, maps and images. Download before reloading. API headers and keys are excluded.</div>
    {!selected ? <div style={{fontSize:11,color:colors.textGhost}}>Send a message or start an adventure to capture a request.</div> : <>
      <label style={{display:'block',fontSize:11,color:colors.gold}}>Request
        <select value={selected.id} onChange={e=>{setSelectedId(Number(e.target.value));setNotice('');}} style={{width:'100%',marginTop:5,background:colors.bg,color:colors.textDim,border:`1px solid ${colors.border}`,padding:8}}>
          {[...requests].reverse().map(r=><option key={r.id} value={r.id}>{new Date(r.at).toLocaleTimeString()} · {r.model} · {r.status}</option>)}
        </select>
      </label>
      <div style={{fontSize:11,color:colors.textDim,margin:'10px 0'}}>Input tokens reported by provider: <strong>{actual == null ? 'pending / unavailable' : actual.toLocaleString()}</strong><br />{selected.breakdown.characters.toLocaleString()} text characters · {selected.breakdown.images} image(s)</div>
      <div style={{fontSize:10,color:colors.textGhost,marginBottom:8}}>{selected.breakdown.estimateNote}</div>
      <div style={{maxHeight:220,overflowY:'auto'}}>
        <table style={{width:'100%',fontSize:10,color:colors.textDim,borderCollapse:'collapse'}}>
          <thead><tr><th scope="col" style={{textAlign:'left'}}>Section</th><th scope="col">Characters</th><th scope="col">~Text tokens</th></tr></thead>
          <tbody>{selected.breakdown.sections.map((s,i)=><tr key={i}><td style={{padding:'4px 0'}}>{s.label}</td><td style={{textAlign:'right'}}>{s.characters.toLocaleString()}</td><td style={{textAlign:'right'}}>{s.estimatedTextTokens.toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
        <button onClick={()=>download(false)} style={{...btn(false),flex:1,fontSize:11}}>⬇ Full prompt .txt</button>
        <button onClick={()=>download(true)} style={{...btn(false),flex:1,fontSize:11}}>⬇ Request .json</button>
        <button onClick={copy} style={{...btn(false),flex:1,fontSize:11}}>⧉ Copy</button>
      </div>
      {notice && <div role="status" style={{fontSize:11,color:colors.textFaint,marginTop:6}}>{notice}</div>}
    </>}
  </CollapsibleSection>;
}
