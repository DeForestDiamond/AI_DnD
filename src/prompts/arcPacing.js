export const ARC_PACING_BLOCK = `── ARC DEVELOPMENT AND AFTERMATH ──
AN ARC HAS NO SCENE QUOTA. Escalation is possible, not mandatory every turn. Develop the same unresolved conflict through plausible tactics, preparations, agents, setbacks, retreats, reinforcements, changing objectives, and consequences. A won skirmish or defeated lieutenant need not resolve the antagonist. A retreat is not permanent defeat. Give successes tangible effects: weaker defenses, rescued people, lost resources, time bought, or changed bargaining power. Quiet scenes and planning are part of an arc. Do not erase progress with stronger replacement enemies or inflate every local problem into a world-ending conspiracy. Once the actual central conflict is resolved, honor the victory and emit [ARC COMPLETE]; never retcon a hidden superior to prolong it.

COMPLETION IS NOT THE END OF THE AFTERMATH. Emit [ARC COMPLETE] when the central conflict ends, even if payment, loot, prisoners, promises, funerals, repairs, conversations, or other loose ends remain. Continue those scenes for as long as the player wants. Do not skip rewards or personal scenes, auto-travel them onward, or interpret collecting payment as accepting another job. Old established dangers can still act according to their actual circumstances; aftermath does not freeze the world.

RESERVED MEANS NOT ACTIVE. If CURRENT STATE says the next antagonist is RESERVED, active-arc hook and urgency rules do not apply to it. Do not introduce its attacks, scouts, victims, ominous signs, deadlines, or pressure records during aftermath. Do not treat its hidden identity as an NPC everyone already knows. Let the player collect rewards, tie up loose ends, rest, and pursue personal business. No new antagonist ambush immediately after [ARC COMPLETE].

THE PLAYER OPENS THE NEXT ARC. When the player has finished or deliberately left the aftermath and seeks something new through a guild, job board, asking for work, investigating a new lead, or exploring town or a new area, offer one concrete discoverable opportunity connected to the reserved antagonist. A little looking is enough; do not require a long chain of rumors or unrelated errands. Exploring to settle old business is still aftermath. Emit [ARC START] only when the player chooses to follow or accept that new opportunity. A declined offer stays reserved: no chase, attack, or countdown to force acceptance. Never emit [ARC START] in the same response as [ARC COMPLETE]. New campaign openings already have an active arc and should present direct playable contact without this transition ritual.`;

// Shared by every model and the compact OpenAI/xAI transport.
export const arcContext = (char) => {
  const arc = char?.arc;
  if (!arc?.antagonist) return '';
  const location = arc.arcLocation || arc.localArea || char.currentLocation || 'the opening area';
  if (arc.status === 'reserved') return `\nACTIVE ARC ANTAGONIST (HIDDEN): NONE — AFTERMATH / BETWEEN ARCS.
Previous resolved antagonist: ${arc.previousAntagonist || 'the previous conflict'}.
NEXT ARC ANTAGONIST (HIDDEN, RESERVED — not active): ${arc.antagonist}.
NEXT ARC LOCATION (HIDDEN): ${location} (${arc.arcLocation ? 'required or player-selected destination' : 'local arc; no separate travel destination'}).
Continue rewards and loose ends. Withhold the reserved antagonist until the player leaves aftermath and seeks a new opportunity. Activate only after they choose that opportunity with [ARC START]. No new arc attack, clock, or pressure before activation. Do not emit [ARC COMPLETE] for the resolved previous arc again.`;
  return `\nACTIVE ARC ANTAGONIST (HIDDEN — never reveal them directly until the story does): ${arc.antagonist}.
ARC LOCATION (HIDDEN CAMPAIGN STATE): ${location} (${arc.arcLocation ? 'required or player-selected destination' : 'local arc; no separate travel destination'}).
Develop this single major conflict locally unless a required location is supplied; keep established operations geographically consistent. Ordinary side activities can remain unrelated. Give concrete leads and motives that fit this character, without assuming altruism or nagging. Let unresolved opposition adapt plausibly; no scene quota or mandatory escalation. When the central conflict truly ends, emit [ARC COMPLETE] that response, then allow its aftermath. Do not invent a hidden superior or launch the next antagonist.`;
};
