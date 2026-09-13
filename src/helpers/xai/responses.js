import { XAI_API_BASE, DEFAULT_GROK_MODEL, buildXaiHeaders } from './client.js';

export async function callGrokResponses({ apiKey, input, model = DEFAULT_GROK_MODEL, promptCacheKey, signal }) {
  const response = await fetch(`${XAI_API_BASE}/responses`, {
    method: 'POST',
    headers: buildXaiHeaders(apiKey),
    body: JSON.stringify({ model, input, prompt_cache_key: promptCacheKey }),
    signal,
  });

  if (!response.ok) throw new Error(`xAI request failed (${response.status})`);
  return response.json();
}
