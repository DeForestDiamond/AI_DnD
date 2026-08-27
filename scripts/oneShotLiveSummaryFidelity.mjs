import fs from 'node:fs';

const path = 'src/App.jsx';
let src = fs.readFileSync(path, 'utf8');

const oldHistory = `    const historyForSummary = toSummarize.map(m => ({\n      role: m.role === 'dm' ? 'assistant' : 'user',\n      content: m.text.substring(0, 600),\n    }));`;
const newHistory = `    // Live summaries are working memory: give the scribe the full target messages.\n    // Truncating each message destroyed exactly the location/motivation details the summary must preserve.\n    const historyForSummary = toSummarize.map(m => ({\n      role: m.role === 'dm' ? 'assistant' : 'user',\n      content: m.text,\n    }));\n    const followingForSummary = allMessages.slice(allMessages.length - KEEP_RECENT).map(m => ({\n      role: m.role === 'dm' ? 'assistant' : 'user',\n      content: m.text,\n    }));`;
if (!src.includes(oldHistory)) throw new Error('historyForSummary anchor not found');
src = src.replace(oldHistory, newHistory);

const oldGpt = `          transcript: gptTranscript,\n        });`;
const newGpt = `          priorSummary: storySummaryRef.current || '',\n          transcript: gptTranscript,\n          followingTranscript: followingForSummary.map(m => \`${'${m.role === \'assistant\' ? \'DM\' : \'PLAYER\'}'}: ${'${m.content}'}\`).join('\\n\\n'),\n        });`;
if (!src.includes(oldGpt)) throw new Error('GPT summary call anchor not found');
src = src.replace(oldGpt, newGpt);

if (!src.includes("          max_tokens: 800,")) throw new Error('Claude summary token anchor not found');
src = src.replace("          max_tokens: 800,", "          max_tokens: 2000,");

const oldSystemStart = `system: \`You are a D&D session scribe writing an APPEND-ONLY story log. Write ONLY the new entry for recent events — do NOT rewrite or reference anything already in the log. Use as much compact text as continuity requires; simple linear events should stay short.\n\n\nCORE CONTINUITY RULE`;
const newSystemStart = `system: \`You are a D&D session scribe writing an APPEND-ONLY story log. Write ONLY the new entry for recent events — do NOT rewrite or reference anything already in the log.\n\nThe user input has three labelled blocks. ONLY MESSAGES TO BE SUMMARIZED is target material. PRIOR SUMMARY FOR REFERENCE and EVENTS AFTER SUMMARY CHUNK are context only. Use them to understand continuity, identities, stakes, promises, wagers, unresolved threads, and cause/effect across chunk boundaries; never summarize their events as though they occurred in the target block.\n\nLENGTH: Aim for roughly 400 words for a normal entry. Dense, multi-threaded chunks may use up to about 800 words. Do not pad simple events, but never delete continuity-critical detail merely to stay short. Completeness and future usability beat compression in the live summary layer.\n\nPRESERVE CONCRETE STATE AND CAUSALITY. Keep where important people, vessels, objects, and groups physically are; why characters are present or acting; who asked, told, sent, hired, or paid whom to do something; and causal links between setup and later action. A mundane-seeming detail stays if removing it would make a later location, action, conversation, motivation, or consequence appear unexplained.\n\nCORE CONTINUITY RULE`;
if (!src.includes(oldSystemStart)) throw new Error('Claude system anchor not found');
src = src.replace(oldSystemStart, newSystemStart);

const oldMessages = `          messages: [\n            ...historyForSummary,\n            { role: 'user', content: 'Write only the new log entry now.' },\n          ],`;
const newMessages = `          messages: [\n            { role: 'user', content: \`PRIOR SUMMARY FOR REFERENCE:\\n${'${storySummaryRef.current || \'(none — this is the first summary entry)\'}'}\\n\\n---\\nMESSAGES TO BE SUMMARIZED:\\n${'${historyForSummary.map(m => `${m.role === \'assistant\' ? \'DM\' : \'PLAYER\'}: ${m.content}`).join(\'\\n\\n\')}'}\\n\\n---\\nEVENTS AFTER SUMMARY CHUNK:\\n${'${followingForSummary.length ? followingForSummary.map(m => `${m.role === \'assistant\' ? \'DM\' : \'PLAYER\'}: ${m.content}`).join(\'\\n\\n\') : \'(none available)\'}'}\\n\\nWrite only the new story-log entry for MESSAGES TO BE SUMMARIZED.\` },\n          ],`;
if (!src.includes(oldMessages)) throw new Error('Claude messages anchor not found');
src = src.replace(oldMessages, newMessages);

fs.writeFileSync(path, src);
console.log('Live summaries now receive full messages, boundary context, and 400-800 word breathing room.');
