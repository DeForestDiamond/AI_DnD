import fs from 'node:fs';

const path = 'src/App.jsx';
let s = fs.readFileSync(path, 'utf8');

const seedImport = "import { rollAdventureSeed } from './helpers/adventure/seed.js';";
const arcImport = "import { generateAdventureArc } from './helpers/adventure/arc.js';";
if (!s.includes(arcImport)) {
  if (!s.includes(seedImport)) throw new Error('Adventure seed import anchor not found');
  s = s.replace(seedImport, `${seedImport}\n${arcImport}`);
}

const start = s.indexOf('  const generateObjectives = async (antagonist) => {');
const endMarker = '\n\n  // Bags keep their contents on the bag definition in the single item registry.';
const end = s.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('generateObjectives block not found');

const replacement = `  const generateObjectives = async (antagonist) => {
    const c = charRef.current;
    if (!antagonist) throw new Error('No antagonist to build a campaign around');
    const modelConfig = MODEL_CONFIGS[selectedModel];
    log(\`[ARC] Generating goal + first objective with \${modelConfig?.label || selectedModel}: \${antagonist}\`);

    const result = await generateAdventureArc({
      antagonist,
      character: c,
      modelConfig,
      anthropicApiKey: apiKey,
      openAiApiKey,
    });

    if (modelConfig?.provider === 'anthropic') {
      logUsage('arc objectives', result.rawData);
    } else if (result.usage) {
      const input = result.usage.input_tokens ?? 0;
      const output = result.usage.output_tokens ?? 0;
      log(\`[ARC] \${modelConfig?.label || 'OpenAI'} usage: \${input.toLocaleString()} in / \${output.toLocaleString()} out\`);
    }

    const { goal, objectives } = result;
    updateChar({ ...charRef.current, arc: { ...(charRef.current.arc || {}), antagonist, goal, objectives } });
    log(\`[ARC] Goal: \${goal}\`);
    return { goal, objectives };
  };`;

s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(path, s);
