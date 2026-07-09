# Build Plan — Inventory Storage + AI-Assisted Selling

Two separate problems that got tangled together. Different fixes, do them in order.
Plain-English roadmap — the *what*, the *why*, the *order*. Not code.

**Branch, don't push to main.** Feature 1 changes how the save stores inventory —
a bug there could corrupt or lose items. Same discipline as the save-and-npcs
work: build on a branch, test against real saves (Lucian has ~4000+ stacked
items and a 4892-line stash — the perfect stress test), merge only after the
migration and removal are proven on the preview URL.

---

## Problem 1 — 4000 identical lines in the save (storage, not display)

**Current state (important — the bloat is narrower than it looks):**
- The DISPLAY and the PROMPT are already fine. `stackInventory()` (useGame.js)
  collapses the array into `{ name: count }` before anything shows it or sends
  it to the DM. So the sidebar and the AI already see "Dreamleaf Cigarillo x4000",
  NOT 4000 lines.
- The ONLY place 4000 literal `"Dreamleaf Cigarillo"` strings exist is the raw
  `character.inventory` ARRAY (and therefore the save file on disk). Same for
  `character.stash`.
- Why it's an array of individual strings: a long-ago decision. Item removal uses
  exact string matching, and an earlier "Item x10" experiment broke removal. So
  individual entries were chosen for correctness. At 4000 entries that tradeoff
  has clearly outlived its usefulness — save bloat, slow saves, unmanageable JSON.

**Note:** the REMOVE handler ALREADY supports `[REMOVE: Name | qty:N]` and loops
N times. And `stackInventory` already exists and is used everywhere for display.
So most of the "counts" machinery is already present — this is a storage-layer
change, not a rewrite.

**The fix — store counts, not repeats:**
Change `character.inventory` from `["Cigarillo","Cigarillo",...]` to a stacked
form `{ "Dreamleaf Cigarillo": 4000, "Iron Dagger": 1, ... }` (or an array of
`{name,count}` — decide during build; object is simpler). Then:
- Adding an item: `inv[name] = (inv[name]||0)+qty` instead of pushing N strings.
- Removing: `inv[name] -= qty; if (inv[name]<=0) delete inv[name]` — no more
  find-index-loop, and it's exact-match safe by construction.
- Display/prompt: `stackInventory` becomes a passthrough (data is already stacked)
  or is removed and callers read the object directly.
- Equipment slots, bags (`contents:{name:count}` — already count-based!),
  customItems, stashedCustomItems: check each consumer. Bags are already the
  right shape, which is a good model to copy.

**Migration (v11):** convert existing array-form inventory/stash to the new
stacked form on load. Bump SAVE_VERSION. This is why it's branch work — every
old save has array-form inventory and must convert cleanly. Test against Lucian
(4000+ items), Darasim, Sylran (363 stash), Zaydel.

**Watch out for:**
- Every place that reads `character.inventory` as an array (`.map`, `.length`,
  `.findIndex`, `.some`, `.filter`, spread). Grep for `.inventory` and audit each.
  `.length` for "how many items" changes meaning (distinct vs total count).
- The REMOVE tag handler rewrites to decrement counts.
- Item ADD handler (`[ITEM:]`) rewrites to increment.
- Sort-alphabetical (just added) reads entries — should still work on the object.
- "If it ain't broke": the DISPLAY layer barely changes since it already stacks.
  The risk is all in the storage/removal/migration seam.

**Scope:** medium. Not hard, but touches a load-bearing field, so the CARE is in
auditing every `.inventory` consumer and testing migration. ~1-2 focused sessions.

---

## Problem 2 — Selling is painful (AI-assisted, mirrors NPC extraction)

The NPC-extraction pattern worked great; this reuses it exactly. Selling is
tedious because there's no bulk flow and no pricing — the player has to haggle
each item through the DM narratively.

**The flow:**
1. A "Sell" mode in the inventory panel: checkboxes to select items (and
   quantities) to sell — reuse the multi-select UI that already exists for
   bag-creation.
2. Hit "Appraise & Sell" → a DEDICATED API call (own focused prompt, like
   extractNPCs and the summarizer) gets the selected items + light context
   (maybe current location/merchant type for price flavor) and returns a
   per-item gold value as JSON: `{ "items": [{ "name":..., "qty":..., "each":..., "total":... }], "grandTotal": N }`.
3. App shows the appraisal for CONFIRMATION (don't auto-sell — the player
   approves first, like a real merchant offer). Player can deselect any item
   they don't want to sell at that price.
4. On confirm: remove the sold items/quantities from inventory, add `grandTotal`
   to gold. Both are plain state writes (decrement inventory counts — pairs
   naturally with Problem 1's stacked storage — and `c.gold += total`).

**Why a separate call, not the DM:** consistent pricing (the DM improvises wildly
different values), bulk in one action instead of narrating each sale, and no
derailing the scene. Same rationale as moving NPC curation out of the live DM.

**Design decisions to make during build:**
- Pricing basis: does the AI price from item name/description alone, or do we
  feed it rarity/type hints from customItems? Name-only is simpler and probably
  fine (it's a game, not an economy sim).
- Location awareness: sell prices could vary by where you are / who's buying
  (the Chained Market vs a backwater). Optional flavor — could pass
  `currentLocation`. Nice-to-have, not v1.
- Confirmation UI: reuse the appraisal-list pattern; each row a checkbox so the
  player trims the sale before accepting.

**Depends on Problem 1?** Not strictly, but they PAIR: selling removes items, and
if inventory is still array-form, bulk-removing 500 cigarillos means splicing 500
times. With stacked storage it's one decrement. So do Problem 1 first, then Problem
2's removal is trivial.

**Scope:** medium. Sell-select UI (reuse bag multi-select), one API call + prompt
(mirror extractNPCs), appraisal/confirm UI, and the remove+gold write. Buildable
in parts: appraise-only (shows values, no sell) → confirm+sell → location flavor.

---

## Suggested order

1. **Problem 1 (stacked storage + v11 migration)** — foundational, makes the save
   sane and makes selling's removal trivial. Test hard against Lucian's monster hoard.
2. **Problem 2 (AI selling)** — build on the stacked storage. Appraise → confirm → sell.

Both on one branch. Test on the Vercel preview with real saves before merge.
Export Lucian (the 4000-cigarillo save) as the primary test fixture.

## Things already true that make this easier
- `stackInventory` already exists and is used for all display/prompt — the counts
  concept is already in the codebase.
- REMOVE already supports `qty:N`; bags already store `contents:{name:count}` —
  a working model for count-based storage to copy.
- extractNPCs + the summarizer are proven templates for the dedicated-API-call
  selling flow.
- Bag multi-select UI already exists to reuse for sell-selection.
