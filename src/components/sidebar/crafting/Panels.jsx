import { useState } from 'react';
import { colors, fonts, btn } from '../../../styles/theme.js';
import { allItems } from '../../../hooks/useCharacter.js';
import { stackCounts, stackCount, stackHas } from '../../../utils/itemStacks.js';
import { categorizeItem, CATEGORY_META, hasInspectableItemInfo } from '../inventory/categorization.js';
import { CollapsibleSection, npcInput } from '../common/index.jsx';

const SEL_KEY = 'dnd-panel-selections';
const loadSel = () => { try { return JSON.parse(localStorage.getItem(SEL_KEY)) || {}; } catch { return {}; } };
const saveSel = (craft, salvage, consolidate) => {
  try { localStorage.setItem(SEL_KEY, JSON.stringify({ craft, salvage, consolidate })); } catch { /* quota, ignore */ }
};
const persistedSel = loadSel();
const craftStore = { selected: persistedSel.craft || {}, intent:'', mode:'item', options:null, status:'', filter:'', source:'both', showAll:false, draft:{}, infoOpen:{}, catClosed:{}, qty:'1', open:false };
const consolidateStore = { selected: persistedSel.consolidate || {}, filter:'', source:'both', destination:'stash', draft:{}, catClosed:{}, groups:null, status:'', open:false };

// Loading a save replaces the character wholesale, so any proposal or selection
// still sitting in these stores refers to a world that no longer exists.
export const resetCraftingPanels = () => {
  Object.assign(craftStore, { selected:{}, intent:'', options:null, status:'', filter:'', draft:{}, qty:'1' });
  Object.assign(salvageStore, { selected:{}, result:null, status:'', filter:'', draft:{} });
  Object.assign(consolidateStore, { selected:{}, filter:'', draft:{}, groups:null, status:'' });
  saveSel({}, {}, {});
};
const salvageStore = { selected: persistedSel.salvage || {}, result:null, status:'', filter:'', source:'both', destination:'inventory', showAll:false, draft:{}, infoOpen:{}, catClosed:{}, open:false };

// Bind a store key to component state, writing through on every change.
const useStored = (store, key) => {
  const [v, setV] = useState(store[key]);
  return [v, (next) => {
    const val = typeof next === 'function' ? next(store[key]) : next;
    store[key] = val;
    if (key === 'selected') saveSel(craftStore.selected, salvageStore.selected, consolidateStore.selected);
    setV(val);
  }];
};

export function CraftingPanel({ character, db, onProposeCrafting, onExecuteCrafting }) {
  const [selected, setSelected] = useStored(craftStore, 'selected');   // { name: count }
  const [intent, setIntent]     = useStored(craftStore, 'intent');
  const [mode, setMode]         = useStored(craftStore, 'mode');       // item | set | construct
  const [busy, setBusy]         = useState(false);
  const [options, setOptions]   = useStored(craftStore, 'options');
  const [status, setStatus]     = useStored(craftStore, 'status');
  const [filter, setFilter]     = useStored(craftStore, 'filter');
  const [showAll, setShowAll]   = useStored(craftStore, 'showAll');
  const [source, setSource]     = useStored(craftStore, 'source');   // inventory | stash | both
  const [qty, setQty]           = useStored(craftStore, 'qty');   // how many identical copies
  const [open, setOpen]         = useStored(craftStore, 'open');

  // Default to things that read as crafting stock, but categorisation is
  // keyword-based and imperfect — 'Carapace Plates' lands in armor, scale mail
  // you mean to melt down lands in worn. 'Show all' is the escape hatch so
  // nothing is ever unreachable because of a misfiled category.
  // Materials mostly live in the STASH, not carried inventory, so draw from
  // both. Track which source each stack came from — consumption has to remove
  // from the right list.
  const invCount = stackCounts(character.inventory);
  const stashCount = stackCounts(character.stash);
  const bagInvCount = {}, bagStashCount = {}, bagWhere = {};
  Object.entries(character.items || {}).forEach(([bagName, d]) => {
    if (d?.type !== 'bag' || !d.contents) return;
    const target = stackHas(character.stash, bagName) && !stackHas(character.inventory, bagName) ? bagStashCount : bagInvCount;
    Object.entries(d.contents).forEach(([item, ct]) => {
      if (ct > 0) { target[item] = (target[item] || 0) + ct; (bagWhere[item] = bagWhere[item] || []).push(bagName); }
    });
  });
  const allNames = [...new Set([...Object.keys(invCount), ...Object.keys(stashCount), ...Object.keys(bagInvCount), ...Object.keys(bagStashCount)])];
  const sourceCount = (nm) => {
    const inv = (invCount[nm] || 0) + (bagInvCount[nm] || 0);
    const stash = (stashCount[nm] || 0) + (bagStashCount[nm] || 0);
    return source === 'inventory' ? inv : source === 'stash' ? stash : inv + stash;
  };
  const sourceNames = allNames.filter(nm => sourceCount(nm) > 0);
  const stockData = (nm) => db[nm];
  const isStock = (nm) => {
    if (stockData(nm)?.type === 'bag') return false;   // a bag is a container, not material
    const cat = categorizeItem(nm, stockData(nm));
    return cat === 'materials' || cat === 'misc' || cat === 'valuables';
  };  // constructs excluded — breaking one down should be a deliberate choice
  const q = filter.trim().toLowerCase();
  const hiddenCount = sourceNames.filter(nm => !isStock(nm)).length;
  const candidates = sourceNames
    .filter(nm => showAll || isStock(nm))
    .filter(nm => !q || nm.toLowerCase().includes(q))
    .sort((a, b) => a.localeCompare(b))
    .map(nm => [nm, sourceCount(nm), {
      inv: (invCount[nm] || 0) + (bagInvCount[nm] || 0),
      stash: (stashCount[nm] || 0) + (bagStashCount[nm] || 0),
      bag: (bagInvCount[nm] || 0) + (bagStashCount[nm] || 0),
      bags: bagWhere[nm] || [],
    }]);

  const toggle = (nm, max) => setSelected(prev => {
    const next = { ...prev };
    if (next[nm]) delete next[nm]; else next[nm] = max;
    return next;
  });
  const toggleRows = (rows) => setSelected(prev => {
    const next = { ...prev };
    const allOn = rows.every(([nm]) => next[nm] !== undefined);
    rows.forEach(([nm, max]) => { if (allOn) delete next[nm]; else next[nm] = max; });
    return next;
  });
  // Keep the raw text while typing so deleting a digit doesn't instantly snap
  // back to 1; clamp only when the field loses focus.
  const [draft, setDraft] = useStored(craftStore, 'draft');
  const [infoOpen, setInfoOpen] = useStored(craftStore, 'infoOpen');
  const [catClosed, setCatClosed] = useStored(craftStore, 'catClosed');   // collapsed material categories
  const commitCount = (nm, max) => {
    const raw = draft[nm];
    if (raw === undefined) return;
    const parsed = parseInt(raw, 10);
    const v = Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(max, parsed));
    setSelected(prev => ({ ...prev, [nm]: v }));
    setDraft(prev => { const next = { ...prev }; delete next[nm]; return next; });
  };

  const propose = async () => {
    setBusy(true); setStatus('Consulting the forge…'); setOptions(null);
    try {
      // Send the full definition, not just the label — when upgrading, the model
      // needs to SEE the existing stats to preserve and exceed them.
      const mats = Object.entries(liveSelected).map(([nm, count]) => ({ name: nm, count, data: stockData(nm) || null }));
      const opts = await onProposeCrafting({ materials: mats, intent, asSet: mode === 'set', asConstruct: mode === 'construct', qty });
      setOptions(opts); setStatus('');
    } catch (e) { setStatus('✗ ' + e.message); }
    setBusy(false);
  };

  const make = (opt) => {
    try {
      const made = onExecuteCrafting(opt);
      setStatus(`✓ Crafted ${made}`);
      setOptions(null); setSelected({}); setDraft({}); setIntent(''); setFilter('');
    } catch (e) { setStatus('✗ ' + e.message); }
  };

  // Selections can outlive the character they were made against — the store
  // survives a save reload. Filter them for USE rather than writing state during
  // render: a render-phase setState here re-renders immediately, and if the
  // condition does not clear it locks the main thread completely.
  const heldNames = new Set(sourceNames);
  const liveSelected = Object.fromEntries(
    Object.entries(selected)
      .filter(([nm]) => heldNames.has(nm))
      .map(([nm, count]) => [nm, Math.min(count, sourceCount(nm))])
  );

  const selCount = Object.keys(liveSelected).length;
  return (
    <CollapsibleSection title="🔨 CRAFTING" count={selCount || undefined} open={open} onOpenChange={setOpen}>
      <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
        Select materials, then ask what they could become. Nothing is consumed until you confirm.
      </div>

      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder={`Search ${candidates.length} ${showAll ? 'items' : 'materials'}…`}
        style={{...npcInput, marginBottom:4}}/>

      <div style={{display:'flex',gap:4,marginBottom:6}}>
        {[['inventory','🎒 Inventory'],['stash','📦 Stash'],['both','↔ Both']].map(([id,label]) => (
          <button key={id} onClick={()=>setSource(id)}
            style={{flex:1,background:source===id?'rgba(201,168,76,0.15)':'transparent',border:`1px solid ${source===id?colors.gold:colors.borderDim}`,color:source===id?colors.gold:colors.textFaint,padding:'4px 2px',fontSize:10,fontFamily:fonts.display,borderRadius:3,cursor:'pointer'}}>
            {label}
          </button>
        ))}
      </div>

      {hiddenCount > 0 && (
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:colors.textDim,marginBottom:6,cursor:'pointer'}}>
          <input type="checkbox" checked={showAll} onChange={()=>setShowAll(v=>!v)} style={{accentColor:colors.gold,flexShrink:0}}/>
          Show all items ({hiddenCount} hidden — categories are guesses, tick this if something's missing)
        </label>
      )}

      {candidates.length > 0 && (
        <button onClick={()=>toggleRows(candidates)} style={{...btn(false),width:'100%',fontSize:10,padding:'4px 0',marginBottom:6}}>
          {candidates.every(([nm]) => liveSelected[nm] !== undefined) ? '☐ CLEAR ALL VISIBLE' : '☑ SELECT ALL VISIBLE'}
        </button>
      )}

      <div style={{maxHeight:340,overflowY:'auto',border:`1px solid ${colors.borderFaint}`,borderRadius:4,padding:4,marginBottom:6}}>
        {candidates.length === 0 && <div style={{fontSize:11,color:colors.textDead,fontStyle:'italic',padding:'4px 2px'}}>No materials in this source.</div>}
        {(() => {
          // Same categories as the inventory and stash, each collapsible so a
          // long material list narrows to what matters. A search expands
          // everything — you are looking for one specific thing.
          const groups = {};
          candidates.forEach(entry => {
            const cat = categorizeItem(entry[0], stockData(entry[0]));
            (groups[cat] = groups[cat] || []).push(entry);
          });
          return Object.entries(CATEGORY_META).map(([cat, meta]) => {
            const rows = groups[cat];
            if (!rows?.length) return null;
            const closed = !q && catClosed[cat];
            const picked = rows.filter(r => liveSelected[r[0]] !== undefined).length;
            return (
              <div key={cat}>
                <div onClick={() => setCatClosed(prev => ({ ...prev, [cat]: !prev[cat] }))}
                  style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',padding:'3px 0',marginTop:2,userSelect:'none'}}>
                  <span style={{fontFamily:fonts.display,fontSize:10,color:picked?colors.gold:colors.textGhost,letterSpacing:1}}>
                    {meta.label}{picked ? ` · ${picked} selected` : ''}
                  </span>
                  <span style={{display:'flex',alignItems:'center',gap:5}}>
                    <button onClick={e=>{ e.stopPropagation(); toggleRows(rows); }} style={{...btn(false),fontSize:8,padding:'1px 5px',lineHeight:1.3}}>
                      {picked === rows.length ? 'CLEAR' : 'ALL'}
                    </button>
                    <span style={{fontFamily:fonts.mono,fontSize:10,color:colors.textDead}}>{rows.length} {closed ? '▼' : '▲'}</span>
                  </span>
                </div>
                {!closed && rows.map(([nm, max, src]) => {
          const on = liveSelected[nm] !== undefined;
          return (
            <div key={nm} style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:6,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
              <input type="checkbox" checked={on} onChange={()=>toggle(nm, max)} style={{accentColor:colors.gold,cursor:'pointer',flexShrink:0}}/>
              <span onClick={()=>{ if (hasInspectableItemInfo(stockData(nm))) setInfoOpen(p => ({ ...p, [nm]: !p[nm] })); }}
                style={{flex:1,minWidth:0,fontSize:12,color:on?colors.text:colors.textDim,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:hasInspectableItemInfo(stockData(nm))?'pointer':'default'}}>
                {nm}
                {hasInspectableItemInfo(stockData(nm)) && <span style={{color:colors.textDead,fontSize:10}}> ⓘ</span>}
                {src.stash > 0 && <span style={{fontSize:9,color:colors.textGhost,marginLeft:4}} title="in stash">📦</span>}
                {src.bag > 0 && <span style={{fontSize:9,color:colors.textGhost,marginLeft:4}} title={`in ${src.bags.join(', ')}`}>👜</span>}
              </span>
              {max > 1 && (
                on
                  ? <input value={draft[nm] ?? liveSelected[nm]}
                      onChange={e=>setDraft(prev=>({...prev,[nm]:e.target.value}))}
                      onBlur={()=>commitCount(nm, max)}
                      onKeyDown={e=>{ if (e.key === 'Enter') e.currentTarget.blur(); }}
                      inputMode="numeric"
                      style={{width:38,flexShrink:0,background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.gold,fontFamily:fonts.mono,fontSize:11,padding:'1px 4px',borderRadius:3,textAlign:'center',outline:'none'}}/>
                  : <span style={{fontSize:11,color:colors.goldFaint,fontFamily:fonts.mono,flexShrink:0}}>x{max}</span>
              )}
              {infoOpen[nm] && (() => {
                const d = stockData(nm); if (!d) return null;
                const bits = [];
                if (d.type) bits.push(d.type);
                if (d.slot) bits.push(d.slot);
                if (d.ac !== undefined && d.ac !== null && d.ac !== '') bits.push(`AC ${d.ac}`);
                if (d.damage) bits.push(`${d.damage}${d.bonus ? `+${d.bonus}` : ''}`);
                if (Array.isArray(d.extras)) d.extras.forEach(e => bits.push(`+${e.dice} ${e.type}`));
                if (d.bonuses && Object.keys(d.bonuses).length) bits.push(Object.entries(d.bonuses).map(([k,v])=>`${k}:${v}`).join(','));
                return (
                  <div style={{flexBasis:'100%',paddingLeft:22,paddingBottom:3}}>
                    {bits.length > 0 && <div style={{fontSize:10,color:colors.goldFaint,lineHeight:1.4}}>{bits.join(' · ')}</div>}
                    {d.label && <div style={{fontSize:10,color:colors.textDim,lineHeight:1.4}}>{d.label}</div>}
                  </div>
                );
              })()}
            </div>
          );
                })}
              </div>
            );
          });
        })()}
      </div>

      <div style={{display:'flex',gap:4,marginBottom:4}}>
        <input value={intent} onChange={e=>setIntent(e.target.value)} placeholder="What do you want made? (optional)"
          style={{...npcInput, flex:1}}/>
        <div style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
          <span style={{fontSize:11,color:colors.textGhost}}>×</span>
          <input value={qty} onChange={e=>setQty(e.target.value.replace(/[^0-9]/g,''))}
            onBlur={()=>setQty(String(Math.max(1, Math.min(1000, parseInt(qty,10)||1))))}
            inputMode="numeric" title="How many to make — the forge spreads the materials across them"
            style={{width:38,background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.gold,fontFamily:fonts.mono,fontSize:13,padding:'6px 4px',borderRadius:4,textAlign:'center',outline:'none'}}/>
        </div>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:6}}>
        {[['item','⚒️ Item'],['set','🛡️ Set'],['construct','🗿 Construct']].map(([id,label]) => (
          <button key={id} onClick={()=>setMode(id)}
            style={{flex:1,background:mode===id?'rgba(201,168,76,0.15)':'transparent',border:`1px solid ${mode===id?colors.gold:colors.borderDim}`,color:mode===id?colors.gold:colors.textFaint,padding:'5px 2px',fontSize:10,fontFamily:fonts.display,letterSpacing:0.5,borderRadius:3,cursor:'pointer',whiteSpace:'nowrap'}}>
            {label}
          </button>
        ))}
      </div>
      <div style={{fontSize:10,color:colors.textGhost,marginBottom:6,lineHeight:1.4}}>
        {mode==='set' ? 'Several pieces in different slots — costs more material.'
          : mode==='construct' ? 'A golem, war machine or bound spirit. Becomes a COMPANION rather than an item, so it can be described properly and equipped.'
          : 'A single piece of equipment.'}
      </div>

      <div style={{display:'flex',gap:4}}>
        <button onClick={propose} disabled={busy || selCount === 0}
          style={{...btn(false), flex:1, opacity:(busy||selCount===0)?0.4:1}}>
          {busy ? '…' : `🔨 ${mode==='construct' ? 'WHAT CAN I RAISE' : mode==='set' ? 'WHAT CAN I FORGE AS A SET' : 'WHAT CAN I MAKE'}?${selCount ? ` (${selCount})` : ''}`}
        </button>
        {(selCount > 0 || options || status) && (
          <button onClick={()=>{ setSelected({}); setDraft({}); setOptions(null); setStatus(''); setIntent(''); setFilter(''); }}
            title="Clear the proposal and deselect everything"
            style={{...btn(false), flexShrink:0, fontSize:11, padding:'0 9px'}}>✕</button>
        )}
      </div>
      {status && <div style={{fontSize:12,color:status.startsWith('✗')?'#c96a4c':colors.goldFaint,marginTop:6,lineHeight:1.4}}>{status}</div>}

      {options && options.map((o, i) => (
        <div key={i} style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:8,marginTop:6}}>
          <div style={{fontFamily:fonts.display,fontSize:13,color:colors.gold,marginBottom:2}}>
            {o.name}{o.pieces?.length ? <span style={{color:colors.textGhost,fontSize:10}}> · {o.pieces.length} pieces</span> : null}
          </div>
          {o.isConstruct ? (
            <>
              <div style={{fontSize:10,color:colors.goldFaint,marginBottom:3}}>
                CR {o.cr || '?'}{o.race ? ` · ${o.race}` : ''}{o.role ? ` · ${o.role}` : ''}
              </div>
              {o.appearance && <div style={{fontSize:11,color:colors.textDim,marginBottom:4,lineHeight:1.4}}>{o.appearance}</div>}
              {o.abilities && <div style={{fontSize:11,color:colors.text,marginBottom:4,lineHeight:1.4}}><b style={{color:colors.textGhost}}>Powers:</b> {o.abilities}</div>}
              {o.desc && <div style={{fontSize:11,color:colors.textDim,marginBottom:4,lineHeight:1.4}}>{o.desc}</div>}
            </>
          ) : o.pieces?.length ? (
            o.pieces.map((pc, j) => (
              <div key={j} style={{borderLeft:`1px solid ${colors.borderDim}`,paddingLeft:6,marginBottom:4}}>
                <div style={{fontSize:12,color:colors.text}}>{pc.name}</div>
                <div style={{fontSize:10,color:colors.textGhost,lineHeight:1.4}}>
                  {pc.type}{pc.slot && pc.slot !== pc.type ? ` · ${pc.slot}` : ''}{pc.ac !== undefined && pc.ac !== null && pc.ac !== '' ? ` · AC ${pc.ac}` : ''}{pc.damage ? ` · ${pc.damage}` : ''}{pc.bonuses ? ` · ${pc.bonuses}` : ''}
                </div>
                {pc.label && <div style={{fontSize:10,color:colors.textDim,lineHeight:1.4}}>{pc.label}</div>}
              </div>
            ))
          ) : (
            <>
              <div style={{fontSize:11,color:colors.textDim,marginBottom:4,lineHeight:1.4}}>{o.label}</div>
              <div style={{fontSize:10,color:colors.textGhost,marginBottom:4,lineHeight:1.4}}>
                {o.type}{o.slot ? ` · ${o.slot}` : ''}{o.damage ? ` · ${o.damage}` : ''}{o.bonuses ? ` · ${o.bonuses}` : ''}
              </div>
            </>
          )}
          <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
            Consumes: {(o.consumes||[]).map(m=>`${m.name}${m.count>1?` x${m.count}`:''}`).join(', ') || 'nothing'}
            {o.reason ? ` — ${o.reason}` : ''}
          </div>
          {o.unavailable && (
            <div style={{fontSize:10,color:'#c96a4c',marginBottom:6,lineHeight:1.4}}>
              Can't be made — the forge asked for {o.unavailable.join('; ')}. Regenerate for something your materials support.
            </div>
          )}
          <button onClick={()=>make(o)} disabled={!!o.unavailable}
            style={{...btn(true), width:'100%', fontSize:11, padding:'4px 0', opacity:o.unavailable?0.4:1}}>
            {o.isConstruct ? '✓ RAISE IT' : o.pieces?.length ? '✓ FORGE THE SET' : '✓ FORGE THIS'}
            {` ×${Math.max(1, parseInt(o.count, 10) || 1)}`}
          </button>
        </div>
      ))}
    </CollapsibleSection>
  );
}

// ── Salvage: break finished items back down into materials ───────────────────
// ── Consolidate: deliberately collapse many named stacks into simple stock ───
export function ConsolidatePanel({ character, db, onProposeConsolidation, onExecuteConsolidation }) {
  const [selected, setSelected] = useStored(consolidateStore, 'selected');
  const [filter, setFilter] = useStored(consolidateStore, 'filter');
  const [source, setSource] = useStored(consolidateStore, 'source');
  const [destination, setDestination] = useStored(consolidateStore, 'destination');
  const [draft, setDraft] = useStored(consolidateStore, 'draft');
  const [catClosed, setCatClosed] = useStored(consolidateStore, 'catClosed');
  const [groups, setGroups] = useStored(consolidateStore, 'groups');
  const [status, setStatus] = useStored(consolidateStore, 'status');
  const [open, setOpen] = useStored(consolidateStore, 'open');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);

  const invCount = stackCounts(character.inventory);
  const stashCount = stackCounts(character.stash);
  const bagInvCount = {}, bagStashCount = {};
  Object.entries(character.items || {}).forEach(([bagName, d]) => {
    if (d?.type !== 'bag' || !d.contents) return;
    const intoStash = stackHas(character.stash, bagName) && !stackHas(character.inventory, bagName);
    const dst = intoStash ? bagStashCount : bagInvCount;
    Object.entries(d.contents).forEach(([name, count]) => {
      if (count > 0) dst[name] = (dst[name] || 0) + count;
    });
  });
  const names = [...new Set([...Object.keys(invCount), ...Object.keys(stashCount), ...Object.keys(bagInvCount), ...Object.keys(bagStashCount)])];
  const sourceCount = (nm) => {
    const inv = (invCount[nm] || 0) + (bagInvCount[nm] || 0);
    const stash = (stashCount[nm] || 0) + (bagStashCount[nm] || 0);
    return source === 'inventory' ? inv : source === 'stash' ? stash : inv + stash;
  };
  const q = filter.trim().toLowerCase();
  const candidates = names.filter(nm => sourceCount(nm) > 0)
    .filter(nm => !q || nm.toLowerCase().includes(q))
    .sort((a,b)=>a.localeCompare(b))
    .map(nm => [nm, sourceCount(nm)]);
  const held = new Set(names);
  const liveSelected = Object.fromEntries(Object.entries(selected)
    .filter(([nm]) => held.has(nm) && sourceCount(nm) > 0)
    .map(([nm,count]) => [nm, Math.min(count, sourceCount(nm))]));
  const selEntries = Object.entries(liveSelected).map(([name,count]) => ({ name, count }));
  const total = selEntries.reduce((n,x)=>n+x.count,0);

  const toggle = (nm,max) => setSelected(prev => {
    const next={...prev}; if (next[nm] !== undefined) delete next[nm]; else next[nm]=max; return next;
  });
  const toggleRows = (rows) => setSelected(prev => {
    const next={...prev}; const allOn=rows.every(([nm])=>next[nm]!==undefined);
    rows.forEach(([nm,max])=>{ if(allOn) delete next[nm]; else next[nm]=max; }); return next;
  });
  const commitCount = (nm,max) => {
    const raw=draft[nm]; if(raw===undefined) return;
    const parsed=parseInt(raw,10); const v=Number.isNaN(parsed)?1:Math.max(1,Math.min(max,parsed));
    setSelected(prev=>({...prev,[nm]:v}));
    setDraft(prev=>{const n={...prev};delete n[nm];return n;});
  };

  const combine = (items, name) => {
    const finalName=String(name||'').trim();
    if(!finalName) { setStatus('✗ Name the resulting stack'); return false; }
    try {
      const result=onExecuteConsolidation({ items, name:finalName, destination });
      const used=new Set(items.map(x=>x.name));
      setSelected(prev=>Object.fromEntries(Object.entries(prev).filter(([nm])=>!used.has(nm))));
      setStatus(`✓ ${result}`); return true;
    } catch(e) { setStatus('✗ '+e.message); return false; }
  };

  const smart = async () => {
    if(selEntries.length<2) return;
    setBusy(true); setStatus('Finding things that are secretly the same pile of stuff…'); setGroups(null);
    try {
      const proposed=await onProposeConsolidation({ items:selEntries });
      setGroups(proposed.map(g=>({...g,target:g.name})));
      setStatus(proposed.length ? '' : 'No useful groups found — the selected stacks are already distinct.');
    } catch(e) { setStatus('✗ '+e.message); }
    setBusy(false);
  };

  return (
    <CollapsibleSection title="🧹 CONSOLIDATE" count={Object.keys(liveSelected).length || undefined} open={open} onOpenChange={setOpen}>
      <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
        Manual combine is local and literal: selected quantities become one plain stack. Smart Group asks the helper to propose aggressive material abstractions, but nothing changes until you approve it.
      </div>
      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder={`Search ${candidates.length} items…`} style={{...npcInput,marginBottom:4}}/>
      <div style={{display:'flex',gap:4,marginBottom:5}}>
        {[['inventory','🎒 Inventory'],['stash','📦 Stash'],['both','↔ Both']].map(([id,label])=><button key={id} onClick={()=>setSource(id)}
          style={{flex:1,background:source===id?'rgba(201,168,76,0.15)':'transparent',border:`1px solid ${source===id?colors.gold:colors.borderDim}`,color:source===id?colors.gold:colors.textFaint,padding:'4px 2px',fontSize:10,fontFamily:fonts.display,borderRadius:3,cursor:'pointer'}}>{label}</button>)}
      </div>
      <div style={{display:'flex',gap:4,marginBottom:6,alignItems:'center'}}>
        <span style={{fontSize:10,color:colors.textGhost,flexShrink:0}}>RESULT TO</span>
        {[['stash','📦 Stash'],['inventory','🎒 Inventory']].map(([id,label])=><button key={id} onClick={()=>setDestination(id)}
          style={{...btn(false),flex:1,fontSize:9,padding:'3px 2px',borderColor:destination===id?colors.gold:colors.borderDim,color:destination===id?colors.gold:colors.textFaint}}>{label}</button>)}
      </div>
      {candidates.length>0 && <button onClick={()=>toggleRows(candidates)} style={{...btn(false),width:'100%',fontSize:10,padding:'4px 0',marginBottom:6}}>
        {candidates.every(([nm])=>liveSelected[nm]!==undefined)?'☐ CLEAR ALL VISIBLE':'☑ SELECT ALL VISIBLE'}
      </button>}
      <div style={{maxHeight:330,overflowY:'auto',border:`1px solid ${colors.borderFaint}`,borderRadius:4,padding:4,marginBottom:6}}>
        {(()=>{ const by={}; candidates.forEach(row=>{const cat=categorizeItem(row[0],db[row[0]]);(by[cat]=by[cat]||[]).push(row);});
          return Object.entries(CATEGORY_META).map(([cat,meta])=>{const rows=by[cat];if(!rows?.length)return null;const closed=!q&&catClosed[cat];const picked=rows.filter(([nm])=>liveSelected[nm]!==undefined).length;return <div key={cat}>
            <div onClick={()=>setCatClosed(prev=>({...prev,[cat]:!prev[cat]}))} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',padding:'3px 0',marginTop:2,userSelect:'none'}}>
              <span style={{fontFamily:fonts.display,fontSize:10,color:picked?colors.gold:colors.textGhost,letterSpacing:1}}>{meta.label}{picked?` · ${picked} selected`:''}</span>
              <span style={{display:'flex',alignItems:'center',gap:5}}><button onClick={e=>{e.stopPropagation();toggleRows(rows);}} style={{...btn(false),fontSize:8,padding:'1px 5px',lineHeight:1.3}}>{picked===rows.length?'CLEAR':'ALL'}</button><span style={{fontFamily:fonts.mono,fontSize:10,color:colors.textDead}}>{rows.length} {closed?'▼':'▲'}</span></span>
            </div>
            {!closed&&rows.map(([nm,max])=>{const on=liveSelected[nm]!==undefined;return <div key={nm} style={{display:'flex',alignItems:'center',gap:6,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
              <input type="checkbox" checked={on} onChange={()=>toggle(nm,max)} style={{accentColor:colors.gold,cursor:'pointer'}}/>
              <span style={{flex:1,minWidth:0,fontSize:12,color:on?colors.text:colors.textDim,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nm}</span>
              {max>1&&(on?<input value={draft[nm]??liveSelected[nm]} onChange={e=>setDraft(p=>({...p,[nm]:e.target.value}))} onBlur={()=>commitCount(nm,max)} inputMode="numeric"
                style={{width:42,background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.gold,fontFamily:fonts.mono,fontSize:11,padding:'1px 4px',borderRadius:3,textAlign:'center',outline:'none'}}/>:<span style={{fontSize:11,color:colors.goldFaint,fontFamily:fonts.mono}}>x{max}</span>)}
            </div>;})}
          </div>;}); })()}
      </div>

      <div style={{fontSize:10,color:colors.textGhost,marginBottom:4}}>{selEntries.length} stack{selEntries.length===1?'':'s'} selected · {total.toLocaleString()} total units</div>
      <div style={{display:'flex',gap:4,marginBottom:6}}>
        <input value={target} onChange={e=>setTarget(e.target.value)} placeholder="Combine as… e.g. Adamantine" style={{...npcInput,flex:1}}/>
        <button onClick={()=>combine(selEntries,target)} disabled={!selEntries.length||!target.trim()} style={{...btn(true),fontSize:10,opacity:(!selEntries.length||!target.trim())?0.4:1}}>COMBINE</button>
      </div>
      <button onClick={smart} disabled={busy||selEntries.length<2} style={{...btn(false),width:'100%',fontSize:10,opacity:(busy||selEntries.length<2)?0.4:1}}>{busy?'…':'✨ SMART GROUP SELECTED'}</button>
      {status&&<div style={{fontSize:11,color:status.startsWith('✗')?'#c96a4c':colors.goldFaint,marginTop:6,lineHeight:1.4}}>{status}</div>}

      {groups?.length>0&&<div style={{marginTop:8}}>
        <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:4}}>PROPOSED GROUPS — APPROVE INDIVIDUALLY</div>
        {groups.map((g,i)=>{
          const groupTotal=(g.items||[]).reduce((n,x)=>n+(x.count||1),0);
          return <div key={`${g.name}-${i}`} style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:7,marginBottom:5}}>
            <div style={{fontSize:10,color:colors.textDim,lineHeight:1.4,marginBottom:4}}>{(g.items||[]).map(x=>`${x.name} ×${x.count}`).join(' + ')}</div>
            {g.reason&&<div style={{fontSize:9,color:colors.textDead,lineHeight:1.35,marginBottom:5}}>{g.reason}</div>}
            <div style={{display:'flex',gap:4,alignItems:'center'}}>
              <input value={g.target??g.name} onChange={e=>setGroups(prev=>prev.map((x,j)=>j===i?{...x,target:e.target.value}:x))} style={{...npcInput,flex:1}}/>
              <span style={{fontFamily:fonts.mono,fontSize:10,color:colors.goldFaint}}>×{groupTotal}</span>
              <button onClick={()=>{ if(combine(g.items,g.target??g.name)) setGroups(prev=>prev.filter((_,j)=>j!==i)); }} style={{...btn(true),fontSize:9}}>APPLY</button>
              <button onClick={()=>setGroups(prev=>prev.filter((_,j)=>j!==i))} style={{...btn(false),fontSize:9}}>✕</button>
            </div>
          </div>;
        })}
      </div>}
    </CollapsibleSection>
  );
}

export function SalvagePanel({ character, db, onProposeDismantle, onExecuteDismantle }) {
  const [open, setOpen] = useStored(salvageStore, 'open');
  const [selected, setSelected] = useStored(salvageStore, 'selected');
  const [busy, setBusy]         = useState(false);
  const [result, setResult]     = useStored(salvageStore, 'result');
  const [status, setStatus]     = useStored(salvageStore, 'status');
  const [filter, setFilter]     = useStored(salvageStore, 'filter');
  const [showAll, setShowAll]   = useStored(salvageStore, 'showAll');
  const [source, setSource]     = useStored(salvageStore, 'source');   // inventory | stash | both
  const [destination, setDestination] = useStored(salvageStore, 'destination'); // recovered materials

  const invCount = stackCounts(character.inventory);
  const stashCount = stackCounts(character.stash);
  const bagInvCount = {}, bagStashCount = {}, bagWhere = {};
  Object.entries(character.items || {}).forEach(([bagName, d]) => {
    if (d?.type !== 'bag' || !d.contents) return;
    const target = stackHas(character.stash, bagName) && !stackHas(character.inventory, bagName) ? bagStashCount : bagInvCount;
    Object.entries(d.contents).forEach(([item, ct]) => {
      if (ct > 0) { target[item] = (target[item] || 0) + ct; (bagWhere[item] = bagWhere[item] || []).push(bagName); }
    });
  });
  const allNames = [...new Set([...Object.keys(invCount), ...Object.keys(stashCount), ...Object.keys(bagInvCount), ...Object.keys(bagStashCount)])];
  const sourceCount = (nm) => {
    const inv = (invCount[nm] || 0) + (bagInvCount[nm] || 0);
    const stash = (stashCount[nm] || 0) + (bagStashCount[nm] || 0);
    return source === 'inventory' ? inv : source === 'stash' ? stash : inv + stash;
  };
  const sourceNames = allNames.filter(nm => sourceCount(nm) > 0);
  const equipped = new Set(Object.values(character.slots || {}).filter(Boolean));
  const stockData = (nm) => db[nm];
  // Inverse of crafting: finished goods, not raw materials.
  const isSalvageable = (nm) => {
    const cat = categorizeItem(nm, stockData(nm));
    return ['weapons','worn','magic','tools','gear','ammo'].includes(cat);
  };
  const q = filter.trim().toLowerCase();
  const hiddenCount = sourceNames.filter(nm => !isSalvageable(nm) && !equipped.has(nm)).length;
  const candidates = sourceNames
    .filter(nm => !equipped.has(nm))                       // never offer worn gear
    .filter(nm => showAll || isSalvageable(nm))
    .filter(nm => !q || nm.toLowerCase().includes(q))
    .sort((a, b) => a.localeCompare(b))
    .map(nm => [nm, sourceCount(nm), {
      stash: (stashCount[nm] || 0) + (bagStashCount[nm] || 0),
      inv: (invCount[nm] || 0) + (bagInvCount[nm] || 0),
      bag: (bagInvCount[nm] || 0) + (bagStashCount[nm] || 0),
      bags: bagWhere[nm] || [],
    }]);

  const toggle = (nm, max) => setSelected(prev => {
    const next = { ...prev };
    if (next[nm]) delete next[nm]; else next[nm] = max;   // default to the whole stack
    return next;
  });
  // Raw text while typing, clamped on blur (see crafting panel).
  const [draft, setDraft] = useStored(salvageStore, 'draft');
  const [infoOpen, setInfoOpen] = useStored(salvageStore, 'infoOpen');
  const [catClosed, setCatClosed] = useStored(salvageStore, 'catClosed');   // collapsed material categories
  const commitCount = (nm, max) => {
    const raw = draft[nm];
    if (raw === undefined) return;
    const parsed = parseInt(raw, 10);
    const v = Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(max, parsed));
    setSelected(prev => ({ ...prev, [nm]: v }));
    setDraft(prev => { const next = { ...prev }; delete next[nm]; return next; });
  };

  const submitted = () => Object.entries(liveSelected).map(([name, count]) => ({ name, count }));

  const propose = async () => {
    setBusy(true); setStatus('Taking it apart…'); setResult(null);
    try {
      const r = await onProposeDismantle({ items: submitted() });
      setResult(r); setStatus('');
    } catch (e) { setStatus('✗ ' + e.message); }
    setBusy(false);
  };
  const confirm = () => {
    try {
      const got = onExecuteDismantle(result, submitted(), destination);
      setStatus(`✓ Recovered ${got}`);
      // Clear the search too: a filter matching the item just consumed would
      // leave the list looking empty until the panel is closed and reopened.
      setResult(null); setSelected({}); setDraft({}); setFilter('');
    } catch (e) { setStatus('✗ ' + e.message); }
  };

  // Selections can outlive the character they were made against — the store
  // survives a save reload. Filter them for USE rather than writing state during
  // render: a render-phase setState here re-renders immediately, and if the
  // condition does not clear it locks the main thread completely.
  const heldNames = new Set(sourceNames);
  const liveSelected = Object.fromEntries(
    Object.entries(selected)
      .filter(([nm]) => heldNames.has(nm))
      .map(([nm, count]) => [nm, Math.min(count, sourceCount(nm))])
  );

  const selCount = Object.keys(liveSelected).length;
  return (
    <CollapsibleSection title="🔧 SALVAGE" count={selCount || undefined} open={open} onOpenChange={setOpen}>
      <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
        Break made things down into materials — lossy, you never get everything back. Harvesting a corpse or unworked remains is NOT lossy: the full yield is there for the taking. Equipped gear is not listed.
      </div>

      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder={`Search ${candidates.length} items…`}
        style={{...npcInput, marginBottom:4}}/>

      <div style={{display:'flex',gap:4,marginBottom:6}}>
        {[['inventory','🎒 Inventory'],['stash','📦 Stash'],['both','↔ Both']].map(([id,label]) => (
          <button key={id} onClick={()=>setSource(id)}
            style={{flex:1,background:source===id?'rgba(201,168,76,0.15)':'transparent',border:`1px solid ${source===id?colors.gold:colors.borderDim}`,color:source===id?colors.gold:colors.textFaint,padding:'4px 2px',fontSize:10,fontFamily:fonts.display,borderRadius:3,cursor:'pointer'}}>
            {label}
          </button>
        ))}
      </div>

      {hiddenCount > 0 && (
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:colors.textDim,marginBottom:6,cursor:'pointer'}}>
          <input type="checkbox" checked={showAll} onChange={()=>setShowAll(v=>!v)} style={{accentColor:colors.gold,flexShrink:0}}/>
          Show all items ({hiddenCount} hidden)
        </label>
      )}

      <div style={{display:'flex',gap:4,marginBottom:6,alignItems:'center'}}>
        <span style={{fontSize:10,color:colors.textGhost,flexShrink:0}}>RESULT TO</span>
        {[['inventory','🎒 Inventory'],['stash','📦 Stash']].map(([id,label]) => (
          <button key={id} onClick={()=>setDestination(id)}
            style={{...btn(false),flex:1,fontSize:9,padding:'3px 2px',borderColor:destination===id?colors.gold:colors.borderDim,color:destination===id?colors.gold:colors.textFaint}}>
            {label}
          </button>
        ))}
      </div>

      {candidates.length > 0 && (
        <button onClick={()=>{
          const allOn = candidates.every(([nm]) => liveSelected[nm] !== undefined);
          setSelected(prev => {
            const next = { ...prev };
            candidates.forEach(([nm,max]) => { if (allOn) delete next[nm]; else next[nm] = max; });
            return next;
          });
        }} style={{...btn(false),width:'100%',fontSize:10,padding:'4px 0',marginBottom:6}}>
          {candidates.every(([nm]) => liveSelected[nm] !== undefined) ? '☐ CLEAR ALL VISIBLE' : '☑ SELECT ALL VISIBLE'}
        </button>
      )}

      <div style={{maxHeight:340,overflowY:'auto',border:`1px solid ${colors.borderFaint}`,borderRadius:4,padding:4,marginBottom:6}}>
        {candidates.length === 0 && <div style={{fontSize:11,color:colors.textDead,fontStyle:'italic',padding:'4px 2px'}}>Nothing to break down.</div>}
        {(() => {
          // Same categories as the inventory and stash, each collapsible so a
          // long material list narrows to what matters. A search expands
          // everything — you are looking for one specific thing.
          const groups = {};
          candidates.forEach(entry => {
            const cat = categorizeItem(entry[0], stockData(entry[0]));
            (groups[cat] = groups[cat] || []).push(entry);
          });
          return Object.entries(CATEGORY_META).map(([cat, meta]) => {
            const rows = groups[cat];
            if (!rows?.length) return null;
            const closed = !q && catClosed[cat];
            const picked = rows.filter(r => liveSelected[r[0]] !== undefined).length;
            return (
              <div key={cat}>
                <div onClick={() => setCatClosed(prev => ({ ...prev, [cat]: !prev[cat] }))}
                  style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',padding:'3px 0',marginTop:2,userSelect:'none'}}>
                  <span style={{fontFamily:fonts.display,fontSize:10,color:picked?colors.gold:colors.textGhost,letterSpacing:1}}>
                    {meta.label}{picked ? ` · ${picked} selected` : ''}
                  </span>
                  <span style={{display:'flex',alignItems:'center',gap:5}}>
                    <button onClick={e=>{
                      e.stopPropagation();
                      const allOn = rows.every(([nm]) => liveSelected[nm] !== undefined);
                      setSelected(prev => {
                        const next = { ...prev };
                        rows.forEach(([nm,max]) => { if (allOn) delete next[nm]; else next[nm] = max; });
                        return next;
                      });
                    }} style={{...btn(false),fontSize:8,padding:'1px 5px',lineHeight:1.3}}>
                      {picked === rows.length ? 'CLEAR' : 'ALL'}
                    </button>
                    <span style={{fontFamily:fonts.mono,fontSize:10,color:colors.textDead}}>{rows.length} {closed ? '▼' : '▲'}</span>
                  </span>
                </div>
                {!closed && rows.map(([nm, max, src]) => {
          const on = liveSelected[nm] !== undefined;
          return (
            <div key={nm} style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:6,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
              <input type="checkbox" checked={on} onChange={()=>toggle(nm, max)} style={{accentColor:colors.gold,cursor:'pointer',flexShrink:0}}/>
              <span onClick={()=>{ if (hasInspectableItemInfo(stockData(nm))) setInfoOpen(p => ({ ...p, [nm]: !p[nm] })); }}
                style={{flex:1,minWidth:0,fontSize:12,color:on?colors.text:colors.textDim,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:hasInspectableItemInfo(stockData(nm))?'pointer':'default'}}>
                {nm}
                {hasInspectableItemInfo(stockData(nm)) && <span style={{color:colors.textDead,fontSize:10}}> ⓘ</span>}
                {src.stash > 0 && <span style={{fontSize:9,color:colors.textGhost,marginLeft:4}} title="in stash">📦</span>}
                {src.bag > 0 && <span style={{fontSize:9,color:colors.textGhost,marginLeft:4}} title={`in ${src.bags.join(', ')}`}>👜</span>}
              </span>
              {max > 1 && (
                on
                  ? <input value={draft[nm] ?? liveSelected[nm]}
                      onChange={e=>setDraft(prev=>({...prev,[nm]:e.target.value}))}
                      onBlur={()=>commitCount(nm, max)}
                      onKeyDown={e=>{ if (e.key === 'Enter') e.currentTarget.blur(); }}
                      inputMode="numeric"
                      style={{width:38,flexShrink:0,background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.gold,fontFamily:fonts.mono,fontSize:11,padding:'1px 4px',borderRadius:3,textAlign:'center',outline:'none'}}/>
                  : <span style={{fontSize:11,color:colors.goldFaint,fontFamily:fonts.mono,flexShrink:0}}>x{max}</span>
              )}
              {infoOpen[nm] && (() => {
                const d = stockData(nm); if (!d) return null;
                const bits = [];
                if (d.type) bits.push(d.type);
                if (d.slot) bits.push(d.slot);
                if (d.ac !== undefined && d.ac !== null && d.ac !== '') bits.push(`AC ${d.ac}`);
                if (d.damage) bits.push(`${d.damage}${d.bonus ? `+${d.bonus}` : ''}`);
                if (Array.isArray(d.extras)) d.extras.forEach(e => bits.push(`+${e.dice} ${e.type}`));
                if (d.bonuses && Object.keys(d.bonuses).length) bits.push(Object.entries(d.bonuses).map(([k,v])=>`${k}:${v}`).join(','));
                return (
                  <div style={{flexBasis:'100%',paddingLeft:22,paddingBottom:3}}>
                    {bits.length > 0 && <div style={{fontSize:10,color:colors.goldFaint,lineHeight:1.4}}>{bits.join(' · ')}</div>}
                    {d.label && <div style={{fontSize:10,color:colors.textDim,lineHeight:1.4}}>{d.label}</div>}
                  </div>
                );
              })()}
            </div>
          );
                })}
              </div>
            );
          });
        })()}
      </div>

      <div style={{display:'flex',gap:4}}>
        <button onClick={propose} disabled={busy || selCount === 0}
          style={{...btn(false), flex:1, opacity:(busy||selCount===0)?0.4:1}}>
          {busy ? '…' : `🔧 WHAT DO I GET BACK?${selCount ? ` (${selCount})` : ''}`}
        </button>
        {(selCount > 0 || result || status) && (
          <button onClick={()=>{ setSelected({}); setDraft({}); setResult(null); setStatus(''); setFilter(''); }}
            title="Clear the result and deselect everything"
            style={{...btn(false), flexShrink:0, fontSize:11, padding:'0 9px'}}>✕</button>
        )}
      </div>
      {status && <div style={{fontSize:12,color:status.startsWith('✗')?'#c96a4c':colors.goldFaint,marginTop:6,lineHeight:1.4}}>{status}</div>}

      {result && (
        <div style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:8,marginTop:6}}>
          <div style={{fontFamily:fonts.display,fontSize:12,color:colors.gold,marginBottom:4}}>RECOVERS</div>
          {(result.recovers || []).length === 0
            ? <div style={{fontSize:11,color:colors.textDead,fontStyle:'italic',marginBottom:6}}>Nothing usable.</div>
            : <div style={{fontSize:12,color:colors.text,marginBottom:6,lineHeight:1.5}}>
                {result.recovers.map(r => `${r.name}${r.count > 1 ? ` x${r.count}` : ''}`).join(', ')}
              </div>}
          {result.note && <div style={{fontSize:10,color:colors.textGhost,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>{result.note}</div>}
          <div style={{fontSize:10,color:'#c96a4c',marginBottom:6,lineHeight:1.4}}>
            Destroys: {submitted().map(i => `${i.name}${i.count > 1 ? ` x${i.count}` : ''}`).join(', ')}
          </div>
          <button onClick={confirm} style={{...btn(true), width:'100%', fontSize:11, padding:'4px 0'}}>✓ BREAK IT DOWN</button>
        </div>
      )}
    </CollapsibleSection>
  );
}

// ── Bio editor: view/edit the player's backstory (the DM's behavior anchor) ────
