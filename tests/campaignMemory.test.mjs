import test from 'node:test';
import assert from 'node:assert/strict';
import { createSummaryManager } from '../src/helpers/history/manager.js';
import { parseSummary, formatSummaryForApi, parseMemoryReply, coverageFor, coveredMessageCount, memoryRequest, MEMORY_RULES } from '../src/helpers/history/memory.js';
import { callGptMemory } from '../src/helpers/openai/history.js';
import { callGrokMemory } from '../src/helpers/xai/history.js';
import { callAnthropicMemory } from '../src/helpers/anthropic/history.js';

const messages = count => Array.from({length:count},(_,i)=>({id:i+1,role:i%2?'dm':'user',text:`message ${i+1}`}));
const memory = () => ({continuity:'A voyage and signed contract remain pending.',history:'They planted a garden together.',recent:'They returned home.',corrections:'The death-dog incident never occurred.'});
const response = text => ({ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text}]}],usage:{input_tokens:100,output_tokens:50}})});
function harness({raw='',count=16}={}) {
  const refs = {lastSummarizedAt:{current:0},storySummaryRef:{current:raw},charRef:{current:{name:'Cassian'}},fullLogRef:{current:messages(count)}};
  const logs=[];let saved=0;
  const args={...refs,setStorySummary:()=>{},save:{autoSave:()=>saved++},selectedModel:'terra',MODEL_CONFIGS:{terra:{provider:'openai',model:'existing-model'}},openAiApiKey:'test-key',log:s=>logs.push(s),logUsage:()=>{},SUMMARIZE_AFTER:12,KEEP_RECENT:4,ENTRIES_BEFORE_COMPRESS:6,COMPRESS_KEEP_RECENT_ENTRIES:2};
  return {...refs,logs,args,manager:createSummaryManager(args),saved:()=>saved};
}

test('layered formatter sends one current memory, retaining original source records only in the save',()=>{
  const obj={chunks:[{text:'Interview at 18000',sessions:'old'}],entries:[{text:'Later hired at 30000'}],memory:memory()};
  const out=formatSummaryForApi(obj);
  assert.match(out,/LASTING STORY MEMORY/);assert.match(out,/death-dog incident never occurred/);
  assert.ok(!out.includes('Interview at 18000'));assert.ok(!out.includes('Later hired at 30000'));
  assert.match(formatSummaryForApi({...obj,memoryMode:'legacy'}),/Interview at 18000/);
  assert.equal(parseSummary('old plain text').entries[0].text,'old plain text');
});

test('coverage is exact across reload, shorter logs and edited boundary messages',()=>{
  const ms=messages(21);const obj={coverage:coverageFor(ms,13)};
  assert.equal(coveredMessageCount(obj,ms),13);
  assert.equal(coveredMessageCount(obj,ms.slice(0,12)),null);
  assert.equal(coveredMessageCount(obj,ms.map((m,i)=>i===12?{...m,text:'edited'}:m)),null);
});

test('bootstrap includes old archives, original player retcons beyond the recent boundary, and only bounded overlap',()=>{
  const ms=messages(200);ms[4].text='DM, mixed up campaigns. Disregard the death dogs.';
  const obj={chunks:[{text:'Death dogs attacked.',sessions:'old'}],entries:[]};
  const req=memoryRequest({obj,messages:ms,start:0,end:196,playerName:'Cassian'});
  assert.match(req.user,/Death dogs attacked/);assert.match(req.user,/Disregard the death dogs/);
  assert.ok(!req.user.includes('PLAYER: message 7\n'));assert.match(req.user,/PLAYER: message 149/);
  assert.match(req.user,/EVENTS AFTER THE COVERAGE BOUNDARY/);
  assert.match(MEMORY_RULES,/Quiet companionship/);assert.match(MEMORY_RULES,/every unresolved promise/);
  assert.match(MEMORY_RULES,/NPC actually learned/);assert.match(MEMORY_RULES,/Escaping a palace is not escaping its city/);
});

test('malformed or incomplete memory never passes validation',()=>{
  for(const reply of ['', 'not JSON','{}',JSON.stringify({...memory(),continuity:[]}),JSON.stringify({continuity:'',history:'',recent:'',corrections:''})]) assert.throws(()=>parseMemoryReply(reply));
  assert.deepEqual(parseMemoryReply('```json\n'+JSON.stringify(memory())+'\n```'),memory());
});

test('a pending update keeps committed coverage unchanged; rerenders cannot start duplicate jobs',async()=>{
  const oldFetch=global.fetch;let release;const wait=new Promise(r=>release=r);let calls=0;
  global.fetch=async()=>{calls++;await wait;return response(JSON.stringify(memory()));};
  try {
    const h=harness();const pending=h.manager.maybeAutoSummarize(h.fullLogRef.current);
    assert.equal(h.lastSummarizedAt.current,0);assert.equal(h.storySummaryRef.current,'');
    await createSummaryManager(h.args).maybeAutoSummarize(h.fullLogRef.current);assert.equal(calls,1);
    release();await pending;
    const result=parseSummary(h.storySummaryRef.current);
    assert.equal(result.coverage.count,12);assert.equal(h.lastSummarizedAt.current,16);assert.equal(h.saved(),1);
    // Saving/reloading seven unsummarized messages must not round coverage up.
    const reloaded=harness({raw:h.storySummaryRef.current,count:19});
    reloaded.manager.initSummarizedAt(19,reloaded.storySummaryRef.current,reloaded.fullLogRef.current);
    assert.equal(reloaded.lastSummarizedAt.current,16);
    assert.equal(coveredMessageCount(parseSummary(reloaded.storySummaryRef.current),reloaded.fullLogRef.current),12);
  } finally {global.fetch=oldFetch;}
});

test('failed updates retain prior memory and raw tail and can be retried',async()=>{
  const oldFetch=global.fetch;global.fetch=async()=>response('{broken');
  try {
    const h=harness();await h.manager.maybeAutoSummarize(h.fullLogRef.current);
    assert.equal(h.storySummaryRef.current,'');assert.equal(h.lastSummarizedAt.current,0);assert.equal(h.fullLogRef.current.length,16);
    global.fetch=async()=>response(JSON.stringify(memory()));await h.manager.maybeAutoSummarize(h.fullLogRef.current);
    assert.equal(parseSummary(h.storySummaryRef.current).coverage.count,12);
  } finally {global.fetch=oldFetch;}
});

test('a late reply cannot overwrite a different loaded save',async()=>{
  const oldFetch=global.fetch;let release;const wait=new Promise(r=>release=r);
  global.fetch=async()=>{await wait;return response(JSON.stringify(memory()));};
  try {
    const h=harness();const pending=h.manager.maybeAutoSummarize(h.fullLogRef.current);
    h.storySummaryRef.current='another campaign';h.fullLogRef.current=messages(3);
    createSummaryManager(h.args).initSummarizedAt(3,'another campaign',h.fullLogRef.current);
    release();await pending;assert.equal(h.storySummaryRef.current,'another campaign');assert.equal(h.saved(),0);
  } finally {global.fetch=oldFetch;}
});

test('editing covered history preserves a recovery copy and stops sending the abandoned timeline',()=>{
  const ms=messages(16);const obj={chunks:[],entries:[{text:'old scene'}],memory:memory(),coverage:coverageFor(ms,12)};
  const h=harness({raw:JSON.stringify(obj)});h.fullLogRef.current=h.fullLogRef.current.slice(0,5);
  h.manager.initSummarizedAt(5,h.storySummaryRef.current,h.fullLogRef.current);
  const after=parseSummary(h.storySummaryRef.current);
  assert.deepEqual(after.recoverySources.memory,memory());assert.equal(formatSummaryForApi(after),'');
});

test('switching modes retains source records and forces fresh reconciliation when re-enabled',async()=>{
  const oldFetch=global.fetch;global.fetch=async()=>response(JSON.stringify(memory()));
  try {
    const raw=JSON.stringify({chunks:[{id:1,text:'Original archive',sessions:'1'}],entries:[]});
    const h=harness({raw});await h.manager.maybeAutoSummarize(h.fullLogRef.current);
    assert.equal(parseSummary(h.storySummaryRef.current).chunks[0].text,'Original archive');
    h.manager.toggleMemoryMode();assert.match(formatSummaryForApi(parseSummary(h.storySummaryRef.current)),/Original archive/);
    h.manager.toggleMemoryMode();assert.equal(parseSummary(h.storySummaryRef.current).memory,null);
    await h.manager.maybeAutoSummarize(h.fullLogRef.current);assert.deepEqual(parseSummary(h.storySummaryRef.current).memory,memory());
  } finally {global.fetch=oldFetch;}
});

test('excluding a retained source invalidates derived memory rather than leaving it in the prompt',()=>{
  const h=harness({raw:JSON.stringify({chunks:[{id:1,text:'discard me'}],entries:[],memory:memory()})});
  h.manager.toggleSummaryEntry(1);const result=parseSummary(h.storySummaryRef.current);
  assert.equal(result.memory,null);assert.equal(result.chunks[0].excluded,true);assert.equal(formatSummaryForApi(result),'');
});

test('all three provider memory helpers carry the same protocol and reject truncated output',async()=>{
  const oldFetch=global.fetch;const sent=[];
  global.fetch=async(url,init)=>{sent.push([url,JSON.parse(init.body)]);return url.includes('anthropic')?{ok:true,json:async()=>({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(memory())}]})}:response(JSON.stringify(memory()));};
  try {
    const args={apiKey:'test',model:'existing-model',developer:MEMORY_RULES,user:'current evidence'};
    for(const call of [callGptMemory,callGrokMemory,callAnthropicMemory]) assert.deepEqual(parseMemoryReply((await call(args)).text),memory());
    assert.equal(sent[0][1].input[0].content[0].text,MEMORY_RULES);assert.equal(sent[1][1].input[0].content[0].text,MEMORY_RULES);assert.equal(sent[2][1].system,MEMORY_RULES);
    global.fetch=async()=>({ok:true,json:async()=>({stop_reason:'max_tokens',content:[{type:'text',text:JSON.stringify(memory())}]})});
    await assert.rejects(callAnthropicMemory(args),/incomplete/);
    global.fetch=async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})});
    await assert.rejects(callGptMemory(args),/incomplete/);await assert.rejects(callGrokMemory(args),/incomplete/);
  } finally {global.fetch=oldFetch;}
});

test('successive updates summarize only the new committed interval',async()=>{
  const oldFetch=global.fetch;const requests=[];
  global.fetch=async(url,init)=>{requests.push(JSON.parse(init.body).input[1].content[0].text);return response(JSON.stringify(memory()));};
  try {
    const h=harness();await h.manager.maybeAutoSummarize(h.fullLogRef.current);
    h.fullLogRef.current=messages(28);await createSummaryManager(h.args).maybeAutoSummarize(h.fullLogRef.current);
    const target=requests[1].split('MESSAGES TO INCORPORATE:')[1].split('PLAYER CORRECTIONS')[0];
    assert.match(target,/PLAYER: message 13/);assert.match(target,/DM: message 24/);
    assert.ok(!target.includes('PLAYER: message 1\n'));assert.ok(!target.includes('PLAYER: message 25'));
    assert.equal(parseSummary(h.storySummaryRef.current).coverage.count,24);
    assert.equal(parseSummary(h.storySummaryRef.current).entries.length,2);
  } finally {global.fetch=oldFetch;}
});

test('original-mode archive failure retains entries and their exact coverage',async()=>{
  const oldFetch=global.fetch;let calls=0;
  global.fetch=async()=>{calls++;if(calls===2)throw Error('archive unavailable');return response('New story entry');};
  try {
    const ms=messages(28);
    const obj={chunks:[],entries:Array.from({length:5},(_,i)=>({id:100+i,text:`entry ${i}`})),memoryMode:'legacy',coverage:coverageFor(ms,12)};
    const h=harness({raw:JSON.stringify(obj),count:28});await h.manager.maybeAutoSummarize(h.fullLogRef.current);
    const out=parseSummary(h.storySummaryRef.current);
    assert.equal(out.entries.length,6);assert.equal(out.chunks.length,0);assert.equal(out.coverage.count,24);
  } finally {global.fetch=oldFetch;}
});
