import { callGptStoryEntry, callGptArchive } from '../openai/history.js';
import { callGrokStoryEntry, callGrokArchive } from '../xai/history.js';
import { callAnthropicStoryEntry, callAnthropicArchive } from '../anthropic/history.js';

export const parseSummary = (raw) => { if(!raw)return {chunks:[],entries:[]}; try{const p=JSON.parse(raw);if(p.chunks!==undefined)return p;}catch{} return {chunks:[],entries:[{id:1,type:'entry',text:raw}]}; };
export const serializeSummary = obj => JSON.stringify(obj);
export const formatSummaryForApi = (summaryObj) => { const activeChunks=summaryObj.chunks.filter(c=>!c.excluded), activeEntries=summaryObj.entries.filter(e=>!e.excluded); if(!activeChunks.length&&!activeEntries.length)return ''; const parts=[]; activeChunks.forEach(c=>parts.push(`[ARCHIVED HISTORY — ${c.sessions}]\n${c.text}`)); activeEntries.forEach((e,i)=>parts.push(`[RECENT SUMMARY ${i+1}]\n${e.text}`)); return parts.join('\n\n'); };

export const createSummaryManager = ({ lastSummarizedAt, storySummaryRef, setStorySummary, charRef, fullLogRef, save, selectedModel, MODEL_CONFIGS, apiKey, openAiApiKey, xAiApiKey, log, logUsage, SUMMARIZE_AFTER, KEEP_RECENT, ENTRIES_BEFORE_COMPRESS, COMPRESS_KEEP_RECENT_ENTRIES }) => {
  const initSummarizedAt = (loadedMsgCount, loadedSummary = '') => {
    if (loadedSummary) {
      // If we have an existing summary, calculate how many messages it covers
      // so we don't re-summarize already-covered content
      const obj = parseSummary(loadedSummary);
      // Each archived chunk absorbed the oldest entries minus the ones kept raw
      const entriesPerChunk = ENTRIES_BEFORE_COMPRESS - COMPRESS_KEEP_RECENT_ENTRIES;
      const summarizedEntries = (obj.chunks.length * entriesPerChunk) + obj.entries.length;
      // Each entry corresponds to one summarization fire, which happens every SUMMARIZE_AFTER messages
      const summarizedMsgCount = summarizedEntries * SUMMARIZE_AFTER;
      // Set to whichever is higher — summary coverage or message count rounded down
      lastSummarizedAt.current = Math.max(
        summarizedMsgCount,
        Math.floor(loadedMsgCount / SUMMARIZE_AFTER) * SUMMARIZE_AFTER
      );
    } else {
      lastSummarizedAt.current = Math.floor(loadedMsgCount / SUMMARIZE_AFTER) * SUMMARIZE_AFTER;
    }
    log(`[SUMMARY] Initialized lastSummarizedAt to ${lastSummarizedAt.current} (${loadedMsgCount} msgs loaded)`);
  };

  // Parse storySummary — handles both new JSON format and legacy plain string
  const parseSummary = (raw) => {
    if (!raw) return { chunks: [], entries: [] };
    try {
      const parsed = JSON.parse(raw);
      if (parsed.chunks !== undefined) return parsed;
    } catch {}
    // Legacy plain string — wrap as a single entry
    return { chunks: [], entries: [{ id: 1, type: 'entry', text: raw }] };
  };

  const serializeSummary = (obj) => JSON.stringify(obj);

  // Build the labeled context block sent to Haiku
  const formatSummaryForApi = (summaryObj) => {
    const { chunks, entries } = summaryObj;
    // Manually-archived (unchecked) entries are excluded from what the DM sees.
    const activeChunks  = chunks.filter(c => !c.excluded);
    const activeEntries = entries.filter(e => !e.excluded);
    if (activeChunks.length === 0 && activeEntries.length === 0) return '';
    const parts = [];
    activeChunks.forEach(chunk => {
      parts.push(`[ARCHIVED HISTORY — ${chunk.sessions}]\n${chunk.text}`);
    });
    activeEntries.forEach((entry, i) => {
      parts.push(`[RECENT SUMMARY ${i + 1}]\n${entry.text}`);
    });
    return parts.join('\n\n');
  };

  // Toggle a summary entry/chunk on or off (off = not sent to the DM). Persists in the save.
  const toggleSummaryEntry = (id) => {
    const obj = parseSummary(storySummaryRef.current);
    const flip = arr => arr.map(x => x.id === id ? { ...x, excluded: !x.excluded } : x);
    const serialized = serializeSummary({ chunks: flip(obj.chunks), entries: flip(obj.entries) });
    setStorySummary(serialized);
    storySummaryRef.current = serialized;
  };

  // Compress oldest entries into a frozen chunk
  const compressEntries = async (entriesToCompress, sessionLabel, key) => {
    log(`[SUMMARY] Compressing ${entriesToCompress.length} entries into archived chunk (${sessionLabel})`);
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      try {
        const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
        const { text: gptArchiveText, usage: gptArchiveUsage } = await callGptArchive({
        model: MODEL_CONFIGS[selectedModel].model,
          apiKey: gptKey,
          entriesText: entriesToCompress.map(e => e.text).join('\n\n'),
        });
        const gIn = gptArchiveUsage?.input_tokens || 0;
        const gOut = gptArchiveUsage?.output_tokens || 0;
        log(`[HELPER] archive via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
        log(`[SUMMARY] Archived chunk created: ${gptArchiveText.length} chars`);
        return gptArchiveText;
      } catch (e) {
        log('[SUMMARY] GPT compression failed: ' + e.message);
        return entriesToCompress.map(e => e.text).join('\n\n');
      }
    }
    if (MODEL_CONFIGS[selectedModel]?.provider === 'xai') {
      try {
        const xaiKey = xAiApiKey || import.meta.env.VITE_XAI_KEY;
        const { text: grokArchiveText, usage: grokArchiveUsage } = await callGrokArchive({
          model: MODEL_CONFIGS[selectedModel].model,
          apiKey: xaiKey,
          entriesText: entriesToCompress.map(e => e.text).join('\n\n'),
        });
        log(`[HELPER] archive via Grok ${(grokArchiveUsage?.input_tokens || 0).toLocaleString()} in / ${(grokArchiveUsage?.output_tokens || 0).toLocaleString()} out`);
        log(`[SUMMARY] Archived chunk created: ${grokArchiveText.length} chars`);
        return grokArchiveText;
      } catch (e) {
        log('[SUMMARY] Grok compression failed: ' + e.message);
        return entriesToCompress.map(e => e.text).join('\n\n');
      }
    }
    try {
      const { text, usage } = await callAnthropicArchive({
        apiKey: key, entriesText: entriesToCompress.map(e => e.text).join('\n\n'),
      });
      if (usage) logUsage('archive summary', { usage });
      if (text) { log(`[SUMMARY] Archived chunk created: ${text.length} chars`); return text; }
    } catch (e) { log('[SUMMARY] Compression failed: ' + e.message); }
    // Fallback: join entries as-is
    return entriesToCompress.map(e => e.text).join('\n\n');
  };

  // Condense old messages into a rolling summary, keep recent tail verbatim
  const maybeAutoSummarize = async (allMessages) => {
    if (allMessages.length < SUMMARIZE_AFTER) return;
    const nextThreshold = lastSummarizedAt.current + SUMMARIZE_AFTER;
    if (allMessages.length < nextThreshold) {
      log(`[SUMMARY] Skipping — ${allMessages.length} msgs, next threshold: ${nextThreshold}`);
      return;
    }
    const prevSummarizedAt = lastSummarizedAt.current;
    lastSummarizedAt.current = allMessages.length;
    log(`[SUMMARY] Firing — ${allMessages.length} msgs`);

    // Only summarize messages NOT covered by previous fires. Previous coverage
    // ended at (prevSummarizedAt - KEEP_RECENT); sending the whole log again
    // just re-summarizes old events into duplicate entries at growing cost.
    const prevCovered = Math.max(0, prevSummarizedAt - KEEP_RECENT);
    const toSummarize = allMessages.slice(prevCovered, allMessages.length - KEEP_RECENT);
    if (toSummarize.length === 0) { lastSummarizedAt.current = prevSummarizedAt; return; }
    // Live summaries are working memory: give the scribe the full target messages.
    // Truncating each message destroyed exactly the location/motivation details the summary must preserve.
    const historyForSummary = toSummarize.map(m => ({
      role: m.role === 'dm' ? 'assistant' : 'user',
      content: m.text,
    }));
    const followingForSummary = allMessages.slice(allMessages.length - KEEP_RECENT).map(m => ({
      role: m.role === 'dm' ? 'assistant' : 'user',
      content: m.text,
    }));

    try {
      const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
      const currentObj = parseSummary(storySummaryRef.current);

      // Step 1 — write new entry for recent events
      let gptStoryEntry = '';
      let gptStoryUsage = null;
      let grokStoryEntry = '';
      if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
        const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
        const gptTranscript = historyForSummary.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n');
        const gptStory = await callGptStoryEntry({
        model: MODEL_CONFIGS[selectedModel].model,
          apiKey: gptKey,
          playerName: charRef.current?.name || 'the adventurer',
          currentLocation: charRef.current?.currentLocation || 'unknown',
          priorSummary: storySummaryRef.current || '',
          transcript: gptTranscript,
          followingTranscript: followingForSummary.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n'),
        });
        gptStoryEntry = gptStory.text;
        gptStoryUsage = gptStory.usage;
        const gIn = gptStoryUsage?.input_tokens || 0;
        const gOut = gptStoryUsage?.output_tokens || 0;
        log(`[HELPER] story log via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
      }
      if (MODEL_CONFIGS[selectedModel]?.provider === 'xai') {
        const xaiKey = xAiApiKey || import.meta.env.VITE_XAI_KEY;
        const transcript = historyForSummary.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n');
        const grokStory = await callGrokStoryEntry({
          model: MODEL_CONFIGS[selectedModel].model,
          apiKey: xaiKey,
          playerName: charRef.current?.name || 'the adventurer',
          currentLocation: charRef.current?.currentLocation || 'unknown',
          priorSummary: storySummaryRef.current || '',
          transcript,
          followingTranscript: followingForSummary.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n'),
        });
        grokStoryEntry = grokStory.text;
        log(`[HELPER] story log via Grok ${(grokStory.usage?.input_tokens || 0).toLocaleString()} in / ${(grokStory.usage?.output_tokens || 0).toLocaleString()} out`);
      }
      let anthropicStory = null;
      if (!gptStoryEntry && !grokStoryEntry) {
        anthropicStory = await callAnthropicStoryEntry({
          apiKey: key,
          playerName: charRef.current?.name || 'the adventurer',
          currentLocation: charRef.current?.currentLocation || 'unknown',
          priorSummary: storySummaryRef.current || '',
          transcript: historyForSummary.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n'),
          followingTranscript: followingForSummary.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n'),
        });
        if (anthropicStory.usage) logUsage('story log entry', { usage: anthropicStory.usage });
      }
      const newEntry = gptStoryEntry || grokStoryEntry || anthropicStory?.text || '';
      if (!newEntry) { lastSummarizedAt.current = prevSummarizedAt; return; }

      // From here the entry is real. Past this point we NEVER rewind
      // lastSummarizedAt — doing so would re-summarize these same messages into a
      // duplicate entry next fire. Compression is best-effort and isolated.
      const newId = Date.now();
      const updatedEntries = [...currentObj.entries, { id: newId, type: 'entry', text: newEntry }];

      let finalChunks = [...currentObj.chunks];
      let finalEntries = updatedEntries;

      if (updatedEntries.length >= ENTRIES_BEFORE_COMPRESS) {
        const toCompress = updatedEntries.slice(0, updatedEntries.length - COMPRESS_KEEP_RECENT_ENTRIES);
        const keepRaw    = updatedEntries.slice(-COMPRESS_KEEP_RECENT_ENTRIES);
        const chunkNum   = finalChunks.length + 1;
        const sessionStart = (chunkNum - 1) * toCompress.length * SUMMARIZE_AFTER + 1;
        const sessionEnd   = chunkNum * toCompress.length * SUMMARIZE_AFTER;
        const sessionLabel = `Sessions ${sessionStart}-${sessionEnd}`;
        let chunkText = '';
        try {
          chunkText = await compressEntries(toCompress, sessionLabel, key);
        } catch (ce) {
          log('[SUMMARY] Compression threw, keeping entries raw this cycle: ' + ce.message);
        }
        if (chunkText) {
          // Compression succeeded — archive the old entries, keep the newest raw
          finalChunks = [...finalChunks, { id: newId + 1, type: 'archived', sessions: sessionLabel, text: chunkText, frozen: true }];
          finalEntries = keepRaw;
          log(`[SUMMARY] New archived chunk created, ${keepRaw.length} entries remain raw`);
        }
        // If compression failed, finalEntries stays = updatedEntries (all kept raw).
        // They'll be compressed next cycle. The new entry is NOT lost or duplicated.
      }

      const finalObj = { chunks: finalChunks, entries: finalEntries };
      const serialized = serializeSummary(finalObj);
      setStorySummary(serialized);
      storySummaryRef.current = serialized;
      save.autoSave(charRef.current, fullLogRef.current);
      log(`[SUMMARY] Done — ${finalChunks.length} archived chunks, ${finalEntries.length} raw entries`);
    } catch (e) {
      // Only reached if Step 1 (the entry write) itself threw — safe to rewind
      // and retry next fire, because no entry was committed.
      lastSummarizedAt.current = prevSummarizedAt;
      log('[SUMMARY] Failed before entry committed: ' + e.message);
    }
  };


  return { initSummarizedAt, toggleSummaryEntry, maybeAutoSummarize };
};
