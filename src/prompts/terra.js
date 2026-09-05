import { buildSystemPromptSonnet } from './terraPrompt.js';

// Terra owns an independent snapshot of the GPT-tuned prompt.
export const buildSystemPromptTerra = (char) => buildSystemPromptSonnet(char, { forGpt: true });
