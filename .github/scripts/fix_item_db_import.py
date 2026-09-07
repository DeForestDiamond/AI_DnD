from pathlib import Path
p = Path('src/hooks/character/useCharacter.js')
s = p.read_text()
old = "import { SLOTS, EMPTY_SLOTS, parseDMItem } from '../../constants/items.js';"
new = "import { ITEM_DB, SLOTS, EMPTY_SLOTS, parseDMItem } from '../../constants/items.js';"
if old not in s:
    raise SystemExit('Expected import line not found')
p.write_text(s.replace(old, new, 1))
