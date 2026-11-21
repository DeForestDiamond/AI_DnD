import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { RACES, CLASSES } from '../src/constants/classes.js';
import { startingStats } from '../src/helpers/characterTools.js';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath:process.env.CHROMIUM_PATH, headless:true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  await page.route(/https:\/\/api\.(openai\.com|x\.ai)\/v1\/responses/, route =>
    route.fulfill({json:{output:[{type:'message',content:[{type:'output_text',text:'The ferry remains at the quay.'}]}],usage:{}}}));
  await page.goto(base);
  await page.getByPlaceholder('sk-...', {exact:true}).fill('test');
  await page.getByPlaceholder('xai-...').fill('test');
  await page.getByRole('button',{name:/Load \/ Import/}).click();
  const character = {...structuredClone(EMPTY_CHAR), name:'Pilot', race:RACES[0], cls:CLASSES[0],
    stats:startingStats(RACES[0],CLASSES[0]), classLevels:{Fighter:3}, level:3, hp:20, maxHp:20, pacing:'off',
    arc:{antagonist:'Smugglers',status:'active',objectives:[{text:'Legacy step A',done:false},{text:'Legacy step B',done:false}]},
    worldPressures:{ferry:{current:'The ferry is loading',next:'It departs',timing:'At noon'}}};
  const save = {_type:'fullsave', settings:{selectedModel:'terra'}, character,
    messages:[{id:1,role:'dm',text:'The ferry is loading.'}], storySummary:''};
  await page.locator('input[type="file"][accept=".json"]').setInputFiles({
    name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(save))});
  const send = async () => {
    const input = page.getByPlaceholder('What do you do?');
    await input.fill('I wait at the quay.');
    const response = page.waitForResponse(/\/v1\/responses$/);
    await input.press('Enter');
    const body = (await response).request().postDataJSON();
    return {model:body.model, message:body.input.at(-1).content[0].text};
  };
  const mark = page.getByTitle('Mark this objective complete');
  await mark.click();
  await page.getByText('Legacy step B',{exact:true}).waitFor();
  const terra = await send();
  assert.match(terra.model,/terra/);
  assert.match(terra.message,/The ferry is loading/);
  assert.doesNotMatch(terra.message,/Legacy step A|\[OBJECTIVE:/);
  await page.getByRole('button',{name:/⚙️ SET/}).click();
  await page.getByRole('button',{name:/DM: GPT Terra/}).click();
  const switched = await send();
  assert.match(switched.model,/grok/);
  assert.doesNotMatch(switched.message,/Legacy step A|\[OBJECTIVE:/);
  await mark.click();
  const grok = await send();
  assert.match(grok.message,/Legacy step B/);
  assert.match(grok.message,/set the next step toward the arc GOAL/);
  console.log('Legacy checkbox updates the record, Terra consumes the note silently, and a new Grok checkbox still sends the original directive.');
} finally {
  await browser.close();
}
