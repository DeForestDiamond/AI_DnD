import { buildSystemPrompt as buildSystemPromptHaiku } from '../../prompts/haiku.js';
import { buildSystemPromptSonnet } from '../../prompts/sonnet.js';

export const ANTHROPIC_CACHE_KEEP_WARM_MS = 4 * 60 * 1000;

const buildAnthropicPrompt = (selectedModel, char) => {
  if (selectedModel === 'sonnet') return buildSystemPromptSonnet(char);
  if (selectedModel === 'haiku') return buildSystemPromptHaiku(char);
  return null;
};

export function armAnthropicCacheKeepWarm({
  timerRef,
  selectedModel,
  charRef,
  pingCache,
  onUsage,
}) {
  if (timerRef.current) clearTimeout(timerRef.current);

  // OpenAI prompt caching is automatic. This helper exists only for Anthropic.
  if (selectedModel !== 'sonnet' && selectedModel !== 'haiku') return;

  timerRef.current = setTimeout(async () => {
    timerRef.current = null;
    const char = charRef.current;
    if (!char?.stats?.dex) return;

    const prompt = buildAnthropicPrompt(selectedModel, char);
    if (!prompt) return;

    const data = await pingCache(prompt, selectedModel);
    if (data) onUsage?.(data);
  }, ANTHROPIC_CACHE_KEEP_WARM_MS);
}

export function cancelAnthropicCacheKeepWarm(timerRef) {
  if (!timerRef.current) return;
  clearTimeout(timerRef.current);
  timerRef.current = null;
}

