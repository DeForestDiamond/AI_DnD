// Installed below the image interceptors, so capture sees the final wire body.
// Only DM requests opt in. Headers/credentials are never recorded.
export const DM_CAPTURE_KEY = '__aiDndCapture';
let nextId = 0;

export function summarizeDMRequest(body, hints = {}) {
  const sections = [];
  let images = 0;
  const add = (label, text) => {
    if (text) sections.push({ label, characters:text.length, estimatedTextTokens:Math.ceil(text.length / 4) });
  };
  const textPart = (text, fallback) => {
    const known = Object.entries(hints).find(([, value]) => value && value === text);
    if (known) { add(known[0], text); return; }
    const dynamic = hints['Current state'];
    if (dynamic && text.endsWith(dynamic)) {
      add(fallback, text.slice(0, -dynamic.length));
      add('Current state', dynamic);
    } else add(fallback, text);
  };
  const content = (value, label) => {
    if (typeof value === 'string') { textPart(value, label); return; }
    for (const part of value || []) {
      if (typeof part?.text === 'string') textPart(part.text, label);
      else if (part?.type === 'input_image' || part?.type === 'image') images += 1;
    }
  };
  content(body.system, 'System instructions');
  const messages = body.input || body.messages || [];
  messages.forEach((m, i) => content(m.content, m.role === 'developer' ? 'Location / NPCs / towns' : `Message ${i + 1} (${m.role})`));
  const characters = sections.reduce((n, s) => n + s.characters, 0);
  return { sections, characters, estimatedTextTokens:Math.ceil(characters / 4), images,
    estimateNote:'Text estimates use characters ÷ 4, not a model tokenizer. Images and protocol overhead are excluded; provider-reported input tokens are authoritative.' };
}

export function capturedInputTokens(record) {
  const u = record?.usage;
  if (!u) return null;
  return (u.input_tokens || 0) + (record.provider === 'anthropic'
    ? (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) : 0);
}

export function createDMCaptureFetch(fetchImpl) {
  return async (input, init = {}) => {
    const metadata = init[DM_CAPTURE_KEY];
    if (!metadata) return fetchImpl(input, init);
    const { [DM_CAPTURE_KEY]: _capture, ...wireInit } = init;
    let body;
    try { body = JSON.parse(wireInit.body); } catch { return fetchImpl(input, wireInit); }
    const endpoint = typeof input === 'string' ? input : input.url;
    const record = { id:++nextId, at:new Date().toISOString(), provider:metadata.provider,
      model:body.model, endpoint, status:'sending', body:wireInit.body,
      breakdown:summarizeDMRequest(body, metadata.hints) };
    const report = update => { try { metadata.onCapture?.({ ...record, ...update }); } catch { /* Diagnostics must not break gameplay. */ } };
    report({});
    try {
      const response = await fetchImpl(input, wireInit);
      report({ status:response.ok ? 'received' : 'failed', httpStatus:response.status });
      // A clone leaves the response stream intact for the ordinary API handler.
      if (response.clone) response.clone().json().then(data => report({
        status:response.ok ? 'received' : 'failed', httpStatus:response.status, usage:data.usage || null,
      })).catch(() => {});
      return response;
    } catch (error) {
      report({ status:error?.name === 'AbortError' ? 'aborted' : 'failed' });
      throw error;
    }
  };
}

let installed = false;
export function installDMCaptureInterceptor() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.fetch = createDMCaptureFetch(window.fetch.bind(window));
}

export function exportDMRequest(record) {
  return { ...record, body:JSON.parse(record.body) };
}

export function formatDMRequest(record) {
  const actual = capturedInputTokens(record);
  return [
    `DM REQUEST — ${record.at}`, `${record.provider} / ${record.model} / ${record.status}`,
    `Provider input tokens: ${actual == null ? 'not reported' : actual}`,
    `Text characters: ${record.breakdown.characters}; images: ${record.breakdown.images}`,
    record.breakdown.estimateNote, '', 'SECTION SIZES:',
    ...record.breakdown.sections.map(s=>`${s.label}: ${s.characters} characters (~${s.estimatedTextTokens} text tokens)`),
    '', 'COMPLETE OUTGOING JSON BODY:', JSON.stringify(JSON.parse(record.body), null, 2),
  ].join('\n');
}
