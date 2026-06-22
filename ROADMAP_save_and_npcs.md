# Build Plan — Save Migration, NPC Auto-Save, In-Game NPC Editing

Plain-English roadmap for three interlocking features that all touch save-file
structure. Written for whoever builds this next (Mike, Claude on Opus, or a
later session). Not code — the *what*, the *why*, and the *order*.

**Do all of this on a branch (e.g. `save-and-npcs`), not main.** Every feature
here writes to the save file. A bug in load/migration can brick a campaign, so
this needs a Vercel preview URL and testing against real exported saves —
including at least one OLD save from a previous character (older schema) — before
anything merges to main.

---

## Background: how NPC/location data works today

The save already has the right structure, it's just not auto-populated:

- `character.companions` — `{ name: { race, role, appearance, personality, status, relationship, location, slots, notes, ... } }`
- `character.npcs` — same shape, for non-companion characters
- `character.towns` — `{ name: { desc, status, locations, residents } }`

The prompt builder (`useGame.js`, the `companionSection` / `npcSection` /
`townsSection` builders) already does **proximity-tiered hydration**: if an
NPC/town's `location` matches the current `[LOCATION:]` tag, the FULL record is
sent; otherwise only a thin stub (name + relationship) goes to the API to save
tokens. This is good context engineering and should NOT be changed — it's the
lazy-loading layer. Example: Lucian owns a house in Deepwater → the AI always
knows he owns it (stub), but the "3 bedrooms, market district, copper tub"
detail only loads when the Deepwater location tag is active.

**The leak:** NPCs and companions are currently *manual-only*. The only way a
character gets into `character.npcs` is by exporting the save and hand-editing
JSON. So any NPC the DM invents in play exists ONLY in the rolling story
summary — and when an old summary archive is deselected/pruned to save context,
that NPC's description vanishes with it. The hydration system is sound; nothing
reliably *fills* it.

Note: an `[NPC:]` tag was once in the prompt but **the parser was never built** —
the DM emitted the tag and it hit nothing. It was removed from the prompt to stop
advertising a dead tag. The real fix was the other direction: build the handler.

---

## Feature 1 — Save Migration (do this FIRST)

**Why first:** every other feature writes to `npcs`/`companions`/`towns`, and
old saves may be missing those fields or have them in an older shape. A migrator
guarantees a known shape before any other code touches the save.

**What it is:** one function, `migrateSave(save)`, run on EVERY load (wire it
into the unified load handlers — `applyLoadedFull` / `applyLoadedCharacter` in
`App.jsx`). It reads `save._v` (the existing `SAVE_VERSION` field) and fills in
anything missing with sane defaults before the game uses the save.

**Defaults to backfill** (consolidates the scattered `char.arc?.x` optional-
chaining we've accumulated):
- `arc` → `null` (no antagonist)
- `pacing` → `'normal'`
- `companions` / `npcs` / `towns` → `{}` if absent
- `contextExclusions` → `{ companions:{}, npcs:{}, towns:{} }`
- companion entries → ensure the six expected fields exist (backfill blanks)
- bump `_v` to current `SAVE_VERSION` after migrating

**Payoff:** old saves load clean and upgrade to current shape automatically;
the rest of the code can stop defensively checking for missing fields; hand-edits
get safer because a malformed/incomplete save is repaired at the door instead of
crashing.

**Scope:** ~30 min. One function + a defaults table + wiring into the (already
unified) load paths. The CARE is in testing — it runs on every load, so test
against real saves (incl. an old-schema one) on the preview URL before merge.

---

## Feature 2 — Manual NPC Extraction via a separate API call (the main feature)

This is the good idea. It takes NPC-curation judgment AWAY from the live DM
(which is bad at deciding mid-scene who matters — it'd save every merchant or
forget the important ones) and gives it to the player, after the fact, when they
actually know who mattered. Same principle as the dice roller and encounter
clock: don't make the model judge in-band.

**Prerequisite UI — message numbers in the feed:** show a small, greyed message
number beside each message in `MessageFeed.jsx`. Useful on its own; required so
the player can specify ranges.

**The flow:**
1. Player triggers a "Save NPC" action, gives a NAME and a MESSAGE RANGE
   (e.g. "Elara, 104–120").
2. App pulls those messages from the full log (`fullLog`).
3. A DEDICATED API call (its own focused prompt, like the summarizer has) gets
   ONLY those messages + one job: "read these, return a structured NPC entry for
   Elara — appearance, personality, relationship to the player, current status —
   as JSON matching the npcs field shape."
4. App writes the returned entry into `character.npcs` (or `companions` if the
   player flags them as one).

**Why a separate call, not an in-band tag:** no dead tag cluttering every
response, no Haiku fumbling a multi-field format mid-combat, and the entry is
built from the RAW MESSAGES — so it's vivid and first-hand, NOT inherited from
the thrice-compressed summary. This sources the character bible from primary
text, which is strictly better than any automatic in-scene approach.

**Modes:**
- **Create:** new NPC from a range.
- **Update:** NPC already exists → send the existing entry + new messages, get
  back a merged/updated entry. (This is how dedup is solved — the PLAYER aims the
  update, so the app never has to guess if two descriptions are the same person.)
- **Multi-find:** "scan 104–140, pull out anyone worth keeping" → returns several
  entries at once, for when naming them one-by-one is tedious. Still
  player-triggered, so random merchants never get saved unless asked for.

**Reads back into:** the existing proximity-tiering in the prompt builder, with
zero changes there. Store fixes persistence; tiering keeps doing transmission.

**Scope:** medium. Message numbering (small), a new API call + its prompt
(medium, mirror the summarizer's structure), a write-to-`npcs` handler
(small), trigger UI (small). Can be built in parts: message numbers → single
create mode → update mode → multi-find. Each part is usable on its own.

---

## Feature 3 — In-Game NPC Editing

**What it is:** a sidebar panel where the player taps an NPC/companion and edits
their fields directly (fix a detail, add a note, correct a relationship) without
touching JSON. Also allows manual-create and delete.

**Why:** even with Feature 2, the player will want to tweak — fix an extraction
the AI got slightly wrong, add a detail the AI couldn't know, retire a dead NPC.

**Scope:** small-to-medium, pure UI + the same write handlers Feature 2 uses.
Build it after Feature 2 so they share the write path.

---

## Suggested order

1. **Feature 1 (migration)** — unblocks everything, guarantees field shape.
2. **Feature 2, in parts** — message numbers → create → update → multi-find.
3. **Feature 3 (edit panel)** — reuses Feature 2's write handlers.

All on one branch. Test on the Vercel preview URL with real exported saves
(including an old-schema one) before merging to main. Export a couple of real
saves to use as test fixtures BEFORE starting — a migrator tested only on
current saves hasn't really been tested.

---

## Things already true that make this easier

- Load paths are already unified (`applyLoadedFull` / `applyLoadedCharacter`),
  so migration wires into one place.
- The `npcs` / `companions` / `towns` store already exists with a known shape.
- Proximity tiering already reads from that store — no changes needed there.
- The summarizer is already a working example of a separate, focused API call
  with its own prompt + ground-truth injection — Feature 2's call mirrors it.
- Tag-parser patterns (ITEM/REMOVE/UPDATE/UNEQUIP in `applyEffects`) are the
  model for any handler work, though Feature 2 deliberately uses a separate call
  instead of an in-band tag.
