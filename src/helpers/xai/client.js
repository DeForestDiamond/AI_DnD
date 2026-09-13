export const XAI_API_BASE = 'https://api.x.ai/v1';
export const DEFAULT_GROK_MODEL = 'grok-4.3';

export const buildXaiHeaders = (apiKey) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${apiKey}`,
});
