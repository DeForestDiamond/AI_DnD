import assert from 'node:assert/strict';
import { NPC_FIELDS, npcRecordFields } from '../src/helpers/extraction/npcRecords.js';
import { callGptNpcManager } from '../src/helpers/openai/npcs.js';
import { callGrokNpcManager } from '../src/helpers/xai/npcs.js';
import { callAnthropicNpcManager } from '../src/helpers/anthropic/npcs.js';

const record = {location:'',relationship:'Trusts the player.',desc:'Juvenile companion.',
  race:'Displacer Beast',appearance:'Blue-black fur, six legs.',personality:'Playful and wary of strangers.',
  abilities:['Tracking','Responds to familiar commands'], slots:{neck:'Collar'}, tier:4};
assert.deepEqual(npcRecordFields(record).abilities, 'Tracking, Responds to familiar commands');
assert(!('slots' in npcRecordFields(record)));
assert(!('personality' in npcRecordFields({personality:''})));
const originalFetch = globalThis.fetch;
try {
  for (const helper of [callGptNpcManager,callGrokNpcManager,callAnthropicNpcManager]) {
    let body;
    globalThis.fetch = async (url, options) => {
      body = JSON.parse(options.body);
      const raw = JSON.stringify(url.includes('anthropic') ? {npcs:{Luna:record}} : {npcs:[{name:'Luna',...record}]});
      return {ok:true,json:async()=>url.includes('anthropic')
        ? {content:[{text:raw}]} : {output:[{type:'message',content:[{type:'output_text',text:raw}]}]}};
    };
    const result = await helper({apiKey:'test',playerName:'Cassian',name:'Luna',
      existing:{Luna:record},asCompanion:true,transcript:'A quiet scene.',messages:[]});
    assert.equal(result.found.Luna.race, record.race);
    assert.equal(result.found.Luna.personality, record.personality);
    assert(!('slots' in result.found.Luna));
    const rules = body.system || body.input[0].content[0].text;
    assert(rules.includes('not campaign recaps'));
    assert(rules.includes('not their defining purpose'));
    assert(rules.includes('Destination: companions'));
    if (body.text) for (const key of NPC_FIELDS) assert(body.text.format.schema.properties.npcs.items.required.includes(key));
  }
} finally { globalThis.fetch = originalFetch; }
console.log('NPC helper field and request contract checks passed for all three providers');
