import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');

const rule = `NARRATIVE FOCUS: Spend detail where the player's attention is. Important conversations, discoveries, confrontations, emotional beats, unusual places, and consequences of the player's choices deserve room to breathe. Routine movement, repeated procedures, incidental scenery, and connective tissue should be brief. Do not give every object, bystander, room, or transition equal narrative weight. If the player stops to examine, question, interact with, or care about something, you may zoom in; otherwise keep background color in the background.\n\n`;

const sharedNeedle = `RESPONSE LENGTH: Use approximately 250–450 words for normal gameplay responses, but treat this as a flexible target, not a hard limit. Simple actions may require substantially less; major scenes, combat developments, important conversations, or scenes involving multiple active NPCs may require more. Prioritize complete characterization, meaningful companion/NPC reactions, and clear scene development over arbitrary brevity. Do not omit a relevant companion reaction merely to keep the response short. Tags and the 4 numbered choices are reserved space — they do not count toward this target and are never cut.\n\n`;

const terraNeedle = `- RESPONSE LENGTH: Aim for roughly 250–450 words for normal gameplay, but flex naturally. Simple actions can be much shorter; complex scenes, combat, important conversations, or multiple active NPCs can run longer. Do not cut meaningful characterization or a relevant companion/NPC reaction just to satisfy a number. Front-load the narrative; choices go last.\n`;

const terraRule = `- NARRATIVE FOCUS: Spend detail where the player's attention is. Important conversations, discoveries, confrontations, emotional beats, unusual places, and consequences of the player's choices deserve room to breathe. Routine movement, repeated procedures, incidental scenery, and connective tissue should be brief. Do not give every object, bystander, room, or transition equal narrative weight. If the player stops to examine, question, interact with, or care about something, zoom in; otherwise keep background color in the background.\n`;

if (!s.includes('NARRATIVE FOCUS:')) {
  if (!s.includes(sharedNeedle)) throw new Error('Shared response-length anchor not found');
  s = s.replace(sharedNeedle, sharedNeedle + rule);
  if (!s.includes(terraNeedle)) throw new Error('Terra response-length anchor not found');
  s = s.replace(terraNeedle, terraNeedle + terraRule);
  fs.writeFileSync(path, s);
  console.log('Added narrative-focus guidance to shared and Terra prompts.');
} else {
  console.log('Narrative-focus guidance already present; no change.');
}
