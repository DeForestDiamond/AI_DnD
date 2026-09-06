export const ANTHROPIC_CONSOLIDATE_MODEL = 'claude-sonnet-4-5';

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

export async function callAnthropicConsolidate({ apiKey, itemsText }) {
  const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:ANTHROPIC_CONSOLIDATE_MODEL,max_tokens:5000,system:CONSOLIDATE_RULES,messages:[{role:'user',content:`SELECTED STACKS:\n${itemsText}\n\nReturn ONLY JSON: {"groups":[{"name":"Adamantine","items":[{"name":"Adamantine Ingot","count":4},{"name":"Adamantine Stock","count":8}],"reason":"same underlying material"}]}`} ]})});
  const data=await res.json(); if(!res.ok)throw new Error(`API error ${res.status}`);
  const raw=(data.content?.[0]?.text||'').replace(/```json|```/g,'').trim(); let parsed; try{parsed=JSON.parse(raw);}catch{throw new Error('Smart grouping returned unreadable JSON');}
  return { groups:parsed.groups||[], usage:data.usage, rawData:data };
}
