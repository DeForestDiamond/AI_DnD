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
  properties: {
    options: {
      type: 'array', minItems: 2, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'type', 'slot', 'damage', 'ac', 'heavy', 'maxDex', 'bonuses', 'label', 'count', 'consumes', 'reason'],
        properties: {
          name: { type: 'string' }, type: { type: 'string', enum: ['weapon', 'armor', 'magic', 'consumable', 'construct', 'misc'] },
          slot: { type: ['string', 'null'], enum: [...CRAFTING_SLOTS, null] }, damage: { type: ['string', 'null'] },
          ac: { type: ['number', 'null'] }, heavy: { type: ['boolean', 'null'] }, maxDex: { type: ['number', 'null'] },
          bonuses: { type: 'string' }, label: { type: 'string' }, count: { type: 'integer', minimum: 1 },
          consumes: { type: 'array', items: materialSchema }, reason: { type: 'string' },
        },
      },
    },
  },
};

export const setSchema = {
  type: 'object', additionalProperties: false, required: ['options'],
  properties: {
    options: {
      type: 'array', minItems: 2, maxItems: 2,
      items: {
        type: 'object', additionalProperties: false, required: ['name', 'pieces', 'count', 'consumes', 'reason'],
        properties: {
          name: { type: 'string' },
          pieces: {
            type: 'array', minItems: 3, maxItems: 20,
            items: {
              type: 'object', additionalProperties: false,
              required: ['name', 'type', 'slot', 'damage', 'ac', 'heavy', 'maxDex', 'bonuses', 'label'],
              properties: {
                name: { type: 'string' }, type: { type: 'string', enum: ['weapon', 'armor', 'magic'] },
                slot: { type: ['string', 'null'], enum: [...CRAFTING_SLOTS, null] }, damage: { type: ['string', 'null'] },
                ac: { type: ['number', 'null'] }, heavy: { type: ['boolean', 'null'] }, maxDex: { type: ['number', 'null'] },
                bonuses: { type: 'string' }, label: { type: 'string' },
              },
            },
          },
          count: { type: 'integer', minimum: 1 }, consumes: { type: 'array', items: materialSchema }, reason: { type: 'string' },
        },
      },
    },
  },
};

export const constructSchema = {
  type: 'object', additionalProperties: false, required: ['options'],
  properties: {
    options: {
      type: 'array', minItems: 2, maxItems: 2,
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'cr', 'race', 'role', 'appearance', 'abilities', 'desc', 'count', 'consumes', 'reason'],
        properties: {
          name: { type: 'string' }, cr: { type: 'number', minimum: 0 }, race: { type: 'string' }, role: { type: 'string' },
          appearance: { type: 'string' }, abilities: { type: 'string' }, desc: { type: 'string' }, count: { type: 'integer', minimum: 1 },
          consumes: { type: 'array', items: materialSchema }, reason: { type: 'string' },
        },
      },
    },
  },
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

UPGRADING FINISHED ITEMS — EXISTING FUNCTIONALITY IS A HARD FLOOR
- A finished selected item being modified is consumed and replaced. Preserve its identity/name lineage and TYPE unless the requested transformation genuinely changes them.
- Preserve EVERY existing mechanical value and EVERY distinct persistent capability unless the PLAYER REQUEST explicitly asks to remove, replace, sacrifice, or transform that specific capability.
- Existing bonus keys are floors; armour AC cannot fall; weapon base/enchantment/typed bonus damage cannot fall. Normalize weapon damage without losing approximate average damage.
- Existing narrative capabilities are floors too. Flight, planar travel, command authority, sensors, wards, immunities, fabrication systems, environmental control, communications, special movement, and every other meaningful capability remain present after an upgrade even when unrelated to the new materials.
- NEVER delete an old capability merely to shorten the label, reduce complexity, avoid overlap, or make room for a new capability. Brevity does not outrank preservation.
- When a new material overlaps an existing capability, improve/expand that capability rather than duplicating it. When it adds something genuinely new, append that capability while retaining unrelated old ones.
- You may merge wording ONLY when the resulting wording unambiguously preserves the full scope of every merged capability. If merging would make any old function narrower, vague, or disappear, keep separate clauses.
- An upgrade must actually improve something. Do not merely rename, rearrange bonuses, or recreate unchanged.
- Preserve meaningful recoverable material composition for salvage, including newly incorporated substantial materials.
- FINAL UPGRADE CHECK: compare the proposed result against the BASE ITEM line by line. If any distinct old mechanic, material category, or persistent capability is absent or weaker without an explicit player request to remove it, the proposal is invalid and MUST be rewritten before output.

ITEM TYPE IS STRICT
- weapon: wielded weapon. armor: ONLY main chest/body armour. magic: every other wearable magical item, including shields/foci. consumable: one-use preparations.
- construct: commanded entities, golems, animated/bound entities, WAR MACHINES, VEHICLES, SHIPS, SPELLJAMMERS, mobile fortresses, and similar major machines. Vehicles/ships are construct, NOT misc.
- misc: non-gear not commanded as an entity/vehicle: stock, building material, furniture, rope, ordinary tools, art, trade goods, passive machinery/components.
- Do not use misc as an uncertainty bucket.

SLOTS
Use only mainhand, offhand, armor, face, head, neck, shoulders, cloak, torso, arms, hands, waist, ring, feet. Ring items ALWAYS use ring. Main chest armour is armor/armor; other wearables are magic. Shield/focus is magic/offhand. Constructs and misc have null slot.

MECHANICS
- bonuses is comma-separated calculable keys only: ac,str,dex,con,int,wis,cha, or skill names.
- Resistances, immunities, senses, movement and narrative powers go in label, not fake bonus keys. Armour protection uses armor.ac; non-armour wearable protection may use ac:N.
- Weapon damage canonical form: ONE untyped base dice expression with modifier, then at most ONE typed bonus expression per damage type. Consolidate mixed base dice and duplicate typed groups while preserving approximate average damage. Never type the base expression; every bonus expression must have a type.
- Do NOT put attack-roll bonuses or ordinary weapon-property boilerplate in label. Accessories/armour do not get attack damage dice. Non-applicable fields are null or empty string.

LABELS — PERSISTENT CAPABILITIES AND SALVAGE-RELEVANT COMPOSITION
- Labels are persistent DM guidance. Include what the item can actually do: important protection, movement, senses, command, travel, utility, environmental effects, fabrication, communications, and other persistent capabilities.
- No temporary/turn-based mechanics, action economy, concentration, unsupported numeric combat/healing mechanics, or saving-throw DCs.
- Preserve material provenance compactly: meaningful recoverable metals, woods, hides/scales, gems/crystals, planar/monster substances, cores, and distinct salvageable subsystems. Abstract tiny components and construction chronology.
- Simple items should remain concise. COMPLEX ITEMS MAY HAVE LONG LABELS. Legendary constructs, ships, fortresses, and repeatedly upgraded items may require many clauses or several sentences. NEVER shorten a complex upgraded item's label by deleting functionality. Completeness outranks brevity.
- On upgrade, rewrite for clarity but preserve all old capabilities. Summarize wording, not functionality. A capability may disappear only when the PLAYER REQUEST explicitly says it is being removed/replaced/sacrificed.
- For item-mode constructs such as ships/vehicles/war machines, begin label with CR when useful, then form, composition, and ALL persistent capabilities.
- Name results for what they are/do, not merely "Enchanted X".`;

const SET_RULES = `MATCHED SET RULES
- Default: exactly 2 alternative sets with 3-6 pieces. A player-requested set size overrides this, up to 20 pieces when slots/materials support it.
- SET count is number of COMPLETE SETS, not pieces. Normally count:1 unless multiple complete identical sets were explicitly requested.
- At most one armor chest piece; other wearables are magic; weapons may be included. Legendary materials should produce genuinely legendary pieces. Names share a coherent lineage.
- Existing finished pieces are bases. Every old mechanic and persistent narrative capability on EACH PIECE is a hard floor. Upgrade each without deleting unrelated functionality. New capabilities are additive unless explicitly replacing an old one.`;

const CONSTRUCT_RULES = `DEDICATED CONSTRUCT MODE
- Return exactly 2 alternative companion-style constructs; ordinary inventory vehicles/ships are made in ITEM mode.
- CR: ordinary parts roughly 3-8; monstrous 10-16; legendary remains commonly 20+.
- abilities gives broad capabilities/power themes, no spell lists, damage dice, or per-day counts. appearance 2-3 sentences; desc 3-5 sentences. No action/focus/concentration command costs.`;

const BATCH_RULES = count => count > 1 ? `BATCH RULES\nThe player wants ${count} identical copies. Set count to ${count} when materials support it; consumes is TOTAL cost across all copies. If impossible, use the largest supported count and explain why.` : '';

export function buildGptCraftingPrompt({ materialsText, characterLevel, intent = '', asSet = false, asConstruct = false, quantity = 1 }) {
  const modeRules = asConstruct ? CONSTRUCT_RULES : asSet ? SET_RULES : '';
  const batchRules = asSet ? '' : BATCH_RULES(quantity);
  const request = intent.trim() ? `PLAYER REQUEST\n${intent.trim()}\n\nIMPORTANT: Treat this as the design target, not a suggestion.` : 'PLAYER REQUEST\nNo specific design requested. Propose what these materials most naturally support.';
  return `${BASE_RULES}\n\nCHARACTER LEVEL\n${characterLevel}\n\n${modeRules}${modeRules ? '\n\n' : ''}${batchRules}${batchRules ? '\n\n' : ''}${request}\n\nMATERIALS AVAILABLE\n${materialsText}`;
}

export function craftingSchemaFor({ asSet = false, asConstruct = false } = {}) { return asConstruct ? constructSchema : asSet ? setSchema : singleItemSchema; }
const responseText = data => (data?.output || []).filter(x => x?.type === 'message').flatMap(x => x.content || []).filter(x => x?.type === 'output_text').map(x => x.text || '').join('').trim();

export async function callGptCrafting({ apiKey, model = GPT_CRAFTING_MODEL, materialsText, characterLevel, intent = '', asSet = false, asConstruct = false, quantity = 1 }) {
  if (!apiKey) throw new Error('OpenAI API key required for GPT crafting');
  const prompt = buildGptCraftingPrompt({ materialsText, characterLevel, intent, asSet, asConstruct, quantity });
  const schema = craftingSchemaFor({ asSet, asConstruct });
  const res = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`}, body:JSON.stringify({ model, input:[{role:'user',content:[{type:'input_text',text:prompt}]}], max_output_tokens:asSet?40000:asConstruct?20000:20000, reasoning:{effort:'low'}, text:{format:{type:'json_schema',name:asConstruct?'craft_construct_options':asSet?'craft_set_options':'craft_item_options',strict:true,schema}} }) });
  const data = await res.json(); if(!res.ok)throw new Error(data?.error?.message||`OpenAI API error ${res.status}`); if(data.status==='incomplete')throw new Error(`GPT crafting reply incomplete${data.incomplete_details?.reason?`: ${data.incomplete_details.reason}`:''}`);
  const raw=responseText(data); if(!raw){const refusal=(data.output||[]).flatMap(x=>x?.content||[]).find(x=>x?.type==='refusal')?.refusal;throw new Error(refusal||'GPT crafting returned no result');}
  let parsed; try{parsed=JSON.parse(raw);}catch{throw new Error('GPT crafting returned unreadable structured output');} return {parsed,usage:data.usage,rawData:data};
}
