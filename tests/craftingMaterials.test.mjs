import test from 'node:test';
import assert from 'node:assert/strict';
import { CRAFTING_MATERIAL_RULES } from '../src/helpers/craftingMaterials.js';
import { CRAFTING_PRESERVATION_RULES } from '../src/helpers/craftingPreservation.js';
import { callGptCrafting } from '../src/helpers/openai/crafting.js';
import { callGrokCrafting } from '../src/helpers/xai/crafting.js';
import { callAnthropicCrafting } from '../src/helpers/anthropic/crafting.js';

// Inspect actual wire requests: all three providers construct their prompts
// differently, and all modes need the same material-budget policy.
for (const [name,call] of [['GPT',callGptCrafting],['Grok',callGrokCrafting],['Anthropic',callAnthropicCrafting]]) {
  test(`${name} sends physical material budgets in item, set and construct requests`,async()=>{
    const originalFetch=globalThis.fetch;
    let body;
    globalThis.fetch=async(url,init)=>{
      body=JSON.parse(init.body);
      const raw=JSON.stringify({options:[]});
      return {ok:true,json:async()=>url.includes('anthropic')
        ? {content:[{type:'text',text:raw}],stop_reason:'end_turn'}
        : {output:[{type:'message',content:[{type:'output_text',text:raw}]}]}};
    };
    try {
      for(const mode of [{},{asSet:true},{asConstruct:true}]) for(const have of [40,40000]) {
        const materialsText=`NAME: Adamantine Ingot | HAVE: ${have}\nNAME: Finished Base | HAVE: 1 | existing structure and capabilities`;
        await call({apiKey:'test',materialsText,characterLevel:50,intent:'Modify the selected base using a physically appropriate amount of metal.',quantity:3,...mode});
        const prompt=body.system || body.input[0].content[0].text;
        assert.equal(prompt.split(CRAFTING_MATERIAL_RULES).length-1,1);
        assert.ok(prompt.includes(CRAFTING_PRESERVATION_RULES));
        assert.match(prompt,/HAVE is an availability ceiling, NEVER a consumption target/);
        assert.match(prompt,/Budget ALL ingredients together/);
        assert.match(prompt,/NEW material only for the actual modification/);
        assert.match(prompt,/TOTAL consumption for the actual returned count, counted ONCE/);
        const request=JSON.stringify(body);
        assert.ok(request.includes(`HAVE: ${have}`));
        assert.ok(request.includes('Modify the selected base'));
        if(!mode.asSet) assert.match(request,/3 (?:identical copies|COPIES)/);
      }
    } finally {globalThis.fetch=originalFetch;}
  });
}
