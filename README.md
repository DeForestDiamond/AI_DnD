# Tales of the Realm

A single-player Dungeons & Dragons web application with an AI Dungeon Master, powered by the Anthropic API. The application handles game mechanics (dice, combat math, inventory, experience, leveling) in code; the AI handles narration and the world. It is designed primarily for mobile browsers and runs entirely client-side — there is no backend server, no account, and no data leaves your device except the API calls to Anthropic.

Set in the Forgotten Realms (Faerûn).

<!-- Deployment trigger: 2026-08-20 -->

## Requirements

- An Anthropic API key. Create one at [console.anthropic.com](https://console.anthropic.com) (an account and a small credit balance are required). Your key is entered in the app at the start of play and is kept in your browser only — it is never stored on a server.
- A modern browser. Chrome is recommended (see Known Quirks regarding text-to-speech).

**Cost note:** all API usage is billed to your own Anthropic account. With prompt caching active, a typical turn costs roughly $0.01–0.05 using the Sonnet model; a long play session generally lands in the $0.50–2.00 range. The token counter under the input box shows the exact usage and cost of every turn. The Haiku model is significantly cheaper, with rougher narration.

## Setup

### Option 1 — Deploy on Vercel (recommended)

1. Fork this repository.
2. Sign in at [vercel.com](https://vercel.com) and choose **Add New → Project**.
3. Import your fork. Vercel auto-detects the Vite configuration; no settings need to be changed.
4. Deploy. Your copy of the app is now live at the URL Vercel assigns.
5. Open the URL, enter your Anthropic API key, and begin.

Any push to your fork's main branch redeploys automatically. Pushes to other branches create separate preview deployments, which is useful for testing changes.

### Option 2 — Run locally

```
npm install
npm run dev
```

Then open the printed local URL.

## Playing

1. **Create a character** — choose a race and class, assign stats, optionally write a bio. The bio is sent to the AI with every message and anchors how the character is played; alignment, motivations, and behavioral notes written here have a strong effect on the story. Clerics, Warlocks, and Paladins additionally choose a deity or patron.
2. **Type actions or use the option buttons** — the DM ends every message with four numbered choices. The 1–4 buttons above the input send the corresponding option in one tap. Free-typed actions are always available and take priority over the offered options.
3. **Dice** — when an outcome is uncertain, the DM requests a roll. The application rolls the dice, applies your modifiers, and the DM narrates the result. The DM never decides roll outcomes itself.

### Main features

- **Story arcs** — the sidebar arc panel assigns a hidden antagonist that all foreshadowing builds toward. *Roll* picks one appropriate to your level, *Custom* lets you write your own (phrase it as a noun, e.g. "a rival smuggling ring"), *Clear* removes it for open sandbox play. The antagonist's identity is hidden from you until the story reveals it.
- **Pacing** — controls how frequently unprompted encounters occur (calm / normal / eventful), or disables them entirely.
- **Models** — toggle between Sonnet (recommended; better instruction-following and prose) and Haiku (cheaper; needs more correction).
- **NPC and Town Managers** — every message in the feed shows a small index number. Give the manager a name and a message range, and a dedicated AI call reads those messages and writes a structured entry into your save (creating a new entry or merging into an existing one). Entries can also be created and edited manually. Saved NPCs, companions, and towns are sent to the DM for consistency.
- **Companions** — persistent party members with full equipment slots, sent to the DM when they are with you.
- **Inventory, bags, and stash** — items the DM grants are tracked mechanically. Bags group items; the stash stores items you are not carrying.
- **Saves** — the app autosaves continuously to browser storage. The Save/Load menu exports two file types: a **full save** (character, story, and message history) and a **character export** (the character and world only — a clean start for a new story). Save files are plain JSON and tolerate minor hand-editing mistakes; the loader repairs common errors and reports the line number of anything it cannot repair.
- **Text-to-speech** — DM messages can be read aloud. See Known Quirks.
- **Message editing** — recent messages can be edited or regenerated, which is also the most effective way to correct the DM when it misbehaves: edit the message before the mistake and redirect.

## Managing token costs

Every message sends the AI a context payload: the system rules, your character sheet, nearby world records, the story summary, and recent messages. The features below control that payload's size. The token counter under the input is the feedback loop — if per-turn usage climbs, one of the following usually explains it.

- **Uncheck old story archives.** The story log panel shows the running summary as archive chunks and recent entries, each with a checkbox. Every checked entry is sent with every message. When an old chapter no longer matters to the current story, uncheck it. This is the single largest saving available in long campaigns.
- **Use the stash.** The full inventory list is sent every turn; the stash is not. Move anything you are not actively carrying into the stash.
- **Exclude idle world records.** Companions, NPCs, and towns each have a checkbox in the sidebar. Unchecked entries are omitted from the payload entirely. Uncheck companions who are elsewhere, NPCs from concluded storylines, and towns you have left behind.
- **Give NPCs and towns a location.** Records whose location matches the current scene are sent in full; everything else is sent as a one-line stub. A companion with no location is treated as traveling with you and is always sent in full — so give stationed characters a location, and leave it empty only for your actual traveling party.
- **Keep the bio focused.** The bio is sent every turn. A paragraph of behavioral anchoring is effective; a page of history is expensive.
- **Prompt caching** is automatic: the rules portion of the context is cached between turns, shown in the counter as cached tokens (billed at a small fraction of the normal rate). Editing the bio or character invalidates the cache for one turn; this is normal.

## Known quirks

- **Text-to-speech requires Chrome.** Firefox and de-Googled Chromium builds ship without the speech voices; TTS will be silent there.
- **The DM occasionally breaks its rules.** It may speak for your character, advance time unprompted, or drift on long sessions. The prompt engineering minimizes this, but no model follows instructions perfectly. The effective corrections are: state the correction directly in-game, or edit the message before the mistake and continue from there. The Haiku model requires this more often than Sonnet.
- **Anthropic models only.** The application calls the Anthropic API directly; other providers (OpenAI, etc.) are not supported.
- **Saves live in your browser.** Clearing site data deletes the autosave. Export a save file periodically; it is the only durable copy.
- **One story per browser profile.** The autosave slot is single; use save files to maintain multiple campaigns.
- **The homebrew classes** (Illrigger — MCDM Productions; Blood Hunter — Matt Mercer) are fan-implemented approximations of their published sources, included for personal use.

## Architecture notes (for the curious)

React + Vite, no backend. Game mechanics are deterministic code; the AI receives game state and returns narration plus machine-readable tags (`[ITEM: ...]`, `[XP: ...]`, `[ROLL: ...]`) that the application parses and applies. The system prompt is split into a static cached portion and a dynamic per-turn portion. Story history is compressed in the background: recent messages ride in full, older ones become summary entries, and old entries are archived into frozen chunks — each stage player-controllable via the checkboxes described above.
