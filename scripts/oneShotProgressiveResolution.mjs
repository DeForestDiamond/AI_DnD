import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let src = fs.readFileSync(path, 'utf8');

const rule = `\n\n── PROGRESSIVE RESOLUTION — DO NOT STALL ──\nDo not repeat the same obstacle, clue pattern, travel beat, or investigation structure indefinitely. Each recurrence must materially narrow the problem, escalate the situation, reveal something genuinely new, or produce a confrontation. After a few meaningful steps, unresolved objectives MUST move toward payoff rather than generating another equivalent delay.\n\nSEARCHES, HUNTS & PURSUITS: For searches, hunts, chases, missing-person investigations, and similar pursuit arcs, NEVER create an endless chain of “they were here, then went to X.” After roughly 2–4 substantive leads, the trail should converge on the target, the target's captor or location, a decisive obstacle, or a major revelation that fundamentally changes the objective. Do not treat the player's continued pursuit as permission to extend the chain.\n\nANTI-STALL: If the player has correctly pursued the same goal through several scenes and nothing fundamentally new is being learned, resolve or transform the situation. Repetition is not difficulty.`;

// Shared Sonnet/Haiku prompt: insert into FORWARD MOTION so Claude gets the rule.
const sharedAnchor = `── FORWARD MOTION ──\nAction tempo:`;
if (!src.includes(sharedAnchor)) throw new Error('shared forward-motion anchor not found');
src = src.replace(sharedAnchor, `── FORWARD MOTION ──${rule}\n\nAction tempo:`);

// GPT prompt: append to the existing GPT thread-discipline block so Sol/Terra get it directly.
const gptAnchor = `PLAYER CHOICE SETS NARRATIVE PRIORITY. If the player chooses one lead out of several, treat that choice as "follow this one now," not as permission to keep advancing all the others in parallel. Preserve enough continuity that one storyline can actually develop from introduction through resolution.`;
if (!src.includes(gptAnchor)) throw new Error('GPT thread-discipline anchor not found');
src = src.replace(gptAnchor, `${gptAnchor}${rule}`);

fs.writeFileSync(path, src);
console.log('Progressive resolution / anti-stall rules added to Claude and GPT DM prompts.');
