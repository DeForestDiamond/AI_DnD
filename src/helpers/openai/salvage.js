// GPT-specific salvage helper. Game-side item removal and recovered-material
// application remain shared in App.jsx; this file only decides what survives.

export const GPT_SALVAGE_MODEL = 'gpt-5.4-mini';

const salvageSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['results'],
  properties: {
    results: {
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['recovers', 'destroyed', 'note'],
        properties: {
          recovers: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'count'],
              properties: {
                name: { type: 'string' },
                count: { type: 'integer', minimum: 1 },
              },
            },
          },
          destroyed: { type: 'array', items: { type: 'string' } },
          note: { type: 'string' },
        },
      },
    },
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
- Cleanly removable precision or arcane components may survive intact: focusing lenses, arcane cores, actuators, route spindles, intact crystals, mechanisms, engines, or similar components when the item's description supports them.
- Strongly integrated, transformed, burned-out, corrupted, or sacrificial materials may suffer major loss or become residue instead.
- Never recover MORE material than the object plausibly contains, and never recreate the finished object as salvage.
- The goal is "competent disassembly with believable losses", not "meaningfully less of everything no matter what".

HARVESTING RECOVERY
- Harvesting unworked remains is NOT lossy. Return the full sensible yield of what is actually present: hide, scales, bone, claws, fangs, organs, blood, venom glands, essence, etc., in quantities appropriate to creature size and power.
- A dragon carcass yields a great deal; a wolf yields little.
- Multiply yield by submitted quantity.
- Once remains have been worked into an object or construct, dismantling that worked object follows DISASSEMBLY rules instead.

MATERIAL NAMING AND CONSOLIDATION
- Name recovered materials by WHAT THEY ARE, not what object they came from. Names should stack with the same material recovered elsewhere.
- Prefer generic stock names: Scrap Iron, Scrap Steel, Mithral Plating, Hardwood, Leather, Arcane Actuator.
- WRONG: Iron Spear Head, Sword Blade, Hexapod Leg Actuator, Runewarden Cuirass Plating.
- RIGHT: Scrap Iron, Scrap Steel, Arcane Actuator, Mithral Plating.
- A genuinely distinctive material keeps its identity: Red Dragon Scale, Demon Lord Essence, Mithral Wire, Tarrasque Bone.
- Do not mine descriptive item names for fictional parts. "Triple-Locked" does not mean three recoverable locks.
- Ordinary construction usually becomes raw material, not intact working subassemblies. Preserve named components only when they are genuinely precision, magical, mechanical, or independently reusable.
- Consolidate identical material across the whole submission into one entry with summed quantity.
- Do NOT merge biologically different creature materials into generic "monster parts". Drake scale, troll hide, and owlbear claws remain distinct.
- Keep the material list compact where materials genuinely overlap, but never discard legitimate yield merely to hit an arbitrary list length.

OUTPUT
- Return exactly one result covering every submitted item.
- destroyed should list the submitted finished item names that are consumed by salvage. For harvested bodies/remains, list the submitted remains being consumed by harvesting as well.
- note is one concise sentence describing what survived and where the meaningful losses occurred.
- If something truly has no useful recoverable material, return an empty recovers array rather than inventing value.`;

const responseText = (data) => (data?.output || [])
  .filter(item => item?.type === 'message')
  .flatMap(item => item.content || [])
  .filter(part => part?.type === 'output_text')
  .map(part => part.text || '')
  .join('')
  .trim();

export async function callGptSalvage({ apiKey, itemsText }) {
  if (!apiKey) throw new Error('OpenAI API key required for GPT salvage');

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GPT_SALVAGE_MODEL,
      input: [
        { role: 'developer', content: [{ type: 'input_text', text: SALVAGE_RULES }] },
        { role: 'user', content: [{ type: 'input_text', text: `ITEMS TO SALVAGE:\n${itemsText}` }] },
      ],
      max_output_tokens: 12000,
      reasoning: { effort: 'low' },
      text: {
        format: {
          type: 'json_schema',
          name: 'salvage_result',
          strict: true,
          schema: salvageSchema,
        },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI API error ${res.status}`);
  if (data.status === 'incomplete') {
    throw new Error(`GPT salvage reply incomplete${data.incomplete_details?.reason ? `: ${data.incomplete_details.reason}` : ''}`);
  }

  const raw = responseText(data);
  if (!raw) {
    const refusal = (data.output || []).flatMap(x => x?.content || []).find(x => x?.type === 'refusal')?.refusal;
    throw new Error(refusal || 'GPT salvage returned no result');
  }

  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('GPT salvage returned unreadable structured output'); }

  const result = parsed.results?.[0];
  if (!result) throw new Error('Nothing could be recovered');
  return { result, usage: data.usage, rawData: data };
}
