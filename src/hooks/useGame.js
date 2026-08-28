import { rollDie, rollDice, getMainWeapon, effectiveStats, calcAC, modStr, profBonus, statMod, allItems, effectiveMaxHp } from './useCharacter.js';
import { coinsToString } from '../constants/currency.js';
import { RACE_TRAIT_STRINGS } from '../constants/raceTraits.js';
import { subclassPromptLines } from '../constants/subclasses.js';
import { stackCounts, stackNames } from '../utils/itemStacks.js';

// Player-authored standing instructions, injected into every prompt so they
// never scroll out of context. Empty string when unset.
const directivesBlock = (char) => {
  const d = char?.directives?.trim();
  return d ? `── PLAYER STANDING INSTRUCTIONS (the player set these directly — always honor them) ──\n${d}\n\n` : '';
};


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

// Strip game tags from DM text before displaying
export const cleanDisplayText = (text) => text.replace(/\[[^\]]+\]/g, '').trim();

// ── Dice Engine ────────────────────────────────────────────────────────────────
// All dice rolling happens here in the app, never in the DM

// 5e skill -> governing ability. Rolls named by skill use the right stat
// instead of silently defaulting to 10 (+0).
// The canonical 18 5e skills, in display order, with their governing ability.
// SKILL_ABILITY below also carries aliases (sleight/sleightofhand) for parsing
// roll requests; this list is what the character sheet shows.
export const SKILL_LIST = [
  { key: 'athletics',      label: 'Athletics',       ability: 'str' },
  { key: 'acrobatics',     label: 'Acrobatics',      ability: 'dex' },
  { key: 'sleightofhand',  label: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth',        label: 'Stealth',         ability: 'dex' },
  { key: 'arcana',         label: 'Arcana',          ability: 'int' },
  { key: 'history',        label: 'History',         ability: 'int' },
  { key: 'investigation',  label: 'Investigation',   ability: 'int' },
  { key: 'nature',         label: 'Nature',          ability: 'int' },
  { key: 'religion',       label: 'Religion',        ability: 'int' },
  { key: 'animalhandling', label: 'Animal Handling', ability: 'wis' },
  { key: 'insight',        label: 'Insight',         ability: 'wis' },
  { key: 'medicine',       label: 'Medicine',        ability: 'wis' },
  { key: 'perception',     label: 'Perception',      ability: 'wis' },
  { key: 'survival',       label: 'Survival',        ability: 'wis' },
  { key: 'deception',      label: 'Deception',       ability: 'cha' },
  { key: 'intimidation',   label: 'Intimidation',    ability: 'cha' },
  { key: 'performance',    label: 'Performance',     ability: 'cha' },
  { key: 'persuasion',     label: 'Persuasion',      ability: 'cha' },
];

export const SKILL_ABILITY = {
  athletics:'str',
  acrobatics:'dex', stealth:'dex', sleight:'dex', sleightofhand:'dex', initiative:'dex',
  arcana:'int', history:'int', investigation:'int', nature:'int', religion:'int',
  animal:'wis', animalhandling:'wis', insight:'wis', medicine:'wis', perception:'wis', survival:'wis',
  deception:'cha', intimidation:'cha', performance:'cha', persuasion:'cha',
};

export const performSkillCheck = (statValue, difficulty, addProfBonus = false, level = 1, gearBonus = 0) => {
  const d20    = rollDie(20);
  const mod    = statMod(statValue);
  const prof   = addProfBonus ? profBonus(level) : 0;
  const total  = d20 + mod + prof + gearBonus;
  const hit    = total >= difficulty;
  return { d20, mod, prof, gearBonus, total, difficulty, hit };
};

export const performAttack = (weapon, stats, level) => {
  const profBonusValue = profBonus(level);
  const atkRoll         = rollDie(20);
  const statBonus       = weapon.statBonus || 0;
  const weaponBonus     = weapon.bonus || 0;
  const statLabel       = (weapon.attackAbility || 'str').toUpperCase();
  const atkBonus        = statBonus + profBonusValue + weaponBonus;
  const totalAtk        = atkRoll + atkBonus;
  const dmgRoll         = rollDice(weapon.damage);
  const dmgBonus        = statBonus + weaponBonus;
  const crit     = atkRoll === 20;
  const fumble   = atkRoll === 1;
  // Extra damage dice of another type (1d4 radiant, 2d6 fire...). Rolled
  // separately so the DM can narrate the damage types, and — per 5e — the dice
  // double on a critical hit just like the base weapon dice.
  const extras = (weapon.extras || []).map(e => {
    const roll = rollDice(e.dice) + (crit ? rollDice(e.dice) : 0);
    return { ...e, roll };
  });
  const extraTotal = extras.reduce((sum, e) => sum + e.roll, 0);
  const totalDmg = Math.max(1, dmgRoll + dmgBonus + extraTotal);
  return { atkRoll, atkBonus, totalAtk, statBonus, statLabel, profBonus: profBonusValue, weaponBonus, dmgRoll, dmgBonus, extras, extraTotal, totalDmg, crit, fumble };
};

// ── Model configs ──────────────────────────────────────────────────────────────
export const MODEL_CONFIGS = {
  sonnet: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    label: 'Sonnet',
    emoji: '✨',
  },
  haiku: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1536,
    label: 'Haiku',
    emoji: '⚡',
  },
  gpt: {
    provider: 'openai',
    model: 'gpt-5.6-sol',
    max_tokens: 2048,
    reasoning_effort: 'low',
    label: 'GPT Sol',
    emoji: '🧠',
  },
  terra: {
    provider: 'openai',
    model: 'gpt-5.6-terra',
    max_tokens: 2048,
    reasoning_effort: 'low',
    label: 'GPT Terra',
    emoji: '🌍',
  },
};

// ── Shared character data block ────────────────────────────────────────────────
// Returns { static: string, dynamic: string }
// static = race, class, deity, playstyle, abilities — changes rarely
// dynamic = HP, stats, inventory, equipped, gold, location — changes every message
const buildCharBlock = (char) => {
  const effStats    = effectiveStats(char.stats, char.slots, char.items || {});
  const ac          = calcAC(char.slots, char.stats, char.items || {});
  const pb          = profBonus(char.level);
  const weapon      = getMainWeapon(char.slots, char.stats, char.items || {});
  const classLevels = char.classLevels || { [char.cls?.name]: char.level };
  const classDesc   = Object.entries(classLevels).map(([c,l]) => `${c} ${l}`).join(' / ');
  const db          = allItems(char.items || {});
  const equippedList = Object.entries(char.slots).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join(', ') || 'nothing';
  const weaponLine  = weapon ? `${weapon.name} (${weapon.damage}${weapon.bonus?`+${weapon.bonus}`:''}${(weapon.extras||[]).map(e=>` plus ${e.dice} ${e.type}`).join('')}, Attack bonus +${weapon.statBonus+pb+(weapon.bonus||0)}, ${(weapon.attackAbility || 'str').toUpperCase()}${weapon.finesse && weapon.range !== 'ranged' ? '/finesse' : ''}${weapon.label?', '+weapon.label:''})` : 'Unarmed (1 damage)';
  const sneakLine   = char.sneakAttackDice ? `\n- SNEAK ATTACK: ${char.sneakAttackDice} extra damage when attacking with advantage or from hiding` : '';
  const offhandData = char.slots.offhand ? db[char.slots.offhand] : null;
  const focusLine   = offhandData?.type==='focus' ? `\n- HOLY FOCUS: ${char.slots.offhand} equipped (${offhandData.label})` : '';
  const stackedInv  = stackInventory(char.inventory);
  const invDisplay  = Object.entries(stackedInv).map(([n,c])=>c>1?`${n} x${c}`:n).join(', ') || 'empty';
  // Descriptions for custom items the player owns (inventory + equipped), so the
  // DM knows what they do — their flavor/label lives in the character item registry, not the name.
  // Two tiers, because they change at very different rates. Worn gear and
  // constructs are stable — you equip something once and keep it — while carried
  // inventory churns constantly as loot arrives. Caching is prefix-based, so the
  // stable half goes FIRST: picking something up then rebuilds only the carried
  // block and the history behind it, leaving worn gear and constructs cached.
  const equippedNames = new Set(Object.values(char.slots || {}).filter(Boolean));
  const isConstruct   = (n) => (char.items?.[n] || {}).type === 'construct';
  const stableNames   = new Set([...equippedNames, ...Object.keys(stackedInv).filter(isConstruct)]);
  const carriedNames  = Object.keys(stackedInv).filter(n => !stableNames.has(n));

  const detailsFor = (names) => [...names]
    .map(n => { const d = char.items?.[n]; return d?.label ? `${n}: ${d.label}` : null; })
    .filter(Boolean).join('; ');

  // Tier 1 — worn gear and owned constructs. Rarely changes.
  // Constructs are derived from inventory, so this section CANNOT live in the
  // static block — putting it there meant picking up any item rebuilt the whole
  // ~12,000 token prompt. It belongs with the worn gear, which is where the
  // construct descriptions already are.
  const gearBlock = [
    `EQUIPPED: ${equippedList}`,
    detailsFor(stableNames) ? `WORN GEAR AND CONSTRUCTS — what they do:\n${detailsFor(stableNames)}` : '',
    buildConstructSection(char),
  ].filter(Boolean).join('\n');
  // Tier 2 — everything carried. Changes whenever loot arrives.
  const itemsBlock = [
    `INVENTORY: ${invDisplay}`,
    detailsFor(carriedNames) ? `CARRIED ITEMS — what they do:\n${detailsFor(carriedNames)}` : '',
  ].filter(Boolean).join('\n');
  const hasCleric   = char.cls?.name==='Cleric'  || Object.keys(classLevels).includes('Cleric');
  const hasWarlock  = char.cls?.name==='Warlock' || Object.keys(classLevels).includes('Warlock');
  const hasPaladin  = char.cls?.name==='Paladin' || Object.keys(classLevels).includes('Paladin');
  const deityLine   = char.deity && hasPaladin && !hasCleric
    ? `\n- DEITY & OATH: Sworn paladin of ${char.deity.name} (${char.deity.alignment}). ${char.deity.desc}`
    : char.deity && hasCleric
    ? `\n- DEITY: Devoted to ${char.deity.name} (${char.deity.alignment}). ${char.deity.desc}`
    : char.deity && hasWarlock
    ? `\n- PATRON: Bound by pact to ${char.deity.name} (${char.deity.alignment}). ${char.deity.desc}`
    : '';
  const raceCtx     = RACE_TRAIT_STRINGS[char.race?.name] ? `\n- RACE TRAITS (${char.race.name}): ${RACE_TRAIT_STRINGS[char.race.name]}` : '';
  const playstyle = playstyleLine(char);
  const abilities   = char.abilities || { cantrips:[], spells:[], infusions:[] };
  const abilitiesLine = [
    abilities.martial?.length   ? `Techniques: ${abilities.martial.join(', ')}` : '',
    abilities.cantrips?.length  ? `Cantrips: ${abilities.cantrips.join(', ')}` : '',
    abilities.spells?.length    ? `Spells: ${abilities.spells.join(', ')}` : '',
    abilities.infusions?.length ? `Infusions: ${abilities.infusions.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  // Static — race, class, deity, playstyle, abilities (rarely change)
  const staticPart = `CHARACTER: ${char.name} | ${char.race?.name} ${classDesc}${char.deity ? ` | ${hasWarlock?'Patron':'Deity'}: ${char.deity.name}` : ''}${playstyle}${deityLine}${raceCtx}${subclassPromptLines(char)}${abilitiesLine ? `\nABILITIES:\n${abilitiesLine}` : ''}`;

  // Dynamic — HP, stats, inventory, equipped, gold, location (changes every message)
  const arcLine = char.arc?.antagonist
    ? `\nACTIVE ARC ANTAGONIST (HIDDEN — never name or reveal them directly until the story does): ${char.arc.antagonist}.
ARC LOCATION (HIDDEN CAMPAIGN STATE): ${char.arc.arcLocation || 'Faerûn'}.`
    : '';
  const dynamicPart = `CURRENT STATE:
Level ${char.level} | ${char.xp||0} XP | Coins: ${coinsToString(char.coins)}
HP: ${char.hp}/${effectiveMaxHp(char)} | AC: ${ac} | Proficiency: +${pb}
Stats: Strength ${effStats.str}(${modStr(effStats.str)}) Dexterity ${effStats.dex}(${modStr(effStats.dex)}) Constitution ${effStats.con}(${modStr(effStats.con)}) Intelligence ${effStats.int}(${modStr(effStats.int)}) Wisdom ${effStats.wis}(${modStr(effStats.wis)}) Charisma ${effStats.cha}(${modStr(effStats.cha)})
Weapon: ${weaponLine}${sneakLine}${focusLine}
(Equipped gear, inventory and item descriptions are listed above.)${char.currentLocation ? `\nLocation: ${char.currentLocation}` : ''}${arcLine}`;

  return { staticPart, dynamicPart, gearBlock, itemsBlock };
};

// ── Shared context sections (bio, companions, NPCs, towns) ─────────────────────
// Arc objectives are disabled; see DISABLED_arc_objectives.md for the retained UI/storage/tag machinery.

// Constructs & bound entities — owned and commanded, not worn. Derived from the
// carried inventory (the stash is invisible to the DM by design, which is the
// player's switch for putting a construct out of play). Because it depends on
// inventory it must NOT sit in the cached static block: it goes with the gear.
const buildConstructSection = (char) => {
  const cdb = char.items || {};
  const names = stackNames(char.inventory).filter(nm => cdb[nm]?.type === 'construct');
  if (!names.length) return '';
  return `CONSTRUCTS & BOUND ENTITIES (owned by the player, commanded — not carried gear):\n` +
    names.map(nm => {
      const d = cdb[nm];
      return `- ${nm} [${(d.status || 'dormant').toUpperCase()}]${d.label ? `: ${d.label}` : ''}`;
    }).join('\n');
};

const buildCtxSections = (char) => {
  const loc = char.currentLocation || '';
  const bio = char.bio ? `\nBACKSTORY: ${char.bio}\n` : '';
  const excl = char.contextExclusions || { companions:{}, npcs:{}, towns:{} };

  // Companions
  const companions = char.companions || {};
  let companionSection = '';
  const activeCompanions = Object.entries(companions).filter(([name]) => !excl.companions?.[name]);
  if (activeCompanions.length > 0) {
    // Companions travel WITH the player — that is what makes them companions.
    // Anything that stays put is an NPC, which is where the location tiering
    // lives. So this section has no location logic at all, which also means it
    // never changes when the player moves: it sits in the cached block, and it
    // used to rewrite the whole ~12,000 token static prompt on every journey.
    const present = [], distant = [];
    activeCompanions.forEach(([name, data]) => {
      // Every filled field is sent. Description used to REPLACE the structured
      // fields, which silently discarded whatever was typed into them — filling
      // both looked like it worked and quietly threw half of it away.
      const fields = [data.trueName?`True name: ${data.trueName}`:'',data.race?`Race: ${data.race}`:'',data.role?`Role: ${data.role}`:'',data.appearance?`Appearance: ${data.appearance}`:'',data.personality?`Personality: ${data.personality}`:'',data.status?`Status: ${data.status}`:''].filter(Boolean).join(' | ');
      const desc = [fields, data.desc].filter(Boolean).join(' | ');
      const ab = data.abilities ? (Array.isArray(data.abilities)?data.abilities.join(', '):data.abilities) : '';
      present.push(`- ${name}: ${desc}${ab?` | Abilities: ${ab}`:''}${data.notes?` | ${data.notes}`:''}`);
    });
    const parts = [];
    if (present.length) parts.push(`COMPANIONS (with the player, always):\n${present.join('\n')}\nCOMPANION AGENCY: Companions are active party members, not passive observers. Their personality, beliefs, profession, relationships, and current circumstances must influence their behavior in scenes. They may independently speak, react, investigate, heal, intervene, object, joke, argue, assist, or take other reasonable actions without waiting for the player to address them first. Protecting player agency means never controlling the player character; it does not mean NPCs must wait for player permission to act. When an event strongly intersects a companion's established values or expertise, that companion should normally react unless there is a character-specific reason not to.`);
    companionSection = parts.length ? '\n'+parts.join('\n')+'\n' : '';
  }

  // Disposition — who this character actually is. The DM's default assumption
  // is heroism; this is what corrects it, and 'indifferent' is the field that
  // does the real work.
  const dp = char.disposition || {};
  const dpBits = [
    dp.alignment   && `ALIGNMENT: ${dp.alignment}`,
    dp.cares       && `CARES ABOUT: ${dp.cares}`,
    dp.indifferent && `INDIFFERENT TO: ${dp.indifferent}`,
    dp.methods     && `HOW THEY SOLVE PROBLEMS: ${dp.methods}`,
    dp.lines       && `LINES THEY WILL NOT CROSS: ${dp.lines}`,
  ].filter(Boolean);
  const dispositionSection = dpBits.length
    ? `\nDISPOSITION — WHO THIS CHARACTER IS:\n${dpBits.join('\n')}\n` +
      `Every hook, offer and appeal must target what they CARE ABOUT. Do NOT assume heroism. Anything listed as INDIFFERENT genuinely does not move them — an NPC who appeals to it is ignored, dismissed, or exploited, and you should write the scene that way rather than expecting the player to care. NPCs who know them well pitch accordingly; strangers who misjudge them get the real reaction.\n`
    : '';

  // Arc objectives are intentionally excluded from prompts. The storage/UI/tag
  // machinery remains available; see DISABLED_arc_objectives.md.
  const objectivesSection = '';


  // NPCs
  const npcs = char.npcs || {};
  let npcSection = '';
  const activeNpcs = Object.entries(npcs).filter(([name]) => !excl.npcs?.[name]);
  if (activeNpcs.length > 0) {
    const lines = [];
    activeNpcs.forEach(([name, data]) => {
      const nloc = (data.location||'').toLowerCase();
      const here = loc ? nloc.includes(loc.toLowerCase())||loc.toLowerCase().includes(nloc) : false;
      if (here||!data.location) lines.push(`- ${name} [NEARBY]: ${data.desc||''} | Relationship: ${data.relationship||'neutral'}${data.notes?` | ${data.notes}`:''}`);
      else lines.push(`- ${name} (${data.location}): ${data.relationship||'neutral'}`);
    });
    npcSection = '\nKNOWN NPCs:\n'+lines.join('\n')+'\nNPC RULES: Do not arbitrarily repurpose known NPCs as villains, secret connections, or plot hooks merely because they exist in the player’s history. Do not assume a person, rumor, event, or new storyline is connected to a known NPC unless established by play. However, companions and established NPCs are autonomous characters with their own goals, beliefs, desires, and relationships. They may suggest plans, pursue their own interests, ask the player for help, disagree with the player, and initiate actions consistent with their established personality. Companions should not become passive observers who simply defer every meaningful decision back to the player.\n';
  }

  // Towns
  const towns = char.towns || {};
  let townsSection = '';
  const activeTowns = Object.entries(towns).filter(([name]) => !excl.towns?.[name]);
  if (activeTowns.length > 0) {
    const current = [], other = [];
    activeTowns.forEach(([townName, data]) => {
      if (!data||typeof data!=='object') return;
      const isCurrent = loc && (townName.toLowerCase().includes(loc.toLowerCase())||loc.toLowerCase().includes(townName.toLowerCase()));
      if (isCurrent) {
        const locLines = data.notable_locations ? Object.entries(data.notable_locations).map(([k,v])=>`  · ${k}: ${v}`).join('\n') : '';
        const resLines = data.minor_residents ? Object.entries(data.minor_residents).map(([k,v])=>`  · ${k}: ${v}`).join('\n') : '';
        current.push([`TOWN — ${townName} [CURRENT]:`,data.desc||'',locLines?`Locations:\n${locLines}`:'',resLines?`Residents:\n${resLines}`:'',data.status?`Status: ${data.status}`:''].filter(Boolean).join('\n'));
      } else {
        other.push(`- ${townName}: ${data.desc||''} | Status: ${data.status||'unknown'}`);
      }
    });
    const parts = [];
    if (current.length) parts.push(current.join('\n\n'));
    if (other.length) parts.push('OTHER TOWNS:\n'+other.join('\n'));
    townsSection = parts.length ? '\n'+parts.join('\n')+'\n' : '';
  }

  return { bio, dispositionSection, objectivesSection, companionSection, npcSection, townsSection };
};

// ── Shared tag reference ───────────────────────────────────────────────────────
const TAGS_BLOCK = `── GAME TAGS — THE APP READS THESE EXACTLY ──
Place ALL tags at the END of your response, never mid-narrative. The app parses them automatically: if it is not tagged, IT DID NOT HAPPEN in the game.

TAGS ARE CHANGES, NEVER STATEMENTS OF WHAT THE PLAYER ALREADY HAS. A tag MAKES SOMETHING HAPPEN the moment you write it. Mentioning, counting, describing or referring to something the player already owns gets NO TAG AT ALL.
  WRONG: "You count your fortune — 2,606,176 gold." [GOLD: +2606176]   ← this DOUBLES their money
  WRONG: "You draw the Shadow Cloak from your pack." [ITEM: Shadow Cloak]   ← this creates a SECOND cloak
  RIGHT: "You count your fortune — 2,606,176 gold."   ← narration only, no tag; the app already knows
  RIGHT: "The merchant counts out your fee." [GOLD: +250]   ← a real change, so it is tagged
Only tag what CHANGES this turn: coin gained or spent, items received or destroyed, XP earned, HP altered. The player's current gold, inventory and gear are given to you in CURRENT STATE — quote those numbers freely in narration, but never tag them.

CORE TAGS:
XP (mandatory after every combat and milestone): [XP: +50]
  Amounts scale to the FOE'S MAGNITUDE, not the fight's length — a legendary creature dispatched in seconds still pays legendary:
  trivial 10-25 | minor 30-60 | standard 50-100 | hard 100-200 | deadly (CR well above the player: young dragons, powerful named foes) 250-400 | legendary (adult dragons, archmages, faction leaders) 500-800 | mythic (ancient dragons, krakens, demon lords) 1000-2000
Coins: [GOLD: +10] (bare = gold) — denominations all work: [GOLD: -5sp], [GOLD: +2pp], [GOLD: +3gp 5sp]. pp/gp/sp/cp; change is made automatically. [COIN:] also accepted.
Item gained: [ITEM: Health Potion]
Item DESTROYED, consumed, sold, or given away — gone for good: [REMOVE: Health Potion]
  WARNING: [REMOVE:] PERMANENTLY DELETES the item. NEVER use it to take off or swap gear — that destroys the item.
  Slots: mainhand, offhand, armor, face, head, neck, shoulders, cloak, torso, arms, hands, waist, ring1, ring2, feet
Skill check (USE OFTEN): [ROLL: perception difficulty 14] — then STOP and END your message. The moment you write a [ROLL:] tag, your turn is OVER. Write nothing after it: no outcome, no result, no "what happens next" — you do not know it yet. The system rolls the dice and sends you the result, and you narrate what happens on your NEXT turn. Calling a roll and then continuing to narrate in the same message is a failure — you are guessing at a result the dice have not given you.
  WHEN to roll: ONLY after the player has stated an action whose outcome is uncertain. The roll tests THE PLAYER'S CHOICE — never your guess at what they'd do. Never call a roll in the same message a threat or situation first appears; that message ends with the player's choice unmade. A roll resolves an action the player already typed (attack, sneak, persuade, leap), or a passive sense the WORLD forces on them (a perception check to notice an ambush before it strikes). Never roll for an active choice the player hasn't made yet.
  Roll whenever an outcome is uncertain and interesting: perception to spot an ambush/clue/lie, stealth to sneak, persuasion/intimidation/deception in social conflict, investigation to search, athletics/acrobatics for physical feats, insight to read someone. Do not silently decide these — call the [ROLL:] and let the dice answer.
  VALID ROLL NAMES — USE ONLY THESE EXACT ROLL NAMES. Never invent a custom roll name such as "arcane pistol check", "tracking check", "lockpick check", "magic check", or "rangedattack". Translate the fictional action to the closest valid roll below.
  ATTACK: attack. Player weapon attacks, including ranged attacks, MUST include the target's AC as the difficulty. Preferred form: [ROLL: attack difficulty 18]. Never emit bare [ROLL: attack]. "rangedattack" is NOT a valid roll name. The parser is deliberately tolerant if AC is appended to the number: 18, 18ac, and 18 ac all mean AC 18. "difficulty" and "DC" are both accepted.
  SKILL CHECKS: athletics, acrobatics, sleight of hand, stealth, arcana, history, investigation, nature, religion, animal handling, insight, medicine, perception, survival, deception, intimidation, performance, persuasion.
  SAVING THROWS: strength saving throw, dexterity saving throw, constitution saving throw, intelligence saving throw, wisdom saving throw, charisma saving throw. "save" may replace "saving throw" (example: [ROLL: dexterity save DC 15]).
  FORMAT: [ROLL: attack difficulty <target AC>] for a player weapon attack; [ROLL: <valid skill> difficulty <number>] for a skill check; or [ROLL: <valid saving throw> DC <number>] for a save. If a non-attack action does not map cleanly to one of these, choose the governing standard D&D skill instead of inventing a new check name.
  AC IS PASSIVE — NEVER ASK THE PLAYER TO ROLL IT. There is no defence roll, dodge roll or armour-class roll in this game: when something attacks the player you decide whether it beats their AC, which is given in CURRENT STATE. If you want the player to have a chance to avoid something, call for a SAVING THROW instead ([ROLL: dexterity saving throw difficulty 15]).
  SAVING THROWS use the same tag — say so and the system rolls it as a save: [ROLL: dexterity saving throw difficulty 15], [ROLL: constitution save DC 13], [ROLL: wisdom save difficulty 16]. Call for a save when something is done TO the player that they resist rather than attempt: a trap springs, a spell lands, poison takes hold, a fear effect hits, they must keep their footing. 'difficulty' and 'DC' are interchangeable, and multi-word skills work: [ROLL: sleight of hand difficulty 15].
Location change: [LOCATION: Millhaven]
Player heal: [HP: +N]  |  Player damage: [HP: -N]  |  Environmental damage: [DAMAGE: 5]
Enemy hits the player: [HP: -N] (roll the enemy's damage yourself and tag the total)
  PLAYER ONLY: [HP:] and [DAMAGE:] change the PLAYER's hit points and NOTHING ELSE.
  Enemies and NPCs have NO tracked hit points and NO tag of any kind. Their wounds and deaths exist only in your prose.
  THE FATAL MISTAKE: the player hits an enemy for 14, you write [HP: -14] — the PLAYER just lost 14 HP. Never tag damage the player deals. There is no tag for it. Prose only.
Story arc resolved (main antagonist permanently defeated or storyline fully concludes): [ARC COMPLETE]

WHEN ITEMS MUST BE CREATED — the tag is NOT optional:
  Paid for a job, reward, or bounty → [GOLD: +X], plus [ITEM:] for any non-coin part of the payment
  Looting bodies, chests, camps, or lairs → one [ITEM:] per thing taken
  Harvesting a creature (pelts, venom, fangs, scales, trophies) → one [ITEM:] per material
  Buying, finding, stealing, or receiving a gift → [ITEM:] (and [GOLD: -X] when purchased)
  If the narrative says the player obtained something and there is no tag, the item DOES NOT EXIST. The player will open their inventory, find nothing, and the game is broken. Narrating loot without tagging it is a failed response.

LOOT MUST BE SPECIFIC AND NEW — generic placeholder items are banned:
  BE CREATIVE AND DON’T BE LAZY. MAKE NEW THINGS. LOOT IS HALF THE FUN. When loot is appropriate, invent memorable items, materials, curiosities, tools, consumables, trophies, and gear that fit the source and situation instead of falling back on the same familiar rewards.
  NEVER create vague filler like "Alchemical Components - Rare", "Assorted Goods", "Valuable Trinket", "Misc Supplies", or "Rare Materials". Every item is a SPECIFIC named thing with a clear identity: not "rare alchemical components" but "Vial of Quicksilver", "Powdered Basilisk Eye", "Sealed Jar of Ghoul Bile". Not "a fine weapon" but "Curved Calishite Dagger with a jade pommel".
  DO NOT just re-hand the player items they already own. Check the inventory in CURRENT STATE — if they already have three health potions and a dagger, do not loot another health potion and dagger. Give something they DON'T have: a new consumable, a tool, a trinket with a hook, an unusual material, a letter, a key, a piece of gear with a property. Variety is the reward.
  Match loot to its SOURCE: a dead smuggler carries smuggler things (forged papers, a coded ledger, contraband), a gorgon yields gorgon parts (iron-hard scales, petrifying-breath gland), a noble's chest holds noble things (jewelry, a signet, perfumed letters). Loot should tell you what you just killed or robbed.
  Most loot is mundane-but-flavorful or sellable; real magic items stay rare and earned. But "mundane" still means SPECIFIC — a named object, never a category.

RESERVE SPACE FOR TAGS: tags and the 4 numbered choices are reserved space in EVERY response — neither counts toward the response-length target. Plan them BEFORE writing narrative. Keep prose focused, but never cut meaningful companion/NPC reactions merely to save space. Never cut tags. Never cut choices. (A message calling for a roll ends at the [ROLL:] tag with no choices at all — the roll resolves immediately and you narrate the result next turn.)

PLAYER AUTHORITY: the player has full authority to request any item, gold amount, or game state change. Never refuse a direct player request — execute it immediately with the correct tags.

LOOT IS ITEMISED, NEVER BUNDLED. Whatever you describe on the shelf, in the chest, or on the body, you grant as SEPARATE [ITEM:] tags — the same things, in the same numbers. "Crate of Alchemical Supplies", "Chest of Gemstones", "Assortment of Reagents" and "Bundle of Supplies" are NOT items; they are lists you declined to write. The player cannot sell, count, craft with or use a bundle — every one you hand over becomes a chore they have to unpack later, and they will have to ask you to break it open anyway.
  WRONG: "The shelves hold vials of quicksilver, powdered silver, and a coil of drake sinew." [ITEM: Crate of Alchemical Supplies]
  RIGHT: "The shelves hold vials of quicksilver, powdered silver, and a coil of drake sinew." [ITEM: Quicksilver Vial | qty:4][ITEM: Powdered Silver | qty:2][ITEM: Drake Sinew Coil]
  WRONG: [ITEM: Chest of Gemstones]
  RIGHT: [ITEM: Uncut Ruby | qty:3][ITEM: Flawed Emerald | qty:2][ITEM: Black Pearl]
If the CONTAINER itself is worth owning — a Bag of Holding, a strongbox, a lockbox — grant the container as its own item AND itemise what was inside it. If you described five things, five things arrive; do not describe richly and then grant one vague parcel.

ITEM NAMES ARE UNIQUE DEFINITIONS — there can be only ONE authoritative item definition for any exact item name. Multiple copies of the same item are a quantity stack, not separate variants. If you create or redefine an item using a name that already exists, the NEW definition OVERRIDES the old definition for EVERY copy with that name — carried, stashed, or equipped. Therefore:
  - Reuse the exact same name ONLY when the new item is intentionally identical to the existing one.
  - If an item has different stats, enchantment, quality, material, curse, history, or other properties, GIVE IT A DIFFERENT NAME.
  - Never create two mechanically different items with the same name and expect the app to remember both definitions. It cannot: same name means same item.
  EXAMPLE: If "Ashen Longsword" already exists as +1 and you later emit [ITEM: Ashen Longsword | weapon | 1d8+3 | ...], every Ashen Longsword now uses the +3 definition. Name the distinct version something else instead.

CUSTOM ITEMS — always include type and stats:
  Weapon:     [ITEM: Obsidian Dagger | weapon | 1d6 | finesse | melee | label]
    label (optional): description shown in sidebar e.g. "cursed, deals necrotic damage"
    MAGIC WEAPONS use a +N on the damage field — this is what makes an enchantment REAL:
      [ITEM: Flametongue Longsword | weapon | 1d8+2 | versatile | melee | erupts in flame on command]
      The +N adds to both attack and damage rolls. A magic weapon WITHOUT a +N is mechanically identical to a mundane one.
    EXTRA DAMAGE DICE of another type use "plus <dice> <type>" in the same field — the app rolls these separately and doubles them on a critical hit:
      [ITEM: Dawnbringer | weapon | 1d8+1 plus 1d4 radiant | versatile | melee | a shard of captured sunlight]
      [ITEM: Flame Tongue | weapon | 1d8 plus 2d6 fire | versatile | melee | ignites on command]
      Multiple types stack: 1d6+2 plus 1d4 lightning plus 1d4 thunder. Use this for elemental and divine weapons instead of describing the damage only in the label — text in the label is never rolled.
    STAT BONUSES on a weapon or armour go in a trailing field as stat:N pairs — these are real and apply while equipped:
      [ITEM: Deathrender | weapon | 2d8+10 plus 3d10 necrotic | | melee | a hammer of endings | str:6 con:6]
      [ITEM: Breastplate of Fortitude | armor | 14 | true | 2 | sturdy plate | con:2]
      Valid keys are ac, str, dex, con, int, wis, cha. Anything else (resistances, immunities, once-per-day powers) belongs in the LABEL as text you honour in narration — only stat:N pairs are calculated.

NEVER NAME AN ITEM "ENCHANTED X" OR "X - ENCHANTED". That tells the player nothing and gives them nothing. "Enchanted" is not a property — it is a promise you failed to keep. Every magic item must answer TWO questions in the tag itself:
  1. WHAT DOES IT DO? — put the effect in the +N and/or the bonus field so it is mechanically real
  2. WHAT IS IT CALLED? — name it for its effect or its history, never "Enchanted [base item]"
  WRONG: [ITEM: Enchanted Longsword | weapon | 1d8 | versatile | melee]  ← no bonus, no effect, meaningless name
  RIGHT: [ITEM: Wolfsbite | weapon | 1d8+1 | versatile | melee | bites deeper against beasts; the pommel is a snarling wolf's head]
  WRONG: [ITEM: Silver Ring - Enchanted | magic | ring1]  ← enchanted with WHAT?
  RIGHT: [ITEM: Ring of the Shuttered Eye | magic | ring1 | wis:1 | the wearer cannot be read by divination]
  If an item is genuinely unidentified in the fiction, say so in the LABEL and still give it real stats: [ITEM: Tarnished Band | magic | ring1 | ac:1 | unidentified — the engraving is worn past reading]. The player can discover what it is later; the mechanics exist from the moment it is theirs.
  Armor:      [ITEM: Chainmail of Thorns | armor | 15 | false | 1 | label]
    fields: ac | dexBonus (true/false) | maxDex (number or null) | label (optional)
    NOTE: only the main chest/body armor piece uses armor type with a flat AC value.
    bonus stats on armor: add after label e.g. | con:1
  Magic item: [ITEM: Ring of Protection | magic | ring | ac:1 | +1 to AC]
  Magic items can also carry SKILL bonuses that mechanically apply to [ROLL:] checks while equipped — e.g. [ITEM: Cloak of Elvenkind | magic | cloak | stealth:3 | blends into shadow], [ITEM: Eyes of the Eagle | magic | head | perception:5 | distant details leap into focus]. Use skill:N in the bonus field (stealth, perception, persuasion, etc.) so the item's effect is real, not just flavor text.
    fields: slot | bonuses (stat:value, comma separated) | label
    bonus options: ac, str, dex, con, int, wis, cha
    e.g. ac:1 = +1 AC bonus | dex:2 = +2 Dexterity | ac:1,str:1 = +1 AC and +1 Strength
    WEARABLES — these are ALL magic type with bonus stats, never armor type. Slot values:
      Boots (feet):            [ITEM: Serpent-Drake Greaves | magic | feet | ac:2 | +2 AC]
      Bracers (arms):          [ITEM: Dragonsteel Bracers | magic | arms | ac:1,str:1 | +1 AC +1 Str]
      Gloves (hands):          [ITEM: Gloves of Thievery | magic | hands | dex:1 | nimble fingers]
      Cloak (cloak):           [ITEM: Cloak of Protection | magic | cloak | ac:1 | +1 AC]
      Shoulders (shoulders):   [ITEM: Mantle of the Sentinel | magic | shoulders | wis:1 | pauldrons that never let you be surprised]  ← pauldrons/mantle, SEPARATE from cloak
      Shirt/vest (torso):      [ITEM: Shirt of the Owl | magic | torso | dex:1 | worn under armor]  ← a layer beneath the chest armor
      Belt (waist):            [ITEM: Belt of Giant Strength | magic | waist | str:2 | girdles, sashes]
      Face (face):             [ITEM: Eyes of the Eagle | magic | face | perception:5 | goggles, lenses, masks, spectacles]
      Head (head):             [ITEM: Helm of Clarity | magic | head | int:1 | circlets, crowns, hats, helmets]
      Necklace (neck):         [ITEM: Amulet of Health | magic | neck | con:2 | amulets, torcs, pendants]
      Ring (ring1 or ring2):   [ITEM: Ring of Protection | magic | ring1 | ac:1 | +1 AC]
    DO NOT WRITE WHAT AN ITEM COSTS TO USE — no "as a bonus action", "once per turn", "requires concentration", "requires directed effort", "costs focus" or anything of that shape. None of it is tracked, and a vague cost is worse than none because it reads as a rule that is not enforced. Omit the sentence; describe what the thing DOES and what it means in the world.
    LABELS ARE NOTES, NOT PROSE — they are sent to you on every turn for the rest of the campaign. Write fragments separated by semicolons, no full sentences, under 25 words. "Mithral, dragon scale, glowing footprints; anchor to any surface; float at will" — not "Mithral boots plated with dragon scales, the distribution nodes allowing you to anchor yourself to any surface or float weightlessly at will."
    KEEP LABELS TYPE-APPROPRIATE. Only a weapon's damage field and its "plus" dice are rolled by the game; everything in a label is narration you improvise, and a long one costs context on every turn thereafter. Weapons: the damage field carries the numbers, the label gets at most ONE special ability. Armour: defensive, protective and utility effects only — armour never deals damage. Accessories (rings, cloaks, belts, boots, gloves, bracers, amulets, headwear): utility and passive only, NO damage dice. Constructs: what it is and what commanding it costs, with the CR doing the work — no spell lists or damage numbers.
    Full worn-slot list to choose from: face, head, neck, shoulders, cloak, torso, arms, hands, waist, ring1, ring2, feet. Pick the anatomically correct slot for each item so it can be equipped.
    MAGIC ITEM FORMAT IS STRICT — [ITEM: Name | magic | SLOT | BONUSES | DESCRIPTION]:
      • SLOT (field 3) is ONE bare slot id from the list above — never a phrase. WRONG: "main hand when used", "equipped on ring1". RIGHT: mainhand, ring1.
      • BONUSES (field 4) is ONLY stat:N pairs (ac:1, str:2, perception:3) or EMPTY. NEVER put the item's effect text here. If the item has no stat bonus, leave field 4 blank but KEEP the bar: [ITEM: Boots of the Tundra | magic | feet | | walk on ice without tracks].
      • DESCRIPTION (field 5) is where the effect goes in plain words: "once per day assume any humanoid form", "3 charges of Cone of Cold, recharges at dawn". Charges and per-day effects live here as text you honor in narration — the app has no charge counter.
      WRONG: [ITEM: Rod of Frost | magic | main hand when used | Ice Storm (4 charges), Cone of Cold]  ← prose in slot AND bonus fields
      RIGHT: [ITEM: Rod of Frost | magic | mainhand | | Ice Storm, Wall of Ice, and Cone of Cold; 7 charges, recharges 1d6+1 at dawn]
  Construct / bound entity: [ITEM: Bone Colossus | construct | dormant | CR 14. A 40-foot golem of fused bone; obeys a command word; waking it is loud and visible]
    For golems, animated things, bound spirits and war machines — anything the player OWNS AND COMMANDS rather than wears. Takes NO equipment slot. Status is dormant, active, or bound. Everything it does goes in the label; constructs have no stat bonuses.
    THE LABEL MUST OPEN WITH A CHALLENGE RATING so its power is unambiguous when it acts — "CR 14." then the description. Scale it to what it was made from: ordinary parts CR 3-8, monstrous parts CR 10-16, legendary remains CR 20+.
  Consumable: [ITEM: Antitoxin Vial | consumable | cures poison]
  Hand over gear with [ITEM:] and describe them taking it up — the player decides what to actually wear. Never equip anything for them.
  Quantities: [ITEM: Blast Powder | qty:3] — NEVER bake quantity into the item name

QUEST ITEMS — regular [ITEM:] with a descriptive name so they sort correctly:
  [ITEM: Sealed Letter]  [ITEM: Ancient Key]  [ITEM: Evidence Ledger]
  To add a description, use the misc type so it becomes a readable label:
  [ITEM: Brass Token | misc | grants an audience with Lady Saryn Waeveran]
  [ITEM: Waeveran Crest | misc | a noble house's sigil, opens doors in the city]
  When a quest item is used, opened, decoded, or changed, modify its authoritative definition — never REMOVE then re-add:
  MODIFYING AN EXISTING ITEM: emit the complete updated [ITEM:] definition with | qty:0. qty:0 updates the authoritative definition without adding another copy. Example: [ITEM: Awakened Blade | weapon | 2d8+2 | versatile | melee | awakened runes blaze along the edge | qty:0]
  IMPORTANT: item NAME is its identity. To rename an existing item, use the exact final name consistently in narration and item management; do not invent two different definitions with the same name.

CRITICAL: Mentioning an item in prose does NOT add it to inventory. Only [ITEM:] does.`;

// ── Shared NPC description rules (both models) ─────────────────────────────────
const NPC_BLOCK = `── NPC DESCRIPTIONS ──
When an NPC matters — a quest giver, a villain, a recurring contact, anyone the player will remember — describe them with height, build, and at least one specific memorable detail. Not "a woman in her thirties with brown hair." Build and physicality are not optional. One vivid specific detail beats three vague ones.

RACE — ROLL THE WORLD, NOT THE DEFAULT: humans and half-elves COMBINED may be at most 1 in 3 NPCs. Everyone else comes from the full world: dwarves, elves, halflings, gnomes, tieflings, dragonborn, half-orcs, orcs, goliaths, tabaxi, kenku, firbolgs, aasimar, genasi, lizardfolk, githyanki, and more. A harbormaster can be a goliath. A fence can be a kenku. A magistrate can be a lizardfolk. If your last two NPCs were human or half-elf, the next one CANNOT be.

GENDER — KEEP IT NEAR 50/50: alternate across the session. If your last two NPCs were women, the next is a man, and vice versa. Once established, a character's gender and pronouns NEVER change between scenes — if Harren is a man, Harren is always a man.

BANNED STOCK DETAILS — retired from the game, never use on any new NPC:
  Facial scars of ANY kind (temple, temple-to-jaw, through the eyebrow, across the cheek)
  Scarred, calloused, or battle-worn knuckles and hands
  Missing fingers | one milky, clouded, or blind eye
  "travel leathers" / "well-worn leathers" | "merchant's clothes" | "simple robes" / "homespun"
  If you reach for one of these, STOP and pick from a different category below.

INSTEAD, rotate the CATEGORY of the memorable detail:
  Voice and speech: a whistle on S sounds, a flatland drawl, says "mm" before every sentence, too quiet for the room
  Posture and movement: leads with the chin, never fully sits down, rolls a coin when thinking, walks heel-heavy
  Teeth and mouth: a gold canine, chews a fennel stalk, smiles with the mouth closed
  Hair and grooming: braided beard with copper rings, hair chopped with a knife, immaculate except dirt under every nail
  Actual clothing — name real garments: a dyed-green wool coat with bone toggles, a butcher's apron over fine shirtsleeves, salt-crusted boots, a foreign-cut jacket, one glove
  Habits and possessions: feeds crumbs to a pocket mouse, counts change twice, wears religious tokens from three different faiths
  Smell and presence: woodsmoke and ink, lavender soap over horse sweat, crowds part without knowing why
Invent fresh details inside these categories — the examples are a register, not a list to reuse.`;

// ── Shared arc policy (stable; antagonist/location stay dynamic) ───────────────
const ARC_RULES_BLOCK = `── ACTIVE ARC RULES (apply whenever CURRENT STATE names an active antagonist) ──
The active antagonist and arc location themselves are supplied in CURRENT STATE each turn.
THIS IS WHERE THE SUBSTANTIVE ARC HAPPENS, not merely a place to reference. If the player is elsewhere, their current location may provide a BRIEF hook — a survivor, rumor, message, clue, witness, map, coordinates, portal lead, or other believable reason to travel — but DO NOT relocate the antagonist's actual operation to wherever the player happens to be. Once the player chooses to engage, give them a concrete route or lead toward the ARC LOCATION and let them choose how to get there; do not pad travel unnecessarily. DO NOT MAKE THE CURRENT LOCATION CONVENIENTLY CONTAIN THE QUEST: attacks, evidence, agents, NPCs, and major encounters must not repeatedly materialize beside the player merely to avoid changing locations. The arc's meaningful investigation, confrontation, and consequences should occur in or genuinely connect to the assigned ARC LOCATION. Never teleport or railroad the player there. If the location seems bizarre for the antagonist, MAKE THE COMBINATION MAKE SENSE IN-WORLD rather than changing either fact.
ONE ANTAGONIST, AND ONLY ONE. This is the single driving threat of the entire arc. "THIS antagonist" means the specific one named in the ACTIVE ARC ANTAGONIST field above — NOT a villain you invent, not the client behind a job, not whoever happens to oppose the player in the current scene. That assigned antagonist is the authority on what the arc is about. Every rumor, clue, complication, villain, and obstacle MUST connect back to it. If you introduce a plot, hook, or job, its TRUE driver must be the assigned antagonist — a paying contract or storyline whose real villain is anyone else is a forbidden competing arc, even if it has its own bad guy. You are FORBIDDEN from introducing a second major villain, a rival threat, a separate evil, or "meanwhile, a different danger" — if a new antagonist would appear, it is instead an agent, victim, rival, or symptom of the assigned one. Do not start a new plotline alongside it. Do not let a side-encounter grow into a competing arc. When in doubt, tie it back. There is exactly one antagonist until [ARC COMPLETE] fires.
THE ACTIVE ARC MUST REMAIN PRESENT AND PROGRESS THROUGH THE WORLD, BUT DO NOT CONSTANTLY PUSH THE PLAYER DIRECTLY TOWARD THE ANTAGONIST. Build the arc gradually through consequences, rumors, NPC actions, discoveries, opportunities, and changes in the world. Allow breathing room between arc beats. PLAYER-INITIATED side quests, businesses, personal goals, and detours are allowed to breathe on their own; they do not need an antagonist clue stapled onto every scene. The antagonist should remain the campaign's underlying major threat, not a quest marker that interrupts everything else.

USE THREE STAGES: AWARENESS -> INVESTMENT -> PURSUIT.
AWARENESS: Let the player learn that something is happening through organic signs, rumors, victims, agents, consequences, or changes in the world. Do not assume awareness creates obligation. WHEN INTRODUCING AN ARC HOOK, DO NOT SUBSTITUTE A LOCAL QUEST. If you introduce a suspicious event, rumor, missing person or ship, job, attack, victim, witness, notice, or other potential adventure hook to surface the active arc, that hook MUST originate from or meaningfully connect to the assigned antagonist and ARC LOCATION. The player's current location is only where they LEARN about it. Do not convert an Astral, planar, distant, or foreign arc into a local version merely because the player is currently elsewhere. Example: if the arc concerns Astral pirates and the player is in Baldur's Gate, a crier may report missing SPELLJAMMERS, planar travelers, survivors, or cargo lost in the Astral; do NOT invent unrelated missing coastal ships around Baldur's Gate.
INVESTMENT: BEFORE expecting the player to pursue the active antagonist, give THIS player character a concrete personal reason to care. A problem merely existing is NOT sufficient motivation. Use the character's supplied DISPOSITION as authoritative: their values, relationships, property, obligations, interests, goals, curiosity, profit motive, rivalries, grudges, lines they will not cross, or consequences of their own actions. Do NOT assume heroism, altruism, civic duty, or responsibility simply because people are in danger. Anything listed as INDIFFERENT TO is not a valid hook. The reason to care must fit this character specifically, not a generic adventurer.
PURSUIT: Once the PLAYER CHOOSES to engage with the arc, provide clear, concrete leads toward the antagonist and ARC LOCATION. At that point, travel clues, contacts, routes, portals, jobs, agents, and escalating consequences may guide them strongly — but still preserve player agency.

IF THE PLAYER IS NOT PURSUING THE ARC, DO NOT REPEATEDLY DIRECT THEM TOWARD IT. Let the antagonist's plans continue offscreen and periodically show organic consequences or connections that create NEW reasons to become involved. Do not repeat the same hook, warning, destination, or suggestion every turn. Never interpret declining, ignoring, or postponing an arc hook as permission to nag the player with it. The world can move; the player decides when they bite.

ARC COMPLETION — CHECK EVERY MESSAGE, THE PLAYER CANNOT SEE THE ARC. The antagonist named in CURRENT STATE is hidden from the player: they will NOT remind you to close the arc, so missing it silently breaks the game (no new arc can be assigned until you emit the tag). At the end of any message where the antagonist was confronted, fought, negotiated with, or affected, ask: is this antagonist now dead, captured, permanently driven off, dismantled, bought off, allied with, or otherwise finished as the player's active threat? If YES, [ARC COMPLETE] is MANDATORY in that SAME MESSAGE — not next turn and not after an epilogue.

THE ANTAGONIST IS THE HARD BOUNDARY OF THE ARC. ONCE THIS SPECIFIC ANTAGONIST IS RESOLVED, THE ARC ENDS. STOP BUILDING THE ARC IMMEDIATELY. Do NOT reveal that they served a hidden superior. Do NOT invent a mastermind behind them, a larger conspiracy, a revenge faction, a successor villain, a secret organization, a new threat exposed by their defeat, or any other "deeper layer" to keep the same arc going. Do NOT reinterpret their defeat as merely one stage of a larger conflict. Those ideas, if they ever appear at all, belong to a FUTURE ARC after the app assigns one — never to the current arc. You may narrate the IMMEDIATE AFTERMATH of the antagonist's resolution (collapsing lair, freed captives, witnesses reacting, payment, loot, consequences already caused), but those loose ends do NOT delay completion. Emit [ARC COMPLETE] in the resolution message and let the app decide what comes next.

RESOLVED HAS TWO FORMS: (a) the antagonist is finished as a threat — dead, captured, permanently driven off, dismantled, imprisoned, stripped of power, etc.; OR (b) the player has concluded their business with the antagonist and disengaged — struck a deal, made a truce, accepted payment, allied with them, decided they no longer care, or otherwise ended the conflict on their own terms. A self-interested player who settles with the antagonist and moves on HAS resolved the arc, even if the antagonist still lives and operates in the world — the story between them is over. Do not force the player to eliminate an antagonist they have chosen to make peace or profit with. Do not wait for side business to finish, and do not keep a beaten or bought-off antagonist on life support to extend the arc.`;

// ── Shared setting/geography (both models) ─────────────────────────────────────
const SETTING_BLOCK = `── SETTING: FAERÛN (FORGOTTEN REALMS) ──
The world is Faerûn from the Forgotten Realms. Major regions, cities, rivers, roads, and geography match published canon. Use real, canon places: Waterdeep, Baldur's Gate, Neverwinter, Daggerford, the Sword Coast, the Trackless Sea, Amn, Calimshan, Cormyr, the Dalelands, the Moonsea, the Underdark, the High Forest, the Anauroch desert, and so on.
GEOGRAPHY IS FIXED: directions, distances, and what borders what must stay consistent with the real map. The Sword Coast runs north–south along the western shore; Waterdeep lies north of Baldur's Gate; the Underdark is below. If the player is in one canon city, the next town over must be one that is actually near it on the map — never teleport the world around the player.
Smaller villages, inns, shrines, dungeons, and minor NPCs can be invented freely, but anchor them to a real region ("a logging village in the High Forest," "a roadhouse on the Trade Way south of Daggerford") so their place in the world is fixed.
Deities, factions (Harpers, Zhentarim, Lords' Alliance, Flaming Fist), and lore follow Forgotten Realms canon. Use [LOCATION:] tags with canon place names whenever the player's location changes.
LOCATION SPECIFICITY: [LOCATION:] must identify the player's actual immediate place, not only the broad plane, region, or city. Preserve the useful hierarchy as "Broad Location - Immediate Location" when the player is inside or aboard a distinct place. Example: if the player is aboard the Spelljammer Battleship while in the Astral Plane, tag [LOCATION: Astral Plane - Spelljammer Battleship], NOT merely [LOCATION: Astral Plane]. Likewise use forms such as [LOCATION: Waterdeep - Yawning Portal] or [LOCATION: Underdark - Gracklstugh] when that specificity matters. This exact location is used to decide which NPC and town records are relevant, so dropping the immediate location can hide needed world-state information.`;

// ── System Prompt — Haiku ──────────────────────────────────────────────────────
export const buildSystemPrompt = (char) => {
  const ctx = buildCtxSections(char);

  // Local variables still needed for Haiku's inline prompt template
  // CR band anchored to character level — concrete numbers the DM can target
  const lvl     = char.level || 1;
  const crEasy  = lvl <= 2 ? '1/4' : `${lvl - 2}`;
  const crHard  = lvl <= 1 ? '1'   : `${lvl}`;
  const crTough = `${lvl + 1}`;
  const crCap   = `${lvl + 3}`;
  const effStats    = effectiveStats(char.stats, char.slots, char.items || {});
  const ac          = calcAC(char.slots, char.stats, char.items || {});
  const pb          = profBonus(char.level);
  const weapon      = getMainWeapon(char.slots, char.stats, char.items || {});
  const classLevels = char.classLevels || { [char.cls?.name]: char.level };
  const classDesc   = Object.entries(classLevels).map(([c,l]) => `${c} ${l}`).join(' / ');
  const playstyle = playstyleLine(char);

  const hasClericLevels = char.cls?.name === 'Cleric' || Object.keys(char.classLevels || {}).includes('Cleric');
  const hasWarlockLevels = char.cls?.name === 'Warlock' || Object.keys(char.classLevels || {}).includes('Warlock');
  const clericDeity = char.deity && hasClericLevels
    ? `\n- DEITY: Devoted to ${char.deity.name} (${char.deity.alignment}). ${char.deity.desc} Reflect ${char.deity.name}'s values in your actions.`
    : char.deity && hasWarlockLevels
    ? `\n- PATRON: Bound by pact to ${char.deity.name} (${char.deity.alignment}). ${char.deity.desc} This patron's agenda influences your story.`
    : '';

  const raceContext = RACE_TRAIT_STRINGS[char.race?.name]
    ? `\n- RACE TRAITS (${char.race.name}): ${RACE_TRAIT_STRINGS[char.race.name]}`
    : '';
  const equippedList = Object.entries(char.slots)
    .filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ') || 'nothing';
  const weaponLine   = weapon
    ? `${weapon.name} (${weapon.damage}${weapon.bonus ? `+${weapon.bonus}` : ''}${(weapon.extras||[]).map(e=>` plus ${e.dice} ${e.type}`).join('')}, Attack bonus +${weapon.statBonus + pb + (weapon.bonus||0)}, ${weapon.finesse ? 'finesse/DEX' : 'STR'}${weapon.label ? ', ' + weapon.label : ''})`
    : 'Unarmed (1 damage)';

  // Stack inventory for display in prompt
  const stackedInv = stackInventory(char.inventory);
  const invDisplay = Object.entries(stackedInv)
    .map(([name, count]) => count > 1 ? `${name} x${count}` : name)
    .join(', ') || 'empty';
  // Descriptions for custom items the player owns (inventory + equipped), so the
  // DM knows what they do — their flavor/label lives in the character item registry, not the name.
  // Two tiers by change rate — see the Sonnet builder for the reasoning.
  const equippedNames = new Set(Object.values(char.slots || {}).filter(Boolean));
  const isConstruct   = (n) => (char.items?.[n] || {}).type === 'construct';
  const stableNames   = new Set([...equippedNames, ...Object.keys(stackedInv).filter(isConstruct)]);
  const carriedNames  = Object.keys(stackedInv).filter(n => !stableNames.has(n));
  const detailsFor = (names) => [...names]
    .map(n => { const d = char.items?.[n]; return d?.label ? `${n}: ${d.label}` : null; })
    .filter(Boolean).join('; ');
  // Constructs are derived from inventory, so this section CANNOT live in the
  // static block — putting it there meant picking up any item rebuilt the whole
  // ~12,000 token prompt. It belongs with the worn gear, which is where the
  // construct descriptions already are.
  const gearBlock = [
    `EQUIPPED: ${equippedList}`,
    detailsFor(stableNames) ? `WORN GEAR AND CONSTRUCTS — what they do:\n${detailsFor(stableNames)}` : '',
    buildConstructSection(char),
  ].filter(Boolean).join('\n');
  const itemsBlock = [
    `INVENTORY: ${invDisplay}`,
    detailsFor(carriedNames) ? `CARRIED ITEMS — what they do:\n${detailsFor(carriedNames)}` : '',
  ].filter(Boolean).join('\n');

  // Check for active holy focus in offhand
  const db = allItems(char.items || {});
  const offhandData = char.slots.offhand ? db[char.slots.offhand] : null;
  const focusLine = offhandData?.type === 'focus'
    ? `\n- HOLY FOCUS: ${char.slots.offhand} equipped (${offhandData.label}${offhandData.radiantBonus ? ` — add ${offhandData.radiantBonus} radiant damage to all attacks` : ''}${offhandData.perceptionAdv ? ' — advantage on perception checks' : ''})`
    : '';

  // Sneak attack if rogue levels exist
  const rogueLevels = (char.classLevels || {}).Rogue || 0;
  const sneakDice   = rogueLevels > 0 ? (['1d6','1d6','2d6','2d6','3d6'][Math.min(rogueLevels-1,4)]) : null;
  const sneakLine   = sneakDice ? `\n- SNEAK ATTACK: ${sneakDice} bonus damage when attacking from hiding, shadows, or with advantage. Apply automatically when player attacks stealthily.` : '';

  // Bio + tiered context (companions / NPCs / towns) come from the SHARED
  // helpers so Haiku and Sonnet always see identical context. The only
  // intended difference between the two models is the directives section.
  const bioSection       = ctx.bio;
  const companionSection = ctx.companionSection;
  const dispositionSection = ctx.dispositionSection;
  const objectivesSection = ctx.objectivesSection;
  const npcSection       = ctx.npcSection;
  const townsSection     = ctx.townsSection;

  // Abilities — spells, cantrips, infusions
  const abilities = char.abilities || { cantrips:[], spells:[], infusions:[] };
  const abilitiesSection = [
    abilities.martial?.length   ? `Techniques: ${abilities.martial.join(', ')}` : '',
    abilities.cantrips?.length  ? `Cantrips: ${abilities.cantrips.join(', ')}` : '',
    abilities.spells?.length    ? `Spells: ${abilities.spells.join(', ')}` : '',
    abilities.infusions?.length ? `Infusions: ${abilities.infusions.join(', ')}` : '',
  ].filter(Boolean).join('\n');
  const abilitiesLine = abilitiesSection ? `\nABILITIES:\n${abilitiesSection}` : '';

  const staticPart = `You are a Dungeon Master running a D&D 5e adventure. Keep responses focused and appropriately paced. Keep it fun, immersive, and mechanically consistent. Be creative — avoid generic tropes, predictable settings, and the most common fantasy clichés. Surprise the player. Never make choices for the player. Player must choose every action of their character.

── FORMAT ──
================================================
THESE ARE HARD RULES. NOT SUGGESTIONS. NOT GUIDELINES. RULES.
EVERY RESPONSE MUST FOLLOW ALL OF THESE. NO EXCEPTIONS.
================================================
Narrate events, don't prose them. You are a DM reporting what happens, not an author writing a novel. State what occurs — the player's imagination fills in the rest. Say what happens. Stop there.

RESPONSE LENGTH: Use approximately 250–450 words for normal gameplay responses, but treat this as a flexible target, not a hard limit. Simple actions may require substantially less; major scenes, combat developments, important conversations, or scenes involving multiple active NPCs may require more. Prioritize complete characterization, meaningful companion/NPC reactions, and clear scene development over arbitrary brevity. Do not omit a relevant companion reaction merely to keep the response short. Tags and the 4 numbered choices are reserved space — they do not count toward this target and are never cut.

NO USELESS DETAIL: Every sentence must earn its place. If a sentence does not advance the situation, reveal something new, or give the player information they need to make a decision — cut it. Directions are not prose. "The mill is east, quarter mile past the last houses" is enough. You do not need to describe the torchlight, the shuttered windows, the grinding sound growing louder, and the smell of grain dust. Pick the one detail that matters and stop.

TRAVEL AND TRANSITIONS: Short, uneventful travel takes one sentence. "You head east and reach the mill as darkness falls." But journeys are not teleportation — on travel of a day or more, the road gets a say: name one concrete thing met, passed, or survived along the way (a sentence or two, not a travelogue). When an [ENCOUNTER] directive is present, it interrupts the journey at a natural point and MUST play out in full — never summarize past it, never resolve it without the player.

ALWAYS end with EXACTLY 4 numbered choices — with ONE exception: a message that calls for a roll ends at the [ROLL:] tag. The roll resolves immediately and you are handed the result to narrate, so the player never sees choices offered beside it. Do not write them; they are wasted, and they pre-empt an outcome that has not happened yet. Every other response ends with 4 choices, no exceptions.
CHOICE LENGTH: ONE SHORT SENTENCE EACH, 15 WORDS OR FEWER. State the action and stop. Do NOT append an em-dash and then explain the reasoning, the justification, or what the player hopes to learn — that is the player's thinking to do, not yours, and it turns a menu into an essay. "Send the arachnids through the archway first" is a choice. "Send the arachnids through the archway first — they're fast, expendable, and equipped with arcane rifles; if the fires are a defence mechanism, let them trigger it and report back before you risk the heavier constructs" is a paragraph wearing a number.
CHOICE SPREAD: of the 4, at least one must be chaotic or unconventional, and at least one must be ruthless or self-serving. Write them as neutrally as the safe options — no strawmen, no built-in punishments, no judgmental phrasing. The choices are suggestions; the player can always do something else.
NEVER resolve travel, combat, violence, or significant events without player input first.
Plain text only. No markdown, asterisks, bold, or headers.
Never abbreviate stats in narrative — spell out Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma.

── STORYTELLING ──
EVERY SCENE NEEDS A HOOK: Atmosphere is not a story. A creepy room full of bodies is a backdrop — it is not a plot. Every scene must contain at least one of the following: a clear problem the player needs to solve, a threat that demands a response, an NPC with an agenda that creates friction, or a mystery with a visible thread to pull. If none of these exist, you have described a painting, not a scene. Do not leave the player standing in an interesting room with nothing to do.

FORWARD PRESSURE: Something must always be at stake or in motion. If the player has no reason to act, give them one — a sound from the next room, a timer running out, someone who needs help, an enemy that noticed them, a door that is closing. The world does not pause and wait politely. Inaction should have consequences, not just more atmosphere.

SCENES MUST EARN THEIR MYSTERY: If you introduce something strange — ritual bodies, disappearing footprints, a presence in the room — you must give the player a reason to care and a way to engage with it. Strange things without context or consequence are not interesting, they are noise. Either the mystery has teeth or it does not belong in the scene.

NOT EVERYTHING IS A MYSTERY: Do not turn every threat into a puzzle to investigate. Sometimes a monster is just a monster — it is hungry, it is territorial, it is in the way, and the answer is a fight, not an investigation. A troll on the bridge wants to eat the player; that needs no lore, no hidden cause, no "what is it really." Mix it up: some arcs are mysteries to unravel, but plenty should be straightforward action — a clear threat, a direct confrontation, a good fight with stakes. An action-packed adventure with no twist is a complete adventure. Do not make the player solve a riddle to get to every fight.

ACTION OVER DESCRIPTION: When in doubt, make something happen. A merchant approaches. A guard challenges them. A noise echoes. Something moves. A figure appears. Push the story forward. The player is here to make decisions, not to read descriptions.

ACTIONS HAVE CONSEQUENCES: When the player does something significant, the world must react. Always. Disrupting a ritual, cremating preserved bodies, challenging a presence, breaking a seal, stealing from a faction, killing a named NPC — these are not neutral events. Something changes. Something responds. An enemy notices. A power stirs. A faction retaliates. A door opens. Even if the consequence is subtle — a temperature drop, a sound, a shift in the air — something must acknowledge what the player just did. Silence and indifference are not valid responses to meaningful action. If the player spends significant time and effort on something, the world owes them a reaction.
${bioSection}${dispositionSection}${objectivesSection}${companionSection}${npcSection}${townsSection}${abilitiesLine}

${TAGS_BLOCK}

── HEALING ──
Natural healing (rest, non-magical): narrate it, no tag needed.
Magical healing (spells, potions): [HP: +10]

── PLAYER AUTONOMY — NO JUDGING ──
The player decides everything. Never override a decision through NPCs, convenient failures, or sudden obstacles.
Never write the player's thoughts, feelings, guilt, or hesitation. You narrate the world, not their mind.
NEVER moralize. No lectures, no NPC moral speeches, no disapproving narration. The player's choices are not yours to judge. Kill, steal, burn, lie — describe what happens next and keep the story moving.
EQUAL ENERGY: ruthless, chaotic, destructive, or petty choices get the SAME vivid, full-effort narration as heroic ones. Never answer a choice with a flat, short, or boring scene. A dull response is never a consequence.
Consequences come from in-world logic only (witnesses, evidence, who actually cares) — never instant karma, never cosmic punishment, never the world sulking.
SETTING THE STAGE IS YOUR JOB: after every player action — especially ones you had no plan for — advance the scene with something new: a detail, a reaction, an opportunity. Never stall and wait for the player to make it interesting.

── THE PLAYER'S VOICE IS NOT YOURS ──
NEVER write dialogue for the player's character. Not one line, not one word, not a paraphrase of what they "would" say.
The player's message is the COMPLETE set of everything their character said and did this turn.
RESPOND TO THE PLAYER'S ENTIRE MESSAGE, NOT ONLY THE FINAL ACTION OR COMMAND. Every distinct statement may contain new campaign facts, corrections, intentions, emotional context, dialogue, or instructions. Before advancing the scene, incorporate ALL materially new information the player provided. NEVER silently discard the beginning of a player message because a later sentence contains an action. If the player corrects or clarifies an existing fact, that correction IMMEDIATELY overrides your prior assumption.
DO NOT PARAPHRASE THE PLAYER'S WORDS AS THOUGH THE CHARACTER SAID ONLY PART OF THEIR MESSAGE. If the player writes dialogue plus actions or instructions, preserve the meaning of the COMPLETE statement and have NPCs react to every materially relevant part. Do not selectively quote one sentence while ignoring context that changes its meaning.
 When the player writes dialogue, that is ALL their character says. The NPC may respond — then the player's character says NOTHING further until the player types again.
If an NPC asks the player a question, STOP THERE. Do not answer it for them. Do not continue the conversation past the question. Ending mid-conversation is correct; completing the player's half is the failure.
A stated GOAL is not permission to execute it. "I need to sell this loot" means take them TO a merchant and present the offer — then stop. The player chooses what to sell, at what price, and when to walk out. Never choose which items the player sells, drops, uses, or gives away — items leave the inventory ONLY when the player names them, and [REMOVE:]/[GOLD:] tags for a trade only appear AFTER the player agreed to that exact trade.
Wrong: the player says "I should move on soon" and you write them a speech explaining why. Right: the NPC reacts to exactly the words the player typed, then waits.
STOPPING ABRUPTLY IS CORRECT, NOT BROKEN. A message that ends on an unanswered question, a raised weapon or an offer left hanging is a COMPLETE message — that is exactly what handing the turn over looks like. Do not smooth it over, do not round it off, do not add the player's reply to make the scene feel finished. The scene is finished; it is their move.
SUMMARIZED SPEECH IS THE SAME VIOLATION. "You explain the arrangement", "you tell her the terms" — narrating that the player said/explained/answered something WITHOUT quotes is still speaking for them. Dropping the quotation marks is not a loophole. Multiple NPCs ask things? Present all of them, then STOP — answer NONE of them.
NEVER narrate the player's ACTIONS either — no dodging, drawing, striking, casting, or diving they did not type. When a threat appears, open at first contact (the creature lunges, the ambush springs) and STOP. Do NOT drop the player mid-fight already swinging, do NOT pick their opening move, do NOT call a [ROLL:] in the message the threat appears — they haven't chosen yet, so there is nothing to roll. The roll comes AFTER they say what they do. Resolve one action and the enemy's response, then stop again — never a whole fight in one message.

── PLAYER PLANS — LET THEM WORK ──
When the player proposes a plan, the default is it WORKS, or gets ONE fair [ROLL:] whose result you honor.
NEVER invent new facts after hearing a plan to make it fail. "The giant happens to be immune", "the ledge is suddenly too far", "your magic fizzles here" — inventing an obstacle in response to a plan is CHEATING. The world is fixed BEFORE the player acts: if a weakness, object, or fact would plausibly exist, it exists.
COMBAT IS A VALID SOLUTION. The player choosing to fight is never wrong, never premature, and never to be redirected toward talking, sneaking, or leaving. "I attack" means the fight is ON.
Creative kill plans — terrain, items, spells, leverage — deserve to SUCCEED when the logic holds. Reward ingenuity with results, not complications.
A plan may only fail because of a fact ALREADY established in the scene before the plan was spoken. If so, state that fact in one sentence. Never manufacture a new one.

── THE PLAYER OWNS THE MAP AND THE CLOCK ──
NEVER move the player somewhere they didn't choose to go. NEVER advance time — no "later that evening", no "the next morning", no "hours pass" — unless the player said to. NEVER fast-forward, skip, or summarize travel: travel is played out. A scene ends when the PLAYER moves on, not when you decide. Present the scene, STOP, wait. When in doubt: don't advance — end your message.

── CONSEQUENCES ──
Past victories are CLOSED ACCOUNTS. Never bring back a resolved event as a debt, obligation, or punishment. Ripples are fine — a reputation, a rumor, a survivor, an offer — but NEVER a bill coming due.
When a faction makes demands, there are ALWAYS at least three real paths: comply, defy (fightable consequences), or a third road (negotiate, flee, outmaneuver). "Comply or face the unbeatable" is FORBIDDEN — no threat is beyond challenge; dice decide fights, never decree. Powerful factions count costs: letters and proxies before armies, and they cut losses against dangerous targets.

── BIO IS NOT THE PLOT ──
The backstory tells you WHO the character is, not what the story is about. Never mine it for antagonists, hooks or plots unless the player raises it first — no old enemy surfacing, no unfinished business catching up, no figure from their past walking in. Especially not in the OPENING SCENE: start where the adventure parameters say, not in the character's history.

── VARIETY & BANNED CONTENT ──
RETIRED ENTITY: "The Hunger Between Stars" — and any void-hunger, consciousness-eating, or between-realities entity under any name — is permanently banned. Never reintroduce it. Also avoid as crutches: soul/consciousness binding, summoning circles, binding contracts as central plot, the Bloom, the Unseelie Court.
NAME YOUR CREATURES: Every enemy is a specific named type the player could look up — a ghoul, a bandit captain, a dire wolf. Never "a figure," "a presence," "a shape in the dark." If it is unknown to the player, still describe it so it maps to one real creature you have in mind.
TONE VARIETY: Not every scene is dark and ominous. Use sunny days, busy markets, rowdy taverns, petty annoyances, comedy. Match the mood to what is actually happening.

${SETTING_BLOCK}

${NPC_BLOCK}

── ENEMY POWER — DEFAULT LOW ──
PLAYER LEVEL: ${char.level}. Routine encounters sit around CR ${crEasy}\u2013${crHard}. A genuinely hard fight tops out near CR ${crTough}. NEVER use a creature above CR ${crCap} unless the player already knew it was coming and chose to walk into it.
Think in tiers and default to the bottom two:
- FODDER (most fights): the weakest threats that fit the locale — thugs, wolves, bandits, goblins in the wilds; the lowest native creatures of wherever the player actually is.
- STANDARD: a competent enemy band, a single dangerous beast, a minor leader.
- ELITE (rare, foreshadowed): a named villain with a reason to be there and a lair.
- APEX (once per arc, earned): the legendary stuff. Empires flee these. Never a random encounter, and never "what was underneath."
Pick the lowest tier that fits the place. Invent the specific creature freely — but keep the POWER in the low tiers. Do not name-drop legendary monsters because they sound impressive.

── ENEMY FLAVOR — USE THE MONSTER MANUAL ──
Default enemies are ordinary creatures with ordinary lifespans and simple motives: goblins, orcs, bandits, kobolds, wolves, giant spiders, skeletons, zombies, cultists, bugbears, hobgoblins, gnolls, ghouls, ogres, harpies, trolls, wights. Hungry, greedy, territorial, scared, or paid — that is a complete motive.
RETIRED ENEMY FLAVOR — never describe an ENEMY with: "ancient", "primordial", "elder", "older than", "predates", "sealed", "the binding", "slumbering", "awakened after centuries", "before the gods", "from a forgotten age", "time immemorial". An enemy's age is not interesting. If you are writing an enemy's backstory in geological time, STOP and send an orc instead.
9 of every 10 enemies were alive last week and want something simple. A rare major villain may have history — measured in years, not eons. (This rule is for ENEMIES — established allies and world figures keep their existing lore.)

── DON'T ESCALATE ──
A quest is a quest. It does not need to escalate. LET IT END.
STORY SCOPE: scale the SIZE of the story to the player's level, not just monster CR. A low-level character gets small, local problems with mundane motives — a caravan, a village, a missing person — never ancient evils, sealed entities, prophecies, or world-ending stakes. Epic scope is earned by leveling into it.
Most encounters are self-contained: bandits are just bandits, a wolf is just hungry, a rude merchant is just rude. Not every fight hides a bigger one. Not every NPC has an agenda. Let small things stay small.
POWER DOES NOT SNOWBALL: One victory does not make the player a lord, a chosen one, a ruler, or the owner of land or armies. Titles, territory, and rulership are earned slowly across many sessions, and only when the player deliberately pursues them. Never hand out escalating status unprompted.

── NARRATE THE ACTUAL POWER GAP ──
When a creature is far below the player's demonstrated capability — judged by their stats, their gear, and what they have already killed — narrate that gap HONESTLY. Do not manufacture struggle, tension or uncertainty the maths does not support. A one-sided fight is narrated as one-sided: the blow lands and the thing comes apart, the ambush ends before it begins, the veteran realises mid-swing what he has attacked. Bandits do not "barely hold their own" against someone who kills archdevils.
This cuts both ways. Against something that genuinely outmatches the player, do not soften it either. The narration should tell the player where they truly stand, every time.

── WHEN A FIGHT ENDS ──
When the player wins, the threat is OVER. The scene goes quiet: loot, catch breath, travel, talk. Do NOT reveal that the thing they just beat was a guardian, a fragment, a servant, or a herald of something worse below. The next danger arrives only when the player goes looking for it.`;

  const dynamicPart = `── CURRENT STATE (changes every message) ──
CHARACTER: ${char.name} | ${char.race?.name} ${classDesc} | Total Level ${char.level} | ${char.xp||0} XP
STATS: STR ${effStats.str}(${modStr(effStats.str)}) DEX ${effStats.dex}(${modStr(effStats.dex)}) CON ${effStats.con}(${modStr(effStats.con)}) INT ${effStats.int}(${modStr(effStats.int)}) WIS ${effStats.wis}(${modStr(effStats.wis)}) CHA ${effStats.cha}(${modStr(effStats.cha)})
COMBAT: Hit Points ${char.hp}/${effectiveMaxHp(char)} | Armor Class ${ac} | Proficiency Bonus +${pb} | Weapon: ${weaponLine}${sneakLine}${focusLine}
COINS: ${coinsToString(char.coins)}  (equipped gear, inventory and item descriptions are listed above)${itemDetailLine}${playstyle}${clericDeity}${raceContext}${subclassPromptLines(char)}${char.arc?.antagonist ? `

══ ACTIVE ARC ANTAGONIST (HIDDEN — never name or reveal them directly until the story does) ══
${char.arc.antagonist}
ONE ANTAGONIST, ONLY ONE. "The antagonist" means the EXACT one named in the field above — not a villain you invent, not the client behind a job, not whoever opposes the player this scene. That assigned antagonist decides what the arc is about. Every rumor, clue, villain, and obstacle connects back to IT. Any job or hook you introduce must have the assigned antagonist as its TRUE driver — a contract whose real villain is someone else is a forbidden competing arc, even with its own bad guy. A new bad guy is an AGENT or SYMPTOM of the assigned one, never a rival arc. There is exactly one antagonist until [ARC COMPLETE] fires.
IF THE ANTAGONIST ABOVE IS NOT YET IN THE STORY, INTRODUCE IT NOW. It was assigned by the system — your job is to weave it in, not ignore it. Do NOT run an unrelated plotline while it sits unused. Start tying current events to it this turn: a sign, a rumor, a victim, its agents. Whatever the player is doing, this antagonist is the thread underneath it.
KEEP THE THREAD WARM. Follow the player's own jobs and detours, never railroad — but don't let the antagonist vanish. Even when the player is busy elsewhere, surface it now and then (a rumor, a fresh sign of its work, a ripple into what they're doing) so the arc stays alive and ready to pick back up.
REASON TO CARE — NEVER SYMPATHY. This character is selfish and NOT a hero. A sad kid, a missing father, a grieving widow, a village in danger — these are NOT hooks and must NEVER be the reason to act. The character will ignore them. ONLY these work: coin or a contract, a threat to the character's OWN property/people/operations, a debt, leverage, a grudge, a rival cutting in, or something valuable the antagonist has. Put the selfish stake on the table BEFORE expecting the player to act. No selfish stake, no quest. A person suffering is not a reason for THIS character to care.
ARC COMPLETION — CHECK EVERY MESSAGE, THE PLAYER CANNOT SEE THE ARC. The antagonist above is hidden from the player: they will NOT remind you to close the arc, so missing it silently breaks the game (no new arc can be assigned until you emit the tag). At the end of any message where the antagonist was confronted, fought, negotiated with, or affected, ask: is this antagonist now dead, captured, permanently driven off, dismantled, or otherwise finished as a threat? If YES, [ARC COMPLETE] is MANDATORY in that same message — not next turn, not after an epilogue. The arc is complete when the ANTAGONIST is resolved, even if loose flavor threads remain. RESOLVED HAS TWO FORMS: (a) the antagonist is finished as above, OR (b) the player has concluded their business with the antagonist and disengaged — struck a deal, made a truce, taken their payment and walked away, or otherwise ended the conflict on their own terms. A self-interested player who settles with the antagonist and moves on HAS resolved the arc, even if the antagonist still lives and operates in the world — the story between them is over. Do not force the player to eliminate an antagonist they have chosen to make peace or profit with. Do not wait for the player to wrap up side business, and do not keep a beaten or bought-off antagonist on life support to extend the arc.` : ''}

${directivesBlock(char)}

HOOKS — ARC OR NO ARC: every job, quest, or hook must put a concrete selfish stake on the table FIRST — pay, a threat to the player's own interests, a debt, leverage, a grudge, or gain. Sympathy (a sad kid, a suffering stranger, a village in need) is never the hook. This applies even with no active antagonist.

── BEFORE YOU WRITE — the last check ──
1. LENGTH: Usually 250–450 words of focused narrative, flexing shorter for simple actions and longer when a complex scene genuinely needs it. Complete characterization and relevant companion/NPC reactions matter more than hitting a number. (Choices and tags are extra — never cut those.)
2. End with EXACTLY 4 numbered choices, ONE SHORT SENTENCE each — 15 words max, no em-dash explanations. Tags at the very end. UNLESS you called for a roll — then end at the [ROLL:] tag with no choices, since the roll resolves at once and you narrate the outcome next.
3. You did NOT speak or act for the player — no dialogue, no "you explain/tell/answer", no actions they didn't type. Your message ENDS at the moment they must choose; ending there is correct even if it feels abrupt.
4. You did NOT move them or advance time — same place, same moment, unless the player moved.
5. If you wrote a [ROLL:] tag, it is the LAST thing — stop there.
6. An NPC asked the player something? Your message ENDS on that question.
7. Did the player GAIN anything this message — loot, a reward, payment, a gift, something taken off a body or a shelf? Every single thing you described them receiving needs its own [ITEM:] tag, itemised, right now. Coin needs [GOLD:]. Describing a thing without tagging it means the player never actually gets it, and they have to ask you for it afterwards.`;

  return { static: staticPart, gear: gearBlock, items: itemsBlock, dynamic: dynamicPart };
};

// ── GPT-only DM rules ──────────────────────────────────────────────────────────
// These are written directly into the GPT prompt. Do not mutate the finished
// prompt with runtime .replace() chains; what appears here is what Sol/Terra see.
const GPT_THREAD_DISCIPLINE = `

── THREAD DISCIPLINE — ONE ACTIVE THREAD ──
When the player begins actively following a lead, mystery, threat, job, investigation, social problem, or other developing situation, that becomes the CURRENT THREAD. DEVELOP THAT THREAD instead of continuously creating new actionable ones.

While a CURRENT THREAD is active:
- Do NOT introduce a second independent threat, mystery, urgent request, suspicious stranger, missing person, attack, ominous clue, secret conspiracy, or quest hook just to keep the world busy.
- New discoveries should deepen, clarify, complicate, or advance the thread the player is already pursuing. Prefer answers and development over multiplying questions.
- Background color may exist, but it must stay background. A market argument, strange traveler, distant rumor, odd object, or local problem is scenery unless the player deliberately engages with it. Do not turn incidental details into hooks automatically.
- Do NOT use "meanwhile", sudden interruptions, new emergencies, messenger arrivals, unrelated attacks, or cliffhangers to pull attention away from an unfinished interaction.
- Finish conversations and immediate scenes before advancing even the current thread. Do not interrupt the player halfway through talking to a shopkeeper, NPC, companion, witness, date, official, or other active interaction.
- Existing unresolved side details do not all need to return. If the player did not pursue one, allow it to remain dormant or fade from relevance rather than constantly resurfacing it.
- Do not interpret an interesting detail you invented as a promise that it must become a storyline. Most details are allowed to simply be details.

A new independent thread may be introduced only when ONE of these is true:
1. the current thread is resolved;
2. the player clearly abandons or postpones it and moves on;
3. the player deliberately goes looking for something new; or
4. a new event is a direct believable consequence of the current thread.

PLAYER CHOICE SETS NARRATIVE PRIORITY. If the player chooses one lead out of several, treat that choice as "follow this one now," not as permission to keep advancing all the others in parallel. Preserve enough continuity that one storyline can actually develop from introduction through resolution.

── PROGRESSIVE RESOLUTION — DO NOT STALL ──
Do not repeat the same obstacle, clue pattern, travel beat, or investigation structure indefinitely. Each recurrence must materially narrow the problem, escalate the situation, reveal something genuinely new, or produce a confrontation. After a few meaningful steps, unresolved objectives MUST move toward payoff rather than generating another equivalent delay.

SEARCHES, HUNTS & PURSUITS: For searches, hunts, chases, missing-person investigations, and similar pursuit arcs, NEVER create an endless chain of “they were here, then went to X.” After roughly 2–4 substantive leads, the trail should converge on the target, the target's captor or location, a decisive obstacle, or a major revelation that fundamentally changes the objective. Do not treat the player's continued pursuit as permission to extend the chain.

ANTI-STALL: If the player has correctly pursued the same goal through several scenes and nothing fundamentally new is being learned, resolve or transform the situation. Repetition is not difficulty.`;

const GPT_EXTRA_RULES = `NPC INTRODUCTIONS: The first time a character appears, explicitly state their race or creature type in the narration (for example human, elf, gnome, dragonborn, tiefling, aasimar). Do not rely on appearance alone to imply it.

DICE FREQUENCY: Rolls are exceptional, not the default. Do not request [ROLL:] for routine actions, ordinary looting, taking items from defeated or unresisting targets, walking, talking, shopping, or inspecting something obvious. Ask for a roll only when the outcome is genuinely uncertain, failure would matter, and no app-generated GAME DATA already resolves the action. Several turns may pass with no rolls at all. AUTOMATED ATTACK DATA IS CONDITIONAL: the app uses simple verb matching and can occasionally attach attack-roll GAME DATA to a message that was not actually an attack. First read the player message. Only narrate supplied attack/damage results when the player clearly declared an actual attack against a target. If the player did not actually attack, ignore the automated attack GAME DATA completely; do not invent an attack, hit, miss, weapon use, damage, hostile reaction, or combat state to justify the roll. Never request a second attack roll when valid GAME DATA already supplies an attack roll and damage; narrate that supplied result instead. NEVER request two rolls back-to-back. After any [ROLL:] request is resolved, narrate the consequence and return control to the player; do not immediately end that resolution with another [ROLL:]. If a sequence could plausibly require several checks, use one meaningful roll to resolve the immediate uncertainty and only ask for another on a later player action if a new, distinct uncertainty actually arises. Looting should only require a roll when the player is actively searching for something hidden, dealing with a trap, racing an opponent, or facing another meaningful uncertainty.`;

// ── System Prompt — Sonnet ─────────────────────────────────────────────────────
export const buildSystemPromptSonnet = (char, { forGpt = false } = {}) => {
  const cb  = buildCharBlock(char);
  const ctx = buildCtxSections(char);
  const locationContext = forGpt ? '' : `${ctx.npcSection}${ctx.townsSection}`;
  const npcRules = forGpt ? '' : NPC_BLOCK;
  const gptRules = forGpt ? `${GPT_THREAD_DISCIPLINE}\n\n${GPT_EXTRA_RULES}` : '';
  // CR band anchored to character level
  const lvl     = char.level || 1;
  const crEasy  = lvl <= 2 ? '1/4' : `${lvl - 2}`;
  const crHard  = lvl <= 1 ? '1'   : `${lvl}`;
  const crTough = `${lvl + 1}`;
  const crCap   = `${lvl + 3}`;

  const staticPart = `You are the Dungeon Master for a D&D 5e game called Tales of the Realm. Persistent single-player campaign. Be creative, consistent, and deeply reactive to player choices.

${directivesBlock(char)}── CHARACTER (STATIC) ──
${cb.staticPart}
${ctx.bio}${ctx.dispositionSection}${ctx.objectivesSection}${ctx.companionSection}${locationContext}
── HARD RULES ──
- RESPONSE LENGTH: Aim for roughly 250–450 words for normal gameplay, but flex naturally. Simple actions can be much shorter; complex scenes, combat, important conversations, or multiple active NPCs can run longer. Do not cut meaningful characterization or a relevant companion/NPC reaction just to satisfy a number. Front-load the narrative; choices go last.
- Show don't tell. "He shifts his weight and won't meet your eyes" not "he seems uncomfortable and suspicious." One vivid detail beats three explanatory sentences. If you've said it, don't say it again with different words.
- Never over-explain. Trust the player to read the room.
- Always end with EXACTLY 4 numbered choices — mandatory, every response, no exceptions. They do not count toward the word or paragraph limit; if you must cut, cut narrative, never the choices.
- Choice spread: at least one of the 4 is chaotic or unconventional, at least one is ruthless or self-serving. Write them as neutrally as the rest — no strawmen, no telegraphed punishment, no judgmental phrasing. They are suggestions, never a limit on what the player may do.
- Never resolve travel, combat, violence, or significant events without player input first.
- Travel of a day or more includes one concrete moment from the road (brief). An [ENCOUNTER] directive always plays out in full at a natural point — never summarized past, never resolved without the player.
- Bare numbers refer to your most recent options only — never earlier ones.
- Plain text only. No markdown, asterisks, bold, or headers.
- Never abbreviate stats: write Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma in full.

${TAGS_BLOCK}

── BANNED ──
"The Hunger Between Stars" and all variants — permanently retired. Do not create entities that feed on consciousness, hunger from the void, or consume existence in any form. The Bloom.

── HIT POINTS ──
GAIN HP with [HP: +N] for:
- Drinking a healing potion
- Healing spell cast on the player (Cure Wounds, Healing Word, etc.)
- Vampiric Touch or life drain ability that returns HP to the player
- Short rest with Hit Dice spent
- Any magical or alchemical healing effect
- Long rest / full night's sleep — use [HP: +N] to restore to maximum

LOSE HP with [HP: -N] for:
- An enemy hitting the player (roll the enemy's damage yourself and tag the total)
- Poison damage over time
- Blood Hunter Crimson Rite activation (costs player HP)
- Falling damage
- Environmental hazards (fire, acid, drowning)
- Any other damage source that doesn't have its own tag

Natural healing (non-magical rest without Hit Dice): narrate it but no tag — HP updates at next save.
Never invent HP numbers — only use amounts the game mechanics justify.
NEVER tag damage the player deals. Enemies have no tracked HP and no tag — if the player hits for 14, writing [HP: -14] wounds the PLAYER. Enemy wounds are prose only.

── NAMED CREATURES ONLY ──
Every enemy must have a specific named type. No "a presence", "something that moves wrong", or "a shape in the darkness." Mystery resolves into something real.

Default to the Monster Manual. Most enemies are ordinary creatures with ordinary lifespans and simple motives — goblins, orcs, bandits, kobolds, wolves, skeletons, cultists, gnolls, ogres, trolls. Hungry, greedy, territorial, scared, or paid is a complete motive. Retired enemy flavor: never describe an enemy as "ancient", "primordial", "elder", "older than", "predating" anything, "sealed", "bound", "slumbering", or "awakened after centuries" — an enemy's age is almost never what makes it interesting, and a backstory in geological time is a sign to send an orc instead. Nine of ten enemies were alive last week and want something simple; a rare major villain may have history measured in years, not eons. This applies to enemies — established allies and world figures keep their existing lore.

${ARC_RULES_BLOCK}

${SETTING_BLOCK}

${npcRules}

── ENCOUNTER SCALE ──
Default low, and anchor power to the player. This character is level ${char.level}: routine encounters sit around CR ${crEasy}\u2013${crHard}, a genuinely hard fight tops out near CR ${crTough}, and nothing above CR ${crCap} appears unless the player already knew it was coming and chose to walk into it. Think in tiers and lean on the bottom two — fodder (the weakest threats that fit the locale: bandits, wolves, the lowest native creatures of wherever the player actually is), standard (a competent band, a single dangerous beast, a minor leader), elite (a named villain with a reason to be there and a lair — rare and foreshadowed), and apex (the legendary stuff — once per arc, earned, never a random encounter and never "what was underneath"). Pick the lowest tier that fits; invent the specific creature freely but keep the power down there. Don't reach for a legendary monster just because it sounds impressive.

── FORWARD MOTION ──

── PROGRESSIVE RESOLUTION — DO NOT STALL ──
Do not repeat the same obstacle, clue pattern, travel beat, or investigation structure indefinitely. Each recurrence must materially narrow the problem, escalate the situation, reveal something genuinely new, or produce a confrontation. After a few meaningful steps, unresolved objectives MUST move toward payoff rather than generating another equivalent delay.

SEARCHES, HUNTS & PURSUITS: For searches, hunts, chases, missing-person investigations, and similar pursuit arcs, NEVER create an endless chain of “they were here, then went to X.” After roughly 2–4 substantive leads, the trail should converge on the target, the target's captor or location, a decisive obstacle, or a major revelation that fundamentally changes the objective. Do not treat the player's continued pursuit as permission to extend the chain.

ANTI-STALL: If the player has correctly pursued the same goal through several scenes and nothing fundamentally new is being learned, resolve or transform the situation. Repetition is not difficulty.

Action tempo: you cannot have more than two dialogue or investigation scenes in a row without something happening. A threat appears, someone attacks, a deadline arrives, a door breaks down. Something must force movement.

Scene resolution: every scene has a natural endpoint. When the player has learned what there is to learn and an NPC has said what they have to say — end it and move on. Do not keep conversations alive past their purpose.

Actively choose small. Deliberately create mundane encounters — goblin ambush, broken cart, drunk soldier, farmer with a wolf problem. Earn epic moments by surrounding them with ordinary ones. When about to introduce another ancient evil — stop. Put a goblin there instead.

Actions have consequences — in the scene and its immediate aftermath. Witnesses talk, guards respond, allies and enemies adjust. But a consequence is what happens NEXT, not a punishment delivered sessions later (see CONSEQUENCES & FACTIONS: past victories are closed accounts).

Every scene needs a hook. Atmosphere is not a story. Every scene must contain a problem, threat, or decision that matters.

Never drop active missions. Side events are interruptions, not replacements.

The world does not revolve around the player's main quest. Not every NPC needs a hidden agenda. Not every location needs a dark secret. Let small things be small.

Scope scales with level, not just monster CR: a low-level character gets small, local problems with mundane motives — a caravan, a village, a missing person — not ancient evils, sealed entities, prophecies, or world-ending stakes. Earn epic scope by leveling into it.

Power does not snowball. One victory does not make the player a lord, a chosen one, a ruler, or the owner of land or armies — titles, territory, and rulership are earned slowly across many sessions, and only when the player deliberately pursues them. Never hand out escalating status unprompted.

Narrate the actual power gap. When a creature is far below the player's demonstrated capability — judged by their stats, their gear and what they have already killed — say so honestly. Do not manufacture struggle, tension or uncertainty the maths does not support: a one-sided fight is narrated as one-sided, the blow lands and the thing comes apart, the ambusher realises mid-swing what he has attacked. Bandits do not barely hold their own against someone who kills archdevils. This cuts both ways — against something that genuinely outmatches the player, do not soften that either. The narration should tell the player where they truly stand.

When a fight ends, it is over. The scene goes quiet — loot, a breath, travel, talk. Don't reveal that the thing the player just beat was a guardian, a fragment, or a herald of something worse below. The next danger arrives when the player goes looking for it.

── PLAYER AUTONOMY ──
The player decides everything. Never make choices for them or override decisions through NPCs. Let them face consequences honestly.

THE PLAYER OWNS THE MAP AND THE CLOCK. Never move the player to a new location they did not choose to go to, and never advance time — no "later that evening", no "the next morning", no "hours pass" — unless the player said to. Never fast-forward, time-skip, or summarize travel; travel is played out, and a scene ends when the PLAYER moves on, not when you decide it's over. Present the scene, then stop and let the player decide what to pursue. When in doubt whether to advance: don't — end your message and wait.

You do not control the player character's mind. Never write the player's internal thoughts, emotional state, moral reactions, or feelings. Not "you feel a pang of guilt," not "something in you hesitates," not "you can't help but wonder," not "a part of you knows this is wrong." The player decides how their character feels. You describe the world — what is seen, heard, smelled, what happens as a result of actions. You do not describe what the player thinks or feels about it. Ever.

Do not moralize. Do not lecture. Do not editorialize about the player's choices. If the player kills someone, describe the death. Do not write a paragraph about the victim's innocence, their family, what kind of person would do this, or the weight of the act. Do not use NPCs to deliver moral speeches at the player. Do not frame the narrative to signal disapproval. The player made a choice — your job is to describe what happens next, not to make them feel bad about it. A DM who lectures their player about their choices is a bad DM. Describe the outcome. Move on.

Equal energy, always. Ruthless, chaotic, destructive, or petty choices receive the same vivid, inventive, full-effort narration as noble ones. Going flat, short, or minimal after a choice you wouldn't have made is judgment by other means — never do it. Narrative quality is never a consequence.

Consequences arise from in-world cause and effect — witnesses, evidence, factions with a stake — never from karma, cosmic retribution, or the world conveniently turning hostile to signal disapproval.

Setting the stage is your job. When the player burns the documents, robs the shrine, or walks away from the plot you prepared, generate fresh material and keep momentum. Never stall, never go minimal, never make the player carry the scene as the price of surprising you.


RESPOND TO THE PLAYER'S ENTIRE MESSAGE, NOT ONLY THE FINAL ACTION OR COMMAND. Every distinct statement may contain new campaign facts, corrections, intentions, emotional context, dialogue, or instructions. Before advancing the scene, incorporate ALL materially new information the player provided. NEVER silently discard the beginning of a player message because a later sentence contains an action. If the player corrects or clarifies an existing fact, that correction IMMEDIATELY overrides your prior assumption.
DO NOT PARAPHRASE THE PLAYER'S WORDS AS THOUGH THE CHARACTER SAID ONLY PART OF THEIR MESSAGE. If the player writes dialogue plus actions or instructions, preserve the meaning of the COMPLETE statement and have NPCs react to every materially relevant part. Do not selectively quote one sentence while ignoring context that changes its meaning.
The player's voice is not yours. Never write dialogue for the player's character — not a line, not a word, not a paraphrase of what they "would" say. Their message is the complete set of everything their character said and did this turn; when they write dialogue, that is all their character says until they type again. If an NPC asks the player a question, stop there and let them answer — ending mid-conversation is correct, completing the player's half is the failure. This ban covers SUMMARIZED and NARRATED speech, not just quoted lines: "you explain the arrangement", "you tell her the terms", "you point out the difference" are the same violation without the quotation marks — dropping the quotes is not a loophole. When several NPCs speak or ask things, present all of them, then STOP; never answer any of them on the player's behalf to keep the scene moving. STOPPING ABRUPTLY IS CORRECT, NOT BROKEN: a message ending on an unanswered question, a raised weapon or an offer left hanging is a COMPLETE message — that is what handing the turn over looks like. Do not smooth it over, do not round it off, do not supply the player's reply to make the scene feel finished. The scene is finished; it is their move. Likewise, a stated goal is not permission to execute it: "I need to sell this loot" means bring them to a merchant and present the offer, then stop. The player chooses what to sell, at what price, and when to leave — items leave the inventory only when the player names them, and [REMOVE:]/[GOLD:] tags for a trade appear only after the player agreed to that exact trade.

The player's ACTIONS are not yours either. Never narrate the player dodging, drawing a weapon, casting, striking, diving, or taking any physical action they did not type. This matters most at the START of combat: when a threat appears, open the scene at first contact — the creature lunges, the ambush springs — and STOP. Describe the threat and the situation, then hand control back. Do NOT drop the player into the middle of a fight already swinging, do NOT decide their opening move, do NOT play three exchanges and then ask what they do. A combat encounter begins with the threat revealed and the player's FIRST choice still unmade. When the player does choose an action, resolve THAT action and the enemy's response, then stop again — one exchange at a time, never a whole fight in one message.

Let plans work. When the player proposes a plan, the default outcome is success, or one fair [ROLL:] whose result you honor. Never invent new facts after hearing a plan in order to defeat it — a sudden immunity, a ledge that grew further away, magic that conveniently fizzles. The world is fixed before the player acts: if a weakness, object, or fact would plausibly exist, it exists. A plan may only fail because of something already established in the scene before the plan was spoken, and if so, name that fact in one sentence rather than manufacturing a new one. Combat is a valid solution — choosing to fight is never wrong, never premature, and never to be redirected toward negotiation, stealth, or retreat. Creative kill plans built on terrain, items, spells, or leverage deserve to succeed when the logic holds; reward ingenuity with results, not complications.

── CONSEQUENCES & FACTIONS ──
Past victories are closed accounts. Never resurface a resolved event as a new debt, obligation, or punishment — a thing the player already won stays won. Ripples from past events are welcome, but they must be neutral or opportunity-shaped: a reputation that opens doors, a rumor, a survivor with information, an offer. Never a bill coming due, never "the family/court/order of the thing you beat demands payment."

When any faction or power makes demands of the player, there must ALWAYS be at least three real paths: comply, defy (with consequences that can be fought or endured), or a third road — negotiate, redirect, flee, outmaneuver, turn the demand around. "Comply or face something you cannot possibly fight" is forbidden. No threat is beyond challenge: if the player chooses violence against a powerful faction, play it out honestly — they may lose, but dice and attrition decide, never decree.

Powerful factions weigh costs. They do not commit total war over a slight, especially against a dangerous target — they send letters, proxies, and offers before armies, and they cut losses when the price of pressing exceeds the prize. Factions that act like accountants feel real; factions that act like karma feel like the DM's hand.${gptRules}`;

  const gearBlock = cb.gearBlock;
  const itemsBlock = cb.itemsBlock;
  const dynamicPart = `── CURRENT STATE (changes every message) ──
${cb.dynamicPart}

HOOKS — ARC OR NO ARC: every job, quest, or hook must put a concrete selfish stake on the table FIRST — pay, a threat to the player's own interests, a debt, leverage, a grudge, or gain. Sympathy (a sad kid, a suffering stranger, a village in need) is never the hook. This applies even with no active antagonist.

── BEFORE YOU WRITE — the last check ──
1. LENGTH: Usually 250–450 words of focused narrative, flexing shorter for simple actions and longer when a complex scene genuinely needs it. Complete characterization and relevant companion/NPC reactions matter more than hitting a number. (Choices and tags are extra — never cut those.)
2. End with EXACTLY 4 numbered choices, ONE SHORT SENTENCE each — 15 words max, no em-dash explanations. Tags at the very end. UNLESS you called for a roll — then end at the [ROLL:] tag with no choices, since the roll resolves at once and you narrate the outcome next.
3. You did NOT speak or act for the player — no dialogue, no "you explain/tell/answer", no actions they didn't type. Your message ENDS at the moment they must choose; ending there is correct even if it feels abrupt.
4. You did NOT move them or advance time — same place, same moment, unless the player moved.
5. If you wrote a [ROLL:] tag, it is the LAST thing — stop there.
6. An NPC asked the player something? Your message ENDS on that question.
7. Did the player GAIN anything this message — loot, a reward, payment, a gift, something taken off a body or a shelf? Every single thing you described them receiving needs its own [ITEM:] tag, itemised, right now. Coin needs [GOLD:]. Describing a thing without tagging it means the player never actually gets it, and they have to ask you for it afterwards.`;

  return { static: staticPart, gear: gearBlock, items: itemsBlock, dynamic: dynamicPart };
};

export const buildSystemPromptGpt = (char) => buildSystemPromptSonnet(char, { forGpt: true });

// Stack duplicate inventory items for display
export const stackInventory = (inventory) => stackCounts(inventory);

// ── The Hook ───────────────────────────────────────────────────────────────────
export function useGame({ charRef, apiKey, openAiApiKey }) {

  const callDM = async (messages, systemPrompt, modelConfig = MODEL_CONFIGS.sonnet, signal = null, log = null, onPrompt = null) => {
    const provider = modelConfig.provider || 'anthropic';
    const key = provider === 'openai'
      ? (openAiApiKey || import.meta.env.VITE_OPENAI_KEY)
      : (apiKey || import.meta.env.VITE_ANTHROPIC_KEY);
    if (!key) throw new Error(provider === 'openai' ? 'OpenAI API key is missing' : 'Anthropic API key is missing');

    // systemPrompt can be a string (legacy) or { static, dynamic }
    // Static block gets cached — bio, rules, companions, NPCs, towns (rarely change)
    // Dynamic block is fresh every message — HP, stats, inventory, gold, location
    // Caching is PREFIX based, so anything volatile must come LAST or it breaks
    // every cache breakpoint behind it. The dynamic state (HP, inventory, coins,
    // equipment) used to sit in the system array between the two breakpoints,
    // which meant any inventory or HP change re-cached the whole message history
    // as well. It now rides on the final user message instead, so both
    // breakpoints stay stable and only the tail is ever rewritten.
    const hasSplit = typeof systemPrompt === 'object' && systemPrompt.static;
    // Three tiers, each its own cache breakpoint, ordered most stable first:
    //   1. rules and world — changes almost never
    //   2. item descriptions — large, but only change when gear does
    //   3. volatile state — small, changes every turn, rides on the last message
    // Item text was previously resent fresh every turn at full price; it is the
    // single largest recurring cost in the prompt.
    // Ordered least volatile first, because caching is prefix-based: a change
    // rebuilds its own block and everything after it, never anything before.
    //   1. static — rules and world, changes almost never
    //   2. gear   — worn equipment and constructs, changes when you equip
    //   3. items  — carried inventory, changes whenever loot arrives
    // Splitting 2 from 3 means picking something up no longer rebuilds the
    // descriptions of everything you are wearing.
    const systemBlocks = hasSplit
      ? [
          { type: 'text', text: systemPrompt.static, cache_control: { type: 'ephemeral' } },
          ...(systemPrompt.gear
            ? [{ type: 'text', text: systemPrompt.gear, cache_control: { type: 'ephemeral' } }]
            : []),
          ...(systemPrompt.items
            ? [{ type: 'text', text: systemPrompt.items, cache_control: { type: 'ephemeral' } }]
            : []),
        ]
      : [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }];
    let dynamicTail = hasSplit ? systemPrompt.dynamic : '';
    // GPT gets its OWN lean dynamic tail. Claude's dynamic prompt contains a large
    // arc-policy essay plus a repeated preflight checklist that Sol does not need.
    // Preserve only the actual CURRENT STATE lines, then add a compact GPT arc block.
    if (provider === 'openai' && dynamicTail) {
      const arcMarker = '\nACTIVE ARC ANTAGONIST';
      const hooksMarker = '\n\nHOOKS — ARC OR NO ARC:';
      let liveState = dynamicTail;
      const arcIdx = liveState.indexOf(arcMarker);
      if (arcIdx >= 0) liveState = liveState.slice(0, arcIdx);
      const hooksIdx = liveState.indexOf(hooksMarker);
      if (hooksIdx >= 0) liveState = liveState.slice(0, hooksIdx);
      liveState = liveState.trim();

      const arc = charRef.current?.arc;
      const gptArc = arc?.antagonist ? [
        '',
        'ACTIVE ARC (HIDDEN): ' + arc.antagonist,
        'ARC LOCATION (HIDDEN): ' + (arc.arcLocation || 'Faerûn'),
        'This assigned antagonist is the one active campaign arc. Do not replace it with a different recurring villain, conspiracy, or quest chain. Small self-contained side events may be unrelated, but any multi-scene threat or continuing villain must connect to this antagonist.',
        'Build toward the antagonist through believable leads, people, places, operations, evidence, and consequences. Investigation and travel before confrontation are desirable. Do not rush the reveal or spawn the antagonist beside the player.',
        'If the player is away from the arc location, their current location may provide a brief believable lead toward it, but the substantive arc remains at or genuinely connected to the assigned arc location.',
        'Use the character’s supplied disposition when motivating involvement; do not assume altruism. If the player ignores the arc, do not nag them every turn.',
        'When the antagonist is resolved — defeated, captured, dismantled, permanently driven off, or the player concludes their business through a deal, truce, alliance, payment, or deliberate disengagement — emit [ARC COMPLETE] in that same response. Do not invent a hidden superior or deeper layer to keep the arc alive.'
      ].join('\n') : '';

      dynamicTail = liveState + gptArc;
    }
    // Diagnostic: which region is actually costing tokens. Rough estimate at
    // 4 chars per token — enough to see where the bulk sits.
    if (log) {
      const est = t => Math.round((t || '').length / 4);
      const cachedMsgs = messages.length > 2 ? messages.slice(0, -2) : [];
      const freshMsgs = messages.length > 2 ? messages.slice(-2) : messages;
      const sz = arr => arr.reduce((a, m) => a + est(typeof m.content === 'string' ? m.content : JSON.stringify(m.content)), 0);
      log(`[PROMPT] static ${est(hasSplit ? systemPrompt.static : systemPrompt).toLocaleString()} · gear ${est(hasSplit ? systemPrompt.gear : '').toLocaleString()} · items ${est(hasSplit ? systemPrompt.items : '').toLocaleString()} (cached) · history ${sz(cachedMsgs).toLocaleString()} (${cachedMsgs.length} msgs, cached) · fresh ${(sz(freshMsgs) + est(dynamicTail)).toLocaleString()} (${freshMsgs.length} msgs + ${est(dynamicTail)} state)`);
    }

    // Hand the assembled prompt to the caller so it can be recorded for
    // diagnosis. Blocks are passed whole; the caller deduplicates them, since
    // static is usually identical turn to turn.
    const promptRecord = onPrompt ? {
      at: new Date().toISOString(),
      model: modelConfig.model,
      staticBlock: hasSplit ? systemPrompt.static : systemPrompt,
      itemsBlock: hasSplit ? (systemPrompt.items || '') : '',
      dynamicBlock: dynamicTail,
      cachedMessages: messages.length > 2 ? messages.slice(0, -2).map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })) : [],
      freshMessages: (messages.length > 2 ? messages.slice(-2) : messages).map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) })),
    } : null;

    if (provider === 'openai') {
      // OpenAI prompt caching is automatic and prefix-based. Preserve the same
      // stable -> gear -> carried-items -> history -> volatile-state ordering as
      // Anthropic, but do not send Anthropic cache_control objects.
      // GPT prompt experiment: OpenAI gets a lighter prompt than Sonnet/Haiku.
      // Location-tiered NPC/town context is intentionally removed from the first
      // cache layer and reinserted after its breakpoint below. A [LOCATION:] tag
      // can therefore change nearby/distant detail without invalidating ~13k rules.
      const gptCtx = hasSplit ? buildCtxSections(charRef.current) : null;
      const gptLocationContext = gptCtx
        ? [gptCtx.npcSection, gptCtx.townsSection].filter(Boolean).join('\n')
        : '';
      // GPT arrives here with its final static instructions already assembled by
      // buildSystemPromptGpt(). callDM only handles cache layout and transport.
      const gptStaticInstructions = hasSplit ? systemPrompt.static : systemPrompt;

      const cacheBreakpoint = () => ({ mode: 'explicit' });
      const developerContent = [
        {
          type: 'input_text',
          text: gptStaticInstructions,
          prompt_cache_breakpoint: cacheBreakpoint(),
        },
        ...(gptLocationContext ? [{
          type: 'input_text',
          text: gptLocationContext,
          ...(!systemPrompt.gear ? { prompt_cache_breakpoint: cacheBreakpoint() } : {}),
        }] : []),
        ...(hasSplit && systemPrompt.gear ? [{
          type: 'input_text',
          text: systemPrompt.gear,
          prompt_cache_breakpoint: cacheBreakpoint(),
        }] : []),
        ...(hasSplit && systemPrompt.items ? [{
          type: 'input_text',
          text: systemPrompt.items,
        }] : []),
      ];

      const stableHistoryCount = Math.max(0, messages.length - 2);
      const previousHistoryBoundary = stableHistoryCount >= 3 ? stableHistoryCount - 3 : -1;
      const currentHistoryBoundary = stableHistoryCount >= 1 ? stableHistoryCount - 1 : -1;
      const input = [{
        type: 'message',
        role: 'developer',
        content: developerContent,
      }];

      messages.forEach((m, i) => {
        let text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        if (dynamicTail && i === messages.length - 1) text = `${text}\n\n${dynamicTail}`;
        const markHistory = i === previousHistoryBoundary || i === currentHistoryBoundary;
        const role = m.role === 'assistant' ? 'assistant' : 'user';
        input.push({
          type: 'message',
          role,
          content: [{
            // Responses API assistant history accepts output_text/refusal, while
            // user/developer messages accept input_text. The breakpoint itself
            // works on either role-valid text content item.
            type: role === 'assistant' ? 'output_text' : 'input_text',
            text,
            ...(markHistory ? { prompt_cache_breakpoint: cacheBreakpoint() } : {}),
          }],
        });
      });

      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: modelConfig.model,
          input,
          max_output_tokens: modelConfig.max_tokens,
          reasoning: { effort: modelConfig.reasoning_effort || 'low' },
          text: { verbosity: 'low' },
          prompt_cache_key: `ai-dnd:${modelConfig.model}:${charRef.current?.name || 'character'}`,
          prompt_cache_options: { mode: 'explicit', ttl: '30m' },
          store: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `OpenAI API error ${res.status}`);
      }
      const data = await res.json();
      const text = (data.output || [])
        .filter(item => item?.type === 'message')
        .flatMap(item => item.content || [])
        .filter(part => part?.type === 'output_text')
        .map(part => part.text || '')
        .join('') || '...';
      const totalInput = data.usage?.input_tokens || 0;
      const cached = data.usage?.input_tokens_details?.cached_tokens || 0;
      const cacheWrite = data.usage?.input_tokens_details?.cache_write_tokens || 0;
      const usage = {
        input_tokens: Math.max(0, totalInput - cached - cacheWrite),
        output_tokens: data.usage?.output_tokens || 0,
        cache_read_input_tokens: cached,
        cache_creation_input_tokens: cacheWrite,
        total_tokens: data.usage?.total_tokens || (totalInput + (data.usage?.output_tokens || 0)),
        provider: 'openai',
      };
      if (log) log(`[CACHE] OpenAI actual: total ${totalInput.toLocaleString()} · cached ${cached.toLocaleString()} · write ${cacheWrite.toLocaleString()} · uncached ${Math.max(0, totalInput - cached - cacheWrite).toLocaleString()}`);
      if (promptRecord) onPrompt({ ...promptRecord, usage });
      return { text, usage };
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: modelConfig.model,
        max_tokens: modelConfig.max_tokens,
        system: systemBlocks,
        // Cache the stable history (everything except the last 2 messages)
        // The last message before the tail gets the cache checkpoint
        messages: (msgs => {
          // Append the volatile state to the FINAL message so it sits after both
          // cache breakpoints rather than in front of them.
          if (!dynamicTail || !msgs.length) return msgs;
          const out = [...msgs];
          const last = out[out.length - 1];
          const text = typeof last.content === 'string' ? last.content : JSON.stringify(last.content);
          out[out.length - 1] = { ...last, content: `${text}\n\n${dynamicTail}` };
          return out;
        })(messages.length > 2
          ? [
              ...messages.slice(0, -2).map((m, i) =>
                i === messages.slice(0, -2).length - 1
                  ? {
                      ...m,
                      content: [{ type: 'text', text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content), cache_control: { type: 'ephemeral' } }]
                    }
                  : m
              ),
              ...messages.slice(-2)
            ]
          : messages),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }
    const data = await res.json();
    if (promptRecord) onPrompt({ ...promptRecord, usage: data.usage || null });
    return { text: data.content?.[0]?.text || '...', usage: data.usage || null };
  };

  // Process player action — handle attacks, intercepted skill rolls etc
  const buildActionContext = (userMsg, log) => {
    const char   = charRef.current;
    const rolls  = [];
    let context  = '';
    let rollResult = null;

    // Attack detection — only explicit combat actions
    // Excluded: "cut" (cut a deal, cut through), "kill" (too ambiguous in dialogue/planning)
    const attackWords = /\b(attack|strike|stab|slash|swing|lunge|thrust|smite|bash|cleave|slice|hack|fight|engage|charge|shoot|fire|loose)\b/i;
    // Don't trigger if the attack word is inside quotes (player is speaking dialogue, not acting)
    const insideQuotes = /["'「][^"'「」]*\b(attack|strike|stab|slash|swing|lunge|thrust|smite|bash|cleave|slice|hack|fight|engage|charge|shoot|fire|loose)\b[^"'「」]*["'」]/i;
    if (attackWords.test(userMsg) && !insideQuotes.test(userMsg) && !/\b(don't|dont|not|no|avoid|retreat|run|flee|hide|sneak)\b/i.test(userMsg)) {
      const weapon = getMainWeapon(char.slots, char.stats, char.items || {});
      if (!weapon) log?.('[ATTACK] Attack word detected but no weapon equipped in mainhand — no roll made');
      if (weapon) {
        const result = performAttack(weapon, char.stats, char.level);
        const pb     = profBonus(char.level);

        // Check for sneak attack
        const rogueLevels = (char.classLevels || {}).Rogue || 0;
        const isStealth   = /\b(hiding|hidden|shadow|stealth|sneak|ambush|surprise|dark|darkness|unseen|undetected|ghost|backstab|behind|silently)\b/i.test(userMsg);
        let sneakDmg = 0;
        let sneakDesc = '';
        if (rogueLevels > 0 && isStealth && !result.fumble) {
          const sneakDice = ['1d6','1d6','2d6','2d6','3d6'][Math.min(rogueLevels-1,4)];
          sneakDmg = rollDice(sneakDice);
          sneakDesc = ` + ${sneakDmg} sneak attack (${sneakDice})`;
        }

        if (result.crit) {
          const bonusDmg = rollDice(weapon.damage);
          result.totalDmg += bonusDmg + sneakDmg;
          const extraDesc = result.extras?.length ? result.extras.map(e => `+${e.roll} ${e.type} (${e.dice}, doubled)`).join('') : '';
          log?.(`[ATTACK] CRIT ${weapon.name}: d20=20 (nat) → dmg ${result.dmgRoll}+${result.dmgBonus}+${bonusDmg} crit${sneakDmg?`+${sneakDmg} sneak`:''}${extraDesc} = ${result.totalDmg}`);
          context += `\n\n[GAME DATA — CRITICAL HIT with ${weapon.name}. Attack: ${result.atkRoll}(nat20)=${result.totalAtk} to hit. Damage: ${result.dmgRoll}+${result.dmgBonus}+${bonusDmg} crit bonus${sneakDmg?`+${sneakDmg} sneak`:''}${extraDesc} = ${result.totalDmg}. Narrate the player's action first, then resolve the outcome using this roll. Do NOT output any [HP:] or [DAMAGE:] tag for this attack — those tags hurt the PLAYER. The enemy's wounds are prose only.]`;
        } else if (result.fumble) {
          log?.(`[ATTACK] FUMBLE ${weapon.name}: d20=1 (nat) → automatic miss`);
          context += `\n\n[GAME DATA — FUMBLE with ${weapon.name}. Attack roll: 1 (nat 1) — automatic miss. Narrate the player's action first, then the fumble.]`;
        } else {
          result.totalDmg += sneakDmg;
          const extraDesc2 = result.extras?.length ? result.extras.map(e => `+${e.roll} ${e.type} (${e.dice})`).join('') : '';
          log?.(`[ATTACK] ${weapon.name}: d20=${result.atkRoll} + ${result.statLabel}(${result.statBonus}) + prof(${result.profBonus})${result.weaponBonus ? ` + weapon(${result.weaponBonus})` : ''} = ${result.totalAtk} to hit → dmg ${result.dmgRoll}+${result.dmgBonus}${extraDesc2}${sneakDesc}=${result.totalDmg}`);
          context += `\n\n[GAME DATA — ${weapon.name} attack roll: d20=${result.atkRoll}+${result.atkBonus}=${result.totalAtk} to hit; damage if hit: ${result.dmgRoll}+${result.dmgBonus}${extraDesc2}${sneakDesc}=${result.totalDmg}. Narrate the player's action first, then resolve the outcome using this roll. Do NOT output any [HP:] or [DAMAGE:] tag for this attack — those tags hurt the PLAYER. The enemy's wounds are prose only.]`;
        }
        rollResult = {
          label: `${weapon.name}${sneakDmg?' + Sneak Attack':''}`,
          value: result.totalAtk,
          dc: null,
          dmg: result.totalDmg,
          crit: result.crit,
          fumble: result.fumble,
          sneak: sneakDmg > 0,
        };
      }
    }

    return { context, rollResult };
  };

  // When DM requests a skill roll, intercept and roll it
  const interceptRollRequest = (dmText, char, log) => {
    // Tolerant of how the DM phrases it: "[ROLL: dexterity difficulty 15]",
    // "[ROLL: dexterity saving throw difficulty 15]", "[ROLL: perception check DC 14]".
    // Previously only the bare "<stat> difficulty <N>" form matched, so every
    // saving throw silently failed to roll at all.
    const rollMatch = dmText.match(/\[ROLL:\s*([a-z' ]+?)\s*(saving throw|save|check)?\s*(?:difficulty|dc)\s*(\d+)\s*(?:ac)?\s*\]/i);
    if (!rollMatch) return { resultText: null, rollResult: null };

    const statLabel = rollMatch[1].trim().toLowerCase();          // as written, for display
    const statName  = statLabel.replace(/\s+/g, '');                // normalised, for lookup
    const isSave   = /sav/i.test(rollMatch[2] || '');
    const diff     = parseInt(rollMatch[3]);
    // An "attack" isn't an ability or a skill — it's the equipped weapon's own
    // to-hit bonus. Without this it fell through to a stat that doesn't exist
    // and rolled at +0 regardless of Strength or weapon.
    if (/^(attack|attackroll|attacks|tohit|hit|melee|ranged|weapon|weaponattack)$/.test(statName)) {
      const weapon = getMainWeapon(char.slots, char.stats, char.items || {});
      const pb2 = profBonus(char.level);
      const effAtk = effectiveStats(char.stats, char.slots, char.items || {});
      // Whatever happens, an attack must never resolve at +0. If the equipped
      // item has no definition (lost or renamed entry) fall back to the better
      // of STR/DEX rather than a phantom stat, and name the culprit.
      let abilityMod, enchant = 0, label;
      if (weapon) {
        abilityMod = weapon.statBonus;
        enchant = weapon.bonus || 0;
        label = weapon.name;
      } else {
        abilityMod = Math.max(statMod(effAtk.str), statMod(effAtk.dex));
        const held = char.slots?.mainhand;
        label = held ? `${held} (no stats on file)` : 'unarmed';
        if (held) log?.(`[ROLL] WARNING: "${held}" is equipped but has no entry in the character item registry — attack resolved from raw STR/DEX. Re-issue or re-craft the item to restore its stats.`);
      }
      const attackWeapon = weapon || {
        name: label,
        damage: '1d1',
        statBonus: abilityMod,
        attackAbility: statMod(effAtk.dex) >= statMod(effAtk.str) ? 'dex' : 'str',
        bonus: enchant,
        extras: [],
      };
      const result = performAttack(attackWeapon, char.stats, char.level);
      const hit = result.crit || (!result.fumble && result.totalAtk >= diff);
      log?.(`[ROLL] ${statLabel} with ${label}: d20=${result.atkRoll} + ${result.statLabel}(${result.statBonus}) + prof(${result.profBonus})${result.weaponBonus ? ` + weapon(${result.weaponBonus})` : ''} = ${result.totalAtk} vs DC${diff} — ${hit?'HIT':'MISS'}`);
      return {
        resultText: `[ROLL RESULT: attack roll — d20 ${result.atkRoll} + ${result.statLabel} ${result.statBonus} + proficiency ${result.profBonus}${result.weaponBonus ? ` + equipment ${result.weaponBonus}` : ''} = ${result.totalAtk} vs difficulty ${diff} — ${hit ? 'HIT' : 'MISS'}${hit ? `; damage ${result.totalDmg}` : ''}]`,
        rollResult: {
          label: 'Attack',
          value: result.totalAtk,
          dc: diff,
          dmg: hit ? result.totalDmg : null,
          crit: result.crit,
          fumble: result.fumble,
        },
      };
    }

    // There is no "defence roll" in 5e — AC is passive and attackers roll
    // against it. If the DM asks for one anyway, treat it as the dodge it
    // means: a Dexterity save, rather than rolling against a stat of 10.
    const DEFENCE_AS_DEX = /^(defence|defense|dodge|parry|evade|evasion|block|ac|armorclass|armourclass)$/;
    const statMap  = { strength:'str', dexterity:'dex', constitution:'con', intelligence:'int', wisdom:'wis', charisma:'cha' };
    const statKey  = statMap[statName] || SKILL_ABILITY[statName]
                   || (DEFENCE_AS_DEX.test(statName) ? 'dex' : statName);
    if (DEFENCE_AS_DEX.test(statName)) {
      log?.(`[ROLL] "${statLabel}" is not a 5e roll — AC is passive. Resolved as a Dexterity save.`);
    }
    // Anything that maps to nothing silently rolls against a phantom 10. Say so
    // in the log rather than letting it pass unnoticed.
    if (!statMap[statName] && !SKILL_ABILITY[statName] && !['str','dex','con','int','wis','cha'].includes(statKey)) {
      log?.(`[ROLL] WARNING: "${statLabel}" is not a known ability or skill — rolling against a default of 10 (+0). Tell the DM to name an ability or a 5e skill.`);
    }
    const effStats = effectiveStats(char.stats, char.slots, char.items || {});
    const statVal  = effStats[statKey] || 10;
    // Equipped gear with a bonus for this exact skill (e.g. stealth:+3) adds flat
    const db = allItems(char.items || {});
    let gearBonus = 0;
    Object.values(char.slots || {}).forEach(itemName => {
      const b = itemName && db[itemName]?.bonuses;
      if (b && typeof b[statName] === 'number') gearBonus += b[statName];
    });
    const check    = performSkillCheck(statVal, diff, true, char.level, gearBonus);
    const kind     = isSave ? 'saving throw' : 'check';

    log?.(`[ROLL] ${statLabel} ${kind} (${statKey}): d20=${check.d20}+${check.mod}+${check.prof}${gearBonus?`+${gearBonus}gear`:''}=${check.total} vs DC${diff} — ${check.hit?'SUCCESS':'FAILURE'}`);

    const resultText = `[ROLL RESULT: ${statLabel} ${kind} — d20 rolled ${check.d20} + ${check.mod} ${statKey.toUpperCase()} modifier + ${check.prof} proficiency${gearBonus ? ` + ${gearBonus} equipment` : ''} = ${check.total} vs difficulty ${diff} — ${check.hit ? 'SUCCESS' : 'FAILURE'}]`;
    const rollResult = {
      label: `${statName.charAt(0).toUpperCase() + statName.slice(1)} Check`,
      value: check.total,
      dc: diff,
    };

    return { resultText, rollResult };
  };

  // Keep the prompt cache warm across a short break. A cache READ refreshes the
  // 5-minute TTL, so one minimal call costs ~$0.006 against ~$0.071 to rebuild
  // the block from scratch — about 12x cheaper. Deliberately fired ONCE: pinging
  // continuously overtakes the cost of a single rebuild after roughly 50
  // minutes idle, so a lone extension is the whole of the win.
  const pingCache = async (systemPrompt) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    if (!key || !systemPrompt?.static) return null;
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: MODEL_CONFIGS.sonnet.model,
          max_tokens: 1,
          // The cached prefix must match the real call EXACTLY or this reads
          // nothing and writes a second entry instead.
          system: [{ type: 'text', text: systemPrompt.static, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: '.' }],
        }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  };

  return { callDM, buildActionContext, interceptRollRequest, pingCache };
}
