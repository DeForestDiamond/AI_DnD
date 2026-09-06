export const ANTHROPIC_SALVAGE_MODEL = 'claude-sonnet-4-5';
const shape = `{ "results": [ { "recovers": [{"name":"Material Name","count":2}], "destroyed": ["Item Name"], "note": "one sentence on what survived the process and what was lost" } ] }`;

const SYSTEM = `You are a salvager in a D&D 5e game (Forgotten Realms). Given finished items, determine what raw materials are recovered by breaking them down.

RULES:
- TWO DIFFERENT JOBS, decide which this is:
  (a) BREAKING DOWN SOMETHING MADE — a forged weapon, worked armour, a construct, an enchanted item. Recovery is LOSSY: the making is undone and some of it is ruined. Recover meaningfully less than went in, and never more than the item plausibly contains.
  (b) HARVESTING A BODY — a corpse, carcass, cadaver, severed part, or any unworked remains. This is NOT lossy: nothing was invested to be destroyed, the material is simply there to be taken. Return the FULL sensible yield of what such a creature actually contains — hide, scales, bone, claws, fangs, organs, blood, venom glands, essence — in quantities that match its size and power. A dragon carcass yields a great deal; a wolf yields a little.
  A body that has been WORKED into something (a bone golem, a skull carved into a focus) is case (a) again — the construction is what gets ruined.
- Recover the item's actual substance: a steel blade yields steel, a drake-hide cloak yields hide and maybe scales, a wand yields its focus crystal and rare wood. Magical items may yield a residue or spent component alongside the physical parts.
- Some things are NOT worth salvaging or cannot be: state that in the note and return an empty recovers array rather than inventing materials.
- NAME MATERIALS BY WHAT THEY ARE, NEVER BY WHAT THEY CAME FROM. This is the most important rule here. A recovered material must be a GENERIC STOCK NAME that will stack with the same material recovered from anything else — otherwise every salvage adds unique clutter to the inventory and nothing accumulates into a usable quantity.
  WRONG: "Iron Spear Head", "Wooden Spear Shaft"        RIGHT: "Scrap Iron", "Wooden Haft"
  WRONG: "Sword Blade", "Sword Hilt", "Sword Pommel"    RIGHT: "Scrap Steel" (one entry, not three)
  WRONG: "Hexapod Leg Actuator"                          RIGHT: "Arcane Actuator"
  WRONG: "Runewarden Cuirass Plating"                    RIGHT: "Mithral Plating"
  The test: could this exact name come out of salvaging a DIFFERENT item? If not, rename it until it could.
- CONSOLIDATE ACROSS THE WHOLE SUBMISSION. Do not give each submitted item its own material. Everything made of the same stuff collapses into ONE entry with the quantities summed, no matter what it used to be. Iron rims, iron axles, iron bosses, iron banding, iron spikes, iron rods and iron plate are all just SCRAP IRON — one line, not seven. The same for steel, mithral, wood, leather.
- NEVER USE "<thing> STOCK" OR A COMPONENT NAME. "Iron Spearhead Stock", "Steel Caliper Stock", "Mithral Weapon Mount", "Steel Bolt Head", "Wooden Bolt Shaft", "Arcanite Core Housings" all name the thing it came from. Say what the material IS: Scrap Iron, Scrap Steel, Mithral Stock, Wood.
- DO NOT MINE THE ITEM'S NAME FOR PARTS. Descriptive words tell you what a thing is LIKE, not what it separates into. A "Dwarven Strongbox - Triple-Locked" does not yield three locks — it yields iron and maybe one lock mechanism. "Iron-Rimmed", "Reinforced", "Masterwork", "Bladed", "Runed" and the like describe quality or construction, not a parts list to be counted off.
- SALVAGE YIELDS RAW MATERIAL, NOT WORKING PARTS. Breaking something down destroys its construction: a chest becomes scrap iron and fittings, not intact locks you could refit. The exception is genuinely precision or arcane components — an arcane core, an actuator, a focusing lens — which survive being extracted and are worth naming.
- KEEP THE LIST SHORT. Even a hundred submitted items should come back as roughly TEN TO FIFTEEN material types with large quantities — not one type per item. A long list means you have not consolidated. Distinct materials that genuinely differ (mithral vs steel, ruby vs sapphire, arcanite vs crystal) stay separate; variations of the same material do not.
- A genuinely distinctive MATERIAL still keeps its name — "Red Dragon Scale", "Demon Lord Essence", "Mithral Wire" are material types, not parts of a particular item, and they stack correctly across salvages.
- Return exactly ONE result object, but it must cover EVERY submitted item in full. Harvest each creature or item for ITS OWN parts and list them SEPARATELY — a drake and a troll and an owlbear yield drake scale, troll hide and owlbear claws as distinct entries, never a merged pool of "monster parts". Submitting five corpses must produce roughly five times the materials of submitting one; do not compress a large haul into a short list. There is no cap on how many entries the recovers array may hold — length it to match what was actually submitted.
- Multiply quantities by how many of each item were submitted: three drake carcasses yield three drakes' worth.
Respond with ONLY valid JSON in exactly this shape, no prose, no markdown fences: ${shape}`;

export async function callAnthropicSalvage({ apiKey, itemsText }) {
  const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:ANTHROPIC_SALVAGE_MODEL,max_tokens:12000,system:SYSTEM,messages:[{role:'user',content:`ITEMS TO BREAK DOWN:\n${itemsText}\n\nRespond with ONLY the JSON now.`}]})});
  const data=await res.json(); if(!res.ok)throw new Error(`API error ${res.status}`);
  const raw=(data.content?.[0]?.text||'').replace(/```json|```/g,'').trim(); let parsed; try{parsed=JSON.parse(raw);}catch{const cut=data.stop_reason==='max_tokens'||!/[}\]]\s*$/.test(raw);throw new Error(cut?'The reply was cut off before it finished — select fewer items and try again':'Salvage returned unreadable JSON — try again');}
  const result=(parsed.results||[])[0]; if(!result)throw new Error('Nothing could be recovered');
  return { result, usage:data.usage, rawData:data };
}
