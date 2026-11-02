// Run against `npm run dev -- --host 127.0.0.1 --port 5173`.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { craftingFixture } from './fixtures/craftingComparison.mjs';
const require=createRequire(import.meta.url);
let chromium;
try { ({chromium}=require('playwright')); }
catch { ({chromium}=createRequire(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/package.json`)('playwright')); }
const executablePath=process.env.CHROMIUM_EXECUTABLE_PATH;
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
const screenshotDir=process.env.CRAFTING_SCREENSHOT_DIR;
if(screenshotDir)await mkdir(screenshotDir,{recursive:true});
try {
  for(const width of [320,390,1280]) for(const scenario of ['single','upgrade','set','construct']) {
    const context=await browser.newContext({viewport:{width,height:900}});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const fixture=craftingFixture(scenario);
    let requests=0;
    await page.route('https://api.openai.com/v1/responses',route=>{
      requests++;
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({options:fixture.options,comparison:fixture.analysis})}]}]})});
    });
    await page.goto(`http://127.0.0.1:5173/tests/fixtures/craftingComparison.html?scenario=${scenario}`);
    await page.getByText('🔨 CRAFTING',{exact:true}).click();
    const showAll=page.getByRole('checkbox',{name:/Show all items/});
    if(await showAll.count())await showAll.check();
    await page.getByRole('button',{name:/SELECT ALL VISIBLE/}).click();
    if(scenario==='set')await page.getByRole('button',{name:/🛡️ Set/}).click();
    if(scenario==='construct')await page.getByRole('button',{name:/🗿 Construct/}).click();
    await page.getByRole('button',{name:/WHAT CAN I/}).click();
    const panel=page.getByRole('region',{name:'Crafting result comparison'});
    await panel.waitFor();
    assert.equal(requests,1);
    assert.ok((await panel.textContent()).includes('180 Divine Bones'));
    assert.ok((await panel.textContent()).includes('300 Divine Bones'));
    const comparisonY=(await panel.boundingBox()).y;
    const full=page.locator('summary').filter({hasText:'Full result description · Option 1'});
    assert.ok((await full.boundingBox()).y>comparisonY);
    assert.equal(await full.locator('..').getAttribute('open'),null);
    await full.click();
    assert.ok(await full.locator('..').getAttribute('open')!==null);
    if(scenario==='upgrade'||scenario==='set') {
      assert.ok((await panel.textContent()).includes('Base AC 21 → 20'));
      await panel.locator('summary').filter({hasText:'Full original item descriptions'}).click();
      assert.ok(await panel.getByText('Commands undead independently. Shields souls from hostile necromancy. Repairs damaged undead.',{exact:true}).isVisible());
    }
    if(scenario==='set') {
      assert.ok((await panel.textContent()).includes('whole set'));
      await panel.locator('summary').filter({hasText:'Piece-by-piece upgrade checks'}).first().click();
    }
    await panel.locator('summary').filter({hasText:'Side-by-side material costs'}).click();
    assert.ok(await panel.getByRole('table').isVisible());
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,`Overflow at ${width}/${scenario}`);
    // Keyboard-accessible native disclosure controls, including nested evidence.
    await full.focus();await page.keyboard.press('Enter');
    assert.equal(await full.locator('..').getAttribute('open'),null);
    if(screenshotDir&&['upgrade','set'].includes(scenario))await page.screenshot({path:`${screenshotDir}/${scenario}-${width}.png`,fullPage:true});
    const before=await page.evaluate(()=>structuredClone(window.__craftCharacter));
    assert.equal(before.inventory.find(m=>m.name==='Divine Bones').qty,500);
    const forge=page.getByRole('button',{name:scenario==='construct'?/RAISE IT/:scenario==='set'?/FORGE THE SET/:/FORGE THIS/}).nth(1);
    await forge.click();
    await page.getByText(/✓ Crafted/).waitFor();
    const after=await page.evaluate(()=>structuredClone(window.__craftCharacter));
    assert.equal(after.inventory.find(m=>m.name==='Divine Bones').qty,200);
    assert.equal(await panel.count(),0);
    assert.equal(requests,1);
    assert.deepEqual(errors,[]);
    console.log(`PASS ${scenario} at ${width}px: comparison, disclosures, no overflow, one request, real forging`);
    await context.close();
  }
} finally {await browser.close();}
