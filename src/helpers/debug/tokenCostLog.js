const PRICING = {
  sonnet: { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.30 },
  haiku: { input: 1.0, output: 5.0, cacheWrite: 1.25, cacheRead: 0.10 },
  gpt: { input: 5.0, output: 30.0, cacheWrite: 6.25, cacheRead: 0.50 },
  terra: { input: 2.5, output: 15.0, cacheWrite: 3.125, cacheRead: 0.25 },
  grok: { input: 1.25, output: 2.50, cacheWrite: 1.25, cacheRead: 0.20 },
  grok46: { input: 2.00, output: 6.00, cacheWrite: 2.00, cacheRead: 0.50 },
};

const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;

export function normalizeUsage(modelKey, data) {
  const u = data?.usage || data || {};
  const details = u.input_tokens_details || {};
  const cacheRead = num(u.cache_read_input_tokens ?? details.cached_tokens);
  const cacheWrite = num(u.cache_creation_input_tokens);
  const reportedInput = num(u.input_tokens ?? u.prompt_tokens);
  // Anthropic reports fresh input separately from cache tokens. OpenAI/xAI report
  // input_tokens including cached tokens, so subtract cached tokens for billing.
  const fresh = (u.cache_read_input_tokens != null || u.cache_creation_input_tokens != null)
    ? reportedInput
    : Math.max(0, reportedInput - cacheRead);
  const output = num(u.output_tokens ?? u.completion_tokens);
  const reasoning = num(u.output_tokens_details?.reasoning_tokens ?? u.reasoning_tokens);
  const rate = PRICING[modelKey] || PRICING.sonnet;
  const estimatedCost = (fresh * rate.input + cacheWrite * rate.cacheWrite + cacheRead * rate.cacheRead + output * rate.output) / 1e6;
  // xAI can expose billed cost directly. Prefer it when present; ticks are one
  // billionth of a USD according to xAI's cost-tracking response shape.
  const ticks = u.cost_in_usd_ticks ?? data?.cost_in_usd_ticks;
  const reportedCost = ticks != null ? num(ticks) / 1e9 : null;
  return {
    inputTokens: fresh + cacheRead + cacheWrite,
    freshTokens: fresh,
    cachedTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
    outputTokens: output,
    reasoningTokens: reasoning,
    cost: reportedCost ?? estimatedCost,
  };
}

export function makeUsageEntry({ modelKey, modelConfig, requestType='gameplay', data, changes=[] }) {
  const usage = normalizeUsage(modelKey, data);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    timestamp: Date.now(),
    provider: modelConfig?.provider || 'unknown',
    model: modelConfig?.model || modelKey || 'unknown',
    modelKey,
    requestType,
    ...usage,
    cacheSensitiveChanges: changes,
    rebuildLikely: changes.length > 0,
  };
}

const names = xs => (Array.isArray(xs) ? xs : []).map(x => typeof x === 'string' ? x : (x?.name || x?.title || '')).filter(Boolean);
const mapNames = xs => new Set(names(xs));
const diffNames = (before, after) => {
  const a = mapNames(before), b = mapNames(after);
  return {
    added: [...b].filter(x => !a.has(x)),
    removed: [...a].filter(x => !b.has(x)),
  };
};

const stable = value => JSON.stringify(value ?? null);

export function snapshotCacheState(char, summary='') {
  const c = char || {};
  return {
    character: {
      level:c.level, classLevels:c.classLevels, subclasses:c.subclasses, stats:c.stats,
      abilities:c.abilities, deity:c.deity, disposition:c.disposition, directives:c.directives,
      race:c.race?.name || c.race, cls:c.cls?.name || c.cls,
    },
    gear: { slots:c.slots, companionSlots:(c.companions || []).map(x=>({name:x.name,slots:x.slots,equipment:x.equipment})), constructs:c.constructs },
    inventory: { inventory:c.inventory, stash:c.stash, bags:c.bags },
    companions: c.companions,
    npcs: c.npcs,
    towns: c.towns,
    story: { adventure:c.adventure, arc:c.arc, objectives:c.arcObjectives, goal:c.arcGoal },
    history: summary,
  };
}

export function diffCacheState(prev, next) {
  if (!prev) return [];
  const out = [];
  const push = (section, action, detail='') => out.push({ section, action, detail });

  if (stable(prev.character) !== stable(next.character)) push('character','Character/static state changed');
  if (stable(prev.gear) !== stable(next.gear)) push('gear','Equipment or construct configuration changed');
  if (stable(prev.inventory) !== stable(next.inventory)) push('inventory','Inventory, stash, or bag contents changed');

  if (stable(prev.companions) !== stable(next.companions)) {
    const d=diffNames(prev.companions,next.companions);
    push('companions','Companion state changed',[d.added.length?`added: ${d.added.join(', ')}`:'',d.removed.length?`removed: ${d.removed.join(', ')}`:''].filter(Boolean).join(' · '));
  }
  if (stable(prev.npcs) !== stable(next.npcs)) {
    const d=diffNames(prev.npcs,next.npcs);
    push('npcs','Persistent NPC state changed',[d.added.length?`added: ${d.added.join(', ')}`:'',d.removed.length?`removed: ${d.removed.join(', ')}`:''].filter(Boolean).join(' · '));
  }
  if (stable(prev.towns) !== stable(next.towns)) {
    const d=diffNames(prev.towns,next.towns);
    push('towns','Town/world record changed',[d.added.length?`added: ${d.added.join(', ')}`:'',d.removed.length?`removed: ${d.removed.join(', ')}`:''].filter(Boolean).join(' · '));
  }
  if (stable(prev.story) !== stable(next.story)) push('story','Adventure, antagonist, arc, or objectives changed');
  if (prev.history !== next.history) push('history','Story summary changed');
  return out;
}
