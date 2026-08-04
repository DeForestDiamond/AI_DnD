# Plan: ten levels per class

Not started. This is the design, the reasoning, and the decisions already taken,
so the work can begin cleanly in a later session.

## Goal

Compress 5e's twenty class levels into ten in-app levels, so a character can keep
progressing — and keep trying different things — without abandoning the world
they have built and starting again.

## The mapping is already right

App tier N = 5e spell level N. Tier 1 gives 1st-level spells, tier 5 gives
5th-level spells. Verified against the existing data.

That means going to ten tiers is **pure extension, not remapping**. Tiers 1-5
stay exactly as they are, existing characters keep everything they have, and no
migration is needed for the ability data.

- **Full casters** (Wizard, Cleric, Sorcerer, Druid) — tiers 6-9 are 5e spell
  levels 6-9; tier 10 is the capstone.
- **Half casters** (Paladin, Ranger, Artificer) — 5e caps them at 5th-level
  spells, so tiers 6-10 are class FEATURES from 5e levels 11-20.
- **Warlock** — tiers 6-9 are Mystic Arcanum, one spell each, plus invocations.
- **Martials** (Fighter, Rogue, Monk, Barbarian, Blood Hunter, Illrigger) —
  tiers 6-10 are features from 5e 11-20.

## Decisions taken

**Multiclass cap goes 5 → 10.** Ten classes at ten levels makes a character
"level 100" rather than 50, and that is fine: the game has no enemy damage
system, so encounters are narrative and power scaling is whatever the player
decides it is. A player can already build a companion capable of anything at
level 1.

**High cap is the point, not a side effect.** The value is being able to explore
different builds inside one continuing character rather than rolling a new one
and losing the world.

**XP thresholds will need raising**, shape not yet decided. Left for later; the
current curve is not blocking.

## The thing that actually matters: curation

Most spells in the list **do nothing mechanically**. The app rolls weapon attacks
and skill checks; it does not implement spell effects. So Pass Without Trace does
not grant +10 to Stealth, Guidance does not add 1d4, Bless does nothing to a
saving throw. They are names the DM narrates around.

That is acceptable for a spell that changes what is POSSIBLE — Fly, Teleport,
Counterspell, Polymorph, Raise Dead, Wish — because the DM can act on it. It is
noise for a spell whose entire content is a modifier to a roll nobody makes.

And the cost is real. Only the abilities a character KNOWS reach the prompt, but:

| | Abilities known | Prompt cost |
|---|---|---|
| Wizard L5 | 67 | ~270 tokens |
| Wizard L10 | **188** | **~750 tokens** |

Tripling the list also dilutes the DM's attention across options it cannot
meaningfully distinguish.

**So the expansion should thin as it extends.** Two jobs, done together:

1. **Audit the existing 385.** Cut or merge anything whose only effect is an
   untracked numeric modifier. Keep anything that changes what is possible.
2. **Add tiers 6-10 selectively** — the memorable, distinct, high-impact spells
   only. Not exhaustive 5e coverage.
3. **Reduce `spellsKnown` counts** so a level 10 caster knows something like
   40-60 meaningful spells rather than 150 mostly-inert ones.

The target is a level 10 caster whose ability list is SHORTER and more useful
than a level 5 caster's is today.

## Decision: split martial abilities into their own bucket — do this FIRST

Right now the `spells` field carries whatever a class has. Monk's "Diamond Soul"
and Barbarian's "Relentless Rage" live in a field called spells; Paladin's list
mixes Lay on Hands and Divine Smite (features you always have) with Bless and
Cure Wounds (spells you cast). Fighter and Rogue are empty entirely, so those
players get nothing to pick at all.

Split into three buckets: **martial**, **spells**, **cantrips**.

Why this comes before any of the tier work:
- It is semantically true. A technique is not a spell.
- It fixes the counts. "Fighter picks 6 spells" is nonsense; "Fighter picks 6
  martial techniques" is not. Half-casters correctly pick from both.
- It makes the ten-level work obvious. Martial tiers 6-10 go in the martial
  list, caster tiers 6-9 in the spell list — no judgement calls about which
  field a thing belongs in.

Doing it after Fighter would mean writing Fighter's features into `spells` and
moving them a session later.

### What it involves
- A `martial` array per class alongside `cantrips`/`spells`, with `martialKnown`
  counts
- An `abilities.martial` selection bucket
- A third section in the picker — it already handles cantrips/spells/infusions,
  so it is the same pattern
- Migration: **only add the empty field**. No data movement. The only affected
  save is the developer's own, and clearing the stale selections by hand in the
  JSON is quicker than writing a mapper for a one-off.

## Structural note: Fighter's tiers should be subclass-independent

Fighter's ten tiers should carry the features every Fighter gets — Action Surge,
Extra Attack, Indomitable, the third and fourth attacks. Subclass features stay
in SUBCLASSES. Otherwise Battle Master and Eldritch Knight need separate tier
lists and the data doubles.

## Correction to an earlier note in this document

Only SELECTED abilities reach the prompt — `char.abilities` is what the player
picked. The 150/188 figures quoted above are the CAPS on how many may be
selected, not what is sent. Selecting is the mechanism that limits the prompt,
not something that adds to it.

The caps are still generous (50 selectable at tier 5 against about 14 for a 5e
wizard at that level), and `spellsKnown` already defines all ten tiers — so the
counts side of this work is already done. Only the ability LISTS stop at 5.

Curation still matters, but for the picker rather than the prompt: choosing well
from 120 options is the problem to solve.

## Knock-on work

- ~150 new SPELL_INFO entries for whatever survives curation (role + one-line
  description, same telegraphic register as item labels)
- Multiclass features extended 5 → 10 for all fourteen classes
  (casters were only extended to 5 in commit abc22eb)
- Level caps wherever 5 is hard-coded
- XP thresholds, eventually

## Order of work

1. Curation audit first — it shrinks everything downstream
2. Martials next: pure features, no spell authoring, quick wins
3. Warlock: only four arcanum spells
4. Half casters: features only
5. Full casters last: the big authoring job, and the one that benefits most
   from the audit being done first
