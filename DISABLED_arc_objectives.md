# Arc objectives — DISABLED

Everything below is dormant code. It runs, it stores data, and it renders UI, but
**nothing it produces reaches the DM**. If you are reading this because you found
objective code and wondered whether it was live: it is not.

Disabled on the `main` branch. Nothing was deleted.

---

## Why it was turned off

Two reasons, and the second one is the one that actually forced it.

**1. It went stale immediately.** The system gave the DM a goal and one live
objective, expecting the DM to pursue it and close it when done. In practice the
story moved faster than the objective did. Three turns after an objective was
written it usually described a situation that no longer existed, so the prompt
was spending tokens asserting something untrue — worse than saying nothing.

**2. It was expensive in a non-obvious way.** The `ARC PROGRESS` section lived in
the **cached** part of the system prompt. That looks cheap — a cached read of the
whole static block is about **$0.003** — but prompt caching is prefix-based, so
*any* change to that block invalidates it. Every objective completion and every
new objective therefore rewrote the entire ~9,400-token static prompt at
$3.75/M, about **$0.035 a time**.

So the system got more expensive the better it worked. Completing objectives —
the thing it existed to do — was the thing that cost money.

A third, softer reason: the DM would not reliably emit `[OBJECTIVE DONE: n]`.
That was escalated three times (static block → tag docs → the BEFORE YOU WRITE
contract) and never held, which is why the header ✓ button was added to let the
player mark completion instead. If this is ever revived, assume the DM will not
self-report and design around that.

---

## What is still in the code

Nothing here is wired to the prompt. All of it is inert.

### `src/hooks/useGame.js`
| What | Where |
|---|---|
| `ARC_OBJECTIVES_IN_PROMPT = false` | the flag, near the top of `buildCtxSections` |
| `objectivesSection` builder | gated behind the flag — returns `''` while false |
| `objectivesSection` passthrough | returned from `buildCtxSections`, consumed in both prompt builders |

The section is still interpolated into both prompts. It contributes an empty
string, so it costs nothing while the flag is false.

### `src/hooks/useCharacter.js`
| What | Where |
|---|---|
| `[OBJECTIVE DONE: n]` handler | in `applyEffects` — still parses if the DM ever emits one |
| `[OBJECTIVE: text]` handler | same block — appends a new objective |
| migration v16 | ensures `arc.objectives` is an array and `arc.goal` is a string |

The tag handlers are harmless: the DM is no longer told these tags exist, so they
will not appear.

### `src/App.jsx`
| What | Where |
|---|---|
| `generateObjectives()` | the goal + first objective API call — **only reachable from the panel's manual button** |
| `completeCurrentObjective()` | marks the live objective done, queues a note for the next message |
| `objectiveNoteRef` | one-shot note appended to the next outgoing API message |
| header objective strip | shows the live objective with a ✓ button, hidden when there is none |
| props to `Sidebar` | `arcObjectives`, `arcGoal`, `onSetArcGoal`, `onGenerateObjectives`, `onSetObjectives` |

**Note:** `completeCurrentObjective` still injects its `[SYSTEM: ...]` note into
the next API message if you press ✓ in the header. That is the one piece of
dormant code that can still reach the model. It only fires on an explicit tap and
only when an objective exists, which cannot happen without manually generating
one first.

### `src/components/Sidebar.jsx`
| What | Where |
|---|---|
| `ObjectivesPanel` | 🗺️ ARC OBJECTIVES section in Settings — edit, add, remove, tick, regenerate |

Auto-generation is gone from both places it used to fire (arc completion and new
campaign start), so the panel starts empty and stays empty unless you press
**GENERATE ARC GOAL** yourself.

---

## How to re-enable

1. **`src/hooks/useGame.js`** — set the flag:
   ```js
   export const ARC_OBJECTIVES_IN_PROMPT = true;
   ```
   That alone restores the `ARC PROGRESS` section in both prompts.

2. **Restore the tag documentation.** It was removed from `CORE TAGS`. Add back:
   ```
   Objective completed: [OBJECTIVE DONE: 3] — ALWAYS pair it with the next step in the same message: [OBJECTIVE: track the buyer who paid for the third vault key]
   Set the next objective: [OBJECTIVE: ...] — one sentence, concrete and checkable, a step toward the arc GOAL
   ```
   Without this the DM does not know the tags exist and will never close an
   objective on its own.

3. **Optionally restore the contract check.** It was item 7 of BEFORE YOU WRITE
   in both prompts, removed and the loot check renumbered 8 → 7. If restoring,
   renumber the loot check back to 8 and add:
   ```
   7. Did anything this message FINISH the current arc objective? If so, tag it NOW: [OBJECTIVE DONE: n] plus [OBJECTIVE: the next step]. This is the easiest thing to forget — check before you send.
   ```
   Be aware this never worked reliably.

4. **Optionally restore auto-generation.** Two `setTimeout` calls to
   `generateObjectives` were removed — one in the `[ARC COMPLETE]` branch of
   `handleSend`, one in `beginAdventure` after `arcAntagonist` is chosen. Both
   were fire-and-forget with a `.catch` that logged failure.

---

## If you revive it, fix these first

- **Keep it out of the cached block.** Put the section in the dynamic tail with
  the rest of the volatile state. It is small; paying $3/M for ~200 fresh tokens
  is far cheaper than rebuilding 9,400 cached ones whenever it changes.
- **Do not rely on the DM to close objectives.** Use the player-driven ✓ button
  as the primary mechanism; treat any `[OBJECTIVE DONE:]` from the DM as a bonus.
- **Reconsider whether an objective should persist at all.** The core problem was
  not the plumbing, it was that a written-down objective ages badly in an
  improvised story. Something that *summarises what the player is currently
  chasing*, regenerated rather than stored, might survive contact with play
  better than something written once and asserted for twenty turns.

---

## What replaced it

Nothing, deliberately. The arc **antagonist** alone provides direction — it is
hidden, it is asserted every turn, and the DM ties events back to it. That turned
out to be sufficient structure; the objectives were adding bookkeeping on top of
something that already worked.
