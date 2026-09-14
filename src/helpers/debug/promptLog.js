export const createPromptRecorder = ({ enabled = true, keepTurns = 15 } = {}) => {
  const hashText = (t) => {
    let h = 5381;
    for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
    return `${h.toString(36)}-${t.length}`;
  };
  return (storeRef, rec) => {
    if (!enabled) return;

    // Keep one ephemeral, raw copy for the token/cost logger. The normal prompt
    // log below still deduplicates large blocks; this copy is consumed once by
    // makeUsageEntry() and is never persisted by itself.
    globalThis.__aiDndLastPromptRecord = rec;

    const store = storeRef.current;
    const blocks = { ...store.blocks };
    const keep = (text) => { if (!text) return null; const h=hashText(text); if(!blocks[h]) blocks[h]=text; return h; };
    const turn = { at:rec.at, model:rec.model, staticRef:keep(rec.staticBlock), itemsRef:keep(rec.itemsBlock), dynamic:rec.dynamicBlock, cachedMsgRefs:rec.cachedMessages.map(m=>({role:m.role,ref:keep(m.content)})), freshMessages:rec.freshMessages, usage:rec.usage };
    const turns=[...store.turns,turn].slice(-keepTurns);
    const live=new Set(); turns.forEach(t=>{ if(t.staticRef)live.add(t.staticRef); if(t.itemsRef)live.add(t.itemsRef); t.cachedMsgRefs?.forEach(m=>m.ref&&live.add(m.ref)); });
    Object.keys(blocks).forEach(h=>{if(!live.has(h))delete blocks[h];});
    storeRef.current={blocks,turns};
  };
};
