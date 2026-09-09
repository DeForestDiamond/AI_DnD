export const TAGS_BLOCK = `── GAME TAGS — THE APP READS THESE EXACTLY ──
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
  QUANTITY: [REMOVE: Health Potion] removes EXACTLY ONE copy. To remove multiple copies, ALWAYS use | qty:N, e.g. [REMOVE: Health Potion | qty:5]. Omitting qty NEVER means "all" — it always means 1. To remove an entire stack, use the actual current stack quantity.
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

UPDATING AN EXISTING ITEM — CHANGE ONLY WHAT ACTUALLY CHANGED. When an existing item's definition must be updated, preserve every field and every part of its existing authoritative label VERBATIM unless that specific part changed in the fiction. Copy the complete current definition from CURRENT STATE and alter only the necessary field(s). Never summarize, shorten, rewrite, clean up, simplify, regenerate, or omit unchanged details merely because you are re-emitting the item.
  - A status change (dormant → active, active → bound, etc.) changes ONLY the status field. The name, CR, label, capabilities, materials, dimensions, weapons, components, modifications, history, and all other fields remain byte-for-byte unchanged.
  - A quantity-neutral definition update uses | qty:0 and still preserves every unchanged field verbatim.
  - An upgrade adds or changes only the details actually affected by that upgrade; unrelated existing details remain intact.
  - If you cannot reproduce the complete existing definition accurately, do NOT invent a shorter replacement. Refer to the item in narration without redefining it until an actual state change requires a correct full update.
  WRONG: Existing [ITEM: Siege Dredger | construct | dormant | CR 16. Forty-foot Lantanese industrial siege dredger; restored command core; four rivet guns; cutting drum; crushing arms; adamantine plating; siege cutting lance] → [ITEM: Siege Dredger | construct | active | CR 16. Adamantine siege dredger; breaches barriers | qty:0]
  RIGHT: change only dormant to active and reproduce the entire original label unchanged.

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
    VEHICLES ARE CONSTRUCTS TOO. Any ship, spelljammer, boat, wagon, cart, carriage, sled, flying craft, planar vessel, or other transportation the player owns MUST use type | construct | rather than misc, magic, or another item type. The label MUST explicitly state what kind of vehicle it is immediately after the CR — e.g. "CR 1. Wagon; ..." or "CR 18. Spelljammer battleship; ..." — so the app and DM never have to infer its category from the name. For vehicles, CR reflects actual durability/combat capability; mundane transport may be CR 0-2 rather than using the golem-material ranges above.
    Examples: [ITEM: Ironbound Trade Wagon | construct | dormant | CR 1. Wagon; reinforced axle; canvas cargo bed] [ITEM: Astral Lance | construct | active | CR 18. Spelljammer warship; planar helm; armored hull; heavy arcane batteries]
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

── LOOT NORMALCY — SPECIFIC DOES NOT MEAN SPECIAL ──
Most things found in ordinary bodies, rooms, cargo, wrecks, camps, shops, containers, and debris are ordinary. Roughly 70–85% of loot should be mundane goods, materials, personal possessions, tools, ordinary equipment, scrap, commodities, food, trade goods, or straightforward valuables. Around 10–25% may be unusual or especially valuable. Truly magical, mysterious, plot-relevant, unique, or mechanically powerful finds are rare unless the source itself strongly justifies them.

Specific means name the actual object instead of saying "supplies" or "miscellaneous salvage"; it does NOT mean make the object exotic. Brass fittings, rope, sailcloth, copper wire, timber, tools, ordinary oil, trade bars, clothes, ceramics, food, cheap jewelry, spare parts, broken machinery, and plain valuables are good loot.

DO NOT MAKE LOOT CREATE WORK. An item does not need a secret, mystery, destination, hidden property, upgrade path, lore revelation, special mechanical use, or connection to an active plot. A brass astrolabe can simply be a brass astrolabe. A crate of silk is silk. A silver necklace is jewelry. Damaged machinery can simply be salvage. Only turn loot into a story when the player chooses to investigate it or the item was already established as important.

BE SPECIFIC, NOT EXCESSIVE. Creativity means believable variety and source-appropriate detail, not making every find magical, bespoke, named, or consequential. Do not use the magic-item examples below as a target distribution; they demonstrate TAG FORMAT only.

CRITICAL: Mentioning an item in prose does NOT add it to inventory. Only [ITEM:] does.`;
