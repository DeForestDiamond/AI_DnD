import { isFullDarkFantasy } from '../helpers/storyOptions.js';

const TERRA_MENU = 'End at the first decision with the four current-scene suggestions. Self-serving and unconventional approaches are welcome when they fit.';

export function playerArcOpening(char, openingOverride, model) {
  const menu = model === 'terra' ? '. ' + TERRA_MENU : `, and end with exactly 4 numbered choices (at least one chaotic or unconventional, at least one ruthless or self-serving, all written neutrally).`;
  return `[ADVENTURE START — PLAYER-SPECIFIED OPENING]\nBegin the adventure exactly as the player describes below. Do NOT randomize the setting, location, or situation — use what they wrote. PLAYER AGENCY IS ABSOLUTE: do not invent any action, decision, conversation, combat, agreement, relationship, knowledge, or item acquisition for the player beyond what the player's opening explicitly states. Begin before the first unresolved action and let the player make it. Establish why the player is present and what they actually know before introducing mysteries that depend on context. Open the scene there with vivid physical detail, ${isFullDarkFantasy(char) ? 'let scope follow the chosen setting and actual dangers without a level-based ceiling' : `keep it within the story scope appropriate to a level ${char.level} character`}${menu}\n\nPLAYER'S OPENING:\n${openingOverride.trim()}\n\nThe character's backstory is background only — do NOT open in their history or build the scene around it unless the player's opening above says to.`;
}

export function seededArcOpening(char, seed, model) {
  const terra = model === 'terra';
  const contact = terra
    ? 'Bring the assigned antagonist’s activity into this place through one visible event or concrete opportunity. Use the hook and wildcard as ingredients. Show what the character already knows, introduce strangers on screen and let the player make the first decision. An urgent opening shows its present danger and records its pressure.'
    : `OPENING CLARITY: Establish one understandable immediate conflict or opportunity. Make visible actions, requests, immediate stakes, and any offered benefit concrete before adding deeper lore or complications. Several NPCs may take opposing sides in that conflict. Do not cram the antagonist's whole scheme into the first exchange. If the hook suggests a prior debt, favor, enemy, or relationship, use it only when supplied history supports it; otherwise adapt it into a present-day offer, dispute, or intrusion. Completed service and resolved obligations remain closed.
OPENING CONTACT: Begin with a concrete unfolding situation, direct offer, intrusion, or opportunity arising from this antagonist. Give this character something they can act on now, not merely a rumor about an optional distant quest. Do not assume heroic motives or prior acceptance. If urgent danger is established, show its present state and plausible next development, and record its pressure.`;
  const context = terra
    ? 'Establish why the character is here. Treat prior acquaintances, debts and obligations as facts only when the supplied history supports them.'
    : `ESTABLISH CONTEXT BEFORE MYSTERY. The opening MUST make clear why the player is presently at this location and what they actually know. Any NPC who addresses the player as an acquaintance, employer, client, ally, enemy, or expected guest MUST already exist in supplied context; otherwise introduce them as a stranger and let the relationship form in play. Cryptic statements, unexplained names, secret ledgers, dying messengers, attacks, discoveries, and other hooks happen ON SCREEN where the player can react to them — never as events you claim just happened before the first response.`;
  const menu = terra ? TERRA_MENU : `End at that natural decision point and ALWAYS close with exactly 4 numbered choices — vary the framing that leads into them, but the 4 numbered choices themselves are mandatory and never omitted. At least one should be chaotic or unconventional, at least one ruthless or self-serving, all written neutrally. The choices are suggestions, not actions already taken.`;
  return `[ADVENTURE SEED — MANDATORY COMPLIANCE REQUIRED]
The antagonist and geographic anchor below are authoritative and were selected together. Build ONE coherent opening from them. Setting, weather, scene location, hook, and wildcard are creative ingredients: adapt incompatible details to the geography and antagonist rather than moving the adventure or inventing a separate conflict. Keep rich atmospheric scene-setting. Setting and wildcard details can remain background; they do not each need a plot explanation or actionable mystery.

STORY SCOPE (the player is level ${char.level} — match the SIZE and stakes of the story to this): ${seed.scope}

GEOGRAPHIC ANCHOR (start here, not across the continent): ${seed.startingArea}
SETTING: ${seed.setting}
TIME OF DAY: ${seed.time}
WEATHER: ${seed.weather}
TONE: ${isFullDarkFantasy(char) ? 'Full Dark Fantasy — uncompromising darkness and tangible danger' : seed.tone}
OPENING LOCATION (the specific place the scene starts): ${seed.location}
OPENING STYLE (HOW to open the scene — follow this structure, do not default to a generic establishing shot): ${seed.openingStyle}
WILDCARD (a distinctive detail to work into the opening): ${seed.wildcard}
ADVENTURE HOOK (adapt to this character and antagonist): ${seed.hook}
${contact}
ANTAGONIST (identity hidden; the opening hook must arise from this antagonist): ${seed.antagonist}

REQUIRED: Set the opening inside the GEOGRAPHIC ANCHOR or its immediate approaches. The playable conflict must be accessible locally, within the same kingdom or region at minimum; never require cross-continent travel merely to begin. For a required lair such as Undermountain, start there or at its nearby entrance in Waterdeep. Planar anchors use their actual plane rather than an unrelated Faerûn city. Invent local inns, shrines, settlements, or alleys where appropriate. Ground the scene in physical details matching the weather and time, and open it in the OPENING STYLE above rather than a stock "you stand in X" description. Emit a [LOCATION:] tag with the canon place name.

PLAYER AGENCY AT THE OPENING IS ABSOLUTE. NEVER BEGIN IN THE MIDDLE OF AN EVENT THE PLAYER DID NOT PLAY. NEVER INVENT ACTIONS, DECISIONS, CONVERSATIONS, COMBAT, INVESTIGATIONS, AGREEMENTS, RELATIONSHIPS, PURCHASES, TRAVEL, OR KNOWLEDGE FOR THE PLAYER CHARACTER IN ORDER TO CREATE AN EXCITING OPENING. Do not say the player already accepted a job, arrived mid-ambush, killed or fought anyone, questioned someone, agreed to help, took an item, followed a lead, met an NPC, or learned information unless that fact exists in supplied character/history context. The opening begins BEFORE the inciting event reaches the point where the player must act.

${context}

THE FIRST MEANINGFUL ACTION BELONGS TO THE PLAYER. You may present an event beginning around them — a stranger approaches, shouting erupts inside a building, someone asks for help, an alarm sounds, a suspicious figure appears — but STOP BEFORE deciding how the player responds. Do not resolve the hook for them. Do not place quest items in their possession unless the player chooses to take them.

${menu}

NON-COMPLIANCE: If you invent pre-play actions or knowledge for the player, begin after the inciting event has already been acted upon, or open with anything other than the parameters above, you have failed your role as DM.`;
}
