import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { RACES, CLASSES } from '../src/constants/classes.js';
import { startingStats } from '../src/helpers/characterTools.js';

const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const source={...structuredClone(EMPTY_CHAR),name:'Original',race:RACES[0],cls:CLASSES[0],stats:startingStats(RACES[0],CLASSES[0]),level:5,xp:1400,hp:30,maxHp:40,classLevels:{Fighter:5},subclasses:{Fighter:'Champion'},
  inventory:[{name:'Travel Bag',qty:1}],stash:[{name:'Ancient Ingot',qty:100000}],items:{'Travel Bag':{type:'bag',contents:{'Rare Bone':200}},'Rare Bone':{type:'misc',label:'Rare source'},'Ancient Ingot':{type:'misc',label:'Old alloy'}},
  npcs:{Jessa:{desc:'Captain',relationship:'ally'}},towns:{Calimport:{desc:'Port'}},companions:{},arc:{antagonist:'Old foe',status:'active'},worldPressures:{siege:{current:'Old siege',next:'Attack',trigger:'Soon'}},
};
const snapshot={_type:'fullsave',character:source,messages:[{id:1,role:'user',text:'Prior action'},{id:2,role:'dm',text:'Prior scene'}],storySummary:''};
const browser=await chromium.launch({headless:true});
try {
  for(const width of [320,390,1280]) {
    const page=await browser.newPage({viewport:{width,height:900},acceptDownloads:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    // This feature needs no provider call. Fail any accidental paid request.
    let providerCalls=0;
    await page.route(/https:\/\/api\.(anthropic\.com|openai\.com|x\.ai)\//,route=>{providerCalls++;return route.abort();});
    const loadOriginal=async()=>{
      await page.goto(base);
      await page.locator('input[type="password"]').first().fill('test-only');
      await page.getByRole('button',{name:/Load \/ Import/}).click();
      await page.locator('input[type="file"][accept=".json"]').setInputFiles({name:'original.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(snapshot))});
      await page.getByRole('button',{name:/⚙️ SET/}).click();
      await page.getByText('🧬 CHARACTER TOOLS',{exact:true}).click();
      await page.getByRole('button',{name:'Edit / create character',exact:true}).click();
      await page.getByRole('dialog',{name:'Character Tools',exact:true}).waitFor();
    };
    const saved=()=>page.evaluate(async()=>{const {browserSaveStore}=await import('/src/helpers/browserSave.js');return browserSaveStore.load();});
    const open=()=>page.getByRole('dialog',{name:'Character Tools',exact:true});
    await loadOriginal();
    await open().getByLabel('Name',{exact:true}).fill('Cancelled');
    await open().getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByRole('button',{name:'Edit / create character',exact:true}).click();
    assert.equal(await open().getByLabel('Name',{exact:true}).inputValue(),'Original');
    const downloadEvent=page.waitForEvent('download');
    await open().getByRole('button',{name:'Download current Full Save',exact:true}).click();
    const download=await downloadEvent;
    assert.equal(JSON.parse(await readFile(await download.path(),'utf8')).character.name,'Original');
    await open().getByLabel('Name',{exact:true}).fill('Renamed');
    await open().getByRole('button',{name:'Apply character changes',exact:true}).click();
    let state=await saved();
    assert.equal(state.character.name,'Renamed');assert.equal(state.character.level,5);
    assert.equal(state.messages.length,3);assert.match(state.messages[2].text,/OOC CHARACTER SHEET UPDATE/);
    assert.equal(state.character.worldPressures.siege.current,'Old siege');

    await loadOriginal();
    await open().getByLabel('Reset levels and class choices to level 1',{exact:true}).check();
    await open().getByRole('button',{name:'Apply character changes',exact:true}).click();
    state=await saved();assert.equal(state.character.level,1);assert.equal(state.character.xp,1400);
    assert.deepEqual(state.character.classLevels,{Fighter:1});assert.deepEqual(state.character.subclasses,{});
    assert.equal(state.character.inventory[0].name,'Travel Bag');assert.equal(state.messages.length,3);

    await loadOriginal();
    await open().getByLabel('Reset levels and class choices to level 1',{exact:true}).check();
    await open().getByLabel(/Keep current XP/).uncheck();
    await open().getByRole('button',{name:'Apply character changes',exact:true}).click();
    state=await saved();assert.equal(state.character.xp,0);

    await loadOriginal();
    await open().getByLabel('Action',{exact:true}).selectOption('carry');
    await open().getByLabel('Name',{exact:true}).fill('Raphael');
    await open().getByLabel('Race',{exact:true}).selectOption('Elf');
    await open().getByLabel('Primary class',{exact:true}).selectOption('Rogue');
    for(const text of ['Carried inventory and bags','Stash and stored bags','NPC records','Town and location records']) await open().getByLabel(text,{exact:true}).check();
    const overflow=await open().evaluate(el=>el.scrollWidth>el.clientWidth+1);
    assert.equal(overflow,false,`dialog overflow at ${width}px`);
    if(process.env.CHARACTER_SCREENSHOT_DIR) {
      await mkdir(process.env.CHARACTER_SCREENSHOT_DIR,{recursive:true});
      await page.screenshot({path:`${process.env.CHARACTER_SCREENSHOT_DIR}/character-tools-${width}.png`});
    }
    await open().getByRole('button',{name:'Create character & choose opening',exact:true}).click();
    await page.getByText('🎲 How should this adventure begin?',{exact:true}).waitFor();
    state=await saved();assert.equal(state.character.name,'Raphael');assert.equal(state.character.race.name,'Elf');assert.equal(state.character.cls.name,'Rogue');
    assert.equal(state.character.level,1);assert.equal(state.character.xp,1400);
    assert.equal(state.character.items['Rare Bone'].label,'Rare source');assert.equal(state.character.stash[0].qty,100000);
    assert.ok(state.character.npcs.Jessa);assert.ok(state.character.towns.Calimport);
    assert.equal(state.character.arc,undefined);assert.equal(state.character.worldPressures,undefined);
    assert.deepEqual(state.messages,[]);assert.equal(state.storySummary,'');
    // Save/load must preserve the new sheet and must not resurrect the old timeline.
    await page.reload();
    const reloaded=await saved();assert.deepEqual(reloaded.character,state.character);assert.deepEqual(reloaded.messages,[]);

    await loadOriginal();
    await open().getByLabel('Action',{exact:true}).selectOption('fresh');
    await open().getByLabel('Name',{exact:true}).fill('Fresh');
    assert.equal(await open().getByLabel('Use new class starting equipment',{exact:true}).isChecked(),true);
    await open().getByRole('button',{name:'Create character & choose opening',exact:true}).click();
    state=await saved();assert.equal(state.character.name,'Fresh');assert.equal(state.character.xp,0);assert.equal(state.character.level,1);
    assert.deepEqual(state.character.npcs,{});assert.deepEqual(state.character.stash,[]);
    assert.equal(state.character.items['Rare Bone'],undefined);assert.equal(state.character.slots.mainhand,'Shortsword');
    assert.equal(providerCalls,0);assert.deepEqual(errors,[]);
    console.log(`Character tools: cancel, export, edit, both XP resets, carry-over, fresh start and reload passed at ${width}px.`);
    await page.close();
  }
} finally {await browser.close();}
