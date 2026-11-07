// Shared across providers; their existing output/accounting contracts differ.
export const SALVAGE_MATERIAL_RULES = `ACTUAL BREAKDOWN, NOT UNPACKING OR RENAMING
- Salvage must undo the finished item's construction or formulation. Removing a bottle, wrapper, casing, royal title, place name, or other adjective while retaining the usable product is NOT a breakdown. Returning the original item with a generic name or label is also NOT a breakdown.
- Finished consumables include potions, draughts, elixirs, salves, tinctures, prepared poisons, explosive charges, and manufactured fuses. Separate or process them into plausible simpler reagents, spent magical residue, fiber, metal, glass, and other actual ingredients/materials. Do NOT return a drinkable potion, ready-to-apply medicine, active prepared poison dose, functioning explosive charge, or usable fuse as its own salvage.
- WRONG: Royal Vampiric Draught -> Vampiric Draught that still creates vampirism; Stoneblood Vial -> Stoneblood Elixir that still grants stone protection; Cloud Giant Marrow Salve -> the same usable salve; Sleeping Tincture -> a potent sedative dose; Hellfire Siege Fuse -> functioning Hellfire Fuse Cord. These merely preserve the finished product.
- Instead, recover only constituent materials supported by the description or a conservative inference from the item: for example glass, alchemical solvent, recoverable salts, fiber, or spent arcane residue as appropriate. Do not invent an intact giant organ merely because a finished salve's name mentions marrow. Do not recreate every original ingredient undamaged or duplicate the same substance as both a finished item and a reagent.
- Genuine basic raw materials can remain recognizable materials: a distinctive crystal, ore concentrate, dragon scale, or bone need not turn into generic dust. Biological seeds/beans submitted for processing can yield supported meal, oil, fiber, or extract; changing Bean to Seed while repeating that it grows a plant is not processing. Do not attach a finished product's full activated effect to an extracted reagent or generic residue.
- A precision or arcane component may survive extraction when its independent crafting value warrants it. This narrow exception does NOT protect every finished product merely because it has a useful function. Being a useful medicine or a magical drink is not the specialized-component exception.
- FINAL BREAKDOWN AUDIT: for each source, ask whether the result is materially dismantled/processed or merely the same usable item renamed, uncorked, or repackaged. Redo any disguised unchanged return. Labels must describe a specific intrinsic property that actually survives, not generic promises such as closes severe wounds, potent sedative dose, or active if carefully collected and contained.

CRAFTING VALUE, NOT QUEST PRESERVATION
- Submitting an item for salvage means deliberately reducing it to crafting materials or genuinely valuable reusable components. Its involvement in a story, quest, investigation, bargain, or relationship is NOT a reason to preserve the original item or its narrative role.
- Preserve distinctive MATERIAL identity and established intrinsic crafting properties: Bronze Dragon Scale, Tarrasque Bone, Demon Lord Essence, a genuine arcane core. Do not recreate named quest tokens, evidence objects, donor-specific keepsakes, credentials, promises, or quest objectives as recovered components merely to keep their story use available.
- Strip incidental donor-specific sympathetic links, tracking-token roles, personal attunements, and quest-specific associations during salvage. Do not carry them into recovered names or labels. A named creature's involvement does not by itself make ordinary material a uniquely functioning tracker.
- Example: scales obtained to track Sarthoryx and Nymorath recover as Bronze Dragon Scale with label:null, NOT labels saying Supports sympathetic tracking of Sarthoryx or Supports sympathetic tracking of Nymorath. Keep the bronze-dragon material type and sensible quantity, not the individual dragons' identities or the scales' former assignment.
- A genuinely reusable specialized magical component can still retain an established independent function when the salvage outcome supports it. A real tracking mechanism or calibrated magical lens may survive extraction; an ordinary scale's former use as a quest tracking token does not meet that bar. Do not erase intrinsic material properties merely because the material also appeared in a quest.
- Do not invent replacement clues, copies of evidence, intact quest items, or protected narrative functions to compensate for salvage. If relevant, state in the source note that a former quest/tracking association was lost; never put it back in the recovered material's label.
- This rule changes the salvaged objects only. Do not claim that dismantling evidence resolves its investigation, completes a quest, releases an obligation, changes an NPC's knowledge, or erases established history.`;

const normalized = name => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const preparedProduct = /\b(?:potions?|draughts?|elixirs?|salves?|tinctures?|unguents?|balms?|prepared poison|injury poison|poison doses?|explosive charges?|grenades?|bombs?|fuses?)\b/;
const processedMaterial = /\b(?:residue|spent|solvent|salts?|powder|meal|fiber|fibre|extract|scrap|ash|reagent|core|actuator|lens|crystal)\b/;

// Reject unmistakable finished-product echoes, not every repeated material
// name. Semantic equivalence still belongs to the shared generation rules.
export function assertSalvageBreakdown(result, submitted, definitions = {}) {
  const unchanged = (result.recovers || []).filter(recovered => {
    const name = normalized(recovered.name);
    if (preparedProduct.test(name) && !processedMaterial.test(name)) return true;
    return submitted.some(source => normalized(source.name) === name &&
      ['weapon','armor','shield','construct','bag','consumable'].includes(definitions[source.name]?.type));
  });
  if (unchanged.length) throw new Error(`Salvage returned finished items instead of breaking them down: ${unchanged.map(it=>it.name).join(', ')}. Nothing was consumed. Try another breakdown.`);
}
