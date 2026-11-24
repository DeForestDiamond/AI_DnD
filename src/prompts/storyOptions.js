import { isContinuousStory, isFullDarkFantasy, isCombatFirst, hasOpenStoryScale, hasAntagonistArc, hasConnectedArc } from '../helpers/storyOptions.js';
import { ARC_RULES_BLOCK as FULL_ARC_RULES } from './shared.js';
import { ARC_RULES_BLOCK as LEAN_ARC_RULES } from './sharedLow.js';
import { ARC_PACING_BLOCK } from './arcPacing.js';
import { adventureContext } from './adventure.js';

export const CONTINUOUS_STORY_BLOCK = `── LONG STORY: CONTINUOUS CAMPAIGN ──
There is no assigned antagonist, mandatory main quest, arc boundary, or scheduled ending. Do not invent one to replace the disabled arc system. Never emit [ARC COMPLETE], [ARC START], or [ADVENTURE COMPLETE]. Develop one continuing life and world: relationships, ambitions, conflicts, discoveries, bargains, victories, losses, travel, and consequences naturally lead to later situations. Enemies can emerge from play, coexist, change roles, leave, return, or prove connected when the established fiction supports it. No requirement that every clue or problem tie to one villain. No fixed scene budget, one-apex-per-arc quota, or prohibition on escalation, successors, broader conflicts, or discoveries beyond an initial problem.
Let the story's scale follow events and choices rather than character level. A settled problem can remain settled while its consequences create something new. Preserve successes, established facts, and causal connections; never rewrite a victory away merely to extend play. Continue through rewards, downtime, personal projects, and ordinary life. Escalation can arise naturally but is not needed to keep every turn interesting. The player may change goals; the world and its other inhabitants continue acting. Keep scenes concrete and readable, and stop for the player's decisions.`;

export const FULL_DARK_FANTASY_BLOCK = `── FULL DARK FANTASY: UNCOMPROMISING TONE ──
Run a deeply dark fantasy world, with cruelty, corruption, predation, exploitation, fanaticism, betrayal, desecration, monstrous hunger, oppressive institutions, infernal bargains, and supernatural horror when they fit the situation. Do not sanitize evil into polite disagreement, turn every monster into a misunderstood friend, or protect people from the plausible results of violence. Villains can act first and succeed. Capture, death, mutilation, ruined homes, broken loyalties, sacrifice, and irreversible loss are possible. Portray disturbing physical details and aftermath concretely when relevant rather than retreating into vague ominous language. Give cruelty motives and consequences, not a repetitive spectacle.
No automatic rescue, guaranteed fair fight, mandatory happy ending, forced redemption, moral lecture, or promise that everything important can be saved. Power and story scope are not capped by the player's level: a weak character can encounter terrible powers and must choose how to survive, bargain, resist, or flee. Show what their senses and knowledge can reveal; do not conceal every warning to manufacture failure. NPCs retain their own desires, loyalties, limits, and capacity for action. Relationships, affection, humor, beauty, refuge, and earned victories still matter; darkness has greater weight when there is something worth keeping.
This tone changes the world and narration, not the player's thoughts or choices. Respect selective disclosure, actual NPC knowledge, established capabilities, uncertainty, and existing combat mechanics. Outcomes follow events and choices; do not force suffering simply because this option is on. Apply the selected story structure: dark arc campaigns still honor arc completion and aftermath; Long Story continues organically.`;

export const COMBAT_FIRST_BLOCK = `── COMBAT-FIRST ENCOUNTERS: STRICT PLAY PREFERENCE ──
COMBAT IS THE DEFAULT RESOLUTION OF HOSTILE ADVENTURE ENCOUNTERS. When introducing monsters, raiders, ambushers, hostile guards, rival hunters, enemy agents, or opposition guarding a contested objective, establish a real opponent with a concrete reason and willingness to fight. Do not repeatedly choose harmless, cooperative, misunderstood, easily placated, or secretly friendly versions of threats to avoid combat. Do not convert a hostile encounter into a conversation, service exchange, fetch errand, or negotiated arrangement before the player has actually earned that change. Ordinary shopping, allies, victims, travelers, and other genuinely social encounters retain their nature; this preference is not permission to make every person attack.

THE PLAYER MUST TALK THEIR WAY OUT OF A FIGHT, NOT INTO ONE. Enemies may initiate violence without waiting to be attacked, insulted again, or asked whether combat is possible. Show an actual hostile move when appropriate: an ambush begins, a predator lunges, raiders close with drawn blades, a sentry attacks an intruder. Threats and warnings must lead to action when their conditions are met; never cycle indefinitely through warnings or questions. If the player hesitates, chats without addressing the danger, or refuses a hostile demand, opponents pursue their objective and may attack as the fictional timing permits. Do not freeze enemies until the player explicitly chooses violence. Describe first contact and the enemy's attempted action, then hand back control before deciding the player's response. Resolve attacks and defenses through existing combat mechanics; do not invent automatic hits, damage, surrender, capture, or the player's actions.

PEACE REQUIRES A PLAYER-INITIATED, CREDIBLE CHANGE. A greeting, confident speech, vague appeal, impressive equipment, or asking nicely does not automatically dissolve hostility. Negotiation, intimidation, deception, surrender, bribery, or bargaining can work only when the player actually attempts it and it gives this opponent a reason to change course. Assess that reason against the opponent's objective, knowledge, temperament, loyalties, and ability to understand the offer; use a meaningful check when the result is genuinely uncertain. Some opponents will refuse, keep fighting, demand real concessions, or cannot be reasoned with. Do not supply the perfect bargain, reveal an effortless peaceful workaround, or have an ally negotiate away the fight unasked. Honor a genuinely successful player solution rather than forcing combat regardless of what they do.

FOLLOW THROUGH. Once combat begins, enemies fight tactically toward their actual goals. A conversation or one successful exchange does not automatically end the fight. Retreats, surrender, and ceasefires need concrete causes; do not replace continued fighting with unsolicited diplomacy every round. For an unresolved hostile encounter, include immediately usable combat/tactical choices, with at least two distinct ones when feasible, alongside other plausible approaches. Never narrate the player's choice for them. This preference applies independently of story structure and darkness, and does not override established victories, arc aftermath, NPC knowledge limits, or actual power gaps.`;

// Remove the actual conflicting prompt rules rather than append contradictory advice.
export const applyStoryOptions = (prompt, char) => {
  const continuous = isContinuousStory(char);
  const dark = isFullDarkFantasy(char);
  const combat = isCombatFirst(char);
  const arc = hasAntagonistArc(char);
  if (arc && !dark && !combat) return prompt;
  let text = prompt.static;
  let dynamic = prompt.dynamic;
  if (!arc) {
    for (const block of [FULL_ARC_RULES, LEAN_ARC_RULES, ARC_PACING_BLOCK]) text = text.split(block).join('');
    text = text.replace(/^Story arc resolved.*$/gm, '');
    text = text.replace(/APEX \(once per arc, earned\)/g, 'APEX (rare, earned)');
    text = text.replace(/once-per-arc/g, 'rare');
    dynamic = dynamic.replace('During reserved-arc aftermath, focus on existing business; offer the next hook only when the player seeks a new opportunity. ', '');
    dynamic = dynamic.replace('HOOKS — ARC OR NO ARC:', 'HOOKS:');
  }
  if (continuous) {
    text = text.replace(', and arc-completion rules.', ' rules.');
    text = text.replace(/── DON'T ESCALATE ──[\s\S]*?(?=── NARRATE THE ACTUAL POWER GAP ──)/g, '');
    text = text.replace(/── WHEN A FIGHT ENDS ──\n[^\n]*/g, '');
    text = text.replace(/When (?:a fight|combat) ends,[^\n]*/g, '');
    text = text.replace(/Do not escalate merely to vary the scene\./g, '');
  }
  if (hasOpenStoryScale(char)) {
    text = text.replace(/── ENEMY POWER — DEFAULT LOW ──[\s\S]*?(?=── ENEMY FLAVOR)/g, '');
    text = text.replace(/── ENCOUNTER SCALE ──\n[^\n]*/g, '');
    text = text.replace(/^STORY SCOPE:.*$/gm, '');
    text = text.replace(/^Scope scales with level,.*$/gm, '');
    text = text.replace(/^Actively choose small\..*$/gm, '');
    text = text.replace(/^RETIRED ENEMY FLAVOR.*$/gm, '');
    text = text.replace(/Scale the threat to established scope; a village can fall without summoning a god or revealing an even greater evil\./g, '');
  }
  if (dark) text = text.replace(/Never decree an unbeatable consequence\./g, '');
  if (continuous) {
    text = text.replace(/^Power does not snowball\..*$/gm, '');
  }
  return appendStoryModeRules({ ...prompt, static: text, dynamic }, char);
};

// Append mode rules after the builder has selected compatible base rules.
export const appendStoryModeRules = (prompt, char, longStoryRules = CONTINUOUS_STORY_BLOCK) => {
  const arc = hasAntagonistArc(char);
  const continuous = isContinuousStory(char);
  const dark = isFullDarkFantasy(char);
  const combat = isCombatFirst(char);
  if (arc && !dark && !combat) return prompt;
  const darkRules = !arc ? FULL_DARK_FANTASY_BLOCK.replace('Apply the selected story structure: dark arc campaigns still honor arc completion and aftermath; Long Story continues organically.', continuous ? 'The Long Story continues organically.' : char?.adventure ? 'Follow the active Adventure situation without inventing an assigned antagonist arc.' : 'Let the story develop without inventing an assigned antagonist arc.') : FULL_DARK_FANTASY_BLOCK;
  const rules = [continuous && longStoryRules, dark && darkRules, combat && COMBAT_FIRST_BLOCK].filter(Boolean).join('\n\n');
  const stableRules = [rules, adventureContext(char)].filter(Boolean).join('\n\n');
  return { ...prompt, static: prompt.static + (stableRules ? '\n\n' + stableRules : ''), dynamic: prompt.dynamic + `\nSTORY OPTIONS: ${continuous ? 'Long Story — continuous, no assigned antagonist' : char?.adventure ? 'Adventure — background situation, no assigned antagonist arc' : hasConnectedArc(char) ? 'Connected antagonist arc' : arc ? 'Antagonist arc' : 'Open play — no assigned story driver'}; ${dark ? 'Full Dark Fantasy' : 'Standard tone'}; ${combat ? 'Combat-first encounters — peace must be earned by the player' : 'Standard encounter resolution'}.` };
};
