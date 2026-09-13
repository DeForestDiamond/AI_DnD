import fs from 'node:fs';

function patch(path, edits) {
  let s = fs.readFileSync(path, 'utf8');
  for (const edit of edits) {
    const [from,to,label,expected=1] = edit;
    if (from instanceof RegExp) {
      const matches = [...s.matchAll(new RegExp(from.source, from.flags.includes('g') ? from.flags : from.flags + 'g'))];
      if (matches.length !== expected) throw new Error(`${path}: expected ${expected} ${label}, found ${matches.length}`);
      s = s.replace(from,to);
    } else {
      const n = s.split(from).length - 1;
      if (n !== expected) throw new Error(`${path}: expected ${expected} ${label}, found ${n}`);
      s = expected > 1 ? s.split(from).join(to) : s.replace(from,to);
    }
  }
  fs.writeFileSync(path,s);
}

patch('src/App.jsx', [
  ["import { logHelperUsage } from './helpers/debug/usage.js';", "import { makeUsageEntry, snapshotCacheState, diffCacheState } from './helpers/debug/tokenCostLog.js';", 'usage import'],
  ["  const sideCostRef = useRef({ calls: 0, cost: 0 });   // running total for non-DM calls\n", "", 'side cost ref'],
  ["  // Every helper call (crafting, salvage, extraction, summaries, objectives) is\n  // a separate billed request that never appeared in the token bar. Log each\n  // one's usage and keep a session running total so costs can be traced.\n  const logUsage = (label, data) => logHelperUsage({ sideCostRef, label, data, log });\n", "", 'old helper usage logger'],
  ["  const [tokenUsage, setTokenUsage]     = useState(null);\n  const storySummaryRef = useRef('');", "  const [tokenCostLog, setTokenCostLog] = useState([]);\n  const tokenCostLogRef = useRef([]);\n  const cacheStateRef = useRef(null);\n  const storySummaryRef = useRef('');", 'token state'],
  ["  const voice = useVoice();\n  const { callDM, buildActionContext, interceptRollRequest, pingCache } = useGame({ charRef, apiKey, openAiApiKey, xAiApiKey });", `  const voice = useVoice();
  const { callDM, buildActionContext, interceptRollRequest, pingCache } = useGame({ charRef, apiKey, openAiApiKey, xAiApiKey });

  const appendTokenCostEntry = (requestType, data, { includeCacheChanges=false, modelKey=selectedModel } = {}) => {
    if (!data) return null;
    const modelConfig = MODEL_CONFIGS[modelKey] || MODEL_CONFIGS[selectedModel];
    const snapshot = snapshotCacheState(charRef.current, storySummaryRef.current);
    const changes = includeCacheChanges ? diffCacheState(cacheStateRef.current, snapshot) : [];
    const entry = makeUsageEntry({ modelKey, modelConfig, requestType, data, changes });
    if (includeCacheChanges) cacheStateRef.current = snapshot;
    setTokenCostLog(prev => {
      const next = [...prev, entry];
      tokenCostLogRef.current = next;
      return next;
    });
    return entry;
  };

  // Helper calls are billed too, but do not themselves consume the DM cache.
  // Their resulting state mutations (summary, NPC extraction, crafting, etc.) are
  // detected against the last gameplay snapshot on the next DM request.
  const logUsage = (label, data) => appendTokenCostEntry(label, data);`, 'usage recorder'],
  ["  const applyLoadedFull = (char, msgs, summary = '', settings = null) => {", "  const applyLoadedFull = (char, msgs, summary = '', settings = null, savedTokenCostLog = [], savedCacheState = null) => {", 'full load signature'],
  ["    setStorySummary(summary);\n    storySummaryRef.current = summary;", "    setStorySummary(summary);\n    storySummaryRef.current = summary;\n    setTokenCostLog(savedTokenCostLog); tokenCostLogRef.current = savedTokenCostLog;\n    cacheStateRef.current = savedCacheState;", 'restore telemetry'],
  ["    debugLogRef,\n    promptLogRef,", "    debugLogRef,\n    promptLogRef,\n    tokenCostLogRef,\n    cacheStateRef,", 'save refs'],
  ["      if (dmUsage) setTokenUsage(dmUsage);", "      if (dmUsage) appendTokenCostEntry('gameplay', dmUsage, { includeCacheChanges:true });", 'first DM usage'],
  ["        if (followUpUsage) setTokenUsage(followUpUsage);", "        if (followUpUsage) appendTokenCostEntry('roll follow-up', followUpUsage, { includeCacheChanges:true });", 'followup usage'],
  ["            debugLog={debugLog}\n", "            debugLog={debugLog}\n            tokenCostLog={tokenCostLog}\n", 'sidebar token prop'],
  ["          tokenUsage={tokenUsage}\n          selectedModel={selectedModel}", "          selectedModel={selectedModel}", 'input token prop'],
]);

patch('src/hooks/useSave.js', [
  ["tokenCostLogRef, pendingCacheChangesRef,", "tokenCostLogRef, cacheStateRef,", 'save arg rename'],
  ["pendingCacheChanges: pendingCacheChangesRef?.current || [],", "cacheStateSnapshot: cacheStateRef?.current || null,", 'cache snapshot fields', 2],
  ["state.pendingCacheChanges || []", "state.cacheStateSnapshot || null", 'load snapshot'],
]);

patch('src/components/InputBar.jsx', [
  ["// USD per million tokens. Cache writes are billed separately from cache reads.\n// OpenAI rates here are the standard short-context API rates used by this app's\n// explicit-cache path. Requests above the long-context threshold have different\n// pricing; normal game turns are far below it.\nconst PRICING = {\n  sonnet:   { input: 3.0, output: 15.0, cacheWrite: 3.75,  cacheRead: 0.30 },\n  haiku:    { input: 1.0, output: 5.0,  cacheWrite: 1.25,  cacheRead: 0.10 },\n  gpt:      { input: 5.0, output: 30.0, cacheWrite: 6.25,  cacheRead: 0.50 },\n  terra:    { input: 2.5, output: 15.0, cacheWrite: 3.125, cacheRead: 0.25 },\n  grok:     { input: 1.25, output: 2.50, cacheWrite: 1.25, cacheRead: 0.20 },\n  grok46:   { input: 2.00, output: 6.00, cacheWrite: 2.00, cacheRead: 0.50 },\n};\n\n", "", 'pricing table'],
  ["export function InputBar({ onSend, onStop, loading, isListening, sttSupported, onMicClick, isSpeaking, voiceSupported, ttsEnabled, onToggleTts, onStopSpeaking, onReplay, tokenUsage, selectedModel })", "export function InputBar({ onSend, onStop, loading, isListening, sttSupported, onMicClick, isSpeaking, voiceSupported, ttsEnabled, onToggleTts, onStopSpeaking, onReplay, selectedModel })", 'input signature'],
  [/\n      \{tokenUsage && \(\(\) => \{[\s\S]*?\n      \}\)\(\)\}/m, "", 'token display'],
]);

patch('src/components/Sidebar.jsx', [
  ["        debugLog={props.debugLog}\n", "        tokenCostLog={props.tokenCostLog}\n        debugLog={props.debugLog}\n", 'sidebar viewer prop'],
]);

patch('src/components/sidebar/SettingsPanel.jsx', [
  ["import { VoiceSettings, DispositionEditor, ObjectivesPanel, DirectivesEditor, DebugViewer } from './settings/Controls.jsx';", "import { VoiceSettings, DispositionEditor, ObjectivesPanel, DirectivesEditor, DebugViewer } from './settings/Controls.jsx';\nimport { TokenCostViewer } from './settings/TokenCostViewer.jsx';", 'viewer import'],
  ["  debugLog,\n", "  tokenCostLog,\n  debugLog,\n", 'viewer prop'],
  ["    {onChangeDirectives && <DirectivesEditor directives={directives} onChangeDirectives={onChangeDirectives} />}\n    {debugLog !== undefined", "    {onChangeDirectives && <DirectivesEditor directives={directives} onChangeDirectives={onChangeDirectives} />}\n    {tokenCostLog !== undefined && <TokenCostViewer entries={tokenCostLog} />}\n    {debugLog !== undefined", 'viewer render'],
]);

console.log('Token & Cost Log patch applied');
