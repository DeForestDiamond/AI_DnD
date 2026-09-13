import { colors, fonts, btn } from '../../../styles/theme.js';
import { CollapsibleSection } from '../common/index.jsx';

const fmt = n => Number(n || 0).toLocaleString();
const money = n => `$${Number(n || 0).toFixed(Number(n || 0) < 0.01 ? 4 : 3)}`;

export function TokenCostViewer({ entries=[] }) {
  const totalCost = entries.reduce((s,e)=>s+(Number(e.cost)||0),0);
  const totalInput = entries.reduce((s,e)=>s+(Number(e.inputTokens)||0),0);
  const totalOutput = entries.reduce((s,e)=>s+(Number(e.outputTokens)||0),0);
  const totalCached = entries.reduce((s,e)=>s+(Number(e.cachedTokens)||0),0);

  const download = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `token-cost-log-${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <CollapsibleSection title="📊 TOKEN & COST LOG" count={entries.length || 0} defaultOpen={false}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:8,fontFamily:fonts.mono,fontSize:10}}>
        <div style={{color:colors.textFaint}}>COST <span style={{color:colors.gold}}>{money(totalCost)}</span></div>
        <div style={{color:colors.textFaint}}>CALLS <span style={{color:colors.gold}}>{fmt(entries.length)}</span></div>
        <div style={{color:colors.textFaint}}>INPUT <span style={{color:colors.gold}}>{fmt(totalInput)}</span></div>
        <div style={{color:colors.textFaint}}>CACHED <span style={{color:colors.gold}}>{fmt(totalCached)}</span></div>
        <div style={{color:colors.textFaint}}>OUTPUT <span style={{color:colors.gold}}>{fmt(totalOutput)}</span></div>
      </div>
      <div style={{maxHeight:330,overflowY:'auto',fontFamily:fonts.mono,fontSize:9}}>
        {[...entries].reverse().map(e => {
          const pct = e.inputTokens ? Math.round((e.cachedTokens || 0) / e.inputTokens * 100) : 0;
          return <div key={e.id} style={{padding:'6px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,color:colors.goldFaint}}>
              <span>{new Date(e.timestamp).toLocaleTimeString()} · {e.model} · {(e.requestType||'request').toUpperCase()}</span>
              <span>{money(e.cost)}</span>
            </div>
            <div style={{color:colors.textGhost,lineHeight:1.45}}>
              in {fmt(e.inputTokens)} · cached {fmt(e.cachedTokens)} ({pct}%) · fresh {fmt(e.freshTokens)} · out {fmt(e.outputTokens)}{e.reasoningTokens ? ` · reasoning ${fmt(e.reasoningTokens)}` : ''}
            </div>
            {e.cacheSensitiveChanges?.length > 0 && <div style={{marginTop:3,color:'#c99b63',lineHeight:1.4}}>
              cache-sensitive changes: {e.cacheSensitiveChanges.map((c,i)=><div key={i}>• {c.section}: {c.action}{c.detail ? ` — ${c.detail}` : ''}</div>)}
            </div>}
          </div>;
        })}
        {entries.length===0 && <div style={{color:colors.textDead}}>No billed requests logged yet.</div>}
      </div>
      {entries.length>0 && <button onClick={download} style={{...btn(false),width:'100%',fontSize:10,marginTop:7}}>⬇ Download JSON</button>}
    </CollapsibleSection>
  );
}
