const MODEL = 'claude-sonnet-4-5';
const headers = apiKey => ({ 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' });

export async function callAnthropicNpcManager({ apiKey, playerName, messages, name = '', existing = null, note = '' }) {
  const trimmedName = name.trim();
  const shape = `{ "npcs": { "Character Name": { "location": "Town or Town - District, or empty string", "relationship": "their relationship to ${playerName} in a short phrase", "desc": "2-4 vivid sentences: appearance, personality, role, notable facts — include their gender pronoun on first mention" } } }`;
  let task;
  const existingEntry = existing ? Object.entries(existing)[0] : null;
  if (trimmedName && existingEntry) {
    task = `UPDATE the existing record for "${existingEntry[0]}". The record below is ESTABLISHED TRUTH — treat it exactly as if it had appeared in the messages. Start from it, keep everything in it, and change only what these messages actually change.\n\nThe messages do NOT need to re-describe this character. They only need to show what happened. A range covering a single event is enough — read it for: how their relationship to ${playerName} changed, significant events they took part in, where they are now, obligations or promises between them, and any new facts. Fold those into the existing text and preserve the rest where nothing contradicts it.\n\nNEVER return an empty result for an update. If the messages genuinely add nothing about this character, return the existing record unchanged.${note ? `\n\nTHE PLAYER SAYS THIS IS WHAT CHANGED — treat it as true and make sure the updated record reflects it: "${note}"` : ''}\n\nEXISTING RECORD: ${JSON.stringify(existing)}`;
  } else if (trimmedName) {
    task = `Extract a record for ONLY the character named "${trimmedName}". If they do not appear in these messages, return { "npcs": {} }.`;
  } else {
    task = `Extract every SIGNIFICANT named character: recurring people, anyone with a name and a role in events. SKIP: ${playerName} (the player), unnamed extras, and one-line walk-ons like a merchant who appears once to sell something. When in doubt about significance, include them — the player chooses what to keep.`;
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:headers(apiKey), body:JSON.stringify({ model:MODEL, max_tokens:4000, system:`You extract character records from D&D session transcripts. The player character is ${playerName} — never create a record for them. Base every record on what these messages establish PLUS, when updating, the existing record supplied in the task — that record is established truth, not invention, and must be preserved. Do not invent anything beyond those two sources. Respond with ONLY valid JSON in exactly this shape, no prose, no markdown fences: ${shape}`, messages:[...messages,{role:'user',content:task+'\n\nRespond with ONLY the JSON now.'}] }) });
  const data = await res.json();
  if(!res.ok) throw new Error(`API error ${res.status}`);
  const raw=(data.content?.[0]?.text||'').replace(/```json|```/g,'').trim();
  let parsed; try{parsed=JSON.parse(raw);}catch{const cut=data.stop_reason==='max_tokens'||!/[}\]]\s*$/.test(raw);throw new Error(cut?'The reply was cut off before it finished — narrow the message range and try again':'Extraction returned unreadable JSON — try again or narrow the range');}
  return { found: parsed.npcs || {}, usage:data.usage, rawData:data };
}
