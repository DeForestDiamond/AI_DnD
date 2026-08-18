import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');

const oldInstructions = `      const instructions = hasSplit
        ? [systemPrompt.static, systemPrompt.gear, systemPrompt.items].filter(Boolean).join('\\n\\n')
        : systemPrompt;`;

const newInstructions = `      // GPT prompt experiment: OpenAI gets a lighter prompt than Sonnet/Haiku.
      // Remove forced NPC description/diversity and soften the constant-motion
      // rules so investigation, conversation, downtime and lead-up can breathe.
      const instructions = (hasSplit
        ? [systemPrompt.static, systemPrompt.gear, systemPrompt.items].filter(Boolean).join('\\n\\n')
        : systemPrompt)
        .replace(NPC_BLOCK, '')
        .replace(
          'FORWARD PRESSURE: Something must always be at stake or in motion. If the player has no reason to act, give them one — a sound from the next room, a timer running out, someone who needs help, an enemy that noticed them, a door that is closing. The world does not pause and wait politely. Inaction should have consequences, not just more atmosphere.',
          'PACING: Let scenes breathe. Investigation, conversation, planning, shopping, travel, downtime, and quiet observation are valid play and do not need an injected threat, timer, interruption, or forced urgency. Introduce pressure only when it follows naturally from the established situation. If the player is pursuing a lead, let them investigate it before forcing a confrontation.'
        )
        .replace(
          'ACTION OVER DESCRIPTION: When in doubt, make something happen. A merchant approaches. A guard challenges them. A noise echoes. Something moves. A figure appears. Push the story forward. The player is here to make decisions, not to read descriptions.',
          'MOMENTUM WITHOUT FORCING IT: Give the player useful things to notice, learn, ask about, or act on, but do not manufacture an event merely because a scene is quiet. A clue, answer, NPC reaction, discovery, or meaningful choice is forward movement. Action is only one kind of progress.'
        );`;

const oldDynamic = `    const dynamicTail = hasSplit ? systemPrompt.dynamic : '';`;
const newDynamic = `    let dynamicTail = hasSplit ? systemPrompt.dynamic : '';
    // GPT prompt experiment: the assigned antagonist remains the arc anchor, but
    // it is not required to invade every scene. Let clues, investigation and
    // unrelated detours exist without immediately yeeting the player at it.
    if (provider === 'openai' && dynamicTail) {
      dynamicTail = dynamicTail
        .replace(
          'IF THE ANTAGONIST ABOVE IS NOT YET IN THE STORY, INTRODUCE IT NOW. It was assigned by the system — your job is to weave it in, not ignore it. Do NOT run an unrelated plotline while it sits unused. Start tying current events to it this turn: a sign, a rumor, a victim, its agents. Whatever the player is doing, this antagonist is the thread underneath it.\\nKEEP THE THREAD WARM. Follow the player\'s own jobs and detours, never railroad — but don\'t let the antagonist vanish. Even when the player is busy elsewhere, surface it now and then (a rumor, a fresh sign of its work, a ripple into what they\'re doing) so the arc stays alive and ready to pick back up.',
          'THE ANTAGONIST IS THE ACTIVE ARC, NOT A COMMAND TO RUSH. Build toward it at the pace the fiction supports. The player may first encounter rumors, consequences, victims, agents, evidence, false leads, locations, or other clues, and may investigate those across multiple scenes before meeting or even identifying the antagonist. Do not force an immediate confrontation or reveal simply because the antagonist has been assigned.\\nKEEP THE THREAD AVAILABLE, NOT CONSTANT. Remember the antagonist and connect genuine arc developments back to it, but unrelated jobs, travel, downtime, conversations, and side events may remain genuinely unrelated. Do not insert an antagonist sign or interruption into every scene merely to keep the arc visible. When the player pursues the arc, give them leads they can follow and room to investigate.'
        );
    }`;

let changed = false;

if (s.includes(newInstructions)) {
  console.log('GPT prompt experiment instruction changes already applied.');
} else if (s.includes(oldInstructions)) {
  s = s.replace(oldInstructions, newInstructions);
  changed = true;
} else {
  throw new Error('OpenAI instructions anchor not found; refusing broad edit');
}

if (s.includes(newDynamic)) {
  console.log('GPT prompt experiment arc pacing changes already applied.');
} else if (s.includes(oldDynamic)) {
  s = s.replace(oldDynamic, newDynamic);
  changed = true;
} else {
  throw new Error('Dynamic-tail anchor not found; refusing broad edit');
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('GPT prompt experiment applied: NPC block removed; pacing and antagonist pressure softened.');
}
