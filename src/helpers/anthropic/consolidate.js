import { CONSOLIDATE_RULES } from '../consolidation.js';
export { CONSOLIDATE_RULES } from '../consolidation.js';

export const ANTHROPIC_CONSOLIDATE_MODEL = 'claude-sonnet-4-5';

export async function callAnthropicConsolidate({ apiKey, itemsText }) {
  const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:ANTHROPIC_CONSOLIDATE_MODEL,max_tokens:5000,system:CONSOLIDATE_RULES,messages:[{role:'user',content:`SELECTED STACKS:\n${itemsText}\n\nReturn ONLY JSON: {"groups":[{"name":"Adamantine","items":[{"name":"Adamantine Ingot","count":4},{"name":"Adamantine Stock","count":8}],"reason":"same underlying material"}]}`} ]})});
  const data=await res.json(); if(!res.ok)throw new Error(`API error ${res.status}`);
  const raw=(data.content?.[0]?.text||'').replace(/```json|```/g,'').trim(); let parsed; try{parsed=JSON.parse(raw);}catch{throw new Error('Smart grouping returned unreadable JSON');}
  return { groups:parsed.groups||[], usage:data.usage, rawData:data };
}
