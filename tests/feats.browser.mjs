import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { RACES, CLASSES } from '../src/constants/classes.js';
import { startingStats } from '../src/helpers/characterTools.js';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const initial={...structuredClone(EMPTY_CHAR),name:'Feat Test',race:RACES[0],cls:CLASSES[0],stats:startingStats(RACES[0],CLASSES[0]),level:3,xp:900,maxHp:30,hp:30,classLevels:{Fighter:3},subclasses:{Fighter:'Champion'},feats:[{name:'Alert',source:'Human:1'}]};
const makeSave=character=>({_type:'fullsave',character,messages:[{id:1,role:'user',text:'Test scene'},{id:2,role:'dm',text:'The road is quiet.'}],storySummary:''});
const browser=await chromium.launch({headless:true});
try {
  for(const width of [320,390,1280]) {
    const page=await browser.newPage({viewport:{width,height:900}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    let calls=0;await page.route(/https:\/\/api\.(anthropic\.com|openai\.com|x\.ai)\//,route=>{calls++;return route.abort();});
    const load=async character=>{
      await page.goto(base);
      await page.locator('input[type="password"]').first().fill('test-only');
      await page.getByRole('button',{name:/Load \/ Import/}).click();
      await page.locator('input[type="file"][accept=".json"]').setInputFiles({name:'feat-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeSave(character)))});
      await page.getByRole('button',{name:/^⭐ LEVEL(?: ·|$)/}).click();
    };
    const saved=()=>page.evaluate(async()=>{const {browserSaveStore}=await import('/src/helpers/browserSave.js');return (await browserSaveStore.load()).character;});
    const waitForSave=async predicate=>{await page.waitForFunction(async text=>{const {browserSaveStore}=await import('/src/helpers/browserSave.js');const c=(await browserSaveStore.load())?.character;return c && Function('c',`return (${text})(c)`)(c);},predicate.toString());return saved();};
    await load(initial);
    await page.getByRole('heading',{name:'✦ FEATS · 0 available',exact:true}).waitFor();
    await page.getByText('Fighter',{exact:true}).click();
    await page.getByText('STRENGTH',{exact:true}).click();
    await page.getByRole('heading',{name:'✦ FEATS · 1 available',exact:true}).waitFor();
    const warCaster=page.getByLabel('Choose feat',{exact:true}).locator('option[value="War Caster"]');
    assert.equal(await warCaster.isDisabled(),true,await warCaster.evaluate(el=>el.outerHTML));
    await page.getByLabel('Choose feat',{exact:true}).selectOption('Tough');
    await page.getByRole('button',{name:'Take Tough',exact:true}).click();
    let c=await waitForSave(c=>c.level===4 && c.feats.some(f=>f.name==='Tough'));
    assert.equal(c.stats.str,initial.stats.str+1);assert.equal(c.xp,900);assert.equal(c.maxHp,37);assert.equal(c.hp,45);
    assert.equal(c.feats.find(f=>f.name==='Tough').source,'Fighter:4');
    // Loading the feat must not add its HP twice. Advancing again must include
    // its extra +2 current/max HP without taking another feat or spending XP.
    c.xp=1400;await load(c);
    await page.getByText('Fighter',{exact:true}).click();
    await page.getByText('STRENGTH',{exact:true}).click();
    c=await waitForSave(c=>c.level===5);
    assert.equal(c.maxHp,44);assert.equal(c.hp,54);assert.equal(c.stats.str,initial.stats.str+2);assert.equal(c.xp,1400);
    await page.getByText('Tough',{exact:true}).click();
    await page.getByRole('button',{name:'Undo Tough',exact:true}).click();
    await page.getByLabel('Choose feat',{exact:true}).selectOption('Resilient');
    await page.getByLabel('Feat ability score',{exact:true}).selectOption('con');
    await page.getByRole('button',{name:'Take Resilient',exact:true}).click();
    c=await waitForSave(c=>c.feats.some(f=>f.name==='Resilient'));
    assert.equal(c.stats.con,initial.stats.con+1);assert.equal(c.maxHp,49);assert.equal(c.hp,49);
    await load(c); // full JSON save/import preserves both choices and spent picks
    await page.getByRole('heading',{name:'✦ FEATS · 0 available',exact:true}).waitFor();
    await page.getByText('Resilient',{exact:true}).click();
    await page.getByRole('button',{name:'Undo Resilient',exact:true}).click();
    await page.getByLabel('Choose feat',{exact:true}).selectOption('Magic Initiate');
    await page.getByLabel('Feat selections',{exact:true}).fill('Wizard; Mage Hand, Fire Bolt; Shield');
    await page.getByRole('button',{name:'Take Magic Initiate',exact:true}).click();
    c=await waitForSave(c=>c.feats.some(f=>f.name==='Magic Initiate'));
    assert.equal(c.stats.con,initial.stats.con);assert.equal(c.hp,44);
    assert.equal(c.feats.find(f=>f.name==='Magic Initiate').choices,'Wizard; Mage Hand, Fire Bolt; Shield');
    const overflow=await page.locator('section[aria-labelledby="feats-title"]').evaluate(el=>el.scrollWidth>el.clientWidth+1);
    assert.equal(overflow,false,`feat panel overflow at ${width}px`);
    if(process.env.FEAT_SCREENSHOT_DIR){await mkdir(process.env.FEAT_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:`${process.env.FEAT_SCREENSHOT_DIR}/feats-${width}.png`});}
    await page.getByRole('button',{name:/⚙️ SET/}).click();
    await page.getByText('🧬 CHARACTER TOOLS',{exact:true}).click();
    await page.getByRole('button',{name:'Edit / create character',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Character Tools',exact:true});
    await dialog.getByLabel('Reset levels and class choices to level 1',{exact:true}).check();
    await dialog.getByRole('button',{name:'Apply character changes',exact:true}).click();
    c=await waitForSave(c=>c.level===1 && c.feats.length===0);
    assert.equal(c.xp,1400);assert.equal(c.stats.con,initial.stats.con);
    await page.getByRole('button',{name:/^⭐ LEVEL(?: ·|$)/}).click();
    await page.getByRole('heading',{name:'✦ FEATS · 1 available',exact:true}).waitFor();
    assert.equal(calls,0);assert.deepEqual(errors,[]);
    console.log(`Feats: additive level-up, prerequisites, Tough scaling, half-feat stats, undo, save/import, choices and reset passed at ${width}px.`);
    await page.close();
  }
} finally {await browser.close();}
