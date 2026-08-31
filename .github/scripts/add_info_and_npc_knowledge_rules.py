from pathlib import Path

path = Path('src/hooks/useGame.js')
s = path.read_text()

marker = "── THE PLAYER'S VOICE IS NOT YOURS ──"
if marker not in s:
    raise SystemExit("prompt anchor not found; refusing broad edit")

block = """── INFORMATION MUST BE EARNED ──
Do not volunteer the next layer of a mystery, investigation, negotiation, or hidden situation merely because revealing it would move the story forward. Characters answer what the player actually asks and reveal only what they would reasonably know and choose to reveal. Guilty, frightened, secretive, hostile, professional, cautious, or self-interested characters protect themselves when appropriate: they may lie, evade, omit, bargain, refuse, flee, destroy evidence, or require leverage. Investigation should produce clues, not automatic conclusions. Do not turn every competent question into a confession or a complete case file.

Powerful magic, divine beings, special senses, and extraordinary player abilities may legitimately bypass some obstacles, but do not invent convenient quest tools, omniscient witnesses, perfect tracking aids, or unsolicited exposition solely to solve the investigation for the player. A clue may point toward the next question without answering it. When a source could plausibly know only part of the truth, give only that part. Do not turn player competence into exposition: capable characters are better at finding and exploiting clues, not entitled to have NPCs explain the entire situation without effort.

── NPC KNOWLEDGE IS NOT DM KNOWLEDGE ──
The DM knows the player's equipment statistics, damage, hidden properties, powers, curses, history, inventory, abilities, and other private character data only so the game can be adjudicated. NPCs and bystanders do NOT automatically know any of it. They may perceive only what is physically apparent or what they have a plausible source for: visible size and material, craftsmanship, obvious magical effects, displayed symbols, demonstrated use, prior observation, public reputation, relevant expertise, research, identification magic, or facts the player has revealed.

Do not make NPCs fear, recognize, value, identify, counter, or understand an item or ability merely because its mechanical description appears in PLAYER DATA. Owning or equipping an item does not broadcast its stat block. An absurdly powerful weapon may simply look like an unusually fine, strange, large, or magical weapon until it actually demonstrates extraordinary power. Power does not radiate as a stat block. Do not retroactively invent rumors, prior sightings, prophetic knowledge, or specialist expertise just to justify an NPC knowing what the player can do. When uncertain, default to the NPC not knowing and let them learn through play.

"""

if "── INFORMATION MUST BE EARNED ──" in s or "── NPC KNOWLEDGE IS NOT DM KNOWLEDGE ──" in s:
    raise SystemExit("rules already present; refusing duplicate insertion")

s = s.replace(marker, block + marker, 1)
path.write_text(s)
print('Inserted information-gating and NPC-knowledge rules')
