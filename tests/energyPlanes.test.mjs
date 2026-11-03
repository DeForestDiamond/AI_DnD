import test from 'node:test';
import assert from 'node:assert/strict';
import { ENVIRONMENTS, encounterCRCap } from '../src/constants/encounters/pacing.js';
import { NATIVE_ONLY_ENVIRONMENTS } from '../src/constants/encounters/npcRaces.js';
import { HOSTILE, SOCIAL_BY_ENV, WEIRD_BY_ENV, CONTEXT_BY_ENV } from '../src/constants/encounters/environments/index.js';
import { ARC_LOCATION_CHOICES } from '../src/constants/encounters/arcLocations.js';
import { rollEncounterDirective } from '../src/constants/encounters/roller.js';

function roll(char, sequence) {
  const original=Math.random;
  let i=0;
  try {Math.random=()=>sequence[i++]??0;return rollEncounterDirective(char);}
  finally {Math.random=original;}
}

for(const env of ['positive','negative']) {
  test(`${env}: selector, native isolation, and all encounter tables are registered`,()=>{
    assert.equal(ENVIRONMENTS.filter(e=>e.id===env).length,1);
    assert.ok(NATIVE_ONLY_ENVIRONMENTS.has(env));
    assert.ok(SOCIAL_BY_ENV[env].length>=10);
    assert.ok(WEIRD_BY_ENV[env].length>=10);
    assert.ok(HOSTILE.filter(e=>e.env.includes(env)).length>=10);
    assert.match(CONTEXT_BY_ENV[env],/Respect the character's actual nature/);
    assert.match(CONTEXT_BY_ENV[env],/not the safety of the entire plane/);
  });

  test(`${env}: every hostile roll stays in-plane and respects each level's CR ceiling`,()=>{
    for(const level of [1,3,5,10,20,35,50]) {
      const pool=HOSTILE.filter(e=>e.env.includes(env)&&e.cr<=encounterCRCap(level));
      assert.ok(pool.length>0);
      for(let i=0;i<pool.length;i++) {
        const result=roll({environment:env,level},[0,(i+0.1)/pool.length]);
        assert.equal(result.type,'hostile');
        assert.equal(result.desc,pool[i].desc);
        assert.ok(result.directive.includes(CONTEXT_BY_ENV[env]));
        assert.match(result.directive,/STOP for the player's choice/);
        assert.ok(!result.directive.includes('undefined'));
      }
    }
  });

  test(`${env}: social/weird rolls use every dedicated entry without overwriting native identities`,()=>{
    for(const [type,r,table] of [['social',0.7,SOCIAL_BY_ENV[env]],['weird',0.9,WEIRD_BY_ENV[env]]]) {
      for(let i=0;i<table.length;i++) {
        const result=roll({environment:env,level:1},[r,(i+0.1)/table.length]);
        assert.equal(result.type,type);
        assert.equal(result.desc,table[i]);
        assert.ok(!result.directive.includes('The person at the center'));
        assert.ok(result.directive.includes(CONTEXT_BY_ENV[env]));
      }
    }
  });

  test(`${env}: open-scale play includes high-level threats; arc and combat preferences still apply`,()=>{
    const entries=HOSTILE.filter(e=>e.env.includes(env));
    const highest=entries[entries.length-1];
    for(const mode of [{storyMode:'continuous'},{fantasyTone:'full-dark'}]) {
      const result=roll({environment:env,level:1,...mode},[0,0.99999]);
      assert.equal(result.desc,highest.desc);
    }
    const active=roll({environment:env,level:40,arc:{antagonist:'a lich',status:'active'},combatFirst:true},[0,0,0]);
    assert.ok(active.arcTied);
    assert.match(active.directive,/COMBAT-FIRST/);
    assert.ok(active.directive.includes(CONTEXT_BY_ENV[env]));
    const reserved=roll({environment:env,level:1,arc:{antagonist:'a lich',status:'reserved'}},[0,0]);
    assert.equal(reserved.arcTied,false);
    assert.ok(HOSTILE.some(e=>e.env.includes(env)&&e.desc===reserved.desc));
  });
}

test('both energy planes appear in narrative location choices and retain distinct settings',()=>{
  assert.ok(ARC_LOCATION_CHOICES.includes('Positive Plane'));
  assert.ok(ARC_LOCATION_CHOICES.includes('Negative Plane'));
  assert.match(CONTEXT_BY_ENV.negative,/distinct from the Shadowfell/);
  assert.match(CONTEXT_BY_ENV.positive,/not a synonym|need not be benevolent/);
});
