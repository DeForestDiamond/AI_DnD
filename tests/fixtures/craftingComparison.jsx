// Browser integration fixture. Uses the real panel, manager, parser and state;
// tests intercept the single provider request with a deterministic response.
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { CraftingPanel } from '../../src/components/sidebar/crafting/Panels.jsx';
import { useCharacter } from '../../src/hooks/character/useCharacter.js';
import { EMPTY_CHAR } from '../../src/hooks/character/defaults.js';
import { createItemManager } from '../../src/helpers/items/manager.js';
import { craftingFixture } from './craftingComparison.mjs';

const scenario=new URLSearchParams(location.search).get('scenario')||'upgrade';
const fixture=craftingFixture(scenario);
const initial={...structuredClone(EMPTY_CHAR),name:'Comparison test',level:40,
  inventory:fixture.materials.map(m=>({name:m.name,qty:m.count})),
  items:Object.fromEntries(fixture.materials.map(m=>[m.name,m.data])),
};
function App(){
  const {character,charRef,updateChar,applyEffects}=useCharacter();
  useEffect(()=>{updateChar(initial);},[]);
  window.__craftCharacter=character;
  const manager=createItemManager({apiKey:'test',openAiApiKey:'test',charRef,updateChar,applyEffects,
    selectedModel:'test',MODEL_CONFIGS:{test:{provider:'openai',model:'test'}},log:()=>{},logUsage:()=>{}});
  if(character.name!==initial.name)return <p>Loading fixture…</p>;
  return <main style={{maxWidth:420,margin:'0 auto',padding:12,boxSizing:'border-box',fontFamily:'Georgia,serif'}}>
    <h1 style={{fontSize:18}}>Crafting · {scenario}</h1>
    <CraftingPanel character={character} db={character.items}
      onProposeCrafting={args=>manager.proposeCrafting({...args,intent:fixture.intent})}
      onExecuteCrafting={manager.executeCrafting}/>
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
