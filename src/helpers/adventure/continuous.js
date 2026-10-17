import { rollAdventureSeed } from './seed.js';
import { isFullDarkFantasy } from '../storyOptions.js';
import { situationLocationDirective } from '../../constants/adventures.js';

export const prepareContinuousOpening = (char, opening = '', situation = null) => {
  const seed = rollAdventureSeed(char.level, { continuous: true });
  const { arc, adventure, suspendedStoryDriver, currentLocation, worldPressures, ...rest } = char;
  const character = { ...rest, arc: null, currentLocation: '', worldPressures: {}, storyMode: 'continuous' };
  const context = opening.trim()
    ? `PLAYER'S OPENING (use exactly this setting and situation):\n${opening.trim()}`
    : situation
      ? `STARTING CONTEXT: ${situation.location}${situationLocationDirective(situation)}\nINITIAL SITUATION: ${situation.premise}`
      : `GEOGRAPHIC ANCHOR: ${seed.startingArea}\nSETTING: ${seed.setting}\nTIME: ${seed.time}\nWEATHER: ${seed.weather}\nSCENE: ${seed.location}\nOPENING STYLE: ${seed.openingStyle}\nDISTINCTIVE DETAIL: ${seed.wildcard}\nINITIAL OPPORTUNITY: ${seed.hook}`;
  const prompt = `[LONG STORY — OPENING]\n${context}\nTONE: ${isFullDarkFantasy(char) ? 'Full Dark Fantasy — uncompromising darkness and tangible danger' : situation?.tone || seed.tone}

Begin one continuous story. These are opening ingredients, not a predetermined antagonist, final objective, or plot. Establish one coherent place and a clear playable situation; let subsequent relationships, conflicts, discoveries, and goals emerge from play. Story scope is not capped by level. Do not assign a hidden main villain or emit arc/adventure completion tags. Develop direct contact or an opportunity when appropriate to the scene and this character, without assuming altruism or prior acceptance.
The previous campaign location and its timed pressures are unavailable for this fresh opening. Respect a player-written opening and any supplied situation's starting context; otherwise start in the geographic anchor or nearby. Emit [LOCATION: ...]. Never invent actions, agreements, acquisitions, dialogue, or private knowledge for the player. Begin before they respond, and stop at their first decision. End with four numbered choices.`;
  return { character, prompt, seed };
};
