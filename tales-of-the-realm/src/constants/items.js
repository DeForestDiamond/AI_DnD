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
};

export const ARMOR_DB = {
  'Leather Armor': { type:'armor', ac:11, dexBonus:true,  maxDex:null },
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

export const ITEM_DB = { ...WEAPON_DB, ...ARMOR_DB, ...MAGIC_ITEM_DB };

export const SLOTS = [
  { id:'mainhand', label:'Main Hand', emoji:'⚔️',  accepts:['weapon']          },
  { id:'offhand',  label:'Off Hand',  emoji:'🛡️',  accepts:['weapon','shield'] },
  { id:'armor',    label:'Armor',     emoji:'🥋',  accepts:['armor']           },
  { id:'head',     label:'Helmet',    emoji:'⛑️',  accepts:['magic']           },
  { id:'neck',     label:'Necklace',  emoji:'📿',  accepts:['magic']           },
  { id:'cloak',    label:'Cloak',     emoji:'🧣',  accepts:['magic']           },
  { id:'hands',    label:'Gloves',    emoji:'🧤',  accepts:['magic']           },
  { id:'ring1',    label:'Ring',      emoji:'💍',  accepts:['magic']           },
  { id:'ring2',    label:'Ring',      emoji:'💍',  accepts:['magic']           },
  { id:'feet',     label:'Boots',     emoji:'👢',  accepts:['magic']           },
];

export const EMPTY_SLOTS = Object.fromEntries(SLOTS.map(s => [s.id, null]));

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
    const damage = parts[2] || '1d6';
    const finesse = parts[3]?.toLowerCase() === 'finesse';
    const range   = parts[4]?.toLowerCase() === 'ranged' ? 'ranged' : 'melee';
    const bonusMatch = damage.match(/\+(\d+)$/);
    const bonus = bonusMatch ? parseInt(bonusMatch[1]) : 0;
    const baseDmg = damage.replace(/\+\d+$/, '');
    return { name, data: { type:'weapon', damage:baseDmg, bonus, finesse, range } };
  }
  if (kind === 'armor') {
    const ac = parseInt(parts[2]) || 13;
    const dexBonus = parts[3]?.toLowerCase() !== 'false';
    const maxDex = parts[4] && parts[4] !== 'null' ? parseInt(parts[4]) : null;
    return { name, data: { type:'armor', ac, dexBonus, maxDex } };
  }
  if (kind === 'shield') {
    return { name, data: { type:'shield', ac: parseInt(parts[2]) || 2 } };
  }
  if (kind === 'magic') {
    const slot = parts[2] || 'neck';
    const bonuses = {};
    (parts[3] || '').split(',').forEach(b => {
      const m = b.trim().match(/^(ac|str|dex|con|int|wis|cha):(-?\d+)$/i);
      if (m) bonuses[m[1].toLowerCase()] = parseInt(m[2]);
    });
    return { name, data: { type:'magic', slot, bonuses, label: parts[4] || '' } };
  }
  return { name, data: { type:'misc' } };
};
