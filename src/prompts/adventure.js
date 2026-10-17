import { isContinuousStory } from '../helpers/storyOptions.js';

// Stable Adventure definition belongs before volatile state/history, not on
// each new user message. Preserve the authoritative premise verbatim.
export function adventureContext(char) {
  const adv = isContinuousStory(char) ? null : char?.adventure;
  if (!adv) return '';
  return `[ACTIVE ADVENTURE — BACKGROUND SITUATION]
TITLE: ${adv.title}
PREMISE: ${adv.premise}
ORIGINAL STARTING CONTEXT: ${adv.location || ''}
The starting context is background, not an instruction to reset the scene or return there. CURRENT STATE supplies the player's present location.

This is the current story driver, not the player's mandatory immediate objective. Introduce or advance it organically; a stable situation may remain quiet through unrelated activities. Established dangers and pressures still follow fictional time. Do not invent interruptions to pull the player back or repeatedly remind them the Adventure exists. Let their choices determine its pace and shape; do not force a villain, combat, or predetermined solution.

When the situation ACTUALLY reaches a natural resolution, emit [ADVENTURE COMPLETE] exactly once. Walking away, delaying it, or changing subjects does not itself complete it.`;
}
