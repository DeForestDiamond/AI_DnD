import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');

// Generate JavaScript string literals safely. Prompt prose contains apostrophes
// constantly; hand-embedding it in single-quoted source has already broken builds.
const js = (text) => JSON.stringify(text);

const oldInstructions = `      const instructions = hasSplit
        ? [systemPrompt.static, systemPrompt.gear, systemPrompt.items].filter(Boolean).join('\\n\\n')
        : systemPrompt;`;

const forwardOld = 'FORWARD PRESSURE: Something must always be at stake or in motion. If the player has no reason to act, give them one — a sound from the next room, a timer running out, someone who needs help, an enemy that noticed them, a door that is closing. The world does not pause and wait politely. Inaction should have consequences, not just more atmosphere.';
const forwardNew = 'PACING: Let scenes breathe. Investigation, conversation, planning, shopping, travel, downtime, and quiet observation are valid play and do not need an injected threat, timer, interruption, or forced urgency. Introduce pressure only when it follows naturally from the established situation. If the player is pursuing a lead, let them investigate it before forcing a confrontation.';
const actionOld = 'ACTION OVER DESCRIPTION: When in doubt, make something happen. A merchant approaches. A guard challenges them. A noise echoes. Something moves. A figure appears. Push the story forward. The player is here to make decisions, not to read descriptions.';
const actionNew = 'MOMENTUM WITHOUT FORCING IT: Give the player useful things to notice, learn, ask about, or act on, but do not manufacture an event merely because a scene is quiet. A clue, answer, NPC reaction, discovery, or meaningful choice is forward movement. Action is only one kind of progress.';

const newInstructions = `      // GPT prompt experiment: OpenAI gets a lighter prompt than Sonnet/Haiku.
      // Developer instructions are sent as input_text blocks below because GPT-5.6
      // explicit cache breakpoints cannot be attached to top-level instructions.
      const gptStaticInstructions = (hasSplit ? systemPrompt.static : systemPrompt)
        .replace(NPC_BLOCK, '')
        .replace(${js(forwardOld)}, ${js(forwardNew)})
        .replace(${js(actionOld)}, ${js(actionNew)});`;

const oldDynamic = `    const dynamicTail = hasSplit ? systemPrompt.dynamic : '';`;
const arcOld = `IF THE ANTAGONIST ABOVE IS NOT YET IN THE STORY, INTRODUCE IT NOW. It was assigned by the system — your job is to weave it in, not ignore it. Do NOT run an unrelated plotline while it sits unused. Start tying current events to it this turn: a sign, a rumor, a victim, its agents. Whatever the player is doing, this antagonist is the thread underneath it.
KEEP THE THREAD WARM. Follow the player's own jobs and detours, never railroad — but don't let the antagonist vanish. Even when the player is busy elsewhere, surface it now and then (a rumor, a fresh sign of its work, a ripple into what they're doing) so the arc stays alive and ready to pick back up.`;
const arcNew = `THE ANTAGONIST IS THE ACTIVE ARC, NOT A COMMAND TO RUSH. Build toward it at the pace the fiction supports. The player may first encounter rumors, consequences, victims, agents, evidence, false leads, locations, or other clues, and may investigate those across multiple scenes before meeting or even identifying the antagonist. Do not force an immediate confrontation or reveal simply because the antagonist has been assigned.
KEEP THE THREAD AVAILABLE, NOT CONSTANT. Remember the antagonist and connect genuine arc developments back to it, but ordinary side content — travel incidents, tavern scenes, shopping, downtime, small jobs, random encounters, and self-contained local problems — may remain genuinely unrelated. Do not insert an antagonist sign into every scene merely to keep the arc visible.
NO COMPETING ARC. Unrelated side content must stay small and self-contained. The moment a thread becomes a multi-scene mystery, recurring threat, conspiracy, quest chain, mastermind plot, or named villain driving ongoing events, it MUST belong to the assigned antagonist. Any secondary villain in such a thread is an agent, lieutenant, client, victim, rival, or consequence of the assigned antagonist — never a replacement main antagonist. Before creating a new recurring villain or hidden mastermind, check the ACTIVE ARC ANTAGONIST above; if it is not that antagonist or meaningfully connected to it, do not create it.
LEAD-UP IS THE GOAL. When the player pursues the arc, advance through discoverable leads rather than teleporting them to the antagonist: clues point to people, people point to places, places reveal operations, and operations eventually expose the antagonist. Several investigation or travel scenes before confrontation are normal and desirable.`;

const newDynamic = `    let dynamicTail = hasSplit ? systemPrompt.dynamic : '';
    // GPT prompt experiment: the assigned antagonist remains the arc anchor, but
    // it is not required to invade every scene. Let clues, investigation and
    // unrelated detours exist without immediately yeeting the player at it.
    if (provider === 'openai' && dynamicTail) {
      dynamicTail = dynamicTail.replace(${js(arcOld)}, ${js(arcNew)});
    }`;

const oldInput = `      const input = messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));
      if (dynamicTail && input.length) {
        const last = input[input.length - 1];
        input[input.length - 1] = { ...last, content: \`${'${last.content}'}\\n\\n${'${dynamicTail}'}\` };
      }`;

const newInput = `      // GPT-5.6 explicit-only cache layout. Four useful breakpoints:
      //   1) stable DM rules, 2) worn gear/constructs,
      //   3) previous turn's stable-history boundary, 4) current boundary.
      // Each gameplay turn adds two messages, so the prior history boundary is
      // exactly three messages back inside the new stable-history slice. This
      // lets OpenAI read the old cached history and write only the appended turn.
      // Carried items sit after gear and before history: loot changes therefore
      // fall back to the gear cache instead of rebuilding the giant static prompt.
      const cacheBreakpoint = () => ({ mode: 'explicit' });
      const developerContent = [
        {
          type: 'input_text',
          text: gptStaticInstructions,
          prompt_cache_breakpoint: cacheBreakpoint(),
        },
        ...(hasSplit && systemPrompt.gear ? [{
          type: 'input_text',
          text: systemPrompt.gear,
          prompt_cache_breakpoint: cacheBreakpoint(),
        }] : []),
        ...(hasSplit && systemPrompt.items ? [{
          type: 'input_text',
          text: systemPrompt.items,
        }] : []),
      ];

      const stableHistoryCount = Math.max(0, messages.length - 2);
      const previousHistoryBoundary = stableHistoryCount >= 3 ? stableHistoryCount - 3 : -1;
      const currentHistoryBoundary = stableHistoryCount >= 1 ? stableHistoryCount - 1 : -1;
      const input = [{
        type: 'message',
        role: 'developer',
        content: developerContent,
      }];

      messages.forEach((m, i) => {
        let text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        if (dynamicTail && i === messages.length - 1) text = \`${'${text}'}\\n\\n${'${dynamicTail}'}\`;
        const markHistory = i === previousHistoryBoundary || i === currentHistoryBoundary;
        input.push({
          type: 'message',
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: [{
            type: 'input_text',
            text,
            ...(markHistory ? { prompt_cache_breakpoint: cacheBreakpoint() } : {}),
          }],
        });
      });`;

const oldRequestBits = `          instructions,
          input,
          max_output_tokens: modelConfig.max_tokens,
          reasoning: { effort: modelConfig.reasoning_effort || 'low' },
          text: { verbosity: 'low' },
          prompt_cache_key: \`ai-dnd:${'${modelConfig.model}'}:${'${charRef.current?.name || \'character\'}'}\`,
          store: false,`;

const newRequestBits = `          input,
          max_output_tokens: modelConfig.max_tokens,
          reasoning: { effort: modelConfig.reasoning_effort || 'low' },
          text: { verbosity: 'low' },
          prompt_cache_key: \`ai-dnd:${'${modelConfig.model}'}:${'${charRef.current?.name || \'character\'}'}\`,
          prompt_cache_options: { mode: 'explicit', ttl: '30m' },
          store: false,`;

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

if (s.includes(newInput)) {
  console.log('GPT explicit cache input layout already applied.');
} else if (s.includes(oldInput)) {
  s = s.replace(oldInput, newInput);
  changed = true;
} else {
  throw new Error('OpenAI input anchor not found; refusing broad edit');
}

if (s.includes(newRequestBits)) {
  console.log('GPT explicit cache request options already applied.');
} else if (s.includes(oldRequestBits)) {
  s = s.replace(oldRequestBits, newRequestBits);
  changed = true;
} else {
  throw new Error('OpenAI request cache-options anchor not found; refusing broad edit');
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('GPT prompt experiment applied: prompt tweaks preserved; explicit-only layered cache enabled.');
}
