// GPT-specific salvage helper. Game-side item removal and recovered-material
// application remain shared in App.jsx; this file only decides what survives.

export const GPT_SALVAGE_MODEL = 'gpt-5.4-mini';

const salvageSchema = {
  type: 'object', additionalProperties: false, required: ['results'], properties: {
    results: { type: 'array', minItems: 1, maxItems: 1, items: { type: 'object', additionalProperties: false, required: ['recovers','destroyed','note'], properties: {
      recovers: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name','count'], properties: { name: { type: 'string' }, count: { type: 'integer', minimum: 1 } } } },
      destroyed: { type: 'array', items: { type: 'string' } }, note: { type: 'string' },
    } } },
  },
};

const SALVAGE_RULES = `You are the salvage engine for a D&D-style game in the Forgotten Realms. Determine what useful raw materials and genuinely reusable precision components are recovered from the submitted items.

FIRST DECIDE WHICH JOB THIS IS:
1. DISASSEMBLY — finished weapons, armour, enchanted items, constructs, vehicles, machines, worked objects.
2. HARVESTING — corpses, carcasses, cadavers, severed parts, or other unworked remains.

DISASSEMBLY RECOVERY
- Assume a skilled artificer/salvager is deliberately taking the object apart, NOT smashing it.
- Recovery is somewhat lossy so craft -> salvage -> craft cannot create infinite material, but do NOT make it arbitrarily wasteful.
- Durable bulk material should usually be recovered in substantial quantity. Valuable adamantine, mithral, steel, hardwood, plates, scales, gems, and similar material do not simply vanish because an item was dismantled.
- Loss should come mainly from things plausibly consumed or damaged by construction: cutoffs, welds, adhesives, bindings, damaged fasteners, contaminated mixtures, spent enchantment residue, fused interfaces, shattered expendable parts.
- Cleanly removable precision or arcane components may survive intact: focusing lenses, arcane cores, actuators, route spindles, intact crystals, mechanisms, engines, spelljamming helms, or similar components when the item's description supports them.
- Strongly integrated, transformed, burned-out, corrupted, or sacrificial materials may suffer major loss or become residue instead.
- Never recover MORE material than the object plausibly contains, and never recreate the finished object as salvage.
- The goal is competent disassembly with believable losses, not meaningfully less of everything no matter what.

SCALE MATTERS — THIS IS CRITICAL
- Scale salvage quantities to the physical size, mass, construction, complexity, and substance of the submitted object. A dagger, wagon, warship, fortress, and 200-foot construct must NOT all yield a handful of quantity-1 materials.
- Large objects contain large quantities of bulk material. A ship, fortress, giant construct, or similarly massive object may reasonably yield HUNDREDS OR THOUSANDS — and exceptionally massive fortress-scale objects may yield TENS OF THOUSANDS — of useful crafting units of timber, steel, plating, stone, bone, or other structural stock.
- Do not artificially compress quantities merely to keep the result simple. KEEPING THE LIST SHORT MEANS FEWER DISTINCT MATERIAL TYPES, NOT SMALLER QUANTITIES.
- Every recovered material must have a quantity appropriate to the object. Never default a massive object's structural materials to count 1 merely because exact construction figures are unknown. Make a sensible game-scale estimate.
- Consolidate repeated bulk material into one large stack: e.g. Scrap Steel x850 rather than many separate steel fittings, plates, beams, bolts, and braces.
- Preserve important reusable systems separately from bulk stock when warranted: e.g. Spelljamming Helm x1, Arcane Actuator x12, Psionic Focusing Lens x6.
- Preserve explicit equipment counts where those systems are plausibly recoverable. For example, a ship described as carrying 120 siege cannons can yield up to 120 cannon assemblies/mechanisms rather than an arbitrary small sample, with losses only when the description or dismantling plausibly warrants them.
- Salvage quantities are abstract useful crafting units, not literal kilograms, boards, bolts, or individual rivets. Use scale consistently enough that dismantling a major vehicle produces a major haul.

QUALITY AND MAGICAL CONSTRUCTION
- Material QUALITY should reflect what the object actually is, not just its physical shape. A mundane wagon can yield ordinary wood and iron; a high-CR planar warship, legendary construct, infernal engine, or advanced magical fortress should not automatically collapse into only mundane Scrap Steel and Hardwood.
- Use the item's description, origin, creator/culture, magical or planar nature, CR/power, and named construction details as evidence for appropriate high-end structural stock and reusable systems.
- When those signals clearly imply advanced construction, include a sensible amount of higher-grade material such as mithral or adamantine plating, astral/planar alloys, runesteel, enchanted crystal, magical conduit material, psionic components, or similarly setting-appropriate stock.
- Do NOT invent exotic materials solely because an item is powerful. Exotic salvage must be a reasonable inference from the item's nature. Prefer a few well-supported high-end categories over a fantasy shopping list.
- High-end magical vehicles and constructs should generally yield BOTH substantial structural stock and a smaller number of valuable specialized components when their nature supports it.
- CR/power affects quality and sophistication, not just quantity. A CR 18 Githyanki astral brig should plausibly contain more advanced salvage than an ordinary sailing ship of similar size.

HARVESTING RECOVERY
- Harvesting unworked remains is NOT lossy. Return the full sensible yield of what is actually present: hide, scales, bone, claws, fangs, organs, blood, venom glands, essence, etc., in quantities appropriate to creature size and power.
- A dragon carcass yields a great deal; a wolf yields little. Multiply yield by submitted quantity.
- Once remains have been worked into an object or construct, dismantling that worked object follows DISASSEMBLY rules instead.

MATERIAL NAMING AND CONSOLIDATION
- Name recovered materials by WHAT THEY ARE, not what object they came from. Names should stack with the same material recovered elsewhere.
- Prefer generic stock names: Scrap Iron, Scrap Steel, Mithral Plating, Hardwood, Leather, Arcane Actuator.
- WRONG: Iron Spear Head, Sword Blade, Hexapod Leg Actuator, Runewarden Cuirass Plating.
- RIGHT: Scrap Iron, Scrap Steel, Arcane Actuator, Mithral Plating.
- A genuinely distinctive material keeps its identity: Red Dragon Scale, Demon Lord Essence, Mithral Wire, Tarrasque Bone.
- Do not mine descriptive item names for fictional parts. Triple-Locked does not mean three recoverable locks.
- Ordinary construction usually becomes raw material, not intact working subassemblies. Preserve named components only when genuinely precision, magical, mechanical, or independently reusable.
- Consolidate identical material across the whole submission into one entry with summed quantity.
- Do NOT merge biologically different creature materials into generic monster parts.
- Keep the material list compact where materials genuinely overlap, but never discard legitimate yield merely to hit an arbitrary list length.

OUTPUT
- Return exactly one result covering every submitted item.
- destroyed lists submitted items/remains consumed by salvage.
- note is one concise sentence describing what survived and where meaningful losses occurred.
- If something truly has no useful recoverable material, return an empty recovers array rather than inventing value.`;

const responseText = (data) => (data?.output || []).filter(item => item?.type === 'message').flatMap(item => item.content || []).filter(part => part?.type === 'output_text').map(part => part.text || '').join('').trim();

export async function callGptSalvage({ apiKey, itemsText }) {
  if (!apiKey) throw new Error('OpenAI API key required for GPT salvage');
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: GPT_SALVAGE_MODEL, input: [
      { role: 'developer', content: [{ type: 'input_text', text: SALVAGE_RULES }] },
      { role: 'user', content: [{ type: 'input_text', text: `ITEMS TO SALVAGE:\n${itemsText}` }] },
    ], max_output_tokens: 12000, reasoning: { effort: 'low' }, text: { format: { type: 'json_schema', name: 'salvage_result', strict: true, schema: salvageSchema } } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI API error ${res.status}`);
  if (data.status === 'incomplete') throw new Error(`GPT salvage reply incomplete${data.incomplete_details?.reason ? `: ${data.incomplete_details.reason}` : ''}`);
  const raw = responseText(data);
  if (!raw) {
    const refusal = (data.output || []).flatMap(x => x?.content || []).find(x => x?.type === 'refusal')?.refusal;
    throw new Error(refusal || 'GPT salvage returned no result');
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('GPT salvage returned unreadable structured output'); }
  const result = parsed.results?.[0];
  if (!result) throw new Error('Nothing could be recovered');
  return { result, usage: data.usage, rawData: data };
}
