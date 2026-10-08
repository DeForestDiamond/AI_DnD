import { NPC_FIELDS, NPC_RECORD_RULES, npcRecordFields } from '../extraction/npcRecords.js';
// GPT-specific NPC/companion extraction and update helper.
// Save mutation remains in App.jsx; this file only turns transcript context into records.

export const GPT_NPC_MODEL = 'gpt-5.6-sol';

const npcSchema = {
  type:'object', additionalProperties:false, required:['npcs'], properties:{
    npcs:{type:'array',items:{type:'object',additionalProperties:false,
      required:['name',...NPC_FIELDS], properties:{name:{type:'string'},
        ...Object.fromEntries(NPC_FIELDS.map(key => [key,{type:'string'}]))},
    }},
  },
};

const responseText = (data) => (data?.output || []).filter(x => x?.type === 'message').flatMap(x => x.content || []).filter(x => x?.type === 'output_text').map(x => x.text || '').join('').trim();

export async function callGptNpcManager({ apiKey, model = GPT_NPC_MODEL, playerName, transcript, name = '', existing = null, note = '', asCompanion = false }) {
  if (!apiKey) throw new Error('OpenAI API key required for GPT NPC manager');
  const trimmedName = String(name || '').trim();
  let task;
  if (trimmedName && existing) {
    task = `Update ONLY ${JSON.stringify(trimmedName)}. Preserve durable identity and supported facts, reorganizing them into dedicated fields and removing campaign recap as instructed. Always return a profile for an update.\nEXISTING RECORD: ${JSON.stringify(existing)}${note ? `\nPLAYER NOTE — authoritative: ${note}` : ''}`;
  } else if (trimmedName) {
    task = `Extract ONLY the named character ${JSON.stringify(trimmedName)}. If that character is not present, return an empty npcs array.${note ? `\nPLAYER NOTE — authoritative: ${note}` : ''}`;
  } else {
    task = `Extract every significant named character: recurring people and named people with an actual role in events. Skip ${playerName}, unnamed extras, and trivial one-line walk-ons. When significance is uncertain, include the character so the player can decide.${note ? `\nPLAYER NOTE — authoritative: ${note}` : ''}`;
  }

  const developer = `${NPC_RECORD_RULES}\nThe player character is ${playerName}; never create a record for them. Destination: ${asCompanion ? 'companions' : 'NPCs (existing companions remain companions)'}. Return name and all profile fields as strings.`;

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      reasoning: { effort: 'low' },
      max_output_tokens: 5000,
      input: [
        { role: 'developer', content: [{ type: 'input_text', text: developer }] },
        { role: 'user', content: [{ type: 'input_text', text: `${task}\n\nTRANSCRIPT:\n${transcript}` }] },
      ],
      text: { format: { type: 'json_schema', name: 'npc_records', strict: true, schema: npcSchema } },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI API error ${res.status}`);
  if (data.status === 'incomplete') throw new Error(`GPT NPC reply incomplete${data.incomplete_details?.reason ? `: ${data.incomplete_details.reason}` : ''}`);
  const raw = responseText(data);
  if (!raw) throw new Error('GPT NPC manager returned no result');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('GPT NPC manager returned unreadable structured output'); }
  const found = {};
  for (const entry of parsed.npcs || []) {
    const n = String(entry?.name || '').trim();
    if (!n) continue;
    found[n] = npcRecordFields(entry);
  }
  return { found, usage: data.usage, rawData: data };
}
