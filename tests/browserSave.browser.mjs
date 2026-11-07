import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
  await page.goto(base);
  await page.evaluate(async()=>{
    const {browserSaveStore}=await import('/src/helpers/browserSave.js');
    await browserSaveStore.clear();
    const make=count=>({_type:'fullsave',character:{name:'Cassian'},messages:Array.from({length:count},(_,id)=>({id,text:'Story'})),storySummary:'Memory',tokenCostLog:[{cost:2}]});
    localStorage.setItem('dnd-autosave',JSON.stringify(make(134)));
    if((await browserSaveStore.load()).messages.length!==134) throw Error('Legacy load failed');
    const large=make(378);large.character.bio='x'.repeat(8*1024*1024);
    // Real browser quota: this payload must be too large for localStorage.
    let rejected=false;
    try {localStorage.setItem('quota-probe',JSON.stringify(large));} catch {rejected=true;}
    localStorage.removeItem('quota-probe');
    if(!rejected) throw Error('Quota regression fixture did not exceed browser localStorage limit');
    const result=await browserSaveStore.save(large);
    if(result.backend!=='indexedDB') throw Error('Large save did not reach IndexedDB');
  });
  await page.reload();
  const restored=await page.evaluate(async()=>{
    const {browserSaveStore}=await import('/src/helpers/browserSave.js');
    const snapshot=await browserSaveStore.load();
    return {count:snapshot.messages.length,bioSize:snapshot.character.bio.length,memory:snapshot.storySummary,cost:snapshot.tokenCostLog[0].cost};
  });
  assert.deepEqual(restored,{count:378,bioSize:8*1024*1024,memory:'Memory',cost:2});
  // The real Save/Load modal must identify the stored snapshot before restore.
  await page.locator('input[type="password"]').first().fill('test-no-network-calls');
  await page.getByRole('button',{name:/Load \/ Import/}).click();
  await page.getByText(/378 messages/).waitFor({state:'visible'});
  assert.equal(await page.getByRole('button',{name:/Restore Autosave/}).isEnabled(),true);
  console.log('Real browser reload restores all 378 messages beyond localStorage quota.');
} finally {await browser.close();}
