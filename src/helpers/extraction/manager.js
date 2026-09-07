import { callGptNpcManager } from '../openai/npcs.js';
import { callGptTownManager } from '../openai/towns.js';
import { callAnthropicNpcManager } from '../anthropic/npcs.js';
import { callAnthropicTownManager } from '../anthropic/towns.js';

export const createExtractionManager = ({ apiKey, openAiApiKey, fullLogRef, charRef, updateChar, selectedModel, MODEL_CONFIGS, log, logUsage }) => {
  // ── NPC extraction ─────────────────────────────────────────────────────────
  // Player-driven: reads a range of RAW fullLog messages (primary text, not the
  // degraded summary) via a dedicated API call and writes structured entries
  // into character.npcs / character.companions. Three modes:
  //   name given, not in store  -> create
  //   name given, already exists -> update (existing entry sent for merging)
  //   name blank                 -> multi-find (all significant characters)
  const extractNPCs = async ({ name, from, to, asCompanion, note }) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    const logArr = fullLogRef.current;
    const lo = Math.max(0, Math.min(from, to));
    const hi = Math.min(logArr.length - 1, Math.max(from, to));
    if (!logArr.length || hi < lo) throw new Error('Invalid message range');
    if (hi - lo + 1 > 80) throw new Error(`Range too large (${hi - lo + 1} messages, max 80) — narrow it down`);

    const char = charRef.current;
    const playerName = char?.name || 'the player';
    const group = asCompanion ? 'companions' : 'npcs';
    const trimmedName = (name || '').trim();
    const existing = trimmedName
      ? Object.entries({ ...char.npcs, ...char.companions }).find(([n]) => n.toLowerCase() === trimmedName.toLowerCase())
      : null;

    const apiMsgs = logArr.slice(lo, hi + 1).map(m => ({
      role: m.role === 'dm' ? 'assistant' : 'user',
      content: m.text,
    }));

    log(`[NPC] Extracting ${trimmedName || 'all significant characters'} from messages #${lo}-#${hi} (${apiMsgs.length} msgs)`);
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
      const transcript = apiMsgs.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n');
      const existingRecord = existing ? { [existing[0]]: existing[1] } : null;
      const { found: gptFound, usage: gptUsage } = await callGptNpcManager({
        model: MODEL_CONFIGS[selectedModel].model,
        apiKey: gptKey, playerName, transcript, name: trimmedName, existing: existingRecord, note,
      });
      const gIn = gptUsage?.input_tokens || 0;
      const gOut = gptUsage?.output_tokens || 0;
      log(`[HELPER] NPC manager via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
      const names = Object.keys(gptFound || {});
      if (!names.length) { log('[NPC] Nothing found in range'); return { applied: [] }; }
      const c = { ...charRef.current, npcs: { ...charRef.current.npcs }, companions: { ...charRef.current.companions } };
      const applied = [];
      for (const [n, e] of Object.entries(gptFound)) {
        const entry = { location: String(e?.location ?? ''), relationship: String(e?.relationship ?? ''), desc: String(e?.desc ?? '') };
        const inComp = Object.keys(c.companions).find(k => k.toLowerCase() === n.toLowerCase());
        const inNpc = Object.keys(c.npcs).find(k => k.toLowerCase() === n.toLowerCase());
        if (inComp) c.companions[inComp] = { ...c.companions[inComp], ...entry };
        else if (inNpc && !asCompanion) c.npcs[inNpc] = { ...c.npcs[inNpc], ...entry };
        else if (inNpc && asCompanion) { c.companions[n] = { ...c.npcs[inNpc], ...entry }; delete c.npcs[inNpc]; }
        else c[group][n] = entry;
        applied.push(n);
      }
      updateChar(c);
      log(`[NPC] Saved: ${applied.join(', ')}`);
      return { applied };
    }
    const { found, usage: anthropicUsage } = await callAnthropicNpcManager({
      apiKey: key, playerName, messages: apiMsgs, name: trimmedName,
      existing: existing ? { [existing[0]]: existing[1] } : null, note,
    });
    if (anthropicUsage) logUsage('NPC extraction', { usage: anthropicUsage });
    const names = Object.keys(found);
    if (!names.length) { log('[NPC] Nothing found in range'); return { applied: [] }; }

    // Sanitize to the three core keys and write. If a name already exists in
    // the OTHER group, update it there instead of duplicating across groups.
    const c = { ...charRef.current, npcs: { ...charRef.current.npcs }, companions: { ...charRef.current.companions } };
    const applied = [];
    for (const [n, e] of Object.entries(found)) {
      const entry = {
        location: String(e?.location ?? ''),
        relationship: String(e?.relationship ?? ''),
        desc: String(e?.desc ?? ''),
      };
      const inComp = Object.keys(c.companions).find(k => k.toLowerCase() === n.toLowerCase());
      const inNpc  = Object.keys(c.npcs).find(k => k.toLowerCase() === n.toLowerCase());
      if (inComp)      c.companions[inComp] = { ...c.companions[inComp], ...entry };
      else if (inNpc && !asCompanion) c.npcs[inNpc] = { ...c.npcs[inNpc], ...entry };
      else if (inNpc && asCompanion)  { c.companions[n] = { ...c.npcs[inNpc], ...entry }; delete c.npcs[inNpc]; }
      else             c[group][n] = entry;
      applied.push(n);
    }
    updateChar(c);
    log(`[NPC] Saved: ${applied.join(', ')}`);
    return { applied };
  };


  // ── Town/location extraction — same pattern as extractNPCs ─────────────────
  const extractTowns = async ({ name, from, to, note }) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    const logArr = fullLogRef.current;
    const lo = Math.max(0, Math.min(from, to));
    const hi = Math.min(logArr.length - 1, Math.max(from, to));
    if (!logArr.length || hi < lo) throw new Error('Invalid message range');
    if (hi - lo + 1 > 80) throw new Error(`Range too large (${hi - lo + 1} messages, max 80) — narrow it down`);

    const char = charRef.current;
    const playerName = char?.name || 'the player';
    const trimmedName = (name || '').trim();
    const existing = trimmedName
      ? Object.entries(char.towns || {}).find(([n]) => n.toLowerCase() === trimmedName.toLowerCase())
      : null;

    const apiMsgs = logArr.slice(lo, hi + 1).map(m => ({ role: m.role === 'dm' ? 'assistant' : 'user', content: m.text }));
    log(`[TOWN] Extracting ${trimmedName || 'all significant locations'} from messages #${lo}-#${hi}`);
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
      const transcript = apiMsgs.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n');
      const existingRecord = existing ? { [existing[0]]: existing[1] } : null;
      const { found: gptFound, usage: gptUsage } = await callGptTownManager({
        model: MODEL_CONFIGS[selectedModel].model,
        apiKey: gptKey, playerName, transcript, name: trimmedName, existing: existingRecord, note,
      });
      const gIn = gptUsage?.input_tokens || 0;
      const gOut = gptUsage?.output_tokens || 0;
      log(`[HELPER] town manager via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
      if (!Object.keys(gptFound || {}).length) { log('[TOWN] Nothing found in range'); return { applied: [] }; }
      const c = { ...charRef.current, towns: { ...charRef.current.towns } };
      const applied = [];
      const asDict = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
      for (const [n, e] of Object.entries(gptFound)) {
        const entry = { desc: String(e?.desc ?? ''), status: String(e?.status ?? ''), notable_locations: asDict(e?.notable_locations), minor_residents: asDict(e?.minor_residents) };
        const hit = Object.keys(c.towns).find(k => k.toLowerCase() === n.toLowerCase());
        if (hit) c.towns[hit] = { ...c.towns[hit], ...entry };
        else c.towns[n] = entry;
        applied.push(n);
      }
      updateChar(c);
      log(`[TOWN] Saved: ${applied.join(', ')}`);
      return { applied };
    }
    const { found, usage: anthropicUsage } = await callAnthropicTownManager({
      apiKey: key, playerName, messages: apiMsgs, name: trimmedName,
      existing: existing ? { [existing[0]]: existing[1] } : null, note,
    });
    if (anthropicUsage) logUsage('town extraction', { usage: anthropicUsage });
    if (!Object.keys(found).length) { log('[TOWN] Nothing found in range'); return { applied: [] }; }

    const c = { ...charRef.current, towns: { ...charRef.current.towns } };
    const applied = [];
    const asDict = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
    for (const [n, e] of Object.entries(found)) {
      const entry = {
        desc: String(e?.desc ?? ''),
        status: String(e?.status ?? ''),
        notable_locations: asDict(e?.notable_locations),
        minor_residents: asDict(e?.minor_residents),
      };
      const hit = Object.keys(c.towns).find(k => k.toLowerCase() === n.toLowerCase());
      if (hit) c.towns[hit] = { ...c.towns[hit], ...entry };
      else c.towns[n] = entry;
      applied.push(n);
    }
    updateChar(c);
    log(`[TOWN] Saved: ${applied.join(', ')}`);
    return { applied };
  };


  return { extractNPCs, extractTowns };
};
