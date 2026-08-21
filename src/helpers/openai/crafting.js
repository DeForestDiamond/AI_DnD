// GPT-specific crafting helper prompt and output contracts.
// This file deliberately contains NO inventory mutation logic. It only tells the
// model what to design and defines the shape the game expects back.

export const GPT_CRAFTING_MODEL = 'gpt-5.4-mini';

export const CRAFTING_SLOTS = [
  'mainhand', 'offhand', 'armor', 'face', 'head', 'neck', 'shoulders',
  'cloak', 'torso', 'arms', 'hands', 'waist', 'ring', 'feet',
];

export const singleItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['options'],
  properties: {
    options: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'type', 'count', 'consumes', 'reason'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['weapon', 'armor', 'magic', 'consumable', 'misc'] },
          slot: { type: ['string', 'null'], enum: [...CRAFTING_SLOTS, null] },
          damage: { type: ['string', 'null'] },
          ac: { type: ['number', 'null'] },
          heavy: { type: ['boolean', 'null'] },
          maxDex: { type: ['number', 'null'] },
          bonuses: { type: 'string' },
          label: { type: 'string' },
          count: { type: 'integer', minimum: 1 },
          consumes: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'count'],
              properties: {
                name: { type: 'string' },
                count: { type: 'integer', minimum: 1 },
              },
            },
          },
          reason: { type: 'string' },
        },
      },
    },
  },
};

export const setSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['options'],
  properties: {
    options: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'pieces', 'count', 'consumes', 'reason'],
        properties: {
          name: { type: 'string' },
          pieces: {
            type: 'array',
            minItems: 3,
            maxItems: 6,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'type', 'slot', 'bonuses', 'label'],
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['weapon', 'armor', 'magic'] },
                slot: { type: ['string', 'null'], enum: [...CRAFTING_SLOTS, null] },
                damage: { type: ['string', 'null'] },
                ac: { type: ['number', 'null'] },
                heavy: { type: ['boolean', 'null'] },
                maxDex: { type: ['number', 'null'] },
                bonuses: { type: 'string' },
                label: { type: 'string' },
              },
            },
          },
          count: { type: 'integer', minimum: 1 },
          consumes: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'count'],
              properties: {
                name: { type: 'string' },
                count: { type: 'integer', minimum: 1 },
              },
            },
          },
          reason: { type: 'string' },
        },
      },
    },
  },
};

export const constructSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['options'],
  properties: {
    options: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'cr', 'race', 'role', 'appearance', 'abilities', 'desc', 'count', 'consumes', 'reason'],
        properties: {
          name: { type: 'string' },
          cr: { type: 'number', minimum: 0 },
          race: { type: 'string' },
          role: { type: 'string' },
          appearance: { type: 'string' },
          abilities: { type: 'string' },
          desc: { type: 'string' },
          count: { type: 'integer', minimum: 1 },
          consumes: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'count'],
              properties: {
                name: { type: 'string' },
                count: { type: 'integer', minimum: 1 },
              },
            },
          },
          reason: { type: 'string' },
        },
      },
    },
  },
};

const BASE_RULES = `You are the crafting engine for a D&D-style game set in the Forgotten Realms.
Your job is mechanical design, not narration. Propose useful, distinct craft results from ONLY the supplied materials.

CORE RULES
- Material quality determines power. Common materials make common gear. Rare monster parts make powerful gear. Legendary remains may make legendary gear or constructs.
- Character level is a sanity check, not a hard cap: exceptional materials may justify exceptional results.
- Never invent a material. Every consumes.name must copy a NAME from MATERIALS AVAILABLE exactly as supplied.
- Never consume more of a material than HAVE.
- If the player's requested result is impossible, propose the closest plausible alternatives and explain the limitation briefly in reason.
- Alternatives must differ in function, not merely name.
- Keep labels terse because they are sent to the DM repeatedly.

ITEM TYPES
- weapon: wielded weapon. Its damage field contains ALL rolled damage.
- armor: ONLY the main chest/body armour slot. Its ac field is the armour rating that replaces base armour.
- magic: every other wearable magical item.
- consumable: one-use potion, bomb, vial, scroll-like preparation, etc.
- misc: anything that is not worn, wielded, consumed, or commanded: refined stock, tools, furniture, machinery, art, trade goods, components.

SLOTS
Use only: mainhand, offhand, armor, face, head, neck, shoulders, cloak, torso, arms, hands, waist, ring, feet.
A ring's item slot is ALWAYS "ring". Never output ring1 or ring2; those are internal equipment positions handled by the game.
Main chest armour is type armor / slot armor. All other wearables are type magic.
A shield or spellcasting focus is type magic / slot offhand.

MECHANICS
- bonuses is a compact comma-separated list using ONLY calculable keys: ac, str, dex, con, int, wis, cha, or skill names such as perception, stealth, athletics, persuasion. Example: "ac:2,con:1".
- Do not invent boolean or textual bonus keys such as fire_immunity:true. Put narrative resistances, immunities, senses, movement, and special powers in label instead.
- A magic wearable should have a real mechanical benefit when appropriate, not just flavour.
- Armour protection belongs in armor.ac, NOT in bonuses.ac. Worn non-armour protection uses bonuses ac:N.
- Weapon damage examples: "1d8", "1d8+2", "1d8+1 plus 1d4 radiant", "2d6 plus 2d6 fire plus 1d6 necrotic". Extra damage written only in label will not be rolled.
- Do not put damage dice or attack powers on accessories or armour.

LABELS
- Labels are compact notes, not prose. Prefer semicolon-separated fragments. Aim under 25 words for normal items.
- State what it looks like and what it does. Do not explain action economy, bonus actions, reactions, concentration, per-turn limits, or vague effort/focus costs; the game does not track them.
- Avoid spell lists and redundant damage numbers.

UPGRADES
If a selected material is finished equipment, the player may be reforging it. Preserve its identity and never reduce existing mechanical stats.
- Every existing bonus key is a floor: keep it at the same value or increase it.
- Armour ac may stay the same or increase, never decrease.
- Weapon base/enchantment/extra damage may stay the same or increase, never decrease.
- Preserve meaningful existing abilities, but rewrite bloated labels into concise current-state notes.
- An upgrade must actually improve something; do not merely move bonuses between pieces.`;

const SET_RULES = `MATCHED SET RULES
- Return exactly 2 alternative sets.
- Each set has 3-6 pieces with different equipment slots so they can be worn together.
- At most one piece may be type armor. Other wearables are type magic. A weapon may be included if materials support it.
- Every piece from legendary materials should itself feel legendary; do not dilute every piece to keep an arbitrary total low.
- Set piece names must share a coherent lineage or motif. Do not simply name each piece after its raw material.
- If reforging an existing set, preserve each piece's identity and mechanical floor while improving it.`;

const CONSTRUCT_RULES = `CONSTRUCT RULES
- Return exactly 2 alternative constructs.
- A construct is an entity the player owns and commands, not an item or equipment slot.
- Set CR from the materials: ordinary parts roughly CR 3-8; monstrous parts CR 10-16; legendary remains commonly CR 20+.
- abilities describes broad capabilities and power themes, not specific spell names, damage dice, or per-day counts.
- appearance should be 2-3 sentences. desc should be 3-5 sentences covering what it is, how it was made, and how it behaves.
- Do not invent action costs, focus costs, concentration requirements, or command-action mechanics.`;

const BATCH_RULES = (count) => count > 1 ? `BATCH RULES
The player wants ${count} identical copies of the selected design.
- Set count to ${count} if the materials support it.
- consumes is the TOTAL material cost for all copies together.
- Different copies may draw from different available scrap/material stacks.
- If the full quantity is impossible, set count to the largest supported number and say why in reason.` : '';

export function buildGptCraftingPrompt({
  materialsText,
  characterLevel,
  intent = '',
  asSet = false,
  asConstruct = false,
  quantity = 1,
}) {
  const modeRules = asConstruct ? CONSTRUCT_RULES : asSet ? SET_RULES : '';
  const request = intent.trim()
    ? `PLAYER REQUEST\n${intent.trim()}`
    : 'PLAYER REQUEST\nNo specific design requested. Propose what these materials most naturally support.';

  return `${BASE_RULES}\n\nCHARACTER LEVEL\n${characterLevel}\n\n${modeRules}${modeRules ? '\n\n' : ''}${BATCH_RULES(quantity)}${quantity > 1 ? '\n\n' : ''}${request}\n\nMATERIALS AVAILABLE\n${materialsText}`;
}

export function craftingSchemaFor({ asSet = false, asConstruct = false } = {}) {
  return asConstruct ? constructSchema : asSet ? setSchema : singleItemSchema;
}
