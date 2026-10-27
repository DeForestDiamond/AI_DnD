# Campaign memory

Full saves still use `storySummary` JSON with `chunks` and `entries`. Existing
archives are retained. New saves additionally store:

- `memory`: complete `continuity`, `history`, `recent`, and `corrections` strings.
- `coverage`: count, last message ID and a content fingerprint of the boundary.
- `memoryMode`: `layered` (default) or `legacy` (original archive system).
- Up to two previous memory revisions. Source entries have message ranges.

Layered mode sends the latest memory and all messages after committed coverage,
not the entire accumulated archive. The helper rewrites the full memory using
new messages, previous memory, and explicit player-correction evidence. Unresolved
commitments and personal memories have soft length guidance, not deletion limits.
Corrections are applied to the memory fields and then retired. The correction
field holds only unresolved reconciliation issues. Normal updates include new
correction evidence with source-message positions, not the entire old correction
transcript. Rebuilds still consult all source corrections so unused old archives
cannot restore a retconned event. Later events may supersede a corrected fact;
an old "not met yet" correction does not undo a subsequent real introduction.

All providers share the same prompt and JSON validation. No provider/model change
is part of this feature.

The first eligible turn migrates a legacy save using its retained archives,
recent entries, the last 48 covered messages and player corrections from the
whole transcript. This one-time request finishes before gameplay continues.
Migration is not a forensic rebuild of every original message: uncorrected errors
already in legacy archives may survive. Detailed sources remain available for
review. The uploaded save itself is not modified by the implementation.

Coverage advances only after valid output is committed. While an update is in
flight or fails, unsummarized messages stay in the DM context. Incomplete or
malformed output is rejected. Stable ownership across React renders prevents
concurrent jobs and stale commits after a save load, timeline edit or mode change.
An invalidated timeline keeps a recovery copy but does not send its abandoned facts.

Story Log displays current memory and collapsible retained records. “Switch to
original archives” returns to the old prompt format and compression engine; it
uses the old estimate only for legacy files without coverage metadata. Re-enabling
layered mode reconciles the source records again. Keep a pre-update full-save
export for an exact rollback to the old campaign snapshot.

Run `node --test tests/*.test.mjs` and `npx vite build`. Tests mock provider replies;
they validate transport, storage, migration evidence and failure handling, not the
quality or completeness of live model-written memory.
