import fs from 'node:fs';
import path from 'node:path';

const appPath = 'src/App.jsx';
let s = fs.readFileSync(appPath, 'utf8');
const ensureDir = p => fs.mkdirSync(p, { recursive: true });
const write = (p, text) => { ensureDir(path.dirname(p)); fs.writeFileSync(p, text); };
const sliceBetween = (a, b) => {
  const i=s.indexOf(a), j=s.indexOf(b,i);
  if(i<0||j<0) throw new Error(`anchor missing: ${a} / ${b}`);
  return [i,j,s.slice(i,j)];
};
const strip2 = text => text.split('\n').map(l=>l.startsWith('  ')?l.slice(2):l).join('\n');
const indent = text => text.split('\n').map(l=>l?'  '+l:'').join('\n');

write('src/helpers/debug/promptLog.js', `export const createPromptRecorder = ({ enabled = true, keepTurns = 15 } = {}) => {\n  const hashText = (t) => {\n    let h = 5381;\n    for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;\n    return \`${'${h.toString(36)}-${t.length}'}\`;\n  };\n  return (storeRef, rec) => {\n    if (!enabled) return;\n    const store = storeRef.current;\n    const blocks = { ...store.blocks };\n    const keep = (text) => { if (!text) return null; const h=hashText(text); if(!blocks[h]) blocks[h]=text; return h; };\n    const turn = { at:rec.at, model:rec.model, staticRef:keep(rec.staticBlock), itemsRef:keep(rec.itemsBlock), dynamic:rec.dynamicBlock, cachedMsgRefs:rec.cachedMessages.map(m=>({role:m.role,ref:keep(m.content)})), freshMessages:rec.freshMessages, usage:rec.usage };\n    const turns=[...store.turns,turn].slice(-keepTurns);\n    const live=new Set(); turns.forEach(t=>{ if(t.staticRef)live.add(t.staticRef); if(t.itemsRef)live.add(t.itemsRef); t.cachedMsgRefs?.forEach(m=>m.ref&&live.add(m.ref)); });\n    Object.keys(blocks).forEach(h=>{if(!live.has(h))delete blocks[h];});\n    storeRef.current={blocks,turns};\n  };\n};\n`);
write('src/helpers/debug/usage.js', `export const logHelperUsage = ({ sideCostRef, label, data, log }) => {\n  const u=data?.usage; if(!u)return;\n  const cacheRead=u.cache_read_input_tokens??0, cacheWrite=u.cache_creation_input_tokens??0, input=u.input_tokens??0, output=u.output_tokens??0;\n  const cost=(input*3+cacheWrite*3.75+cacheRead*0.30+output*15)/1e6;\n  sideCostRef.current={calls:sideCostRef.current.calls+1,cost:sideCostRef.current.cost+cost};\n  log(\`[COST] ${'${label}'}: ${'${(input+cacheRead+cacheWrite).toLocaleString()}'} in / ${'${output.toLocaleString()}'} out = $${'${cost.toFixed(4)}'}  ·  session helper total $${'${sideCostRef.current.cost.toFixed(3)}'} over ${'${sideCostRef.current.calls}'} calls\`);\n};\n`);

{
  const [i,j] = sliceBetween('  // ── Prompt log', '  const sideCostRef');
  s=s.slice(0,i)+`  // ── Prompt log ─────────────────────────────────────────────────────────────\n  const PROMPT_LOG_ENABLED = true;\n  const PROMPT_LOG_KEEP = 15;\n  const promptLogRef = useRef({ blocks: {}, turns: [] });\n  const promptRecorder = createPromptRecorder({ enabled: PROMPT_LOG_ENABLED, keepTurns: PROMPT_LOG_KEEP });\n  const recordPrompt = (rec) => promptRecorder(promptLogRef, rec);\n`+s.slice(j);
}
{
  const i=s.indexOf('  const logUsage = (label, data) => {');
  const j=s.indexOf('  const [adventureStartChar',i);
  if(i<0||j<0) throw new Error('logUsage anchors missing');
  s=s.slice(0,i)+`  const logUsage = (label, data) => logHelperUsage({ sideCostRef, label, data, log });\n`+s.slice(j);
}

{
  const [i,j,block] = sliceBetween('  const SUMMARIZE_AFTER', '  // ── NPC extraction');
  const hist=strip2(block);
  const bodyStart=hist.indexOf('const initSummarizedAt');
  const managerBody=hist.slice(bodyStart);
  write('src/helpers/history/manager.js', `import { callGptStoryEntry, callGptArchive } from '../openai/history.js';\nimport { callAnthropicStoryEntry, callAnthropicArchive } from '../anthropic/history.js';\n\nexport const parseSummary = (raw) => { if(!raw)return {chunks:[],entries:[]}; try{const p=JSON.parse(raw);if(p.chunks!==undefined)return p;}catch{} return {chunks:[],entries:[{id:1,type:'entry',text:raw}]}; };\nexport const serializeSummary = obj => JSON.stringify(obj);\nexport const formatSummaryForApi = (summaryObj) => { const activeChunks=summaryObj.chunks.filter(c=>!c.excluded), activeEntries=summaryObj.entries.filter(e=>!e.excluded); if(!activeChunks.length&&!activeEntries.length)return ''; const parts=[]; activeChunks.forEach(c=>parts.push(\`[ARCHIVED HISTORY — ${'${c.sessions}'}]\\n${'${c.text}'}\`)); activeEntries.forEach((e,i)=>parts.push(\`[RECENT SUMMARY ${'${i+1}'}]\\n${'${e.text}'}\`)); return parts.join('\\n\\n'); };\n\nexport const createSummaryManager = ({ lastSummarizedAt, storySummaryRef, setStorySummary, charRef, fullLogRef, save, selectedModel, MODEL_CONFIGS, apiKey, openAiApiKey, log, logUsage, SUMMARIZE_AFTER, KEEP_RECENT, ENTRIES_BEFORE_COMPRESS, COMPRESS_KEEP_RECENT_ENTRIES }) => {\n${indent(managerBody)}\n  return { initSummarizedAt, toggleSummaryEntry, maybeAutoSummarize };\n};\n`);
  const constants = `  const SUMMARIZE_AFTER   = 12;\n  const KEEP_RECENT       = 4;\n  const ENTRIES_BEFORE_COMPRESS = 6;\n  const COMPRESS_KEEP_RECENT_ENTRIES = 2;\n  const lastSummarizedAt = useRef(0);\n\n`;
  s=s.slice(0,i)+constants+s.slice(j);
}

{
  const [i,j,block] = sliceBetween('  // ── NPC extraction', '  // ── Crafting:');
  write('src/helpers/extraction/manager.js', `import { callGptNpcManager } from '../openai/npcs.js';\nimport { callGptTownManager } from '../openai/towns.js';\nimport { callAnthropicNpcManager } from '../anthropic/npcs.js';\nimport { callAnthropicTownManager } from '../anthropic/towns.js';\n\nexport const createExtractionManager = ({ apiKey, openAiApiKey, fullLogRef, charRef, updateChar, selectedModel, MODEL_CONFIGS, log, logUsage }) => {\n${indent(strip2(block))}\n  return { extractNPCs, extractTowns };\n};\n`);
  s=s.slice(0,i)+s.slice(j);
}

{
  const [i1,j1,b1] = sliceBetween('  // ── Crafting:', '  // ── Arc objectives');
  const [,,b2] = sliceBetween('  // Bags keep their contents', '  // The player marks the current objective complete');
  write('src/helpers/items/manager.js', `import { stackCounts, stackCount, stackHas, addStack, takeStack } from '../../utils/itemStacks.js';\nimport { pruneDeadItemDefinitions } from '../../hooks/useCharacter.js';\nimport { callGptCrafting } from '../openai/crafting.js';\nimport { callGptConsolidate, CONSOLIDATE_RULES } from '../openai/consolidate.js';\nimport { callGptSalvage } from '../openai/salvage.js';\nimport { callAnthropicCrafting } from '../anthropic/crafting.js';\nimport { callAnthropicConsolidate } from '../anthropic/consolidate.js';\nimport { callAnthropicSalvage } from '../anthropic/salvage.js';\n\nexport const createItemManager = ({ apiKey, openAiApiKey, charRef, updateChar, applyEffects, selectedModel, MODEL_CONFIGS, log, logUsage }) => {\n${indent(strip2(b1+b2))}\n  return { proposeCrafting, executeCrafting, proposeConsolidation, executeConsolidation, proposeDismantle, executeDismantle };\n};\n`);
  s=s.slice(0,i1)+s.slice(j1);
  const a=s.indexOf('  // Bags keep their contents'), b=s.indexOf('  // The player marks the current objective complete',a);
  s=s.slice(0,a)+s.slice(b);
}

const removeImports = [
  "import { callGptStoryEntry, callGptArchive } from './helpers/openai/history.js';\n",
  "import { callGptTownManager } from './helpers/openai/towns.js';\n",
  "import { callGptNpcManager } from './helpers/openai/npcs.js';\n",
  "import { callGptSalvage } from './helpers/openai/salvage.js';\n",
  "import { callGptCrafting } from './helpers/openai/crafting.js';\n",
  "import { callGptConsolidate, CONSOLIDATE_RULES } from './helpers/openai/consolidate.js';\n",
  "import { callAnthropicStoryEntry, callAnthropicArchive } from './helpers/anthropic/history.js';\n",
  "import { callAnthropicTownManager } from './helpers/anthropic/towns.js';\n",
  "import { callAnthropicNpcManager } from './helpers/anthropic/npcs.js';\n",
  "import { callAnthropicSalvage } from './helpers/anthropic/salvage.js';\n",
  "import { callAnthropicCrafting } from './helpers/anthropic/crafting.js';\n",
  "import { callAnthropicConsolidate } from './helpers/anthropic/consolidate.js';\n",
];
removeImports.forEach(x=>s=s.replace(x,''));
const importAnchor="import { armAnthropicCacheKeepWarm, cancelAnthropicCacheKeepWarm } from './helpers/anthropic/cache.js';\n";
const managerImports="import { createPromptRecorder } from './helpers/debug/promptLog.js';\nimport { logHelperUsage } from './helpers/debug/usage.js';\nimport { createSummaryManager, parseSummary, formatSummaryForApi } from './helpers/history/manager.js';\nimport { createExtractionManager } from './helpers/extraction/manager.js';\nimport { createItemManager } from './helpers/items/manager.js';\n";
if(!s.includes(importAnchor)) throw new Error('cache import anchor missing');
s=s.replace(importAnchor,importAnchor+managerImports);
s=s.replace("import { useCharacter, modStr, statMod, calcAC, equippableInSlot, allItems, levelUpsAvailable, pruneDeadItemDefinitions } from './hooks/useCharacter.js';", "import { useCharacter, modStr, statMod, calcAC, equippableInSlot, allItems, levelUpsAvailable } from './hooks/useCharacter.js';");
s=s.replace("import { stackCounts, stackCount, stackHas, addStack, takeStack } from './utils/itemStacks.js';", "import { stackCount, takeStack } from './utils/itemStacks.js';");

const saveAt=s.indexOf('  const save = useSave({');
const saveMarker='\n  });';
const saveEnd=s.indexOf(saveMarker,saveAt)+saveMarker.length;
if(saveAt<0||saveEnd<saveMarker.length) throw new Error('useSave anchor missing');
const setup=`\n\n  const { initSummarizedAt, toggleSummaryEntry, maybeAutoSummarize } = createSummaryManager({\n    lastSummarizedAt, storySummaryRef, setStorySummary, charRef, fullLogRef, save, selectedModel, MODEL_CONFIGS,\n    apiKey, openAiApiKey, log, logUsage, SUMMARIZE_AFTER, KEEP_RECENT, ENTRIES_BEFORE_COMPRESS, COMPRESS_KEEP_RECENT_ENTRIES,\n  });\n  const { extractNPCs, extractTowns } = createExtractionManager({ apiKey, openAiApiKey, fullLogRef, charRef, updateChar, selectedModel, MODEL_CONFIGS, log, logUsage });\n  const { proposeCrafting, executeCrafting, proposeConsolidation, executeConsolidation, proposeDismantle, executeDismantle } = createItemManager({ apiKey, openAiApiKey, charRef, updateChar, applyEffects, selectedModel, MODEL_CONFIGS, log, logUsage });`;
s=s.slice(0,saveEnd)+setup+s.slice(saveEnd);

fs.writeFileSync(appPath,s);
console.log(`App.jsx ${s.split('\n').length} lines after manager extraction`);