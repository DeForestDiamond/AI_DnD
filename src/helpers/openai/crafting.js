import { CRAFTING_PRESERVATION_RULES } from '../craftingPreservation.js';
// GPT-specific crafting helper prompt, request path, and output contracts.
// Provider-specific request handling lives here; inventory mutation remains shared game logic.

export const GPT_CRAFTING_MODEL = 'gpt-5.6-sol';
export const CRAFTING_SLOTS = ['mainhand','offhand','armor','face','head','neck','shoulders','cloak','torso','arms','hands','waist','ring','feet'];
const materialSchema={type:'object',additionalProperties:false,required:['name','count'],properties:{name:{type:'string'},count:{type:'integer',minimum:1}}};
export const singleItemSchema={type:'object',additionalProperties:false,required:['options'],properties:{options:{type:'array',minItems:2,maxItems:3,items:{type:'object',additionalProperties:false,required:['name','type','slot','damage','bonus','range','finesse','ac','heavy','maxDex','bonuses','label','count','consumes','reason'],properties:{name:{type:'string'},type:{type:'string',enum:['weapon','armor','magic','consumable','construct','misc']},slot:{type:['string','null'],enum:[...CRAFTING_SLOTS,null]},damage:{type:['string','null']},bonus:{type:['number','null']},range:{type:['string','null'],enum:['melee','ranged',null]},finesse:{type:['boolean','null']},ac:{type:['number','null']},heavy:{type:['boolean','null']},maxDex:{type:['number','null']},bonuses:{type:'string'},label:{type:'string'},count:{type:'integer',minimum:1},consumes:{type:'array',items:materialSchema},reason:{type:'string'}}}}}};
export const setSchema={type:'object',additionalProperties:false,required:['options'],properties:{options:{type:'array',minItems:2,maxItems:2,items:{type:'object',additionalProperties:false,required:['name','pieces','count','consumes','reason'],properties:{name:{type:'string'},pieces:{type:'array',minItems:3,maxItems:20,items:{type:'object',additionalProperties:false,required:['name','type','slot','damage','bonus','range','finesse','ac','heavy','maxDex','bonuses','label'],properties:{name:{type:'string'},type:{type:'string',enum:['weapon','armor','magic']},slot:{type:['string','null'],enum:[...CRAFTING_SLOTS,null]},damage:{type:['string','null']},bonus:{type:['number','null']},range:{type:['string','null'],enum:['melee','ranged',null]},finesse:{type:['boolean','null']},ac:{type:['number','null']},heavy:{type:['boolean','null']},maxDex:{type:['number','null']},bonuses:{type:'string'},label:{type:'string'}}}},count:{type:'integer',minimum:1},consumes:{type:'array',items:materialSchema},reason:{type:'string'}}}}}};
export const constructSchema={type:'object',additionalProperties:false,required:['options'],properties:{options:{type:'array',minItems:2,maxItems:2,items:{type:'object',additionalProperties:false,required:['name','cr','race','role','appearance','abilities','desc','count','consumes','reason'],properties:{name:{type:'string'},cr:{type:'number',minimum:0},race:{type:'string'},role:{type:'string'},appearance:{type:'string'},abilities:{type:'string'},desc:{type:'string'},count:{type:'integer',minimum:1},consumes:{type:'array',items:materialSchema},reason:{type:'string'}}}}}};

const BASE_RULES=`You are a master crafter in a D&D 5e-style Forgotten Realms game. Design 2-3 DISTINCT plausible results from ONLY the supplied materials. Your job is mechanical design, not narration.

PLAYER INTENT IS AUTHORITATIVE
- If PLAYER REQUEST is present, satisfy it whenever the selected materials plausibly allow it. Alternatives should be different sensible implementations, scales, or tradeoffs of THE REQUEST.
- If the request says to add, upgrade, reinforce, modify, reforge, repair, expand, mount, attach, combine with, or otherwise change a selected finished item, that finished item is the BASE ITEM. Consume it and return its upgraded/replacement form.
- Selected battleship + cannons + "add more cannons" means upgraded versions of THAT battleship, not standalone artillery or an unchanged ship.
- If there is no specific request, propose what the materials most naturally support.

MATERIAL RULES
- Power fits materials AND character level. Only consume supplied materials that make sense, never more than HAVE, and copy consumes names EXACTLY.
- Never invent missing components, infer inventory from labels, or treat words inside a description as separate materials.
- Use the important selected pieces coherently. If the pile cannot make the requested result, propose the closest achievable versions and explain briefly.

UPGRADING FINISHED ITEMS — EXISTING FUNCTIONALITY IS A HARD FLOOR
- A finished selected item being modified is consumed and replaced. Preserve its identity/name lineage and TYPE unless the requested transformation genuinely changes them.
- Preserve EVERY existing mechanical value and EVERY genuinely distinct persistent capability unless the PLAYER REQUEST explicitly asks to remove, replace, sacrifice, or transform that specific capability.
- Existing bonus keys are floors; armour AC cannot fall; weapon base/enchantment/typed bonus damage cannot fall. Normalize weapon damage without losing approximate average damage.
- Existing narrative capabilities are floors too. Flight, planar travel, command authority, sensors, wards, immunities, fabrication systems, environmental control, communications, special movement, and every other genuinely distinct capability remain present after an upgrade even when unrelated to the new materials.
- IRREDUCIBLE IDENTITY AND PROVENANCE SURVIVE COMPRESSION. If an item's significance depends on containing, being, or incorporating a unique named entity, event, phenomenon, soul, artifact, historical object, metaphysical original, or similarly singular thing, preserve that fact explicitly. Never generalize an authentic unique thing into merely its power type, energy, theme, or function. For example, an item containing the authentic first moment of creation must still explicitly contain the authentic first moment of creation; it cannot become merely creation energy, primordial radiance, or a creation-themed system.
- Preserve meaningful relationships among singular components when those relationships establish what the item fundamentally is. Compression may shorten their implementation details, but must not erase authenticity, provenance, identity, containment, or cosmological/historical significance.
- PRESERVE SEMANTICS, NOT SENTENCES. The old label is source data, not prose that must survive. Rebuild the new label from the item's actual capability set.
- Before writing, mentally group old effects and new material-derived effects into capability domains such as planar sensing/navigation, elemental control, temporal control, spirit containment, defenses, fabrication, communications, movement, or command.
- UPGRADE VERTICALLY BEFORE ADDING HORIZONTALLY. If the item already has a capability in a domain, new materials affecting that domain MUST first strengthen, broaden, deepen, or generalize that existing capability. Do not append a second overlapping subsystem merely because the new material arrived under a different name.
- Add a separate capability only when the new material creates a genuinely different function that cannot reasonably fit inside an existing domain.
- A stronger upgrade may replace several narrower old statements with one broader statement when the broader statement clearly encompasses their functional scope.
- Repeated upgrades should make a small number of systems broader and stronger, not make the label grow in proportion to upgrade count.
- NEVER delete a genuinely distinct old capability merely to shorten the label or make room for a new one. Brevity does not outrank functionality, but examples, implementation details, subsystem names, material names, and lists of applications are not automatically distinct functionality.
- An upgrade must actually improve something. Do not merely rename, rearrange bonuses, or recreate unchanged.
- FINAL UPGRADE CHECK: compare the result against the BASE ITEM by capability domain AND operational counts, capacities, scope and guarantees, not sentence. Confirm every genuinely distinct old function still exists at equal or greater scope. Do NOT restore exhaustive old wording, examples, component lists, or subsystem names merely because they appeared in the base label.

ITEM TYPE IS STRICT
- weapon: wielded weapon. armor: ONLY main chest/body armour. magic: every other wearable magical item, including shields/foci. consumable: one-use preparations.
- construct: commanded entities, golems, animated/bound entities, WAR MACHINES, VEHICLES, SHIPS, SPELLJAMMERS, mobile fortresses, and similar major machines. Vehicles/ships are construct, NOT misc.
- misc: non-gear not commanded as an entity/vehicle: stock, building material, furniture, rope, ordinary tools, art, trade goods, passive machinery/components. Do not use misc as an uncertainty bucket.

SLOTS
Use only mainhand, offhand, armor, face, head, neck, shoulders, cloak, torso, arms, hands, waist, ring, feet. Ring items ALWAYS use ring. Main chest armour is armor/armor; other wearables are magic. Shield/focus is magic/offhand. Constructs and misc have null slot.

MECHANICS
- bonuses is comma-separated calculable keys only: ac,str,dex,con,int,wis,cha, or skill names.
- INSTRUMENTS AND BARDIC FOCUSES: use the existing magic type for musical instruments, mundane or magical, including bardic spellcasting focuses. Do not introduce an instrument type. Use slot mainhand or offhand for the hand holding it. Put calculable ability/skill bonuses in bonuses (empty if none); describe its musical use, bardic spellcasting focus function, magical effects and limitations in label. Set damage, bonus, range and finesse to null; occupying a hand slot does not make it an attacking weapon. Preserve existing musical/focus capabilities when upgrading.
- WEAPON MECHANICS: damage uses base dice plus DAMAGE-ONLY flat modifier and typed dice, e.g. "2d6+9 plus 3d8 necrotic plus 3d8 fire". The +9 NEVER changes attack rolls. bonus is the separate numeric enchantment added to BOTH attack and damage (0 if none); do not include it again in damage. range is "ranged" for pistols/bows and ranged arcane weapons, otherwise "melee". finesse is a boolean. Always return bonus, range and finesse for weapons; null for other types. Keep all rolled damage in damage, never only in label. Preserve existing enchantment bonuses separately when upgrading.
- Resistances, immunities, senses, movement and narrative powers go in label, not fake bonus keys. Armour protection uses armor.ac; non-armour wearable protection may use ac:N.
- Weapon damage canonical form: ONE untyped base dice expression with modifier, then at most ONE typed bonus expression per damage type. Consolidate mixed base dice and duplicate typed groups while preserving approximate average damage. Never type the base expression; every bonus expression must have a type.
- Do NOT put attack-roll bonuses or ordinary weapon-property boilerplate in label. Accessories/armour do not get attack damage dice. Non-applicable fields are null or empty string.

LABELS — CAPABILITY SUMMARY, NOT TECHNICAL DOCUMENTATION
- A label is a persistent reference for the DM: concise enough to use, detailed enough to preserve what makes the item mechanically and fictionally distinct. It is NOT a crafting history, inventory manifest, or exhaustive technical specification.
- Organize complex items by capability domain. Give each meaningful domain enough room to remain understandable instead of forcing many unrelated powers into one giant semicolon-packed sentence.
- Prefer roughly ONE clear statement per ordinary capability domain. Exceptionally complex or identity-defining domains may use 2-3 sentences when their interactions or unusual behavior matter.
- DEFINE THE POWER ONCE at the broadest useful level. Do not enumerate obvious applications, every possible target, routine edge cases, or implementation steps merely to prove the broad power includes them.
- Example: prefer "Comprehensively detects, analyzes, maps, tracks, and manipulates planar phenomena despite hostile planar interference" over separate clauses for portals, breaches, seams, boundaries, anchors, apertures, destinations, layers, drift, timeless regions, weightless regions, and magic-warped regions.
- Example: prefer "Controls, stores, redirects, and suppresses fire across mundane, magical, divine, infernal, and planar forms" over individually documenting every flame subtype, delivery path, reservoir behavior, and protection interaction.
- Broad verbs are intentionally inclusive. Do not separately restate obvious subfunctions unless one has exceptional behavior not reasonably implied by the broad statement.
- PRESERVE DISTINCTIVE MECHANISMS WHEN THEY MATTER. Named cores, matrices, lattices, engines, organs, reservoirs, relays, lenses, or other subsystems may remain when they give the item recognizable identity, explain a non-obvious interaction, establish an important limitation/vulnerability, or matter to gameplay. Remove them when they merely restate implementation detail.
- Do not erase flavorful causality just to save words. If HOW two systems interact is unusual and useful to know, describe that interaction concisely.
- When several effects simply cooperate to create one obvious outcome, describe the outcome rather than every internal step.
- Do not repeat the same capability from different perspectives. Sensing, tracking, remembering, and pursuing the same phenomenon can often be one advanced sensing/tracking domain, unless one aspect has a genuinely exceptional function.
- Add specificity for meaningful limitations, unusual exceptions, genuinely separate powers, mechanically important properties, or especially identity-defining behavior.
- Prefer readable sentences over maximal compression. Do not create enormous clauses merely to reduce sentence count.
- No temporary/turn-based mechanics, action economy, concentration, unsupported numeric combat/healing mechanics, or saving-throw DCs.

COMPOSITION — WHAT IT IS MADE OF, NOT EVERYTHING EVER FED INTO IT
- Composition should usually be ONE concise phrase or sentence naming the dominant structural materials and a few identity-defining integrated systems.
- NEVER copy the consumes list into the label. The consumes field records what was used; the label describes what the finished item now is.
- NEVER preserve exact component quantities in a label merely for salvage. Do not write counts such as 17,402 spirit-cores, 152 giant hearts, 941 gemstones, eighteen thorns, nine crystals, or similar inventory bookkeeping unless that exact count describes installed operational equipment or meaningful capacity. Existing weapon/equipment counts must survive without the player needing to request it.
- Group related inputs aggressively. Many dragon glands, elemental organs, crystals, reservoirs, conduits, and cores may become "an integrated regenerative elemental engine." Many necromantic cores and spirit vessels may become "a vast self-restoring spirit-core matrix." Many planar sensors may become "an integrated planar sensorium."
- Named exotic materials may remain when they materially define the item's identity or substance, but variants of the same family should be grouped rather than exhaustively listed.
- Once components are integrated into a larger functional system, prefer the SYSTEM over its parts. Do not preserve both the long parts list and the system description.
- Previous upgrade history has no privileged place in the new label. Do not retain a material, component, or subsystem name solely because an earlier label mentioned it.
- Preserve recoverable substance at a useful category level where practical, accepting that exact salvage provenance may be lost. Label readability and coherent current construction take priority over historical salvage bookkeeping.

LENGTH DISCIPLINE — COMPRESS REDUNDANCY, NOT IDENTITY
- Label length should scale primarily with the number and complexity of GENUINELY DISTINCT capability domains, not item age, material count, upgrade count, power level, or rarity.
- There is NO fixed sentence target for a sufficiently complex artifact. Do not cram ten capability domains into six sentences merely to make the label short.
- Ordinary items should remain naturally brief. Complex artifacts may be substantially longer when they genuinely contain many independent domains, but each domain should still be expressed economically.
- The goal is substantial compression relative to redundant source text, NOT minimum possible length. Preserve useful flavor, meaningful mechanisms, exceptional interactions, limitations, and independently important functions.
- If compression makes a sentence difficult to parse, split it. Readability outranks sentence count.
- If a proposed label is long because it repeatedly enumerates applications, materials, subsystem internals, or overlapping versions of the same power, COMPRESS those portions. If it is long because the item truly has many distinct powers, retain them.
- On every upgrade, rewrite the ENTIRE label as a coherent current-state summary. Never append a new paragraph to the old label. Never preserve verbosity merely because it already exists.
- For item-mode constructs such as ships/vehicles/war machines, begin label with CR when useful, then concise form/composition and capability-domain summary.
- Name results for what they are/do, not merely "Enchanted X".`;

const SET_RULES=`MATCHED SET RULES
- Default: exactly 2 alternative sets with 3-6 pieces. A player-requested set size overrides this, up to 20 pieces when slots/materials support it.
- SET count is number of COMPLETE SETS, not pieces. Normally count:1 unless multiple complete identical sets were explicitly requested.
- At most one armor chest piece; other wearables are magic; weapons may be included. Legendary materials should produce genuinely legendary pieces. Names share a coherent lineage.
- Existing finished pieces are bases. Every old mechanic and genuinely distinct persistent capability on EACH PIECE is a hard floor. Preserve functional scope by capability domain, rewrite the whole label, and upgrade overlapping domains rather than appending parallel effects or component histories.`;
const CONSTRUCT_RULES=`DEDICATED CONSTRUCT MODE
- Return exactly 2 alternative companion-style constructs; ordinary inventory vehicles/ships are made in ITEM mode.
- CR: ordinary parts roughly 3-8; monstrous 10-16; legendary remains commonly 20+.
- abilities gives broad capabilities/power themes, no spell lists, damage dice, or per-day counts. appearance 2-3 sentences; desc 3-5 sentences. No action/focus/concentration command costs.`;
const BATCH_RULES=count=>count>1?`BATCH RULES\nThe player wants ${count} identical copies. Set count to ${count} when materials support it; consumes is TOTAL cost across all copies. If impossible, use the largest supported count and explain why.`:'';
export function buildGptCraftingPrompt({materialsText,characterLevel,intent='',asSet=false,asConstruct=false,quantity=1}){const modeRules=asConstruct?CONSTRUCT_RULES:asSet?SET_RULES:'';const batchRules=asSet?'':BATCH_RULES(quantity);const request=intent.trim()?`PLAYER REQUEST\n${intent.trim()}\n\nIMPORTANT: Treat this as the design target, not a suggestion.`:'PLAYER REQUEST\nNo specific design requested. Propose what these materials most naturally support.';return `${BASE_RULES}\n\n${CRAFTING_PRESERVATION_RULES}\n\nCHARACTER LEVEL\n${characterLevel}\n\n${modeRules}${modeRules?'\n\n':''}${batchRules}${batchRules?'\n\n':''}${request}\n\nMATERIALS AVAILABLE\n${materialsText}`;}
export function craftingSchemaFor({asSet=false,asConstruct=false}={}){return asConstruct?constructSchema:asSet?setSchema:singleItemSchema;}
const responseText=data=>(data?.output||[]).filter(x=>x?.type==='message').flatMap(x=>x.content||[]).filter(x=>x?.type==='output_text').map(x=>x.text||'').join('').trim();
export async function callGptCrafting({apiKey,model=GPT_CRAFTING_MODEL,materialsText,characterLevel,intent='',asSet=false,asConstruct=false,quantity=1}){if(!apiKey)throw new Error('OpenAI API key required for GPT crafting');const prompt=buildGptCraftingPrompt({materialsText,characterLevel,intent,asSet,asConstruct,quantity});const schema=craftingSchemaFor({asSet,asConstruct});const res=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model,input:[{role:'user',content:[{type:'input_text',text:prompt}]}],max_output_tokens:asSet?40000:asConstruct?20000:20000,reasoning:{effort:'low'},text:{format:{type:'json_schema',name:asConstruct?'craft_construct_options':asSet?'craft_set_options':'craft_item_options',strict:true,schema}}})});const data=await res.json();if(!res.ok)throw new Error(data?.error?.message||`OpenAI API error ${res.status}`);if(data.status==='incomplete')throw new Error(`GPT crafting reply incomplete${data.incomplete_details?.reason?`: ${data.incomplete_details.reason}`:''}`);const raw=responseText(data);if(!raw){const refusal=(data.output||[]).flatMap(x=>x?.content||[]).find(x=>x?.type==='refusal')?.refusal;throw new Error(refusal||'GPT crafting returned no result');}let parsed;try{parsed=JSON.parse(raw);}catch{throw new Error('GPT crafting returned unreadable structured output');}return {parsed,usage:data.usage,rawData:data};}


