export const GROK_CONSOLIDATE_MODEL = 'grok-4.3';

const schema = {
  type: 'object', additionalProperties: false, required: ['groups'], properties: {
    groups: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name','items','reason'], properties: {
      name: { type: 'string' },
      items: { type: 'array', minItems: 2, items: { type: 'object', additionalProperties: false, required: ['name','count'], properties: {
        name: { type: 'string' }, count: { type: 'integer', minimum: 1 },
      } } },
      reason: { type: 'string' },
    } } },
  },
};

export const CONSOLIDATE_RULES = `You are an inventory cleanup helper for a D&D-style game. The player has explicitly asked you to identify selected inventory stacks that can be ABSTRACTED into one simpler crafting-material stack.

This is not physical realism and it is not salvage. The player is intentionally collapsing distinctions they do not care about. Manufactured components may be treated as their underlying material when the material is obvious.

Examples:
- Adamantine, Adamantine Abrasive, Adamantine Chain-Shear Pin, Adamantine Control Spike, Adamantine Filigree, Adamantine Gearing, Adamantine Stock, Adamantine Hull Ingot, Adamantine Ingot -> Adamantine.
- Waterdeep Iron Ingot, Iron Ingot, Iron Stock, Scrap Iron -> Iron.
- Mithral Wire, Mithral Plate, Mithral Stock -> Mithral.

RULES:
- Use ONLY items the player submitted. Never invent, add, split, or increase quantities.
- Every source item can appear in at most one proposed group.
- Only propose groups containing at least TWO distinct submitted item names.
- The result name should be the simplest useful shared material identity, usually one or two words.
- Be aggressive about manufactured forms, location/culture prefixes, stock/ingot/scrap/plating/wire/gearing/fittings and similar forms when the shared material is clear.
- Do NOT merge genuinely different materials merely because they are both metals, woods, monster parts, gems, etc. Iron is not steel; adamantine is not mithral; red dragon scale is not generic dragon scale unless the selected names truly represent the same material identity.
- Do NOT merge unique magical essences, souls, named artifacts, creature-specific organs, or other things without a clear shared material identity.
- If something has no sensible group, omit it entirely. Do not create singleton groups.
- Preserve the exact submitted source names in each group's items array.
- Preserve each submitted quantity exactly.
- This response is only a PROPOSAL. The player will approve groups before the app changes inventory.

Return concise JSON only.`;

const responseText = (data) => (data?.output || [])
  .filter(item => item?.type === 'message')
  .flatMap(item => item.content || [])
  .filter(part => part?.type === 'output_text')
  .map(part => part.text || '')
  .join('').trim();

export async function callGrokConsolidate({ apiKey, model = GROK_CONSOLIDATE_MODEL, itemsText }) {
  if (!apiKey) throw new Error('xAI API key required for smart grouping');
  const res = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      input: [
        { role: 'developer', content: [{ type: 'input_text', text: CONSOLIDATE_RULES }] },
        { role: 'user', content: [{ type: 'input_text', text: `SELECTED STACKS:\n${itemsText}` }] },
      ],
      max_output_tokens: 5000,
      reasoning: { effort: 'low' },
      text: { format: { type: 'json_schema', name: 'inventory_groups', strict: true, schema } },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `xAI API error ${res.status}`);
  if (data.status === 'incomplete') throw new Error(`Smart grouping reply incomplete${data.incomplete_details?.reason ? `: ${data.incomplete_details.reason}` : ''}`);
  const raw = responseText(data);
  if (!raw) throw new Error('Smart grouping returned no result');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Smart grouping returned unreadable structured output'); }
  return { groups: parsed.groups || [], usage: data.usage, rawData: data };
}
