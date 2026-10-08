import { NPC_FIELDS, NPC_RECORD_RULES, npcRecordFields } from '../extraction/npcRecords.js';
const MODEL = 'claude-sonnet-4-5';
const headers = apiKey => ({ 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true' });

export async function callAnthropicNpcManager({ apiKey, playerName, messages, name = '', existing = null, note = '', asCompanion = false }) {
  const trimmedName = name.trim();
  const shape = JSON.stringify({npcs:{'Character Name':Object.fromEntries(NPC_FIELDS.map(key => [key,'string; empty if unknown']))}});
  let task;
  const existingEntry = existing ? Object.entries(existing)[0] : null;
  if (trimmedName && existingEntry) {
    task = `Update ONLY ${JSON.stringify(existingEntry[0])}. Preserve durable identity and supported facts, reorganizing them into dedicated fields and removing campaign recap as instructed. Always return a profile for an update.\nEXISTING RECORD: ${JSON.stringify(existing)}${note ? `\nPLAYER NOTE — authoritative: ${note}` : ''}`;
  } else if (trimmedName) {
    task = `Extract a record for ONLY the character named "${trimmedName}". If they do not appear in these messages, return { "npcs": {} }.${note ? `\n\nPLAYER NOTE — authoritative: "${note}"` : ''}`;
  } else {
    task = `Extract every SIGNIFICANT named character: recurring people, anyone with a name and a role in events. SKIP: ${playerName} (the player), unnamed extras, and one-line walk-ons like a merchant who appears once to sell something. When in doubt about significance, include them — the player chooses what to keep.${note ? `\n\nPLAYER NOTE — authoritative: "${note}"` : ''}`;
  }
  const system = `${NPC_RECORD_RULES}\nThe player character is ${playerName}; never create a record for them. Destination: ${asCompanion ? 'companions' : 'NPCs (existing companions remain companions)'}. Respond with ONLY valid JSON, no markdown: ${shape}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:headers(apiKey), body:JSON.stringify({ model:MODEL, max_tokens:4000, system, messages:[...messages,{role:'user',content:task+'\n\nRespond with ONLY the JSON now.'}] }) });
  const data = await res.json();
  if(!res.ok) throw new Error(`API error ${res.status}`);
  const raw=(data.content?.[0]?.text||'').replace(/```json|```/g,'').trim();
  let parsed; try{parsed=JSON.parse(raw);}catch{const cut=data.stop_reason==='max_tokens'||!/[}\]]\s*$/.test(raw);throw new Error(cut?'The reply was cut off before it finished — narrow the message range and try again':'Extraction returned unreadable JSON — try again or narrow the range');}
  return { found: Object.fromEntries(Object.entries(parsed.npcs || {}).map(([name, record]) => [name, npcRecordFields(record)])), usage:data.usage, rawData:data };
}
