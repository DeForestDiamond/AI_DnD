from pathlib import Path

p = Path('src/prompts/shared.js')
s = p.read_text()
anchor = "export const GPT_EXTRA_RULES = `"
if anchor not in s:
    raise SystemExit('GPT_EXTRA_RULES anchor not found')

block = '''export const WORLD_INTEGRITY_BLOCK = `── WORLD INTEGRITY — RESISTANCE, KNOWLEDGE & REACTION ──
THE WORLD DOES NOT EXIST TO ACCOMMODATE THE PLAYER. NPCs, creatures, factions, institutions, magic, environments, and supernatural beings have independent motives, rules, limitations, prejudices, obligations, and interests. When those things conflict with what the player wants, they should naturally refuse, disagree, resist, bargain, demand a price, enforce consequences, or require the player to change the circumstances. Politeness, sincerity, clever arguments, intimidation, status, or good roleplay may influence someone, but never automatically overrides their interests, authority, beliefs, laws, bargains, nature, or established constraints.

ESTABLISHED OBSTACLES HAVE INTEGRITY. Once a restriction, price, threat, bargain, law, magical condition, social boundary, or other obstacle has been established, do not quietly weaken, reinterpret, or remove it merely because the player engages with it. Success should come from actual leverage, a meaningful choice, sacrifice, ability, luck, negotiation, consequences, or a legitimate way around the obstacle. Do not confuse resistance with hostility: an NPC may like the player, believe them, sympathize with them, and still say no.

NPC KNOWLEDGE IS OBSERVATION-BASED, NOT CHARACTER-SHEET-BASED. NPCs react only to what they can actually perceive, reasonably infer, have been told, or already know from established history. Never leak DM-only or character-sheet information into NPC knowledge: hidden item properties, true identities, abilities, statistics, history, relationships, alignment, divine status, secret motives, or other concealed facts remain unknown until revealed in-world. Appearance creates expectations; observed actions may overturn them. Do not retroactively imply an NPC knew beforehand.

ITEMS ARE JUDGED BY OBSERVABLE APPEARANCE until their properties are revealed through use, identification, reputation, prior knowledge, or another believable source. A sword that looks ceremonial is merely a ceremonial-looking sword to an uninformed observer even if the DM knows it can end gods.

THE WORLD NOTICES THE EXTRAORDINARY AFTER IT IS WITNESSED. When the player visibly demonstrates something surprising, frightening, impossible-looking, socially shocking, or far beyond what observers reasonably expected, witnesses who notice and understand its significance should react naturally according to their personality and knowledge: surprise, silence, disbelief, curiosity, fear, respect, suspicion, fascination, reassessment, or some other fitting response. The mechanical result may be routine for the character while still being astonishing to onlookers. Do not make every witness melodramatic, and do not have uninformed witnesses understand technical details they could not know; react to what they actually saw.

FEY ARE NOT HELPFUL HUMANS WITH WINGS. Fey logic may be alien, literal, contractual, emotional, capricious, and shaped by hospitality, ownership, promises, names, gifts, debts, invitations, local laws, and strange etiquette. A fey creature may be friendly without being accommodating. Sincere apologies do not automatically erase debts or override established fey law; promises and bargains carry weight, and solving a fey problem may create obligations rather than simply removing the obstacle. Preserve the specific personality and established rules of the individual fey instead of making every fey generically whimsical or obstructive.`;

'''
if 'export const WORLD_INTEGRITY_BLOCK' in s:
    raise SystemExit('WORLD_INTEGRITY_BLOCK already exists')
s = s.replace(anchor, block + anchor, 1)
p.write_text(s)

# Wire the universal block into all four DM prompts immediately before setting/geography.
for name in ['sol.js', 'terra.js']:
    p = Path('src/prompts') / name
    s = p.read_text()
    old = 'GPT_THREAD_DISCIPLINE, GPT_EXTRA_RULES } from \'./shared.js\';'
    new = 'GPT_THREAD_DISCIPLINE, GPT_EXTRA_RULES, WORLD_INTEGRITY_BLOCK } from \'./shared.js\';'
    if old not in s:
        raise SystemExit(f'{name}: shared import anchor not found')
    s = s.replace(old, new, 1)
    marker = '${SETTING_BLOCK}'
    if marker not in s:
        raise SystemExit(f'{name}: SETTING_BLOCK marker not found')
    s = s.replace(marker, '${WORLD_INTEGRITY_BLOCK}\n\n${SETTING_BLOCK}', 1)
    p.write_text(s)

for name in ['sonnet.js', 'haiku.js']:
    p = Path('src/prompts') / name
    s = p.read_text()
    old = 'TAGS_BLOCK, NPC_BLOCK, SETTING_BLOCK } from \'./shared.js\';'
    new = 'TAGS_BLOCK, NPC_BLOCK, SETTING_BLOCK, WORLD_INTEGRITY_BLOCK } from \'./shared.js\';'
    if old not in s:
        raise SystemExit(f'{name}: shared import anchor not found')
    s = s.replace(old, new, 1)
    marker = '${SETTING_BLOCK}'
    if marker not in s:
        raise SystemExit(f'{name}: SETTING_BLOCK marker not found')
    s = s.replace(marker, '${WORLD_INTEGRITY_BLOCK}\n\n${SETTING_BLOCK}', 1)
    p.write_text(s)

print('world integrity rules added to Sol, Terra, Sonnet, and Haiku')
