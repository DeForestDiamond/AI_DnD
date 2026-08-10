from pathlib import Path

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Patch target not found: {label}")
    return text.replace(old, new, 1)

p = Path('src/hooks/useGame.js')
s = p.read_text()
s = replace_once(s, "model: 'gpt-5.2',", "model: 'gpt-5.6-sol',", 'GPT model id')
old = """      const totalInput = data.usage?.input_tokens || 0;
      const cached = data.usage?.input_tokens_details?.cached_tokens || 0;
      const usage = {
        input_tokens: Math.max(0, totalInput - cached),
        output_tokens: data.usage?.output_tokens || 0,
        cache_read_input_tokens: cached,
        cache_creation_input_tokens: 0,
        total_tokens: data.usage?.total_tokens || (totalInput + (data.usage?.output_tokens || 0)),
        provider: 'openai',
      };"""
new = """      const totalInput = data.usage?.input_tokens || 0;
      const cached = data.usage?.input_tokens_details?.cached_tokens || 0;
      const cacheWrite = data.usage?.input_tokens_details?.cache_write_tokens || 0;
      const usage = {
        input_tokens: Math.max(0, totalInput - cached - cacheWrite),
        output_tokens: data.usage?.output_tokens || 0,
        cache_read_input_tokens: cached,
        cache_creation_input_tokens: cacheWrite,
        total_tokens: data.usage?.total_tokens || (totalInput + (data.usage?.output_tokens || 0)),
        provider: 'openai',
      };"""
s = replace_once(s, old, new, 'OpenAI cache usage normalization')
p.write_text(s)

p = Path('src/components/InputBar.jsx')
s = p.read_text()
s = replace_once(
    s,
    "  gpt:    { input: 1.75, output: 14.0, cacheWrite: 1.75, cacheRead: 0.175 },",
    "  gpt:    { input: 5.0, output: 30.0, cacheWrite: 6.25, cacheRead: 0.50 },",
    'GPT-5.6 pricing'
)
p.write_text(s)
