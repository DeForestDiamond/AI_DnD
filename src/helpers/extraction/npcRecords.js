export const NPC_FIELDS = ['location','relationship','desc','race','role','appearance','personality','status','trueName','abilities','notes'];

export const NPC_RECORD_RULES = `Maintain reusable character profiles, not campaign recaps. Use only supplied records, transcript and authoritative player notes; never invent facts.
- Preserve established identity and lasting traits, but rewrite old scene-heavy records into a concise profile. Do not keep adding chronology. Even with no new facts, clean up an existing event-heavy entry.
- Omit incidental NPC names, places, ship names, villains, rescues, battles, travel, and completed events. Translate their lasting effects into present traits: "wary of cages and rough handling", not who trapped or rescued them and where. Do not carry old campaign plots into a future campaign.
- Relationship: current trust, affection, allegiance, boundaries and meaningful ongoing commitments toward the player/party, usually 1-2 sentences. Use "the player" or "their trusted companion" rather than binding it to the current player's name. Keep another named companion only when that enduring bond matters; omit incidental third parties.
- Durable preferences and meaningful possessions may remain, without donor/event attribution. A rope ball may be a favorite toy among several interests; it is not their defining purpose, obsession, automatic response, or entire personality. Do not turn one interaction into a permanent trait or every scene into the same joke. Balance playfulness with other demonstrated traits; do not invent balance by inventing traits.
- Use the dedicated fields when evidence exists: race (species), role (lasting party role), appearance (physical features, age, enduring scars), personality (temperament, preferences, fears, social behavior), status (lasting condition, not a scene/whereabouts), trueName (only an established distinct true name), abilities (demonstrated capabilities/training), notes (other durable facts).
- Desc: a short overall identity/overview, not a dumping ground or repetition of all other fields. No plot history in notes either. Relationship and desc must not contain the whole profile while the dedicated fields remain empty.
- Companion location is empty: companions travel with the player. NPC location is their currently known location, separate from personality/description; unknown is empty.
- Separate natural traits from equipment effects. Preserve equipped items in the save; do not claim a collar's enhanced intelligence is an innate ability. Do not invent spells, intelligence, powers, goals, secrets or knowledge.
- Unsupported fields are empty strings. Preserve supported existing field values when the selected transcript does not discuss them. Player notes override these defaults when explicitly requesting a detail or change.`;

// Extraction may edit profile text, never equipment or other runtime fields.
export function npcRecordFields(record = {}) {
  const result = {};
  for (const key of NPC_FIELDS) {
    if (record[key] == null) continue;
    const text = Array.isArray(record[key]) ? record[key].join(', ') : String(record[key]);
    if (text.trim() || ['location','relationship','desc'].includes(key)) result[key] = text;
  }
  return result;
}
