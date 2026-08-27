// GPT-specific rolling story-log and archive compression helpers.
// Summary storage/cadence remain shared in App.jsx.

export const GPT_HISTORY_MODEL = 'gpt-5.6-sol';

const responseText = (data) => (data?.output || []).filter(x => x?.type === 'message').flatMap(x => x.content || []).filter(x => x?.type === 'output_text').map(x => x.text || '').join('').trim();

async function callText({ apiKey, model = GPT_HISTORY_MODEL, developer, user, maxOutputTokens }) {
  if (!apiKey) throw new Error('OpenAI API key required for GPT history helper');
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      reasoning: { effort: 'low' },
      max_output_tokens: maxOutputTokens,
      input: [
        { role: 'developer', content: [{ type: 'input_text', text: developer }] },
        { role: 'user', content: [{ type: 'input_text', text: user }] },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI API error ${res.status}`);
  if (data.status === 'incomplete') throw new Error(`GPT history reply incomplete${data.incomplete_details?.reason ? `: ${data.incomplete_details.reason}` : ''}`);
  const text = responseText(data);
  if (!text) throw new Error('GPT history helper returned no text');
  return { text, usage: data.usage, rawData: data };
}

export async function callGptStoryEntry({ apiKey, model = GPT_HISTORY_MODEL, playerName, currentLocation, priorSummary = '', transcript, followingTranscript = '' }) {
  const developer = `You are a D&D campaign state scribe writing an APPEND-ONLY story log. Write ONLY the new entry for the supplied recent events. Do not rewrite, recap, or reference older history.

The user input is divided into three explicitly labelled blocks. ONLY "MESSAGES TO BE SUMMARIZED" is the target material. "PRIOR SUMMARY FOR REFERENCE" and "EVENTS AFTER SUMMARY CHUNK" are CONTEXT ONLY: use them to understand continuity, identities, stakes, promises, wagers, unresolved threads, and cause/effect across the chunk boundaries. Do not summarize events from either context block as though they occurred inside the target block. If context is necessary to understand an event in the target block, preserve the relationship or consequence without inventing or importing outside events.

LENGTH: Aim for roughly 400 words for a normal summary entry. Dense, multi-threaded chunks may use up to about 800 words. Do not pad simple events to reach 400 words, but NEVER delete continuity-critical detail merely to stay short. Completeness and future usability beat compression inside the live summary layer.

CORE RULE — INFORMATION EXPIRES WHEN IT RESOLVES, NOT WHEN IT GETS OLD.
Compression is subordinate to continuity. The entry may be longer when the campaign contains more unresolved state. Never omit, merge, generalize, or tidy away an unresolved thread merely to save words.

PRESERVE CONCRETE STATE AND CAUSALITY. Keep where important people, vessels, objects, and groups physically are; why characters are present or acting; who asked, told, sent, hired, or paid whom to do something; and the causal link between setup and later action. A detail that seems mundane must remain when removing it would make a later location, action, conversation, motivation, or consequence appear unexplained. Do not turn "the spelljammer remained off the coast" into "the spelljammer was in the city," and do not preserve an NPC's presence while deleting the reason they were sent there.

PRESERVE FIRST whenever present:
- OPEN THREADS: every unresolved task, danger, mystery, promise, meeting, lead, negotiation, contest, planned action, expected arrival, pending consequence, or unfinished interaction. Preserve who/what/where and the latest known state separately for each thread.
- ENUMERATED / FINITE SETS: if the story establishes a list of participants, opponents, wagers, prizes, suspects, clues, trials, contract clauses, destinations, ingredients, objectives, promised rewards, or similar elements, preserve EVERY unresolved member and its associated detail until that member is individually resolved. Do not collapse twelve opponents into "a tournament" while any matches remain.
- OBLIGATIONS BOTH WAYS: debts, promises, bargains, contracts, favours, terms, wagers and who owes/gives what to whom.
- RELATIONSHIP CHANGES with named people.
- CONSEQUENTIAL DECISIONS and who witnessed them.
- DEATHS/disappearances and responsibility.
- QUEST THREADS opened, advanced, closed or abandoned; faction standing changes.
- PERMANENT player changes: powers, oaths, curses, transformations, titles, property.

RESOLUTION RULE:
Once a thread or member of an enumerated set is genuinely finished, it may be compressed aggressively into the outcome. Until then, preserve enough specific detail for a future DM to continue it correctly without the raw messages.

Then briefly preserve significant named/magical/quest-relevant items and where the player ended up. Routine coin/loot and ordinary supplies may be omitted unless they are themselves a wager, promise, clue, quest object, or unresolved commitment.

Do not preserve combat blow-by-blow once its outcome is settled. Do preserve pending combat structure: remaining opponents, their identities, stakes/wagers, special conditions, and anything still unresolved.

On first reference to a named NPC in this entry, include pronoun and race when established. Never invent either when unknown.

GROUND TRUTH: player = ${playerName}; END location = ${currentLocation}. Never infer either from the transcript. Begin exactly with [${currentLocation}]. Plain text only; no markdown or preamble. Use compact prose or semicolon-separated state where useful.`;
  const user = `PRIOR SUMMARY FOR REFERENCE:\n${priorSummary || '(none — this is the first summary entry)'}\n\n---\nMESSAGES TO BE SUMMARIZED:\n${transcript}\n\n---\nEVENTS AFTER SUMMARY CHUNK:\n${followingTranscript || '(none available)'}\n\nWrite only the new story-log entry for MESSAGES TO BE SUMMARIZED.`;
  return callText({ apiKey, model, developer, user, maxOutputTokens: 2000 });
}

export async function callGptArchive({ apiKey, model = GPT_HISTORY_MODEL, entriesText }) {
  const developer = `You are compressing FOUR already-written D&D story-log summaries into ONE permanent frozen archive entry. The four source summaries will be deleted after this succeeds. Your job is aggressive historical compression without breaking continuity.

TARGET: about 200-300 words. The finished archive should be substantially smaller than the four source summaries combined. Do not preserve four mini-summaries or retell events session by session. Merge related resolved events and record outcomes once.

INFORMATION EXPIRES WHEN IT RESOLVES, NOT WHEN IT GETS OLD.
- RESOLVED HISTORY: compress hard. Keep the durable outcome, not the path taken to reach it.
- UNRESOLVED STATE: preserve specifically enough for a future DM to continue it correctly. If genuinely necessary, continuity may exceed the target rather than deleting active state.
- ENUMERATED / FINITE SETS: preserve every still-unresolved member and its associated detail — opponents and wagers, suspects and clues, trials and prizes, contract clauses, objectives, promised rewards, destinations, components, etc. Resolved members may collapse into outcome-level history.

PRESERVE ABOVE ALL:
- unresolved tasks, dangers, mysteries, meetings, leads, negotiations, contests, planned actions, expected arrivals and pending consequences;
- obligations both directions: debts, promises, bargains, favours, contracts, terms and wagers;
- relationship changes and the resulting current relationship state;
- consequential decisions whose effects still matter;
- deaths/disappearances and responsibility when consequential;
- quest threads opened, advanced, closed or abandoned; faction standing changes;
- permanent player changes: powers, oaths, curses, transformations, titles and property;
- significant named/magical/quest-relevant items only when their continued existence or ownership matters;
- important locations only when needed for continuity.

DROP ENTIRELY once resolved or nonessential: scene descriptions, atmosphere, dialogue, jokes, combat blow-by-blow, travel detail, routine loot/coin, ordinary supplies, repeated explanations, redundant descriptions, dead-end investigation, and intermediate steps whose outcome is already recorded. Omit retconned events entirely.

Do not repeat the same fact in multiple phrasings. Do not add interpretation or new facts. On first mention of a named NPC, retain pronoun and race only when established by the source. Facts only. Past tense. Plain text only; no headings, bullets, preamble, or markdown.`;
  return callText({ apiKey, model, developer, user: `ARCHIVE THESE ENTRIES:\n\n${entriesText}`, maxOutputTokens: 1600 });
}
