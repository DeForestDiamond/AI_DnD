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

export async function callGptStoryEntry({ apiKey, model = GPT_HISTORY_MODEL, playerName, currentLocation, transcript }) {
  const developer = `You are a D&D session scribe writing an APPEND-ONLY story log. Write ONLY the new entry for the supplied recent events. Do not rewrite, recap, or reference older history. Write 3-5 compact sentences.\n\nPRESERVE FIRST whenever present:\n- obligations in both directions: debts, promises, bargains, contracts, favours, terms and who owes what;\n- relationship CHANGES with named people;\n- consequential decisions and who witnessed them;\n- deaths/disappearances and responsibility;\n- quest threads opened, advanced, closed, or abandoned; faction standing changes;\n- permanent player changes: powers, oaths, curses, transformations, titles, property.\n\nTHEN briefly preserve named/magical/quest-relevant items and where the player ended up.\n\nDROP routine coin/loot, ordinary supplies, combat blow-by-blow, dead-end investigation, unchanged conversation, scene-setting, and atmosphere. The app tracks inventory and money. Omit retconned events entirely.\n\nOn first reference to a named NPC in this entry, include pronoun and race when established: Harren (he, human). Never invent race/pronoun if unknown.\n\nGROUND TRUTH: player = ${playerName}; END location = ${currentLocation}. Never infer either from the transcript. Begin exactly with [${currentLocation}]. Plain text only; no bullets, headings, preamble, or markdown.`;
  return callText({ apiKey, model, developer, user: `RECENT TRANSCRIPT:\n${transcript}\n\nWrite only the new story-log entry.`, maxOutputTokens: 1200 });
}

export async function callGptArchive({ apiKey, model = GPT_HISTORY_MODEL, entriesText }) {
  const developer = `You are archiving old D&D story-log entries into a permanent frozen reference. Produce about 200-300 words. This will become the only surviving record of these events, so factual continuity matters more than prose.\n\nPRESERVE ABOVE ALL:\n- obligations both directions: debts, promises, bargains, favours, contracts and terms;\n- relationship changes and current relationship outcomes;\n- consequential decisions and witnesses;\n- deaths/disappearances and responsibility;\n- quest threads opened, advanced, closed, abandoned; faction standing;\n- permanent player changes: powers, oaths, curses, transformations, titles, property.\n\nAlso retain significant named/magical/quest-relevant items and important locations/end state. On first mention of a named NPC, retain pronoun and race when the source establishes them.\n\nDROP routine coin/loot, ordinary supplies, scene descriptions, dialogue, atmosphere, combat blow-by-blow, dead-end investigation, and unchanged conversation. Omit any retconned events entirely.\n\nFacts only. Past tense. Plain text only; no headings, bullets, preamble, or markdown.`;
  return callText({ apiKey, model, developer, user: `ARCHIVE THESE ENTRIES:\n\n${entriesText}`, maxOutputTokens: 1600 });
}
