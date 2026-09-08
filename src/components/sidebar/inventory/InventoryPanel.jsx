import { useState } from 'react';
import { colors, fonts, btn } from '../../../styles/theme.js';
import { stackInventory } from '../../../hooks/useGame.js';
import { stackCount, stackHas } from '../../../utils/itemStacks.js';
import { CollapsibleSection, npcInput } from '../common/index.jsx';
import { categorizeItem, CATEGORY_META } from './categorization.js';

const iconBtn = {
  background:'transparent', border:`1px solid ${colors.borderDim}`, color:colors.textDead,
  fontSize:9, padding:'1px 4px', borderRadius:2, cursor:'pointer', flexShrink:0, lineHeight:1.4,
};
const delBtn = {
  background:'transparent', border:`1px solid ${colors.borderDim}`, color:colors.redFaint||'#8a3a3a',
  fontSize:9, padding:'1px 4px', borderRadius:2, cursor:'pointer', flexShrink:0, lineHeight:1.4,
};

// Owns every bit of UI-only inventory state. Sidebar.jsx should orchestrate tabs,
// not remember which bag row is open or which item is halfway through a rename.
export function InventoryPanel({
  character,
  db,
  onMoveToStash,
  onMoveToInventory,
  onCreateBag,
  onAddToBag,
  onRemoveFromBag,
  onDeleteItem,
  onRenameItem,
  onDeleteFromBag,
  onCycleConstructStatus,
  onPromoteConstruct,
}) {
  const [stashFilter, setStashFilter] = useState('');
  const [renaming, setRenaming] = useState(null);       // { name, draft }
  const [actionsFor, setActionsFor] = useState(null);  // row with edit/delete visible
  const [bagMode, setBagMode] = useState(false);
  const [bagSelected, setBagSelected] = useState({});  // { itemName: count }
  const [bagName, setBagName] = useState('');
  const [addingToBag, setAddingToBag] = useState(null);
  const [expandedBags, setExpandedBags] = useState({});
  const [expandedLabels, setExpandedLabels] = useState({});

  const existingBags = Object.entries(character.items || {})
    .filter(([name, v]) => v.type === 'bag' && stackHas(character.inventory, name))
    .map(([name]) => name);

  const stacked = stackInventory(character.inventory);
  const categorized = {};
  Object.entries(stacked).forEach(([name, count]) => {
    const cat = categorizeItem(name, db[name]);
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push({ name, count });
  });

  const toggleBagItemAll = (itemName, maxCount) => {
    setBagSelected(prev => {
      const next = { ...prev };
      if (next[itemName] >= maxCount) delete next[itemName];
      else next[itemName] = maxCount;
      return next;
    });
  };

  const toggleBagItem = (itemName) => {
    setBagSelected(prev => {
      const current = prev[itemName] || 0;
      const max = stackCount(character.inventory, itemName);
      if (current >= max) {
        const next = { ...prev };
        delete next[itemName];
        return next;
      }
      return { ...prev, [itemName]: current + 1 };
    });
  };

  const resetBagMode = () => {
    setBagMode(false);
    setBagSelected({});
    setBagName('');
    setAddingToBag(null);
  };

  const confirmBag = () => {
    const items = Object.entries(bagSelected)
      .filter(([, qty]) => qty > 0)
      .map(([name, qty]) => ({ name, qty }));
    if (addingToBag) onAddToBag?.(addingToBag, items);
    else {
      if (!bagName.trim()) return;
      onCreateBag?.(bagName.trim(), items);
    }
    resetBagMode();
  };

  const startAddToBag = (name) => {
    setAddingToBag(name);
    setBagMode(true);
    setBagSelected({});
  };

  const submitRename = (name) => {
    const draft = renaming?.draft?.trim();
    if (!draft) return;
    onRenameItem?.(name, draft);
    setRenaming(null);
  };

  return <>
    {bagMode && (
      <div style={{background:colors.bgDark,border:`1px solid ${colors.gold}`,borderRadius:4,padding:'8px 10px',marginBottom:8}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:10,letterSpacing:2,marginBottom:6}}>
          {addingToBag ? `ADDING TO: ${addingToBag}` : '🎒 CREATE BAG'}
        </div>
        {!addingToBag && (
          <input value={bagName} onChange={e => setBagName(e.target.value)} placeholder="Bag name..."
            style={{width:'100%',boxSizing:'border-box',background:colors.bg,border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.body,fontSize:12,padding:'4px 8px',borderRadius:3,marginBottom:6,outline:'none'}} />
        )}
        <div style={{fontSize:10,color:colors.textGhost,marginBottom:6}}>
          {Object.keys(bagSelected).length === 0
            ? 'Tap items to select · use "all" to grab a whole stack'
            : Object.entries(bagSelected).map(([n,c]) => `${n}${c>1?` x${c}`:''}`).join(', ')}
        </div>
        <div style={{display:'flex',gap:4}}>
          <button onClick={confirmBag} disabled={Object.keys(bagSelected).length === 0 || (!addingToBag && !bagName.trim())}
            style={{...btn(true),flex:2,fontSize:10,opacity:(Object.keys(bagSelected).length>0&&(addingToBag||bagName.trim()))?1:0.4}}>
            {addingToBag ? 'ADD TO BAG' : 'CREATE'}
          </button>
          <button onClick={resetBagMode} style={{...btn(false),flex:1,fontSize:10}}>CANCEL</button>
        </div>
      </div>
    )}

    {!bagMode && (
      <div style={{display:'flex',gap:4,marginBottom:6,flexWrap:'wrap'}}>
        <button onClick={()=>{setBagMode(true);setAddingToBag(null);}}
          style={{...btn(false),fontSize:9,padding:'2px 8px'}}>🎒 Create Bag</button>
        {existingBags.map(name => (
          <button key={name} onClick={() => startAddToBag(name)}
            style={{...btn(false),fontSize:9,padding:'2px 8px'}}>+ {name}</button>
        ))}
      </div>
    )}

    {Object.entries(CATEGORY_META).map(([cat, meta]) => {
      const items = (categorized[cat] || []).slice().sort((a, b) => a.name.localeCompare(b.name));
      if (items.length === 0) return null;
      return (
        <CollapsibleSection key={cat} title={meta.label} count={items.length} defaultOpen={false}>
          {onMoveToStash && !bagMode && (
            <button onClick={() => items.forEach(({ name }) => onMoveToStash(name, true))}
              title={`Move every item in ${meta.label} to stash`}
              style={{...btn(false),width:'100%',fontSize:9,padding:'3px 0',marginBottom:5}}>
              📦 MOVE ALL ${meta.label.replace(/^[^ ]+\s*/, '').toUpperCase()} TO STASH
            </button>
          )}
          {items.map(({ name, count }) => {
            const data = db[name];
            const isBag = data?.type === 'bag';
            const statLabel = data?.type==='weapon' ? `(${data.damage}${data.bonus?`+${data.bonus}`:''})`
              : data?.type==='armor' ? `(AC${data.ac})` : '';
            const fullLabel = data?.label || '';
            const selectedCount = bagSelected[name] || 0;
            const labelOpen = expandedLabels[name];
            const bagOpen = expandedBags[name];
            return (
              <div key={name} style={{borderBottom:`1px solid ${colors.borderFaint}`,
                background:bagMode&&selectedCount>0?'rgba(201,168,76,0.08)':'transparent'}}>
                <div style={{fontSize:14,color:data?colors.textFaint:colors.textGhost,padding:'3px 0',display:'flex',alignItems:'center',gap:4}}>
                  {!bagMode && (
                    <span style={{width:actionsFor===name?74:22,flexShrink:0,display:'flex',justifyContent:'flex-start',gap:3,transition:'width 0.12s'}}>
                      {actionsFor === name ? <>
                        {onRenameItem && <button title="Rename — merges with an existing item of that name"
                          onClick={() => { setRenaming({ name, draft:name }); setActionsFor(null); }} style={delBtn}>✎</button>}
                        {onDeleteItem && <button title="Delete one" onClick={() => onDeleteItem(name,false)} style={delBtn}>✕</button>}
                        {onDeleteItem && count>1 && <button title="Delete all" onClick={() => onDeleteItem(name,true)} style={delBtn}>✕✕</button>}
                      </> : (
                        <button title="Edit or delete" onClick={() => setActionsFor(name)}
                          style={{...delBtn,color:colors.textDead,borderColor:'transparent'}}>⋯</button>
                      )}
                    </span>
                  )}
                  {bagMode && !isBag && (
                    <span style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
                      <span onClick={() => toggleBagItem(name)}
                        style={{cursor:'pointer',color:selectedCount>0?colors.gold:colors.textDead,fontSize:12,width:14,textAlign:'center'}}>
                        {selectedCount>0 ? `${selectedCount}` : '○'}
                      </span>
                      {count>1 && <button title={`Select all ${count}`} onClick={() => toggleBagItemAll(name,count)}
                        style={{...iconBtn,color:selectedCount>=count?colors.gold:colors.textDead,borderColor:selectedCount>=count?colors.gold:colors.borderDim}}>all</button>}
                    </span>
                  )}
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0,cursor:(bagMode&&!isBag)?'pointer':(fullLabel?'pointer':'default')}}
                    onClick={bagMode&&!isBag ? () => toggleBagItem(name)
                      : (actionsFor ? () => setActionsFor(null)
                        : (fullLabel ? () => setExpandedLabels(p=>({...p,[name]:!p[name]})) : undefined))}>
                    {name} {statLabel && <span style={{color:colors.textDead}}>{statLabel}</span>}{fullLabel&&!labelOpen&&<span style={{color:colors.textDead}}> ⓘ</span>}
                  </span>
                  {data?.type==='construct' && onCycleConstructStatus && !bagMode && (
                    <button title="Tap to cycle: dormant → active → bound" onClick={e=>{e.stopPropagation();onCycleConstructStatus(name);}}
                      style={{flexShrink:0,background:'transparent',border:`1px solid ${(data.status||'dormant')==='active'?colors.gold:colors.borderDim}`,
                        color:(data.status||'dormant')==='active'?colors.gold:colors.textDead,fontFamily:fonts.display,fontSize:9,letterSpacing:1,padding:'1px 5px',borderRadius:3,cursor:'pointer'}}>
                      {(data.status||'dormant').toUpperCase()}
                    </button>
                  )}
                  {data?.type==='construct' && onPromoteConstruct && !bagMode && (
                    <button title="Make this a companion — gives it a full description, abilities and equipment slots"
                      onClick={e=>{e.stopPropagation();onPromoteConstruct(name);}}
                      style={{flexShrink:0,background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textFaint,fontFamily:fonts.display,fontSize:9,letterSpacing:1,padding:'1px 5px',borderRadius:3,cursor:'pointer'}}>→👥</button>
                  )}
                  {count>1 && <span style={{color:colors.gold,fontFamily:fonts.mono,fontSize:14,flexShrink:0}}>x{count}</span>}
                  {isBag && !bagMode && <span onClick={()=>setExpandedBags(p=>({...p,[name]:!p[name]}))}
                    style={{cursor:'pointer',color:colors.textDead,fontSize:10,flexShrink:0,padding:'0 2px'}}>{bagOpen?'▲':'▼'}</span>}
                  {!bagMode && onMoveToStash && <span style={{display:'flex',gap:3,flexShrink:0}}>
                    <button title="Move one to stash" onClick={() => onMoveToStash(name,false)} style={iconBtn}>📦</button>
                    {count>1 && <button title="Move all to stash" onClick={() => onMoveToStash(name,true)} style={iconBtn}>📦📦</button>}
                  </span>}
                </div>

                {renaming?.name===name && onRenameItem && (
                  <div style={{display:'flex',gap:4,padding:'4px 0 6px 8px'}}>
                    <input autoFocus value={renaming.draft}
                      onChange={e=>setRenaming({name,draft:e.target.value})}
                      onKeyDown={e=>{if(e.key==='Enter')submitRename(name);if(e.key==='Escape')setRenaming(null);}}
                      style={{...npcInput,flex:1}} />
                    <button onClick={()=>submitRename(name)} style={{...btn(true),flexShrink:0,fontSize:10,padding:'0 8px'}}>✓</button>
                    <button onClick={()=>setRenaming(null)} style={{...btn(false),flexShrink:0,fontSize:10,padding:'0 8px'}}>✕</button>
                  </div>
                )}
                {fullLabel && labelOpen && (
                  <div style={{fontSize:13,color:colors.textDead,padding:'0 0 4px 44px',lineHeight:1.4,fontStyle:'italic'}}>{fullLabel}</div>
                )}
                {isBag && bagOpen && (
                  <div style={{padding:'2px 0 6px 14px'}}>
                    {Object.keys(data.contents||{}).length===0 && <div style={{fontSize:11,color:colors.textDead,fontStyle:'italic'}}>Empty bag.</div>}
                    {Object.entries(data.contents||{}).map(([itemName,itemCount])=>{
                      const ilabel=db[itemName]?.label;
                      return <div key={itemName} style={{fontSize:13,color:colors.textDead,padding:'2px 0',display:'flex',alignItems:'center',gap:4,borderBottom:`1px solid ${colors.borderFaint}`}}>
                        {onDeleteFromBag && <span style={{width:22,flexShrink:0,display:'flex',justifyContent:'flex-start'}}>
                          <button title="Delete from bag" onClick={()=>onDeleteFromBag(name,itemName,itemCount>1?false:true)} style={delBtn}>✕</button>
                        </span>}
                        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0}}>– {itemName}{ilabel?` [${ilabel}]`:''}</span>
                        {itemCount>1 && <span style={{color:colors.goldFaint,fontFamily:fonts.mono,fontSize:13,flexShrink:0}}>x{itemCount}</span>}
                        {onRemoveFromBag && <>
                          <button title="Take one out" onClick={()=>onRemoveFromBag(name,itemName,false)} style={iconBtn}>↑</button>
                          {itemCount>1 && <button title="Take all out" onClick={()=>onRemoveFromBag(name,itemName,true)} style={iconBtn}>↑↑</button>}
                        </>}
                      </div>;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CollapsibleSection>
      );
    })}

    <StashPanel character={character} db={db} filter={stashFilter} setFilter={setStashFilter}
      expandedLabels={expandedLabels} setExpandedLabels={setExpandedLabels} onMoveToInventory={onMoveToInventory} />
  </>;
}

function StashPanel({ character, db, filter, setFilter, expandedLabels, setExpandedLabels, onMoveToInventory }) {
  const stackedStash = stackInventory(character.stash || []);
  const allEntries = Object.entries(stackedStash).sort((a,b)=>a[0].localeCompare(b[0]));
  const q = filter.trim().toLowerCase();
  const entries = q ? allEntries.filter(([name]) => name.toLowerCase().includes(q) || (db[name]?.label||'').toLowerCase().includes(q)) : allEntries;
  const groups = {};
  entries.forEach(entry => {
    const cat = categorizeItem(entry[0], db[entry[0]]);
    (groups[cat] = groups[cat] || []).push(entry);
  });

  return <CollapsibleSection title="📦 STASH" count={allEntries.length} defaultOpen={false}>
    <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>Stored items — invisible to the DM. Quest relics, old gear, keepsakes.</div>
    {allEntries.length>0 && <div style={{display:'flex',gap:4,marginBottom:6}}>
      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder={`Search ${allEntries.length} entries…`}
        style={{flex:1,minWidth:0,boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:12,padding:'5px 8px',borderRadius:4,outline:'none'}} />
      {filter && <button onClick={()=>setFilter('')} title="Clear search" style={{...btn(false),flexShrink:0,fontSize:11,padding:'0 8px'}}>✕</button>}
    </div>}
    {allEntries.length===0 && <div style={{fontSize:12,color:colors.textDead,fontStyle:'italic',padding:'2px 0'}}>Empty — move items here to hide them from the DM.</div>}
    {allEntries.length>0 && entries.length===0 && <div style={{fontSize:12,color:colors.textDead,fontStyle:'italic',padding:'2px 0'}}>No stash items match “{filter}”.</div>}
    {Object.entries(CATEGORY_META).map(([cat,meta])=>{
      const rows=groups[cat];
      if(!rows?.length)return null;
      return <CollapsibleSection key={cat+(q?':search':'')} title={meta.label} count={rows.length} defaultOpen={!!q}>
        {onMoveToInventory && <button onClick={()=>rows.forEach(([name])=>onMoveToInventory(name,true))}
          title={`Return every visible item in ${meta.label} to inventory`}
          style={{...btn(false),width:'100%',fontSize:9,padding:'3px 0',marginBottom:5}}>
          ↑ MOVE ALL ${meta.label.replace(/^[^ ]+\s*/, '').toUpperCase()} TO INVENTORY
        </button>}
        {rows.map(([name,count])=>{
          const fullLabel=db[name]?.label||'';
          const key='stash:'+name;
          const labelOpen=expandedLabels[key];
          return <div key={name} style={{borderBottom:`1px solid ${colors.borderFaint}`}}>
            <div style={{fontSize:14,color:colors.textGhost,padding:'3px 0',display:'flex',alignItems:'center',gap:4}}>
              <span style={{width:44,flexShrink:0}} />
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0,opacity:0.7,cursor:fullLabel?'pointer':'default'}}
                onClick={fullLabel?()=>setExpandedLabels(p=>({...p,[key]:!p[key]})):undefined}>
                {name}{fullLabel&&!labelOpen&&<span style={{color:colors.textDead}}> ⓘ</span>}
              </span>
              {count>1&&<span style={{color:colors.goldFaint,fontFamily:fonts.mono,fontSize:14,flexShrink:0}}>x{count}</span>}
              {onMoveToInventory&&<>
                <button title="Return one to inventory" onClick={()=>onMoveToInventory(name,false)} style={iconBtn}>↑</button>
                {count>1&&<button title="Return all to inventory" onClick={()=>onMoveToInventory(name,true)} style={iconBtn}>↑↑</button>}
              </>}
            </div>
            {fullLabel&&labelOpen&&<div style={{fontSize:13,color:colors.textDead,padding:'0 0 4px 44px',lineHeight:1.4,fontStyle:'italic'}}>{fullLabel}</div>}
          </div>;
        })}
      </CollapsibleSection>;
    })}
  </CollapsibleSection>;
}
