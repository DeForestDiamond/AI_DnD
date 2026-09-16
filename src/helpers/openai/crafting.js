// GPT-specific crafting helper prompt, request path, and output contracts.
// Provider-specific request handling lives here; inventory mutation remains shared game logic.

export const GPT_CRAFTING_MODEL = 'gpt-5.6-sol';

export const CRAFTING_SLOTS = [
  'mainhand', 'offhand', 'armor', 'face', 'head', 'neck', 'shoulders',
  'cloak', 'torso', 'arms', 'hands', 'waist', 'ring', 'feet',
];

const materialSchema = {
  type: 'object', additionalProperties: false, required: ['name', 'count'],
  properties: { name: { type: 'string' }, count: { type: 'integer', minimum: 1 } },
};

export const singleItemSchema = {
  type: 'object', additionalProperties: false, required: ['options'],
  properties: { options: { type: 'array', minItems: 2, maxItems: 3, items: {
    type: 'object', additionalProperties: false,
    required: ['name', 'type', 'slot', 'damage', 'ac', 'heavy', 'maxDex', 'bonuses', 'label', 'count', 'consumes', 'reason'],
    properties: { name:{type:'string'}, type:{type:'string',enum:['weapon','armor','magic','consumable','construct','misc']}, slot:{type:['string','null'],enum:[...CRAFTING_SLOTS,null]}, damage:{type:['string','null']}, ac:{type:['number','null']}, heavy:{type:['boolean','null']}, maxDex:{type:['number','null']}, bonuses:{type:'string'}, label:{type:'string'}, count:{type:'integer',minimum:1}, consumes:{type:'array',items:materialSchema}, reason:{type:'string'} }
  } } },
};

export const setSchema = {
  type:'object', additionalProperties:false, required:['options'], properties:{ options:{ type:'array',minItems:2,maxItems:2,items:{ type:'object',additionalProperties:false,required:['name','pieces','count','consumes','reason'],properties:{ name:{type:'string'}, pieces:{type:'array',minItems:3,maxItems:20,items:{type:'object',additionalProperties:false,required:['name','type','slot','damage','ac','heavy','maxDex','bonuses','label'],properties:{name:{type:'string'},type:{type:'string',enum:['weapon','armor','magic']},slot:{type:['string','null'],enum:[...CRAFTING_SLOTS,null]},damage:{type:['string','null']},ac:{type:['number','null']},heavy:{type:['boolean','null']},maxDex:{type:['number','null']},bonuses:{type:'string'},label:{type:'string'}}}},count:{type:'integer',minimum:1},consumes:{type:'array',items:materialSchema},reason:{type:'string'} }}}}}
};

export const constructSchema = {
  type:'object',additionalProperties:false,required:['options'],properties:{options:{type:'array',minItems:2,maxItems:2,items:{type:'object',additionalProperties:false,required:['name','cr','race','role','appearance','abilities','desc','count','consumes','reason'],properties:{name:{type:'string'},cr:{type:'number',minimum:0},race:{type:'string'},role:{type:'string'},appearance:{type:'string'},abilities:{type:'string'},desc:{type:'string'},count:{type:'integer',minimum:1},consumes:{type:'array',items:materialSchema},reason:{type:'string'}}}}}}
};

const BASE_RULES = `You are a master crafter in a D&D 5e-style Forgotten Realms game. Design 2-3 DISTINCT plausible results from ONLY the supplied materials. Your job is mechanical design, not narration.

PLAYER INTENT IS AUTHORITATIVE
- If PLAYER REQUEST is present, satisfy that request whenever the selected materials plausibly allow it. Alternatives should be different sensible implementations, scales, or tradeoffs of THE REQUEST.
- If the request says to add, upgrade, reinforce, modify, reforge, repair, expand, mount, attach, combine with, or otherwise change a selected finished item, that finished item is the BASE ITEM. Consume it and return its upgraded/replacement form.
- Selected battleship + cannons + "add more cannons" means upgraded versions of THAT battleship, not standalone artillery or an unchanged ship.
- If there is no specific request, propose what the materials most naturally support.

MATERIAL RULES
- Power fits materials AND character level. Only consume supplied materials that make sense, never more than HAVE, and copy consumes names EXACTLY.
- Never invent missing components, infer inventory from labels, or treat words inside a description as separate materials.
- Use the important selected pieces coherently. If the pile cannot make the requested result, propose the closest achievable versions and explain briefly.

UPGRADING FINISHED ITEMS — ADD OR IMPROVE, NEVER TRADE AWAY
- A finished selected item being modified is consumed and replaced. Preserve identity/name lineage and TYPE unless the requested transformation genuinely changes them.
- EXISTING FUNCTIONALITY IS A HARD FLOOR. Every current bonus, AC value, damage component, function, effect, capability, defense, sense, movement mode, command authority, integrated weapon/system, immunity/resistance, utility, and other meaningful property remains present unless the PLAYER EXPLICITLY asks to remove or replace that specific thing.
- New crafting is ADDITIVE: add a new capability, or upgrade an existing overlapping capability. Never delete, weaken, merge away, summarize away, or exchange an unrelated existing capability to make room for the new one. Adding a shield does not remove a sword; adding flight does not remove teleportation; improving armor does not erase sensors; adding a weapon does not remove another weapon.
- If new material improves something the base already does, upgrade that capability in place. If it provides a genuinely new function, add it alongside everything already present.
- Every current bonus key is a floor; armour AC stays equal or rises; weapon base/enchantment/extra damage stays equal or rises. Do not move bonuses between fields or pieces and call it an upgrade.
- LABEL COMPLETENESS OVERRIDES BREVITY. Tighten wording only when every distinct function/effect remains unambiguously represented. If preserving all capabilities makes the label long, KEEP IT LONG. Never remove functionality merely to hit a length target or make a cleaner label.
- Preserve meaningful material composition because salvage relies on provenance; add newly incorporated substantial materials without erasing existing composition.
- Before returning an upgraded item, compare OLD → NEW capability by capability. If any old function/effect is absent or weaker without an explicit player-requested replacement, the result is invalid and must be corrected.

ITEM TYPE IS STRICT
- weapon: wielded weapon. armor: ONLY main chest/body armour. magic: every other wearable magical item, including shields/foci. consumable: one-use preparations.
- construct: owned/commanded entities, golems, bound beings, war machines, vehicles, ships, spelljammers and mobile fortresses. Vehicles/ships are construct, NOT misc.
- misc: non-gear not commanded as an entity/vehicle: stock, building material, furniture, rope, ordinary tools, art, trade goods, passive machinery/components.
- Do not use misc as an uncertainty/default bucket.

SLOTS
Use only mainhand, offhand, armor, face, head, neck, shoulders, cloak, torso, arms, hands, waist, ring, feet. Ring items ALWAYS use ring. Main chest armour is armor/armor; other wearables are magic. Shield/focus is magic/offhand. Constructs and misc have null slot.

MECHANICS
- bonuses is comma-separated calculable keys only: ac,str,dex,con,int,wis,cha, or skill names. Resistances, immunities, senses, movement and narrative powers go in label.
- Armour protection uses armor.ac, not bonuses.ac. Non-armour wearable protection may use ac:N.
- WEAPON DAMAGE CANONICAL FORMAT: ONE untyped base dice expression with modifier, followed by zero or more typed bonus expressions, each damage type at most once. Example: "7d8+14 plus 10d10 radiant plus 4d6 fire". Consolidate mixed base dice to one practical equivalent; collapse duplicate typed groups while preserving approximate average damage. When upgrading, normalize old damage, add upgrade, normalize again. Never put a damage type on base damage; every bonus expression must have a type.
- Do not put attack-roll bonuses or standard weapon-property boilerplate in label. Accessories and armour do not get attack damage dice. Non-applicable fields are null, or empty string for bonuses/label.

LABELS — PRESERVE CAPABILITIES FIRST
- Labels are persistent narrative guidance for the DM. Describe persistent capabilities the DM can honor: defenses, senses, movement, command functions, integrated systems, unusual utility and other properties.
- Do not write temporary turn-based mechanics, action economy, concentration, unsupported numeric combat/healing mechanics, or fake bonus keys.
- Preserve meaningful recoverable material composition, but composition may be abstracted into accurate categories. This permission to summarize COMPOSITION never permits summarizing away a FUNCTION OR EFFECT.
- Do not preserve upgrade chronology; describe what the finished item is now.
- Do not pad labels with useless prose, but labels are as long as necessary to preserve every distinct capability. Simple items may be short; complex legendary items, constructs, ships, and heavily upgraded gear may be long. NEVER compress a complex item by deleting a function/effect.
- For item-mode constructs such as ships/vehicles/war machines, begin label with CR when useful, then state form and ALL capabilities.
- Name results for what they are/do, not merely "Enchanted X".`;

const SET_RULES = `MATCHED SET RULES
- By default return exactly 2 alternative sets with 3-6 pieces, unless PLAYER REQUEST specifies a different size; requested sets may use up to 20 pieces when slots/materials support it.
- SET count is number of complete identical sets, not pieces. At most one armor chest piece; other wearables are magic; weapons may be included.
- Legendary materials should make genuinely legendary pieces; names share a coherent lineage/motif.
- Existing finished set pieces are bases: consume and upgrade them. Every old mechanic, function and effect is a floor; add or improve, never remove or trade one away unless the player explicitly requests that replacement.`;

const CONSTRUCT_RULES = `DEDICATED CONSTRUCT MODE
- Return exactly 2 alternative companion-style constructs. This mode is for entities that become commanded companions, not ordinary inventory vehicles/ships made in ITEM mode.
- CR: ordinary parts roughly 3-8; monstrous 10-16; legendary remains commonly 20+.
- abilities gives broad capabilities/power themes, no spell lists, damage dice, or per-day counts.
- appearance 2-3 sentences; desc 3-5 sentences covering what it is, how made, and behavior. No action/focus/concentration command costs.`;

const BATCH_RULES = count => count > 1 ? `BATCH RULES
The player wants ${count} identical copies. Set count to ${count} when materials support it; consumes is TOTAL cost across all copies. Mixed material stacks may support different copies. If impossible, use the largest supported count and explain why.` : '';

export function buildGptCraftingPrompt({ materialsText, characterLevel, intent = '', asSet = false, asConstruct = false, quantity = 1 }) {
  const modeRules = asConstruct ? CONSTRUCT_RULES : asSet ? SET_RULES : '';
  const batchRules = asSet ? '' : BATCH_RULES(quantity);
  const request = intent.trim() ? `PLAYER REQUEST\n${intent.trim()}\n\nIMPORTANT: Treat this as the design target, not a suggestion. Keep every proposal focused on fulfilling it.` : 'PLAYER REQUEST\nNo specific design requested. Propose what these materials most naturally support.';
  return `${BASE_RULES}\n\nCHARACTER LEVEL\n${characterLevel}\n\n${modeRules}${modeRules ? '\n\n' : ''}${batchRules}${batchRules ? '\n\n' : ''}${request}\n\nMATERIALS AVAILABLE\n${materialsText}`;
}

export function craftingSchemaFor({ asSet = false, asConstruct = false } = {}) { return asConstruct ? constructSchema : asSet ? setSchema : singleItemSchema; }
const responseText = data => (data?.output || []).filter(x => x?.type === 'message').flatMap(x => x.content || []).filter(x => x?.type === 'output_text').map(x => x.text || '').join('').trim();

export async function callGptCrafting({ apiKey, model = GPT_CRAFTING_MODEL, materialsText, characterLevel, intent = '', asSet = false, asConstruct = false, quantity = 1 }) {
  if (!apiKey) throw new Error('OpenAI API key required for GPT crafting');
  const prompt = buildGptCraftingPrompt({ materialsText, characterLevel, intent, asSet, asConstruct, quantity });
  const schema = craftingSchemaFor({ asSet, asConstruct });
  const res = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`}, body:JSON.stringify({ model, input:[{role:'user',content:[{type:'input_text',text:prompt}]}], max_output_tokens:asSet?12000:asConstruct?8000:6000, reasoning:{effort:'low'}, text:{format:{type:'json_schema',name:asConstruct?'craft_construct_options':asSet?'craft_set_options':'craft_item_options',strict:true,schema}} }) });
  const data=await res.json();
  if(!res.ok) throw new Error(data?.error?.message || `OpenAI API error ${res.status}`);
  if(data.status==='incomplete') throw new Error(`GPT crafting reply incomplete${data.incomplete_details?.reason ? `: ${data.incomplete_details.reason}` : ''}`);
  const raw=responseText(data);
  if(!raw){ const refusal=(data.output||[]).flatMap(x=>x?.content||[]).find(x=>x?.type==='refusal')?.refusal; throw new Error(refusal||'GPT crafting returned no result'); }
  let parsed; try{parsed=JSON.parse(raw);}catch{throw new Error('GPT crafting returned unreadable structured output');}
  return {parsed,usage:data.usage,rawData:data};
}
