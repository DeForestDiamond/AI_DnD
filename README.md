# Tales of the Realm

A single-player D&D 5e web app with an AI Dungeon Master, set in the Forgotten Realms and its planes. Built for mobile and desktop browsers with React and Vite.

The app rolls dice, tracks character state, and applies structured game effects. The DM narrates the world, plays NPCs, and adjudicates the fiction. Character creation, equipment, inventory, leveling, companions, world records, crafting, and campaign memory are integrated into the conversation.

[Play the hosted app](https://aidnd-nine.vercel.app/)

## Requirements and models

Use a modern browser and an API key for at least one supported provider. Enter keys on the welcome screen, then select a matching DM model in Settings. The app does not require its own account or backend.

| Provider | DM choices in the app |
| --- | --- |
| Anthropic | Sonnet, Haiku |
| OpenAI | GPT Sol, GPT Terra |
| xAI | Grok 4.3, Grok 4.6 |

These are the app's configured choices, not a promise of access for every provider account. Exact model IDs and request settings live in [`MODEL_CONFIGS`](src/hooks/useGame.js). Provider access and billing are managed through your own provider account.

Keys entered in the UI are held in app memory and are not included in campaign save files. Requests go directly from the browser to the selected provider. Campaign context and any submitted images therefore leave the device for processing by that provider. Voice features use browser speech services, whose behavior depends on the browser and operating system.

API usage is billed by the provider. Costs vary with the model, campaign context, output, caching, and helper requests. The app displays token usage and estimated costs; provider billing is authoritative. History updates, NPC/town extraction, crafting, consolidation, and salvage can also use API requests.

## Run your own copy

### Local development

Use Node.js 22 (the version used by the browser-test workflows) and npm:

```sh
git clone https://github.com/DeForestDiamond/AI_DnD.git
cd AI_DnD
npm ci
npm run dev
```

Open the URL printed by Vite and enter your provider key in the app.

```sh
npm run build
npm run preview
```

The production build is written to `dist/`. Both `dev` and `build` run the repository's `predev`/`prebuild` preparation script automatically.

### Vercel

Fork the repository, import the fork as a Vercel project, and use the detected Vite build configuration. The build command is `npm run build` and the output directory is `dist`. With Git deployment enabled, pushes to the production branch deploy the production app and other branches can create previews.

Enter API keys through the app. The code also supports `VITE_ANTHROPIC_KEY`, `VITE_OPENAI_KEY`, and `VITE_XAI_KEY` build-time fallbacks, but **Vite exposes these values in the browser bundle**. They are not server-side secrets and should not contain private keys on a public deployment.

## Playing

1. **Create or import a character.** Choose a race, class, stats, and relevant deity or patron. Bio, appearance, and disposition help establish who the character is, what matters to them, and how NPCs should understand them.
2. **Choose the story style.** Story structure, tone, and combat-first encounters are separate settings.
3. **Describe your actions.** Type freely or use the numbered option buttons. Offered choices do not limit what you can attempt.
4. **Let the app resolve rolls.** The DM can request rolls and receives the calculated results. Weapon attacks support hand-specific rolls, including offhand attacks and explicitly declared attacks with both weapons. Automation does not replace the DM's adjudication of legal attacks and action economy.

### Stories and encounters

- **Structured stories:** use a hidden antagonist arc or a situation Adventure. Roll, select, or customize an antagonist; Adventures and antagonist arcs are alternative story drivers. Antagonists can be revealed manually if you want the spoiler.
- **Arc outcomes:** success is not required for closure. The DM is instructed to end an arc when its established central objective becomes irreversibly impossible, while preserving credible paths that still exist. A resolved arc should allow aftermath before the next one begins.
- **Long Story:** one evolving campaign without assigned antagonist arcs or mandatory arc endings. Existing people, relationships, and consequences continue.
- **Fantasy tone:** Standard or Full Dark Fantasy, independently of story structure.
- **Combat-first encounters:** hostile encounters favor action when appropriate; de-escalation needs a credible reason.
- **Encounter pacing:** Off, Calm, Sparse, Normal, or Dangerous. Select the environment separately, from Faerûn's cities, wilderness, oceans, and Underdark to the Hells, Abyss, elemental planes, Positive and Negative Energy Planes, and other planar destinations.
- **Antagonist variety:** level-filtered foes include political threats, settlement assaults, mind flayer colonies, beholders, undead powers, dragons, and the tarrasque. Completed entries stay out of future draws unless restored in Settings. This exclusion list is app bookkeeping, not evidence sent to the DM that a foe died.
- **World pressures:** structured pressure tags track an unresolved situation's current state, likely next move, and timing or trigger. Editing or regenerating earlier history rebuilds this ledger from the retained DM messages, removing pressure changes from the discarded timeline.

The shared prompts emphasize impartial adjudication, player agency, distinct NPC motives and knowledge, competent delegation, and consequences grounded in established events. These are instructions to the model, not guarantees that every response will follow them perfectly.

### Characters and world records

- **Companions** have persistent profiles, abilities, relationships, and equipment slots. Included companions and their equipment are supplied to the DM.
- **NPC and Town Managers** can extract records from selected message ranges or accept manual entries and edits. Context checkboxes control which records are sent.
- **Inventory, bags, and stash** track items, quantities, equipment, and custom definitions. Choose whether new DM loot goes to inventory or stash. Crafting and salvage have their own destination controls.
- **Standing instructions** add campaign-specific guidance. Settings also expose raw-tag display, token costs, captured DM requests, and debug information for troubleshooting.
- **Voice** supports spoken DM messages, voice/rate/pitch controls, pronunciation substitutions, and microphone input where browser support is available.
- **Image attachments** are available with the OpenAI and xAI DM choices.

### Crafting, consolidation, and salvage

Craft new items, upgrade equipment, generate equipment sets, or build constructs from selected materials. Item batches support up to **100,000**; construct batches retain a separate **25** limit.

Crafting proposals include a compact comparison above the full descriptions: focus, additions, improvements, regressions, uncertain omissions, costs, and trade-offs where supported by the result data. Sets receive a set-level view with optional piece details. Recommendations depend on evidence; a missing ability is not automatically treated as lost. Comparison metadata comes from the existing proposal request, with local checks and fallbacks, rather than a separate analysis call. It is informational and does not change the results or forging behavior.

**Consolidation** proposes groups for individual approval. It is designed to combine compatible materials without flattening exceptional origins or useful properties into generic stock. Naming rules retain familiar unit/container forms such as `Silk Bolt` and `Iron Ingot`, using a representative size when sizes differ. Manual combining is also available.

**Salvage** previews recovered materials before consuming the submitted items. Its rules call for actual breakdown, rather than simply renaming a usable potion or finished item. Intrinsic material properties and independently useful components may survive; quest significance or a tracking connection alone is not a reason to return an intact object. Validation rejects some obvious non-breakdowns, but generated proposals still need review.

See [crafting comparison details](docs/crafting-comparison.md) for evidence rules, limitations, and the data flow.

## Saves and campaign memory

The browser has one autosave slot per site/browser profile. Autosaves use **IndexedDB**, with a localStorage fallback and support for reading older browser saves. Save/Load shows the stored message count and timestamp; save errors are surfaced in the UI. A Full Save download also attempts to refresh the browser autosave.

- **Full Save:** downloads JSON containing the character, world state, messages, campaign memory, saved settings, and diagnostic records.
- **Export Character:** downloads the character and world without the message history or active antagonist arc, for starting another story.
- **Load / Import:** restore a JSON file, paste its contents, or restore the browser autosave. The loader repairs some common JSON formatting errors and migrates older character formats.
- **New Campaign:** keeps the character and world records while clearing the current story. Export a Full Save first if you want to return to that campaign.

Browser storage is device- and site-specific, not cloud synchronization. Clearing site data or switching browsers/URLs does not carry the autosave across. Keep downloaded Full Saves for backups and separate campaigns.

Campaign memory uses layered **Continuity, History, Recent, and Corrections** fields alongside recent unsummarized messages. Retained archives remain available in the Story Log, and an original-archives mode is available. Timeline edits invalidate abandoned summary coverage; retained source records support rebuilding memory. The pressure ledger is also rebuilt on edits, but editing a message is **not a general rollback of inventory, XP, or all character state**.

See [campaign memory details](docs/campaign-memory.md) for migration, coverage tracking, and recovery behavior.

## Managing context and cost

- Move unused items to the **stash**; carried inventory and relevant custom item descriptions are sent to the DM, while stash contents are omitted from ordinary DM context.
- Exclude idle companions, NPCs, and towns with their context checkboxes. Included companions are treated as traveling with the player; a location field does not automatically exclude them.
- Give NPCs and towns accurate locations so nearby records can receive more detail while distant records are shortened.
- Keep bio and standing instructions focused; they are recurring context.
- In original-archives mode, review the archive/entry checkboxes. Layered mode uses current memory plus messages after committed coverage, rather than sending every retained archive.
- Review token usage and request captures to see what is actually sent. Caching behavior and savings vary by provider and request shape; do not assume every turn is a cache hit.

## Development and validation

The source is organized around:

| Area | Location |
| --- | --- |
| App orchestration and UI | `src/App.jsx`, `src/components/` |
| Character state and effects | `src/hooks/character/` |
| Six model prompts and shared rules | `src/prompts/` |
| DM transport, rolls, model configuration | `src/hooks/useGame.js` |
| Provider-specific helper requests | `src/helpers/anthropic/`, `openai/`, `xai/` |
| Memory and saves | `src/helpers/history/`, `src/helpers/browserSave.js`, `src/hooks/useSave.js` |
| Encounters, antagonists, environments | `src/constants/encounters/` |
| Regression tests and browser fixtures | `tests/` |

DM replies contain narration and machine-readable tags such as `[ITEM: ...]`, `[XP: ...]`, `[ROLL: ...]`, `[PRESSURE: ...]`, and `[ARC COMPLETE]`. The parser applies supported effects; raw tags can be displayed for diagnosis.

There is no `npm test` script. Run Node tests directly, for example:

```sh
node --test tests/craftingComparison.test.mjs tests/craftingMaterials.test.mjs
node --test tests/browserSave.test.mjs tests/pressureRewind.test.mjs
npm run build
```

The full Node suite is `node --test tests/*.test.mjs`. Some existing `storyOptions` assertions still expect the exact unmodified dark-fantasy block in modes that intentionally adapt its arc wording; those known failures are separate from the focused checks above.

For browser checks, install Chromium and start Vite in one terminal:

```sh
npx playwright install --with-deps chromium
npm run dev -- --host 127.0.0.1 --port 5173
```

Then, in another terminal:

```sh
node tests/craftingComparison.browser.mjs
node tests/browserSave.browser.mjs
```

The crafting comparison and browser save workflows run relevant automated checks in GitHub Actions. Provider replies in these tests are mocked; they test app behavior, not live model narration quality.

## Limitations

This is a D&D-inspired implementation, including fan implementations of Illrigger and Blood Hunter, rather than a complete rules engine. The DM can misinterpret intent, overlook context, or emit incorrect tags. Review consequential proposals and correct the conversation when necessary. Voice availability depends on installed voices and browser APIs; Chrome is a useful starting point, but support is not exclusive to it.

Save files and request/debug exports can contain private campaign text and submitted context. Review them before sharing.
