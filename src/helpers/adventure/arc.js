const responseText = (data) => (data?.output || [])
  .filter(x => x?.type === 'message')
  .flatMap(x => x.content || [])
  .filter(x => x?.type === 'output_text')
  .map(x => x.text || '')
  .join('')
  .trim();

const buildPrompt = (antagonist, c) => {
  const dp = c.disposition || {};
  const dpLines = [
    dp.alignment && `Alignment: ${dp.alignment}`,
    dp.cares && `Cares about: ${dp.cares}`,
    dp.indifferent && `Indifferent to: ${dp.indifferent}`,
    dp.methods && `Solves problems by: ${dp.methods}`,
    dp.lines && `Will not: ${dp.lines}`,
  ].filter(Boolean).join('\n');

  const system = `You set up a Dungeons & Dragons story arc. You produce exactly two things: the arc's GOAL, and the FIRST objective toward it. Later objectives are written during play in response to what actually happens — do not plan them.

GOAL: one sentence naming what finishing this arc means. It must arise from THIS antagonist specifically — what it is doing, what it wants, and what actually stops it. A goal that could be pasted onto any other antagonist is wrong.
  MOST GOALS HAVE NO COUNT. Only include a number when the antagonist's own nature supplies one — twelve sealed vaults, a coven of three hags, four bridges into the city. Do NOT invent a count to make the goal look measurable: "seize four trade routes" or "reclaim seven revenue nodes" bolted onto a dragon or a mind flayer cell is exactly the failure to avoid. If the arc ends in one confrontation, one discovery, or one thing destroyed, say that plainly.
  Good, no count: "Find out what is emptying the minds of the dock district and put a stop to it." "Kill the thing in the deep mine before it finishes waking." "Break whatever hold has been taken over the city watch."
  Good, count justified by the antagonist: "Destroy all three of the coven's hags — killing fewer only makes the survivors stronger."
  The goal may reference the antagonist obliquely but must NOT name them — they are hidden from the player.

FIRST OBJECTIVE: one sentence, concrete and checkable, something the player can act on immediately from where they are now. Not vague ("learn about the cult"), not the whole arc in one line.

SHAPE BOTH TO THIS CHARACTER. They must be things THIS person would pursue for their own reasons. Do not assume heroism; do not build a rescue-the-innocent plot for someone indifferent to innocents. If they care about profit and power, the goal is about profit and power — the antagonist becomes their problem because of what it costs them.

Respond with ONLY valid JSON, no prose, no markdown fences: { "goal": "...", "objective": "..." }`;

  const user = `HIDDEN ANTAGONIST: ${antagonist}\n\nPLAYER: ${c.name}, level ${c.level}${c.cls?.name ? `, ${c.cls.name}` : ''}. Currently in ${c.currentLocation || 'the Sword Coast'}.\n${dpLines ? `\nWHO THEY ARE:\n${dpLines}\n` : ''}${c.bio ? `\nBACKGROUND: ${c.bio.slice(0, 600)}\n` : ''}\nRespond with ONLY the JSON now.`;
  return { system, user };
};

const parseArc = (raw, cut = false) => {
  const text = String(raw || '').replace(/```json|```/g, '').trim();
  let parsed;
  try { parsed = JSON.parse(text); } catch {
    throw new Error(cut || !/[}\]]\s*$/.test(text)
      ? 'The reply was cut off — try again'
      : 'Arc generation returned unreadable JSON — try again');
  }
  const goal = String(parsed.goal || '').trim();
  const first = String(parsed.objective || '').trim();
  if (!goal && !first) throw new Error('Nothing generated — try again');
  return { goal, objectives: first ? [{ text: first, done: false }] : [] };
};

export async function generateAdventureArc({ antagonist, character, modelConfig, anthropicApiKey, openAiApiKey, xAiApiKey }) {
  if (!antagonist) throw new Error('No antagonist to build a campaign around');
  if (!character) throw new Error('No character available for arc generation');
  const config = modelConfig || {};
  const provider = config.provider || 'anthropic';
  const { system, user } = buildPrompt(antagonist, character);

  if (provider === 'xai') {
    const key = xAiApiKey || import.meta.env.VITE_XAI_KEY;
    if (!key) throw new Error('xAI API key is missing');
    const res = await fetch('https://api.x.ai/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: config.model,
        reasoning: { effort: config.reasoning_effort || 'low' },
        max_output_tokens: 1400,
        input: [
          { role: 'developer', content: [{ type: 'input_text', text: system }] },
          { role: 'user', content: [{ type: 'input_text', text: user }] },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `xAI API error ${res.status}`);
    const result = parseArc(responseText(data), data.status === 'incomplete');
    return { ...result, usage: data.usage, rawData: data };
  }

  if (provider === 'openai') {
    const key = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
    if (!key) throw new Error('OpenAI API key is missing');
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: config.model,
        reasoning: { effort: config.reasoning_effort || 'low' },
        max_output_tokens: 1400,
        input: [
          { role: 'developer', content: [{ type: 'input_text', text: system }] },
          { role: 'user', content: [{ type: 'input_text', text: user }] },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `OpenAI API error ${res.status}`);
    const result = parseArc(responseText(data), data.status === 'incomplete');
    return { ...result, usage: data.usage, rawData: data };
  }

  const key = anthropicApiKey || import.meta.env.VITE_ANTHROPIC_KEY;
  if (!key) throw new Error('Anthropic API key is missing');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 700,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const result = parseArc(data.content?.[0]?.text || '', data.stop_reason === 'max_tokens');
  return { ...result, usage: data.usage, rawData: data };
}
