// Saved on character.arc. Each member's role describes their stake and work;
// relationships describe how the named members interact, including rivalries.
export const CONNECTED_ARC_RULES = `── CONNECTED ANTAGONIST ARC ──
Run the central conflict, members and relationships in CURRENT STATE as one story. Use each member's assigned role, resources, motives and location. Treat the stated connections as established facts. A participant knows their own dealings and whatever they could reasonably have learned. Reveal the rest through observable actions, credible testimony or evidence the player actually obtains. Leave unrelated people, errands and downtime free to have their own purpose.

Let one scene create the circumstances for another. When someone's actions disrupt an arrangement, consider who would notice, when word could reach them, what they stand to lose, and what they can do. Show that consequence when it comes due. Members may cooperate, interfere, defect, surrender or act independently. Discovery order is open. The player can skip members, turn them against one another, or settle the entire conflict in a single decisive move. Never require a confrontation with everyone or invent a hidden superior to extend play.

Carry forward tangible gains, losses, bargains and known leads. When the player follows a lead, show what it reaches. If they ask what comes next, surface a concrete opportunity from what they have uncovered or what another member has actually done. Leave the player time for loot, conversations and other business while established events advance on their own timetable. Members share one active arc. Do not wait for [ARC START], a job board visit or fresh acceptance between them.

While the arc is active, only emit [ARC COMPLETE] when the central conflict itself is settled or its established objective becomes irreversibly impossible. Emit it in the response establishing that outcome. Removing one member can weaken, end, or leave the operation intact: judge what the remaining members can actually do. Honor a decisive victory or failure without adding a replacement objective. After completion, play out earned rewards and consequences and follow the player's next direction.`;

export function connectedArcContext(arc, location) {
  const header = '\nACTIVE ARC ANTAGONIST SET (HIDDEN DM CONTEXT)';
  const payments = Array.isArray(arc.commissions) ? arc.commissions.flatMap((commission, index) => {
    if (!commission?.task || !Number.isSafeInteger(commission.gp) || commission.gp <= 0) return [];
    return [`${index + 1}. ${commission.gp} gp (${commission.paid ? 'paid' : 'unpaid'}) — ${commission.task}`];
  }) : [];
  const terms = [
    arc.patron,
    ...(payments.length ? ['When the patron actually pays, emit [COMMISSION PAID: N] for each delivered finding using its number below. The app credits its gold once. Use the ordinary coin tags only for separate transactions. Offers and promises earn no payment tag.', ...payments] : []),
  ].filter(Boolean).join('\n');
  const contract = terms ? '\nPatron and commission terms:\n' + terms : '';
  if (arc.status === 'completed') return `${header}\nCompleted: ${arc.title}. Phase: AFTERMATH. The central conflict is closed. Honor the outcome and existing leads. Do not restart or repeat completion.${contract}`;
  const phase = arc.status === 'reserved'
    ? "RESERVED. Offer a grounded opening when appropriate. Emit [ARC START] in the response where the player accepts or acts on that opportunity, including a free-text choice. A declined offer stays reserved. Never combine it with [ARC COMPLETE]."
    : "ACTIVE. The arc has already started. Follow the player's lead among the established members.";
  return `${header}\nTitle: ${arc.title}\nCentral conflict: ${arc.centralConflict}\nLocation: ${location}\nMembers:\n${arc.members.map(member => `- ${member.name}: ${member.role}`).join('\n')}\nRelationships:\n${arc.relationships.map(link => `- ${link}`).join('\n')}\nPhase: ${phase}${contract}`;
}
