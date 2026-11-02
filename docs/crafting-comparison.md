# Crafting result comparison

New crafting proposals include a comparison before the expandable full result
descriptions. Each option shows its focus, functional highlights, structured
stats, batch cost, regressions, and uncertain omissions. Sets are summarized as
a whole, with optional piece checks. Original descriptions remain available.
Forge buttons continue to act on the original result objects.

## Data flow

The panel requests `includeComparison: true` from `proposeCrafting`. The same
provider request returns the existing `options` plus a separate `comparison`
object. GPT and Grok extend only the response root schema; item and piece schemas
are unchanged. Anthropic receives the same comparison contract in its JSON
instructions. There is no second analysis request.

The manager returns `{ options, comparison }` only to callers opting in; existing
callers still receive the original options array. `buildCraftingComparison`
creates a presentation model from the proposal-time material snapshot and the
generated results. Comparison data never enters item definitions, inventory,
consumption tags, or the forging parser.

## Evidence and limits

- AC, bonuses, damage averages, restrictions, and costs use structured fields.
  Set bonuses are summed across pieces; base armor AC values are not added
  together or presented as the player's total AC.
- Narrative summaries use short exact source excerpts. Invalid references are
  omitted. Supported wording is still an AI interpretation, not a proof of
  semantic equivalence or a complete preservation audit.
- An omitted ability is uncertain, not a confirmed loss. Narrative loss claims
  need both original evidence and an explicit new restriction. Identical quoted
  functions cannot be counted as new power.
- Ambiguous piece mappings are flagged instead of choosing an arbitrary ring or
  weapon. Recommendations are withheld for unavailable, regressive, or uncertain
  winners, or when their evidence cannot be checked. Different specializations
  need not have a universal winner.
- Legacy/missing analysis falls back to local stats and costs with an explicit
  notice. It never blocks forging or rewrites the proposed item.

## Validation

```sh
npm ci
node --test tests/craftingComparison.test.mjs tests/craftingMaterials.test.mjs
npm run build
npx playwright install --with-deps chromium
npm run dev -- --host 127.0.0.1 --port 5173
# In another terminal:
node tests/craftingComparison.browser.mjs
```

The browser test covers fresh items, upgrades, sets, and constructs at 320px,
390px, and 1280px. It uses the real panel, manager, parser, and character state;
only the external crafting response is mocked. It checks disclosure controls,
keyboard interaction, overflow, one provider call per proposal, and actual
material consumption/forging. Optional screenshots use
`CRAFTING_SCREENSHOT_DIR=...`. The Crafting comparison workflow runs these checks
automatically on relevant pushes and pull requests.
