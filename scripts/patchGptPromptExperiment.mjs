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
const newDynamic = `    let dynamicTail = hasSplit ? systemPrompt.dynamic : '';
    // GPT gets its OWN lean dynamic tail. Claude's dynamic prompt contains a large
    // arc-policy essay plus a repeated preflight checklist that Sol does not need.
    // Preserve only the actual CURRENT STATE lines, then add a compact GPT arc block.
    if (provider === 'openai' && dynamicTail) {
      const arcMarker = '\\nACTIVE ARC ANTAGONIST';
      const hooksMarker = '\\n\\nHOOKS — ARC OR NO ARC:';
      let liveState = dynamicTail;
      const arcIdx = liveState.indexOf(arcMarker);
      if (arcIdx >= 0) liveState = liveState.slice(0, arcIdx);
      const hooksIdx = liveState.indexOf(hooksMarker);
      if (hooksIdx >= 0) liveState = liveState.slice(0, hooksIdx);
      liveState = liveState.trim();

      const arc = charRef.current?.arc;
      const gptArc = arc?.antagonist ? [
        '',
        'ACTIVE ARC (HIDDEN): ' + arc.antagonist,
        'ARC LOCATION (HIDDEN): ' + (arc.arcLocation || 'Faerûn'),
        'This assigned antagonist is the one active campaign arc. Do not replace it with a different recurring villain, conspiracy, or quest chain. Small self-contained side events may be unrelated, but any multi-scene threat or continuing villain must connect to this antagonist.',
        'Build toward the antagonist through believable leads, people, places, operations, evidence, and consequences. Investigation and travel before confrontation are desirable. Do not rush the reveal or spawn the antagonist beside the player.',
        'If the player is away from the arc location, their current location may provide a brief believable lead toward it, but the substantive arc remains at or genuinely connected to the assigned arc location.',
        'Use the character’s supplied disposition when motivating involvement; do not assume altruism. If the player ignores the arc, do not nag them every turn.',
        'When the antagonist is resolved — defeated, captured, dismantled, permanently driven off, or the player concludes their business through a deal, truce, alliance, payment, or deliberate disengagement — emit [ARC COMPLETE] in that same response. Do not invent a hidden superior or deeper layer to keep the arc alive.'
      ].join('\\n') : '';

      dynamicTail = liveState + gptArc;
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
      // exactly three messages back inside the new stable-history slice.
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
        const role = m.role === 'assistant' ? 'assistant' : 'user';
        input.push({
          type: 'message',
          role,
          content: [{
            // Responses API assistant history accepts output_text/refusal, while
            // user/developer messages accept input_text. The breakpoint itself
            // works on either role-valid text content item.
            type: role === 'assistant' ? 'output_text' : 'input_text',
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
  console.log('GPT lean dynamic prompt already applied.');
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
  console.log('GPT prompt experiment applied: separate lean dynamic prompt; explicit-only layered cache enabled.');
}
