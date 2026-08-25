import fs from 'node:fs';

const gamePath = 'src/hooks/useGame.js';
const appPath = 'src/App.jsx';
const sidePath = 'src/components/Sidebar.jsx';
let game = fs.readFileSync(gamePath, 'utf8');
let app = fs.readFileSync(appPath, 'utf8');
let side = fs.readFileSync(sidePath, 'utf8');
let changed = false;

const once = (src, from, to, label) => {
  const n = src.split(from).length - 1;
  if (n === 0 && src.includes(to)) return src;
  if (n !== 1) throw new Error(`GPT Terra patch: expected one ${label}, found ${n}`);
  changed = true;
  return src.replace(from, to);
};

game = once(game,
`  gpt: {
    provider: 'openai',
    model: 'gpt-5.6-sol',
    max_tokens: 2048,
    reasoning_effort: 'low',
    label: 'GPT',
    emoji: '🧠',
  },`,
`  gpt: {
    provider: 'openai',
    model: 'gpt-5.6-sol',
    max_tokens: 2048,
    reasoning_effort: 'low',
    label: 'GPT Sol',
    emoji: '🧠',
  },
  terra: {
    provider: 'openai',
    model: 'gpt-5.6-terra',
    max_tokens: 2048,
    reasoning_effort: 'low',
    label: 'GPT Terra',
    emoji: '🌍',
  },`,
'model config');

// Both GPT choices use the same OpenAI prompt path, cache layout, API key and
// state handling. The model config is the only difference between Sol and Terra.
app = once(app,
`    if (selectedModel === 'gpt') return;`,
`    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') return;`,
'cache timer OpenAI check');

app = once(app,
`  const [selectedModel, setSelectedModel] = useState('sonnet'); // 'sonnet', 'haiku', or 'gpt'`,
`  const [selectedModel, setSelectedModel] = useState('sonnet'); // sonnet, haiku, gpt (Sol), terra`,
'model state comment');

app = once(app,
`            onToggleModel={() => setSelectedModel(m => m === 'sonnet' ? 'haiku' : m === 'haiku' ? 'gpt' : 'sonnet')}`,
`            onToggleModel={() => setSelectedModel(m => m === 'sonnet' ? 'haiku' : m === 'haiku' ? 'gpt' : m === 'gpt' ? 'terra' : 'sonnet')}`,
'four-model cycle');

side = once(side,
`        <button onClick={onToggleModel} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',borderColor:selectedModel==='sonnet'?colors.gold:selectedModel==='gpt'?'#7aa7ff':colors.border}}>
          {selectedModel==='sonnet' ? '✨ DM: Sonnet' : selectedModel==='haiku' ? '⚡ DM: Haiku' : '🧠 DM: GPT'}
        </button>`,
`        <button onClick={onToggleModel} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',borderColor:selectedModel==='sonnet'?colors.gold:(selectedModel==='gpt'||selectedModel==='terra')?'#7aa7ff':colors.border}}>
          {selectedModel==='sonnet' ? '✨ DM: Sonnet' : selectedModel==='haiku' ? '⚡ DM: Haiku' : selectedModel==='gpt' ? '🧠 DM: GPT Sol' : '🌍 DM: GPT Terra'}
        </button>`,
'model button');

fs.writeFileSync(gamePath, game);
fs.writeFileSync(appPath, app);
fs.writeFileSync(sidePath, side);
console.log(changed ? 'GPT Terra DM option applied.' : 'GPT Terra DM option already applied.');
