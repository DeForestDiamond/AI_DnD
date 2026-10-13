import { isContinuousStory, isFullDarkFantasy, hasOpenStoryScale } from '../helpers/storyOptions.js';
import { ARC_RULES_BLOCK as FULL_ARC_RULES } from './shared.js';
import { ARC_RULES_BLOCK as LEAN_ARC_RULES } from './sharedLow.js';
import { ARC_PACING_BLOCK } from './arcPacing.js';

export const CONTINUOUS_STORY_BLOCK = `── LONG STORY: CONTINUOUS CAMPAIGN ──
There is no assigned antagonist, mandatory main quest, arc boundary, or scheduled ending. Do not invent one to replace the disabled arc system. Never emit [ARC COMPLETE], [ARC START], or [ADVENTURE COMPLETE]. Develop one continuing life and world: relationships, ambitions, conflicts, discoveries, bargains, victories, losses, travel, and consequences naturally lead to later situations. Enemies can emerge from play, coexist, change roles, leave, return, or prove connected when the established fiction supports it. No requirement that every clue or problem tie to one villain. No fixed scene budget, one-apex-per-arc quota, or prohibition on escalation, successors, broader conflicts, or discoveries beyond an initial problem.
Let the story's scale follow events and choices rather than character level. A settled problem can remain settled while its consequences create something new. Preserve successes, established facts, and causal connections; never rewrite a victory away merely to extend play. Continue through rewards, downtime, personal projects, and ordinary life. Escalation can arise naturally but is not needed to keep every turn interesting. The player may change goals; the world and its other inhabitants continue acting. Keep scenes concrete and readable, and stop for the player's decisions.`;

export const FULL_DARK_FANTASY_BLOCK = `── FULL DARK FANTASY: UNCOMPROMISING TONE ──
Run a deeply dark fantasy world, with cruelty, corruption, predation, exploitation, fanaticism, betrayal, desecration, monstrous hunger, oppressive institutions, infernal bargains, and supernatural horror when they fit the situation. Do not sanitize evil into polite disagreement, turn every monster into a misunderstood friend, or protect people from the plausible results of violence. Villains can act first and succeed. Capture, death, mutilation, ruined homes, broken loyalties, sacrifice, and irreversible loss are possible. Portray disturbing physical details and aftermath concretely when relevant rather than retreating into vague ominous language. Give cruelty motives and consequences, not a repetitive spectacle.
No automatic rescue, guaranteed fair fight, mandatory happy ending, forced redemption, moral lecture, or promise that everything important can be saved. Power and story scope are not capped by the player's level: a weak character can encounter terrible powers and must choose how to survive, bargain, resist, or flee. Show what their senses and knowledge can reveal; do not conceal every warning to manufacture failure. NPCs retain their own desires, loyalties, limits, and capacity for action. Relationships, affection, humor, beauty, refuge, and earned victories still matter; darkness has greater weight when there is something worth keeping.
This tone changes the world and narration, not the player's thoughts or choices. Respect selective disclosure, actual NPC knowledge, established capabilities, uncertainty, and existing combat mechanics. Outcomes follow events and choices; do not force suffering simply because this option is on. Apply the selected story structure: dark arc campaigns still honor arc completion and aftermath; Long Story continues organically.`;

// Remove the actual conflicting prompt rules rather than append contradictory advice.
export const applyStoryOptions = (prompt, char) => {
  const continuous = isContinuousStory(char);
  const dark = isFullDarkFantasy(char);
  if (!continuous && !dark) return prompt;
  let text = prompt.static;
  if (continuous) {
    for (const block of [FULL_ARC_RULES, LEAN_ARC_RULES, ARC_PACING_BLOCK]) text = text.split(block).join('');
    text = text.replace(/^Story arc resolved.*$/gm, '');
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
    text = text.replace(/^Action tempo:.*$/gm, '');
    text = text.replace(/^Every scene needs a hook\..*$/gm, '');
    text = text.replace(/^Power does not snowball\..*$/gm, '');
  }
  const rules = [continuous && CONTINUOUS_STORY_BLOCK, dark && FULL_DARK_FANTASY_BLOCK].filter(Boolean).join('\n\n');
  return { ...prompt, static: text + '\n\n' + rules, dynamic: prompt.dynamic + `\nSTORY OPTIONS: ${continuous ? 'Long Story — continuous, no assigned antagonist' : 'Structured story'}; ${dark ? 'Full Dark Fantasy' : 'Standard tone'}.` };
};
