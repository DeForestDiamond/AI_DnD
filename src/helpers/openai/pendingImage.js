// Image transport for GPT models.
//
// One-turn screenshots are kept only in memory and are consumed by the next
// OpenAI Responses request. A campaign map is different: it is intentionally
// reused on every OpenAI turn and is inserted before conversation history so
// OpenAI's prefix cache can reuse the same visual context instead of re-reading
// the map as fresh input every time.
//
// Neither image type is written into campaign history, summaries, autosaves, or
// prompt logs as a giant base64 string.

let pendingImage = null;
let persistentMap = null;
let persistentMapLoaded = false;
let interceptorInstalled = false;
let originalFetch = null;

const MAX_AGE_MS = 5 * 60 * 1000;
const MAP_STORAGE_KEY = 'ai-dnd-persistent-campaign-map-v1';
// sessionStorage is commonly ~5 MB. Leave headroom for the rest of the app;
// larger maps still work for the current page session, they just won't survive
// a reload of that tab.
const MAX_STORED_DATA_URL_CHARS = 3_500_000;

export const setPendingOpenAiImage = ({ dataUrl, name = 'screenshot' }) => {
  pendingImage = dataUrl ? { dataUrl, name, createdAt: Date.now() } : null;
};

export const clearPendingOpenAiImage = () => {
  pendingImage = null;
};

export const hasPendingOpenAiImage = () => Boolean(
  pendingImage && (Date.now() - pendingImage.createdAt) < MAX_AGE_MS
);

const loadPersistentMap = () => {
  if (persistentMapLoaded) return persistentMap;
  persistentMapLoaded = true;
  if (typeof window === 'undefined') return persistentMap;
  try {
    const raw = window.sessionStorage?.getItem(MAP_STORAGE_KEY);
    if (!raw) return persistentMap;
    const parsed = JSON.parse(raw);
    if (parsed?.dataUrl) {
      persistentMap = { dataUrl: parsed.dataUrl, name: parsed.name || 'campaign map' };
    }
  } catch (err) {
    console.warn('[MAP] Could not restore persistent campaign map:', err);
  }
  return persistentMap;
};

export const setPersistentOpenAiMap = ({ dataUrl, name = 'campaign map' }) => {
  persistentMapLoaded = true;
  persistentMap = dataUrl ? { dataUrl, name } : null;

  if (typeof window === 'undefined') return;
  try {
    if (!persistentMap) {
      window.sessionStorage?.removeItem(MAP_STORAGE_KEY);
    } else if (dataUrl.length <= MAX_STORED_DATA_URL_CHARS) {
      window.sessionStorage?.setItem(MAP_STORAGE_KEY, JSON.stringify(persistentMap));
    } else {
      // Keep the large map in memory for the current page, but do not risk
      // exhausting browser storage and breaking unrelated save data.
      window.sessionStorage?.removeItem(MAP_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[MAP] Campaign map is active in memory but could not be cached in browser storage:', err);
  }
};

export const clearPersistentOpenAiMap = () => {
  persistentMapLoaded = true;
  persistentMap = null;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.removeItem(MAP_STORAGE_KEY);
  } catch (err) {
    console.warn('[MAP] Could not clear stored campaign map:', err);
  }
};

export const getPersistentOpenAiMap = () => loadPersistentMap();
export const hasPersistentOpenAiMap = () => Boolean(loadPersistentMap()?.dataUrl);

const isResponsesRequest = (input) => {
  const url = typeof input === 'string' ? input : input?.url;
  return typeof url === 'string' && url.includes('api.openai.com/v1/responses');
};

const injectTurnImage = (body, image) => {
  if (!body || !Array.isArray(body.input) || !image?.dataUrl) return body;

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

const injectPersistentMap = (body, map) => {
  if (!body || !Array.isArray(body.input) || !map?.dataUrl) return body;

  // Keep the map immediately after the developer message and before changing
  // conversation history. That makes developer + map a stable repeated prefix.
  // The explicit breakpoint at the end of the map block lets subsequent turns
  // reuse that prefix from OpenAI's prompt cache.
  const developerIdx = body.input.findIndex(item => item?.type === 'message' && item?.role === 'developer');
  const insertAt = developerIdx >= 0 ? developerIdx + 1 : 0;

  const mapMessage = {
    type: 'message',
    role: 'user',
    content: [
      {
        type: 'input_text',
        text: `[PERSISTENT CAMPAIGN MAP: ${map.name || 'map'}]\nThis map is authoritative visual reference for visible geography, roads, routes, labels, settlements, borders, and relative positions. Inspect it directly whenever those facts matter. If remembered geography conflicts with the map or the player's explicit route description, use the supplied map/player description. Do not invent a contradictory route merely from memory.`,
      },
      {
        type: 'input_image',
        image_url: map.dataUrl,
        detail: 'high',
      },
      {
        type: 'input_text',
        text: '[END PERSISTENT CAMPAIGN MAP]',
        prompt_cache_breakpoint: { mode: 'explicit' },
      },
    ],
  };

  body.input.splice(insertAt, 0, mapMessage);
  return body;
};

export const installOpenAiImageInterceptor = () => {
  if (interceptorInstalled || typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  interceptorInstalled = true;
  originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    if (!isResponsesRequest(input) || typeof init?.body !== 'string') {
      // Expired one-turn images should never surprise the player on a later turn.
      if (pendingImage && !hasPendingOpenAiImage()) pendingImage = null;
      return originalFetch(input, init);
    }

    const map = loadPersistentMap();
    const hasTurnImage = hasPendingOpenAiImage();
    if (!map && !hasTurnImage) return originalFetch(input, init);

    // Consume only the one-turn image before sending so a roll-follow-up request
    // cannot attach it twice. The persistent map deliberately remains active and
    // is included in follow-ups as the same cacheable prefix.
    const image = hasTurnImage ? pendingImage : null;
    if (image) pendingImage = null;

    try {
      const parsed = JSON.parse(init.body);
      if (map) injectPersistentMap(parsed, map);
      if (image) injectTurnImage(parsed, image);
      return originalFetch(input, { ...init, body: JSON.stringify(parsed) });
    } catch (err) {
      console.warn('[IMAGE] Could not inject visual reference into OpenAI request:', err);
      return originalFetch(input, init);
    }
  };
};
