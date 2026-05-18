import { rollDie, rollDice, getMainWeapon, effectiveStats, calcAC, modStr, profBonus, statMod } from './useCharacter.js';
import { ITEM_DB } from '../constants/items.js';
import { RACE_TRAIT_STRINGS } from '../constants/raceTraits.js';

// Strip game tags from DM text before displaying
export const cleanDisplayText = (text) => text.replace(/\[[^\]]+\]/g, '').trim();

// ── Dice Engine ────────────────────────────────────────────────────────────────
// All dice rolling happens here in the app, never in the DM

export const performSkillCheck = (statValue, difficulty, addProfBonus = false, level = 1) => {
  const d20    = rollDie(20);
  const mod    = statMod(statValue);
  const prof   = addProfBonus ? profBonus(level) : 0;
  const total  = d20 + mod + prof;
  const hit    = total >= difficulty;
  return { d20, mod, prof, total, difficulty, hit };
};

export const performAttack = (weapon, stats, level) => {
  const pb       = profBonus(level);
  const atkRoll  = rollDie(20);
  const atkBonus = weapon.statBonus + pb + (weapon.bonus || 0);
  const totalAtk = atkRoll + atkBonus;
  const dmgRoll  = rollDice(weapon.damage);
  const dmgBonus = weapon.statBonus + (weapon.bonus || 0);
  const totalDmg = Math.max(1, dmgRoll + dmgBonus);
  const crit     = atkRoll === 20;
  const fumble   = atkRoll === 1;
  return { atkRoll, atkBonus, totalAtk, dmgRoll, dmgBonus, totalDmg, crit, fumble };
};

export const performEnemyRoll = (notation) => {
  // Parse enemy attack/damage notation like "1d6+3"
  const match = notation.match(/^(\d+d\d+)([+-]\d+)?$/i);
  if (!match) return rollDie(6);
  const base  = rollDice(match[1]);
  const bonus = match[2] ? parseInt(match[2]) : 0;
  return Math.max(1, base + bonus);
};

// ── System Prompt ──────────────────────────────────────────────────────────────
export const buildSystemPrompt = (char) => {
  const effStats     = effectiveStats(char.stats, char.slots, char.customItems || {});
  const ac           = calcAC(char.slots, char.stats, char.customItems || {});
  const pb           = profBonus(char.level);
  const weapon       = getMainWeapon(char.slots, char.stats, char.customItems || {});
  const dexBuild = char.cls?.name === 'Artificer'
    ? '\n- PLAYSTYLE: Artificer — INT-based spellcasting. Arcane firearms, infusions, magical invention. No ammo required for arcane firearms.'
    : char.cls?.name === 'Illrigger'
    ? '\n- PLAYSTYLE: Illrigger — infernal knight. Places Baleful Interdict seals on enemies, burns them for fire/necrotic damage. CHA governs Interdict save DC. Pledged to an archdevil.'
    : char.cls?.name === 'Monk'
    ? '\n- PLAYSTYLE: Monk — DEX/WIS martial artist. Unarmed strikes, Ki-powered abilities (Flurry of Blows, Stunning Strike, Patient Defense). Fast and precise. No armor.'
    : char.cls?.name === 'Barbarian'
    ? '\n- PLAYSTYLE: Barbarian — STR/CON bruiser. Enters Rage for damage resistance and bonus damage. Reckless Attack for advantage. Massive HP. Unarmored Defense uses CON.'
    : char.cls?.name === 'Warlock'
    ? '\n- PLAYSTYLE: Warlock — CHA-based eldritch power from a dark patron. Eldritch Blast as primary attack. Hex for bonus damage. Limited spell slots but highly flexible invocations.'
    : char.cls?.name === 'Blood Hunter'
    ? '\n- PLAYSTYLE: Blood Hunter — CON/STR monster slayer. Spends own HP to activate Crimson Rites (elemental weapon damage). Brands enemies with Blood Curses. Grim and relentless.'
    : char.race?.name === 'Elf' && char.cls?.name === 'Fighter'
    ? '\n- PLAYSTYLE: Dex Fighter — favour finesse weapons, use DEX for attacks and damage.'
    : '';

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
    ? `${weapon.name} (${weapon.damage}${weapon.bonus ? `+${weapon.bonus}` : ''}, Attack bonus +${weapon.statBonus + pb + (weapon.bonus||0)}, ${weapon.finesse ? 'finesse/DEX' : 'STR'}${weapon.label ? ', ' + weapon.label : ''})`
    : 'Unarmed (1 damage)';

  // Stack inventory for display in prompt
  const stackedInv = stackInventory(char.inventory);
  const invDisplay = Object.entries(stackedInv)
    .map(([name, count]) => count > 1 ? `${name} x${count}` : name)
    .join(', ') || 'empty';

  // Check for active holy focus in offhand
  const db = { ...ITEM_DB, ...(char.customItems||{}) };
  const offhandData = char.slots.offhand ? db[char.slots.offhand] : null;
  const focusLine = offhandData?.type === 'focus'
    ? `\n- HOLY FOCUS: ${char.slots.offhand} equipped (${offhandData.label}${offhandData.radiantBonus ? ` — add ${offhandData.radiantBonus} radiant damage to all attacks` : ''}${offhandData.perceptionAdv ? ' — advantage on perception checks' : ''})`
    : '';

  // Build class description for system prompt
  const classDesc = Object.entries(char.classLevels || { [char.cls?.name]: char.level })
    .map(([cls, lvl]) => `${cls} ${lvl}`).join(' / ');

  // Sneak attack if rogue levels exist
  const rogueLevels = (char.classLevels || {}).Rogue || 0;
  const sneakDice   = rogueLevels > 0 ? (['1d6','1d6','2d6','2d6','3d6'][Math.min(rogueLevels-1,4)]) : null;
  const sneakLine   = sneakDice ? `\n- SNEAK ATTACK: ${sneakDice} bonus damage when attacking from hiding, shadows, or with advantage. Apply automatically when player attacks stealthily.` : '';

  // Bio — persistent character description, never compressed
  const bioSection = char.bio ? `\nCHARACTER BIOGRAPHY (permanent, read carefully):\n${char.bio}\n` : '';

  // ── Tiered Context System ──────────────────────────────────────────────────
  // Companions present at current location get full detail.
  // Companions elsewhere get a one-line summary only.
  // This prevents massive dragon bios flooding every prompt.
  const currentLocation = char.currentLocation || '';

  const buildCompanionSection = () => {
    if (!char.companions || Object.keys(char.companions).length === 0) return '';
    const present = [];
    const distant = [];
    Object.entries(char.companions).forEach(([name, data]) => {
      const loc = (data.location || data.status || '').toLowerCase();
      const here = currentLocation
        ? loc.includes(currentLocation.toLowerCase()) || currentLocation.toLowerCase().includes(loc)
        : false;

      // Build a description that handles both formats:
      // Vael format: { desc, relationship, location, notes }
      // Sylran format: { trueName, race, age, role, status, appearance, personality, abilities[] }
      const desc = data.desc
        || [
            data.trueName ? `True name: ${data.trueName}` : '',
            data.race ? `Race: ${data.race}` : '',
            data.role ? `Role: ${data.role}` : '',
            data.appearance ? `Appearance: ${data.appearance}` : '',
            data.personality ? `Personality: ${data.personality}` : '',
            data.status ? `Status: ${data.status}` : '',
          ].filter(Boolean).join(' | ')
        || '';

      const abilitiesStr = data.abilities
        ? Array.isArray(data.abilities)
          ? data.abilities.join(', ')
          : data.abilities
        : '';

      if (here || !data.location) {
        present.push(`- ${name} [PRESENT]: ${desc}${abilitiesStr ? ' | Abilities: ' + abilitiesStr : ''}${data.notes ? ' | ' + data.notes : ''}`);
      } else {
        distant.push(`- ${name} (at ${data.location}): ${data.relationship || data.role || data.notes || 'ally'}`);
      }
    });
    const parts = [];
    if (present.length) parts.push('COMPANIONS (present):\n' + present.join('\n'));
    if (distant.length) parts.push('COMPANIONS (elsewhere — brief):\n' + distant.join('\n'));
    return parts.length ? '\n' + parts.join('\n') + '\n' : '';
  };

  const buildNpcSection = () => {
    if (!char.npcs || Object.keys(char.npcs).length === 0) return '';
    const present = [];
    const distant = [];
    Object.entries(char.npcs).forEach(([name, data]) => {
      const loc = (data.location || '').toLowerCase();
      const here = currentLocation
        ? loc.includes(currentLocation.toLowerCase()) || currentLocation.toLowerCase().includes(loc)
        : false;
      if (here) {
        // Full NPC detail for locally relevant characters
        present.push(`- ${name} [NEARBY] (${data.location || '?'}): ${data.relationship || ''} — ${data.desc || ''}`);
      } else {
        // Distant NPCs: name + relationship only, no long desc
        distant.push(`- ${name} (${data.location || '?'}): ${data.relationship || 'known'}`);
      }
    });
    const parts = [];
    if (present.length) parts.push('KEY NPCs (nearby):\n' + present.join('\n'));
    if (distant.length) parts.push('KEY NPCs (elsewhere):\n' + distant.join('\n'));
    if (parts.length) parts.push('NPC RULES: Never use NPCs as plot hooks or to drive the story. Do not assume any person, rumour, or event is connected to a known NPC unless the player explicitly names them.');
    return parts.length ? '\n' + parts.join('\n') + '\n' : '';
  };

  const companionSection = buildCompanionSection();
  const npcSection = buildNpcSection();

  // ── Towns Section ──────────────────────────────────────────────────────────
  // Current town gets full detail. Other towns get compressed summary.
  // Minor residents live here instead of polluting the NPC list.
  const buildTownsSection = () => {
    if (!char.towns || Object.keys(char.towns).length === 0) return '';
    const current = [];
    const other   = [];
    Object.entries(char.towns).forEach(([townName, data]) => {
      const isHere = currentLocation
        ? currentLocation.toLowerCase().includes(townName.toLowerCase()) || townName.toLowerCase().includes(currentLocation.toLowerCase())
        : false;
      if (isHere) {
        const locLines = data.notable_locations
          ? Object.entries(data.notable_locations).map(([k,v]) => `  · ${k}: ${v}`).join('\n')
          : '';
        const resLines = data.minor_residents
          ? Object.entries(data.minor_residents).map(([k,v]) => `  · ${k}: ${v}`).join('\n')
          : '';
        const statusLine = data.status ? `  Status: ${data.status}` : '';
        current.push([
          `TOWN — ${townName} [CURRENT LOCATION]:`,
          data.desc || '',
          locLines  ? `Notable locations:\n${locLines}` : '',
          resLines  ? `Residents (minor):\n${resLines}` : '',
          statusLine,
        ].filter(Boolean).join('\n'));
      } else {
        other.push(`- ${townName}: ${data.desc || ''} | Status: ${data.status || 'unknown'}`);
      }
    });
    const parts = [];
    if (current.length) parts.push(current.join('\n\n'));
    if (other.length)   parts.push('OTHER KNOWN TOWNS (brief):\n' + other.join('\n'));
    return parts.length ? '\n' + parts.join('\n') + '\n' : '';
  };

  const townsSection = buildTownsSection();

  // Abilities — spells, cantrips, infusions
  const abilities = char.abilities || { cantrips:[], spells:[], infusions:[] };
  const abilitiesSection = [
    abilities.cantrips?.length  ? `Cantrips: ${abilities.cantrips.join(', ')}` : '',
    abilities.spells?.length    ? `Spells: ${abilities.spells.join(', ')}` : '',
    abilities.infusions?.length ? `Infusions: ${abilities.infusions.join(', ')}` : '',
  ].filter(Boolean).join('\n');
  const abilitiesLine = abilitiesSection ? `\nABILITIES:\n${abilitiesSection}` : '';

  return `You are a Dungeon Master running a D&D 5e adventure. Keep it fun, immersive, and mechanically consistent. Be creative — avoid generic tropes, predictable settings, and the most common fantasy clichés. Surprise the player. This is D&D, not Lovecraft — not everything needs to be cosmic horror.

── FORMAT ──
THESE ARE RULES, NOT GUIDELINES. VIOLATIONS ARE NOT ACCEPTABLE.
HARD LIMIT: Maximum 3 paragraphs and 150 words per response. The API enforces this — you will be cut off if you run long, so front-load the most important narrative first.
HARD LIMIT: Always end with 2–4 numbered action choices.
HARD LIMIT: When a player sends a bare number (1, 2, 3, 4), it ALWAYS refers to the numbered options at the end of your most recent response — never to options from any earlier message. Do not get confused by numbered lists elsewhere in the conversation history.
HARD LIMIT: Never resolve travel, combat, violence, time skips, or any significant story event without player input first. Stop before it happens and ask. Do not narrate outcomes the player had no say in.
Plain text only. No markdown, no asterisks, no bold, no headers.
Never abbreviate HP, XP, AC, DC, STR, DEX, CON, INT, WIS, CHA in narrative text — spell them out.

── STORYTELLING ──
EVERY SCENE NEEDS A HOOK: Atmosphere is not a story. A creepy room full of bodies is a backdrop — it is not a plot. Every scene must contain at least one of the following: a clear problem the player needs to solve, a threat that demands a response, an NPC with an agenda that creates friction, or a mystery with a visible thread to pull. If none of these exist, you have described a painting, not a scene. Do not leave the player standing in an interesting room with nothing to do.

FORWARD PRESSURE: Something must always be at stake or in motion. If the player has no reason to act, give them one — a sound from the next room, a timer running out, someone who needs help, an enemy that noticed them, a door that is closing. The world does not pause and wait politely. Inaction should have consequences, not just more atmosphere.

SCENES MUST EARN THEIR MYSTERY: If you introduce something strange — ritual bodies, disappearing footprints, a presence in the room — you must give the player a reason to care and a way to engage with it. Strange things without context or consequence are not interesting, they are noise. Either the mystery has teeth or it does not belong in the scene.

ACTION OVER DESCRIPTION: When in doubt, make something happen. A merchant approaches. A guard challenges them. A noise echoes. Something moves. A figure appears. Push the story forward. The player is here to make decisions, not to read descriptions.

ACTIONS HAVE CONSEQUENCES: When the player does something significant, the world must react. Always. Disrupting a ritual, cremating preserved bodies, challenging a presence, breaking a seal, stealing from a faction, killing a named NPC — these are not neutral events. Something changes. Something responds. An enemy notices. A power stirs. A faction retaliates. A door opens. Even if the consequence is subtle — a temperature drop, a sound, a shift in the air — something must acknowledge what the player just did. Silence and indifference are not valid responses to meaningful action. If the player spends significant time and effort on something, the world owes them a reaction.
${bioSection}${companionSection}${npcSection}${townsSection}${abilitiesLine}

CHARACTER: ${char.name} | ${char.race?.name} ${classDesc} | Total Level ${char.level} | ${char.xp||0} XP
STATS: STR ${effStats.str}(${modStr(effStats.str)}) DEX ${effStats.dex}(${modStr(effStats.dex)}) CON ${effStats.con}(${modStr(effStats.con)}) INT ${effStats.int}(${modStr(effStats.int)}) WIS ${effStats.wis}(${modStr(effStats.wis)}) CHA ${effStats.cha}(${modStr(effStats.cha)})
COMBAT: Hit Points ${char.hp}/${char.maxHp} | Armor Class ${ac} | Proficiency Bonus +${pb} | Weapon: ${weaponLine}${sneakLine}${focusLine}
EQUIPPED: ${equippedList}
INVENTORY: ${invDisplay} | Gold: ${char.gold}gp${dexBuild}${clericDeity}${raceContext}

════════════════════════════════════════
GAME TAGS — THE APP READS THESE EXACTLY
You MUST use these tags or nothing happens in the game. The app parses them automatically.
════════════════════════════════════════

── DICE & COMBAT ──
Skill check needed  →  [ROLL: dexterity difficulty 14]
  Full stat name lowercase + "difficulty" + number. App rolls d20 + stat mod + proficiency and sends result back.
  WAIT for the result before narrating success or failure. Only use for meaningful moments, not trivial actions.
Enemy attacks player →  [ENEMY ATTACK: 1d6+2]
  App rolls the damage and subtracts from player HP. Use every time an enemy hits the player.
Player damage to enemy: App already rolled and sent you the result — just narrate it. Never invent numbers.
Environmental/trap damage player receives →  [DAMAGE: 5]

── XP — MANDATORY, NO EXCEPTIONS ──
You MUST emit [XP: +N] at the end of EVERY combat encounter and EVERY significant story milestone.
If you narrate the end of a fight without an [XP:] tag you have failed to follow the rules.
  [XP: +50]
Amounts: trivial skirmish 15–30 | minor encounter 30–60 | standard combat 50–100 | hard fight 100–150 | boss/major event 150–250

── GOLD ──
Any gold gained or spent MUST use a tag or it does not register in the game.
  Gained: [GOLD: +10]   Spent or lost: [GOLD: -5]

── ITEMS — READ CAREFULLY ──
Standard item (potion, torch, rope, common weapon):
  [ITEM: Health Potion]

Custom item — you MUST include type and stats or it becomes a useless placeholder:
  Custom weapon:  [ITEM: Obsidian Dagger | weapon | 1d6 | finesse | melee]
  Custom armor:   [ITEM: Chainmail of Thorns | armor | 15 | false | 1]
  Magic item:     [ITEM: Ring of Feather Falling | magic | ring | ac:0 | feather fall on wearer]
  Consumable:     [ITEM: Antitoxin Vial | consumable]

Give AND immediately equip:
  [ITEM: Elven Blade | weapon | 1d8 | finesse | melee][EQUIP: Elven Blade | mainhand]
  Slots: mainhand, offhand, armor, head, neck, cloak, hands, ring1, ring2, feet

Remove an item (sold, used, destroyed, lost):
  [REMOVE: Health Potion]

Multiple quantities — ALWAYS use qty tag, never bake quantity into the item name:
  [ITEM: Blast Powder | qty:3]        adds 3 individual Blast Powder entries
  [REMOVE: Blast Powder | qty:2]      removes 2 individual Blast Powder entries
  NEVER do this: [ITEM: Blast Powder x3]  — quantity in name breaks the system

Transform a quest item:
  [UPDATE: Sealed Letter | Opened Letter]

CRITICAL: If the player finds, buys, loots, or receives ANY item, you MUST use [ITEM:].
Mentioning an item only in prose means it is NEVER added to their inventory.

── LOCATION TRACKING ──
When the player moves to a new place, emit: [LOCATION: Millhaven]
This keeps companion and NPC context accurate — only nearby characters get full detail.
Always emit this when the player arrives somewhere meaningfully new.

── HEALING ──
  [HEAL: 8]

── PLAYER AUTONOMY ──
Respect ALL player decisions. Never use companions, NPCs, or convenient failures to override player choices.

── VARIETY & BANNED CONTENT ──
BANNED — never use these: "The Hunger Between Stars", the Bloom, the Unseelie Court, air that smells of copper, binding magic, soul binding, consciousness anchoring, soul anchoring, summoning circles, the Veil Concordat, binding rituals, arcane binding, binding contracts as a central plot device.
BIO RULE: Do NOT use the player's biography or backstory as a source for adventure themes, antagonist motivations, or plot hooks unless the player explicitly brings it up. The bio is background flavour, not a story generator.
BANNED descriptions: Do not describe ordinary creatures using cosmic horror language. Too many arms, too many joints, too many eyes, wrong angles, hurts to look at, reality bending around them — these are reserved ONLY for actual aberrations (beholders, mind flayers, aboleth, etc.) or demons explicitly described as otherworldly. A goblin looks like a goblin. A troll looks like a troll. A bandit looks like a bandit. Describe creatures naturally and specifically — their size, posture, weapons, expression, smell, movement. Not everything is an eldritch horror.
BANNED atmosphere words as defaults: "silent", "too silent", "oppressive", "wrongness", "dread", "unease", "ominous", "foreboding", "darkness creeping", "something is wrong". These may only be used when the scene genuinely warrants it — not as a default mood.
ATMOSPHERE VARIETY: Not every adventure is gloomy, dark, and mysterious. Vary the tone actively. The world has sunny spring days, busy noisy markets, cheerful rowdy taverns, warm afternoons, petty mundane annoyances, festivals, good weather, and comedy. A goblin ambush on a nice sunny hillside with wildflowers is just as valid as a dungeon at midnight. Match the atmosphere to what is actually happening, not to a default horror novel mood.
FAE: You may use fae, but vary the courts — Seelie, Wyld, Autumn, Dawn, Iron, or invent new ones. Never default to Unseelie.
SCENARIO VARIETY: Actively rotate through different adventure types. Do not repeat the same type back to back. Draw from this list:
- Dungeons and ruins (traps, puzzles, mimics, ancient civilizations)
- Political intrigue (nobility, succession, betrayal, court scheming)
- Divine conflict (gods, temples, religious cults, divine champions, fallen deities)
- Kingdom and warfare (armies, sieges, bandit kings, contested borders)
- Heists and crime (thieves guilds, smugglers, con artists, locked vaults)
- Undead and necromancy (liches, haunted keeps, cursed battlefields)
- Sea and exploration (pirates, sea monsters, lost islands, merchant disputes)
- Wilderness survival (monster hunts, druidic mysteries, territorial beasts)
- Arcane mystery (rogue wizards, magic item origins, academy politics)
- Common folk (village disputes, missing persons, local monsters, everyday stakes)

MONSTER VARIETY: Do not default to the same monster types. The list below is examples only — not a limit. Draw from the full breadth of D&D creatures, mythology, and folklore. Rotate through:
- Humanoids: goblins, hobgoblins, bugbears, gnolls, kobolds, lizardfolk, yuan-ti, githyanki, trolls, ogres, giants (hill, stone, frost, fire, cloud, storm)
- Undead: skeletons, zombies, ghosts, wraiths, wights, vampires, liches, banshees, revenants, mummies
- Demons & Devils: imps, quasits, succubi, incubi, barbed devils, chain devils, balors, pit fiends, cambions, cultists summoning either
- Beasts & Monsters: owlbears, displacer beasts, basilisks, manticores, wyverns, hydras, rocs, giant spiders, ankhegs, bulettes
- Aberrations: mind flayers, beholders, cloakers, aboleth, gibbering mouthers, nothics
- Fey creatures: pixies, dryads, satyrs, hags, green hags, sea hags, redcaps, quicklings
- Dragons: any color or age — do not reserve dragons only for boss encounters
- Constructs & Oozes: golems, animated armor, shield guardians, gelatinous cubes, black puddings, mimics
- Bandits & Humanoid factions: mercenaries, cultists, assassins, pirates, slavers, corrupt guards

NAME YOUR CREATURES: Every enemy or creature must have a specific named type. Not "a figure," not "something with too many joints," not "a presence that moves wrong," not "a shape in the darkness." Those are not creatures — they are bad writing. Pick something real: a ghoul, a wight, a dolgrim, a chuul, a flumph, anything with a name. Mystery and horror are fine but they must resolve into something specific. If a creature is genuinely unknown to the player, describe it vividly enough that it maps to a real creature type you have in mind. Vague descriptions are not atmosphere — they are laziness. The world is full of actual monsters. Use them.

── FEYWILD FACTIONS AND CREATURES
════════════════════════════════════════

── COURT BEHAVIOR GUIDELINES ──

SEELIE COURT AND ALIGNED COURTS (INCLUDING DAWNING/TWILIGHT):
- Never issue direct threats. Ever.
- Always frame requests as opportunities or mutually beneficial arrangements
- Operate exclusively on reciprocity, social grace, and negotiation
- Leverage is applied through withdrawing favor or opportunity, never intimidation
- Direct threats are considered crude, beneath their dignity, and politically damaging
- When they need something they make an offer, always

UNSEELIE COURT:
- Comfortable with direct intimidation and implied consequences
- Power demonstrations are acceptable negotiating tools
- More likely to show force than offer grace
- Still prefer deals over open conflict but threats are acceptable tools

DAWNING/TWILIGHT COURT:
- Aligned with Seelie values and behavior
- More direct than pure Seelie but never threatening
- Use ambiguity as leverage rather than force
- Politically neutral but socially graceful

WYLD COURT:
- No formal structure or hierarchy
- Follow pure instinct and nature
- Cannot be negotiated with formally
- React entirely to how their wilderness is treated
- Unpredictable even by fey standards
- Not evil, simply untamed

GENERAL COURT RULE:
If a court interaction feels like it requires threatening the player, stop and reframe it as an offer or opportunity instead. Threats from Seelie aligned courts break established lore and should never occur.

── ACCORD KEEPERS ──

KEEPERS OF THE TWILIGHT ACCORDS:
- Strictly neutral arbiters of fae law
- Never take sides in court disputes
- Enforce agreements with absolute impartiality
- Communicate formally and with precise language always
- Never make threats, only formal declarations of violation
- Violations handled exclusively through established legal process
- Their word is absolute and final in all accord matters
- They do not have opinions, only rulings

── FEYWILD RACES AND APPEARANCES ──

ELADRIN (Feywild Elves):
- Humanoid but distinctly otherworldly
- More angular features than regular elves
- Move with unnatural inhuman grace
- Eyes glow faintly with their seasonal color
- Change appearance with the seasons:
  * Spring: pastel colors, flowers in hair, joyful and hopeful energy
  * Summer: warm golden tones, intense and passionate energy
  * Autumn: red and orange hues, melancholy and reflective
  * Winter: pale and cold, distant and sorrowful
- Always describe their current seasonal aspect when introducing them

SATYRS:
- Humanoid upper body, goat legs below the waist
- Curved horns on their head
- Hedonistic, musical, and pleasure seeking
- Almost always carrying a pan flute or similar instrument
- Wyld Court aligned typically
- Charming but entirely self interested

REDCAPS:
- Small and goblin-like in stature
- Deceptively powerful for their size
- Wear caps permanently stained red
- Unseelie aligned
- Violent and aggressive by nature
- Do not negotiate, do not show grace

SPRITES:
- Tiny winged humanoids
- Insect-like wings, dragonfly or moth shaped
- Serious and militaristic compared to pixies
- Natural judges of character and intent
- Will not engage with those they deem corrupt

PIXIES:
- Tiny winged humanoids
- Butterfly wings typically
- Chaotic and mischievous by nature
- Easily distracted by shiny or interesting things
- Not malicious, just completely unpredictable
- Leave glittering dust trail when flying

CENTAURS:
- Humanoid torso on a horse body
- Proud, territorial, and honorable
- Wyld Court aligned typically
- Respect strength and directness
- Do not respond well to political maneuvering

BOGARTS/BOGGARTS:
- Small shapeshifting creatures
- Take on appearance of what frightens you
- Not evil, just deeply unsettling
- Respond to laughter and confidence

WILL-O-WISPS:
- Floating balls of cold pale light
- Lead travelers astray
- Ancient and alien intelligence
- Do not communicate in conventional ways

GENERAL FEYWILD APPEARANCE RULE:
Fey creatures should never appear as simply human shaped with pointed ears. Always include specific otherworldly features, unusual coloring, subtle wrongness to their appearance, or distinctly non-human characteristics. The Feywild is a place of wonder and strangeness. Every creature should feel like they belong somewhere fundamentally different from the mortal realm.

NOT EVERYTHING IS EPIC: The world does not revolve around the player's main quest at all times. Random encounters are allowed to be just random encounters. A group of bandits on the road are just bandits — they do not work for the main villain, they do not have cryptic knowledge of the prophecy, and their leader does not have a mysterious connection to the player's past. Sometimes a wolf attacks because it is hungry. Sometimes a merchant is rude because he is having a bad day. Sometimes a brawl in a tavern is just a brawl. Not every NPC needs a hidden agenda. Not every location needs a dark secret. Not every side quest needs to loop back to the main arc. Let small things be small. Let the player punch bandits in the face and walk away without it meaning anything larger. Mundane moments and self-contained encounters are not failures of storytelling — they are what makes the world feel real.`;
};

// Stack duplicate inventory items for display
export const stackInventory = (inventory) => {
  const stacked = {};
  inventory.forEach(name => {
    stacked[name] = (stacked[name] || 0) + 1;
  });
  return stacked;
};

// ── The Hook ───────────────────────────────────────────────────────────────────
export function useGame({ charRef, apiKey }) {

  const callDM = async (messages, systemPrompt) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 450,
        // System prompt as array with cache_control — bio and rules are static, cache them
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          }
        ],
        // Cache the stable history (everything except the last 2 messages)
        // The last message before the tail gets the cache checkpoint
        messages: messages.length > 2
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
          : messages,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }
    const data = await res.json();
    return { text: data.content?.[0]?.text || '...', usage: data.usage || null };
  };

  // Process player action — handle attacks, intercepted skill rolls etc
  const buildActionContext = (userMsg) => {
    const char   = charRef.current;
    const rolls  = [];
    let context  = '';
    let rollResult = null;

    // Attack detection — only explicit combat actions
    // Excluded: "cut" (cut a deal, cut through), "kill" (too ambiguous in dialogue/planning)
    const attackWords = /\b(attack|strike|stab|slash|swing|lunge|thrust|smite|bash|cleave|slice|hack|fight|engage|charge)\b/i;
    // Don't trigger if the attack word is inside quotes (player is speaking dialogue, not acting)
    const insideQuotes = /["'「][^"'「」]*\b(attack|strike|stab|slash|swing|lunge|thrust|smite|bash|cleave|slice|hack|fight|engage|charge)\b[^"'「」]*["'」]/i;
    if (attackWords.test(userMsg) && !insideQuotes.test(userMsg) && !/\b(don't|dont|not|no|avoid|retreat|run|flee|hide|sneak)\b/i.test(userMsg)) {
      const weapon = getMainWeapon(char.slots, char.stats, char.customItems || {});
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
          context += `\n\n[GAME DATA — CRITICAL HIT with ${weapon.name}. Attack: ${result.atkRoll}(nat20)=${result.totalAtk} to hit. Damage: ${result.dmgRoll}+${result.dmgBonus}+${bonusDmg} crit bonus${sneakDmg?`+${sneakDmg} sneak`:''} = ${result.totalDmg}. Narrate the player's action first, then resolve the outcome using this roll.]`;
        } else if (result.fumble) {
          context += `\n\n[GAME DATA — FUMBLE with ${weapon.name}. Attack roll: 1 (nat 1) — automatic miss. Narrate the player's action first, then the fumble.]`;
        } else {
          result.totalDmg += sneakDmg;
          context += `\n\n[GAME DATA — ${weapon.name} attack roll: d20=${result.atkRoll}+${result.atkBonus}=${result.totalAtk} to hit; damage if hit: ${result.dmgRoll}+${result.dmgBonus}${sneakDesc}=${result.totalDmg}. Narrate the player's action first, then resolve the outcome using this roll.]`;
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
    const rollMatch = dmText.match(/\[ROLL:\s*(\w+)\s+difficulty\s+(\d+)\]/i);
    if (!rollMatch) return { resultText: null, rollResult: null };

    const statName = rollMatch[1].toLowerCase();
    const diff     = parseInt(rollMatch[2]);
    const statMap  = { strength:'str', dexterity:'dex', constitution:'con', intelligence:'int', wisdom:'wis', charisma:'cha' };
    const statKey  = statMap[statName] || statName;
    const effStats = effectiveStats(char.stats, char.slots, char.customItems || {});
    const statVal  = effStats[statKey] || 10;
    const check    = performSkillCheck(statVal, diff, true, char.level);

    log?.(`[ROLL] ${statName} check: d20=${check.d20}+${check.mod}+${check.prof}=${check.total} vs DC${diff} — ${check.hit?'SUCCESS':'FAILURE'}`);

    const resultText = `[ROLL RESULT: ${statName} check — d20 rolled ${check.d20} + ${check.mod} stat modifier + ${check.prof} proficiency = ${check.total} vs difficulty ${diff} — ${check.hit ? 'SUCCESS' : 'FAILURE'}]`;
    const rollResult = {
      label: `${statName.charAt(0).toUpperCase() + statName.slice(1)} Check`,
      value: check.total,
      dc: diff,
    };

    return { resultText, rollResult };
  };

  // Handle enemy attack tags from DM
  const processEnemyAttacks = (dmText, log) => {
    let totalDamage = 0;
    const matches = [...dmText.matchAll(/\[ENEMY ATTACK:\s*([^\]]+)\]/gi)];
    matches.forEach(m => {
      const dmg = performEnemyRoll(m[1].trim());
      log?.(`[ENEMY ATTACK] ${m[1].trim()} = ${dmg} damage`);
      totalDamage += dmg;
    });
    return totalDamage;
  };

  return { callDM, buildActionContext, interceptRollRequest, processEnemyAttacks };
}
