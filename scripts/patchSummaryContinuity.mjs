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

const archiveDeveloper = `You are compressing older D&D story-log entries into a permanent frozen continuity record. This may become the only surviving record of these events.

CORE RULE — INFORMATION EXPIRES WHEN IT RESOLVES, NOT WHEN IT GETS OLD.
Compression is subordinate to continuity. Never omit, merge, generalize, or tidy away unresolved state to hit a length target. There is NO fixed word limit: resolved history should become compact; unresolved state must remain as detailed as necessary.

PRESERVE ABOVE ALL:
- EVERY OPEN THREAD with who/what/where and latest known state.
- ENUMERATED / FINITE SETS: preserve every unresolved member and its associated detail — participants and wagers, suspects and clues, trials and prizes, contract clauses, objectives, promised rewards, destinations, components, etc. A finite list stays intact until its members resolve individually.
- OBLIGATIONS both directions: debts, promises, bargains, favours, contracts, terms and wagers.
- Relationship changes and current outcomes.
- Consequential decisions and witnesses.
- Deaths/disappearances and responsibility.
- Quest threads opened, advanced, closed or abandoned; faction standing.
- Permanent player changes: powers, oaths, curses, transformations, titles, property.

RESOLUTION RULE:
Resolved material may be compressed hard into outcome-level history. Unresolved material must remain explicit enough that a future DM can resume it correctly without access to the original entries. Never discard a pending fact because it has not been mentioned recently.

Retain significant named/magical/quest-relevant items and important locations/end state. Routine coin/loot, ordinary supplies, scene descriptions, atmosphere, and settled combat detail can be dropped unless they remain part of an unresolved wager, promise, clue, quest, or commitment. Omit retconned events entirely.

On first mention of a named NPC, retain pronoun and race when established. Facts only. Past tense. Plain text only; no markdown or preamble.`;

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

fs.writeFileSync(historyPath, history);

// Claude remains available, so give its rolling summary and archive the same
// continuity principle. Insert before the existing preserve lists rather than
// rewriting the whole mature prompt.
const continuityBlock = `\nCORE CONTINUITY RULE — INFORMATION EXPIRES WHEN IT RESOLVES, NOT WHEN IT GETS OLD. Compression is subordinate to continuity. Never omit, merge, generalize, or tidy away unresolved state merely to reduce length. If the story establishes a finite/enumerated set — opponents and wagers, suspects and clues, trials and prizes, contract clauses, objectives, promised rewards, destinations, components, or similar — preserve EVERY unresolved member and its associated detail until individually resolved. Open threads must retain who/what/where and their latest known state. Once genuinely resolved, they may be compressed aggressively into the outcome. There is no fixed length target when unresolved state requires more space.\n`;

const archiveAnchor = `PRESERVE ABOVE ALL — these are what the story is built on:`;
if (!app.includes('CORE CONTINUITY RULE — INFORMATION EXPIRES WHEN IT RESOLVES') && app.includes(archiveAnchor)) {
  app = app.replace(archiveAnchor, `${continuityBlock}\n${archiveAnchor}`);
  changed = true;
}
const entryAnchor = `WRITE DOWN FIRST, always, if any occurred:`;
if (app.includes(entryAnchor) && (app.match(/CORE CONTINUITY RULE — INFORMATION EXPIRES WHEN IT RESOLVES/g) || []).length < 2) {
  app = app.replace(entryAnchor, `${continuityBlock}\n${entryAnchor}`);
  changed = true;
}

// Remove hard output-size language from the Claude archive/entry prompts; the API
// token ceiling remains a safety ceiling, not a compression target.
app = app.replace('into a permanent frozen reference of 200-300 words.', 'into a permanent frozen continuity reference.');
app = app.replace('Write 3-5 sentences.', 'Use as much compact text as continuity requires; simple linear events should stay short.');

fs.writeFileSync(appPath, app);
console.log(changed ? 'Summary continuity rules applied.' : 'Summary continuity rules already applied.');
