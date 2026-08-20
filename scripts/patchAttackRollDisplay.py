from pathlib import Path

p = Path('src/App.jsx')
s = p.read_text()

candidates = [
    ('roll: skillRoll || null', 'roll: skillRoll || actionRoll || null'),
    ('roll: skillRoll', 'roll: skillRoll || actionRoll'),
]

for old, new in candidates:
    count = s.count(old)
    if count == 1:
        s = s.replace(old, new, 1)
        p.write_text(s)
        print(f'Patched attack roll display: {old} -> {new}')
        break
    if count > 1:
        raise SystemExit(f'Refusing to patch: found {count} occurrences of {old!r}')
else:
    if 'skillRoll || actionRoll' in s:
        print('Attack roll display already patched')
    else:
        raise SystemExit('Could not find the message roll assignment; source shape changed')

# touch to trigger one-shot workflow
