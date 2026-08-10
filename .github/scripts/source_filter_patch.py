from pathlib import Path

p = Path('src/components/Sidebar.jsx')
s = p.read_text()

def once(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'Patch target not found: {label}')
    s = s.replace(old, new, 1)

# Persist source view independently for crafting and salvage.
once("const craftStore = { selected: persistedSel.craft || {}, intent:'', mode:'item', options:null, status:'', filter:'', showAll:false, draft:{}, infoOpen:{}, catClosed:{}, qty:'1' };",
     "const craftStore = { selected: persistedSel.craft || {}, intent:'', mode:'item', options:null, status:'', filter:'', source:'both', showAll:false, draft:{}, infoOpen:{}, catClosed:{}, qty:'1' };",
     'craft store')
once("const salvageStore = { selected: persistedSel.salvage || {}, result:null, status:'', filter:'', showAll:false, draft:{}, infoOpen:{}, catClosed:{} };",
     "const salvageStore = { selected: persistedSel.salvage || {}, result:null, status:'', filter:'', source:'both', showAll:false, draft:{}, infoOpen:{}, catClosed:{} };",
     'salvage store')

# Add state binding.
once("  const [showAll, setShowAll]   = useStored(craftStore, 'showAll');\n  const [qty, setQty]           = useStored(craftStore, 'qty');",
     "  const [showAll, setShowAll]   = useStored(craftStore, 'showAll');\n  const [source, setSource]     = useStored(craftStore, 'source');   // inventory | stash | both\n  const [qty, setQty]           = useStored(craftStore, 'qty');",
     'craft source state')
once("  const [showAll, setShowAll]   = useStored(salvageStore, 'showAll');",
     "  const [showAll, setShowAll]   = useStored(salvageStore, 'showAll');\n  const [source, setSource]     = useStored(salvageStore, 'source');   // inventory | stash | both",
     'salvage source state')

# Craft source accounting. Bag contents inherit the source of the bag definition.
old = """  const invCount = {}, stashCount = {}, bagCount = {}, bagWhere = {};
  (character.inventory || []).forEach(nm => { invCount[nm] = (invCount[nm] || 0) + 1; });
  (character.stash || []).forEach(nm => { stashCount[nm] = (stashCount[nm] || 0) + 1; });
  // Bags keep their contents in customItems[bag].contents, not the inventory
  // array — without this, anything packed away is invisible to the forge.
  ['customItems', 'stashedCustomItems'].forEach(store => {
    Object.entries(character[store] || {}).forEach(([bagName, d]) => {
      if (d?.type === 'bag' && d.contents) {
        Object.entries(d.contents).forEach(([item, ct]) => {
          if (ct > 0) { bagCount[item] = (bagCount[item] || 0) + ct; (bagWhere[item] = bagWhere[item] || []).push(bagName); }
        });
      }
    });
  });
  const allNames = [...new Set([...Object.keys(invCount), ...Object.keys(stashCount), ...Object.keys(bagCount)])];"""
new = """  const invCount = {}, stashCount = {}, bagInvCount = {}, bagStashCount = {}, bagWhere = {};
  (character.inventory || []).forEach(nm => { invCount[nm] = (invCount[nm] || 0) + 1; });
  (character.stash || []).forEach(nm => { stashCount[nm] = (stashCount[nm] || 0) + 1; });
  // Bag contents inherit the bag's source. customItems bags are carried;
  // stashedCustomItems bags are in the stash. Keep the pools separate so the
  // Inventory/Stash filter reports the real available count.
  [['customItems', bagInvCount], ['stashedCustomItems', bagStashCount]].forEach(([store, target]) => {
    Object.entries(character[store] || {}).forEach(([bagName, d]) => {
      if (d?.type === 'bag' && d.contents) {
        Object.entries(d.contents).forEach(([item, ct]) => {
          if (ct > 0) { target[item] = (target[item] || 0) + ct; (bagWhere[item] = bagWhere[item] || []).push(bagName); }
        });
      }
    });
  });
  const allNames = [...new Set([...Object.keys(invCount), ...Object.keys(stashCount), ...Object.keys(bagInvCount), ...Object.keys(bagStashCount)])];
  const sourceCount = (nm) => {
    const inv = (invCount[nm] || 0) + (bagInvCount[nm] || 0);
    const stash = (stashCount[nm] || 0) + (bagStashCount[nm] || 0);
    return source === 'inventory' ? inv : source === 'stash' ? stash : inv + stash;
  };
  const sourceNames = allNames.filter(nm => sourceCount(nm) > 0);"""
once(old, new, 'craft source accounting')

old = """  const hiddenCount = allNames.filter(nm => !isStock(nm)).length;
  const candidates = allNames
    .filter(nm => showAll || isStock(nm))
    .filter(nm => !q || nm.toLowerCase().includes(q))
    .sort((a, b) => a.localeCompare(b))
    .map(nm => [nm, (invCount[nm] || 0) + (stashCount[nm] || 0) + (bagCount[nm] || 0), {
      inv: invCount[nm] || 0,
      stash: stashCount[nm] || 0,
      bag: bagCount[nm] || 0,
      bags: bagWhere[nm] || [],
    }]);"""
new = """  const hiddenCount = sourceNames.filter(nm => !isStock(nm)).length;
  const candidates = sourceNames
    .filter(nm => showAll || isStock(nm))
    .filter(nm => !q || nm.toLowerCase().includes(q))
    .sort((a, b) => a.localeCompare(b))
    .map(nm => [nm, sourceCount(nm), {
      inv: (invCount[nm] || 0) + (bagInvCount[nm] || 0),
      stash: (stashCount[nm] || 0) + (bagStashCount[nm] || 0),
      bag: (bagInvCount[nm] || 0) + (bagStashCount[nm] || 0),
      bags: bagWhere[nm] || [],
    }]);"""
once(old, new, 'craft candidates')

# Craft source buttons after search.
old = """      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder={`Search ${candidates.length} ${showAll ? 'items' : 'materials'}…`}
        style={{...npcInput, marginBottom:4}}/>

      {hiddenCount > 0 && ("""
new = """      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder={`Search ${candidates.length} ${showAll ? 'items' : 'materials'}…`}
        style={{...npcInput, marginBottom:4}}/>

      <div style={{display:'flex',gap:4,marginBottom:6}}>
        {[['inventory','🎒 Inventory'],['stash','📦 Stash'],['both','↔ Both']].map(([id,label]) => (
          <button key={id} onClick={()=>setSource(id)}
            style={{flex:1,background:source===id?'rgba(201,168,76,0.15)':'transparent',border:`1px solid ${source===id?colors.gold:colors.borderDim}`,color:source===id?colors.gold:colors.textFaint,padding:'4px 2px',fontSize:10,fontFamily:fonts.display,borderRadius:3,cursor:'pointer'}}>
            {label}
          </button>
        ))}
      </div>

      {hiddenCount > 0 && ("""
once(old, new, 'craft source controls')

s = s.replace('Show all inventory ({hiddenCount} hidden — categories are guesses, tick this if something\'s missing)',
              'Show all items ({hiddenCount} hidden — categories are guesses, tick this if something\'s missing)', 1)
s = s.replace('No materials in inventory.', "No materials in this source.", 1)

# Craft selections only count/use stock visible in the current source, clamped to its available quantity.
once("""  const heldNames = new Set(allNames);
  const liveSelected = Object.fromEntries(
    Object.entries(selected).filter(([nm]) => heldNames.has(nm))
  );""",
     """  const heldNames = new Set(sourceNames);
  const liveSelected = Object.fromEntries(
    Object.entries(selected)
      .filter(([nm]) => heldNames.has(nm))
      .map(([nm, count]) => [nm, Math.min(count, sourceCount(nm))])
  );""",
     'craft live selection')

# Salvage source accounting.
old = """  const invCount = {}, stashCount = {}, bagCount = {}, bagWhere = {};
  (character.inventory || []).forEach(nm => { invCount[nm] = (invCount[nm] || 0) + 1; });
  (character.stash || []).forEach(nm => { stashCount[nm] = (stashCount[nm] || 0) + 1; });
  // Bag contents are salvageable too — consumption already handled them, but
  // they never appeared in the list, so they couldn't be selected.
  ['customItems', 'stashedCustomItems'].forEach(store => {
    Object.entries(character[store] || {}).forEach(([bagName, d]) => {
      if (d?.type === 'bag' && d.contents) {
        Object.entries(d.contents).forEach(([item, ct]) => {
          if (ct > 0) { bagCount[item] = (bagCount[item] || 0) + ct; (bagWhere[item] = bagWhere[item] || []).push(bagName); }
        });
      }
    });
  });
  const equipped = new Set(Object.values(character.slots || {}).filter(Boolean));
  const allNames = [...new Set([...Object.keys(invCount), ...Object.keys(stashCount), ...Object.keys(bagCount)])];"""
new = """  const invCount = {}, stashCount = {}, bagInvCount = {}, bagStashCount = {}, bagWhere = {};
  (character.inventory || []).forEach(nm => { invCount[nm] = (invCount[nm] || 0) + 1; });
  (character.stash || []).forEach(nm => { stashCount[nm] = (stashCount[nm] || 0) + 1; });
  // Bag contents inherit the source of their bag, just like the crafting list.
  [['customItems', bagInvCount], ['stashedCustomItems', bagStashCount]].forEach(([store, target]) => {
    Object.entries(character[store] || {}).forEach(([bagName, d]) => {
      if (d?.type === 'bag' && d.contents) {
        Object.entries(d.contents).forEach(([item, ct]) => {
          if (ct > 0) { target[item] = (target[item] || 0) + ct; (bagWhere[item] = bagWhere[item] || []).push(bagName); }
        });
      }
    });
  });
  const equipped = new Set(Object.values(character.slots || {}).filter(Boolean));
  const allNames = [...new Set([...Object.keys(invCount), ...Object.keys(stashCount), ...Object.keys(bagInvCount), ...Object.keys(bagStashCount)])];
  const sourceCount = (nm) => {
    const inv = (invCount[nm] || 0) + (bagInvCount[nm] || 0);
    const stash = (stashCount[nm] || 0) + (bagStashCount[nm] || 0);
    return source === 'inventory' ? inv : source === 'stash' ? stash : inv + stash;
  };
  const sourceNames = allNames.filter(nm => sourceCount(nm) > 0);"""
once(old, new, 'salvage source accounting')

old = """  const hiddenCount = allNames.filter(nm => !isSalvageable(nm) && !equipped.has(nm)).length;
  const candidates = allNames
    .filter(nm => !equipped.has(nm))                       // never offer worn gear
    .filter(nm => showAll || isSalvageable(nm))
    .filter(nm => !q || nm.toLowerCase().includes(q))
    .sort((a, b) => a.localeCompare(b))
    .map(nm => [nm, (invCount[nm] || 0) + (stashCount[nm] || 0) + (bagCount[nm] || 0),
      { stash: stashCount[nm] || 0, inv: invCount[nm] || 0, bag: bagCount[nm] || 0, bags: bagWhere[nm] || [] }]);"""
new = """  const hiddenCount = sourceNames.filter(nm => !isSalvageable(nm) && !equipped.has(nm)).length;
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
    }]);"""
once(old, new, 'salvage candidates')

# Salvage source controls after search.
old = """      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder={`Search ${candidates.length} items…`}
        style={{...npcInput, marginBottom:4}}/>

      {hiddenCount > 0 && ("""
new = """      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder={`Search ${candidates.length} items…`}
        style={{...npcInput, marginBottom:4}}/>

      <div style={{display:'flex',gap:4,marginBottom:6}}>
        {[['inventory','🎒 Inventory'],['stash','📦 Stash'],['both','↔ Both']].map(([id,label]) => (
          <button key={id} onClick={()=>setSource(id)}
            style={{flex:1,background:source===id?'rgba(201,168,76,0.15)':'transparent',border:`1px solid ${source===id?colors.gold:colors.borderDim}`,color:source===id?colors.gold:colors.textFaint,padding:'4px 2px',fontSize:10,fontFamily:fonts.display,borderRadius:3,cursor:'pointer'}}>
            {label}
          </button>
        ))}
      </div>

      {hiddenCount > 0 && ("""
once(old, new, 'salvage source controls')
s = s.replace('Show all inventory ({hiddenCount} hidden)', 'Show all items ({hiddenCount} hidden)', 1)

# Salvage selections follow current source and clamp quantity.
once("""  const heldNames = new Set(allNames);
  const liveSelected = Object.fromEntries(
    Object.entries(selected).filter(([nm]) => heldNames.has(nm))
  );""",
     """  const heldNames = new Set(sourceNames);
  const liveSelected = Object.fromEntries(
    Object.entries(selected)
      .filter(([nm]) => heldNames.has(nm))
      .map(([nm, count]) => [nm, Math.min(count, sourceCount(nm))])
  );""",
     'salvage live selection')

p.write_text(s)
