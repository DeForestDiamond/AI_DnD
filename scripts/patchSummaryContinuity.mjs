import fs from 'node:fs';

const historyPath = 'src/helpers/openai/history.js';
const appPath = 'src/App.jsx';
let history = fs.readFileSync(historyPath, 'utf8');
let app = fs.readFileSync(appPath, 'utf8');
let changed = false;

const storyDeveloper = `You are a D&D campaign state scribe writing an APPEND-ONLY story log. Write ONLY the new entry for the supplied recent events. Do not rewrite, recap, or reference older history.

CORE RULE — INFORMATION EXPIRES WHEN IT RESOLVES, NOT WHEN IT GETS OLD.
Compression is subordinate to continuity. The entry may be longer when the campaign contains more unresolved state. Never omit, merge, generalize, or tidy away an unresolved thread merely to save words.

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

GROUND TRUTH: player = PLAYER_NAME; END location = CURRENT_LOCATION. Never infer either from the transcript. Begin exactly with [CURRENT_LOCATION]. Plain text only; no markdown or preamble. Use compact prose or semicolon-separated state where useful. There is NO fixed sentence or word target.`;

const archiveDeveloper = `You are compressing FOUR already-written D&D story-log summaries into ONE permanent frozen archive entry. The four source summaries will be deleted after this succeeds. Your job is aggressive historical compression without breaking continuity.

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

// Replace the two OpenAI history prompts while preserving runtime player/location interpolation.
history = history.replace(/export async function callGptStoryEntry\([\s\S]*?\n  const developer = `([\s\S]*?)`;\n  return callText\(/, (m) => {
  changed = true;
  const fnHead = m.slice(0, m.indexOf('  const developer = `'));
  const runtime = storyDeveloper
    .replaceAll('PLAYER_NAME', "${playerName}")
    .replaceAll('CURRENT_LOCATION', "${currentLocation}");
  return `${fnHead}  const developer = \`${runtime}\`;\n  return callText(`;
});

history = history.replace(/export async function callGptArchive\([\s\S]*?\n  const developer = `([\s\S]*?)`;\n  return callText\(/, (m) => {
  changed = true;
  const fnHead = m.slice(0, m.indexOf('  const developer = `'));
  return `${fnHead}  const developer = \`${archiveDeveloper}\`;\n  return callText(`;
});

// Match Claude's archive ceiling. The archive is a compression product, not a
// second rolling summary, so it should not have enough room to casually echo all
// four source entries back nearly verbatim.
history = history.replace(
  /return callText\(\{ apiKey, developer, user: `ARCHIVE THESE ENTRIES:\\n\\n\$\{entriesText\}`, maxOutputTokens: \d+ \}\);/,
  'return callText({ apiKey, developer, user: `ARCHIVE THESE ENTRIES:\\n\\n${entriesText}`, maxOutputTokens: 800 });'
);

fs.writeFileSync(historyPath, history);

// Claude rolling summaries get the same continuity protection. Archives are
// intentionally different: they retain the mature 200-300 word compression
// target while allowing a narrow exception when unresolved state truly needs it.
const rollingContinuityBlock = `\nCORE CONTINUITY RULE — INFORMATION EXPIRES WHEN IT RESOLVES, NOT WHEN IT GETS OLD. Compression is subordinate to continuity. Never omit, merge, generalize, or tidy away unresolved state merely to reduce length. If the story establishes a finite/enumerated set — opponents and wagers, suspects and clues, trials and prizes, contract clauses, objectives, promised rewards, destinations, components, or similar — preserve EVERY unresolved member and its associated detail until individually resolved. Open threads must retain who/what/where and their latest known state. Once genuinely resolved, they may be compressed aggressively into the outcome. There is no fixed length target when unresolved state requires more space.\n`;

const archiveContinuityBlock = `\nARCHIVE COMPRESSION RULE: Target 200-300 words and make this archive substantially smaller than the source summaries. Merge related resolved events and preserve durable outcomes rather than intermediate steps. INFORMATION EXPIRES WHEN IT RESOLVES, NOT WHEN IT GETS OLD: unresolved threads and unresolved members of finite sets must remain specific enough to resume correctly, even if that occasionally requires exceeding the target. Do not use that exception for resolved history, flavor, dialogue, combat detail, repeated explanations, or routine loot.\n`;

const archiveAnchor = `PRESERVE ABOVE ALL — these are what the story is built on:`;
// Repair the earlier version of this patch if it already inserted the broad
// no-limit continuity block into the archive prompt.
app = app.replace(
  /\nCORE CONTINUITY RULE — INFORMATION EXPIRES WHEN IT RESOLVES[\s\S]*?There is no fixed length target when unresolved state requires more space\.\n\nPRESERVE ABOVE ALL — these are what the story is built on:/,
  `${archiveContinuityBlock}\n${archiveAnchor}`
);
if (!app.includes('ARCHIVE COMPRESSION RULE: Target 200-300 words') && app.includes(archiveAnchor)) {
  app = app.replace(archiveAnchor, `${archiveContinuityBlock}\n${archiveAnchor}`);
  changed = true;
}

const entryAnchor = `WRITE DOWN FIRST, always, if any occurred:`;
if (!app.includes('CORE CONTINUITY RULE — INFORMATION EXPIRES WHEN IT RESOLVES') && app.includes(entryAnchor)) {
  app = app.replace(entryAnchor, `${rollingContinuityBlock}\n${entryAnchor}`);
  changed = true;
} else if (app.includes(entryAnchor)) {
  // If the archive repair consumed the only occurrence, ensure the rolling entry
  // still receives its broader continuity rule.
  const entryPos = app.indexOf(entryAnchor);
  const beforeEntry = app.slice(Math.max(0, entryPos - 1800), entryPos);
  if (!beforeEntry.includes('CORE CONTINUITY RULE — INFORMATION EXPIRES WHEN IT RESOLVES')) {
    app = app.replace(entryAnchor, `${rollingContinuityBlock}\n${entryAnchor}`);
    changed = true;
  }
}

// Repair an earlier deployment of this patch that removed the mature archive
// size target. Rolling summaries remain flexible; archive compression does not.
app = app.replace('into a permanent frozen continuity reference.', 'into a permanent frozen reference of 200-300 words.');
app = app.replace('Write 3-5 sentences.', 'Use as much compact text as continuity requires; simple linear events should stay short.');

fs.writeFileSync(appPath, app);
console.log(changed ? 'Summary continuity rules applied; archives remain aggressively compressed.' : 'Summary continuity rules already applied; archives remain aggressively compressed.');
