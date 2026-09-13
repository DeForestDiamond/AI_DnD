import { rollDie, rollDice, getMainWeapon, effectiveStats, calcAC, modStr, profBonus, statMod, allItems, effectiveMaxHp } from './useCharacter.js';
import { coinsToString } from '../constants/currency.js';
import { RACE_TRAIT_STRINGS } from '../constants/raceTraits.js';
import { subclassPromptLines } from '../constants/subclasses.js';
import { stackCounts, stackNames } from '../utils/itemStacks.js';
import { buildCtxSections } from '../prompts/state.js';
import { buildSystemPrompt as buildSystemPromptHaiku } from '../prompts/haiku.js';
import { buildSystemPromptSonnet } from '../prompts/sonnet.js';
import { buildSystemPromptSol } from '../prompts/sol.js';
import { buildSystemPromptTerra } from '../prompts/terra.js';
import { buildSystemPromptGrok } from '../prompts/grok.js';

export { buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok };
export const buildSystemPrompt = buildSystemPromptHaiku;
export const buildSystemPromptGpt = buildSystemPromptSol;

// Strip game tags from DM text before displaying
export const cleanDisplayText = (text) => text.replace(/\[[^\]]+\]/g, '').trim();

// ── Dice Engine ────────────────────────────────────────────────────────────────
// All dice rolling happens here in the app, never in the DM

// 5e skill -> governing ability. Rolls named by skill use the right stat
// instead of silently defaulting to 10 (+0).
// The canonical 18 5e skills, in display order, with their governing ability.
// SKILL_ABILITY below also carries aliases (sleight/sleightofhand) for parsing
// roll requests; this list is what the character sheet shows.
export const SKILL_LIST = [
  { key: 'athletics',      label: 'Athletics',       ability: 'str' },
  { key: 'acrobatics',     label: 'Acrobatics',      ability: 'dex' },
  { key: 'sleightofhand',  label: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth',        label: 'Stealth',         ability: 'dex' },
  { key: 'arcana',         label: 'Arcana',          ability: 'int' },
  { key: 'history',        label: 'History',         ability: 'int' },
  { key: 'investigation',  label: 'Investigation',   ability: 'int' },
  { key: 'nature',         label: 'Nature',          ability: 'int' },
  { key: 'religion',       label: 'Religion',        ability: 'int' },
  { key: 'animalhandling', label: 'Animal Handling', ability: 'wis' },
  { key: 'insight',        label: 'Insight',          ability: 'wis' },
  { key: 'medicine',       label: 'Medicine',         ability: 'wis' },
  { key: 'perception',     label: 'Perception',       ability: 'wis' },
  { key: 'survival',       label: 'Survival',         ability: 'wis' },
  { key: 'deception',      label: 'Deception',        ability: 'cha' },
  { key: 'intimidation',   label: 'Intimidation',     ability: 'cha' },
  { key: 'performance',    label: 'Performance',      ability: 'cha' },
  { key: 'persuasion',     label: 'Persuasion',       ability: 'cha' },
];

export const SKILL_ABILITY = {
  athletics:'str',
  acrobatics:'dex', stealth:'dex', sleight:'dex', sleightofhand:'dex', initiative:'dex',
  arcana:'int', history:'int', investigation:'int', nature:'int', religion:'int',
  animal:'wis', animalhandling:'wis', insight:'wis', medicine:'wis', perception:'wis', survival:'wis',
  deception:'cha', intimidation:'cha', performance:'cha', persuasion:'cha',
};

export const performSkillCheck = (statValue, difficulty, addProfBonus = false, level = 1, gearBonus = 0) => {
  const d20    = rollDie(20);
  const mod    = statMod(statValue);
  const prof   = addProfBonus ? profBonus(level) : 0;
  const total  = d20 + mod + prof + gearBonus;
  const hit    = total >= difficulty;
  return { d20, mod, prof, gearBonus, total, difficulty, hit };
};

export const performAttack = (weapon, stats, level) => {
  const profBonusValue = profBonus(level);
  const atkRoll         = rollDie(20);
  const statBonus       = weapon.statBonus || 0;
  const weaponBonus     = weapon.bonus || 0;
  const statLabel       = (weapon.attackAbility || 'str').toUpperCase();
  const atkBonus        = statBonus + profBonusValue + weaponBonus;
  const totalAtk        = atkRoll + atkBonus;
  const dmgRoll         = rollDice(weapon.damage);
  const dmgBonus        = statBonus + weaponBonus;
  const crit     = atkRoll === 20;
  const fumble   = atkRoll === 1;
  const extras = (weapon.extras || []).map(e => {
    const roll = rollDice(e.dice) + (crit ? rollDice(e.dice) : 0);
    return { ...e, roll };
  });
  const extraTotal = extras.reduce((sum, e) => sum + e.roll, 0);
  const totalDmg = Math.max(1, dmgRoll + dmgBonus + extraTotal);
  return { atkRoll, atkBonus, totalAtk, statBonus, statLabel, profBonus: profBonusValue, weaponBonus, dmgRoll, dmgBonus, extras, extraTotal, totalDmg, crit, fumble };
};

export const MODEL_CONFIGS = {
  sonnet: { provider: 'anthropic', model: 'claude-sonnet-4-5', max_tokens: 2048, label: 'Sonnet', emoji: '✨' },
  haiku: { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', max_tokens: 1536, label: 'Haiku', emoji: '⚡' },
  gpt: { provider: 'openai', model: 'gpt-5.6-sol', max_tokens: 2048, reasoning_effort: 'low', label: 'GPT Sol', emoji: '🧠' },
  terra: { provider: 'openai', model: 'gpt-5.6-terra', max_tokens: 2048, reasoning_effort: 'medium', label: 'GPT Terra', emoji: '🌍' },
  grok: { provider: 'xai', model: 'grok-4.3', max_tokens: 2048, reasoning_effort: 'low', label: 'Grok 4.3', emoji: '🚀' },
};

export const stackInventory = (inventory) => stackCounts(inventory);

export function useGame({ charRef, apiKey, openAiApiKey, xAiApiKey }) {
  const callDM = async (messages, systemPrompt, modelConfig = MODEL_CONFIGS.sonnet, signal = null, log = null, onPrompt = null) => {
    const provider = modelConfig.provider || 'anthropic';
    const key = provider === 'openai'
      ? (openAiApiKey || import.meta.env.VITE_OPENAI_KEY)
      : provider === 'xai'
        ? (xAiApiKey || import.meta.env.VITE_XAI_KEY)
        : (apiKey || import.meta.env.VITE_ANTHROPIC_KEY);
    if (!key) {
      const providerName = provider === 'openai' ? 'OpenAI' : provider === 'xai' ? 'xAI' : 'Anthropic';
      throw new Error(`${providerName} API key is missing`);
    }

    const hasSplit = typeof systemPrompt === 'object' && systemPrompt.static;
    const systemBlocks = hasSplit
      ? [
          { type: 'text', text: systemPrompt.static, cache_control: { type: 'ephemeral' } },
          ...(systemPrompt.gear ? [{ type: 'text', text: systemPrompt.gear, cache_control: { type: 'ephemeral' } }] : []),
          ...(systemPrompt.items ? [{ type: 'text', text: systemPrompt.items, cache_control: { type: 'ephemeral' } }] : []),
        ]
      : [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }];
    let dynamicTail = hasSplit ? systemPrompt.dynamic : '';

    if ((provider === 'openai' || provider === 'xai') && dynamicTail) {
      const arcMarker = '\nACTIVE ARC ANTAGONIST';
      const hooksMarker = '\n\nHOOKS — ARC OR NO ARC:';
      let liveState = dynamicTail;
      const arcIdx = liveState.indexOf(arcMarker);
      if (arcIdx >= 0) liveState = liveState.slice(0, arcIdx);
      const hooksIdx = liveState.indexOf(hooksMarker);
      if (hooksIdx >= 0) liveState = liveState.slice(0, hooksIdx);
      liveState = liveState.trim();
      const arc = charRef.current?.arc;
      const gptArc = arc?.antagonist ? [
        '',
        'ACTIVE ARC (HIDDEN): ' + arc.antagonist,
        'ARC LOCATION (HIDDEN): ' + (arc.arcLocation || 'Faerûn'),
        'This assigned antagonist is the one active campaign arc. Do not replace it with a different recurring villain, conspiracy, or quest chain. Small self-contained side events may be unrelated, but any multi-scene threat or continuing villain must connect to this antagonist.',
        'Build toward the antagonist through believable leads, people, places, operations, evidence, and consequences. Investigation and travel before confrontation are desirable. Do not rush the reveal or spawn the antagonist beside the player.',
        'If the player is away from the arc location, their current location may provide a brief believable lead toward it, but the substantive arc remains at or genuinely connected to the assigned arc location.',
        'Use the character’s supplied disposition when motivating involvement; do not assume altruism. If the player ignores the arc, do not nag them every turn.',
        'When the antagonist is resolved — defeated, captured, dismantled, permanently driven off, or the player concludes their business through a deal, truce, alliance, payment, or deliberate disengagement — emit [ARC COMPLETE] in that same response. Do not invent a hidden superior or deeper layer to keep the arc alive.'
      ].join('\n') : '';
      dynamicTail = liveState + gptArc;
    }

    if (log) {
      const est = t => Math.round((t || '').length / 4);
      const cachedMsgs = messages.length > 2 ? messages.slice(0, -2) : [];
      const freshMsgs = messages.length > 2 ? messages.slice(-2) : messages;
      const sz = arr => arr.reduce((a, m) => a + est(typeof m.content === 'string' ? m.content : JSON.stringify(m.content)), 0);
      log(`[PROMPT] static ${est(hasSplit ? systemPrompt.static : systemPrompt).toLocaleString()} · gear ${est(hasSplit ? systemPrompt.gear : '').toLocaleString()} · items ${est(hasSplit ? systemPrompt.items : '').toLocaleString()} (cached) · history ${sz(cachedMsgs).toLocaleString()} (${cachedMsgs.length} msgs, cached) · fresh ${(sz(freshMsgs) + est(dynamicTail)).toLocaleString()} (${freshMsgs.length} msgs + ${est(dynamicTail)} state)`);
    }

    const promptRecord = onPrompt ? {
      at: new Date().toISOString(), model: modelConfig.model,
      staticBlock: hasSplit ? systemPrompt.static : systemPrompt,
      itemsBlock: hasSplit ? (systemPrompt.items || '') : '', dynamicBlock: dynamicTail,
      cachedMessages: messages.length > 2 ? messages.slice(0, -2).map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })) : [],
      freshMessages: (messages.length > 2 ? messages.slice(-2) : messages).map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })),
    } : null;

    if (provider === 'xai') {
      const grokCtx = hasSplit ? buildCtxSections(charRef.current) : null;
      const grokLocationContext = grokCtx ? [grokCtx.npcSection, grokCtx.townsSection].filter(Boolean).join('\n') : '';
      const developerContent = [
        { type: 'input_text', text: hasSplit ? systemPrompt.static : systemPrompt },
        ...(grokLocationContext ? [{ type: 'input_text', text: grokLocationContext }] : []),
        ...(hasSplit && systemPrompt.gear ? [{ type: 'input_text', text: systemPrompt.gear }] : []),
        ...(hasSplit && systemPrompt.items ? [{ type: 'input_text', text: systemPrompt.items }] : []),
      ];
      const input = [{ type: 'message', role: 'developer', content: developerContent }];
      messages.forEach((m, i) => {
        let text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        if (dynamicTail && i === messages.length - 1) text = `${text}\n\n${dynamicTail}`;
        const role = m.role === 'assistant' ? 'assistant' : 'user';
        input.push({ type: 'message', role, content: [{ type: role === 'assistant' ? 'output_text' : 'input_text', text }] });
      });
      const res = await fetch('https://api.x.ai/v1/responses', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: modelConfig.model, input, max_output_tokens: modelConfig.max_tokens,
          reasoning: { effort: modelConfig.reasoning_effort || 'low' },
          prompt_cache_key: `ai-dnd:${modelConfig.model}:${charRef.current?.name || 'character'}`,
          store: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || `xAI API error ${res.status}`);
      if (data.status === 'incomplete') throw new Error(`Grok reply incomplete${data.incomplete_details?.reason ? `: ${data.incomplete_details.reason}` : ''}`);
      const text = (data.output || []).filter(item => item?.type === 'message').flatMap(item => item.content || []).filter(part => part?.type === 'output_text').map(part => part.text || '').join('') || '...';
      const totalInput = data.usage?.input_tokens || 0;
      const cached = data.usage?.input_tokens_details?.cached_tokens || 0;
      const usage = { input_tokens: Math.max(0, totalInput - cached), output_tokens: data.usage?.output_tokens || 0, cache_read_input_tokens: cached, cache_creation_input_tokens: 0, total_tokens: data.usage?.total_tokens || (totalInput + (data.usage?.output_tokens || 0)), provider: 'xai' };
      if (log) log(`[CACHE] xAI actual: total ${totalInput.toLocaleString()} · cached ${cached.toLocaleString()} · fresh ${Math.max(0, totalInput - cached).toLocaleString()}`);
      if (promptRecord) onPrompt({ ...promptRecord, usage });
      return { text, usage };
    }

    if (provider === 'openai') {
      const gptCtx = hasSplit ? buildCtxSections(charRef.current) : null;
      const gptLocationContext = gptCtx ? [gptCtx.npcSection, gptCtx.townsSection].filter(Boolean).join('\n') : '';
      const gptStaticInstructions = hasSplit ? systemPrompt.static : systemPrompt;
      const cacheBreakpoint = () => ({ mode: 'explicit' });
      const developerContent = [
        { type: 'input_text', text: gptStaticInstructions, prompt_cache_breakpoint: cacheBreakpoint() },
        ...(gptLocationContext ? [{ type: 'input_text', text: gptLocationContext, ...(!systemPrompt.gear ? { prompt_cache_breakpoint: cacheBreakpoint() } : {}) }] : []),
        ...(hasSplit && systemPrompt.gear ? [{ type: 'input_text', text: systemPrompt.gear, prompt_cache_breakpoint: cacheBreakpoint() }] : []),
        ...(hasSplit && systemPrompt.items ? [{ type: 'input_text', text: systemPrompt.items }] : []),
      ];
      const stableHistoryCount = Math.max(0, messages.length - 2);
      const previousHistoryBoundary = stableHistoryCount >= 3 ? stableHistoryCount - 3 : -1;
      const currentHistoryBoundary = stableHistoryCount >= 1 ? stableHistoryCount - 1 : -1;
      const input = [{ type: 'message', role: 'developer', content: developerContent }];
      messages.forEach((m, i) => {
        let text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        if (dynamicTail && i === messages.length - 1) text = `${text}\n\n${dynamicTail}`;
        const markHistory = i === previousHistoryBoundary || i === currentHistoryBoundary;
        const role = m.role === 'assistant' ? 'assistant' : 'user';
        input.push({ type: 'message', role, content: [{ type: role === 'assistant' ? 'output_text' : 'input_text', text, ...(markHistory ? { prompt_cache_breakpoint: cacheBreakpoint() } : {}) }] });
      });
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: modelConfig.model, input, max_output_tokens: modelConfig.max_tokens, reasoning: { effort: modelConfig.reasoning_effort || 'low' }, text: { verbosity: 'low' }, prompt_cache_key: `ai-dnd:${modelConfig.model}:${charRef.current?.name || 'character'}`, prompt_cache_options: { mode: 'explicit', ttl: '30m' }, store: false }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `OpenAI API error ${res.status}`); }
      const data = await res.json();
      const text = (data.output || []).filter(item => item?.type === 'message').flatMap(item => item.content || []).filter(part => part?.type === 'output_text').map(part => part.text || '').join('') || '...';
      const totalInput = data.usage?.input_tokens || 0;
      const cached = data.usage?.input_tokens_details?.cached_tokens || 0;
      const cacheWrite = data.usage?.input_tokens_details?.cache_write_tokens || 0;
      const usage = { input_tokens: Math.max(0, totalInput - cached - cacheWrite), output_tokens: data.usage?.output_tokens || 0, cache_read_input_tokens: cached, cache_creation_input_tokens: cacheWrite, total_tokens: data.usage?.total_tokens || (totalInput + (data.usage?.output_tokens || 0)), provider: 'openai' };
      if (log) log(`[CACHE] OpenAI actual: total ${totalInput.toLocaleString()} · cached ${cached.toLocaleString()} · write ${cacheWrite.toLocaleString()} · uncached ${Math.max(0, totalInput - cached - cacheWrite).toLocaleString()}`);
      if (promptRecord) onPrompt({ ...promptRecord, usage });
      return { text, usage };
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: modelConfig.model, max_tokens: modelConfig.max_tokens, system: systemBlocks,
        messages: (msgs => {
          if (!dynamicTail || !msgs.length) return msgs;
          const out = [...msgs];
          const last = out[out.length - 1];
          const text = typeof last.content === 'string' ? last.content : JSON.stringify(last.content);
          out[out.length - 1] = { ...last, content: `${text}\n\n${dynamicTail}` };
          return out;
        })(messages.length > 2 ? [
          ...messages.slice(0, -2).map((m, i) => i === messages.slice(0, -2).length - 1 ? { ...m, content: [{ type: 'text', text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content), cache_control: { type: 'ephemeral' } }] } : m),
          ...messages.slice(-2)
        ] : messages),
      }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || `API error ${res.status}`); }
    const data = await res.json();
    if (promptRecord) onPrompt({ ...promptRecord, usage: data.usage || null });
    return { text: data.content?.[0]?.text || '...', usage: data.usage || null };
  };

  const buildActionContext = (userMsg, log) => {
    const char = charRef.current;
    let context = '';
    let rollResult = null;
    const attackWords = /\b(attack|strike|stab|slash|swing|lunge|thrust|smite|bash|cleave|slice|hack|fight|engage|charge|shoot|fire|loose)\b/i;
    const insideQuotes = /["'「][^"'「」]*\b(attack|strike|stab|slash|swing|lunge|thrust|smite|bash|cleave|slice|hack|fight|engage|charge|shoot|fire|loose)\b[^"'「」]*["'」]/i;
    if (attackWords.test(userMsg) && !insideQuotes.test(userMsg) && !/\b(don't|dont|not|no|avoid|retreat|run|flee|hide|sneak)\b/i.test(userMsg)) {
      const weapon = getMainWeapon(char.slots, char.stats, char.items || {});
      if (!weapon) log?.('[ATTACK] Attack word detected but no weapon equipped in mainhand — no roll made');
      if (weapon) {
        const result = performAttack(weapon, char.stats, char.level);
        const rogueLevels = (char.classLevels || {}).Rogue || 0;
        const isStealth = /\b(hiding|hidden|shadow|stealth|sneak|ambush|surprise|dark|darkness|unseen|undetected|ghost|backstab|behind|silently)\b/i.test(userMsg);
        let sneakDmg = 0;
        let sneakDesc = '';
        if (rogueLevels > 0 && isStealth && !result.fumble) {
          const sneakDice = ['1d6','1d6','2d6','2d6','3d6'][Math.min(rogueLevels-1,4)];
          sneakDmg = rollDice(sneakDice);
          sneakDesc = ` + ${sneakDmg} sneak attack (${sneakDice})`;
        }
        if (result.crit) {
          const bonusDmg = rollDice(weapon.damage);
          result.totalDmg += bonusDmg + sneakDmg;
          const extraDesc = result.extras?.length ? result.extras.map(e => `+${e.roll} ${e.type} (${e.dice}, doubled)`).join('') : '';
          log?.(`[ATTACK] CRIT ${weapon.name}: d20=20 (nat) → dmg ${result.dmgRoll}+${result.dmgBonus}+${bonusDmg} crit${sneakDmg?`+${sneakDmg} sneak`:''}${extraDesc} = ${result.totalDmg}`);
          context += `\n\n[GAME DATA — CRITICAL HIT with ${weapon.name}. Attack: ${result.atkRoll}(nat20)=${result.totalAtk} to hit. Damage: ${result.dmgRoll}+${result.dmgBonus}+${bonusDmg} crit bonus${sneakDmg?`+${sneakDmg} sneak`:''}${extraDesc} = ${result.totalDmg}. Narrate the player's action first, then resolve the outcome using this roll. Do NOT output any [HP:] or [DAMAGE:] tag for this attack — those tags hurt the PLAYER. The enemy's wounds are prose only.]`;
        } else if (result.fumble) {
          log?.(`[ATTACK] FUMBLE ${weapon.name}: d20=1 (nat) → automatic miss`);
          context += `\n\n[GAME DATA — FUMBLE with ${weapon.name}. Attack roll: 1 (nat 1) — automatic miss. Narrate the player's action first, then the fumble.]`;
        } else {
          result.totalDmg += sneakDmg;
          const extraDesc2 = result.extras?.length ? result.extras.map(e => `+${e.roll} ${e.type} (${e.dice})`).join('') : '';
          log?.(`[ATTACK] ${weapon.name}: d20=${result.atkRoll} + ${result.statLabel}(${result.statBonus}) + prof(${result.profBonus})${result.weaponBonus ? ` + weapon(${result.weaponBonus})` : ''} = ${result.totalAtk} to hit → dmg ${result.dmgRoll}+${result.dmgBonus}${extraDesc2}${sneakDesc}=${result.totalDmg}`);
          context += `\n\n[GAME DATA — ${weapon.name} attack roll: d20=${result.atkRoll}+${result.atkBonus}=${result.totalAtk} to hit; damage if hit: ${result.dmgRoll}+${result.dmgBonus}${extraDesc2}${sneakDesc}=${result.totalDmg}. Narrate the player's action first, then resolve the outcome using this roll. Do NOT output any [HP:] or [DAMAGE:] tag for this attack — those tags hurt the PLAYER. The enemy's wounds are prose only.]`;
        }
        rollResult = { label: `${weapon.name}${sneakDmg?' + Sneak Attack':''}`, value: result.totalAtk, dc: null, dmg: result.totalDmg, crit: result.crit, fumble: result.fumble, sneak: sneakDmg > 0 };
      }
    }
    return { context, rollResult };
  };

  const interceptRollRequest = (dmText, char, log) => {
    const rollMatch = dmText.match(/\[ROLL:\s*([a-z' ]+?)\s*(saving throw|save|check)?\s*(?:difficulty|dc)\s*(\d+)\s*(?:ac)?\s*\]/i);
    if (!rollMatch) return { resultText: null, rollResult: null };
    const statLabel = rollMatch[1].trim().toLowerCase();
    const statName = statLabel.replace(/\s+/g, '');
    const isSave = /sav/i.test(rollMatch[2] || '');
    const diff = parseInt(rollMatch[3]);
    if (/^(attack|attackroll|attacks|tohit|hit|melee|ranged|weapon|weaponattack)$/.test(statName)) {
      const weapon = getMainWeapon(char.slots, char.stats, char.items || {});
      const effAtk = effectiveStats(char.stats, char.slots, char.items || {});
      let abilityMod, enchant = 0, label;
      if (weapon) { abilityMod = weapon.statBonus; enchant = weapon.bonus || 0; label = weapon.name; }
      else {
        abilityMod = Math.max(statMod(effAtk.str), statMod(effAtk.dex));
        const held = char.slots?.mainhand;
        label = held ? `${held} (no stats on file)` : 'unarmed';
        if (held) log?.(`[ROLL] WARNING: "${held}" is equipped but has no entry in the character item registry — attack resolved from raw STR/DEX. Re-issue or re-craft the item to restore its stats.`);
      }
      const attackWeapon = weapon || { name: label, damage: '1d1', statBonus: abilityMod, attackAbility: statMod(effAtk.dex) >= statMod(effAtk.str) ? 'dex' : 'str', bonus: enchant, extras: [] };
      const result = performAttack(attackWeapon, char.stats, char.level);
      const hit = result.crit || (!result.fumble && result.totalAtk >= diff);
      log?.(`[ROLL] ${statLabel} with ${label}: d20=${result.atkRoll} + ${result.statLabel}(${result.statBonus}) + prof(${result.profBonus})${result.weaponBonus ? ` + weapon(${result.weaponBonus})` : ''} = ${result.totalAtk} vs DC${diff} — ${hit?'HIT':'MISS'}`);
      return { resultText: `[ROLL RESULT: attack roll — d20 ${result.atkRoll} + ${result.statLabel} ${result.statBonus} + proficiency ${result.profBonus}${result.weaponBonus ? ` + equipment ${result.weaponBonus}` : ''} = ${result.totalAtk} vs difficulty ${diff} — ${hit ? 'HIT' : 'MISS'}${hit ? `; damage ${result.totalDmg}` : ''}]`, rollResult: { label: 'Attack', value: result.totalAtk, dc: diff, dmg: hit ? result.totalDmg : null, crit: result.crit, fumble: result.fumble } };
    }
    const DEFENCE_AS_DEX = /^(defence|defense|dodge|parry|evade|evasion|block|ac|armorclass|armourclass)$/;
    const statMap = { strength:'str', dexterity:'dex', constitution:'con', intelligence:'int', wisdom:'wis', charisma:'cha' };
    const statKey = statMap[statName] || SKILL_ABILITY[statName] || (DEFENCE_AS_DEX.test(statName) ? 'dex' : statName);
    if (DEFENCE_AS_DEX.test(statName)) log?.(`[ROLL] "${statLabel}" is not a 5e roll — AC is passive. Resolved as a Dexterity save.`);
    if (!statMap[statName] && !SKILL_ABILITY[statName] && !['str','dex','con','int','wis','cha'].includes(statKey)) log?.(`[ROLL] WARNING: "${statLabel}" is not a known ability or skill — rolling against a default of 10 (+0). Tell the DM to name an ability or a 5e skill.`);
    const effStats = effectiveStats(char.stats, char.slots, char.items || {});
    const statVal = effStats[statKey] || 10;
    const db = allItems(char.items || {});
    let gearBonus = 0;
    Object.values(char.slots || {}).forEach(itemName => { const b = itemName && db[itemName]?.bonuses; if (b && typeof b[statName] === 'number') gearBonus += b[statName]; });
    const check = performSkillCheck(statVal, diff, true, char.level, gearBonus);
    const kind = isSave ? 'saving throw' : 'check';
    log?.(`[ROLL] ${statLabel} ${kind} (${statKey}): d20=${check.d20}+${check.mod}+${check.prof}${gearBonus?`+${gearBonus}gear`:''}=${check.total} vs DC${diff} — ${check.hit?'SUCCESS':'FAILURE'}`);
    return { resultText: `[ROLL RESULT: ${statLabel} ${kind} — d20 rolled ${check.d20} + ${check.mod} ${statKey.toUpperCase()} modifier + ${check.prof} proficiency${gearBonus ? ` + ${gearBonus} equipment` : ''} = ${check.total} vs difficulty ${diff} — ${check.hit ? 'SUCCESS' : 'FAILURE'}]`, rollResult: { label: `${statName.charAt(0).toUpperCase() + statName.slice(1)} Check`, value: check.total, dc: diff } };
  };

  const pingCache = async (systemPrompt) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    if (!key || !systemPrompt?.static) return null;
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: MODEL_CONFIGS.sonnet.model, max_tokens: 1, system: [{ type: 'text', text: systemPrompt.static, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: '.' }] }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  };

  return { callDM, buildActionContext, interceptRollRequest, pingCache };
}
