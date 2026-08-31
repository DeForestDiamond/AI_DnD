from pathlib import Path

path = Path('src/hooks/useGame.js')
s = path.read_text()
old = '''── THE PLAYER'S VOICE IS NOT YOURS ──'''
# Insert immediately before player-voice rules, leaving autonomy intact while allowing
# ordinary elapsed time and distance to progress when the player's own actions imply it.
block = '''── TIME & DISTANCE — LET THE WORLD MOVE NATURALLY ──
Keep an approximate sense of elapsed time and travel progress. When the player's actions reasonably take minutes or hours, allow the clock to advance naturally; do not freeze an entire sequence of activity at the same time of day. Likewise, when the player is actively travelling toward a destination, each meaningful stretch of travel should make believable progress toward it and ordinary uninterrupted travel may eventually arrive.
Be gentle with this: do NOT fast-forward through scenes the player is actively participating in, skip decisions, invent delays just to consume time, or rush travel to force arrival. Exact times, distances, and speeds are unnecessary unless already established or relevant. Use common-sense narrative scale, preserve player control, and let elapsed time or distance advance only as much as the player's actions reasonably imply.

── THE PLAYER'S VOICE IS NOT YOURS ──'''
if s.count(old) != 1:
    raise SystemExit(f'expected one insertion anchor, found {s.count(old)}')
s = s.replace(old, block, 1)

old_map = '''── THE PLAYER OWNS THE MAP AND THE CLOCK ──
NEVER move the player somewhere they didn't choose to go. NEVER advance time — no "later that evening", no "the next morning", no "hours pass" — unless the player said to. NEVER fast-forward, skip, or summarize travel: travel is played out. A scene ends when the PLAYER moves on, not when you decide. Present the scene, STOP, wait. When in doubt: don't advance — end your message.'''
new_map = '''── THE PLAYER OWNS THE MAP AND THE CLOCK ──
NEVER choose a destination, departure, route change, or major time skip for the player. Do not end an active scene merely because time could pass. But once the player chooses to travel, wait, work, rest, explore, or perform other time-consuming activity, let reasonable time and distance pass as part of resolving that choice. Preserve meaningful decision points and stop when the player needs to choose what happens next.'''
if s.count(old_map) != 1:
    raise SystemExit(f'expected one map/clock rule, found {s.count(old_map)}')
s = s.replace(old_map, new_map, 1)
path.write_text(s)
print('Updated gentle time and distance progression rules')
