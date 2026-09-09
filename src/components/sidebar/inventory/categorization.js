// ── Inventory categorization ───────────────────────────────────────────────────
// Item categorisation. Equipment categories are determined only by structured
// item type/slot data; name-based inference is reserved for non-equipment
// inventory such as materials, documents, consumables, tools, and valuables.
export const categorizeItem = (name, data) => {
  const n = name.toLowerCase();
  const slot = (data?.slot || '').toLowerCase();
  const heldSlots = new Set(['mainhand', 'offhand']);
  const wornSlots = new Set(['armor', 'face', 'head', 'neck', 'shoulders', 'cloak', 'torso', 'arms', 'hands', 'waist', 'ring', 'ring1', 'ring2', 'feet']);

  // Equipment categories trust structured item data, not English words in names.
  // Held equipment (weapons, shields, foci, wands, etc.) lives together.
  if (heldSlots.has(slot)) return 'weapons';
  if (wornSlots.has(slot)) return 'worn';
  if (data?.type === 'construct') return 'constructs';
  if (data?.type === 'weapon' || data?.type === 'shield' || data?.type === 'focus') return 'weapons';
  if (data?.type === 'armor') return 'worn';
  if (data?.type === 'bag') return 'gear';
  if (data?.type === 'consumable' || data?.type === 'potion') return 'consumables';

  // 2. Name-based. Order matters: most specific first.
  // Books & written knowledge
  if (/\b(book|codex|tome|grimoire|compendium|manual|treatise|primer|almanac|bestiary|folio)\b|scroll|principles of|mechanisms of|fundamentals|theory|theories|liturgy|liturgies|catechism|scripture/.test(n)) return 'books';
  // Documents & records (split out of the old bloated 'quest')
  if (/\b(journals?|ledgers?|logs?|letters?|notes?|missives?|dispatch(es)?|orders?|contracts?|deeds?|manifests?|receipts?|invoices?|rosters?|census|reports?|testimony|confessions?|records?|correspondence|dossiers?|memos?|tablets?|parchment|documents?)\b|logbook|address|blueprint|schematic|plans\b|charter|papers|envelope|\bchit\b|contact card|licens|permit|writ\b/.test(n)) return 'documents';
  // Maps get their own visual grouping inside documents
  if (/\bmaps?\b|\bcharts?\b|wayfinder/.test(n)) return 'documents';
  // Keys, seals, tokens, credentials
  if (/\b(key|keys|seal|seals|sigil|token|insignia|badge|pass|writ|stamp|stamps|signet|emblem|crest|brand)\b/.test(n)) return 'keys';
  // Ammunition
  if (/\b(arrows?|bolts?|bullets?|darts?|quiver|ammunition|shot)\b/.test(n) && !/silk|wool|cloth|linen|fabric|velvet/.test(n)) return 'ammo';
  // Consumables — potions, vials of liquid, oils, bombs, food
  if (/\b(potion|elixir|draught|tincture|philter|antitoxin|antidote|salve|ointment|poison|venom vial|bomb|flask|incense|candle|candles|ration|rations|food|bread|cheese|wine|ale|meat|biscuit)\b|healing|alchemist'?s|holy water|smoke ?bomb|\bvials?\b|\boils?\b|booze|flashpowder|concentrate|\bsalt\b|sedative|suppression/.test(n)) return 'consumables';
  // Reagents, monster parts, crafting materials
  if (/\b(scale|scales|claw|claws|talon|fang|fangs|tooth|teeth|bone|bones|hide|pelt|leather|skin|wing|wings|tentacle|eye|eyes|horn|hoof|hooves|carapace|shell|chitin|gland|heart|liver|brain|organ|organs|blood|ichor|essence|dust|powder|ash|ore|ingot|shard|fragment|chunk|sample|specimen|component|components|reagent|reagents|material|materials|extract|resin|silk|feather|hair|corpse|carcass|remains|head|hand|hands)\b|preserved|harvested|powdered|crystallized|\bvenoms?\b|\btendons?\b|\bbark\b|\beggs?\b|\bcores?\b|filings|grave dirt|claw|fang|scale|tongue|membrane|sinew|marrow|\bsilks?\b/.test(n)) return 'materials';
  // Tools & kits
  if (/\b(tools?|kits?|lockpicks?|lock ?picks?|quills?|ink|brush(es)?|chisel|saw|needle|thread|instruments?|apparatus|abacus|compass|astrolabe|spyglass|lens|lenses)\b|tinker|artisan|smithing|masonry/.test(n)) return 'tools';
  // Valuables & trade goods
  if (/\b(gems?|gemstones?|rub(y|ies)|sapphires?|emeralds?|diamonds?|opals?|pearls?|topaz|amethyst|jade|carnelian|turquoise|lapis|moonstone|garnet|onyx|beads?|jewel(ry|s)?|bullion|chalice|goblet|statuette|figurine|painting|portrait|tapestry|rugs?|carpet|perfume|spices?|trade goods|treasure|coins?|bullion)\b|bolts? of (silk|wool|cloth|linen)|(silk|wool|cloth|linen) bolts?/.test(n)) return 'valuables';
  // Containers & camping gear
  if (/\b(pouch(es)?|sacks?|bags?|backpacks?|box(es)?|chests?|crates?|barrels?|jars?|jugs?|bottles?|cases?|satchels?|bedrolls?|blankets?|tents?|torch(es)?|lanterns?|ropes?|grappling|hooks?|flint|tinderbox|waterskins?|whistles?|mirrors?|chalk|soap|shovel|crowbar|piton|nets?|sheet set|linens?)\b|camping|portable hole/.test(n)) return 'gear';
  // Magic items that didn't match a worn slot (wands, orbs, charms, foci)
  if (data?.type === 'magic' || /\b(wand|orb|charm|talisman|totem|focus|crystal|stone|relic|artifact|idol)\b|enchanted|of the |rune|runic|arcane|holy symbol|\bvessel\b/.test(n)) return 'magic';
  return 'misc';
};

export const hasInspectableItemInfo = (d) => {
  if (!d) return false;
  if (d.label?.trim()) return true;
  if (d.slot) return true;
  if (d.ac !== undefined) return true;
  if (d.damage) return true;
  if (d.bonus) return true;
  if (Array.isArray(d.extras) && d.extras.length) return true;
  if (d.bonuses && Object.keys(d.bonuses).length) return true;
  if (d.type && d.type !== 'misc') return true;
  return false;
};

export const CATEGORY_META = {
  constructs:  { label: '🗿 Constructs',        emoji: '🗿' },
  weapons:     { label: '⚔️ Weapons',           emoji: '⚔️' },
  ammo:        { label: '🏹 Ammunition',        emoji: '🏹' },
  worn:        { label: '🛡️ Armor & Worn',      emoji: '🛡️' },
  consumables: { label: '⚗️ Consumables',       emoji: '⚗️' },
  magic:       { label: '✨ Magic Items',       emoji: '✨' },
  tools:       { label: '🔧 Tools & Kits',      emoji: '🔧' },
  gear:        { label: '🎒 Gear & Containers', emoji: '🎒' },
  materials:   { label: '🦴 Materials & Parts', emoji: '🦴' },
  valuables:   { label: '💎 Valuables',         emoji: '💎' },
  books:       { label: '📚 Books & Scrolls',   emoji: '📚' },
  documents:   { label: '📜 Documents',         emoji: '📜' },
  keys:        { label: '🔑 Keys & Seals',      emoji: '🔑' },
  misc:        { label: '🗃️ Misc',              emoji: '🗃️' },
};
