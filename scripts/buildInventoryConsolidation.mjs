import fs from 'node:fs';

const replaceOnce = (src, from, to, label) => {
  const i = src.indexOf(from);
  if (i < 0) throw new Error('Missing ' + label);
  if (src.indexOf(from, i + from.length) >= 0) throw new Error('Ambiguous ' + label);
  return src.slice(0, i) + to + src.slice(i + from.length);
};

const sidePath = 'src/components/Sidebar.jsx';
let s = fs.readFileSync(sidePath, 'utf8');

s = replaceOnce(s,
  "const saveSel = (craft, salvage) => {\n  try { localStorage.setItem(SEL_KEY, JSON.stringify({ craft, salvage })); } catch { /* quota, ignore */ }\n};\nconst persistedSel = loadSel();\nconst craftStore = { selected: persistedSel.craft || {}, intent:'', mode:'item', options:null, status:'', filter:'', source:'both', showAll:false, draft:{}, infoOpen:{}, catClosed:{}, qty:'1' };\n",
  "const saveSel = (craft, salvage, consolidate) => {\n  try { localStorage.setItem(SEL_KEY, JSON.stringify({ craft, salvage, consolidate })); } catch { /* quota, ignore */ }\n};\nconst persistedSel = loadSel();\nconst craftStore = { selected: persistedSel.craft || {}, intent:'', mode:'item', options:null, status:'', filter:'', source:'both', showAll:false, draft:{}, infoOpen:{}, catClosed:{}, qty:'1' };\nconst consolidateStore = { selected: persistedSel.consolidate || {}, filter:'', source:'both', destination:'stash', draft:{}, catClosed:{}, groups:null, status:'' };\n",
  'selection persistence');

s = replaceOnce(s,
  "  Object.assign(craftStore, { selected:{}, intent:'', options:null, status:'', filter:'', draft:{}, qty:'1' });\n  Object.assign(salvageStore, { selected:{}, result:null, status:'', filter:'', draft:{} });\n  saveSel({}, {});\n",
  "  Object.assign(craftStore, { selected:{}, intent:'', options:null, status:'', filter:'', draft:{}, qty:'1' });\n  Object.assign(salvageStore, { selected:{}, result:null, status:'', filter:'', draft:{} });\n  Object.assign(consolidateStore, { selected:{}, filter:'', draft:{}, groups:null, status:'' });\n  saveSel({}, {}, {});\n",
  'reset stores');

s = replaceOnce(s,
  "    if (key === 'selected') saveSel(craftStore.selected, salvageStore.selected);\n",
  "    if (key === 'selected') saveSel(craftStore.selected, salvageStore.selected, consolidateStore.selected);\n",
  'selection write-through');

s = replaceOnce(s,
  "  const toggle = (nm, max) => setSelected(prev => {\n    const next = { ...prev };\n    if (next[nm]) delete next[nm]; else next[nm] = max;\n    return next;\n  });\n",
  "  const toggle = (nm, max) => setSelected(prev => {\n    const next = { ...prev };\n    if (next[nm]) delete next[nm]; else next[nm] = max;\n    return next;\n  });\n  const toggleRows = (rows) => setSelected(prev => {\n    const next = { ...prev };\n    const allOn = rows.every(([nm]) => next[nm] !== undefined);\n    rows.forEach(([nm, max]) => { if (allOn) delete next[nm]; else next[nm] = max; });\n    return next;\n  });\n",
  'craft row selection helper');

s = replaceOnce(s,
  "      <div style={{maxHeight:340,overflowY:'auto',border:`1px solid ${colors.borderFaint}`,borderRadius:4,padding:4,marginBottom:6}}>",
  "      {candidates.length > 0 && (\n        <button onClick={()=>toggleRows(candidates)} style={{...btn(false),width:'100%',fontSize:10,padding:'4px 0',marginBottom:6}}>\n          {candidates.every(([nm]) => liveSelected[nm] !== undefined) ? '☐ CLEAR ALL VISIBLE' : '☑ SELECT ALL VISIBLE'}\n        </button>\n      )}\n\n      <div style={{maxHeight:340,overflowY:'auto',border:`1px solid ${colors.borderFaint}`,borderRadius:4,padding:4,marginBottom:6}}>",
  'craft global select all');

s = replaceOnce(s,
  "                  <span style={{fontFamily:fonts.mono,fontSize:10,color:colors.textDead}}>{rows.length} {closed ? '▼' : '▲'}</span>\n",
  "                  <span style={{display:'flex',alignItems:'center',gap:5}}>\n                    <button onClick={e=>{ e.stopPropagation(); toggleRows(rows); }} style={{...btn(false),fontSize:8,padding:'1px 5px',lineHeight:1.3}}>\n                      {picked === rows.length ? 'CLEAR' : 'ALL'}\n                    </button>\n                    <span style={{fontFamily:fonts.mono,fontSize:10,color:colors.textDead}}>{rows.length} {closed ? '▼' : '▲'}</span>\n                  </span>\n",
  'craft category select all');

const panel = fs.readFileSync('scripts/consolidate-panel.fragment', 'utf8');
const salvagePos = s.indexOf('function SalvagePanel(');
if (salvagePos < 0) throw new Error('Missing SalvagePanel marker');
s = s.slice(0, salvagePos) + panel + s.slice(salvagePos);

const oldSidebarSig = "export function Sidebar({ character, onSlotClick, onCompanionSlotClick, onCompanionUnequip, onSaveClick, onClose, onAbilitiesClick, onMoveToStash, onMoveToInventory, onBankCoins, onWithdrawCoins, onCreateBag, onAddToBag, onRemoveFromBag, onDeleteItem, onRenameItem, onDeleteFromBag, selectedModel, onToggleModel, pacing, onTogglePacing, environment, onChangeEnvironment, arcAntagonist, arcLocation, onClearArc, onRollArc, onSetArc, adventure, onClearAdventure, onRollAdventure, onToggleContextExclusion, onExtractNPC, onExtractTown, onSaveNPC, onDeleteNPC, onSaveBio, onStartNewCampaign, arcObjectives, arcGoal, onSetArcGoal, onGenerateObjectives, onSetObjectives, disposition, onSaveDisposition, defeatedAntagonists, onReviveAntagonist, completedAdventures, onRestoreAdventure, onCycleConstructStatus, onPromoteConstruct, onProposeCrafting, onExecuteCrafting, onProposeDismantle, onExecuteDismantle, voiceSettings, showRawTags, onToggleRawTags, debugLog, debugStatus, onExportDebug, onCopyDebug, directives, onChangeDirectives, levelUpsAvailable=0, onLevelClassSelect, onLevelStatSelect }) {";
const newSidebarSig = oldSidebarSig.replace('onProposeCrafting, onExecuteCrafting, onProposeDismantle', 'onProposeCrafting, onExecuteCrafting, onProposeConsolidation, onExecuteConsolidation, onProposeDismantle');
s = replaceOnce(s, oldSidebarSig, newSidebarSig, 'Sidebar props');

s = replaceOnce(s,
  "      {/* Salvage — break items back into materials */}\n      {onProposeDismantle && (\n",
  "      {/* Consolidate — collapse verbose material variants into one stack */}\n      {onExecuteConsolidation && (\n        <ConsolidatePanel character={character} db={db} onProposeConsolidation={onProposeConsolidation} onExecuteConsolidation={onExecuteConsolidation} />\n      )}\n\n      {/* Salvage — break items back into materials */}\n      {onProposeDismantle && (\n",
  'ConsolidatePanel render');

fs.writeFileSync(sidePath, s);

const appPath = 'src/App.jsx';
let a = fs.readFileSync(appPath, 'utf8');
a = replaceOnce(a,
  "import { callGptCrafting } from './helpers/openai/crafting.js';\n",
  "import { callGptCrafting } from './helpers/openai/crafting.js';\nimport { callGptConsolidate, CONSOLIDATE_RULES } from './helpers/openai/consolidate.js';\n",
  'consolidate import');

const appFns = fs.readFileSync('scripts/consolidate-app.fragment', 'utf8');
const salvageComment = '  // ── Salvage: break an item down into materials ────────────────────────────';
const appInsert = a.indexOf(salvageComment);
if (appInsert < 0) throw new Error('Missing salvage insertion marker');
a = a.slice(0, appInsert) + appFns + a.slice(appInsert);

a = replaceOnce(a,
  "            onProposeCrafting={proposeCrafting}\n            onExecuteCrafting={executeCrafting}\n",
  "            onProposeCrafting={proposeCrafting}\n            onExecuteCrafting={executeCrafting}\n            onProposeConsolidation={proposeConsolidation}\n            onExecuteConsolidation={executeConsolidation}\n",
  'Sidebar crafting props in App');

fs.writeFileSync(appPath, a);
console.log('Inventory consolidation feature applied.');
