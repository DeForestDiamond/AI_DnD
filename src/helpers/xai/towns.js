// Grok-specific town/location extraction and update helper.
// Save mutation remains in App.jsx.

export const GROK_TOWN_MODEL = 'grok-4.3';

const townSchema = {
  type: 'object', additionalProperties: false, required: ['towns'], properties: {
    towns: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name','desc','status','notable_locations','minor_residents'], properties: {
      name: { type: 'string' },
      desc: { type: 'string' },
      status: { type: 'string' },
      notable_locations: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name','desc'], properties: { name: { type: 'string' }, desc: { type: 'string' } } } },
      minor_residents: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name','desc'], properties: { name: { type: 'string' }, desc: { type: 'string' } } } },
    } } },
  },
};

const responseText = (data) => (data?.output || []).filter(x => x?.type === 'message').flatMap(x => x.content || []).filter(x => x?.type === 'output_text').map(x => x.text || '').join('').trim();

export async function callGrokTownManager({ apiKey, model = GROK_TOWN_MODEL, playerName, transcript, name = '', existing = null, note = '' }) {
  if (!apiKey) throw new Error('xAI API key required for Grok town manager');
  const trimmedName = String(name || '').trim();
  let task;
  if (trimmedName && existing) {
    task = `Update ONLY ${JSON.stringify(trimmedName)}. EXISTING RECORD is established truth. Preserve everything unless the transcript or PLAYER NOTE changes it. Add new locations/residents alongside existing ones; do not drop old entries merely because this transcript does not mention them. If nothing changed, return the existing record unchanged.\nEXISTING RECORD: ${JSON.stringify(existing)}${note ? `\nPLAYER NOTE — authoritative: ${note}` : ''}`;
  } else if (trimmedName) {
    task = `Extract ONLY the settlement/location ${JSON.stringify(trimmedName)}. If absent, return an empty towns array.${note ? `\nPLAYER NOTE — authoritative: ${note}` : ''}`;
  } else {
    task = `Extract every significant settlement or named major location where meaningful events happened or the player may reasonably return. Skip trivial one-line pass-through places. When significance is uncertain, include it.${note ? `\nPLAYER NOTE — authoritative: ${note}` : ''}`;
  }

  const developer = `You maintain compact D&D settlement/location records from session transcripts. Never invent facts. Use only the transcript, supplied existing record, and authoritative player note. The player is ${playerName}.\n\nEach record:\n- name: canonical place name.\n- desc: 1-3 compact sentences describing what the place is and its established character/atmosphere.\n- status: current state relative to ${playerName}: base, allied, hostile, damaged, passing through, etc.\n- notable_locations: named places worth remembering, each with a one-line factual description.\n- minor_residents: named locals not important enough for a full NPC record, each with a one-line description including pronoun when known.\n\nUpdates are MERGES, not rewrites. Preserve established locations/residents/facts unless explicitly changed. Do not invent hidden factions, mysteries, businesses, residents, history, or consequences.`;

  const res = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      reasoning: { effort: 'low' },
      max_output_tokens: 5000,
      input: [
        { role: 'developer', content: [{ type: 'input_text', text: developer }] },
        { role: 'user', content: [{ type: 'input_text', text: `${task}\n\nTRANSCRIPT:\n${transcript}` }] },
      ],
      text: { format: { type: 'json_schema', name: 'town_records', strict: true, schema: townSchema } },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `xAI API error ${res.status}`);
  if (data.status === 'incomplete') throw new Error(`Grok town reply incomplete${data.incomplete_details?.reason ? `: ${data.incomplete_details.reason}` : ''}`);
  const raw = responseText(data);
  if (!raw) throw new Error('Grok town manager returned no result');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Grok town manager returned unreadable structured output'); }

  const toDict = (arr) => Object.fromEntries((arr || []).map(x => [String(x?.name || '').trim(), String(x?.desc || '')]).filter(([n]) => n));
  const found = {};
  for (const entry of parsed.towns || []) {
    const n = String(entry?.name || '').trim();
    if (!n) continue;
    found[n] = {
      desc: String(entry?.desc || ''),
      status: String(entry?.status || ''),
      notable_locations: toDict(entry?.notable_locations),
      minor_residents: toDict(entry?.minor_residents),
    };
  }
  return { found, usage: data.usage, rawData: data };
}
