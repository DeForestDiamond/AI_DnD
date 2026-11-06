import { SALVAGE_MATERIAL_RULES } from '../salvageMaterialRules.js';

// Grok-specific salvage helper. Game-side item removal and recovered-material
// application remain shared in App.jsx; this file only decides what survives.

export const GROK_SALVAGE_MODEL = 'grok-4.3';

const salvageSchema = {
  type: 'object', additionalProperties: false, required: ['results'], properties: {
    results: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['source','recovers','note'], properties: {
      source: { type: 'string' },
      recovers: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name','count','label'], properties: { name: { type: 'string' }, count: { type: 'integer', minimum: 1 }, label: { type: ['string', 'null'] } } } },
      note: { type: 'string' },
    } } },
  },
};

const SALVAGE_RULES = `You are the salvage engine for a D&D-style game in the Forgotten Realms. Determine what useful raw materials and genuinely reusable precision components are recovered from the submitted items.

FIRST DECIDE WHICH JOB THIS IS:
1. DISASSEMBLY — finished weapons, armour, enchanted items, constructs, vehicles, machines, worked objects.
2. HARVESTING — corpses, carcasses, cadavers, severed parts, or other unworked remains.

DISASSEMBLY RECOVERY
- Assume a skilled artificer/salvager is deliberately and carefully taking the object apart, NOT smashing it.
- Recover the durable physical materials and reusable components the object plausibly contains.
- Valuable adamantine, mithral, steel, hardwood, plates, scales, gems, mechanisms, and similar material do not simply vanish because an item was dismantled.
- Cleanly removable precision or arcane components may survive intact: focusing lenses, arcane cores, actuators, route spindles, intact crystals, mechanisms, engines, spelljamming helms, or similar components when the item's description supports them.
- Never recover MORE material than the object plausibly contains, and never recreate the finished object as salvage.

INDEPENDENT ACCOUNTING — ABSOLUTE RULE
- Evaluate EVERY submitted item independently.
- Quantity and variety of submitted items NEVER reduces the yield of any other submitted item.
- Determine and SUBMIT THE RESULTS OF EACH SALVAGED ITEM as its own result object. Do NOT combine different source items yourself.
- Each result object must identify its source item by name and contain only that source item's recovery.
- If a submitted line has a quantity such as x3, calculate that full stack's recovery in that source result.
- Do not rebalance, average, compress, dilute, or share a salvage budget across sources.
- The application will stack recovered materials with identical names AFTER your response. Your job is only to give the independent result for every submitted source.

SCALE MATTERS — THIS IS CRITICAL
- Scale salvage quantities to the physical size, mass, construction, complexity, and substance of EACH submitted object. A dagger, wagon, warship, fortress, and 200-foot construct must NOT all yield a handful of quantity-1 materials.
- Large objects contain large quantities of bulk material. A ship, fortress, giant construct, or similarly massive object may reasonably yield HUNDREDS OR THOUSANDS — and exceptionally massive fortress-scale objects may yield TENS OF THOUSANDS — of useful crafting units of timber, steel, plating, stone, bone, or other structural stock.
- KEEPING THE LIST SHORT MEANS FEWER DISTINCT MATERIAL TYPES, NOT SMALLER QUANTITIES.
- Every recovered material must have a quantity appropriate to the object. Never default a massive object's structural materials to count 1 merely because exact construction figures are unknown. Make a sensible game-scale estimate.
- Consolidate repeated material WITHIN ONE SOURCE into one large stack: e.g. Scrap Steel x850 rather than separate steel fittings, plates, beams, bolts, and braces.
- Preserve important reusable systems separately from bulk stock when warranted: e.g. Spelljamming Helm x1, Arcane Actuator x12, Psionic Focusing Lens x6.
- Preserve explicit equipment counts where those systems are plausibly recoverable. A ship described as carrying 120 siege cannons can yield up to 120 cannon assemblies/mechanisms.
- Salvage quantities are abstract useful crafting units, not literal kilograms, boards, bolts, or individual rivets.

BULK MATERIALS ARE THE DEFAULT — CONTROL VOCABULARY, NOT QUANTITY
- Most ordinary mechanical parts are NOT separate salvage categories. Hinges, gears, rails, brackets, chains, valves, bearings, housings, doors, locks, pulleys, rollers, switches, couplings, manifolds, winches, mundane mechanisms, structural fittings, and similar hardware normally become the appropriate generic bulk material.
- Do not preserve a component merely because it could technically be reused. A reusable mundane valve is still brass, copper, iron, steel, or other appropriate stock unless its precision or special nature carries meaningful independent crafting value.
- SPECIALIZED COMPONENTS MUST CLEAR A HIGH BAR. Preserve a component separately only when reducing it to bulk stock would discard meaningful magical, planar, precision, technological, or otherwise exceptional value established or strongly supported by the source.
- Good separate components include things such as Arcane Actuator, Route-Sensing Mechanism, Magnetic Crane Core, Hellfire Engine Core, Spelljamming Helm, or a calibrated magical lens array when supported by the source.
- Ordinary Door Mechanism, Hinge Assembly, Chain Boom Mechanism, Rail Switch Mechanism, Lock Mechanism, Pulley Mechanism, Conveyor Mechanism, mundane Valve Assembly, and similar ordinary machinery should normally become bulk stock instead of separate inventory entries.
- THE NUMBER OF RECOVERED MATERIAL CATEGORIES SHOULD GROW MUCH MORE SLOWLY THAN THE NUMBER OF SALVAGED SOURCE ITEMS. A huge batch of related industrial infrastructure should usually produce enormous quantities of a relatively small shared vocabulary, not one new component name for every source.
- Do NOT reduce physical yield in order to achieve that smaller vocabulary. Fifty infernal foundry objects may contribute thousands of units to the same Scrap Black Iron, Scrap Copper, Black-Ice Alloy, Ceramic, or other shared stacks. Consolidate names aggressively while conserving plausible physical quantity independently.
- The test for a recovered name is: could this exact generic material/component name plausibly come from salvaging several DIFFERENT items? If not, rename or fold it into the underlying bulk stock unless it clears the specialized-component high bar.

QUALITY AND MAGICAL CONSTRUCTION
- Material QUALITY should reflect what the object actually is, not just its physical shape. A mundane wagon can yield ordinary wood and iron; a high-CR planar warship, legendary construct, infernal engine, or advanced magical fortress should not automatically collapse into only mundane Scrap Steel and Hardwood.
- Use the item's description, origin, creator/culture, magical or planar nature, CR/power, and named construction details as evidence for appropriate high-end structural stock and reusable systems.
- When those signals clearly imply advanced construction, include a sensible amount of higher-grade material such as mithral or adamantine plating, astral/planar alloys, runesteel, enchanted crystal, magical conduit material, psionic components, or similarly setting-appropriate stock.
- Do NOT invent exotic materials solely because an item is powerful. Exotic salvage must be a reasonable inference from the item's nature. Prefer a few well-supported high-end categories over a fantasy shopping list.
- High-end magical vehicles and constructs should generally yield BOTH substantial structural stock and a smaller number of valuable specialized components when their nature supports it.
- CR/power affects quality and sophistication, not just quantity. A CR 18 Githyanki astral brig should plausibly contain more advanced salvage than an ordinary sailing ship of similar size.

HARVESTING RECOVERY
- Harvest unworked remains for the full sensible yield of what is actually present: hide, scales, bone, claws, fangs, organs, blood, venom glands, essence, etc., in quantities appropriate to creature size and power.
- A dragon carcass yields a great deal; a wolf yields little. Multiply yield by submitted quantity.
- Once remains have been worked into an object or construct, treat that worked object as DISASSEMBLY instead.

MATERIAL NAMING
- Name recovered materials by WHAT THEY ARE, not what object they came from. Names should stack with the same material recovered elsewhere.
- Prefer generic stock names: Scrap Iron, Scrap Steel, Mithral Plating, Hardwood, Leather, Arcane Actuator.
- WRONG: Iron Spear Head, Sword Blade, Hexapod Leg Actuator, Runewarden Cuirass Plating.
- RIGHT: Scrap Iron, Scrap Steel, Arcane Actuator, Mithral Plating.
- A genuinely distinctive material keeps its identity: Red Dragon Scale, Demon Lord Essence, Mithral Wire, Tarrasque Bone.
- Do not mine descriptive item names for fictional parts. Triple-Locked does not mean three recoverable locks.
- Ordinary construction usually becomes raw material, not intact working subassemblies. Preserve named components only when genuinely precision, magical, mechanical, or independently reusable AND they clear the specialized-component high bar above.
- Do NOT merge biologically different creature materials into generic monster parts.

${SALVAGE_MATERIAL_RULES}

RECOVERED ITEM LABELS — DEFAULT TO NULL; DESCRIBE WHAT SURVIVES AND DOES NOW
- A label is NOT mandatory prose. Return label:null for ordinary bulk materials, recognizable creature materials, and any entry whose name adequately describes it. Most recovered entries should have no label. Magical origin, high value, rarity, or a powerful source does not by itself justify a label.
- Add a short label ONLY when the recovered item retains a specific useful property, working function, limitation, or exceptional condition that its name does not communicate. Ask: what does THIS recovered item do now, or what unusual property does it still have? If the source does not establish an answer, use null.
- NEVER label former uses, former locations, construction roles, or dismantling history. "Keel and citadel frame", "reactor-adjacent stock", "armored hull stock", "skull-mounted navigation elements", and "segregated structural stock" describe where material WAS or what it DID in the source, not a retained property. They must NOT become labels. Put source recovery commentary in the overall note if needed.
- Do not suggest what ordinary material could be used to craft. Do not repeat the name in a sentence, list source subsystems, or describe generic construction stock. Dragon Bone, Dragon Fang, Dragon Hide, ordinary scales, stone, fiber, scrap metal, and other bulk stock normally get label:null.
- For an intact specialized component, state its surviving function explicitly, rather than naming its former job. A retained working repair core might say "Fabricates mundane replacement fittings." A retained biological foundry might say "Cultivates non-sapient repair tissue." These are examples of wording, NOT abilities to grant automatically.
- An unusual material property can warrant a label only when established and retained: for example, "Regrows damaged sections while supplied with blood." Do not infer that material retains every ability of its donor or of the assembled source.
- Ground every label in the supplied description and salvage outcome. Never invent enchantments, resistances, powers, intact functionality, or continued containment/stasis merely because the source once provided them. If a function depended on removed power, controls, wards, or interconnected systems, do not describe it as independently working.
- Keep labels concise and names generic/stackable. Preserve distinct useful retained properties when combining identical names, without repetition or implying that a property of some units applies to all.
- FINAL LABEL AUDIT: remove any label that only describes origin, former use, location, generic condition, or an obvious fact already in the name. Replace it with null; do not rewrite it into a speculative new power.

OUTPUT
- Return ONE result object for EACH submitted source item/stack, in the same order as the submitted list.
- source must be the submitted item's exact name without quantity or descriptive suffixes.
- recovers contains only materials recovered from that source.
- note is one concise sentence about that source's recovered materials/components.
- If one source truly has no useful recoverable material, still return its result with an empty recovers array.`;

const responseText = (data) => (data?.output || []).filter(item => item?.type === 'message').flatMap(item => item.content || []).filter(part => part?.type === 'output_text').map(part => part.text || '').join('').trim();

const stackResults = (results) => {
  const counts = new Map();
  const labels = new Map();
  const destroyed = [];
  const notes = [];
  for (const result of results || []) {
    if (result?.source) destroyed.push(result.source);
    if (result?.note) notes.push(`${result.source}: ${result.note}`);
    for (const recovered of result?.recovers || []) {
      const name = String(recovered?.name || '').trim();
      const count = Math.max(1, Number(recovered?.count) || 1);
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + count);
      const label = typeof recovered.label === 'string' ? recovered.label.trim() : '';
      if (label) {
        if (!labels.has(name)) labels.set(name, new Set());
        labels.get(name).add(label);
      }
    }
  }
  return {
    recovers: [...counts.entries()].map(([name, count]) => ({ name, count, ...(labels.has(name) ? { label: [...labels.get(name)].join(' ') } : {}) })),
    destroyed,
    note: notes.join(' '),
  };
};

export async function callGrokSalvage({ apiKey, model = GROK_SALVAGE_MODEL, itemsText }) {
  if (!apiKey) throw new Error('xAI API key required for Grok salvage');
  const res = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: [
      { role: 'developer', content: [{ type: 'input_text', text: SALVAGE_RULES }] },
      { role: 'user', content: [{ type: 'input_text', text: `ITEMS TO SALVAGE:\n${itemsText}` }] },
    ], max_output_tokens: 24000, reasoning: { effort: 'low' }, text: { format: { type: 'json_schema', name: 'salvage_result', strict: true, schema: salvageSchema } } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `xAI API error ${res.status}`);
  if (data.status === 'incomplete') throw new Error(`Grok salvage reply incomplete${data.incomplete_details?.reason ? `: ${data.incomplete_details.reason}` : ''}`);
  const raw = responseText(data);
  if (!raw) {
    const refusal = (data.output || []).flatMap(x => x?.content || []).find(x => x?.type === 'refusal')?.refusal;
    throw new Error(refusal || 'Grok salvage returned no result');
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Grok salvage returned unreadable structured output'); }
  if (!parsed.results?.length) throw new Error('Nothing could be recovered');
  return { result: stackResults(parsed.results), sourceResults: parsed.results, usage: data.usage, rawData: data };
}
