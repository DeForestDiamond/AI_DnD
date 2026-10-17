export const TAGS_BLOCK = `── GAME TAGS — THE APP READS THESE EXACTLY ──
Put state-change tags at the END of the response, after narration and choices. Tags execute changes; they are not descriptions of existing possessions. Never re-grant an item or balance merely because the player counts, draws, inspects, or mentions it. New acquisitions and changes require tags or they do not exist in the app. Reserve space for required tags and four choices outside the prose-length target; do not cut meaningful NPC/companion reactions for space. EXCEPTION: [ROLL:] ends the response immediately, with no result, narration, tags, or choices after it.

CORE STATE CHANGES
- XP: [XP: +50]. Mandatory after combat and milestones; scale to foe magnitude, not fight duration: trivial 10–25, minor 30–60, standard 50–100, hard 100–200, deadly 250–400, legendary 500–800, mythic 1000–2000. An instantly defeated legendary foe still pays legendary XP.
- Coins: [GOLD: +250] or [COIN: -5sp]. Bare numbers mean gold; signed pp/gp/sp/cp amounts and mixed denominations work, e.g. [GOLD: +3gp 5sp]. The app makes change. Never emit the current balance as a gain.
- Gain: [ITEM: Health Potion]. Remove permanently when consumed, sold, given away, or destroyed: [REMOVE: Health Potion]. Omitted quantity means exactly ONE, never all. Use [REMOVE: Health Potion | qty:5] for five; removing a stack requires its actual count. REMOVE is not unequip or a definition-update command.
- HP: [HP: +10] heals the PLAYER; [HP: -5] damages the PLAYER. [DAMAGE: 5] also damages only the PLAYER. For enemy attacks, adjudicate against the player's AC, roll enemy damage yourself, and tag that total. Enemy/NPC HP is not tracked: damage the player DEALS and enemy wounds/deaths are prose only, never HP/DAMAGE tags.
- Location: [LOCATION: Waterdeep - Yawning Portal] when the player's place changes. Retain broad and immediate location, including the vessel/building when relevant.
Story arc resolved (main antagonist permanently defeated or storyline fully concludes): [ARC COMPLETE]

ROLL CONTRACT — STOP AT THE TAG
Call a roll for an uncertain, meaningful action the player actually declared, or an imposed passive perception/save. Do not silently decide such outcomes. Introducing a threat does not authorize choosing an active response for the player or rolling that unchosen action. Read the player's actual message; ignore automated attack GAME DATA if they did not attack. When valid GAME DATA already resolves their attack, narrate it without another roll. After a requested roll, wait for the system's result and narrate its consequences next turn; do not guess a result or chain another roll onto that resolution.
- Weapon attacks, melee or ranged: [ROLL: attack difficulty 18], with the TARGET'S AC. Never bare attack or an invented rangedattack check. The parser accepts difficulty or DC, including 18ac / 18 ac.
- Skills: [ROLL: perception difficulty 14]. Use ONLY athletics, acrobatics, sleight of hand, stealth, arcana, history, investigation, nature, religion, animal handling, insight, medicine, perception, survival, deception, intimidation, performance, persuasion. Translate unusual actions to the governing standard skill, not custom names like tracking or magic check.
- Saves: [ROLL: dexterity saving throw DC 15]. Use strength, dexterity, constitution, intelligence, wisdom, or charisma plus saving throw or save; difficulty and DC are interchangeable. Saves resist something done TO the player, such as poison, traps, spells, fear, or loss of footing.
- AC is passive. Never request an AC, defence, or dodge roll. Use CURRENT STATE AC for attacks against the player; use an appropriate saving throw for resistible effects.

ACQUISITIONS, QUANTITIES & IDENTITY
Tag every actual reward, purchase, gift, theft, find, harvested creature part, and piece of loot taken. Payments require GOLD plus ITEM tags for non-coin rewards; purchases require the item and price deducted. Grant only what the player acquires, not everything merely seen on a shelf. Itemise distinct contents with separate tags and actual counts: [ITEM: Quicksilver Vial | qty:4][ITEM: Powdered Silver | qty:2]. A valuable container gets its own item in addition to its contents. Never substitute a vague bundle, crate of supplies, chest of gemstones, or assorted goods for the contents.
Quantities go in | qty:N on either bare or complete ITEM definitions, never in the name. Omitted qty adds one. A bare existing-name ITEM grants another identical copy without erasing its definition.
Each exact name identifies ONE authoritative definition shared by all copies, carried, stashed, or equipped. Reusing a name with new stats changes EVERY copy. Distinct variants need distinct names; keep the final exact name consistent in narration and management.
Definition-only changes use the COMPLETE [ITEM: ... | qty:0], with no new copy and no REMOVE/re-add. For an existing item, copy all unchanged fields and label text VERBATIM. A status change changes status alone; an upgrade changes only affected details. Preserve CR, capabilities, provenance, materials, dimensions, installed counts, powers, and all other unchanged information byte-for-byte. Never summarize or regenerate an existing label when re-emitting it. If you cannot reproduce it completely, mention the item in prose until a correct update is needed. These preservation rules override new-item brevity guidelines.
Execute direct player requests for items, coin, or state changes with the correct tags. Grant equipment without automatically equipping it; the player decides what to wear.

ITEM FORMATS — KEEP FIELD POSITIONS AND EMPTY BARS
Weapon fields: name | weapon | damage | finesse or empty | melee or ranged | label | bonus:N | optional stat:N pairs
[ITEM: Emberblade | weapon | 1d8+3 plus 2d6 fire | finesse | melee | ignites on command | bonus:2 | str:1]
- Damage contains base dice, an optional DAMAGE-ONLY flat modifier, and typed extra dice. Here +3 is damage-only; bonus:2 separately adds +2 to BOTH attack and damage. Never count enchantment twice or assume a damage-field +N changes attack rolls. Use bonus:0 for no enchantment.
- Write extra damage as plus <dice> <type>, e.g. 1d6 plus 1d4 lightning plus 1d4 thunder. These dice are rolled and doubled on critical hits; damage hidden in labels is not rolled.
- Only the literal finesse enables finesse; leave that field empty for an ordinary weapon. Use ranged for bows/firearms/ranged arcane weapons, melee otherwise.
- Optional trailing ac,str,dex,con,int,wis,cha:N bonuses apply while equipped; separate pairs with commas.

Armor fields: name | armor | base AC | dexBonus true/false | maxDex number/null | label | optional stat:N pairs
[ITEM: Breastplate of Fortitude | armor | 14 | true | 2 | reinforced plate | con:2]
Only main chest/body armor uses armor type and base AC. dexBonus controls adding Dexterity; maxDex caps that bonus or is null. Heavy armor normally uses false. Trailing ability/AC bonuses are additions, not replacement base AC.

Magic fields: name | magic | slot | bonuses or empty | label
[ITEM: Ring of Protection | magic | ring1 | ac:1 | wards against harm]
[ITEM: Boots of the Tundra | magic | feet | | walk on ice without tracks]
- Slot is ONE bare id: mainhand, offhand, armor, face, head, neck, shoulders, cloak, torso, arms, hands, waist, ring1, ring2, feet; ring is accepted for either ring slot. Never put phrases like main hand when used here.
- Non-body wearables use magic, not armor: face=goggles/lenses/masks; head=helm/circlet; neck=amulet/torc; shoulders=pauldrons/mantle (separate from cloak); torso=shirt/vest under armor; arms=bracers; hands=gloves; waist=belt/sash; feet=boots/greaves. Choose the anatomically correct slot.
- Bonuses contain ONLY comma-separated stat:N or skill:N pairs, never effect prose. Supported stats: ac,str,dex,con,int,wis,cha. Magic-item skill bonuses apply to checks while equipped: athletics, acrobatics, stealth, sleightofhand, arcana, history, investigation, nature, religion, animalhandling, insight, medicine, perception, survival, deception, intimidation, performance, persuasion.
[ITEM: Silver Lyre | magic | mainhand | performance:2 | musical instrument; bardic spellcasting focus]
- Instruments and bardic focuses, mundane or magical, use this existing magic format, mainhand or offhand. No new instrument type and no weapon damage merely for occupying a hand slot. Put musical/focus functions, effects, and limitations in the label.
- Effects belong in the label; retain the empty bonus field when there is no numeric bonus. Charges/per-day powers are narrative text honored by the DM, not app counters, e.g. Cone of Cold; 3 charges; recharges at dawn.

Construct fields: name | construct | dormant/active/bound | CR N. description
[ITEM: Bone Colossus | construct | dormant | CR 14. Forty-foot bone golem; obeys a command word; waking is loud and visible]
Golems, animated things, bound spirits, war machines, and things the player owns/commands rather than wears take NO equipment slot or stat bonuses. Begin the label with CR, then identity and capabilities. Material-based guidance: ordinary parts CR 3–8, monstrous parts CR 10–16, legendary remains CR 20+.
ALL owned transport—ships, spelljammers, boats, wagons, carts, carriages, sleds, flying/planar craft—is construct, never misc or magic. State the vehicle kind immediately after CR; vehicle CR reflects actual durability/combat power, so mundane transport may be CR 0–2.
[ITEM: Ironbound Trade Wagon | construct | dormant | CR 1. Wagon; reinforced axle; canvas cargo bed]

Consumable: [ITEM: Antitoxin Vial | consumable | cures poison]
Quest items/materials/tools/non-gear: [ITEM: Brass Token | misc | grants an audience with Lady Saryn]
Bare names work for ordinary known items: [ITEM: Sealed Letter]. Use misc to supply a readable description. Using, opening, decoding, or otherwise changing an existing quest item updates its definition with qty:0, not REMOVE/re-add.

NEW ITEM LABELS & LOOT
Give new magic items specific names and real effects, never Enchanted X or X - Enchanted with no defined enchantment. For unidentified magic, retain its real mechanics and mark unidentified in the label.
New simple labels should be concise semicolon-separated notes, aiming under 25 words where practical. For new weapons, put rolled damage in damage and normally limit the label to one special ability. New armor is defensive/protective/utility; accessories are utility/passive, without attack damage dice. New constructs describe identity, capabilities, command requirements and CR, not exhaustive spell lists or attack dice. Preserve all existing effects when updating; do not truncate complex authoritative items to meet brevity targets.
Do not invent untracked usage costs: bonus actions, once-per-turn rules, concentration, directed effort, or vague focus costs. Describe what the item does and means in the world. Established limitations and narrative charge/per-day effects remain in the label.

── LOOT NORMALCY — SPECIFIC DOES NOT MEAN SPECIAL ──
Match source and situation: smugglers carry papers/contraband; creatures yield their own parts; noble chests hold jewelry, signets, letters. Check current inventory and vary suitable rewards instead of repeatedly handing out the same potions and daggers.
Aim roughly 70–85% mundane goods/materials/possessions/equipment/salvage/food/valuables, 10–25% unusual or especially valuable, and rare earned magic/unique/plot finds unless the source justifies otherwise. Specific means an actual object (brass fittings, rope, sailcloth, ghoul-bile vial), not a vague category (Rare Materials, Misc Supplies); it does not mean every object needs an exotic name.
Do not make loot create work: no compulsory secret, mystery, destination, upgrade path, hidden property, plot connection, or lore revelation. Ordinary successes and salvage can remain ordinary. Let the player choose whether to investigate. Examples demonstrate formats, not a target frequency of magic items. Mentioning an acquisition in prose does NOT add it: only ITEM does.`;
