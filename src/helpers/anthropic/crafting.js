export const ANTHROPIC_CRAFTING_MODEL = 'claude-sonnet-4-5';

export async function callAnthropicCrafting({ apiKey, materialsText, characterLevel, intent = '', asSet = false, asConstruct = false, quantity = 1 }) {
  const levelNote = `The character is level ${characterLevel}.`;
  const wantNote = intent?.trim()
    ? `The player specifically wants: "${intent.trim()}". Honour this if the materials plausibly allow it; if they do not, say why in the reason field and propose the closest achievable thing.`
    : 'The player has no specific request — propose what these materials most naturally become.';

  const setShape = `{ "options": [ { "name": "Set Name", "pieces": [ { "name": "Piece Name", "type": "weapon|armor|magic", "slot": "the slot this piece occupies", "damage": "weapons only", "heavy": "armor only", "maxDex": "armor only", "bonuses": "stat:N pairs or empty", "label": "what this piece does" } ], "count": "how many identical copies this makes — 1 unless the player asked for more", "consumes": [{"name":"Material Name","count":2}], "reason": "one sentence on the set and why these materials make it" } ] }`;
  const shape = `{ "options": [ { "name": "Item Name", "type": "weapon|armor|magic|consumable|construct|misc — armor ONLY for a main chest piece, every other wearable is magic, construct for golems and bound entities, misc for anything that is not gear at all", "status": "construct only — dormant, active, or bound", "slot": "one of: mainhand offhand armor face head neck shoulders cloak torso arms hands waist ring feet — omit for weapon/consumable", "damage": "weapons only — base dice, optional +N enchantment, and optional extra damage dice of another type: 1d8, 1d8+2, or 1d8+1 plus 1d4 radiant, or 2d6 plus 2d6 fire", "heavy": "armor only — true if it is heavy armour that ignores the wearer's Dexterity, false otherwise", "maxDex": "armor only — a number if the armour caps the Dexterity bonus (medium armour is usually 2), otherwise null", "bonuses": "stat:N pairs like ac:1 or str:2 or perception:3, or empty string", "label": "what it does, in plain words", "count": "how many identical copies this makes — 1 unless the player asked for more", "consumes": [{"name":"Material Name","count":2}], "reason": "one sentence on why these materials make this" } ] }`;
  const constructShape = `{ "options": [ { "name": "Construct Name", "cr": "challenge rating as a number", "race": "what it is, e.g. bone colossus, infernal war-construct", "role": "what it is for, e.g. siege engine, bodyguard, hunter", "appearance": "2-3 sentences on how it looks and moves", "abilities": "the kinds of power it wields — schools of magic, damage types, broad capabilities. NO specific spell names, NO damage dice, NO per-day counts", "desc": "3-5 sentences: what it is, how it was made, how it behaves", "count": "how many identical copies this makes — 1 unless the player asked for more", "consumes": [{"name":"Material Name","count":2}], "reason": "one sentence on why these materials make this" } ] }`;

  const constructRules = asConstruct ? `

FORGING A CONSTRUCT: propose 2 alternative constructs — golems, war machines, animated dead, bound spirits. These are ENTITIES the player owns and commands, not equipment.
- CR scales to materials: ordinary parts CR 3-8, monstrous parts CR 10-16, legendary remains CR 20+.
- ABILITIES: broad kinds of power, no specific spells, damage dice, or per-day counts.
- DESC: what it is, how made, how it behaves. Do not invent action/focus/concentration costs to command it.
- Give it a real name, not a description-as-name.` : '';

  const batchN = Math.max(1, Math.min(1000, parseInt(quantity, 10) || 1));
  const batchRules = batchN > 1 ? `

MAKING SEVERAL: the player wants ${batchN} COPIES of each proposed design. Set count:${batchN} when materials support it and make consumes cover all copies together. Mixed material stacks may support different copies. If materials cannot stretch to ${batchN}, use the largest supported count and explain why. Every copy is identical.` : '';

  const setRules = asSet ? `

CRAFTING A MATCHED SET: propose exactly 2 alternative sets. Normally 3-6 pieces unless the player's request specifies another coherent size. Use different slots so pieces can coexist; at most one main chest armor piece, other wearables are magic, and a weapon may be included.
- Power each piece according to its materials. Legendary materials make genuinely legendary pieces; do not dilute the set merely because it has several pieces.
- Names must share a coherent set lineage/motif.
- UPGRADING AN EXISTING SET: selected finished equipment is BASE EQUIPMENT. Consume it and return upgraded versions preserving identity/name lineage.
- EXISTING FUNCTIONALITY IS A HARD FLOOR: every old bonus, AC value, weapon damage component, function, effect, capability, defense, sense, movement mode, immunity/resistance, utility, and other meaningful property remains unless the PLAYER EXPLICITLY asks to remove or replace that specific thing.
- New crafting is ADDITIVE: add a new capability or improve an overlapping one. Never delete, weaken, merge away, summarize away, or trade an unrelated old capability to fund a new one. Adding a shield does not remove a sword; improving armor does not erase sensors.
- Every old stat key remains equal or higher; armor AC stays equal or rises; weapons keep or raise base/enchantment/extra damage. Do not move bonuses between pieces and call it an upgrade.
- LABEL COMPLETENESS OVERRIDES BREVITY. Rewrite wording if useful, but every distinct old function/effect must remain unambiguously represented, plus the new additions/upgrades. If the complete label is long, KEEP IT LONG.
- Before returning each upgraded piece, compare OLD → NEW. If any old capability vanished or weakened without explicit player-requested replacement, correct it.` : '';

  const system = `You are a master crafter in a D&D 5e game (Forgotten Realms). Given supplied materials, propose 2-3 DISTINCT plausible results.

RULES:
- PLAYER INTENT IS AUTHORITATIVE. If the player asks to add, upgrade, reinforce, modify, reforge, repair, expand, mount, attach, or combine something with a selected finished item, that finished item is the BASE ITEM. Return improved versions of that item, not unrelated uses.
- Power fits materials AND character level. Only consume supplied materials that make sense and never more than the player has.
- consumes MAY ONLY list supplied material names and MUST copy each NAME exactly. Never invent a missing component or treat something mentioned inside a label as separate inventory.
- Every magical item needs a real mechanical effect: weapon +N/extra damage and/or supported stat:N bonuses. Never use "Enchanted X" as a substitute for an actual effect.

UPGRADING FINISHED ITEMS — ADD OR IMPROVE, NEVER TRADE AWAY:
- EXISTING FUNCTIONALITY IS A HARD FLOOR. Preserve every current bonus, AC value, damage component, function, effect, capability, defense, sense, movement mode, command authority, integrated weapon/system, immunity/resistance, utility, and meaningful property unless the PLAYER EXPLICITLY asks to remove or replace that specific thing.
- A modification is additive by default. Add a new function or upgrade an overlapping existing function. NEVER remove or weaken an unrelated capability to make room, shorten a label, balance the result, or pay for another improvement.
- Adding a shield does not remove the sword. Adding flight does not remove teleportation. Improving armor does not erase sensors. Adding a weapon does not remove another weapon.
- Every existing bonus key is a floor; armor AC stays equal or rises; weapon base/enchantment/extra damage stays equal or rises.
- LABEL COMPLETENESS OVERRIDES BREVITY. Compression is allowed only when every distinct old function/effect remains unmistakably present. Complex upgraded items may have long labels. Never summarize away functionality.
- Preserve meaningful material composition for later salvage; new substantial materials are added without erasing old provenance.
- SELF-CHECK OLD → NEW before output. Any old function/effect missing or weaker without explicit player-requested replacement makes the proposal invalid.

TYPE AND MECHANICS:
- armor ONLY for main chest/body armor. Every other wearable is magic with its proper slot. Shields/foci are magic/offhand.
- misc is non-gear stock, tools, art, trade goods, passive machinery/components. construct is an owned/commanded entity, golem, bound being, war machine, vehicle, ship, spelljammer, or mobile fortress.
- Wearable power uses supported bonuses: ac,str,dex,con,int,wis,cha and skill names. Unsupported resistances/immunities/senses/powers belong in label.
- Armor protection comes from its ac field; other worn pieces may use ac:N bonus.
- Elemental/divine weapon extra damage belongs in damage as "plus <dice> <type>". Do not hide rolled damage only in label.
- Labels contain persistent narrative capabilities the DM must honor. Do not invent action economy, reactions, concentration, per-turn limits, or vague focus/attention costs the game does not track.
- Labels may be concise for simple items, but there is NO hard label length target for upgraded/complex items. Preserve all distinct capabilities first; remove only redundant prose, not functions/effects.
- Charges/per-day effects are narrative text; there is no charge counter.
- ${levelNote}${constructRules}${setRules}${batchRules}
Respond with ONLY valid JSON in exactly this shape, no prose, no markdown fences: ${asConstruct ? constructShape : asSet ? setShape : shape}`;

  const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:ANTHROPIC_CRAFTING_MODEL,max_tokens:asSet||asConstruct?4000:3000,system,messages:[{role:'user',content:`MATERIALS AVAILABLE:\n${materialsText}\n\n${wantNote}\n\nRespond with ONLY the JSON now.`}]})});
  const data=await res.json(); if(!res.ok)throw new Error(`API error ${res.status}`);
  const raw=(data.content?.[0]?.text||'').replace(/```json|```/g,'').trim(); let parsed; try{parsed=JSON.parse(raw);}catch{const truncated=data.stop_reason==='max_tokens'||!/[}\]]\s*$/.test(raw);throw new Error(truncated?'The forge ran long and the answer was cut off — select fewer materials, or try again':'Crafting returned unreadable JSON — try again');}
  return { parsed, usage:data.usage, rawData:data };
}
