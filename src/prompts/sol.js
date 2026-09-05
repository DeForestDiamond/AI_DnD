import { buildSystemPromptSonnet } from './sonnet.js';

// Independent Sol entry point; starts with the current GPT prompt unchanged.
export const buildSystemPromptSol = (char) => buildSystemPromptSonnet(char, { forGpt: true });
