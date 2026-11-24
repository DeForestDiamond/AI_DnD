import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useSave } from '../src/hooks/useSave.js';
import { browserSaveStore } from '../src/helpers/browserSave.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';

test('full, character and browser saves group profile fields first and possessions last', async t => {
  // A previously exported character may arrive with any insertion order.
  const character = {
    stash: [{ name: 'Silk', qty: 7 }], directives: 'Keep track of debts.', arc: { antagonist: 'A thief' },
    items: { Silk: { label: 'Loom silk' } }, disposition: { alignment: 'Neutral' },
    inventory: [{ name: 'Silk', qty: 1 }], name: 'Test', bio: 'A weaver.',
    ...JSON.parse('{"__proto__":{"custom":"retained"}}'), extraCampaignField: null, slots: {},
    appearance: 'Blue cloak', _v: EMPTY_CHAR._v,
  };
  const messages = [{ role: 'user', content: 'Inspect the loom.' }];
  let save, autosave, downloaded, loaded;
  function Harness() {
    save = useSave({ charRef: { current: character }, messages, storySummaryRef: { current: 'Memory' },
      onLoadFull: (char, history) => { loaded = { char, history }; } });
    return null;
  }
  renderToString(React.createElement(Harness));
  t.mock.method(browserSaveStore, 'save', async state => {
    autosave = state;
    return { state, backend: 'test' };
  });
  t.mock.method(URL, 'createObjectURL', blob => { downloaded = blob; return 'blob:test'; });
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ click() {} }), body: { appendChild() {}, removeChild() {} } };
  t.after(() => { if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument; });

  const full = save.generateFullSave();
  const fullText = await downloaded.text();
  const exported = save.generateCharExport();
  const { arc, ...characterOnly } = character;
  for (const [state, expected] of [[JSON.parse(fullText), character], [autosave, character], [JSON.parse(await downloaded.text()), characterOnly]]) {
    assert.deepEqual(state.character, expected);
    const keys = Object.keys(state.character);
    assert.deepEqual(keys.slice(0, 6), ['_v', 'name', 'bio', 'appearance', 'disposition', 'directives']);
    assert.deepEqual(keys.slice(-4), ['slots', 'items', 'inventory', 'stash']);
    if (state._type === 'fullsave') {
      assert.equal(Object.keys(state).indexOf('messages'), Object.keys(state).indexOf('character') + 1);
      assert.deepEqual(state.messages, messages);
    }
  }
  assert.ok(!('messages' in exported));
  // The old order and new order load to exactly the same character and history.
  save.loadFromCode(JSON.stringify({ ...full, character }));
  const old = loaded;
  save.loadFromCode(fullText);
  assert.deepEqual(loaded, old);
  assert.deepEqual(loaded.history, messages);
  assert.equal(Object.keys(character)[0], 'stash');
});
