import { buildSystemPromptSonnet } from './sonnet.js';

// Independent Terra entry point; starts with the current GPT prompt unchanged.
export const buildSystemPromptTerra = (char) => buildSystemPromptSonnet(char, { forGpt: true });
