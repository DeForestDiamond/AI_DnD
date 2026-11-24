import { connectedArcContext } from './connectedArc.js';
import { hasAntagonistArc, isConnectedArc } from '../helpers/storyOptions.js';

export const ARC_PACING_BLOCK = `── ARC DEVELOPMENT AND AFTERMATH ──
Completion closes the central conflict, not its aftermath. Continue rewards, loot, prisoners, promises, repairs, funerals, conversations, and other loose ends for as long as the player wants; do not skip them, auto-travel onward, or treat collecting payment as accepting another job. Already-established dangers continue causally.

The app reserves the next antagonist. While CURRENT STATE says RESERVED, withhold that foe's attacks, scouts, victims, ominous signs, deadlines, and pressure records. Do not reveal its hidden identity through NPC omniscience. Keep old business and personal scenes playable; the reserved foe does not intrude to force engagement.

When the player finishes or leaves aftermath and seeks something new through a guild, job board, asking for work, investigation, or exploration, offer one concrete discoverable opportunity tied to the reserved foe. A little looking is enough; no chain of unrelated errands. Exploring to settle old business is still aftermath. Emit [ARC START] only when they choose to follow/accept the new opportunity; a declined offer stays reserved without pursuit or pressure. Never emit [ARC START] in the same response as [ARC COMPLETE], or repeat completion for the previous resolved arc. Fresh campaign openings already have an active arc and need no activation ritual.`;

// Shared by every model and the compact OpenAI/xAI transport.
export const arcContext = (char) => {
  const arc = char?.arc;
  if (!hasAntagonistArc(char)) return '';
  const location = arc.arcLocation || arc.localArea || char.currentLocation || 'the opening area';
  if (isConnectedArc(arc)) return connectedArcContext(arc, location);
  if (arc.status === 'reserved') return `\nACTIVE ARC ANTAGONIST (HIDDEN): NONE — AFTERMATH / BETWEEN ARCS.
Previous resolved antagonist: ${arc.previousAntagonist || 'the previous conflict'}.
NEXT ARC ANTAGONIST (HIDDEN, RESERVED — not active): ${arc.antagonist}.
NEXT ARC LOCATION (HIDDEN): ${location} (${arc.arcLocation ? 'required or player-selected destination' : 'local arc; no separate travel destination'}).
Phase: AFTERMATH. Previous arc is closed; the reserved foe is not active. Follow ARC DEVELOPMENT AND AFTERMATH; [ARC START] requires the player's choice of a new opportunity.`;
  return `\nACTIVE ARC ANTAGONIST (HIDDEN — never reveal them directly until the story does): ${arc.antagonist}.
ARC LOCATION (HIDDEN CAMPAIGN STATE): ${location} (${arc.arcLocation ? 'required or player-selected destination' : 'local arc; no separate travel destination'}).
Phase: ACTIVE. Follow ACTIVE ARC rules for the assigned antagonist and geographic anchor above.`;
};

