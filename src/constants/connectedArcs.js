// Only the title and premise are shown in the campaign picker.
export const CONNECTED_ARCS = [{
  kind: 'connected',
  title: 'Empty Cages',
  premise: 'Two owlbear cubs have vanished from a royal preserve. The Crown’s Master of the Hunt is hiring someone to find out who took them.',
  arcLocation: 'Cormyr',
  opening: 'Open with the Crown’s Master of the Hunt offering 250 gp to identify the poachers and their delivery site. Two live owlbear cubs were taken from the royal preserve. A keeper found cart tracks at the broken enclosure and can show the player where they leave the preserve. Mention up front that further findings earn separate fees and that identifying the person protecting the trade with actionable proof earns a royal favor. Offer an archmage a day with a restricted grimoire in the Crown’s sealed stacks as a possible favor. Give the player room to negotiate, decline, or accept.',
  centralConflict: 'Poachers are filling orders for live animals taken from a royal preserve. The Crown wants to establish who protects the trade and secure evidence it can act on. Preserve a decisive outcome even when the player settles the operation another way.',
  members: [
    { name: 'The poaching outfit', role: 'Takes live animals to an old mill for collection. Its hunters know the merchant who orders them.' },
    { name: 'The merchant', role: 'A member of a crooked merchant consortium who finances the hunts, supplies the cages and hires a wildlife smuggler to deliver live animals to buyers.' },
    { name: 'The wildlife smuggler', role: 'Keeps the animals alive during transport and pays the sheriff to clear each wagon at the east gate.' },
    { name: 'The sheriff and deputies', role: 'The sheriff takes a fee per wagon and orders deputies to wave it through. Individual deputies know what they personally saw or were told.' },
  ],
  relationships: [
    'The poachers carry a paid order for the cubs bearing the merchant’s seal. Their testimony or a delivery to the mill can identify the merchant too.',
    'The merchant has ordered six more animals. The delivery book names the wildlife smuggler, holding site and next collection. Following a wagon or arranging a handoff can reveal the same facts.',
    'The smuggler records fees paid to the sheriff. The next payment is due as the wagon passes the east gate. Witnesses, accounts, or effective magic can establish the arrangement.',
  ],
  patron: 'The Crown’s Master of the Hunt pays for findings delivered and offers to extend the investigation at each link. Honor every answer earned even when delivered together or out of order. Judge divination, tracking and other methods by their actual capabilities. The participants are local criminals, regardless of character level. The final commission also earns a negotiated royal favor. For an archmage this can be a day with a restricted grimoire in the Crown’s sealed stacks. Honor the agreed favor during aftermath.',
  commissions: [
    { gp: 250, task: 'Identify the poachers and where they deliver the animals.' },
    { gp: 500, task: 'Trace the merchant’s orders to the holding site and the next pickup.' },
    { gp: 1000, task: 'Establish how the shipment clears a Crown checkpoint.' },
    { gp: 2000, task: 'Deliver actionable evidence of the sheriff’s involvement. Also grant the promised royal favor.' },
  ],
}];
