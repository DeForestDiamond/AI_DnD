from pathlib import Path
import re

# classes.js
p=Path('src/constants/classes.js'); s=p.read_text()
class_anchor="  { name:'Druid',       emoji:'🍃',  desc:'Guardian of the natural world, wielding primal magic. WIS-based spellcasting and Wild Shape to transform into beasts.',                                       stats:{str:10,dex:14,con:14,int:10,wis:17,cha:8 } },"
class_insert="""  { name:'Bard',        emoji:'🎵',  desc:'Versatile performer and full spellcaster. Inspires allies, masters skills, and bends magic through force of personality. CHA primary.', stats:{str:8, dex:14,con:12,int:10,wis:10,cha:17} },
  { name:'Monster Hunter', emoji:'🗡️', desc:'Specialist in hunting supernatural threats. Studies weaknesses, prepares tools and traps, and turns monster lore into lethal precision. DEX and WIS primary.', stats:{str:10,dex:17,con:14,int:12,wis:15,cha:8 } },
  { name:'Gunslinger',  emoji:'🔫',  desc:'Deadly firearm specialist who wins through speed, precision, trick shots, and nerve. DEX primary, WIS secondary.', stats:{str:8, dex:17,con:14,int:10,wis:14,cha:10} },"""
if "name:'Bard'" not in s:
    assert class_anchor in s
    s=s.replace(class_anchor,class_anchor+'\n'+class_insert,1)
gear_anchor="  Druid:        { slots:{ ...EMPTY_SLOTS, mainhand:'Quarterstaff', offhand:'Shield' },                     inventory:['Druidic Focus','Herbalism Kit','Torch','Rations','Rations','Rations'] },"
gear_insert="""  Bard:         { slots:{ ...EMPTY_SLOTS, mainhand:'Rapier', armor:'Leather Armor' },                    inventory:['Lute','Dagger','Torch','Rations','Rations','Rations'] },
  'Monster Hunter': { slots:{ ...EMPTY_SLOTS, mainhand:'Longsword', armor:'Studded Leather' },                  inventory:['Hand Crossbow',\"Hunter's Kit\",'Torch','Rations','Rations','Rations'] },
  Gunslinger:    { slots:{ ...EMPTY_SLOTS, mainhand:'Pistol', armor:'Leather Armor' },                         inventory:['Dagger','Gunsmith Tools','Torch','Rations','Rations','Rations'] },"""
if '  Bard:         { slots:' not in s:
    assert gear_anchor in s
    s=s.replace(gear_anchor,gear_anchor+'\n'+gear_insert,1)
p.write_text(s)

# items.js
p=Path('src/constants/items.js'); s=p.read_text()
if "'Pistol':" not in s:
    anchor="  'Arcane Pistol': { type:'weapon', damage:'1d10', bonus:0, finesse:false, range:'ranged', label:'INT-based, arcane focus, no ammo required' },"
    assert anchor in s
    s=s.replace(anchor,"  'Pistol':        { type:'weapon', damage:'1d10', bonus:0, finesse:true, range:'ranged', label:'DEX-based firearm' },\n"+anchor,1)
if 'export const GEAR_DB' not in s:
    boundary='};\n\nexport const FOCUS_DB = {'
    replacement="""};

export const GEAR_DB = {
  'Gunsmith Tools': { type:'misc', label:'Tools for maintaining, repairing, and modifying firearms' },
  \"Hunter's Kit\": { type:'misc', label:'Specialized tools, reagents, traps, and field supplies for hunting monsters' },
};

export const FOCUS_DB = {"""
    assert boundary in s
    s=s.replace(boundary,replacement,1)
if "'Lute':" not in s:
    s=s.replace('export const FOCUS_DB = {',"export const FOCUS_DB = {\n  'Lute': { type:'focus', slot:'mainhand', bonuses:{}, label:'Bardic spellcasting focus and musical instrument' },",1)
s=s.replace('export const ITEM_DB = { ...WEAPON_DB, ...ARMOR_DB, ...MAGIC_ITEM_DB, ...FOCUS_DB };','export const ITEM_DB = { ...WEAPON_DB, ...ARMOR_DB, ...MAGIC_ITEM_DB, ...GEAR_DB, ...FOCUS_DB };')
p.write_text(s)

# progression.js
p=Path('src/constants/progression.js'); s=p.read_text()
s=s.replace("'Blood Hunter':5, Sorcerer:4, Druid:5 }", "'Blood Hunter':5, Sorcerer:4, Druid:5, Bard:5, 'Monster Hunter':6, Gunslinger:5 }")
s=s.replace("'Blood Hunter':8, Sorcerer:6, Druid:8 }", "'Blood Hunter':8, Sorcerer:6, Druid:8, Bard:8, 'Monster Hunter':10, Gunslinger:8 }")
p.write_text(s)

# multiclass.js
p=Path('src/constants/multiclass.js'); s=p.read_text()
if '\n  Bard: {' not in s:
    anchor='\n};\n\n// Sneak attack dice by total rogue levels'
    blocks="""
  Bard: {
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
  },"""
    assert anchor in s
    s=s.replace(anchor,blocks+anchor,1)
p.write_text(s)

# abilities.js
p=Path('src/constants/abilities.js'); s=p.read_text()
if '\n  Bard: {' not in s:
    marker='\n};\n\n// '
    idx=s.find(marker); assert idx>=0
    blocks="""

  Bard: {
    cantrips:['Dancing Lights','Friends','Light','Mage Hand','Mending','Message','Minor Illusion','Prestidigitation','True Strike','Vicious Mockery'],
    martial:{1:['Bardic Inspiration'],2:['Jack of All Trades','Song of Rest'],3:['Expertise'],4:['Versatile Performance'],5:['Font of Inspiration'],6:['Countercharm','Magical Secrets'],7:['Improved Inspiration'],8:['Additional Expertise'],9:['Superior Inspiration'],10:['Peerless Performance']},
    martialKnown:{1:1,2:2,3:1,4:1,5:1,6:2,7:1,8:1,9:1,10:1},
    spells:{1:['Charm Person','Cure Wounds','Detect Magic','Disguise Self','Dissonant Whispers','Faerie Fire','Feather Fall','Healing Word','Heroism','Sleep','Thunderwave'],2:['Calm Emotions','Detect Thoughts','Enhance Ability','Hold Person','Invisibility','Knock','Lesser Restoration','See Invisibility','Shatter','Silence','Suggestion'],3:['Clairvoyance','Dispel Magic','Fear','Hypnotic Pattern','Major Image','Sending','Speak with Dead','Tongues'],4:['Dimension Door','Freedom of Movement','Greater Invisibility','Locate Creature','Polymorph'],5:['Animate Objects','Dominate Person','Geas','Greater Restoration','Hold Monster','Legend Lore','Mass Cure Wounds','Raise Dead','Scrying'],6:['Mass Suggestion',\"Otto's Irresistible Dance\",'True Seeing'],7:['Etherealness','Forcecage','Mirage Arcane','Teleport'],8:['Dominate Monster','Feeblemind','Glibness','Mind Blank'],9:['Foresight','Power Word Heal','True Polymorph'],10:['Magical Secrets','Peerless Inspiration']},
    cantripsKnown:{1:2,2:2,3:2,4:3,5:3,6:3,7:3,8:4,9:4,10:4}, spellsKnown:{1:4,2:5,3:6,4:7,5:8,6:10,7:12,8:14,9:16,10:18},
  },
  'Monster Hunter': {cantrips:[],martial:{1:[\"Hunter's Lore\",'Prepared Arsenal'],2:['Marked Quarry','Monster Slayer'],3:['Field Preparation'],4:['Ability Score Improvement'],5:['Extra Attack','Hardened Hunter'],6:['Relentless Pursuit'],7:['Exploit Weakness'],8:['Unnatural Resilience'],9:['Apex Quarry'],10:['Legendary Hunter']},martialKnown:{1:2,2:2,3:1,4:1,5:2,6:1,7:1,8:1,9:1,10:1}},
  Gunslinger: {cantrips:[],martial:{1:['Grit','Quick Draw','Firearm Proficiency'],2:['Deadeye Shot','Disarming Shot','Forceful Shot'],3:['Trick Shot Mastery'],4:['Ability Score Improvement'],5:['Extra Attack','Fast Reload'],6:['Piercing Shot'],7:['Evasive Footwork'],8:['Vicious Intent'],9:['Hemorrhaging Critical'],10:['Legendary Gunslinger']},martialKnown:{1:3,2:3,3:1,4:1,5:2,6:1,7:1,8:1,9:1,10:1}},"""
    s=s[:idx]+blocks+s[idx:]
p.write_text(s)

# subclasses.js
p=Path('src/constants/subclasses.js'); s=p.read_text()
s=s.replace('Sorcerer: 1, Druid: 2,','Sorcerer: 1, Druid: 2, Bard: 3, \'Monster Hunter\': 3, Gunslinger: 3,')
if '\n  Bard: {' not in s:
    anchor='export const SUBCLASSES = {\n'
    block="""  Bard: {
    'College of Lore': {emoji:'📚',desc:'Collector of secrets, skills, and stolen magic.',features:[{name:'Cutting Words',desc:'Spend inspiration to undermine an enemy.'},{name:'Additional Magical Secrets',desc:'Learn magic normally unavailable to bards.'}]},
    'College of Valor': {emoji:'⚔️',desc:'Battlefield bard who turns inspiration into martial courage.',features:[{name:'Combat Inspiration',desc:'Allies can use inspiration for offense or defense.'},{name:'Battle Magic',desc:'Weave spellcasting and weapon attacks together.'}]},
  },
  'Monster Hunter': {
    'Occult Slayer': {emoji:'🕯️',desc:'Specialist in curses, undead, fiends, and hostile magic.',features:[{name:'Warded Mind',desc:'Harden yourself against supernatural intrusion.'},{name:'Ritual Countermeasures',desc:'Prepare wards and banes against identified prey.'}]},
    'Beast Stalker': {emoji:'🐾',desc:'Tracks apex monsters until nowhere remains safe.',features:[{name:'Predator Tracking',desc:'Read impossible trails and monster signs.'},{name:'Ambush Preparation',desc:'Build traps and choose terrain to counter your quarry.'}]},
  },
  Gunslinger: {
    Deadeye: {emoji:'🎯',desc:'Precision shooter built around one impossible shot.',features:[{name:'Called Shot',desc:'Spend grit to target a weak point.'},{name:'Steady Aim',desc:'Trade movement for extreme accuracy.'}]},
    Pistolero: {emoji:'💨',desc:'Aggressive close-range gunfighter built around movement and draw speed.',features:[{name:'Fan the Hammer',desc:'Unleash a rapid burst of close-range shots.'},{name:'Lightning Draw',desc:'React to danger before slower opponents can act.'}]},
  },
"""
    assert anchor in s
    s=s.replace(anchor,anchor+block,1)
p.write_text(s)

# App.jsx spellcaster recognition
p=Path('src/App.jsx'); s=p.read_text()
s=s.replace("['Artificer','Cleric','Wizard','Warlock','Sorcerer','Druid','Paladin','Ranger']","['Artificer','Cleric','Wizard','Warlock','Sorcerer','Druid','Paladin','Ranger','Bard']")
p.write_text(s)
