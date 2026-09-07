import { ITEM_DB, EMPTY_SLOTS } from '../../constants/items.js';
import { SAVE_VERSION } from '../../constants/progression.js';
import { resolveArcLocation } from '../../constants/encounters.js';
import { normalizeStacks, addStack } from '../../utils/itemStacks.js';
import { pruneDeadItemDefinitions } from './items.js';

// -- Save migration -------------------------------------------------------------
export const migrateCharacter = (char) => {
  const notes = [];
  const v = char._v || 1;
  let c = { ...char };
  // Legacy saves may contain either individual-name arrays or the old save-only
  // compressed {name:count} shape. NEVER expand the compressed form: a stockpile
  // of 300,000 ingots must stay one object during migration, not briefly become
  // 300,000 strings just to be collapsed again at v19.
  const expandList = (val) => {
    if (Array.isArray(val)) return val;                 // old array form; v19 compacts it
    if (val && typeof val === 'object') return Object.entries(val)
      .map(([name, count]) => ({ name, qty: Math.max(0, parseInt(count, 10) || 0) }))
      .filter(x => x.qty > 0);
    return [];
  };
  if (c.inventory !== undefined) c.inventory = expandList(c.inventory);
  if (c.stash !== undefined) c.stash = expandList(c.stash);
  if (v < 2) {
    c.slots = { ...EMPTY_SLOTS };
    c.customItems = {};
    if (Array.isArray(char.equipped)) {
      char.equipped.forEach(name => {
        const d = ITEM_DB[name];
        if (d?.type === 'weapon' && !c.slots.mainhand) c.slots.mainhand = name;
        else if (d?.type === 'shield' && !c.slots.offhand) c.slots.offhand = name;
        else if (d?.type === 'armor'  && !c.slots.armor)   c.slots.armor   = name;
      });
    }
    notes.push('Equipment slots upgraded');
  }
  if (v < 3) { if (c.xp === undefined) { c.xp = 0; notes.push('XP initialized'); } }
  if (v < 4) { if (!c.customItems) { c.customItems = {}; } }
  if (v < 6) {
    // Add classLevels if missing -- infer from primary class
    if (!c.classLevels) {
      c.classLevels = {};
      if (c.cls?.name) c.classLevels[c.cls.name] = c.level;
      notes.push('Class levels initialized');
    }
  }
  if (v < 7) {
    if (!c.abilities) {
      c.abilities = { cantrips:[], spells:[], infusions:[] };
      notes.push('Abilities initialized -- please select your known spells and infusions');
    }
    if (!c.abilities.cantrips)  c.abilities.cantrips  = [];
    if (!c.abilities.spells)    c.abilities.spells    = [];
    if (!c.abilities.infusions) c.abilities.infusions = [];
  }
  if (v < 8) {
    // Add deity for clerics from old saves that don't have one.
    // Check both primary class AND classLevels (catches multiclass clerics).
    if (!c.deity && (c.cls?.name === 'Cleric' || c.cls?.name === 'Warlock' ||
      Object.keys(c.classLevels || {}).some(k => ['Cleric','Warlock'].includes(k)))) {
      c._needsDeitySelection = true;
      notes.push('Character needs to choose a deity/patron -- you will be prompted after load');
    }
    if (!c.deity) c.deity = null;
    // Add stash if missing
    if (!c.stash) { c.stash = []; notes.push('Stash initialized'); }
    if (!c.stashedCustomItems) { c.stashedCustomItems = {}; }
    if (!c.contextExclusions) { c.contextExclusions = { companions:{}, npcs:{}, towns:{} }; }
  }
  if (v < 9) {
    // Subclass support. Add the field; owed choices are detected live on load.
    if (!c.subclasses) c.subclasses = {};
  }
  if (v < 10) {
    // World-state containers. Features that write NPCs/towns (extraction, edit
    // panel) and the arc/pacing systems assume these exist; older saves may
    // lack any of them. Guarantees shape so downstream code can stop guarding.
    if (c.arc === undefined) c.arc = null;                    // no active antagonist
    if (!c.pacing) c.pacing = 'normal';
    if (!c.environment) c.environment = 'wilderness';
    if (!c.companions) c.companions = {};
    if (!c.npcs) c.npcs = {};
    if (!c.towns) { c.towns = {}; notes.push('Towns/locations store initialized'); }
    if (!c.contextExclusions) c.contextExclusions = {};
    ['companions','npcs','towns'].forEach(k => {
      if (!c.contextExclusions[k]) c.contextExclusions[k] = {};
    });
    // Companion/NPC entries: guarantee the three core keys every consumer and
    // the upcoming edit panel rely on. Light touch — optional flavor fields
    // (race, appearance, personality, ...) stay absent unless authored, since
    // the prompt builder skips missing fields cleanly.
    ['companions','npcs'].forEach(group => {
      Object.entries(c[group]).forEach(([name, entry]) => {
        if (!entry || typeof entry !== 'object') { c[group][name] = { desc: String(entry ?? ''), location: '', relationship: '' }; return; }
        if (entry.desc === undefined) entry.desc = '';
        if (entry.location === undefined) entry.location = '';
        if (entry.relationship === undefined) entry.relationship = '';
      });
    });
  }
  if (v < 11) {
    // Currency: gp number -> one copper integer (1gp = 100cp). Old saves have
    // char.gold; convert and retire the field.
    if (c.coins === undefined) c.coins = Math.max(0, Math.round((c.gold || 0) * 100));
    delete c.gold;
  }
  if (v < 12) {
    // New equipment slots (face, shoulders, torso, arms, waist) — backfill as
    // empty so the slots object matches the full SLOTS list. Existing equipped
    // items are untouched.
    c.slots = { ...EMPTY_SLOTS, ...(c.slots || {}) };
  }
  if (v < 14) {
    // Ledger of antagonists whose arcs are finished — filters them out of future
    // rolls so the player isn't sent after someone they already dealt with.
    if (!Array.isArray(c.defeatedAntagonists)) c.defeatedAntagonists = [];
  }
  if (v < 13) {
    // Quantity baked into the NAME ("Pit Fiend Scale x200") — one string
    // pretending to be many items. Breaks [REMOVE: name | qty:N] (the stored
    // name never matches), shows as a single item in the sidebar, and makes
    // crafting/selling propose consuming quantities that do not exist.
    // Expand into real individual entries; the save-boundary compression turns
    // them back into { name: count } on disk, so file size is unaffected.
    const QTY_IN_NAME = /^(.*?)\s*[xX]\s*(\d+)$/;
    const MAX_EXPAND = 500;                       // guard against a typo'd x99999
    const expandQty = (list) => {
      if (!Array.isArray(list)) return list;
      const out = [];
      for (const entry of list) {
        const m = typeof entry === 'string' && entry.match(QTY_IN_NAME);
        if (m && m[1].trim()) {
          const base = m[1].trim();
          const n = Math.min(MAX_EXPAND, Math.max(1, parseInt(m[2], 10) || 1));
          for (let i = 0; i < n; i++) out.push(base);
        } else out.push(entry);
      }
      return out;
    };
    const invBefore = (c.inventory || []).length;
    c.inventory = expandQty(c.inventory);
    c.stash = expandQty(c.stash);
    // Re-key any custom definition stored under the full "name xN" so the
    // expanded items keep their stats/label instead of orphaning.
    ['customItems', 'stashedCustomItems'].forEach(store => {
      if (!c[store]) return;
      const next = { ...c[store] };
      Object.keys(c[store]).forEach(key => {
        const m = key.match(QTY_IN_NAME);
        if (m && m[1].trim()) {
          const base = m[1].trim();
          if (!next[base]) next[base] = c[store][key];
          delete next[key];
        }
      });
      c[store] = next;
    });
    if ((c.inventory || []).length !== invBefore) {
      notes.push('Quantity-in-name items expanded into real stacks');
    }
  }
  if (v < 16) {
    // Structured disposition — who this character actually is, so the DM stops
    // assuming heroism. 'indifferent' is the important one: what genuinely
    // fails to move them.
    if (!c.disposition || typeof c.disposition !== 'object') {
      c.disposition = { alignment:'', cares:'', indifferent:'', methods:'', lines:'' };
    }
    if (c.arc && !Array.isArray(c.arc.objectives)) c.arc = { ...c.arc, objectives: [] };
    if (c.arc && typeof c.arc.goal !== 'string') c.arc = { ...c.arc, goal: '' };
  }
  if (v < 15) {
    // v13 expanded quantity-in-name entries in inventory and stash but missed
    // BAG CONTENTS, which are {name: count} maps rather than arrays. A bag
    // holding "Refined Veil x30": 1 reads as a single item named that, so the
    // real 30 are invisible to crafting, salvage and removal alike.
    const QTY = /^(.*?)\s*[xX]\s*(\d+)$/;
    let fixed = 0;
    ['customItems', 'stashedCustomItems'].forEach(store => {
      if (!c[store]) return;
      const next = { ...c[store] };
      Object.entries(c[store]).forEach(([bagName, data]) => {
        if (data?.type !== 'bag' || !data.contents) return;
        const contents = {};
        Object.entries(data.contents).forEach(([item, count]) => {
          const m = String(item).match(QTY);
          const held = Math.max(1, parseInt(count, 10) || 1);
          if (m && m[1].trim()) {
            const base = m[1].trim();
            const per = Math.min(500, Math.max(1, parseInt(m[2], 10) || 1));
            contents[base] = (contents[base] || 0) + per * held;   // merge if the base already exists
            fixed++;
          } else {
            contents[item] = (contents[item] || 0) + held;
          }
        });
        next[bagName] = { ...data, contents };
      });
      c[store] = next;
    });
    if (fixed) notes.push(`Bag contents: ${fixed} quantity-in-name entries expanded`);
  }
  if (v < 17) {
    // Techniques split out of the spells bucket. Only the field is added —
    // existing selections are left where they are and can be cleared by hand.
    if (c.abilities && !Array.isArray(c.abilities.martial)) c.abilities.martial = [];
  }
  if (v < 18) {
    // v18: persist a destination for the current arc. Old saves roll it once here.
    if (c.arc?.antagonist && !c.arc.arcLocation) {
      c.arc = { ...c.arc, arcLocation: resolveArcLocation(c.arc.antagonist) };
      notes.push(`Arc location assigned: ${c.arc.arcLocation}`);
    }
  }

  if (v < 19) {
    const legacyDefs = { ...(c.stashedCustomItems || {}), ...(c.customItems || {}), ...(c.items || {}) };
    const fixBakedQty = (list) => {
      let out = [];
      for (const stack of normalizeStacks(list)) {
        const m = stack.name.match(/^(.*?)\s*[xX]\s*(\d+)$/);
        if (m && m[1].trim()) out = addStack(out, m[1].trim(), stack.qty * Math.min(500000, Math.max(1, parseInt(m[2], 10) || 1)));
        else out = addStack(out, stack.name, stack.qty);
      }
      return out;
    };
    const inventory = fixBakedQty(c.inventory);
    const stash = fixBakedQty(c.stash);
    const items = {};
    const cloneDef = (d) => d && typeof d === 'object' ? { ...d, ...(d.bonuses ? { bonuses:{...d.bonuses} } : {}) } : { type:'misc' };
    const ensure = (name) => {
      if (!name || items[name]) return;
      items[name] = cloneDef(legacyDefs[name] || ITEM_DB[name] || { type:'misc' });
    };
    Object.entries(legacyDefs).forEach(([name, data]) => { items[name] = cloneDef(data); });
    inventory.forEach(({name}) => ensure(name));
    stash.forEach(({name}) => ensure(name));
    Object.values(c.slots || {}).filter(Boolean).forEach(ensure);
    Object.values(c.companions || {}).forEach(comp => Object.values(comp?.slots || {}).filter(Boolean).forEach(ensure));
    Object.values(items).forEach(data => {
      if (data?.type === 'bag' && data.contents) Object.keys(data.contents).forEach(ensure);
    });
    c.inventory = inventory;
    c.stash = stash;
    c.items = items;
    delete c.customItems;
    delete c.stashedCustomItems;
    notes.push('Inventory upgraded to compact quantity stacks and unified item registry');
  }
  if (v < 20) {
    // Banked coin is deliberately separate from carried coin. The DM prompt only
    // receives `coins`, so money parked here is player-visible but DM-invisible.
    if (c.bankedCoins === undefined) {
      c.bankedCoins = 0;
      notes.push('Banked coins initialized');
    }
  }
  c.bankedCoins = Math.max(0, Math.floor(Number(c.bankedCoins) || 0));
  // Be tolerant of hand-edited/new saves: normalize the two location lists even
  // when the file already claims the current version.
  c.inventory = normalizeStacks(c.inventory);
  c.stash = normalizeStacks(c.stash);
  if (!c.items || typeof c.items !== 'object') c.items = {};
  // Older saves may already contain orphaned definitions from crafting,
  // salvaging, or deletes that removed the last owned copy. Clean them once on
  // load as well as preventing new orphans below.
  c = pruneDeadItemDefinitions(c);
  c._v = SAVE_VERSION;
  return { char: c, notes };
};

