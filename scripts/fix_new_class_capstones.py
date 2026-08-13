from pathlib import Path

# The game compresses D&D's 20 class levels into 10 app levels. The three new
# classes were initially written too literally; make levels 6-10 their endgame
# progression and ensure level 10 represents the complete class kit.

p = Path('src/constants/multiclass.js')
s = p.read_text()
old = """  Bard: {
    emoji: '🎵', desc: 'Versatile CHA caster and master of inspiration, performance, and skill.', hpPerLevel: 5,
    features: {1:['Bardic Inspiration','Spellcasting'],2:['Jack of All Trades','Song of Rest'],3:['Bard College subclass','Expertise'],4:['Ability Score Improvement'],5:['Font of Inspiration','Improved Bardic Inspiration'],6:['Countercharm','Magical Secrets'],7:['Improved Inspiration'],8:['Additional Expertise'],9:['Superior Inspiration'],10:['Peerless Bard']},
  },
  'Monster Hunter': {
    emoji:'🗡️', desc:'Prepared supernatural predator who studies and exploits dangerous prey.', hpPerLevel:6,
    features:{1:[\"Hunter's Lore\",'Prepared Arsenal'],2:['Marked Quarry','Monster Slayer'],3:['Hunter Discipline subclass','Field Preparation'],4:['Ability Score Improvement'],5:['Extra Attack','Hardened Hunter'],6:['Relentless Pursuit'],7:['Exploit Weakness'],8:['Unnatural Resilience'],9:['Apex Quarry'],10:['Legendary Hunter']},
  },
  Gunslinger: {
    emoji:'🔫', desc:'DEX firearm specialist using grit, speed, precision, and trick shots.', hpPerLevel:5,
    features:{1:['Firearm Proficiency','Grit','Quick Draw'],2:['Trick Shots'],3:['Gunslinger Archetype subclass','Deadeye'],4:['Ability Score Improvement'],5:['Extra Attack','Fast Reload'],6:['Piercing Shot'],7:['Evasive Footwork'],8:['Vicious Intent'],9:['Hemorrhaging Critical'],10:['Legendary Gunslinger']},
  },
"""
new = """  Bard: {
    emoji: '🎵', desc: 'Versatile CHA caster and master of inspiration, performance, and skill.', hpPerLevel: 5,
    features: {
      1: ['Bardic Inspiration (d6)', 'Spellcasting', 'Jack of All Trades'],
      2: ['Song of Rest', 'Expertise', 'Bard College subclass'],
      3: ['Font of Inspiration - Bardic Inspiration refreshes on a short rest', 'Bardic Inspiration improves to d8'],
      4: ['Ability Score Improvement', 'Countercharm'],
      5: ['Magical Secrets - learn spells from any class', 'Bardic Inspiration improves to d10'],
      6: ['Additional Expertise', 'Additional Magical Secrets'],
      7: ['Bardic Inspiration improves to d12', 'Song of Rest reaches its strongest form'],
      8: ['Additional Magical Secrets', 'Masterful versatility across skills and magic'],
      9: ['9th-level bard magic', 'Superior Inspiration - never enter a fight completely without inspiration'],
      10: ['Peerless Bard - full level-20 Bard kit unlocked', 'Bardic Inspiration d12', 'All Magical Secrets tiers unlocked', 'Superior Inspiration perfected'],
    },
  },
  'Monster Hunter': {
    emoji:'🗡️', desc:'Prepared supernatural predator who studies and exploits dangerous prey.', hpPerLevel:6,
    features: {
      1: [\"Hunter's Lore - identify supernatural creatures and their signs\", 'Prepared Arsenal - carry specialized countermeasures for known threats'],
      2: ['Marked Quarry - designate and relentlessly track a chosen monster', 'Monster Slayer - improved damage and pressure against marked prey'],
      3: ['Hunter Discipline subclass', 'Field Preparation - prepare defenses, traps, and tools for the creature being hunted'],
      4: ['Ability Score Improvement', 'Hardened Hunter - resist fear, charm, poison, and other common monster tactics'],
      5: ['Extra Attack', 'Relentless Pursuit - quarry cannot easily hide, flee, or escape across hostile terrain'],
      6: ['Exploit Weakness - identified vulnerabilities become meaningful combat advantages', 'Improved Marked Quarry'],
      7: ['Unnatural Resilience - survive supernatural punishment that would disable ordinary hunters'],
      8: ['Countermeasure Mastery - prepared tools and defenses work against legendary supernatural abilities', 'Relentless Pursuit improves'],
      9: ['Apex Quarry - a marked legendary creature is exposed, tracked, and pressured even through magical escape'],
      10: ['Legendary Hunter - full level-20 Monster Hunter kit unlocked', 'Perfect Quarry - marked prey cannot conceal its nature or easily escape pursuit', 'Master Exploitation - fully identified weaknesses are always actionable', 'Supreme Countermeasures - preparation applies against the strongest supernatural threats'],
    },
  },
  Gunslinger: {
    emoji:'🔫', desc:'DEX firearm specialist using grit, speed, precision, and trick shots.', hpPerLevel:5,
    features: {
      1: ['Firearm Proficiency', 'Grit', 'Quick Draw'],
      2: ['Trick Shots - Deadeye, Disarming, Forceful, and other precision techniques'],
      3: ['Gunslinger Archetype subclass', 'Deadeye - spend grit for extreme accuracy'],
      4: ['Ability Score Improvement', 'Fast Reload - dramatically reduce firearm reload downtime'],
      5: ['Extra Attack', 'Trick Shot Mastery - broader and more reliable trick-shot use'],
      6: ['Piercing Shot - drive a shot through multiple targets or heavy protection', 'Grit pool improves'],
      7: ['Evasive Footwork - stay mobile under fire without surrendering accuracy'],
      8: ['Vicious Intent - critical threat and firearm lethality improve', 'Rapid firearm handling'],
      9: ['Hemorrhaging Critical - devastating critical hits continue punishing the target', 'Master Trick Shots'],
      10: ['Legendary Gunslinger - full level-20 Gunslinger kit unlocked', 'Grit mastery - signature shots remain available in extended fights', 'Fastest Reload - reload no longer meaningfully interrupts the firing rhythm', 'Perfected Trick Shots and critical abilities'],
    },
  },
"""
assert old in s, 'new-class multiclass block not found'
s = s.replace(old, new, 1)
p.write_text(s)

p = Path('src/constants/abilities.js')
s = p.read_text()
old = """  Bard: {
    cantrips:['Dancing Lights','Friends','Light','Mage Hand','Mending','Message','Minor Illusion','Prestidigitation','True Strike','Vicious Mockery'],
    martial:{1:['Bardic Inspiration'],2:['Jack of All Trades','Song of Rest'],3:['Expertise'],4:['Versatile Performance'],5:['Font of Inspiration'],6:['Countercharm','Magical Secrets'],7:['Improved Inspiration'],8:['Additional Expertise'],9:['Superior Inspiration'],10:['Peerless Performance']},
    martialKnown:{1:1,2:2,3:1,4:1,5:1,6:2,7:1,8:1,9:1,10:1},
    spells:{1:['Charm Person','Cure Wounds','Detect Magic','Disguise Self','Dissonant Whispers','Faerie Fire','Feather Fall','Healing Word','Heroism','Sleep','Thunderwave'],2:['Calm Emotions','Detect Thoughts','Enhance Ability','Hold Person','Invisibility','Knock','Lesser Restoration','See Invisibility','Shatter','Silence','Suggestion'],3:['Clairvoyance','Dispel Magic','Fear','Hypnotic Pattern','Major Image','Sending','Speak with Dead','Tongues'],4:['Dimension Door','Freedom of Movement','Greater Invisibility','Locate Creature','Polymorph'],5:['Animate Objects','Dominate Person','Geas','Greater Restoration','Hold Monster','Legend Lore','Mass Cure Wounds','Raise Dead','Scrying'],6:['Mass Suggestion',\"Otto's Irresistible Dance\",'True Seeing'],7:['Etherealness','Forcecage','Mirage Arcane','Teleport'],8:['Dominate Monster','Feeblemind','Glibness','Mind Blank'],9:['Foresight','Power Word Heal','True Polymorph'],10:['Magical Secrets','Peerless Inspiration']},
    cantripsKnown:{1:2,2:2,3:2,4:3,5:3,6:3,7:3,8:4,9:4,10:4}, spellsKnown:{1:4,2:5,3:6,4:7,5:8,6:10,7:12,8:14,9:16,10:18},
  },
  'Monster Hunter': {cantrips:[],martial:{1:[\"Hunter's Lore\",'Prepared Arsenal'],2:['Marked Quarry','Monster Slayer'],3:['Field Preparation'],4:['Ability Score Improvement'],5:['Extra Attack','Hardened Hunter'],6:['Relentless Pursuit'],7:['Exploit Weakness'],8:['Unnatural Resilience'],9:['Apex Quarry'],10:['Legendary Hunter']},martialKnown:{1:2,2:2,3:1,4:1,5:2,6:1,7:1,8:1,9:1,10:1}},
  Gunslinger: {cantrips:[],martial:{1:['Grit','Quick Draw','Firearm Proficiency'],2:['Deadeye Shot','Disarming Shot','Forceful Shot'],3:['Trick Shot Mastery'],4:['Ability Score Improvement'],5:['Extra Attack','Fast Reload'],6:['Piercing Shot'],7:['Evasive Footwork'],8:['Vicious Intent'],9:['Hemorrhaging Critical'],10:['Legendary Gunslinger']},martialKnown:{1:3,2:3,3:1,4:1,5:2,6:1,7:1,8:1,9:1,10:1}},
"""
new = """  Bard: {
    cantrips:['Dancing Lights','Friends','Light','Mage Hand','Mending','Message','Minor Illusion','Prestidigitation','True Strike','Vicious Mockery'],
    martial:{1:['Bardic Inspiration (d6)','Jack of All Trades'],2:['Song of Rest','Expertise'],3:['Font of Inspiration','Bardic Inspiration (d8)'],4:['Countercharm'],5:['Magical Secrets','Bardic Inspiration (d10)'],6:['Additional Expertise','Additional Magical Secrets'],7:['Bardic Inspiration (d12)','Improved Song of Rest'],8:['Additional Magical Secrets'],9:['Superior Inspiration'],10:['Peerless Bard','Bardic Inspiration (d12)','Magical Secrets Mastery','Superior Inspiration Perfected']},
    martialKnown:{1:2,2:2,3:2,4:1,5:2,6:2,7:2,8:1,9:1,10:4},
    spells:{1:['Charm Person','Cure Wounds','Detect Magic','Disguise Self','Dissonant Whispers','Faerie Fire','Feather Fall','Healing Word','Heroism','Sleep','Thunderwave'],2:['Calm Emotions','Detect Thoughts','Enhance Ability','Hold Person','Invisibility','Knock','Lesser Restoration','See Invisibility','Shatter','Silence','Suggestion'],3:['Clairvoyance','Dispel Magic','Fear','Hypnotic Pattern','Major Image','Sending','Speak with Dead','Tongues'],4:['Dimension Door','Freedom of Movement','Greater Invisibility','Locate Creature','Polymorph'],5:['Animate Objects','Dominate Person','Geas','Greater Restoration','Hold Monster','Legend Lore','Mass Cure Wounds','Raise Dead','Scrying'],6:['Mass Suggestion',\"Otto's Irresistible Dance\",'True Seeing'],7:['Etherealness','Forcecage','Mirage Arcane','Teleport'],8:['Dominate Monster','Feeblemind','Glibness','Mind Blank'],9:['Foresight','Power Word Heal','True Polymorph'],10:['Magical Secrets - all tiers','Superior Inspiration','Peerless Bard']},
    cantripsKnown:{1:2,2:2,3:2,4:3,5:3,6:3,7:3,8:4,9:4,10:4}, spellsKnown:{1:4,2:5,3:6,4:7,5:8,6:10,7:12,8:14,9:16,10:18},
  },
  'Monster Hunter': {cantrips:[],martial:{1:[\"Hunter's Lore\",'Prepared Arsenal'],2:['Marked Quarry','Monster Slayer'],3:['Field Preparation'],4:['Hardened Hunter'],5:['Extra Attack','Relentless Pursuit'],6:['Exploit Weakness','Improved Marked Quarry'],7:['Unnatural Resilience'],8:['Countermeasure Mastery','Improved Relentless Pursuit'],9:['Apex Quarry','Master Trick Preparation'],10:['Legendary Hunter','Perfect Quarry','Master Exploitation','Supreme Countermeasures']},martialKnown:{1:2,2:2,3:1,4:1,5:2,6:2,7:1,8:2,9:2,10:4}},
  Gunslinger: {cantrips:[],martial:{1:['Grit','Quick Draw','Firearm Proficiency'],2:['Deadeye Shot','Disarming Shot','Forceful Shot'],3:['Trick Shot Mastery'],4:['Fast Reload'],5:['Extra Attack','Expanded Trick Shots'],6:['Piercing Shot','Improved Grit'],7:['Evasive Footwork'],8:['Vicious Intent','Rapid Firearm Handling'],9:['Hemorrhaging Critical','Master Trick Shots'],10:['Legendary Gunslinger','Grit Mastery','Fastest Reload','Perfected Trick Shots']},martialKnown:{1:3,2:3,3:1,4:1,5:2,6:2,7:1,8:2,9:2,10:4}},
"""
assert old in s, 'new-class abilities block not found'
s = s.replace(old, new, 1)
p.write_text(s)

print('compressed level-20 capstones applied to Bard, Monster Hunter, Gunslinger')
