from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Patch target not found: {label}")
    return text.replace(old, new, 1)


# ── useGame.js ────────────────────────────────────────────────────────────────
p = Path("src/hooks/useGame.js")
s = p.read_text()

old = """export const MODEL_CONFIGS = {
  sonnet: {
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    label: 'Sonnet',
    emoji: '✨',
  },
  haiku: {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1536,
    label: 'Haiku',
    emoji: '⚡',
  },
};"""
new = """export const MODEL_CONFIGS = {
  sonnet: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    label: 'Sonnet',
    emoji: '✨',
  },
  haiku: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1536,
    label: 'Haiku',
    emoji: '⚡',
  },
  gpt: {
    provider: 'openai',
    model: 'gpt-5.2',
    max_tokens: 2048,
    reasoning_effort: 'low',
    label: 'GPT',
    emoji: '🧠',
  },
};"""
s = replace_once(s, old, new, "MODEL_CONFIGS")
s = replace_once(
    s,
    "export function useGame({ charRef, apiKey }) {",
    "export function useGame({ charRef, apiKey, openAiApiKey }) {",
    "useGame signature",
)
old = """  const callDM = async (messages, systemPrompt, modelConfig = MODEL_CONFIGS.sonnet, signal = null, log = null, onPrompt = null) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
"""
new = """  const callDM = async (messages, systemPrompt, modelConfig = MODEL_CONFIGS.sonnet, signal = null, log = null, onPrompt = null) => {
    const provider = modelConfig.provider || 'anthropic';
    const key = provider === 'openai'
      ? (openAiApiKey || import.meta.env.VITE_OPENAI_KEY)
      : (apiKey || import.meta.env.VITE_ANTHROPIC_KEY);
    if (!key) throw new Error(provider === 'openai' ? 'OpenAI API key is missing' : 'Anthropic API key is missing');
"""
s = replace_once(s, old, new, "callDM provider/key selection")
anchor = "    const res = await fetch('https://api.anthropic.com/v1/messages', {\n"
openai = """    if (provider === 'openai') {
      // OpenAI prompt caching is automatic and prefix-based. Preserve the same
      // stable -> gear -> carried-items -> history -> volatile-state ordering as
      // Anthropic, but do not send Anthropic cache_control objects.
      const instructions = hasSplit
        ? [systemPrompt.static, systemPrompt.gear, systemPrompt.items].filter(Boolean).join('\\n\\n')
        : systemPrompt;
      const input = messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));
      if (dynamicTail && input.length) {
        const last = input[input.length - 1];
        input[input.length - 1] = { ...last, content: `${last.content}\\n\\n${dynamicTail}` };
      }

      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: modelConfig.model,
          instructions,
          input,
          max_output_tokens: modelConfig.max_tokens,
          reasoning: { effort: modelConfig.reasoning_effort || 'low' },
          text: { verbosity: 'low' },
          prompt_cache_key: `ai-dnd:${modelConfig.model}:${charRef.current?.name || 'character'}`,
          store: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `OpenAI API error ${res.status}`);
      }
      const data = await res.json();
      const text = (data.output || [])
        .filter(item => item?.type === 'message')
        .flatMap(item => item.content || [])
        .filter(part => part?.type === 'output_text')
        .map(part => part.text || '')
        .join('') || '...';
      const totalInput = data.usage?.input_tokens || 0;
      const cached = data.usage?.input_tokens_details?.cached_tokens || 0;
      const usage = {
        input_tokens: Math.max(0, totalInput - cached),
        output_tokens: data.usage?.output_tokens || 0,
        cache_read_input_tokens: cached,
        cache_creation_input_tokens: 0,
        total_tokens: data.usage?.total_tokens || (totalInput + (data.usage?.output_tokens || 0)),
        provider: 'openai',
      };
      if (promptRecord) onPrompt({ ...promptRecord, usage });
      return { text, usage };
    }

""" + anchor
s = replace_once(s, anchor, openai, "OpenAI transport insertion")
p.write_text(s)

# ── App.jsx ───────────────────────────────────────────────────────────────────
p = Path("src/App.jsx")
s = p.read_text()
s = replace_once(
    s,
    "  const [apiKey, setApiKey]     = useState('');\n",
    "  const [apiKey, setApiKey]     = useState('');\n  const [openAiApiKey, setOpenAiApiKey] = useState('');\n",
    "OpenAI key state",
)
s = replace_once(
    s,
    "  const [selectedModel, setSelectedModel] = useState('sonnet'); // 'sonnet' or 'haiku'\n",
    "  const [selectedModel, setSelectedModel] = useState('sonnet'); // 'sonnet', 'haiku', or 'gpt'\n",
    "selectedModel comment",
)
s = replace_once(
    s,
    "  const { callDM, buildActionContext, interceptRollRequest, pingCache } = useGame({ charRef, apiKey });",
    "  const { callDM, buildActionContext, interceptRollRequest, pingCache } = useGame({ charRef, apiKey, openAiApiKey });",
    "useGame invocation",
)
old = """  const armCacheTimer = () => {
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
"""
new = """  const armCacheTimer = () => {
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
    // OpenAI caching is automatic; Anthropic's explicit keep-warm ping does not apply.
    if (selectedModel === 'gpt') return;
"""
s = replace_once(s, old, new, "GPT cache timer bypass")
s = s.replace(
    "const system = selectedModel === 'sonnet'\n        ? buildSystemPromptSonnet(charWithArc)\n        : buildSystemPrompt(charWithArc);",
    "const system = selectedModel === 'haiku'\n        ? buildSystemPrompt(charWithArc)\n        : buildSystemPromptSonnet(charWithArc);",
)
s = s.replace(
    "const system = selectedModel === 'sonnet'\n        ? buildSystemPromptSonnet(charRef.current)\n        : buildSystemPrompt(charRef.current);",
    "const system = selectedModel === 'haiku'\n        ? buildSystemPrompt(charRef.current)\n        : buildSystemPromptSonnet(charRef.current);",
)
s = replace_once(
    s,
    "            onToggleModel={() => setSelectedModel(m => m === 'sonnet' ? 'haiku' : 'sonnet')}",
    "            onToggleModel={() => setSelectedModel(m => m === 'sonnet' ? 'haiku' : m === 'haiku' ? 'gpt' : 'sonnet')}",
    "three-way model toggle",
)
marker = '            placeholder="sk-ant-api03-..."'
idx = s.find(marker)
if idx == -1:
    raise SystemExit("Patch target not found: Anthropic key placeholder")
end_input = s.find('/>', idx)
if end_input == -1:
    raise SystemExit("Could not find end of Anthropic API key input")
insert_at = end_input + 2
openai_key_ui = """
          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:2,marginTop:12,marginBottom:6}}>OPENAI API KEY</div>
          <input
            type="password"
            value={openAiApiKey}
            onChange={e => setOpenAiApiKey(e.target.value)}
            placeholder="sk-..."
            style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.mono,fontSize:12,padding:'9px 10px',borderRadius:4,outline:'none'}}
          />"""
s = s[:insert_at] + openai_key_ui + s[insert_at:]
p.write_text(s)

# ── Sidebar.jsx ───────────────────────────────────────────────────────────────
p = Path("src/components/Sidebar.jsx")
s = p.read_text()
old = """      {/* Model toggle */}
      {onToggleModel && (
        <button onClick={onToggleModel} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',borderColor:selectedModel==='sonnet'?colors.gold:colors.border}}>
          {selectedModel==='sonnet' ? '✨ DM: Sonnet' : '⚡ DM: Haiku'}
        </button>
      )}"""
new = """      {/* Model toggle */}
      {onToggleModel && (
        <button onClick={onToggleModel} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',borderColor:selectedModel==='sonnet'?colors.gold:selectedModel==='gpt'?'#7aa7ff':colors.border}}>
          {selectedModel==='sonnet' ? '✨ DM: Sonnet' : selectedModel==='haiku' ? '⚡ DM: Haiku' : '🧠 DM: GPT'}
        </button>
      )}"""
s = replace_once(s, old, new, "Sidebar model toggle")
p.write_text(s)

# ── InputBar.jsx ──────────────────────────────────────────────────────────────
p = Path("src/components/InputBar.jsx")
s = p.read_text()
old = """const PRICING = {
  sonnet: { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.30 },
  haiku:  { input: 1.0, output: 5.0,  cacheWrite: 1.25, cacheRead: 0.10 },
};"""
new = """const PRICING = {
  sonnet: { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.30 },
  haiku:  { input: 1.0, output: 5.0,  cacheWrite: 1.25, cacheRead: 0.10 },
  gpt:    { input: 1.75, output: 14.0, cacheWrite: 1.75, cacheRead: 0.175 },
};"""
s = replace_once(s, old, new, "InputBar GPT pricing")
p.write_text(s)
