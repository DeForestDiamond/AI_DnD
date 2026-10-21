import { callGptStoryEntry, callGptArchive, callGptMemory } from '../openai/history.js';
import { callGrokStoryEntry, callGrokArchive, callGrokMemory } from '../xai/history.js';
import { callAnthropicStoryEntry, callAnthropicArchive, callAnthropicMemory } from '../anthropic/history.js';
import { parseSummary, serializeSummary, formatSummaryForApi, coveredMessageCount, coverageFor, memoryRequest, parseMemoryReply, transcript, legacyHistoryStart } from './memory.js';
export { parseSummary, serializeSummary, formatSummaryForApi, coveredMessageCount, legacyHistoryStart } from './memory.js';

// Manager is recreated by React renders. Keep task ownership on the stable ref,
// so an old request cannot overwrite a loaded save, edited log or mode switch.
const owners = new WeakMap();
export const createSummaryManager = ({ lastSummarizedAt, storySummaryRef, setStorySummary, charRef, fullLogRef, save, selectedModel, MODEL_CONFIGS, apiKey, openAiApiKey, xAiApiKey, log, logUsage, SUMMARIZE_AFTER, KEEP_RECENT, ENTRIES_BEFORE_COMPRESS, COMPRESS_KEEP_RECENT_ENTRIES }) => {
  if (!owners.has(storySummaryRef)) owners.set(storySummaryRef,{ task:null, generation:0 });
  const owner = owners.get(storySummaryRef);
  const invalidate = () => { owner.generation++; owner.task = null; };
  const persist = obj => {
    const serialized = serializeSummary(obj);
    storySummaryRef.current = serialized;
    setStorySummary(serialized);
    save.autoSave(charRef.current,fullLogRef.current);
  };
  const initSummarizedAt = (loadedMsgCount, loadedSummary = '', messages = fullLogRef.current) => {
    invalidate();
    const obj = parseSummary(loadedSummary);
    const covered = coveredMessageCount(obj,messages);
    if (obj.coverage && covered === null) {
      // Edited/truncated history invalidates derived memory. Preserve it as a
      // recovery copy, but never send facts from the abandoned timeline.
      persist({chunks:[],entries:[],memoryMode:obj.memoryMode,
        recoverySources:{chunks:obj.chunks,entries:obj.entries,memory:obj.memory}});
    }
    // Legacy files have no exact boundary. This is a scheduling hint ONLY;
    // App keeps their whole raw history available until bootstrap succeeds.
    lastSummarizedAt.current = covered === null ? 0 : Math.min(loadedMsgCount,covered) + KEEP_RECENT;
    log(`[SUMMARY] Initialized committed coverage: ${covered === null ? 'legacy/unknown; rebuild pending' : covered} (${loadedMsgCount} msgs loaded)`);
  };
  const toggleSummaryEntry = id => {
    invalidate();
    const obj = parseSummary(storySummaryRef.current);
    const flip = arr => arr.map(x => x.id === id ? {...x,excluded:!x.excluded} : x);
    // A source exclusion must not remain embedded in a previously built memory.
    persist({...obj,chunks:flip(obj.chunks),entries:flip(obj.entries),memory:null});
  };
  const toggleMemoryMode = () => {
    invalidate();
    const obj = parseSummary(storySummaryRef.current);
    const legacy = obj.memoryMode !== 'legacy';
    // Keep source records and exact coverage in either mode. Re-enabling builds
    // a fresh memory rather than reviving an out-of-date cached version.
    persist({...obj,memoryMode:legacy?'legacy':'layered',memory:null});
    log(`[SUMMARY] ${legacy ? 'Original archive' : 'Layered memory'} mode selected`);
  };

  const providerCall = async (kind,args) => {
    const config = MODEL_CONFIGS[selectedModel] || {};
    const env = import.meta.env || {};
    let result;
    if (config.provider === 'openai') result = await ({entry:callGptStoryEntry,archive:callGptArchive,memory:callGptMemory}[kind])({...args,apiKey:openAiApiKey || env.VITE_OPENAI_KEY,model:config.model});
    else if (config.provider === 'xai') result = await ({entry:callGrokStoryEntry,archive:callGrokArchive,memory:callGrokMemory}[kind])({...args,apiKey:xAiApiKey || env.VITE_XAI_KEY,model:config.model});
    else result = await ({entry:callAnthropicStoryEntry,archive:callAnthropicArchive,memory:callAnthropicMemory}[kind])({...args,apiKey:apiKey || env.VITE_ANTHROPIC_KEY});
    if (result.usage) logUsage?.(kind === 'memory' ? 'campaign memory' : `${kind} summary`,{usage:result.usage});
    if (!result.text?.trim()) throw new Error('Empty summary response');
    return result.text;
  };

  const maybeAutoSummarize = async allMessages => {
    if (owner.task || allMessages.length < SUMMARIZE_AFTER) return;
    const originalRaw = storySummaryRef.current;
    const obj = parseSummary(originalRaw);
    const knownCount = coveredMessageCount(obj,allMessages);
    const layered = obj.memoryMode !== 'legacy';
    const start = knownCount ?? (!layered && originalRaw ? legacyHistoryStart(obj,allMessages.length,SUMMARIZE_AFTER,KEEP_RECENT,ENTRIES_BEFORE_COMPRESS-COMPRESS_KEEP_RECENT_ENTRIES) : 0);
    const end = Math.max(0,allMessages.length-KEEP_RECENT);
    const bootstrap = layered && !obj.memory;
    if ((!bootstrap && end <= start) || end === 0 || (!bootstrap && knownCount !== null && end-start < SUMMARIZE_AFTER)) return;
    const task = { generation:owner.generation };
    owner.task = task;
    const valid = () => owner.task === task && owner.generation === task.generation && storySummaryRef.current === originalRaw && allMessages.slice(0,end).every((m,i) => fullLogRef.current[i]?.id === m.id && fullLogRef.current[i]?.text === m.text && fullLogRef.current[i]?.role === m.role);
    log(`[SUMMARY] ${bootstrap?'Building layered memory':layered?'Updating memory':'Writing story log'} through message ${end}`);
    try {
      let next;
      if (layered) {
        // Existing archives already cover the older history. Reconcile their
        // latest snapshots against the newest 48 messages and ALL corrections.
        // A save without summaries is summarized from the beginning.
        const bootstrapStart = bootstrap && (obj.chunks.length || obj.entries.length) ? Math.max(0,end-48) : start;
        const request = memoryRequest({obj,messages:allMessages,start:bootstrapStart,end,playerName:charRef.current?.name});
        const memory = parseMemoryReply(await providerCall('memory',request));
        next = {...obj,memoryMode:'layered',memory,
          memoryRevisions:obj.memory ? [...(obj.memoryRevisions || []).slice(-1),obj.memory] : obj.memoryRevisions || [],
          entries:[...obj.entries,{id:Date.now(),type:'entry',text:memory.recent,sourceStart:bootstrapStart,sourceEnd:end}],
          coverage:coverageFor(allMessages,end),
        };
      } else {
        // Compatibility/rollback engine, now with committed coverage and no
        // raw-entry deletion on compression failure.
        const text = await providerCall('entry',{
          playerName:charRef.current?.name || 'the adventurer',
          currentLocation:charRef.current?.currentLocation || 'unknown',
          priorSummary:formatSummaryForApi(obj),transcript:transcript(allMessages.slice(start,end)),
          followingTranscript:transcript(allMessages.slice(end)),
        });
        let entries = [...obj.entries,{id:Date.now(),type:'entry',text,sourceStart:start,sourceEnd:end}];
        let chunks = [...obj.chunks];
        const activeEntries = entries.filter(x=>!x.excluded);
        if (activeEntries.length >= ENTRIES_BEFORE_COMPRESS) {
          const sources = activeEntries.slice(0,-COMPRESS_KEEP_RECENT_ENTRIES);
          try {
            const archive = await providerCall('archive',{entriesText:sources.map(x=>x.text).join('\n\n')});
            chunks.push({id:Date.now()+1,type:'archived',sessions:`Archive ${chunks.length+1}`,text:archive,frozen:true,sourceEntries:sources});
            const archivedIds = new Set(sources.map(x=>x.id));
            entries = entries.filter(x=>!archivedIds.has(x.id));
          } catch (e) { log(`[SUMMARY] Archive failed; keeping source entries: ${e.message}`); }
        }
        next = {...obj,chunks,entries,coverage:coverageFor(allMessages,end)};
      }
      if (!valid()) { log('[SUMMARY] Discarded stale update after load/edit/history change'); return; }
      persist(next);
      lastSummarizedAt.current = end+KEEP_RECENT;
      log(`[SUMMARY] Committed coverage ${end}; memory ${next.memory ? Object.values(next.memory).join('').length+' chars' : 'original mode'}; original archives retained`);
    } catch (e) {
      log(`[SUMMARY] Update failed; prior memory and unsummarized messages retained: ${e.message}`);
    } finally {
      if (owner.task === task) owner.task = null;
    }
  };
  return {initSummarizedAt,toggleSummaryEntry,toggleMemoryMode,maybeAutoSummarize};
};
