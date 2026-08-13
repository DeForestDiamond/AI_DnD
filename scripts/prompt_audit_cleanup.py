from pathlib import Path
import re

p = Path('src/hooks/useGame.js')
s = p.read_text()

# 1) One authoritative playstyle map instead of two drifting class ternaries.
anchor = "const directivesBlock = (char) => {\n  const d = char?.directives?.trim();\n  return d ? `── PLAYER STANDING INSTRUCTIONS (the player set these directly — always honor them) ──\\n${d}\\n\\n` : '';\n};\n"
playstyle = r'''

// Compact class identity hints. Detailed mechanics still come from ABILITIES;
// this only tells the DM what sort of character it is looking at. Keep this
// centralized so model-specific prompt builders cannot drift apart.
const PLAYSTYLE_BY_CLASS = {
  Fighter: 'Fighter — martial specialist; weapons, armor, disciplined combat, and repeated attacks.',
  Wizard: 'Wizard — Intelligence-based full caster; broad prepared arcane magic and ritual expertise.',
  Rogue: 'Rogue — Dexterity-based skill expert; stealth, precision, mobility, and Sneak Attack.',
  Cleric: 'Cleric — Wisdom-based divine caster; deity, healing, wards, and domain magic matter.',
  Artificer: 'Artificer — Intelligence-based magical inventor; arcane firearms, infusions, constructs, and fabrication. Arcane firearms need no ammo.',
  Illrigger: 'Illrigger — Charisma-based infernal knight; Baleful Interdict seals, Invoke Hell, and ruthless martial magic.',
  Monk: 'Monk — Dexterity/Wisdom martial artist; unarmed strikes, Ki techniques, speed, and no armor.',
  Barbarian: 'Barbarian — Strength/Constitution bruiser; Rage, Reckless Attack, endurance, and direct violence.',
  Warlock: 'Warlock — Charisma-based pact caster; Eldritch Blast, invocations, and patron-granted magic.',
  'Blood Hunter': 'Blood Hunter — martial monster slayer; Crimson Rites, Blood Curses, and self-sacrificing blood magic.',
  Paladin: 'Paladin — armored divine martial; oaths, smites, protective auras, and Charisma-backed conviction.',
  Ranger: 'Ranger — Dexterity/Wisdom hunter; tracking, ranged or finesse combat, wilderness expertise, and nature magic.',
  Sorcerer: 'Sorcerer — Charisma-based full caster; innate magic shaped through metamagic and raw magical talent.',
  Druid: 'Druid — Wisdom-based primal caster; nature magic, battlefield control, healing, and Wild Shape.',
  Bard: 'Bard — Charisma-based full caster and skill expert; Bardic Inspiration, performance, social leverage, and flexible magic.',
  'Monster Hunter': 'Monster Hunter — Dexterity/Wisdom supernatural predator; studies quarry, prepares countermeasures, tracks relentlessly, and exploits weaknesses.',
  Gunslinger: 'Gunslinger — Dexterity firearm specialist; grit, trick shots, fast draws, precision, and aggressive ranged mobility.',
};

const playstyleLine = (char) => {
  const text = PLAYSTYLE_BY_CLASS[char?.cls?.name];
  return text ? `\n- PLAYSTYLE: ${text}` : '';
};
'''
if 'const PLAYSTYLE_BY_CLASS' not in s:
    assert anchor in s, 'directives anchor missing'
    s = s.replace(anchor, anchor + playstyle, 1)

# buildCharBlock old playstyle ternary.
pat1 = re.compile(r"  const playstyle\s+= char\.cls\?\.name==='Artificer'.*?\n    : '';", re.S)
s, n = pat1.subn("  const playstyle = playstyleLine(char);", s, count=1)
assert n == 1, f'buildCharBlock playstyle replacement count={n}'

# Haiku's duplicate class ternary (historically called dexBuild).
pat2 = re.compile(r"  const dexBuild = char\.cls\?\.name === 'Artificer'.*?\n    : '';", re.S)
s, n = pat2.subn("  const dexBuild = playstyleLine(char);", s, count=1)
assert n == 1, f'Haiku playstyle replacement count={n}'

# Dead variables left by prior item-registry work.
s = s.replace("  const itemDetailLine = '';\n", '')

# Arc objectives are deliberately disabled and documented in DISABLED_arc_objectives.md.
# Keep the outward API field so prompt builders need no conditional churn, but remove
# the large dead template from the live source.
obj_pat = re.compile(
    r"  // Arc objectives — rolling:.*?\n  const objectivesSection = ARC_OBJECTIVES_IN_PROMPT && \(arcGoal \|\| arcObjs\.length\).*?\n    : '';",
    re.S,
)
s, n = obj_pat.subn(
    "  // Arc objectives are intentionally excluded from prompts. The storage/UI/tag\\n"
    "  // machinery remains available; see DISABLED_arc_objectives.md.\\n"
    "  const objectivesSection = '';",
    s,
    count=1,
)
assert n == 1, f'objective dead-block replacement count={n}'

# The short slot reminder near CORE TAGS had fallen behind the actual slot model.
s = s.replace(
    "  Slots: mainhand, offhand, armor, head, neck, cloak, hands, ring1, ring2, feet",
    "  Slots: mainhand, offhand, armor, face, head, neck, shoulders, cloak, torso, arms, hands, waist, ring1, ring2, feet",
    1,
)

# Choice-length mechanics belong to each model's FORMAT/HARD RULES and final
# checklist. Repeating the same paragraph inside the shared item/tag reference
# spends static prompt tokens without strengthening the rule.
choice_line = "CHOICE LENGTH: one short sentence each, 15 words or fewer. State the action and stop — no em-dash appendix explaining the reasoning or the hoped-for outcome. That is the player's thinking, and it turns a menu into an essay.\n"
assert choice_line in s, 'shared CHOICE LENGTH line missing'
s = s.replace(choice_line, '', 1)

# Sanity guards against stale generations of the item system leaking back into live prompt text.
assert '[UPDATE:' not in s, 'stale UPDATE tag remains in live useGame prompt'
assert 'transform it with UPDATE' not in s, 'stale UPDATE prose remains'
assert s.count("const itemDetailLine") == 0
assert s.count('const PLAYSTYLE_BY_CLASS') == 1

p.write_text(s)
print('useGame.js prompt cleanup applied')
