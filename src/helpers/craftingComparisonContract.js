// Optional sidecar analysis in the SAME crafting response. Never part of an item.
const object = properties => ({ type:'object', additionalProperties:false, required:Object.keys(properties), properties });
const string = { type:'string' };
const evidence = object({ item:string, quote:string });
const evidenceList = { type:'array', items:evidence, maxItems:3 };
const change = object({
  kind:{type:'string',enum:['added','improved','weakened','lost','retained','redundant','uncertain','tradeoff']},
  ability:string, explanation:string, before:evidenceList, after:evidenceList,
});
export const CRAFTING_COMPARISON_SCHEMA = object({
  options:{type:'array',maxItems:3,items:object({
    optionIndex:{type:'integer',minimum:0}, baseNames:{type:'array',items:string},
    focus:string, summary:string, evidence:evidenceList,
    changes:{type:'array',items:change,maxItems:8},
  })},
  recommendation:object({optionIndex:{type:['integer','null']},reason:string,evidence:evidenceList}),
});

export const withCraftingComparison = schema => ({
  ...schema, required:[...schema.required,'comparison'],
  properties:{...schema.properties,comparison:CRAFTING_COMPARISON_SCHEMA},
});

export const CRAFTING_COMPARISON_RULES = `CRAFTING COMPARISON — INFORMATIONAL SIDECAR
Return a top-level comparison alongside options using the supplied comparison schema.
Write this only AFTER designing the complete results; never shorten labels, alter results, or rebalance them to fit the comparison. Keep it compact: one short focus and summary per option and at most 8 meaningful change groups. Summarize whole sets first; changes may cite individual pieces. optionIndex is zero-based and matches options order.
Compare ALL alternatives functionally with each other and with selected finished BASE equipment actually consumed by that option. baseNames must be exact supplied NAMEs, not raw ingredients, unconsumed gear, or names mentioned inside descriptions. Each evidence entry quotes a short EXACT excerpt from the named base's description or the named output item's/piece's label, abilities, desc, role or appearance. Summary evidence must come from that output. No invented statistics or capabilities.
Use consistent ability names for equivalent functions across options. Different wording or integrated subsystem names alone is NOT a new ability. Distinguish added, improved, retained (group unchanged domains collectively), redundant (already covered, not extra power), tradeoff (restrictions/specialization), weakened, lost, and uncertain. Improved/retained/redundant claims require before AND after evidence. Added/tradeoff claims require after evidence. Lost/weakened requires before evidence AND an explicit conflicting limitation/removal in the new text. Mere silence is uncertain, with before evidence and an empty after array; never invent a loss from omission. Do not claim preservation from vague stronger-sounding names or from missing text.
Highlight meaningful coverage, autonomy, defenses, utility, capacity, and restrictions, not just damage or AC. Numeric stats and material costs will also be compared locally; do not repeat them as narrative ability claims.
Recommendation: choose an optionIndex only if it best improves the original purpose and PLAYER REQUEST, explain utility and costs, and account for regressions/uncertainty. Cite output evidence for the recommendation as well. If purposes differ or evidence is insufficient, use null and explain which purpose each suits instead of declaring a universal winner. Analysis is a source-backed interpretation, not new item rules.`;
