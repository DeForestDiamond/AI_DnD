export const ANTHROPIC_HELPER_MODEL = 'claude-sonnet-4-5';

const headers = apiKey => ({
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
});

async function callAnthropic({ apiKey, maxTokens, system, messages }) {
  if (!apiKey) throw new Error('Anthropic API key required');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: headers(apiKey),
    body: JSON.stringify({ model: ANTHROPIC_HELPER_MODEL, max_tokens: maxTokens, system, messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return { text: data.content?.[0]?.text || '', usage: data.usage, rawData: data };
}

export async function callAnthropicArchive({ apiKey, entriesText }) {
  const system = `You are archiving a section of a D&D campaign log into a permanent frozen reference of 200-300 words. This is the ONLY record that will survive of these events, so what you keep matters more than how you say it. Facts only, no scene-setting or atmosphere.

ARCHIVE COMPRESSION RULE: Target 200-300 words and make this archive substantially smaller than the source summaries. Merge related resolved events and preserve durable outcomes rather than intermediate steps. INFORMATION EXPIRES WHEN IT RESOLVES, NOT WHEN IT GETS OLD: unresolved threads and unresolved members of finite sets must remain specific enough to resume correctly, even if that occasionally requires exceeding the target. Do not use that exception for resolved history, flavor, dialogue, combat detail, repeated explanations, or routine loot.

PRESERVE ABOVE ALL — these are what the story is built on:
- OBLIGATIONS IN BOTH DIRECTIONS: debts owed to the player and by the player, promises made, bargains struck, favours banked, contracts signed, terms agreed. Who owes what to whom, and for what. Never drop these.
- RELATIONSHIPS AND HOW THEY CHANGED: who became an ally, enemy, employee, lover, rival; who was betrayed, spared, recruited, crossed. Record the change, not just the state.
- CONSEQUENTIAL DECISIONS and what followed from them, including who witnessed them and who will remember.
- DEATHS, disappearances, and who was responsible.
- QUEST THREADS opened, advanced, closed or abandoned; FACTION standing changes.
- PERMANENT CHANGES to the player: powers gained, oaths taken, curses, transformations, property or titles acquired.

NAMED PEOPLE: on first mention of any named NPC, give their pronoun AND race — "Harren (he, human)", "Vashaera (she, tiefling)", "Kess (they, kenku)". This is how future entries keep them consistent; without it a human becomes a kenku three sessions later.

RECORD BRIEFLY: significant items — named, magical, or quest-relevant — and only those. Locations visited and where the player ended up.

DROP ENTIRELY: routine loot and coin (a purse of gold from a bandit, ordinary supplies — the app tracks money and inventory itself), scene descriptions, dialogue, atmosphere, combat blow-by-blow, investigation detail that led nowhere, conversation that changed nothing.

RETCON RULE: if any events were walked back or declared not to have happened, omit them entirely.

Plain text only. No headers. No bullet points. Past tense. Output only the archive text.`;
  return callAnthropic({ apiKey, maxTokens: 2000, system, messages: [{ role: 'user', content: `Archive these campaign log entries:\n\n${entriesText}` }] });
}

export async function callAnthropicStoryEntry({ apiKey, playerName, currentLocation, priorSummary, transcript, followingTranscript }) {
  const system = `You are a D&D session scribe writing an APPEND-ONLY story log. Write ONLY the new entry for recent events — do NOT rewrite or reference anything already in the log.

The user input has three labelled blocks. ONLY MESSAGES TO BE SUMMARIZED is target material. PRIOR SUMMARY FOR REFERENCE and EVENTS AFTER SUMMARY CHUNK are context only. Use them to understand continuity, identities, stakes, promises, wagers, unresolved threads, and cause/effect across chunk boundaries; never summarize their events as though they occurred in the target block.

LENGTH: Aim for roughly 400 words for a normal entry. Dense, multi-threaded chunks may use up to about 800 words. Do not pad simple events, but never delete continuity-critical detail merely to stay short. Completeness and future usability beat compression in the live summary layer.

PRESERVE CONCRETE STATE AND CAUSALITY. Keep where important people, vessels, objects, and groups physically are; why characters are present or acting; who asked, told, sent, hired, or paid whom to do something; and causal links between setup and later action. A mundane-seeming detail stays if removing it would make a later location, action, conversation, motivation, or consequence appear unexplained.

CORE CONTINUITY RULE — INFORMATION EXPIRES WHEN IT RESOLVES, NOT WHEN IT GETS OLD. Compression is subordinate to continuity. Never omit, merge, generalize, or tidy away unresolved state merely to reduce length. If the story establishes a finite/enumerated set — opponents and wagers, suspects and clues, trials and prizes, contract clauses, objectives, promised rewards, destinations, components, or similar — preserve EVERY unresolved member and its associated detail until individually resolved. Open threads must retain who/what/where and their latest known state. Once genuinely resolved, they may be compressed aggressively into the outcome. There is no fixed length target when unresolved state requires more space.

WRITE DOWN FIRST, always, if any occurred:
- OBLIGATIONS BOTH WAYS: what someone now owes the player, what the player owes someone, promises made, bargains struck, terms agreed, favours banked or called in. These outlive everything else in the log — never omit one.
- RELATIONSHIP CHANGES with named people: who warmed, cooled, allied, betrayed, was hired, was spared, was crossed. Record the CHANGE, not a description of the person.
- Decisions with consequences, and who saw them made.
- Deaths and who caused them; quest threads opened or closed; faction standing shifts.
- Permanent changes to the player: oaths, curses, powers, titles, property.

THEN, briefly: significant items only — named, magical or quest-relevant — and where the player ended up.

DO NOT RECORD: routine loot and coin. Finding a purse of gold in a hoard is noise; the app tracks money and inventory itself. Ordinary supplies, ammunition and common gear are likewise not story. Skip conversation that changed nothing, investigation that led nowhere, and combat blow-by-blow — the outcome is enough.

NAMED PEOPLE: on first reference in this entry, give pronoun AND race — Harren (he, human), Vashaera (she, tiefling), Kess (they, kenku). Future entries rely on this; without it a human turns into a kenku three sessions later. GROUND TRUTH (authoritative — never contradict): the player character is ${playerName}; their current location at the END of this section is ${currentLocation}. Refer to the player by that exact name, and treat that location as where they are now — do NOT infer the player's name or current location from place names mentioned in the log text. Begin the entry with the current location in brackets, e.g. [${currentLocation || 'Location'}]. Plain text only. No bullet points. No preamble. Just the new log entry.`;
  const user = `PRIOR SUMMARY FOR REFERENCE:\n${priorSummary || '(none — this is the first summary entry)'}\n\n---\nMESSAGES TO BE SUMMARIZED:\n${transcript}\n\n---\nEVENTS AFTER SUMMARY CHUNK:\n${followingTranscript || '(none available)'}\n\nWrite only the new story-log entry for MESSAGES TO BE SUMMARIZED.`;
  return callAnthropic({ apiKey, maxTokens: 800, system, messages: [{ role: 'user', content: user }] });
}
