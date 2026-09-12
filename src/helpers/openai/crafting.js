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
          name: { type: 'string' },
          type: { type: 'string', enum: ['weapon', 'armor', 'magic', 'consumable', 'construct', 'misc'] },
          slot: { type: ['string', 'null'], enum: [...CRAFTING_SLOTS, null] },
          damage: { type: ['string', 'null'] }, ac: { type: ['number', 'null'] },
          heavy: { type: ['boolean', 'null'] }, maxDex: { type: ['number', 'null'] },
          bonuses: { type: 'string' }, label: { type: 'string' },
          count: { type: 'integer', minimum: 1 },
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
                slot: { type: ['string', 'null'], enum: [...CRAFTING_SLOTS, null] },
                damage: { type: ['string', 'null'] }, ac: { type: ['number', 'null'] },
                heavy: { type: ['boolean', 'null'] }, maxDex: { type: ['number', 'null'] },
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
          appearance: { type: 'string' }, abilities: { type: 'string' }, desc: { type: 'string' },
          count: { type: 'integer', minimum: 1 }, consumes: { type: 'array', items: materialSchema }, reason: { type: 'string' },
        },
      },
    },
  },
};

// These rules intentionally mirror the mature Claude crafter's game semantics.
// GPT gets its own prompt/request implementation, but not a different crafting game.
const BASE_RULES = `You are a master crafter in a D&D 5e-style Forgotten Realms game. Design 2-3 DISTINCT plausible results from ONLY the supplied materials. Your job is mechanical design, not narration.

PLAYER INTENT IS AUTHORITATIVE
- If PLAYER REQUEST is present, satisfy that request whenever the selected materials plausibly allow it. Do not wander into unrelated alternative uses merely because they are possible.
- Alternatives should be different sensible implementations, scales, or tradeoffs of THE REQUEST.
- If the request says to add, upgrade, reinforce, modify, reforge, repair, expand, mount, attach, combine with, or otherwise change a selected finished item, that finished item is the BASE ITEM. Consume it and return its upgraded/replacement form.
- Example principle: selected battleship + selected cannons + request "add more cannons to the battleship" means propose upgraded versions of THAT battleship using cannons. Do not propose standalone cannon carts, unrelated artillery, or recreate the unchanged ship.
- If there is no specific request, then propose what the materials most naturally support.

MATERIAL RULES
- Power fits materials AND character level. Ordinary parts make ordinary gear; rare/monstrous parts make powerful magical gear; legendary remains may justify legendary results.
- Only consume materials that make sense, and never more than HAVE.
- consumes may ONLY contain supplied material NAME values. Copy each name exactly. Never invent a missing component, infer one from a description, or treat words inside a label as inventory.
- Selected materials are context, not merely a menu of unrelated ingredients. Use the important selected pieces coherently.
- If the pile cannot make the requested result, propose the closest achievable versions and explain the limitation briefly in reason.

UPGRADING FINISHED ITEMS
- A finished selected item being modified is consumed and replaced. Preserve its identity/name lineage unless the requested transformation clearly changes what it is.
- Preserve its TYPE by default. A construct remains construct, weapon remains weapon, armor remains armor, etc., unless the requested transformation genuinely changes category.
- Never reduce existing mechanics. Every current bonus key is a floor; armour AC stays equal or rises; weapon base/enchantment/extra damage stays equal or rises; meaningful existing abilities remain.
- An upgrade must actually improve something. Do not merely rename the base, move bonuses around, or recreate it unchanged.
- Preserve all meaningful capabilities, properties, and material composition from the existing label. You may trim only genuinely redundant wording, attack-bonus prose, weapon-property boilerplate, and unenforceable mechanics. Do NOT delete what the item is physically made from, because salvage later relies on that provenance. Add new capabilities and newly incorporated materials clearly without erasing existing ones.

ITEM TYPE IS STRICT
- weapon: wielded weapon.
- armor: ONLY main chest/body armour. Its ac replaces base armour.
- magic: every other wearable magical item, including shields/foci.
- consumable: one-use preparations.
- construct: things the player owns/commands rather than wears or carries: golems, animated/bound entities, WAR MACHINES, VEHICLES, SHIPS, SPELLJAMMERS, mobile fortresses, and similar major machines. Vehicles and ships are construct, NOT misc.
- misc: non-gear that is not commanded as an entity/vehicle: raw/refined stock, building material, furniture, rope, ordinary tools, art, trade goods, passive machinery/components.
- Do not use misc as an uncertainty/default bucket. Classify by what the result actually is.

SLOTS
Use only mainhand, offhand, armor, face, head, neck, shoulders, cloak, torso, arms, hands, waist, ring, feet. Ring items ALWAYS use ring, never ring1/ring2. Main chest armour is armor/armor; other wearables are magic. Shield/focus is magic/offhand. Constructs and misc have null slot.

MECHANICS
- bonuses is comma-separated calculable keys only: ac,str,dex,con,int,wis,cha, or skill names. Example ac:2,con:1.
- Resistances, immunities, senses, movement and narrative powers go in label, not fake bonus keys.
- Armour protection uses armor.ac, not bonuses.ac. Non-armour wearable protection may use ac:N.
- WEAPON DAMAGE HAS ONE CANONICAL FORMAT. Before returning ANY weapon, normalize its damage field to: ONE untyped base dice expression with its modifier, followed by ZERO OR MORE typed bonus expressions, with EACH damage type appearing AT MOST ONCE. Canonical example: "7d8+14 plus 10d10 radiant plus 4d6 fire plus 3d6 cold". The base damage MUST be one dice size only: never "2d10+4d6+1d8+14"; convert mixed base dice to the closest single expression with approximately the same average, e.g. "7d8+14". NEVER put a damage type on the base expression: "7d8+14 piercing" is wrong. EVERY bonus expression MUST have a type: "plus 10d10" is wrong. COLLAPSE all bonus dice of the same type into one closest equivalent expression: "plus 10d10 radiant plus 6d6 radiant" is WRONG and must become one radiant group; "plus 1d4 force plus 1d6 force" is WRONG and should become approximately "plus 1d10 force". Preserve approximate average damage rather than exact dice distribution. When upgrading an existing weapon, first normalize all of its old base and bonus damage, then add the upgrade, then normalize again. FINAL SELF-CHECK: if the base contains more than one d-expression, or any damage type word appears more than once in the damage field, the answer is invalid and MUST be rewritten before output.
- BASE DAMAGE MUST ALSO BE CONSOLIDATED into ONE untyped dice group plus its modifier. Never return mixed base dice such as "2d10+4d6+1d8+14". Convert them to the closest practical single dice expression with approximately the same average damage, e.g. "7d8+14".
- The final weapon damage format should therefore be: ONE consolidated untyped base dice group + modifier, followed by at most ONE consolidated dice group for EACH extra damage type. Example: "7d8+14 plus 10d10 radiant".
- Prefer dice expressions the game dice engine can parse cleanly. Do not use bullets, middle dots, comma-separated damage expressions, nested arithmetic, or multiple different dice sizes inside the base damage group.
- Do NOT put attack-roll bonuses or standard weapon properties into label. Never begin a label with text such as "+3 to attack rolls", "finesse", "light", "heavy", "versatile", or similar weapon-stat boilerplate. Use the actual structured fields for mechanics the app tracks; omit unsupported boilerplate.
- Accessories and armour do not get attack damage dice.
- Fields that do not apply are null, or empty string for bonuses/label.

LABELS — NARRATIVE CAPABILITIES ONLY
- Labels are persistent narrative guidance for the DM, NOT a second character sheet and NOT a place to invent mechanics the app cannot enforce.
- Write compact capability notes: what the item is unusually capable of doing, what it ignores/resists/enables, important movement/senses/protection, or other properties the DM can honor directly in narration.
- Good narrative capability examples: "ignores all resistances", "cannot be disarmed", "cuts magical barriers", "immune to divination", "flies in atmosphere and wildspace", "sees invisible creatures".
- Do NOT write temporary or turn-based mechanics: no "until next turn", "for 1 round", "on your next attack", "once per turn", reactions, bonus actions, concentration, or similar timing rules.
- Do NOT write unsupported numeric combat/healing mechanics in labels: no "+15 healing", "+3 to attack rolls", "+10 damage", temporary AC, saving-throw DCs, or other numbers the app does not actually calculate. If a numeric bonus belongs to a supported bonuses key, put it there; otherwise express the capability narratively or omit it.
- PRESERVE MATERIAL PROVENANCE, BUT ABSTRACT IT. Record the finished object's meaningful recoverable composition, not its full bill of materials or crafting history. Preserve major metals, woods, hides, scales, gems/crystals, planar substances, monster materials, cores, and other substantial construction, but combine related materials into compact categories when practical (for example: "assorted enchanted glass," "divinatory crystals," "silvered planar glasswork," "integrated scrying circuitry"). Do not list every consumed ingredient, lens, junction, circuit, ward core, fastener, or tiny reagent individually unless that specific part remains a distinct salvageable subsystem or uniquely explains a capability.
- When upgrading an existing item, preserve the CURRENT meaningful composition and newly incorporated substantial materials, but rewrite them into the most compact accurate description. Do not preserve upgrade chronology. Describe what the finished item is now, not a running list of what was added over time. Collapse duplicate or overlapping subsystems into one current-state description unless they remain meaningfully separate salvageable modules.
- Material provenance should normally occupy no more than one short clause or sentence of a label. The rest of the label should describe persistent capabilities. If composition starts to dominate the label, summarize it more aggressively without losing salvage-relevant categories.
- Do not pad labels with useless visual prose, generic adjectives, or construction history, but keep concise lore/context when it materially explains a persistent capability or unusual construction.
- Labels should be concise but complete, not aggressively compressed. Prefer readable semicolon-separated clauses. Simple items may be short; complex legendary items, constructs, ships, and heavily upgraded gear may use several sentences when needed to preserve distinct capabilities, but material composition must remain summarized rather than becoming a component list.
- For item-mode constructs such as ships/vehicles/war machines, label should begin with CR when a CR is useful, then compactly state form and capabilities. Preserve important existing capabilities when upgrading.
- Name results for what they are/do, not merely "Enchanted X".`;

const SET_RULES = `MATCHED SET RULES
- By default, return exactly 2 alternative sets with 3-6 pieces each, using different slots so the pieces can coexist.
- PLAYER-REQUESTED PIECE COUNTS OVERRIDE THE DEFAULT. If the player asks for a specific set size — e.g. "make this a 10-piece set" — make each proposed set that many pieces when the available slots/materials plausibly support it. Do not force a requested 10-piece set back down to 6 pieces just because 3-6 is the normal default.
- A requested larger set may use up to 20 pieces. If the requested count cannot be supported by available wearable/weapon slots or materials, make the largest coherent set you can and explain the limitation briefly in reason.
- SET count means the number of COMPLETE SETS being crafted, never the number of pieces. Normally return count:1. A 9-piece set is pieces.length = 9 and count = 1, NOT count = 9. Only use count greater than 1 if the PLAYER REQUEST explicitly asks for multiple complete identical sets.
- At most one armor chest piece; other wearables are magic; weapons may be included.
- Legendary materials should make genuinely legendary pieces; do not arbitrarily dilute every piece.
- Names share a coherent lineage/motif.
- Existing finished set pieces are bases: consume and upgrade them, preserving every mechanical floor and meaningful ability.`;

const CONSTRUCT_RULES = `DEDICATED CONSTRUCT MODE
- Return exactly 2 alternative companion-style constructs. This mode is for entities that become commanded companions, not ordinary inventory vehicles/ships made in ITEM mode.
- CR: ordinary parts roughly 3-8; monstrous 10-16; legendary remains commonly 20+.
- abilities gives broad capabilities/power themes, no spell lists, damage dice, or per-day counts.
- appearance 2-3 sentences; desc 3-5 sentences covering what it is, how made, and behavior.
- No action/focus/concentration command costs.`;

const BATCH_RULES = count => count > 1 ? `BATCH RULES
The player wants ${count} identical copies. Set count to ${count} when materials support it; consumes is TOTAL cost across all copies. Mixed material stacks may support different copies. If impossible, use the largest supported count and explain why.` : '';

export function buildGptCraftingPrompt({ materialsText, characterLevel, intent = '', asSet = false, asConstruct = false, quantity = 1 }) {
  const modeRules = asConstruct ? CONSTRUCT_RULES : asSet ? SET_RULES : '';
  const batchRules = asSet ? '' : BATCH_RULES(quantity);
  const request = intent.trim()
    ? `PLAYER REQUEST\n${intent.trim()}\n\nIMPORTANT: Treat this as the design target, not a suggestion. Keep every proposal focused on fulfilling it.`
    : 'PLAYER REQUEST\nNo specific design requested. Propose what these materials most naturally support.';
  return `${BASE_RULES}\n\nCHARACTER LEVEL\n${characterLevel}\n\n${modeRules}${modeRules ? '\n\n' : ''}${batchRules}${batchRules ? '\n\n' : ''}${request}\n\nMATERIALS AVAILABLE\n${materialsText}`;
}

export function craftingSchemaFor({ asSet = false, asConstruct = false } = {}) {
  return asConstruct ? constructSchema : asSet ? setSchema : singleItemSchema;
}

const responseText = data => (data?.output || []).filter(x => x?.type === 'message').flatMap(x => x.content || []).filter(x => x?.type === 'output_text').map(x => x.text || '').join('').trim();

export async function callGptCrafting({ apiKey, model = GPT_CRAFTING_MODEL, materialsText, characterLevel, intent = '', asSet = false, asConstruct = false, quantity = 1 }) {
  if (!apiKey) throw new Error('OpenAI API key required for GPT crafting');
  const prompt = buildGptCraftingPrompt({ materialsText, characterLevel, intent, asSet, asConstruct, quantity });
  const schema = craftingSchemaFor({ asSet, asConstruct });
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
      max_output_tokens: asSet ? 12000 : asConstruct ? 8000 : 6000,
      reasoning: { effort: 'low' },
      text: { format: { type: 'json_schema', name: asConstruct ? 'craft_construct_options' : asSet ? 'craft_set_options' : 'craft_item_options', strict: true, schema } },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI API error ${res.status}`);
  if (data.status === 'incomplete') throw new Error(`GPT crafting reply incomplete${data.incomplete_details?.reason ? `: ${data.incomplete_details.reason}` : ''}`);
  const raw = responseText(data);
  if (!raw) {
    const refusal = (data.output || []).flatMap(x => x?.content || []).find(x => x?.type === 'refusal')?.refusal;
    throw new Error(refusal || 'GPT crafting returned no result');
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('GPT crafting returned unreadable structured output'); }
  return { parsed, usage: data.usage, rawData: data };
}
