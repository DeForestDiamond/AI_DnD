import fs from 'node:fs';

const replaceOnce = (src, from, to, label) => {
  const i = src.indexOf(from);
  if (i < 0) throw new Error(`Missing ${label}`);
  if (src.indexOf(from, i + from.length) >= 0) throw new Error(`Ambiguous ${label}`);
  return src.slice(0, i) + to + src.slice(i + from.length);
};

// ── Sidebar ──────────────────────────────────────────────────────────────────
const sidePath = 'src/components/Sidebar.jsx';
let s = fs.readFileSync(sidePath, 'utf8');

s = replaceOnce(s,
`const saveSel = (craft, salvage) => {
  try { localStorage.setItem(SEL_KEY, JSON.stringify({ craft, salvage })); } catch { /* quota, ignore */ }
};
const persistedSel = loadSel();
const craftStore = { selected: persistedSel.craft || {}, intent:'', mode:'item', options:null, status:'', filter:'', source:'both', showAll:false, draft:{}, infoOpen:{}, catClosed:{}, qty:'1' };
`,
`const saveSel = (craft, salvage, consolidate) => {
  try { localStorage.setItem(SEL_KEY, JSON.stringify({ craft, salvage, consolidate })); } catch { /* quota, ignore */ }
};
const persistedSel = loadSel();
const craftStore = { selected: persistedSel.craft || {}, intent:'', mode:'item', options:null, status:'', filter:'', source:'both', showAll:false, draft:{}, infoOpen:{}, catClosed:{}, qty:'1' };
const consolidateStore = { selected: persistedSel.consolidate || {}, filter:'', source:'both', destination:'stash', draft:{}, catClosed:{}, groups:null, status:'' };
`, 'selection persistence');

s = replaceOnce(s,
`  Object.assign(craftStore, { selected:{}, intent:'', options:null, status:'', filter:'', draft:{}, qty:'1' });
  Object.assign(salvageStore, { selected:{}, result:null, status:'', filter:'', draft:{} });
  saveSel({}, {});
`,
`  Object.assign(craftStore, { selected:{}, intent:'', options:null, status:'', filter:'', draft:{}, qty:'1' });
  Object.assign(salvageStore, { selected:{}, result:null, status:'', filter:'', draft:{} });
  Object.assign(consolidateStore, { selected:{}, filter:'', draft:{}, groups:null, status:'' });
  saveSel({}, {}, {});
`, 'reset stores');

s = replaceOnce(s,
`    if (key === 'selected') saveSel(craftStore.selected, salvageStore.selected);
`,
`    if (key === 'selected') saveSel(craftStore.selected, salvageStore.selected, consolidateStore.selected);
`, 'selection write-through');

s = replaceOnce(s,
`  const toggle = (nm, max) => setSelected(prev => {
    const next = { ...prev };
    if (next[nm]) delete next[nm]; else next[nm] = max;
    return next;
  });
`,
`  const toggle = (nm, max) => setSelected(prev => {
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
`, 'craft row selection helper');

s = replaceOnce(s,
`      {hiddenCount > 0 && (
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:colors.textDim,marginBottom:6,cursor:'pointer'}}>
          <input type="checkbox" checked={showAll} onChange={()=>setShowAll(v=>!v)} style={{accentColor:colors.gold,flexShrink:0}}/>
          Show all items ({hiddenCount} hidden — categories are guesses, tick this if something's missing)
        </label>
      )}

      <div style={{maxHeight:340,overflowY:'auto',border:`,
`      {hiddenCount > 0 && (
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

      <div style={{maxHeight:340,overflowY:'auto',border:`, 'craft global select all');

s = replaceOnce(s,
`                  <span style={{fontFamily:fonts.mono,fontSize:10,color:colors.textDead}}>{rows.length} {closed ? '▼' : '▲'}</span>
`,
`                  <span style={{display:'flex',alignItems:'center',gap:5}}>
                    <button onClick={e=>{ e.stopPropagation(); toggleRows(rows); }}
                      style={{...btn(false),fontSize:8,padding:'1px 5px',lineHeight:1.3}}>
                      {picked === rows.length ? 'CLEAR' : 'ALL'}
                    </button>
                    <span style={{fontFamily:fonts.mono,fontSize:10,color:colors.textDead}}>{rows.length} {closed ? '▼' : '▲'}</span>
                  </span>
`, 'craft category select all');

const consolidateComponent = String.raw`
// ── Consolidate: deliberately collapse many named stacks into simple stock ───
function ConsolidatePanel({ character, db, onProposeConsolidation, onExecuteConsolidation }) {
  const [selected, setSelected] = useStored(consolidateStore, 'selected');
  const [filter, setFilter] = useStored(consolidateStore, 'filter');
  const [source, setSource] = useStored(consolidateStore, 'source');
  const [destination, setDestination] = useStored(consolidateStore, 'destination');
  const [draft, setDraft] = useStored(consolidateStore, 'draft');
  const [catClosed, setCatClosed] = useStored(consolidateStore, 'catClosed');
  const [groups, setGroups] = useStored(consolidateStore, 'groups');
  const [status, setStatus] = useStored(consolidateStore, 'status');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);

  const invCount = stackCounts(character.inventory);
  const stashCount = stackCounts(character.stash);
  const bagInvCount = {}, bagStashCount = {}, bagWhere = {};
  Object.entries(character.items || {}).forEach(([bagName, d]) => {
    if (d?.type !== 'bag' || !d.contents) return;
    const intoStash = stackHas(character.stash, bagName) && !stackHas(character.inventory, bagName);
    const dst = intoStash ? bagStashCount : bagInvCount;
    Object.entries(d.contents).forEach(([name, count]) => {
      if (count > 0) { dst[name] = (dst[name] || 0) + count; (bagWhere[name] = bagWhere[name] || []).push(bagName); }
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
    <CollapsibleSection title="🧹 CONSOLIDATE" count={Object.keys(liveSelected).length || undefined} defaultOpen={true}>
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

`;

const salvageMarker = 'function SalvagePanel(';
const salvagePos = s.indexOf(salvageMarker);
if (salvagePos < 0) throw new Error('Missing SalvagePanel marker');
s = s.slice(0, salvagePos) + consolidateComponent + s.slice(salvagePos);

s = replaceOnce(s,
`export function Sidebar({ character, onSlotClick, onCompanionSlotClick, onCompanionUnequip, onSaveClick, onClose, onAbilitiesClick, onMoveToStash, onMoveToInventory, onBankCoins, onWithdrawCoins, onCreateBag, onAddToBag, onRemoveFromBag, onDeleteItem, onRenameItem, onDeleteFromBag, selectedModel, onToggleModel, pacing, onTogglePacing, environment, onChangeEnvironment, arcAntagonist, arcLocation, onClearArc, onRollArc, onSetArc, adventure, onClearAdventure, onRollAdventure, onToggleContextExclusion, onExtractNPC, onExtractTown, onSaveNPC, onDeleteNPC, onSaveBio, onStartNewCampaign, arcObjectives, arcGoal, onSetArcGoal, onGenerateObjectives, onSetObjectives, disposition, onSaveDisposition, defeatedAntagonists, onReviveAntagonist, completedAdventures, onRestoreAdventure, onCycleConstructStatus, onPromoteConstruct, onProposeCrafting, onExecuteCrafting, onProposeDismantle, onExecuteDismantle, voiceSettings, showRawTags, onToggleRawTags, debugLog, debugStatus, onExportDebug, onCopyDebug, directives, onChangeDirectives, levelUpsAvailable=0, onLevelClassSelect, onLevelStatSelect }) {`,
`export function Sidebar({ character, onSlotClick, onCompanionSlotClick, onCompanionUnequip, onSaveClick, onClose, onAbilitiesClick, onMoveToStash, onMoveToInventory, onBankCoins, onWithdrawCoins, onCreateBag, onAddToBag, onRemoveFromBag, onDeleteItem, onRenameItem, onDeleteFromBag, selectedModel, onToggleModel, pacing, onTogglePacing, environment, onChangeEnvironment, arcAntagonist, arcLocation, onClearArc, onRollArc, onSetArc, adventure, onClearAdventure, onRollAdventure, onToggleContextExclusion, onExtractNPC, onExtractTown, onSaveNPC, onDeleteNPC, onSaveBio, onStartNewCampaign, arcObjectives, arcGoal, onSetArcGoal, onGenerateObjectives, onSetObjectives, disposition, onSaveDisposition, defeatedAntagonists, onReviveAntagonist, completedAdventures, onRestoreAdventure, onCycleConstructStatus, onPromoteConstruct, onProposeCrafting, onExecuteCrafting, onProposeConsolidation, onExecuteConsolidation, onProposeDismantle, onExecuteDismantle, voiceSettings, showRawTags, onToggleRawTags, debugLog, debugStatus, onExportDebug, onCopyDebug, directives, onChangeDirectives, levelUpsAvailable=0, onLevelClassSelect, onLevelStatSelect }) {`, 'Sidebar props');

s = replaceOnce(s,
`      {/* Salvage — break items back into materials */}
      {onProposeDismantle && (
`,
`      {/* Consolidate — collapse verbose material variants into one stack */}
      {onExecuteConsolidation && (
        <ConsolidatePanel character={character} db={db} onProposeConsolidation={onProposeConsolidation} onExecuteConsolidation={onExecuteConsolidation} />
      )}

      {/* Salvage — break items back into materials */}
      {onProposeDismantle && (
`, 'ConsolidatePanel render');

fs.writeFileSync(sidePath, s);

// ── App ──────────────────────────────────────────────────────────────────────
const appPath = 'src/App.jsx';
let a = fs.readFileSync(appPath, 'utf8');
a = replaceOnce(a,
`import { callGptCrafting } from './helpers/openai/crafting.js';
`,
`import { callGptCrafting } from './helpers/openai/crafting.js';
import { callGptConsolidate, CONSOLIDATE_RULES } from './helpers/openai/consolidate.js';
`, 'consolidate import');

const appFns = String.raw`
  // ── Inventory consolidation: intentionally erase distinctions between stacks ─
  const proposeConsolidation = async ({ items }) => {
    if (!items?.length) throw new Error('Select at least two stacks');
    const selected = new Map(items.map(x => [x.name, Math.max(1, Number(x.count) || 1)]));
    const itemsText = items.map(x => `${x.name} x${x.count}`).join('\n');
    let rawGroups = [];
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
      const out = await callGptConsolidate({ model: MODEL_CONFIGS[selectedModel].model, apiKey: gptKey, itemsText });
      rawGroups = out.groups || [];
      const u = out.usage || {};
      log(`[HELPER] smart grouping via GPT ${(u.input_tokens || 0).toLocaleString()} in / ${(u.output_tokens || 0).toLocaleString()} out`);
    } else {
      const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:5000, system:CONSOLIDATE_RULES,
          messages:[{role:'user',content:`SELECTED STACKS:\n${itemsText}\n\nReturn ONLY JSON: {"groups":[{"name":"Adamantine","items":[{"name":"Adamantine Ingot","count":4},{"name":"Adamantine Stock","count":8}],"reason":"same underlying material"}]}`}]}),
      });
      if(!res.ok) throw new Error(`API error ${res.status}`);
      const data=await res.json(); logUsage('smart grouping',data);
      const raw=(data.content?.[0]?.text||'').replace(/```json|```/g,'').trim();
      try { rawGroups=JSON.parse(raw).groups||[]; } catch { throw new Error('Smart grouping returned unreadable JSON'); }
    }

    // The helper proposes only. Validate every source name/count against the exact
    // submitted selection before the UI is allowed to offer an APPLY button.
    const used = new Set();
    const groups = [];
    for (const g of rawGroups) {
      const members=[];
      for (const it of g.items || []) {
        const exact=[...selected.keys()].find(n=>canonicalItemName(n)===canonicalItemName(it.name));
        if(!exact || used.has(exact)) continue;
        const count=Math.min(selected.get(exact),Math.max(1,Number(it.count)||1));
        members.push({name:exact,count}); used.add(exact);
      }
      if(members.length>=2 && String(g.name||'').trim()) groups.push({name:String(g.name).trim(),items:members,reason:String(g.reason||'').trim()});
      else members.forEach(x=>used.delete(x.name));
    }
    log(`[CONSOLIDATE] Smart grouping proposed ${groups.length} group(s)`);
    return groups;
  };

  const executeConsolidation = ({ items, name, destination='stash' }) => {
    const c=charRef.current;
    const finalName=String(name||'').trim();
    if(!finalName) throw new Error('Result name required');
    if(!items?.length) throw new Error('Nothing selected');
    const src=materialSources(c);
    const heldNames=Object.keys(src);
    const consumes=items.map(it=>({ name:resolveHeldName(it.name,heldNames), count:Math.max(1,Number(it.count)||1) }));
    for(const it of consumes){const have=totalHeld(src[it.name]);if(have<it.count)throw new Error(`Not enough ${it.name} — need ${it.count}, have ${have}`);}
    const total=consumes.reduce((n,x)=>n+x.count,0);
    const {removeTags,apply}=consumeMaterials(c,consumes);
    let next=apply(applyEffects(removeTags,c));
    if(destination==='inventory') next={...next,inventory:addStack(next.inventory,finalName,total)};
    else next={...next,stash:addStack(next.stash,finalName,total)};
    updateChar(next);
    log(`[CONSOLIDATE] ${consumes.map(x=>`${x.name} x${x.count}`).join(', ')} -> ${finalName} x${total} (${destination})`);
    return `${finalName} ×${total.toLocaleString()} → ${destination}`;
  };

`;

const salvageComment = '  // ── Salvage: break an item down into materials ────────────────────────────';
const appInsert = a.indexOf(salvageComment);
if (appInsert < 0) throw new Error('Missing salvage insertion marker');
a = a.slice(0, appInsert) + appFns + a.slice(appInsert);

a = replaceOnce(a,
`            onProposeCrafting={proposeCrafting}
            onExecuteCrafting={executeCrafting}
`,
`            onProposeCrafting={proposeCrafting}
            onExecuteCrafting={executeCrafting}
            onProposeConsolidation={proposeConsolidation}
            onExecuteConsolidation={executeConsolidation}
`, 'Sidebar crafting props in App');

fs.writeFileSync(appPath, a);
console.log('Inventory consolidation feature applied.');
