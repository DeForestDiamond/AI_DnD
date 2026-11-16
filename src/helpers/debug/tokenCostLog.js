const PRICING = {
  sonnet: { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.30 },
  haiku: { input: 0.10, output: 0.50, cacheWrite: 0.125, cacheRead: 0.01 },
  gpt: { input: 5.0, output: 30.0, cacheWrite: 6.25, cacheRead: 0.50 },
  terra: { input: 2.5, output: 15.0, cacheWrite: 3.125, cacheRead: 0.25 },
  grok: { input: 1.25, output: 2.50, cacheWrite: 1.25, cacheRead: 0.20 },
  grok46: { input: 2.00, output: 6.00, cacheWrite: 2.00, cacheRead: 0.50 },
  grok47: { input: 2.00, output: 6.00, cacheWrite: 2.00, cacheRead: 0.50 },
};

const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;

export function normalizeUsage(modelKey, data) {
  const u = data?.usage || data || {};
  const details = u.input_tokens_details || {};
  const cacheRead = num(u.cache_read_input_tokens ?? details.cached_tokens);
  const cacheWrite = num(u.cache_creation_input_tokens);
  const reportedInput = num(u.input_tokens ?? u.prompt_tokens);
  const fresh = (u.cache_read_input_tokens != null || u.cache_creation_input_tokens != null)
    ? reportedInput
    : Math.max(0, reportedInput - cacheRead);
  const output = num(u.output_tokens ?? u.completion_tokens);
  const reasoning = num(u.output_tokens_details?.reasoning_tokens ?? u.reasoning_tokens);
  const rate = PRICING[modelKey] || PRICING.sonnet;
  // Haiku 5.5 charges the long-context tier on the entire request above 100K.
  const priceMultiplier = modelKey === 'haiku' && fresh + cacheRead + cacheWrite > 100000 ? 5 : 1;
  const estimatedCost = priceMultiplier * (fresh * rate.input + cacheWrite * rate.cacheWrite + cacheRead * rate.cacheRead + output * rate.output) / 1e6;
  const ticks = u.cost_in_usd_ticks ?? data?.cost_in_usd_ticks;
  const reportedCost = ticks != null ? num(ticks) / 1e10 : null;
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

const charCount = value => String(value || '').length;
const messageChars = list => (list || []).reduce((sum, m) => sum + charCount(m?.content), 0);

// Providers expose cache token COUNTS, not which named prompt section those
// tokens came from. The prompt recorder already knows the order/size of the
// major regions, so calibrate their character lengths against the provider's
// exact input-token total and estimate where the cached prefix ended.
function consumePromptCacheDiagnostic(model, usage) {
  const rec = globalThis.__aiDndLastPromptRecord;
  if (!rec) return null;

  // This raw record belongs to the immediately following billed DM request.
  // Consume it once so a helper call or roll follow-up cannot inherit stale data.
  globalThis.__aiDndLastPromptRecord = null;
  if (rec.model && model && rec.model !== model) return null;

  const sections = [
    { key:'static', label:'STATIC / RULES', chars:charCount(rec.staticBlock) },
    { key:'items', label:'CARRIED ITEMS', chars:charCount(rec.itemsBlock) },
    { key:'history', label:'CACHED HISTORY', chars:messageChars(rec.cachedMessages) },
    { key:'recent', label:'RECENT MESSAGES', chars:messageChars(rec.freshMessages) },
    { key:'dynamic', label:'DYNAMIC STATE', chars:charCount(rec.dynamicBlock) },
  ].filter(s => s.chars > 0);

  const totalChars = sections.reduce((sum, s) => sum + s.chars, 0);
  if (!totalChars || !usage.inputTokens) return null;

  let assigned = 0;
  const withTokens = sections.map((s, i) => {
    const last = i === sections.length - 1;
    const estimatedTokens = last
      ? Math.max(0, usage.inputTokens - assigned)
      : Math.round(usage.inputTokens * (s.chars / totalChars));
    assigned += estimatedTokens;
    return { ...s, estimatedTokens };
  });

  let cumulative = 0;
  let boundary = null;
  const cached = usage.cachedTokens || 0;
  const annotated = withTokens.map(s => {
    const start = cumulative;
    cumulative += s.estimatedTokens;
    const cachedInSection = Math.max(0, Math.min(s.estimatedTokens, cached - start));
    const cacheState = cachedInSection <= 0 ? 'not-cached'
      : cachedInSection >= s.estimatedTokens ? 'cached'
      : 'partial';
    if (!boundary && cached > start && cached <= cumulative) {
      boundary = {
        section: s.label,
        sectionKey: s.key,
        estimatedTokensIntoSection: Math.max(0, cached - start),
        sectionEstimatedTokens: s.estimatedTokens,
      };
    }
    return { ...s, cachedInSection, cacheState, cumulativeEstimatedTokens:cumulative };
  });

  if (!boundary && cached === 0) boundary = { section:'NO CACHE HIT', sectionKey:null, estimatedTokensIntoSection:0, sectionEstimatedTokens:0 };
  if (!boundary && cached >= usage.inputTokens) boundary = { section:'END OF INPUT', sectionKey:'end', estimatedTokensIntoSection:0, sectionEstimatedTokens:0 };

  return {
    method:'provider-total-calibrated character estimate',
    totalRecordedCharacters: totalChars,
    providerInputTokens: usage.inputTokens,
    providerCachedTokens: cached,
    boundary,
    sections: annotated,
    limitations:[
      'Provider reports token counts, not named-section attribution.',
      'Gear/location transport blocks and role/format overhead are not separately exposed by the current prompt recorder, so section token counts and the named boundary are estimates.',
    ],
  };
}

export function makeUsageEntry({ modelKey, modelConfig, requestType='gameplay', data, changes=[] }) {
  const usage = normalizeUsage(modelKey, data);
  const model = data?.model || data?.rawData?.model || modelConfig?.model || modelKey || 'unknown';
  const isRecordedDmRequest = requestType === 'gameplay' || requestType === 'campaign opening';
  const cacheDiagnostic = isRecordedDmRequest ? consumePromptCacheDiagnostic(model, usage) : null;
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    timestamp: Date.now(),
    provider: modelConfig?.provider || 'unknown',
    model,
    modelKey,
    requestType,
    ...usage,
    cacheDiagnostic,
    cacheSensitiveChanges: changes,
    rebuildLikely: changes.length > 0,
  };
  if (typeof window !== 'undefined' && isRecordedDmRequest) {
    window.dispatchEvent(new CustomEvent('dnd-token-usage', { detail: entry }));
  }
  return entry;
}

const names = xs => {
  if (Array.isArray(xs)) return xs.map(x => typeof x === 'string' ? x : (x?.name || x?.title || '')).filter(Boolean);
  if (xs && typeof xs === 'object') return Object.keys(xs);
  return [];
};
const mapNames = xs => new Set(names(xs));
const diffNames = (before, after) => {
  const a = mapNames(before), b = mapNames(after);
  return {
    added: [...b].filter(x => !a.has(x)),
    removed: [...a].filter(x => !b.has(x)),
  };
};
const stable = value => JSON.stringify(value ?? null);
const constructState = c => {
  const inv = Array.isArray(c.inventory) ? c.inventory : [];
  const owned = new Set(inv.map(x => typeof x === 'string' ? x : x?.name).filter(Boolean));
  return Object.fromEntries(Object.entries(c.items || {}).filter(([name,d]) => d?.type === 'construct' && owned.has(name)));
};
const companionEquipment = c => Object.fromEntries(Object.entries(c.companions || {}).map(([name,d]) => [name, d?.slots || {}]));

export function snapshotCacheState(char, summary='') {
  const c = char || {};
  const excl = c.contextExclusions || {};
  return {
    character: {
      name:c.name, level:c.level, classLevels:c.classLevels, subclasses:c.subclasses,
      abilities:c.abilities, deity:c.deity, disposition:c.disposition, directives:c.directives,
      race:c.race?.name || c.race, cls:c.cls?.name || c.cls, bio:c.bio, appearance:c.appearance,
    },
    gear: { slots:c.slots, companionEquipment:companionEquipment(c), constructs:constructState(c) },
    inventory: { inventory:c.inventory, stash:c.stash, bags:c.bags },
    companions: { records:c.companions, exclusions:excl.companions },
    npcs: { records:c.npcs, exclusions:excl.npcs },
    towns: { records:c.towns, exclusions:excl.towns },
    story: { adventure:c.adventure, arc:c.arc, objectives:c.arcObjectives, goal:c.arcGoal },
    history: summary,
  };
}

export function diffCacheState(prev, next) {
  if (!prev) return [];
  const out = [];
  const push = (section, action, detail='') => out.push({ section, action, detail });

  if (stable(prev.character) !== stable(next.character)) push('character','Level, class, spell/skill, bio, appearance, disposition, directives, or other static character state changed');
  if (stable(prev.gear) !== stable(next.gear)) push('gear','Player/companion equipment or construct definition/status changed');
  if (stable(prev.inventory) !== stable(next.inventory)) push('inventory','Inventory, stash, bag, or item quantity changed');

  for (const section of ['companions','npcs','towns']) {
    if (stable(prev[section]) !== stable(next[section])) {
      const d = diffNames(prev[section]?.records, next[section]?.records);
      const details = [
        d.added.length ? `added: ${d.added.join(', ')}` : '',
        d.removed.length ? `removed: ${d.removed.join(', ')}` : '',
        stable(prev[section]?.exclusions) !== stable(next[section]?.exclusions) ? 'selection/context inclusion changed' : '',
      ].filter(Boolean).join(' · ');
      push(section, section === 'npcs' ? 'Persistent NPC state changed' : section === 'towns' ? 'Town/world record changed' : 'Companion state changed', details);
    }
  }
  if (stable(prev.story) !== stable(next.story)) push('story','Adventure, antagonist, arc, objective, or story-driver state changed');
  if (prev.history !== next.history) push('history','Story summary generated or compressed');
  return out;
}

