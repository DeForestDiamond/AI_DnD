import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { CLASSES, RACES } from '../src/constants/classes.js';
import { ADDITIONAL_PALADIN_OATHS } from '../src/constants/paladinOaths.js';
import { startingStats } from '../src/helpers/characterTools.js';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const race=RACES.find(r=>r.name === 'Aasimar'),cls=CLASSES.find(c=>c.name === 'Paladin');
const source={...structuredClone(EMPTY_CHAR),name:'Oath Test',race,cls,deity:{name:'Bane',alignment:'Lawful Evil',desc:'God of tyranny'},stats:startingStats(race,cls),level:3,xp:500,maxHp:30,hp:30,classLevels:{Paladin:3},abilities:{cantrips:[],spells:['Bless'],infusions:[]}};
const browser=await chromium.launch({headless:true});
try {
  for(const width of [320,390,1280]) {
    const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    let calls=0;await page.route(/https:\/\/api\.(anthropic\.com|openai\.com|x\.ai)\//,route=>{calls++;return route.abort();});
    for(const name of Object.keys(ADDITIONAL_PALADIN_OATHS)) {
      await page.goto(base);
      await page.locator('input[type="password"]').first().fill('test-only');
      await page.getByRole('button',{name:/Load \/ Import/}).click();
      await page.locator('input[type="file"][accept=".json"]').setInputFiles({name:'oath-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({_type:'fullsave',character:source,messages:[{id:1,role:'dm',text:'A quiet camp.'}],storySummary:''}))});
      const dialog=page.getByRole('dialog',{name:'Choose Your Paladin Path',exact:true});
      await dialog.waitFor();
      for(const original of ['Oath of Devotion','Oath of Vengeance','Oathbreaker']) assert.equal(await dialog.getByRole('button',{name:original,exact:true}).count(),1);
      for(const addition of Object.keys(ADDITIONAL_PALADIN_OATHS)) assert.equal(await dialog.getByRole('button',{name:addition,exact:true}).count(),1);
      const card=dialog.getByRole('button',{name,exact:true});
      await card.press('Enter');
      await card.getByText('Vows:',{exact:true}).waitFor();
      assert.equal(await card.getAttribute('aria-pressed'),'true');
      assert.ok((await card.innerText()).includes('Paladin 10'));
      assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth+1),false,`${name}: overflow at ${width}px`);
      if(process.env.OATH_SCREENSHOT_DIR && name === 'Oath of Conquest') {
        await mkdir(process.env.OATH_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:`${process.env.OATH_SCREENSHOT_DIR}/oath-picker-${width}.png`});
      }
      await dialog.getByRole('button',{name:'WALK THIS PATH →',exact:true}).click();
      let saved;
      for(let attempt=0;attempt<100;attempt++) {
        saved=await page.evaluate(async()=>{const {browserSaveStore}=await import('/src/helpers/browserSave.js');return (await browserSaveStore.load())?.character;});
        if(saved?.subclasses?.Paladin === name) break;
        await page.waitForTimeout(100);
      }
      assert.equal(saved?.subclasses?.Paladin,name);assert.equal(saved.deity.name,'Bane');
      const granted=await page.evaluate(async c=>{const {grantedSubclassMagic}=await import('/src/constants/abilities.js');return grantedSubclassMagic(c);},saved);
      assert.equal(granted.length,2);
    }
    assert.equal(calls,0);assert.deepEqual(errors,[]);
    console.log(`Paladin oaths: all nine choices, keyboard selection, vows, level previews, six new save paths and automatic spells passed at ${width}px.`);
    await page.close();
  }
} finally {await browser.close();}
