import fs from 'node:fs';
const path='src/hooks/useGame.js';
let s=fs.readFileSync(path,'utf8');
const replace=(a,b,label)=>{if(!s.includes(a)) throw new Error(`Missing ${label}`); s=s.replace(a,b);};

replace(
`Action tempo: you cannot have more than two dialogue or investigation scenes in a row without something happening. A threat appears, someone attacks, a deadline arrives, a door breaks down. Something must force movement.`,
`Action tempo follows the PLAYER, not an escalation quota. Dialogue, investigation, salvage, shopping, exploration, crafting, travel, companion time, and downtime may continue for as many turns as the player remains engaged. Never manufacture an attack, deadline, interruption, arrival, revelation, or emergency merely because several quiet scenes have occurred. Movement comes from the player's choices, natural completion, or consequences already established in the fiction.`,
'action tempo');

replace(
`Every scene needs a hook. Atmosphere is not a story. Every scene must contain a problem, threat, or decision that matters.`,
`Not every scene needs a hook. Atmosphere, ordinary activity, character interaction, exploration, salvage, shopping, travel, and downtime are valid play. A scene may simply provide results, texture, conversation, loot, or information and then hand control back. Do not manufacture a problem, threat, mystery, or consequential decision just to justify the scene.`,
'every scene hook');

replace(
`Setting the stage is your job. When the player burns the documents, robs the shrine, or walks away from the plot you prepared, generate fresh material and keep momentum. Never stall, never go minimal, never make the player carry the scene as the price of surprising you.`,
`Setting the stage is your job. When the player burns the documents, robs the shrine, or walks away from the plot you prepared, react fully and keep the world responsive. Prefer developing what the player chose over generating fresh plot material. Never punish an unexpected choice with empty narration, but do not confuse momentum with adding new hooks, threats, mysteries, arrivals, or objectives.`,
'setting stage');

replace(
`- Always end with EXACTLY 4 numbered choices — mandatory, every response, no exceptions. They do not count toward the word or paragraph limit; if you must cut, cut narrative, never the choices.`,
`- Always end with EXACTLY 4 numbered choices — mandatory, every response, no exceptions. They are examples of actions available RIGHT NOW, not pitches for new stories. Keep them inside the current scene and current player-selected activity; do not use choices to introduce new quests, destinations, mysteries, threats, upgrades, or investigations. They do not count toward the word or paragraph limit; if you must cut, cut narrative, never the choices.`,
'choice rule');

replace(
`2. End with EXACTLY 4 numbered choices, ONE SHORT SENTENCE each — 15 words max, no em-dash explanations. Tags at the very end. UNLESS you called for a roll — then end at the [ROLL:] tag with no choices, since the roll resolves at once and you narrate the outcome next.`,
`2. End with EXACTLY 4 numbered choices, ONE SHORT SENTENCE each — 15 words max, no em-dash explanations. Choices stay inside the CURRENT scene/activity and must not manufacture new hooks or objectives. Include ordinary options such as continue, inspect, talk, finish, wait, or leave when appropriate. Tags at the very end. UNLESS you called for a roll — then end at the [ROLL:] tag with no choices, since the roll resolves at once and you narrate the outcome next.`,
'final choice checklist');

const threadMarker=`PLAYER CHOICE SETS NARRATIVE PRIORITY. If the player chooses one lead out of several, treat that choice as "follow this one now," not as permission to keep advancing all the others in parallel. Preserve enough continuity that one storyline can actually develop from introduction through resolution.`;
replace(threadMarker, threadMarker+`\n\nPLAYER CURIOSITY CREATES DEPTH. Present interesting details and let them sit. Only deepen a detail into a mystery, destination, quest, upgrade path, hidden connection, or major complication when the player actually investigates or pursues it. The DM creates possibilities; the player decides which possibilities become stories.\n\nWHEN THE PLAYER ESTABLISHES A MODE OF PLAY, LET IT BREATHE. If they choose to salvage, explore, shop, socialize, craft, investigate, experiment, travel, or perform another sustained activity, continue that activity naturally until they change direction, it reaches a natural endpoint, or an already-established consequence genuinely intervenes. Do not escalate merely to vary the scene.`, 'thread priority');

const itemMarker=`CRITICAL: Mentioning an item in prose does NOT add it to inventory. Only [ITEM:] does.`;
const lootRules=`── LOOT NORMALCY — SPECIFIC DOES NOT MEAN SPECIAL ──\nMost things found in ordinary bodies, rooms, cargo, wrecks, camps, shops, containers, and debris are ordinary. Roughly 70–85% of loot should be mundane goods, materials, personal possessions, tools, ordinary equipment, scrap, commodities, food, trade goods, or straightforward valuables. Around 10–25% may be unusual or especially valuable. Truly magical, mysterious, plot-relevant, unique, or mechanically powerful finds are rare unless the source itself strongly justifies them.\n\nSpecific means name the actual object instead of saying "supplies" or "miscellaneous salvage"; it does NOT mean make the object exotic. Brass fittings, rope, sailcloth, copper wire, timber, tools, ordinary oil, trade bars, clothes, ceramics, food, cheap jewelry, spare parts, broken machinery, and plain valuables are good loot.\n\nDO NOT MAKE LOOT CREATE WORK. An item does not need a secret, mystery, destination, hidden property, upgrade path, lore revelation, special mechanical use, or connection to an active plot. A brass astrolabe can simply be a brass astrolabe. A crate of silk is silk. A silver necklace is jewelry. Damaged machinery can simply be salvage. Only turn loot into a story when the player chooses to investigate it or the item was already established as important.\n\nBE SPECIFIC, NOT EXCESSIVE. Creativity means believable variety and source-appropriate detail, not making every find magical, bespoke, named, or consequential. Do not use the magic-item examples below as a target distribution; they demonstrate TAG FORMAT only.\n\n${itemMarker}`;
replace(itemMarker, lootRules, 'item marker');

fs.writeFileSync(path,s);
console.log('Applied player-led pacing, choice discipline, and ordinary-loot rules.');
