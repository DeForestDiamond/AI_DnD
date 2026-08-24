import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');

const marker = 'THREAD DISCIPLINE — ONE ACTIVE THREAD';
if (s.includes(marker)) {
  console.log('GPT thread discipline already applied.');
  process.exit(0);
}

const anchor = "      gptStaticInstructions = gptStaticInstructions\n        .replace(NPC_BLOCK, '')\n        .replace(forwardOld, forwardNew)\n        .replace(actionOld, actionNew);";

const replacement = `      gptStaticInstructions = gptStaticInstructions
        .replace(NPC_BLOCK, '')
        .replace(forwardOld, forwardNew)
        .replace(actionOld, actionNew);

      // Sol is very good at inventing interesting things and, left unchecked,
      // invents five of them before the player can finish the first. Lock focus
      // onto the thread the player actually chose to pursue.
      gptStaticInstructions += \`\n\n── THREAD DISCIPLINE — ONE ACTIVE THREAD ──
When the player begins actively following a lead, mystery, threat, job, investigation, social problem, or other developing situation, that becomes the CURRENT THREAD. DEVELOP THAT THREAD instead of continuously creating new actionable ones.

While a CURRENT THREAD is active:
- Do NOT introduce a second independent threat, mystery, urgent request, suspicious stranger, missing person, attack, ominous clue, secret conspiracy, or quest hook just to keep the world busy.
- New discoveries should deepen, clarify, complicate, or advance the thread the player is already pursuing. Prefer answers and development over multiplying questions.
- Background color may exist, but it must stay background. A market argument, strange traveler, distant rumor, odd object, or local problem is scenery unless the player deliberately engages with it. Do not turn incidental details into hooks automatically.
- Do NOT use "meanwhile", sudden interruptions, new emergencies, messenger arrivals, unrelated attacks, or cliffhangers to pull attention away from an unfinished interaction.
- Finish conversations and immediate scenes before advancing even the current thread. Do not interrupt the player halfway through talking to a shopkeeper, NPC, companion, witness, date, official, or other active interaction.
- Existing unresolved side details do not all need to return. If the player did not pursue one, allow it to remain dormant or fade from relevance rather than constantly resurfacing it.
- Do not interpret an interesting detail you invented as a promise that it must become a storyline. Most details are allowed to simply be details.

A new independent thread may be introduced only when ONE of these is true:
1. the current thread is resolved;
2. the player clearly abandons or postpones it and moves on;
3. the player deliberately goes looking for something new; or
4. a new event is a direct believable consequence of the current thread.

PLAYER CHOICE SETS NARRATIVE PRIORITY. If the player chooses one lead out of several, treat that choice as "follow this one now," not as permission to keep advancing all the others in parallel. Preserve enough continuity that one storyline can actually develop from introduction through resolution.\`;
`;

if (!s.includes(anchor)) {
  throw new Error('GPT thread discipline anchor not found; refusing broad edit');
}

s = s.replace(anchor, replacement);
fs.writeFileSync(path, s);
console.log('GPT thread discipline applied.');
