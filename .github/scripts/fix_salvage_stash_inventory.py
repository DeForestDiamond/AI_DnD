from pathlib import Path

path = Path('src/App.jsx')
s = path.read_text()
old = "inventory: takeStack(next.inventory, recovered.name, count),"
new = "inventory: takeStack(next.inventory, recovered.name, count).stacks,"
count = s.count(old)
if count != 1:
    raise SystemExit(f'Expected exactly one salvage stash takeStack bug, found {count}')
s = s.replace(old, new, 1)
path.write_text(s)
print('Fixed salvage-to-stash inventory assignment to store the stack list, not the takeStack result wrapper')
