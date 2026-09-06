import fs from 'node:fs';

const path = 'src/App.jsx';
let s = fs.readFileSync(path, 'utf8');

const importAnchor = "import { callAnthropicConsolidate } from './helpers/anthropic/consolidate.js';\n";
const importLine = "import { armAnthropicCacheKeepWarm, cancelAnthropicCacheKeepWarm } from './helpers/anthropic/cache.js';\n";
if (!s.includes(importLine)) {
  if (!s.includes(importAnchor)) throw new Error('Anthropic cache helper import anchor not found');
  s = s.replace(importAnchor, importAnchor + importLine);
}

const oldBlock = `  const cacheTimerRef = useRef(null);   // one-shot cache keep-warm\n\n  // The prompt cache expires 5 minutes after its last use, and rebuilding it\n  // costs ~12x what a read does. Four minutes after a turn, refresh it ONCE —\n  // that buys another five minutes for a twelfth of the price. Fired once only:\n  // continuous pinging costs more than a single rebuild past ~50 minutes idle.\n  const armCacheTimer = () => {\n    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);\n    // OpenAI caching is automatic; Anthropic's explicit keep-warm ping does not apply.\n    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') return;\n    cacheTimerRef.current = setTimeout(async () => {\n      cacheTimerRef.current = null;\n      const c = charRef.current;\n      if (!c?.stats?.dex) return;                       // no character in play\n      const prompt = selectedModel === 'sonnet'\n        ? buildSystemPromptSonnet(c)\n        : selectedModel === 'haiku'\n        ? buildSystemPrompt(c)\n        : selectedModel === 'terra'\n        ? buildSystemPromptTerra(c)\n        : buildSystemPromptSol(c);\n      const data = await pingCache(prompt);\n      if (data) logUsage('cache keep-warm', data);\n    }, 4 * 60 * 1000);\n  };\n  useEffect(() => () => { if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current); }, []);`;

const newBlock = `  const cacheTimerRef = useRef(null);   // one-shot Anthropic cache keep-warm\n  const armCacheTimer = () => armAnthropicCacheKeepWarm({\n    timerRef: cacheTimerRef,\n    selectedModel,\n    charRef,\n    pingCache,\n    onUsage: data => logUsage('cache keep-warm', data),\n  });\n  useEffect(() => () => cancelAnthropicCacheKeepWarm(cacheTimerRef), []);`;

if (s.includes(oldBlock)) {
  s = s.replace(oldBlock, newBlock);
} else if (!s.includes('armAnthropicCacheKeepWarm({')) {
  throw new Error('Anthropic cache timer block not found');
}

fs.writeFileSync(path, s);
