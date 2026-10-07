import { stackCounts, stackCount, stackHas, addStack, takeStack } from '../../utils/itemStacks.js';
import { pruneDeadItemDefinitions } from '../../hooks/useCharacter.js';
import { callGptCrafting } from '../openai/crafting.js';
import { callGptConsolidate, CONSOLIDATE_RULES } from '../openai/consolidate.js';
import { callGptSalvage } from '../openai/salvage.js';
import { callGrokCrafting } from '../xai/crafting.js';
import { callGrokConsolidate } from '../xai/consolidate.js';
import { callGrokSalvage } from '../xai/salvage.js';
import { callAnthropicCrafting } from '../anthropic/crafting.js';
import { callAnthropicConsolidate } from '../anthropic/consolidate.js';
import { callAnthropicSalvage } from '../anthropic/salvage.js';

export const createItemManager = ({ apiKey, openAiApiKey, xAiApiKey, charRef, updateChar, applyEffects, selectedModel, MODEL_CONFIGS, log, logUsage }) => {
  // ── Crafting: propose, then execute ────────────────────────────────────────
  // Two-phase like a real commission. proposeCrafting() asks a dedicated call
  // what the selected materials could become and returns options WITHOUT
  // touching the save. executeCrafting() consumes the materials and creates the
  // item only after the player confirms a choice.
  // Batch cap. Making things is linear now, so this only exists to stop a
  // typo'd quantity from producing something absurd.
  const MAX_CRAFT_BATCH = 1000;

  const proposeCrafting = async ({ materials, intent, asSet, asConstruct, qty }) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    const char = charRef.current;
    if (!materials.length) throw new Error('Select at least one material');

    // Describe each material fully. For FINISHED equipment this is what the model
    // needs in order to upgrade it — without the current numbers it reconstructs
    // them from prose and silently drops or lowers stats.
    const describeMat = (m) => {
      const d = m.data || {};
      const bits = [];
      if (d.type) bits.push(`type ${d.type}`);
      if (d.slot) bits.push(`slot ${d.slot}`);
      if (d.ac !== undefined) bits.push(`ARMOUR RATING ac ${d.ac}${d.dexBonus === false ? ' (heavy)' : d.maxDex != null ? ` (max dex ${d.maxDex})` : ''}`);
      if (d.damage) bits.push(`damage ${d.damage}${d.damageBonus ? `+${d.damageBonus}` : ''}; enchantment bonus:${d.bonus || 0}`);
      if (Array.isArray(d.extras) && d.extras.length) bits.push(`extra damage ${d.extras.map(e => `${e.dice} ${e.type}`).join(' + ')}`);
      if (d.bonuses && Object.keys(d.bonuses).length) bits.push(`CURRENT BONUSES ${Object.entries(d.bonuses).map(([k, v]) => `${k}:${v}`).join(',')}`);
      if (d.label) bits.push(`"${d.label}"`);
      return `NAME: ${m.name} | HAVE: ${m.count}${bits.length ? ` | ${bits.join(' | ')}` : ''}`;
    };
    const matList = materials.map(describeMat).join('\n');
    const batchN = Math.max(1, Math.min(MAX_CRAFT_BATCH, parseInt(qty, 10) || 1));
    log(`[CRAFT] Proposing ${batchN > 1 ? `${batchN}x ` : ''}${asConstruct ? 'CONSTRUCTS' : asSet ? 'matched SETS' : 'items'} from ${materials.length} material stacks`);
    let parsed;
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
      const { parsed: gptParsed, usage: gptUsage } = await callGptCrafting({
        model: MODEL_CONFIGS[selectedModel].model,
        apiKey: gptKey,
        materialsText: matList,
        characterLevel: char.level,
        intent,
        asSet,
        asConstruct,
        quantity: batchN,
      });
      parsed = gptParsed;
      const gIn = gptUsage?.input_tokens || 0;
      const gOut = gptUsage?.output_tokens || 0;
      log(`[HELPER] crafting via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
    } else if (MODEL_CONFIGS[selectedModel]?.provider === 'xai') {
      const xaiKey = xAiApiKey || import.meta.env.VITE_XAI_KEY;
      const { parsed: grokParsed, usage: grokUsage } = await callGrokCrafting({
        model: MODEL_CONFIGS[selectedModel].model,
        apiKey: xaiKey,
        materialsText: matList,
        characterLevel: char.level,
        intent,
        asSet,
        asConstruct,
        quantity: batchN,
      });
      parsed = grokParsed;
      const gIn = grokUsage?.input_tokens || 0;
      const gOut = grokUsage?.output_tokens || 0;
      log(`[HELPER] crafting via Grok ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
    } else {
      const { parsed: anthropicParsed, usage: anthropicUsage } = await callAnthropicCrafting({
        apiKey: key, materialsText: matList, characterLevel: char.level, intent,
        asSet, asConstruct, quantity: batchN,
      });
      parsed = anthropicParsed;
      if (anthropicUsage) logUsage('crafting', { usage: anthropicUsage });
    }
    // Bonuses may come back as a string ("ac:2"), an object ({ac:2}) or an
    // array. Normalise to the string form the tag builder and parser expect —
    // an object silently stringified to "[object Object]" and the piece ended
    // up with no bonuses at all.
    const normBonuses = (b) => {
      if (!b) return '';
      if (typeof b === 'string') return b;
      if (Array.isArray(b)) return b.map(normBonuses).filter(Boolean).join(',');
      if (typeof b === 'object') {
        return Object.entries(b)
          .filter(([, v]) => v !== null && v !== undefined && v !== '')
          .map(([k, v]) => `${k}:${v}`).join(',');
      }
      return String(b);
    };
    // The model occasionally invents a component — often a name it read inside
    // another item's description. Check every option against what the player
    // actually holds NOW, and mark the ones that cannot be made, rather than
    // letting them fail only after being chosen.
    const heldNow = materialSources(charRef.current);
    const heldKeys = Object.keys(heldNow);
    const validate = (o) => {
      const missing = (o.consumes || []).map(m => {
        const resolved = resolveHeldName(m.name, heldKeys);
        const have = totalHeld(heldNow[resolved]);
        return have < (m.count || 1) ? `${m.name} (need ${m.count || 1}, have ${have})` : null;
      }).filter(Boolean);
      return missing.length ? { ...o, unavailable: missing } : o;
    };
    const normOpt = (o) => validate({ ...o, bonuses: normBonuses(o.bonuses) });
    if (asConstruct) {
      const list = (parsed.options || []).filter(o => o?.name).map(o => validate({ ...o, isConstruct: true }));
      if (!list.length) throw new Error('Nothing could be forged from those materials');
      log(`[CRAFT] ${list.length} constructs proposed: ${list.map(o => o.name).join(', ')}`);
      return list;
    }
    const options = (parsed.options || []).filter(o => o?.name).map(o => (
      asSet && Array.isArray(o.pieces)
        ? { ...o, pieces: o.pieces.filter(pc => pc?.name).map(normOpt) }
        : normOpt(o)
    ));
    if (!options.length) throw new Error('Nothing could be made from those materials');
    log(`[CRAFT] ${options.length} options proposed: ${options.map(o => o.name).join(', ')}`);
    return options;
  };

  // Build the [ITEM:] tag for a chosen option and apply it, then remove the
  // consumed materials. Reuses applyEffects so the item goes through the exact
  // same parser as DM-granted loot.
  // Bags keep their contents on the bag definition in the single item registry.
  // A bag's physical stack determines whether those contents count as inventory
  // or stash for crafting/salvage filters.
  const materialSources = (c) => {
    const src = {};
    const bump = (nm, key, n) => {
      src[nm] = src[nm] || { inv: 0, stash: 0, bags: [] };
      if (key === 'bags') src[nm].bags.push(n); else src[nm][key] += n;
    };
    Object.entries(stackCounts(c.inventory)).forEach(([nm, qty]) => bump(nm, 'inv', qty));
    Object.entries(stackCounts(c.stash)).forEach(([nm, qty]) => bump(nm, 'stash', qty));
    Object.entries(c.items || {}).forEach(([bagName, d]) => {
      if (d?.type !== 'bag' || !d.contents) return;
      const bagStore = stackHas(c.stash, bagName) && !stackHas(c.inventory, bagName) ? 'stash' : 'inventory';
      Object.entries(d.contents).forEach(([item, count]) => {
        if (count > 0) bump(item, 'bags', { bag: bagName, store: bagStore, count });
      });
    });
    return src;
  };
  const totalHeld = (s) => (s ? s.inv + s.stash + s.bags.reduce((a, b) => a + b.count, 0) : 0);

  // Resolve a material name returned by the model back to an item the player
  // actually holds. Models sometimes echo the descriptive form ("Iron Ingot
  // (dwarven)") or a quantity suffix; match exactly first, then progressively
  // looser, so a formatting slip doesn't fail an otherwise valid craft.
  // Canonicalise names before comparing model output to held inventory. Models
  // frequently swap straight and curly apostrophes (Knight's vs Knight’s), and
  // may vary whitespace/case. Preserve the player's exact held spelling once a
  // match is found so downstream inventory/stash/bag operations still use the
  // real item key.
  const canonicalItemName = (name) => String(name || '')
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u02BC\uFF07]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const resolveHeldName = (wanted, held) => {
    const w = (wanted || '').trim();
    const exact = held.find(h => canonicalItemName(h) === canonicalItemName(w));
    if (exact) return exact;
    const stripped = w.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+x\d+$/i, '').trim();
    const strippedKey = canonicalItemName(stripped);
    const onStripped = held.find(h => canonicalItemName(h) === strippedKey);
    if (onStripped) return onStripped;
    // longest held name that the requested string begins with (handles a
    // trailing description appended without brackets)
    const prefix = held
      .filter(h => strippedKey.startsWith(canonicalItemName(h)))
      .sort((a, b) => b.length - a.length)[0];
    return prefix || w;
  };

  // Consume materials across all three stores. Returns { removeTags, apply } —
  // inventory removals go through [REMOVE:] tags so the normal item pipeline
  // handles them; stash and bag contents are edited directly afterwards.
  const consumeMaterials = (c, consumes) => {
    const src = materialSources(c);
    const stashTakes = [];
    const bagTakes = [];
    const removeTags = consumes.map(m => {
      let need = m.count || 1;
      const s = src[m.name] || { inv: 0, stash: 0, bags: [] };
      const fromInv = Math.min(need, s.inv); need -= fromInv;
      const fromStash = Math.min(need, s.stash); need -= fromStash;
      if (fromStash > 0) stashTakes.push({ name: m.name, count: fromStash });
      for (const b of s.bags) {
        if (need <= 0) break;
        const take = Math.min(need, b.count); need -= take;
        bagTakes.push({ ...b, name: m.name, take });
      }
      return fromInv > 0 ? `[REMOVE: ${m.name}${fromInv > 1 ? ` | qty:${fromInv}` : ''}]` : '';
    }).join('');

    const apply = (next) => {
      if (stashTakes.length) {
        for (const t of stashTakes) next = { ...next, stash: takeStack(next.stash, t.name, t.count).stacks };
      }
      for (const t of bagTakes) {
        const items = { ...(next.items || {}) };
        const bag = items[t.bag];
        if (!bag?.contents) continue;
        const contents = { ...bag.contents };
        contents[t.name] = (contents[t.name] || 0) - t.take;
        if (contents[t.name] <= 0) delete contents[t.name];
        items[t.bag] = { ...bag, contents };
        next = { ...next, items };
      }
      // [REMOVE:] can only see inventory at parse time. Stash/bag consumption
      // happens here afterwards, so prune definitions only after every source
      // has actually been updated.
      return pruneDeadItemDefinitions(next);
    };
    return { removeTags, apply, bagTakes };
  };

  const executeCrafting = (option) => {
    const c = charRef.current;
    // The proposal already allocated materials across the whole batch, so the
    // consumes list is the total — take it as given and just make `count` copies.
    const batch = Math.max(1, Math.min(MAX_CRAFT_BATCH, parseInt(option.count, 10) || 1));
    // Materials can come from inventory OR stash. Count both, verify the player
    // still holds enough (guards a stale panel), then consume inventory first
    // and take the remainder from the stash.
    const src = materialSources(c);
    // Normalise every requested material to a name the player actually holds
    const consumes = (option.consumes || []).map(m => ({ ...m, name: resolveHeldName(m.name, Object.keys(src)), count: m.count || 1 }));
    for (const m of consumes) {
      const held = totalHeld(src[m.name]);
      if (held < m.count) throw new Error(`Not enough ${m.name} — need ${m.count}, have ${held}`);
    }
    // Build the [ITEM:] tag for one piece (also used for single items).
    const tagFor = (o) => {
      if (o.type === 'weapon') {
        return `[ITEM: ${o.name} | weapon | ${o.damage || '1d6'} | ${o.finesse ? 'finesse' : ''} | ${o.range === 'ranged' ? 'ranged' : 'melee'} | ${o.label || ''} | bonus:${Number(o.bonus) || 0}${o.bonuses ? ` | ${o.bonuses}` : ''}]`;
      }
      if (o.type === 'armor') {
        const dexBonus = o.heavy === true || o.heavy === 'true' ? 'false' : 'true';
        const maxDex = (o.maxDex === null || o.maxDex === undefined || o.maxDex === '') ? 'null' : o.maxDex;
        return `[ITEM: ${o.name} | armor | ${o.ac || 13} | ${dexBonus} | ${maxDex} | ${o.label || ''}${o.bonuses ? ` | ${o.bonuses}` : ''}]`;
      }
      if (o.type === 'construct') {
        return `[ITEM: ${o.name} | construct | ${o.status || 'dormant'} | ${o.label || ''}]`;
      }
      if (o.type === 'consumable') {
        return `[ITEM: ${o.name} | consumable | ${o.label || ''}]`;
      }
      if (o.type === 'misc') {
        return `[ITEM: ${o.name} | misc | ${o.label || ''}]`;
      }
      return `[ITEM: ${o.name} | magic | ${o.slot || 'neck'} | ${o.bonuses || ''} | ${o.label || ''}]`;
    };
    // A construct becomes a COMPANION record, not an item — it is an entity the
    // player commands, and companions already carry description, abilities,
    // status, equipment slots and location tiering.
    if (option.isConstruct) {
      const { removeTags: rmTags, apply: applyTakes } = consumeMaterials(c, consumes);
      let next = applyTakes(applyEffects(rmTags, c));
      // Every construct becomes a COMPANION, and companions are sent to the DM
      // in full — name, description, abilities — inside the cached prompt block.
      // A thousand would be ruinous, so constructs get their own much lower cap.
      const MAX_CONSTRUCTS = 25;
      const made_n = Math.min(batch, MAX_CONSTRUCTS);
      if (made_n < batch) log(`[CRAFT] ${batch} constructs requested — capped at ${MAX_CONSTRUCTS}, since each becomes a companion sent to the DM every turn.`);
      const roman = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];
      const entry = {
        race: option.race || 'construct',
        role: option.role || 'war construct',
        appearance: option.appearance || '',
        abilities: option.abilities || '',
        desc: option.desc || '',
        status: `dormant — CR ${option.cr || '?'}, awaiting its command word`,
        relationship: 'a construct the player forged and commands',
        location: '',
      };
      // Companions are keyed by name, so a batch needs distinct keys.
      const companions = { ...(next.companions || {}) };
      const made = [];
      for (let i = 0; i < made_n; i++) {
        let nm = `${option.name}${roman[i] !== undefined ? roman[i] : ` ${i + 1}`}`;
        while (companions[nm]) nm = `${nm}'`;
        companions[nm] = { ...entry };
        made.push(nm);
      }
      next = { ...next, companions };
      updateChar(next);
      log(`[CRAFT] Forged ${batch > 1 ? `${batch}x ` : ''}construct "${option.name}" (CR ${option.cr || '?'}); consumed ${consumes.map(m => `${m.name} x${m.count}`).join(', ') || 'nothing'}`);
      return `${made.join(', ')} — added to your companions`;
    }

    // A set creates every piece from one craft; the materials are consumed once.
    const isSet = Array.isArray(option.pieces) && option.pieces.length > 0;
    const withQty = (tag, qty) => qty > 1 ? tag.replace(/]$/, ` | qty:${qty}]`) : tag;
    const tag = isSet
      ? option.pieces.map(piece => withQty(tagFor(piece), batch)).join('')
      : withQty(tagFor(option), batch);

    const { removeTags, apply, bagTakes } = consumeMaterials(c, consumes);
    log(`[CRAFT TAG] ${tag}`);
    let next = apply(applyEffects(tag + removeTags, c));
    if (bagTakes.length) log(`[CRAFT] Drew from bags: ${bagTakes.map(b => `${b.name} x${b.take} from ${b.bag}`).join(', ')}`);

    // Verify the craft actually produced something. Materials are consumed in
    // the same call, so a silent failure here costs the player the materials
    // and gives nothing back — say so loudly rather than appearing to work.
    const wanted = isSet ? option.pieces.map(pc => pc.name) : [option.name];
    // Compare against the inventory that would remain AFTER consuming materials.
    // An upgrade may intentionally consume an item and recreate it with the SAME
    // name. Comparing raw before/after counts makes 1 consumed -> 1 forged look
    // like no item was created (1 -> 1), even though the replacement is valid.
    // consumeMaterials takes inventory first, so subtract only the same-name
    // quantity that would actually have been removed from inventory here.
    const consumedByName = consumes.reduce((acc, m) => {
      acc[m.name] = (acc[m.name] || 0) + (m.count || 1);
      return acc;
    }, {});
    const expectedMade = isSet
      ? wanted.reduce((acc, n) => ({ ...acc, [n]: (acc[n] || 0) + batch }), {})
      : { [option.name]: batch };
    const failures = wanted.filter(n => {
      const beforeInv = stackCount(c.inventory, n);
      const consumedFromInv = Math.min(beforeInv, consumedByName[n] || 0);
      const postConsumeBaseline = beforeInv - consumedFromInv;
      const afterInv = stackCount(next.inventory, n);
      return afterInv < postConsumeBaseline + (expectedMade[n] || 0);
    });
    if (failures.length) {
      log(`[CRAFT] FAILED: expected crafted item(s) missing: ${failures.join(', ')}. Tag was: ${tag.slice(0, 300)}`);
      throw new Error(`The forge produced nothing usable — materials NOT consumed. Try again, or reword the item.`);
    }
    const before = wanted.reduce((sum, n) => sum + stackCount(c.inventory, n), 0);
    const after = wanted.reduce((sum, n) => sum + stackCount(next.inventory, n), 0);
    log(`[CRAFT] Inventory ${before} -> ${after} of "${wanted.join(', ')}" (same-name upgrades allowed)`);
    updateChar(next);
    const madeDesc = `${batch > 1 ? `${batch}x ` : ''}${isSet ? `${option.name} (${option.pieces.length} pieces)` : option.name}`;
    log(`[CRAFT] Made ${madeDesc}; consumed ${consumes.map(m => `${m.name} x${m.count || 1}`).join(', ') || 'nothing'}`);
    return isSet ? `${option.name} — ${option.pieces.map(pc => pc.name).join(', ')}` : option.name;
  };

  // ── Inventory consolidation: intentionally erase distinctions between stacks ─
  const proposeConsolidation = async ({ items }) => {
    if (!items?.length) throw new Error('Select at least two stacks');
    const selected = new Map(items.map(x => [x.name, Math.max(1, Number(x.count) || 1)]));
    const itemsText = items.map(x => `${x.name} x${x.count}`).join('\n');
    let rawGroups = [];
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
      const out = await callGptConsolidate({ model: MODEL_CONFIGS[selectedModel].model, apiKey: gptKey, itemsText });
      rawGroups = out.groups || [];
      const u = out.usage || {};
      log(`[HELPER] smart grouping via GPT ${(u.input_tokens || 0).toLocaleString()} in / ${(u.output_tokens || 0).toLocaleString()} out`);
    } else if (MODEL_CONFIGS[selectedModel]?.provider === 'xai') {
      const xaiKey = xAiApiKey || import.meta.env.VITE_XAI_KEY;
      const out = await callGrokConsolidate({ model: MODEL_CONFIGS[selectedModel].model, apiKey: xaiKey, itemsText });
      rawGroups = out.groups || [];
      const u = out.usage || {};
      log(`[HELPER] smart grouping via Grok ${(u.input_tokens || 0).toLocaleString()} in / ${(u.output_tokens || 0).toLocaleString()} out`);
    } else {
      const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
      const out = await callAnthropicConsolidate({ apiKey: key, itemsText });
      rawGroups = out.groups || [];
      if (out.usage) logUsage('smart grouping', { usage: out.usage });
    }

    const used = new Set();
    const groups = [];
    for (const g of rawGroups) {
      const members=[];
      for (const it of g.items || []) {
        const exact=[...selected.keys()].find(n=>canonicalItemName(n)===canonicalItemName(it.name));
        if(!exact || used.has(exact)) continue;
        const count=Math.min(selected.get(exact),Math.max(1,Number(it.count)||1));
        members.push({name:exact,count}); used.add(exact);
      }
      if(members.length>=2 && String(g.name||'').trim()) groups.push({name:String(g.name).trim(),items:members,reason:String(g.reason||'').trim()});
      else members.forEach(x=>used.delete(x.name));
    }
    log(`[CONSOLIDATE] Smart grouping proposed ${groups.length} group(s)`);
    return groups;
  };

  const executeConsolidation = ({ items, name, destination='stash' }) => {
    const c=charRef.current;
    const finalName=String(name||'').trim();
    if(!finalName) throw new Error('Result name required');
    if(!items?.length) throw new Error('Nothing selected');
    const src=materialSources(c);
    const heldNames=Object.keys(src);
    const consumes=items.map(it=>({ name:resolveHeldName(it.name,heldNames), count:Math.max(1,Number(it.count)||1) }));
    for(const it of consumes){const have=totalHeld(src[it.name]);if(have<it.count)throw new Error(`Not enough ${it.name} — need ${it.count}, have ${have}`);}
    const total=consumes.reduce((n,x)=>n+x.count,0);
    const {removeTags,apply}=consumeMaterials(c,consumes);
    let next=apply(applyEffects(removeTags,c));
    if(destination==='inventory') next={...next,inventory:addStack(next.inventory,finalName,total)};
    else next={...next,stash:addStack(next.stash,finalName,total)};
    updateChar(next);
    log(`[CONSOLIDATE] ${consumes.map(x=>`${x.name} x${x.count}`).join(', ')} -> ${finalName} x${total} (${destination})`);
    return `${finalName} ×${total.toLocaleString()} → ${destination}`;
  };

  // ── Salvage: break an item down into materials ────────────────────────────
  // The inverse of crafting, same two-phase shape. Recovery is deliberately
  // LOSSY — you never get back everything that went in, so craft->salvage->craft
  // can't be farmed into infinite materials.
  const proposeDismantle = async ({ items }) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    const char = charRef.current;
    if (!items.length) throw new Error('Select something to break down');

    const db = char.items || {};
    const itemList = items.map(it => {
      const d = db[it.name];
      const bits = [];
      if (d?.type) bits.push(d.type);
      if (d?.damage) bits.push(`damage ${d.damage}${d.damageBonus ? `+${d.damageBonus}` : ''}; enchantment bonus:${d.bonus || 0}`);
      if (d?.ac) bits.push(`AC ${d.ac}`);
      if (d?.bonuses && Object.keys(d.bonuses).length) bits.push(Object.entries(d.bonuses).map(([k, v]) => `${k}:${v}`).join(','));
      if (d?.label) bits.push(d.label);
      return `${it.name}${it.count > 1 ? ` x${it.count}` : ''}${bits.length ? ` — ${bits.join('; ')}` : ''}`;
    }).join('\n');

    log(`[SALVAGE] Proposing breakdown of ${items.length} item(s)`);
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
      const { result: gptResult, usage: gptUsage } = await callGptSalvage({
        model: MODEL_CONFIGS[selectedModel].model,
        apiKey: gptKey,
        itemsText: itemList,
      });
      const gIn = gptUsage?.input_tokens || 0;
      const gOut = gptUsage?.output_tokens || 0;
      log(`[HELPER] salvage via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
      log(`[SALVAGE] Recovers: ${(gptResult.recovers || []).map(r => `${r.name} x${r.count}`).join(', ') || 'nothing'}`);
      return gptResult;
    }
    if (MODEL_CONFIGS[selectedModel]?.provider === 'xai') {
      const xaiKey = xAiApiKey || import.meta.env.VITE_XAI_KEY;
      const { result: grokResult, usage: grokUsage } = await callGrokSalvage({
        model: MODEL_CONFIGS[selectedModel].model,
        apiKey: xaiKey,
        itemsText: itemList,
      });
      const gIn = grokUsage?.input_tokens || 0;
      const gOut = grokUsage?.output_tokens || 0;
      log(`[HELPER] salvage via Grok ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
      log(`[SALVAGE] Recovers: ${(grokResult.recovers || []).map(r => `${r.name} x${r.count}`).join(', ') || 'nothing'}`);
      return grokResult;
    }
    const { result, usage: anthropicUsage } = await callAnthropicSalvage({ apiKey: key, itemsText: itemList });
    if (anthropicUsage) logUsage('salvage', { usage: anthropicUsage });
    log(`[SALVAGE] Recovers: ${(result.recovers || []).map(r => `${r.name} x${r.count}`).join(', ') || 'nothing'}`);
    return result;
  };

  // Consume the submitted items (inventory first, then stash) and add whatever
  // was recovered. Mirrors executeCrafting's split-source handling.
  const executeDismantle = (result, submitted, destination = 'inventory') => {
    const c = charRef.current;
    const src = materialSources(c);
    for (const it of submitted) {
      const held = totalHeld(src[it.name]);
      if (held < it.count) throw new Error(`Not enough ${it.name} (have ${held}, need ${it.count})`);
    }

    const addTags = (result.recovers || [])
      .map(r => `[ITEM: ${r.name}${(r.count || 1) > 1 ? ` | qty:${r.count}` : ''}]`)
      .join('');
    const { removeTags, apply } = consumeMaterials(c, submitted);
    let next = apply(applyEffects(addTags + removeTags, c));
    // Store salvage labels directly so descriptive metadata does not overwrite
    // an existing item's mechanical definition through a structured ITEM tag.
    for (const recovered of result.recovers || []) {
      const label = typeof recovered.label === 'string' ? recovered.label.trim() : '';
      if (!label) continue;
      const itemKey = Object.keys(next.items || {}).find(name => name.toLowerCase() === String(recovered.name || '').trim().toLowerCase());
      if (!itemKey) continue;
      const item = next.items[itemKey];
      const existingLabel = typeof item.label === 'string' ? item.label.trim() : '';
      const mergedLabel = existingLabel && existingLabel !== label && !existingLabel.includes(label)
        ? existingLabel + ' ' + label : existingLabel || label;
      next = { ...next, items: { ...next.items, [itemKey]: { ...item, label: mergedLabel } } };
    }
    if (destination === 'stash') {
      for (const recovered of result.recovers || []) {
        const count = Math.max(1, Number(recovered.count) || 1);
        next = {
          ...next,
          inventory: takeStack(next.inventory, recovered.name, count).stacks,
          stash: addStack(next.stash, recovered.name, count),
        };
      }
    }
    updateChar(next);
    log(`[SALVAGE] Broke down ${submitted.map(i => `${i.name} x${i.count}`).join(', ')}; recovery -> ${destination}`);
    return (result.recovers || []).map(r => `${r.name} x${r.count || 1}`).join(', ') || 'nothing';
  };


  return { proposeCrafting, executeCrafting, proposeConsolidation, executeConsolidation, proposeDismantle, executeDismantle };
};

