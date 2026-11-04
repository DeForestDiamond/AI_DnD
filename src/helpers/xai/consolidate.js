import { CONSOLIDATE_RULES } from '../consolidation.js';
export { CONSOLIDATE_RULES } from '../consolidation.js';

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
