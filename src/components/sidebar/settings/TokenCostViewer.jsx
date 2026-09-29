import { useEffect, useMemo, useState } from 'react';
import { colors, fonts, btn } from '../../../styles/theme.js';
import { MODEL_CONFIGS } from '../../../hooks/useGame.js';
import { CollapsibleSection } from '../common/index.jsx';

const fmt = n => Number(n || 0).toLocaleString();
const money = n => `$${Number(n || 0).toFixed(Number(n || 0) < 0.01 ? 4 : 3)}`;
const STORAGE_KEY = 'ai-dnd-token-cost-log-v1';
const MAX_ENTRIES = 5000;
const GROK43_REASONING_KEY = 'ai-dnd-grok43-reasoning-v1';
const GROK43_REASONING_LEVELS = ['none', 'low', 'medium', 'high'];

const loadGrok43Reasoning = () => {
  if (typeof window === 'undefined') return 'low';
  try {
    const saved = window.localStorage?.getItem(GROK43_REASONING_KEY);
    return GROK43_REASONING_LEVELS.includes(saved) ? saved : 'low';
  } catch { return 'low'; }
};

// Restore the saved effort as soon as this module loads. The actual select also
// re-reads localStorage on every mount so closing/reopening Settings cannot reset
// a choice made earlier in the session.
if (MODEL_CONFIGS?.grok) MODEL_CONFIGS.grok.reasoning_effort = loadGrok43Reasoning();

const loadStored = () => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_ENTRIES) : [];
  } catch { return []; }
};

const mergeEntries = (older, newer) => {
  const byId = new Map();
  [...(older || []), ...(newer || [])].forEach(e => {
    if (e?.id) byId.set(e.id, e);
  });
  return [...byId.values()].sort((a,b)=>(a.timestamp||0)-(b.timestamp||0)).slice(-MAX_ENTRIES);
};

export function TokenCostViewer({ entries=[] }) {
  const [storedEntries, setStoredEntries] = useState(loadStored);
  const [grok43Reasoning, setGrok43Reasoning] = useState(loadGrok43Reasoning);
  const allEntries = useMemo(() => mergeEntries(storedEntries, entries), [storedEntries, entries]);

  // The telemetry log has its own browser persistence instead of depending on a
  // campaign autosave. This survives reloads/deploys and keeps up to 5,000 calls.
  useEffect(() => {
    const merged = mergeEntries(storedEntries, entries);
    const changed = merged.length !== storedEntries.length || merged.some((e,i) => e.id !== storedEntries[i]?.id);
    if (!changed) return;
    setStoredEntries(merged);
    try { window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (err) {
      console.warn('[TOKEN LOG] Could not persist telemetry:', err);
    }
  }, [entries, storedEntries]);

  const changeGrok43Reasoning = (effort) => {
    if (!GROK43_REASONING_LEVELS.includes(effort)) return;
    // Write synchronously with the UI event. Settings/TokenCostViewer can unmount
    // immediately after this click, so persistence must not depend on an effect.
    if (MODEL_CONFIGS?.grok) MODEL_CONFIGS.grok.reasoning_effort = effort;
    try { window.localStorage?.setItem(GROK43_REASONING_KEY, effort); } catch (err) {
      console.warn('[GROK 4.3] Could not persist reasoning effort:', err);
    }
    setGrok43Reasoning(effort);
  };

  const totalCost = allEntries.reduce((s,e)=>s+(Number(e.cost)||0),0);
  const totalInput = allEntries.reduce((s,e)=>s+(Number(e.inputTokens)||0),0);
  const totalOutput = allEntries.reduce((s,e)=>s+(Number(e.outputTokens)||0),0);
  const totalCached = allEntries.reduce((s,e)=>s+(Number(e.cachedTokens)||0),0);

  const download = () => {
    const blob = new Blob([JSON.stringify(allEntries, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `token-cost-log-${Date.now()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <CollapsibleSection title="📊 TOKEN & COST LOG" count={allEntries.length || 0} defaultOpen={false}>
      <div style={{marginBottom:9,padding:'7px 8px',border:`1px solid ${colors.borderDim}`,borderRadius:4,background:'rgba(0,0,0,0.2)'}}>
        <div style={{fontSize:9,color:colors.textGhost,letterSpacing:0.7,marginBottom:4}}>GROK 4.3 REASONING</div>
        <select value={grok43Reasoning} onChange={e=>changeGrok43Reasoning(e.target.value)}
          style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:11,padding:'5px 6px',borderRadius:3,outline:'none',cursor:'pointer'}}>
          <option value="none">None</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <div style={{fontSize:8,color:colors.textDead,lineHeight:1.35,marginTop:4}}>Applies to Grok 4.3 DM calls immediately · saved in this browser · default Low</div>
      </div>
      <div style={{fontSize:9,color:colors.textDead,marginBottom:6,lineHeight:1.4}}>Autosaved in this browser · keeps the latest {fmt(MAX_ENTRIES)} requests</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:8,fontFamily:fonts.mono,fontSize:10}}>
        <div style={{color:colors.textFaint}}>COST <span style={{color:colors.gold}}>{money(totalCost)}</span></div>
        <div style={{color:colors.textFaint}}>CALLS <span style={{color:colors.gold}}>{fmt(allEntries.length)}</span></div>
        <div style={{color:colors.textFaint}}>INPUT <span style={{color:colors.gold}}>{fmt(totalInput)}</span></div>
        <div style={{color:colors.textFaint}}>CACHED <span style={{color:colors.gold}}>{fmt(totalCached)}</span></div>
        <div style={{color:colors.textFaint}}>OUTPUT <span style={{color:colors.gold}}>{fmt(totalOutput)}</span></div>
      </div>
      <div style={{maxHeight:430,overflowY:'auto',fontFamily:fonts.mono,fontSize:9}}>
        {[...allEntries].reverse().map(e => {
          const pct = e.inputTokens ? Math.round((e.cachedTokens || 0) / e.inputTokens * 100) : 0;
          const diag = e.cacheDiagnostic;
          const b = diag?.boundary;
          return <div key={e.id} style={{padding:'6px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,color:colors.goldFaint}}>
              <span>{new Date(e.timestamp).toLocaleTimeString()} · {e.model} · {(e.requestType||'request').toUpperCase()}</span>
              <span>{money(e.cost)}</span>
            </div>
            <div style={{color:colors.textGhost,lineHeight:1.45}}>
              in {fmt(e.inputTokens)} · cached {fmt(e.cachedTokens)} ({pct}%) · write {fmt(e.cacheWriteTokens)} · fresh {fmt(e.freshTokens)} · out {fmt(e.outputTokens)}{e.reasoningTokens ? ` · reasoning ${fmt(e.reasoningTokens)}` : ''}
            </div>
            {diag && <details style={{marginTop:4,color:colors.textGhost}}>
              <summary style={{cursor:'pointer',color:'#b79a67'}}>
                cache map ≈ {b?.section || 'unknown'}{b?.sectionEstimatedTokens ? ` (${fmt(b.estimatedTokensIntoSection)}/${fmt(b.sectionEstimatedTokens)} est. tokens)` : ''}
              </summary>
              <div style={{marginTop:4,paddingLeft:7,borderLeft:`1px solid ${colors.borderFaint}`,lineHeight:1.5}}>
                {diag.sections?.map(s => <div key={s.key}>
                  <span style={{color:s.cacheState==='cached'?'#9eae79':s.cacheState==='partial'?'#d2a55e':colors.textDead}}>
                    {s.cacheState==='cached'?'✓':s.cacheState==='partial'?'◐':'○'}
                  </span>{' '}
                  {s.label}: ~{fmt(s.estimatedTokens)} tokens · ~{fmt(s.chars)} chars
                  {s.cacheState==='partial' ? ` · ~${fmt(s.cachedInSection)} cached` : ''}
                </div>)}
                <div style={{marginTop:4,color:colors.textDead}}>
                  ≈ estimated section attribution. Provider cache/token totals above are exact; named-section boundaries are inferred from recorded prompt sizes.
                </div>
                {diag.limitations?.[1] && <div style={{color:colors.textDead}}>{diag.limitations[1]}</div>}
              </div>
            </details>}
            {e.cacheSensitiveChanges?.length > 0 && <div style={{marginTop:3,color:'#c99b63',lineHeight:1.4}}>
              cache-sensitive changes: {e.cacheSensitiveChanges.map((c,i)=><div key={i}>• {c.section}: {c.action}{c.detail ? ` — ${c.detail}` : ''}</div>)}
            </div>}
          </div>;
        })}
        {allEntries.length===0 && <div style={{color:colors.textDead}}>No billed requests logged yet.</div>}
      </div>
      {allEntries.length>0 && <button onClick={download} style={{...btn(false),width:'100%',fontSize:10,marginTop:7}}>⬇ Download JSON</button>}
    </CollapsibleSection>
  );
}
