// GPT-specific NPC/companion extraction and update helper.
// Save mutation remains in App.jsx; this file only turns transcript context into records.

export const GPT_NPC_MODEL = 'gpt-5.6-sol';

const npcSchema = {
  type: 'object', additionalProperties: false, required: ['npcs'], properties: {
    npcs: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name','location','relationship','desc'], properties: {
      name: { type: 'string' },
      location: { type: 'string' },
      relationship: { type: 'string' },
      desc: { type: 'string' },
    } } },
  },
};

const responseText = (data) => (data?.output || []).filter(x => x?.type === 'message').flatMap(x => x.content || []).filter(x => x?.type === 'output_text').map(x => x.text || '').join('').trim();

export async function callGptNpcManager({ apiKey, playerName, transcript, name = '', existing = null, note = '' }) {
  if (!apiKey) throw new Error('OpenAI API key required for GPT NPC manager');
  const trimmedName = String(name || '').trim();
  let task;
  if (trimmedName && existing) {
    task = `Update ONLY ${JSON.stringify(trimmedName)}. EXISTING RECORD is established truth. Preserve every established fact unless the transcript or PLAYER NOTE explicitly changes it. Fold in relationship changes, significant events, current location, obligations/promises, role changes, and new facts. Never return an empty result for an update; if nothing changed, return the existing record unchanged.\nEXISTING RECORD: ${JSON.stringify(existing)}${note ? `\nPLAYER NOTE — authoritative: ${note}` : ''}`;
  } else if (trimmedName) {
    task = `Extract ONLY the named character ${JSON.stringify(trimmedName)}. If that character is not present, return an empty npcs array.${note ? `\nPLAYER NOTE — authoritative: ${note}` : ''}`;
  } else {
    task = `Extract every significant named character: recurring people and named people with an actual role in events. Skip ${playerName}, unnamed extras, and trivial one-line walk-ons. When significance is uncertain, include the character so the player can decide.${note ? `\nPLAYER NOTE — authoritative: ${note}` : ''}`;
  }

  const developer = `You maintain compact D&D character records from session transcripts. Never invent facts. Use only the transcript, any supplied existing record, and authoritative player note. The player character is ${playerName}; never create a record for them.\n\nEach record:\n- name: canonical character name.\n- location: current known town/location, or empty string if unknown.\n- relationship: short phrase describing their current relationship to ${playerName}, including obligations or allegiance when important.\n- desc: 2-4 compact sentences preserving appearance, personality, role, race if known, pronouns, and consequential facts. Mention pronoun on first reference.\n\nUpdates are MERGES, not rewrites: established facts survive unless actually contradicted or changed. Do not manufacture motives, secrets, powers, relationships, knowledge, or history.`;

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GPT_NPC_MODEL,
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
    found[n] = {
      location: String(entry?.location || ''),
      relationship: String(entry?.relationship || ''),
      desc: String(entry?.desc || ''),
    };
  }
  return { found, usage: data.usage, rawData: data };
}
