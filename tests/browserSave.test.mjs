import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createBrowserSaveStore } from '../src/helpers/browserSave.js';

const state = count => ({_type:'fullsave',character:{name:'Cassian',items:{}},messages:Array.from({length:count},(_,id)=>({id,text:'Campaign event'})),storySummary:'Current memory',tokenCostLog:[{cost:2}],settings:{selectedModel:'test'},cacheStateSnapshot:{key:'test'}});
function storage(limit=Infinity) {
  const values=new Map();
  return {getItem:key=>values.get(key)||null,removeItem:key=>values.delete(key),setItem:(key,value)=>{
    if(value.length>limit) throw new DOMException('Quota exceeded','QuotaExceededError');
    values.set(key,value);
  }};
}
test('134-message legacy save advances to a complete 378-message save beyond localStorage quota',async()=>{
  const local=storage(50000),db=new IDBFactory();
  local.setItem('dnd-autosave',JSON.stringify(state(134)));
  const store=createBrowserSaveStore({getDB:()=>db,getStorage:()=>local});
  assert.equal((await store.load()).messages.length,134);
  const latest=state(378);latest.character.description='x'.repeat(6*1024*1024);
  const result=await store.save(latest);
  assert.equal(result.backend,'indexedDB');
  assert.equal(local.getItem('dnd-autosave'),null);
  const reopened=createBrowserSaveStore({getDB:()=>db,getStorage:()=>local});
  const loaded=await reopened.load();
  assert.equal(loaded.messages.length,378);
  assert.equal(loaded.character.description,latest.character.description);
  assert.deepEqual(loaded.tokenCostLog,latest.tokenCostLog);
  assert.deepEqual(loaded.cacheStateSnapshot,latest.cacheStateSnapshot);
  assert.equal(loaded.storySummary,latest.storySummary);
  assert.ok(loaded._savedAt);
});
test('rapid saves are serialized and snapshot mutable inputs at enqueue time',async()=>{
  const store=createBrowserSaveStore({getDB:()=>new IDBFactory(),getStorage:()=>storage()});
  const first=state(134),latest=state(378);
  const a=store.save(first),b=store.save(latest);
  latest.messages.length=0;latest.character.name='Wrong later mutation';
  await Promise.all([a,b]);
  const saved=await store.load();
  assert.equal(saved.messages.length,378);
  assert.equal(saved.character.name,'Cassian');
});
test('database failure uses legacy storage, while a quota failure is reported and preserves the prior save',async()=>{
  const local=storage(50000);
  local.setItem('dnd-autosave',JSON.stringify(state(134)));
  const store=createBrowserSaveStore({getDB:()=>undefined,getStorage:()=>local});
  const latest=state(378);latest.character.description='x'.repeat(100000);
  await assert.rejects(store.save(latest),/Browser autosave failed.*previous save was kept/);
  assert.equal((await store.load()).messages.length,134);
  const result=await store.save(state(378));
  assert.equal(result.backend,'localStorage');
  assert.equal((await store.load()).messages.length,378);
});
test('a newer fallback snapshot wins over an older database snapshot',async()=>{
  const db=new IDBFactory(),local=storage();
  const store=createBrowserSaveStore({getDB:()=>db,getStorage:()=>local});
  const older=await store.save(state(134));
  local.setItem('dnd-autosave',JSON.stringify({...state(378),_savedAt:older.state._savedAt+1}));
  assert.equal((await store.load()).messages.length,378);
});
test('transaction abort plus full fallback retains the last committed database save',async()=>{
  const api=new IDBFactory(),local=storage(1);
  const store=createBrowserSaveStore({getDB:()=>api,getStorage:()=>local});
  await store.save(state(134));
  const opened=await new Promise((resolve,reject)=>{
    const r=api.open('dnd-campaign-saves',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  const prototype=Object.getPrototypeOf(opened),original=prototype.transaction;
  prototype.transaction=function(...args){
    const tx=original.apply(this,args);
    if(args[1]==='readwrite') queueMicrotask(()=>tx.abort());
    return tx;
  };
  try {await assert.rejects(store.save(state(378)),/previous save was kept/);}
  finally {prototype.transaction=original;opened.close();}
  assert.equal((await store.load()).messages.length,134);
});
test('clear removes modern and legacy snapshots after queued writes finish',async()=>{
  const local=storage(),store=createBrowserSaveStore({getDB:()=>new IDBFactory(),getStorage:()=>local});
  const pending=store.save(state(378));
  const cleared=store.clear();
  await Promise.all([pending,cleared]);
  assert.equal(await store.load(),null);
});
