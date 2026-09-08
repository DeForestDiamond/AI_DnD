// Turn-scoped image transport for GPT models.
//
// Player screenshots should never be written into campaign history, summaries,
// autosaves, or prompt-cache logs as giant base64 strings. InputBar stores the
// selected image here in memory; this helper injects it into the next OpenAI
// Responses API request and immediately consumes it.

let pendingImage = null;
let interceptorInstalled = false;
let originalFetch = null;

const MAX_AGE_MS = 5 * 60 * 1000;

export const setPendingOpenAiImage = ({ dataUrl, name = 'screenshot' }) => {
  pendingImage = dataUrl ? { dataUrl, name, createdAt: Date.now() } : null;
};

export const clearPendingOpenAiImage = () => {
  pendingImage = null;
};

export const hasPendingOpenAiImage = () => Boolean(
  pendingImage && (Date.now() - pendingImage.createdAt) < MAX_AGE_MS
);

const isResponsesRequest = (input) => {
  const url = typeof input === 'string' ? input : input?.url;
  return typeof url === 'string' && url.includes('api.openai.com/v1/responses');
};

const injectImage = (body, image) => {
  if (!body || !Array.isArray(body.input)) return body;

  // Find the final user message — this is the player's current turn after
  // useGame has already appended all normal text and volatile game state.
  let target = null;
  for (let i = body.input.length - 1; i >= 0; i -= 1) {
    const item = body.input[i];
    if (item?.type === 'message' && item?.role === 'user') {
      target = item;
      break;
    }
  }
  if (!target) return body;

  const existing = Array.isArray(target.content)
    ? target.content
    : [{ type: 'input_text', text: String(target.content || '') }];

  target.content = [
    ...existing,
    {
      type: 'input_text',
      text: '\n\n[PLAYER-SUPPLIED VISUAL REFERENCE — IMPORTANT: Inspect the attached image directly. For visible geography, roads, labels, routes, room layouts, symbols, diagrams, or other concrete visual facts, treat the supplied image and the player\'s explicit description as authoritative over assumptions from memory. Do not argue with the player based on remembered geography when the supplied visual evidence shows otherwise.]',
    },
    {
      type: 'input_image',
      image_url: image.dataUrl,
      detail: 'high',
    },
  ];

  return body;
};

export const installOpenAiImageInterceptor = () => {
  if (interceptorInstalled || typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  interceptorInstalled = true;
  originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    if (!isResponsesRequest(input) || !hasPendingOpenAiImage() || typeof init?.body !== 'string') {
      // Expired images should never surprise the player on a later turn.
      if (pendingImage && !hasPendingOpenAiImage()) pendingImage = null;
      return originalFetch(input, init);
    }

    const image = pendingImage;
    // Consume before sending so a roll-follow-up request cannot attach the same
    // screenshot twice, and a failed network request cannot leak it to next turn.
    pendingImage = null;

    try {
      const parsed = JSON.parse(init.body);
      const patched = injectImage(parsed, image);
      return originalFetch(input, { ...init, body: JSON.stringify(patched) });
    } catch (err) {
      console.warn('[IMAGE] Could not inject screenshot into OpenAI request:', err);
      return originalFetch(input, init);
    }
  };
};
