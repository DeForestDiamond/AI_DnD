from pathlib import Path
import json
root=Path('.')
p=root/'src/hooks/useGame.js'; s=p.read_text()
a=s.index('// ── Shared character data block'); b=s.index('const TAGS_BLOCK ='); c=s.index('// ── System Prompt — Haiku'); d=s.index('const GPT_THREAD_DISCIPLINE ='); e=s.index('const GPT_EXTRA_RULES ='); f=s.index('// ── System Prompt — Sonnet'); g=s.index('export const buildSystemPromptGpt'); h=s.index('// Stack duplicate inventory items for display')
state_chunk=s[a:b]; blocks=s[b:c]; haiku_chunk=s[c:d]; thread=s[d:e]; extra=s[e:f]; sonnet_chunk=s[f:g]
x=s.index('// Player-authored standing instructions'); y=s.index('// Strip game tags'); helpers=s[x:y]
(root/'src/prompts').mkdir(exist_ok=True)
state="""import { getMainWeapon, effectiveStats, calcAC, profBonus, allItems, effectiveMaxHp, modStr } from '../hooks/useCharacter.js';
import { coinsToString } from '../constants/currency.js';
import { RACE_TRAIT_STRINGS } from '../constants/raceTraits.js';
import { subclassPromptLines } from '../constants/subclasses.js';
import { stackCounts, stackNames } from '../utils/itemStacks.js';

"""+helpers+state_chunk
for n in ['directivesBlock','playstyleLine','buildCharBlock','buildCtxSections','buildConstructSection']: state=state.replace('const '+n,'export const '+n)
state=state.replace('stackInventory(char.inventory)','stackCounts(char.inventory)')
(root/'src/prompts/state.js').write_text(state)
shared=blocks+thread+extra
for n in ['TAGS_BLOCK','NPC_BLOCK','ORDINARY_WORLD_BLOCK','ARC_RULES_BLOCK','SETTING_BLOCK','GPT_THREAD_DISCIPLINE','GPT_EXTRA_RULES']: shared=shared.replace('const '+n,'export const '+n)
(root/'src/prompts/shared.js').write_text(shared)
haiku="""import { getMainWeapon, effectiveStats, calcAC, profBonus, allItems, effectiveMaxHp, modStr } from '../hooks/useCharacter.js';
import { coinsToString } from '../constants/currency.js';
import { RACE_TRAIT_STRINGS } from '../constants/raceTraits.js';
import { subclassPromptLines } from '../constants/subclasses.js';
import { stackCounts } from '../utils/itemStacks.js';
import { buildCtxSections, playstyleLine, directivesBlock } from './state.js';
import { TAGS_BLOCK, SETTING_BLOCK, NPC_BLOCK } from './shared.js';

"""+haiku_chunk
haiku=haiku.replace('stackInventory(char.inventory)','stackCounts(char.inventory)')
(root/'src/prompts/haiku.js').write_text(haiku)
sonnet="""import { buildCharBlock, buildCtxSections, directivesBlock } from './state.js';
import { TAGS_BLOCK, NPC_BLOCK, ORDINARY_WORLD_BLOCK, ARC_RULES_BLOCK, SETTING_BLOCK, GPT_THREAD_DISCIPLINE, GPT_EXTRA_RULES } from './shared.js';

"""+sonnet_chunk
(root/'src/prompts/sonnet.js').write_text(sonnet)
for n in ['sol','terra']:
 cap=n.title(); (root/f'src/prompts/{n}.js').write_text(f"import {{ buildSystemPromptSonnet }} from './sonnet.js';\n\n// Independent {cap} entry point; starts with the current GPT prompt unchanged.\nexport const buildSystemPrompt{cap} = (char) => buildSystemPromptSonnet(char, {{ forGpt: true }});\n")
new=s[:x]+s[y:]; aa=new.index('// ── Shared character data block'); hh=new.index('// Stack duplicate inventory items for display'); new=new[:aa]+new[hh:]
anchor="import { stackCounts, stackNames } from '../utils/itemStacks.js';\n"
imports="""import { buildCtxSections } from '../prompts/state.js';
import { buildSystemPrompt as buildSystemPromptHaiku } from '../prompts/haiku.js';
import { buildSystemPromptSonnet } from '../prompts/sonnet.js';
import { buildSystemPromptSol } from '../prompts/sol.js';
import { buildSystemPromptTerra } from '../prompts/terra.js';
"""
new=new.replace(anchor,anchor+imports+"\nexport { buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra };\nexport const buildSystemPrompt = buildSystemPromptHaiku;\nexport const buildSystemPromptGpt = buildSystemPromptSol;\n")
p.write_text(new)
app=root/'src/App.jsx'; z=app.read_text(); z=z.replace('buildSystemPromptSonnet, buildSystemPromptGpt, cleanDisplayText','buildSystemPromptSonnet, buildSystemPromptGpt, buildSystemPromptSol, buildSystemPromptTerra, cleanDisplayText')
z=z.replace(": buildSystemPromptGpt(c);",": selectedModel === 'terra'\n        ? buildSystemPromptTerra(c)\n        : buildSystemPromptSol(c);")
z=z.replace(": buildSystemPromptGpt(charWithArc);",": selectedModel === 'terra'\n        ? buildSystemPromptTerra(charWithArc)\n        : buildSystemPromptSol(charWithArc);")
z=z.replace(": buildSystemPromptGpt(charRef.current);",": selectedModel === 'terra'\n        ? buildSystemPromptTerra(charRef.current)\n        : buildSystemPromptSol(charRef.current);")
app.write_text(z)
pkg=root/'package.json'; q=json.loads(pkg.read_text()); q['scripts'].pop('predev',None); q['scripts'].pop('prebuild',None); pkg.write_text(json.dumps(q,indent=2)+'\n')
