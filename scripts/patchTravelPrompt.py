from pathlib import Path

OLD = "Short uneventful travel may be summarized briefly; journeys of a day or more should include one concrete event or observation, and an [ENCOUNTER] directive must play out rather than be skipped."
NEW = "TRAVEL: Uneventful travel may pass uneventfully, including journeys lasting days. Do not invent encounters, complications, discoveries, or interruptions merely because the player is travelling. If the app supplies an [ENCOUNTER] directive, play that encounter normally. Otherwise, summarize travel as briefly as appropriate unless existing story events logically interrupt it."

paths = [Path('src/hooks/useGame.js'), Path('scripts/thinGptPrompt.mjs')]
for p in paths:
    s = p.read_text()
    n = s.count(OLD)
    if n != 1:
        raise SystemExit(f'{p}: expected exactly one travel-rule anchor, found {n}')
    p.write_text(s.replace(OLD, NEW, 1))
    print(f'Updated travel rule in {p}')
