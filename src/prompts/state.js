import { featsContext } from '../constants/feats.js';
import { grantedSubclassMagic } from '../constants/abilities.js';
import { arcContext } from './arcPacing.js';
import { worldPressureContext } from '../helpers/worldPressures.js';
import { INTERDICT_BOONS, normalizeInterdictAbilities } from '../constants/interdictBoons.js';
import { getMainWeapon, effectiveStats, calcAC, profBonus, allItems, effectiveMaxHp, modStr } from '../hooks/useCharacter.js';
import { coinsToString } from '../constants/currency.js';
import { RACE_TRAIT_STRINGS } from '../constants/raceTraits.js';
import { subclassPromptLines } from '../constants/subclasses.js';
import { stackCounts, stackNames } from '../utils/itemStacks.js';

// Player-authored standing instructions, injected into every prompt so they
// never scroll out of context. Empty string when unset.
export const directivesBlock = (char) => {
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

export const playstyleLine = (char) => {
  const text = PLAYSTYLE_BY_CLASS[char?.cls?.name];
  return text ? `\n- PLAYSTYLE: ${text}` : '';
};

// ── Shared character data block ────────────────────────────────────────────────
// Returns { static: string, dynamic: string }
// static = race, class, deity, playstyle, abilities — changes rarely
// dynamic = HP, stats, inventory, equipped, gold, location — changes every message
export const buildCharBlock = (char) => {
  const effStats    = effectiveStats(char.stats, char.slots, char.items || {});
  const ac          = calcAC(char.slots, char.stats, char.items || {});
  const pb          = profBonus(char.level);
  const weapon      = getMainWeapon(char.slots, char.stats, char.items || {});
  const classLevels = char.classLevels || { [char.cls?.name]: char.level };
  const classDesc   = Object.entries(classLevels).map(([c,l]) => `${c} ${l}`).join(' / ');
  const db          = allItems(char.items || {});
  const equippedList = Object.entries(char.slots).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join(', ') || 'nothing';
  const weaponLine  = weapon ? `${weapon.name} (${weapon.damage}${weapon.damageBonus ? (weapon.damageBonus > 0 ? `+${weapon.damageBonus}` : weapon.damageBonus) : ''}${weapon.bonus?`+${weapon.bonus}`:''}${(weapon.extras||[]).map(e=>` plus ${e.dice} ${e.type}`).join('')}, Attack bonus +${weapon.statBonus+pb+(weapon.bonus||0)}, ${(weapon.attackAbility || 'str').toUpperCase()}${weapon.finesse && weapon.range !== 'ranged' ? '/finesse' : ''}${weapon.label?', '+weapon.label:''})` : 'Unarmed (1 damage)';
  const sneakLine   = char.sneakAttackDice ? `\n- SNEAK ATTACK: ${char.sneakAttackDice} extra damage when attacking with advantage or from hiding` : '';
  const offhandData = char.slots.offhand ? db[char.slots.offhand] : null;
  const focusLine   = offhandData?.type==='focus' ? `\n- HOLY FOCUS: ${char.slots.offhand} equipped (${offhandData.label})` : '';
  const stackedInv  = stackCounts(char.inventory);
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
    // Inventory constructs have their complete label and status in the dedicated
    // section below. Keep the fallback for legacy equipped-only constructs.
    .filter(n => !isConstruct(n) || !stackedInv[n])
    .map(n => { const d = char.items?.[n]; return d?.label ? `${n}: ${d.label}` : null; })
    .filter(Boolean).join('; ');

  // Tier 1 — worn gear and owned constructs. Rarely changes.
  // Constructs are derived from inventory, so this section CANNOT live in the
  // static block — putting it there meant picking up any item rebuilt the whole
  // ~12,000 token prompt. Keep their single authoritative description here,
  // separate from ordinary worn-item descriptions.
  const gearBlock = [
    `EQUIPPED: ${equippedList}`,
    detailsFor(stableNames) ? `WORN GEAR — what they do:\n${detailsFor(stableNames)}` : '',
    buildCompanionGearSection(char),
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
  const abilities   = normalizeInterdictAbilities(char.abilities || {}, classLevels);
  const grantedMagic = grantedSubclassMagic(char);
  const abilitiesLine = [
    grantedMagic.length ? `Subclass granted magic (not charged against known selections; subclass costs apply): ${grantedMagic.map(x => `${x.name} (${x.sub})`).join(', ')}` : '',
    abilities.magicalSecrets?.length ? `Magical Secrets: ${abilities.magicalSecrets.join(', ')}` : '',
    abilities.subclassOptions?.Sorcerer?.affinity ? `Divine Soul affinity: ${abilities.subclassOptions.Sorcerer.affinity}` : '',
    abilities.subclassOptions?.Druid?.land ? `Circle of the Land terrain: ${abilities.subclassOptions.Druid.land}` : '',
    abilities.interdictBoons?.length ? `Interdict Boons (Baleful Interdict upgrades, not spells): ${abilities.interdictBoons.map(name => `${name}${INTERDICT_BOONS[name] ? ': ' + INTERDICT_BOONS[name].desc : ''}`).join('; ')}` : '',
    abilities.martial?.length   ? `Techniques: ${abilities.martial.join(', ')}` : '',
    abilities.cantrips?.length  ? `Cantrips: ${abilities.cantrips.join(', ')}` : '',
    abilities.spells?.length    ? `Spells: ${abilities.spells.join(', ')}` : '',
    abilities.infusions?.length ? `Infusions: ${abilities.infusions.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  // Static — race, class, deity, playstyle, abilities (rarely change)
  const staticPart = `CHARACTER: ${char.name} | ${char.race?.name} ${classDesc}${char.deity ? ` | ${hasWarlock?'Patron':'Deity'}: ${char.deity.name}` : ''}${playstyle}${deityLine}${raceCtx}${subclassPromptLines(char)}${abilitiesLine ? `\nABILITIES:\n${abilitiesLine}` : ''}${featsContext(char)}`;

  // Dynamic — HP, stats, inventory, equipped, gold, location (changes every message)
  const arcLine = arcContext(char);
  const dynamicPart = `CURRENT STATE:
Level ${char.level} | ${char.xp||0} XP | Coins: ${coinsToString(char.coins)}
HP: ${char.hp}/${effectiveMaxHp(char)} | AC: ${ac} | Proficiency: +${pb}
Stats: Strength ${effStats.str}(${modStr(effStats.str)}) Dexterity ${effStats.dex}(${modStr(effStats.dex)}) Constitution ${effStats.con}(${modStr(effStats.con)}) Intelligence ${effStats.int}(${modStr(effStats.int)}) Wisdom ${effStats.wis}(${modStr(effStats.wis)}) Charisma ${effStats.cha}(${modStr(effStats.cha)})
Weapon: ${weaponLine}${sneakLine}${focusLine}
(Equipped gear, inventory and item descriptions are listed above.)${char.currentLocation ? `\nLocation: ${char.currentLocation}` : ''}${worldPressureContext(char)}${arcLine}`;

  return { staticPart, dynamicPart, gearBlock, itemsBlock };
};

// ── Shared context sections (bio, companions, NPCs, towns) ─────────────────────
// Arc objectives are disabled; see DISABLED_arc_objectives.md for the retained UI/storage/tag machinery.

// Companion slots contain item names; their shared definitions remain in
// char.items after equipping removes them from the player's inventory. Keep
// this with gear rather than biographies so gear changes preserve that cache.
export const buildCompanionGearSection = (char) => {
  const excluded = char.contextExclusions?.companions || {};
  const lines = [];
  const names = new Set();
  for (const [name, companion] of Object.entries(char.companions || {})) {
    if (excluded[name]) continue;
    const slots = Object.entries(companion?.slots || {}).filter(([, item]) => item);
    if (!slots.length) continue;
    lines.push(`- ${name}: ${slots.map(([slot, item]) => `${slot}: ${item}`).join(', ')}`);
    slots.forEach(([, item]) => names.add(item));
  }
  if (!lines.length) return '';
  const details = [...names].map(name => {
    const item = char.items?.[name];
    if (!item) return '';
    const mechanics = [
      item.damage ? `Base damage: ${item.damage}` : '',
      item.damageBonus ? `Damage bonus: ${item.damageBonus}` : '',
      item.bonus ? `Weapon bonus: ${item.bonus}` : '',
      item.ac != null ? `${item.type === 'shield' ? 'Shield AC bonus' : 'Base AC'}: ${item.ac}` : '',
      item.dexBonus ? `Adds Dexterity modifier${item.maxDex != null ? ` (maximum ${item.maxDex})` : ''}` : '',
      item.range ? `Range: ${item.range}` : '',
      item.finesse ? 'Finesse' : '',
      ...(item.extras || []).map(extra => `Extra damage: ${extra.dice} ${extra.type}`),
      ...Object.entries(item.bonuses || {}).map(([stat, bonus]) => `${stat} bonus: ${bonus}`),
      item.label || '',
    ].filter(Boolean).join('; ');
    return mechanics ? `- ${name}: ${mechanics}` : '';
  }).filter(Boolean);
  return `COMPANION EQUIPMENT (equipped by the named companion, not the player):\n${lines.join('\n')}` +
    (details.length ? `\nCOMPANION GEAR — what they do:\n${details.join('\n')}` : '');
};

// Constructs & bound entities — owned and commanded, not worn. Derived from the
// carried inventory (the stash is invisible to the DM by design, which is the
// player's switch for putting a construct out of play). Because it depends on
// inventory it must NOT sit in the cached static block: it goes with the gear.
export const buildConstructSection = (char) => {
  const cdb = char.items || {};
  const names = stackNames(char.inventory).filter(nm => cdb[nm]?.type === 'construct');
  if (!names.length) return '';
  return `CONSTRUCTS & BOUND ENTITIES (owned by the player, commanded — not carried gear):\n` +
    names.map(nm => {
      const d = cdb[nm];
      return `- ${nm} [${(d.status || 'dormant').toUpperCase()}]${d.label ? `: ${d.label}` : ''}`;
    }).join('\n');
};

export const buildCtxSections = (char) => {
  const loc = char.currentLocation || '';
  const appearance = char.appearance ? `\nPHYSICAL APPEARANCE: ${char.appearance}\n` : '';
  const bio = `${appearance}${char.bio ? `\nBACKSTORY: ${char.bio}\n` : ''}`;
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
      present.push(`- ${name}: ${desc}${ab?` | Abilities: ${ab}`:''}${data.relationship?` | Relationship: ${data.relationship}`:''}${data.notes?` | ${data.notes}`:''}`);
    });
    const parts = [];
    if (present.length) parts.push(`COMPANIONS (with the player, always):\n${present.join('\n')}\nPROFILE BALANCE: Preferences, favorite objects, fears and habits are facets of a companion, not their entire personality or mandatory recurring beats. Use them when relevant, with varied behavior grounded in the full profile.\nCOMPANION AGENCY: Companions are active party members, not passive observers. Their personality, beliefs, profession, relationships, and current circumstances must influence their behavior in scenes. They may independently speak, react, investigate, heal, intervene, object, joke, argue, assist, or take other reasonable actions without waiting for the player to address them first. Protecting player agency means never controlling the player character; it does not mean NPCs must wait for player permission to act. When an event strongly intersects a companion's established values or expertise, that companion should normally react unless there is a character-specific reason not to.`);
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







