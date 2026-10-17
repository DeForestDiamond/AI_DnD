import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useGame, MODEL_CONFIGS } from '../src/hooks/useGame.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { DM_CAPTURE_KEY, createDMCaptureFetch, summarizeDMRequest, capturedInputTokens, exportDMRequest, formatDMRequest } from '../src/helpers/debug/dmRequestCapture.js';
import { installOpenAiImageInterceptor, setPersistentOpenAiMaps, setPendingOpenAiImage } from '../src/helpers/openai/pendingImage.js';
import { installXaiImageInterceptor, setPersistentXaiMaps, setPendingXaiImage } from '../src/helpers/xai/pendingImage.js';

test('all six DM transports capture the exact sent body, including injected maps and turn images', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const records = [];
  const sent = [];
  globalThis.window = globalThis;
  globalThis.fetch = createDMCaptureFetch(async (url, init) => {
    assert.equal(init[DM_CAPTURE_KEY], undefined);
    sent.push(init.body);
    const anthropic = url.includes('anthropic');
    return new Response(JSON.stringify(anthropic ? {
      content:[{type:'text',text:'The door opens.'}],usage:{input_tokens:20,cache_read_input_tokens:50,cache_creation_input_tokens:10,output_tokens:5},
    } : {output:[{type:'message',content:[{type:'output_text',text:'The door opens.'}]}],usage:{input_tokens:80,input_tokens_details:{cached_tokens:50},output_tokens:5}}), {status:200});
  });
  installOpenAiImageInterceptor();
  installXaiImageInterceptor();
  setPersistentOpenAiMaps([{name:'Map',dataUrl:'data:image/png;base64,MAP'}]);
  setPersistentXaiMaps([{name:'Map',dataUrl:'data:image/png;base64,MAP'}]);
  let game;
  function Harness() {
    game=useGame({charRef:{current:{...structuredClone(EMPTY_CHAR),name:'Test'}},apiKey:'secret-anthropic',openAiApiKey:'secret-openai',xAiApiKey:'secret-xai',onRequestCapture:rec=>records.push(rec)});
    return null;
  }
  renderToString(React.createElement(Harness));
  try {
    for(const model of Object.values(MODEL_CONFIGS)) {
      if(model.provider==='openai') setPendingOpenAiImage({dataUrl:'data:image/png;base64,TURN'});
      if(model.provider==='xai') setPendingXaiImage({dataUrl:'data:image/png;base64,TURN'});
      const result=await game.callDM([{role:'user',content:'Open the door.'}],{static:'Rules sentinel',gear:'Gear sentinel',items:'Items sentinel',dynamic:'Current state sentinel'},model);
      assert.equal(result.text,'The door opens.');
      const captured=records[records.length-1];
      assert.equal(captured.body,sent[sent.length-1]);
      const exported=JSON.stringify(exportDMRequest(captured));
      for(const sentinel of ['Rules sentinel','Gear sentinel','Items sentinel','Current state sentinel','Open the door.']) assert.ok(exported.includes(sentinel));
      assert.ok(!exported.includes('secret-'));
      const images = model.provider==='openai' || model.provider==='xai' ? 2 : 0;
      assert.equal(captured.breakdown.images,images);
      if(images) {assert.ok(exported.includes('base64,MAP'));assert.ok(exported.includes('base64,TURN'));}
      assert.match(formatDMRequest(captured),/COMPLETE OUTGOING JSON BODY/);
    }
    // Response-clone reading runs independently and must not consume narration.
    await new Promise(resolve=>setTimeout(resolve,30));
    for(const id of new Set(records.map(r=>r.id))) {
      const last=records.filter(r=>r.id===id).at(-1);
      assert.equal(capturedInputTokens(last),80);
    }
  } finally {
    setPersistentOpenAiMaps([]);setPersistentXaiMaps([]);
    globalThis.fetch=originalFetch;
    if(originalWindow===undefined) delete globalThis.window; else globalThis.window=originalWindow;
  }
});

test('failed and aborted requests remain exportable before any response', async () => {
  for(const name of ['Error','AbortError']) {
    const records=[];
    const failure=Object.assign(new Error('network failed'),{name});
    const send=createDMCaptureFetch(async()=>{throw failure;});
    await assert.rejects(send('https://api.anthropic.com/v1/messages',{
      body:JSON.stringify({model:'test',system:'Full rules',messages:[{role:'user',content:'Act'}]}),
      [DM_CAPTURE_KEY]:{provider:'anthropic',onCapture:rec=>records.push(rec)},
    }),failure);
    assert.equal(records[0].status,'sending');
    assert.equal(records.at(-1).status,name==='AbortError'?'aborted':'failed');
    assert.match(formatDMRequest(records.at(-1)),/Full rules/);
  }
});

test('section estimates count every text character once and exclude image encodings', () => {
  const body={input:[{role:'developer',content:[{type:'input_text',text:'Rules'},{type:'input_text',text:'Gear'}]},
    {role:'user',content:[{type:'input_text',text:'Act\n\nState'},{type:'input_image',image_url:'data:image/png;base64,NOT_TEXT'}]}]};
  const summary=summarizeDMRequest(body,{'Rules / character / world':'Rules','Equipped gear / constructs':'Gear','Current state':'State'});
  assert.equal(summary.characters,'RulesGearAct\n\nState'.length);
  assert.equal(summary.images,1);
  assert.equal(summary.sections.at(-1).label,'Current state');
  assert.equal(summary.sections.reduce((n,s)=>n+s.characters,0),summary.characters);
});

test('unmarked helper requests pass through untouched', async () => {
  const init={body:'a helper body',headers:{Authorization:'secret'}};
  let passed;
  const send=createDMCaptureFetch(async (_url, options)=>{passed=options;return 'ok';});
  assert.equal(await send('helper',init),'ok');
  assert.equal(passed,init);
});
