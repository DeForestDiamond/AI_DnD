import { buildSystemPromptSonnet } from './solPrompt.js';

// Sol owns an independent snapshot of the GPT-tuned prompt.
export const buildSystemPromptSol = (char) => buildSystemPromptSonnet(char, { forGpt: true });
