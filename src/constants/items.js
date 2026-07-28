export const WEAPON_DB = {
  'Dagger':        { type:'weapon', damage:'1d4', bonus:0, finesse:true,  range:'melee'  },
  'Shortsword':    { type:'weapon', damage:'1d6', bonus:0, finesse:true,  range:'melee'  },
  'Rapier':        { type:'weapon', damage:'1d8', bonus:0, finesse:true,  range:'melee'  },
  'Longsword':     { type:'weapon', damage:'1d8', bonus:0, finesse:false, range:'melee'  },
  'Greatsword':    { type:'weapon', damage:'2d6', bonus:0, finesse:false, range:'melee'  },
  'Handaxe':       { type:'weapon', damage:'1d6', bonus:0, finesse:false, range:'melee'  },
  'Mace':          { type:'weapon', damage:'1d6', bonus:0, finesse:false, range:'melee'  },
  'Shortbow':      { type:'weapon', damage:'1d6', bonus:0, finesse:false, range:'ranged' },
  'Longbow':       { type:'weapon', damage:'1d8', bonus:0, finesse:false, range:'ranged' },
  'Hand Crossbow': { type:'weapon', damage:'1d6', bonus:0, finesse:false, range:'ranged' },
  'Hunting Knife': { type:'weapon', damage:'1d4', bonus:0, finesse:true,  range:'melee'  },
  'Greataxe':      { type:'weapon', damage:'1d12', bonus:0, finesse:false, range:'melee'  },
  'Javelin':       { type:'weapon', damage:'1d6', bonus:0, finesse:false, range:'melee'  },
  'Dart':          { type:'weapon', damage:'1d4', bonus:0, finesse:true,  range:'ranged' },
  'Quarterstaff':  { type:'weapon', damage:'1d6', bonus:0, finesse:false, range:'melee'  },
  'Arcane Pistol': { type:'weapon', damage:'1d10', bonus:0, finesse:false, range:'ranged', label:'INT-based, arcane focus, no ammo required' },
};

export const ARMOR_DB = {
  'Leather Armor': { type:'armor', ac:11, dexBonus:true,  maxDex:null },
  'Studded Leather': { type:'armor', ac:12, dexBonus:true, maxDex:null },
  'Hide Armor':    { type:'armor', ac:12, dexBonus:true,  maxDex:2   },
  'Chain Shirt':   { type:'armor', ac:13, dexBonus:true,  maxDex:2   },
  'Scale Mail':    { type:'armor', ac:14, dexBonus:true,  maxDex:2   },
  'Chain Mail':    { type:'armor', ac:16, dexBonus:false, maxDex:0   },
  'Plate Armor':   { type:'armor', ac:18, dexBonus:false, maxDex:0   },
  'Shield':        { type:'shield', ac:2 },
};

export const MAGIC_ITEM_DB = {
  'Amulet of Health':        { type:'magic', slot:'neck',  bonuses:{ con:2 }, label:'+2 CON'  },
  'Ring of Protection':      { type:'magic', slot:'ring',  bonuses:{ ac:1  }, label:'+1 AC'   },
  'Cloak of Protection':     { type:'magic', slot:'cloak', bonuses:{ ac:1  }, label:'+1 AC'   },
  'Gauntlets of Ogre Power': { type:'magic', slot:'hands', bonuses:{ str:4 }, label:'+4 STR'  },
  'Boots of Speed':          { type:'magic', slot:'feet',  bonuses:{},        label:'Speed'   },
  'Helm of Telepathy':       { type:'magic', slot:'head',  bonuses:{},        label:'Tele'    },
  'Cloak of Elvenkind':      { type:'magic', slot:'cloak', bonuses:{},        label:'Stealth' },
};

export const FOCUS_DB = {
  "The Dawnbringer's Codex": { type:'focus', slot:'offhand', bonuses:{ cha:1 }, label:'+1 CHA, +1d4 radiant', radiantBonus:'1d4', deity:'Lathander' },
  "The Lunar Codex":         { type:'focus', slot:'offhand', bonuses:{ wis:1 }, label:'+1 WIS, perception+', perceptionAdv:true, deity:'Selune' },
  "Arcane Pistol":           { type:'weapon', slot:'mainhand', damage:'1d10', bonus:1, finesse:false, range:'ranged', label:'Arcane firearm, +1d8 on Artificer spells cast through it', arcaneFirearm:true },
};

export const ITEM_DB = { ...WEAPON_DB, ...ARMOR_DB, ...MAGIC_ITEM_DB, ...FOCUS_DB };

export const SLOTS = [
  { id:'mainhand',  label:'Main Hand', emoji:'⚔️',  accepts:['weapon']                  },
  { id:'offhand',   label:'Off Hand',  emoji:'🛡️',  accepts:['weapon','shield','focus','magic']  },
  { id:'armor',     label:'Armor',     emoji:'🥋',  accepts:['armor']                    },
  { id:'face',      label:'Face',      emoji:'👓',  accepts:['magic']                    },
  { id:'head',      label:'Head',      emoji:'⛑️',  accepts:['magic']                    },
  { id:'neck',      label:'Necklace',  emoji:'📿',  accepts:['magic']                    },
  { id:'shoulders', label:'Shoulders', emoji:'🎖️',  accepts:['magic']                    },
  { id:'cloak',     label:'Cloak',     emoji:'🧣',  accepts:['magic']                    },
  { id:'torso',     label:'Shirt',     emoji:'👕',  accepts:['magic']                    },
  { id:'arms',      label:'Bracers',   emoji:'💪',  accepts:['magic']                    },
  { id:'hands',     label:'Gloves',    emoji:'🧤',  accepts:['magic']                    },
  { id:'waist',     label:'Belt',      emoji:'🎗️',  accepts:['magic']                    },
  { id:'ring1',     label:'Ring',      emoji:'💍',  accepts:['magic']                    },
  { id:'ring2',     label:'Ring',      emoji:'💍',  accepts:['magic']                    },
  { id:'feet',      label:'Boots',     emoji:'👢',  accepts:['magic']                    },
];

export const EMPTY_SLOTS = Object.fromEntries(SLOTS.map(s => [s.id, null]));

// Infer an equipment slot from an item's NAME alone — used when the item has no
// type/slot data (DM equipped something it never granted, or misformatted a tag).
// Order matters: specific worn slots before the broad armor rule.
export const slotFromItemName = (name) => {
  const n = (name || '').toLowerCase();
  if (/shield|buckler/.test(n)) return 'offhand';
  if (/helm|helmet|hood|circlet|crown|coif/.test(n)) return 'head';
  if (/boots|greaves|sabaton|shoes|footwear/.test(n)) return 'feet';
  if (/gloves|gauntlet/.test(n)) return 'hands';
  if (/bracer|vambrace|arm-?guard|armband/.test(n)) return 'arms';
  if (/belt|girdle|sash|waistband/.test(n)) return 'waist';
  if (/goggles|lenses|spectacles|mask|monocle|eyepatch|visor|\beyes?\b/.test(n)) return 'face';
  if (/pauldron|mantle|epaulet|shoulder/.test(n)) return 'shoulders';
  if (/shirt|vest|tunic|jerkin|undershirt/.test(n)) return 'torso';
  if (/cloak|cape/.test(n)) return 'cloak';
  if (/\bring\b/.test(n)) return 'ring1';
  if (/amulet|necklace|pendant|torc|collar/.test(n)) return 'neck';
  if (/knife|dagger|sword|blade|axe|mace|hammer|spear|staff|wand|bow|crossbow|club|flail|scimitar|rapier|glaive|halberd|whip|sickle|pistol|gun|cannon|katana|sabre|saber|dirk|kukri|falchion|rod/.test(n)) return 'mainhand';
  if (/armor|armour|mail|plate|breastplate|cuirass|robe|leather|hide|brigandine|chain/.test(n)) return 'armor';
  return null;
};

// Parse a DM-generated item tag
// [ITEM: Flame Tongue | weapon | 1d8 | finesse | melee]
// [ITEM: Mithral Shirt | armor | 15 | true | 2]
// [ITEM: Ring of Evasion | magic | ring | ac:1 | +1 AC]
export const parseDMItem = (raw) => {
  const parts = raw.split('|').map(s => s.trim());
  const name = parts[0];
  if (parts.length === 1) return { name, data: ITEM_DB[name] || { type:'misc' } };
  const kind = parts[1]?.toLowerCase();
  if (kind === 'weapon') {
    const damageField = parts[2] || '1d6';
    const finesse = parts[3]?.toLowerCase() === 'finesse';
    const range   = parts[4]?.toLowerCase() === 'ranged' ? 'ranged' : 'melee';
    const label   = parts[5] || '';
    // Extra damage dice of another type: "1d8+1 plus 1d4 radiant plus 1d6 fire".
    // The first segment is the base damage (with optional +N enchantment); each
    // "plus" segment is an extra die that rolls separately and doubles on a crit.
    const segments = damageField.split(/\s+plus\s+/i);
    const damage   = segments[0].trim();
    const extras   = segments.slice(1).map(seg => {
      const m = seg.trim().match(/^(\d*d\d+)\s*(.*)$/i);
      return m ? { dice: m[1].toLowerCase(), type: (m[2] || '').trim().toLowerCase() } : null;
    }).filter(Boolean);
    const bonusMatch = damage.match(/\+(\d+)$/);
    const bonus = bonusMatch ? parseInt(bonusMatch[1]) : 0;
    const baseDmg = damage.replace(/\+\d+$/, '');
    // Stat bonuses on a weapon (a hammer that grants str:2, etc.). Scan every
    // field from the finesse slot onward for stat:N tokens so they're picked up
    // whether the DM adds them as a trailing field or mixes them into the label.
    const bonuses = {};
    parts.slice(3).forEach(part => {
      part.split(/[\s,]+/).forEach(tok => {
        const m = tok.trim().match(/^(ac|str|dex|con|int|wis|cha):(-?\d+)$/i);
        if (m) bonuses[m[1].toLowerCase()] = parseInt(m[2]);
      });
    });
    // Keep the label readable: drop any stat tokens that landed inside it,
    // without disturbing the surrounding punctuation.
    const cleanLabel = label
      .replace(/\b(ac|str|dex|con|int|wis|cha):-?\d+\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;])/g, '$1')
      .trim();
    return { name, data: { type:'weapon', damage:baseDmg, bonus, finesse, range, label: cleanLabel,
      ...(Object.keys(bonuses).length ? { bonuses } : {}), ...(extras.length ? { extras } : {}) } };
  }
  if (kind === 'armor') {
    const ac = parseInt(parts[2]) || 13;
    const dexBonus = parts[3]?.toLowerCase() !== 'false';
    const maxDex = parts[4] && parts[4] !== 'null' ? parseInt(parts[4]) : null;
    const label  = parts[5] || '';
    // Stat bonuses from parts[4] onward. Split on commas as well as fields —
    // "ac:2,con:1" arrives as ONE part, and without splitting it matched
    // nothing and the armour silently lost every bonus.
    const bonuses = {};
    parts.slice(4).forEach(p => {
      p.split(',').forEach(tok => {
        const m = tok.trim().match(/^(ac|str|dex|con|int|wis|cha):(-?\d+)$/i);
        if (m) bonuses[m[1].toLowerCase()] = parseInt(m[2]);
      });
    });
    return { name, data: { type:'armor', ac, dexBonus, maxDex, bonuses, label } };
  }
  if (kind === 'shield') {
    return { name, data: { type:'shield', ac: parseInt(parts[2]) || 2 } };
  }
  if (kind === 'magic') {
    const BONUS_RE = /^(ac|str|dex|con|int|wis|cha|athletics|acrobatics|stealth|sleightofhand|sleight|arcana|history|investigation|nature|religion|animalhandling|animal|insight|medicine|perception|survival|deception|intimidation|performance|persuasion):(-?\d+)$/i;

    // — Slot: the DM sometimes writes prose here ("main hand when used",
    //   "equipped on ring1 currently"). Clean it to a real slot id: exact match,
    //   then a slot id mentioned anywhere in the phrase, then infer from the item
    //   name, else default to neck.
    const rawSlot = (parts[2] || '').trim().toLowerCase();
    const validIds = SLOTS.map(s => s.id);
    let slot = validIds.includes(rawSlot) ? rawSlot : null;
    if (!slot) slot = validIds.find(id => new RegExp(`\\b${id}\\b`).test(rawSlot))
                   || (/main\s*hand/.test(rawSlot) ? 'mainhand'
                     : /off\s*hand/.test(rawSlot) ? 'offhand'
                     : /ring/.test(rawSlot) ? 'ring1' : null);
    if (!slot) slot = slotFromItemName(name) || 'neck';

    // — Bonuses field: parse stat:N pairs. If the field is present but contains
    //   NO valid pairs, it's actually a description the DM misplaced — capture it
    //   as the label instead of silently dropping it (a hollow item).
    const bonuses = {};
    let stray = '';
    (parts[3] || '').split(',').forEach(b => {
      const m = b.trim().match(BONUS_RE);
      if (m) bonuses[m[1].toLowerCase()] = parseInt(m[2]);
      else if (b.trim()) stray += (stray ? ', ' : '') + b.trim();
    });
    // Label is parts[4] if given; otherwise the stray prose recovered from the
    // bonus field (so a misformatted item still shows its effect).
    const label = (parts[4] || '').trim() || stray;

    return { name, data: { type:'magic', slot, bonuses, label } };
  }
  if (kind === 'construct') {
    // Constructs, golems and bound entities: owned and commanded, never worn.
    // No slot is assigned, so they can never be equipped.
    const status = (parts[2] || 'dormant').trim();
    const label  = parts.slice(3).join(' | ').trim();
    return { name, data: { type:'construct', status, label } };
  }
  if (kind === 'consumable') {
    return { name, data: { type:'consumable', label: parts[2] || '' } };
  }
  if (kind === 'misc') {
    return { name, data: { type:'misc', label: parts.slice(2).join(' | ') } };
  }
  // Unknown type field — treat everything after the name as the label so quest
  // items like [ITEM: Brass Token | Grants an audience with Lady Saryn] keep their
  // description instead of silently discarding it.
  if (parts.length > 1) {
    return { name, data: { type:'misc', label: parts.slice(1).join(' | ') } };
  }
  return { name, data: { type:'misc' } };
};
