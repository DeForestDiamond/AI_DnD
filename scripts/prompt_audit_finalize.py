from pathlib import Path

p=Path('src/hooks/useGame.js')
s=p.read_text()

# The objective prompt feature is fully disabled and documented elsewhere; after
# removing its dead template, the exported flag has no consumers anywhere.
s=s.replace("// Arc objectives are DISABLED — see DISABLED_arc_objectives.md in the repo root\n// for why, what is still wired up, and how to bring it back.\nexport const ARC_OBJECTIVES_IN_PROMPT = false;\n\n", "// Arc objectives are disabled; see DISABLED_arc_objectives.md for the retained UI/storage/tag machinery.\n\n", 1)

# Historical name from when this variable only described Dex fighters.
assert s.count('const dexBuild = playstyleLine(char);') == 1
assert s.count('${dexBuild}') == 1
s=s.replace('const dexBuild = playstyleLine(char);', 'const playstyle = playstyleLine(char);', 1)
s=s.replace('${dexBuild}', '${playstyle}', 1)

assert 'ARC_OBJECTIVES_IN_PROMPT' not in s
assert 'dexBuild' not in s
p.write_text(s)
print('final prompt source hygiene applied')
