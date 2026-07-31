import { useState } from 'react';
import { PACING, ENVIRONMENTS } from '../constants/encounters.js';
import { colors, fonts, btn } from '../styles/theme.js';
import { SLOTS } from '../constants/items.js';
import { STAT_NAMES } from '../constants/classes.js';
import { statMod, modStr, profBonus, calcAC, getMainWeapon, effectiveStats, equippableInSlot, allItems, skillBonuses, effectiveMaxHp, gearHpBonus } from '../hooks/useCharacter.js';
import { stackInventory, SKILL_ABILITY, SKILL_LIST } from '../hooks/useGame.js';
import { coinsToString } from '../constants/currency.js';
import { XP_THRESHOLDS } from '../constants/progression.js';

// ── Inventory categorization ───────────────────────────────────────────────────
// Item categorisation. Tuned against ~1,600 real item names across five
// characters' saves — most inventory entries are bare strings with no type
// data, so this is name-based inference with the declared type winning when
// present. Order matters: specific rules before broad ones.
const categorizeItem = (name, data) => {
  const n = name.toLowerCase();
  // 1. Explicit type wins (but magic falls through to name checks for better sorting)
  if (data?.type === 'construct') return 'constructs';
  if (data?.type === 'weapon') return 'weapons';
  if (data?.type === 'armor' || data?.type === 'shield') return 'worn';
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
  // Weapons — THE BIG MISS in the old version (no name fallback existed)
  if (/\b(sword|longsword|shortsword|greatsword|broadsword|scimitar|rapier|sabre|saber|katana|falchion|dagger|daggers|knife|knives|dirk|kukri|stiletto|axe|handaxe|greataxe|hatchet|mace|maul|hammer|warhammer|flail|morningstar|club|quarterstaff|staff|spear|lance|pike|halberd|glaive|trident|javelin|bow|longbow|shortbow|crossbow|sling|whip|rod|scythe|sickle|cleaver|blade|pistol|musket|rifle|firearm|hilt)\b/.test(n)) return 'weapons';
  // Ammunition
  if (/\b(arrows?|bolts?|bullets?|darts?|quiver|ammunition|shot)\b/.test(n) && !/silk|wool|cloth|linen|fabric|velvet/.test(n)) return 'ammo';
  // Worn: armor, shields, jewelry, clothing — anything you put on
  if (/\b(armor|armour|mail|chainmail|plate|breastplate|cuirass|brigandine|shield|buckler|helm|helmet|coif|circlet|crown|tiara|diadem|bracer|bracers|vambrace|gauntlet|gauntlets|glove|gloves|greave|greaves|boot|boots|sabaton|pauldron|mantle|cloak|cape|robe|robes|vestment|vestments|dress|outfit|tunic|shirt|vest|jerkin|garb|attire|uniform|belt|girdle|sash|ring|rings|necklace|amulet|pendant|choker|torc|brooch|earring|bracelet|locket|collar|mask|goggles|spectacles|lenses)\b/.test(n)) return 'worn';
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

const CATEGORY_META = {
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

// ── Sub-components ─────────────────────────────────────────────────────────────
function HPBar({ current, max }) {
  const pct   = max > 0 ? Math.max(0, (current / max) * 100) : 0;
  const color = pct > 60 ? colors.green : pct > 30 ? colors.yellow : colors.red;
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontFamily:fonts.display,fontSize:12,color:colors.gold,letterSpacing:1}}>HIT POINTS</span>
        <span style={{fontFamily:fonts.mono,color,fontWeight:'bold',fontSize:12}}>{current}/{max}</span>
      </div>
      <div style={{background:colors.borderFaint,borderRadius:3,height:7,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:3,transition:'all 0.5s'}}/>
      </div>
    </div>
  );
}

function XPBar({ xp, level }) {
  const next = XP_THRESHOLDS[Math.min(level+1, XP_THRESHOLDS.length-1)];
  const cur  = XP_THRESHOLDS[level] || 0;
  const pct  = next > cur ? Math.min(100, ((xp-cur)/(next-cur))*100) : 100;
  const max  = level >= XP_THRESHOLDS.length-1;
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
        <span style={{fontFamily:fonts.display,fontSize:13,color:colors.textGhost,letterSpacing:1}}>XP</span>
        <span style={{fontFamily:fonts.mono,color:colors.textGhost,fontSize:12}}>{xp}{max?' (max)':`/${next}`}</span>
      </div>
      <div style={{background:colors.borderFaint,borderRadius:3,height:4,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:colors.goldFaint,borderRadius:3,transition:'all 0.8s'}}/>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div onClick={() => setOpen(v => !v)}
        style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',padding:'3px 0',borderBottom:`1px solid ${colors.borderDim}`,marginBottom: open ? 4 : 0}}>
        <span style={{fontFamily:fonts.display,fontSize:13,color:colors.textFaint,letterSpacing:2}}>{title}</span>
        <span style={{fontFamily:fonts.mono,fontSize:13,color:colors.textGhost}}>
          {count > 0 && <span style={{color:colors.gold,marginRight:4}}>{count}</span>}
          {open ? '▲' : '▼'}
        </span>
      </div>
      {open && children}
    </div>
  );
}

// ── Voice settings: pick an installed TTS voice + speaking speed ──────────────
function VoiceSettings({ voiceName, setVoiceName, rate, setRate, pitch, setPitch, pronounce, setPronounce, availableVoices, preview }) {
  // Android variants often share one display name — number the duplicates so
  // "English (United States)" 1..N are individually selectable (keyed by voiceURI).
  const nameCounts = {};
  availableVoices.forEach(v => { nameCounts[v.name] = (nameCounts[v.name] || 0) + 1; });
  const seen = {};
  const labelFor = (v) => {
    seen[v.name] = (seen[v.name] || 0) + 1;
    const numbered = nameCounts[v.name] > 1 ? `${v.name} ${seen[v.name]}` : v.name;
    return numbered + (v.localService === false ? ' (online)' : '');
  };
  const [open, setOpen] = useState(false);
  return (
    <div style={{marginBottom:8}}>
      <button onClick={()=>setOpen(o=>!o)} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0'}}>
        🔊 Voice {open ? '▲' : '▼'}
      </button>
      {open && (
        <div style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:8,marginTop:4}}>
          <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:3}}>VOICE</div>
          <select value={voiceName} onChange={e=>setVoiceName(e.target.value)}
            style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:12,padding:'5px 8px',borderRadius:4,outline:'none',marginBottom:8}}>
            <option value="">Auto (system default)</option>
            {availableVoices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{labelFor(v)}</option>)}
          </select>
          <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:3}}>SPEED — {rate.toFixed(2)}×</div>
          <input type="range" min="0.5" max="1.5" step="0.05" value={rate}
            onChange={e=>setRate(parseFloat(e.target.value))}
            style={{width:'100%',accentColor:colors.gold,marginBottom:8}}/>
          <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:3}}>PITCH — {pitch.toFixed(2)}</div>
          <input type="range" min="0.5" max="1.5" step="0.05" value={pitch}
            onChange={e=>setPitch(parseFloat(e.target.value))}
            style={{width:'100%',accentColor:colors.gold,marginBottom:8}}/>
          <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:3}}>PRONUNCIATION</div>
          <textarea value={pronounce || ''} onChange={e=>setPronounce(e.target.value)} rows={3}
            placeholder={"One per line — word: how to say it\nSseth'karix: Seth ka rix\nVyn: Vinn"}
            style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:11,padding:'5px 8px',borderRadius:4,outline:'none',resize:'vertical',marginBottom:8,lineHeight:1.4}}/>
          <button onClick={preview} style={{...btn(false),width:'100%',fontSize:11,padding:'4px 0'}}>▶ Preview</button>
          {availableVoices.length === 0 && (
            <div style={{fontSize:10,color:colors.textGhost,marginTop:6,lineHeight:1.4}}>No voices detected yet — they load a moment after the page. To add better ones, install a TTS engine in your device's accessibility settings.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Disposition: who the character actually is, so the DM stops assuming heroism ──
function DispositionEditor({ disposition, onSaveDisposition }) {
  const [d, setD] = useState(disposition || {});
  const [dirty, setDirty] = useState(false);
  const set = (k, v) => { setD(prev => ({ ...prev, [k]: v })); setDirty(true); };
  const FIELDS = [
    ['alignment',   'Alignment',                'e.g. Neutral Evil'],
    ['cares',       'Cares about',              'profit, power, his own survival, the few people he has claimed'],
    ['indifferent', 'Indifferent to',           'slavery, law, strangers suffering, his reputation among the righteous'],
    ['methods',     'How they solve problems',  'violence when cheaper than talking; deception; buying people'],
    ['lines',       'Lines they will not cross','will not harm those under his protection'],
  ];
  return (
    <CollapsibleSection title="🎭 DISPOSITION" defaultOpen={false}>
      <div style={{fontSize:10,color:colors.textFaint,marginBottom:6,lineHeight:1.4}}>
        Sent every turn. The DM assumes heroism unless told otherwise — <b>Indifferent to</b> is what stops NPCs appealing to things your character does not care about.
      </div>
      {FIELDS.map(([k, label, ph]) => (
        <div key={k} style={{marginBottom:5}}>
          <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:2}}>{label.toUpperCase()}</div>
          <textarea value={d[k] || ''} onChange={e=>set(k, e.target.value)} placeholder={ph} rows={k==='alignment'?1:2}
            style={{...npcInput, resize:'vertical', lineHeight:1.4}}/>
        </div>
      ))}
      <button onClick={()=>{ onSaveDisposition(d); setDirty(false); }} disabled={!dirty}
        style={{...btn, width:'100%', opacity:dirty?1:0.4}}>{dirty ? '✓ SAVE DISPOSITION' : 'SAVED'}</button>
    </CollapsibleSection>
  );
}

// ── Arc objectives: the authoritative record of a multi-part hunt ─────────────
function ObjectivesPanel({ arcObjectives, arcGoal, onSetArcGoal, onGenerateObjectives, onSetObjectives }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [adding, setAdding] = useState('');
  const objs = arcObjectives || [];
  const done = objs.filter(o => o.done).length;
  const liveIdx = objs.findIndex(o => !o.done);

  const regen = async () => {
    setBusy(true); setStatus('Building the campaign…');
    try { const list = await onGenerateObjectives(); setStatus(`✓ ${list.length} objectives`); }
    catch (e) { setStatus('✗ ' + e.message); }
    setBusy(false);
  };
  const toggle = (i) => onSetObjectives(objs.map((o, j) => j === i ? { ...o, done: !o.done } : o));
  const remove = (i) => onSetObjectives(objs.filter((_, j) => j !== i));
  const edit = (i, text) => onSetObjectives(objs.map((o, j) => j === i ? { ...o, text } : o));
  const add = () => { const t = adding.trim(); if (!t) return; onSetObjectives([...objs, { text: t, done: false }]); setAdding(''); };

  return (
    <CollapsibleSection title="🗺️ ARC OBJECTIVES" count={objs.length ? `${done}/${objs.length}` : undefined} defaultOpen={false}>
      <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
        One objective runs at a time; the DM writes the next when the last is finished. The GOAL holds the arc's endpoint and its count, so a long hunt can't lose track. The DM never announces any of this — look here when a story feels off the rails.
      </div>
      <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:2}}>GOAL</div>
      <textarea value={arcGoal || ''} onChange={e=>onSetArcGoal(e.target.value)} rows={2}
        placeholder="What finishing this arc means — include any count, e.g. 'recover all twelve vault objects'"
        style={{...npcInput, resize:'vertical', marginBottom:6, lineHeight:1.4}}/>
      {objs.length === 0 && <div style={{fontSize:12,color:colors.textDead,fontStyle:'italic',marginBottom:6}}>No objectives — generate a campaign for the current antagonist.</div>}
      {objs.map((o, i) => (
        <div key={i} style={{display:'flex',alignItems:'flex-start',gap:6,padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`,
          background: i === liveIdx ? 'rgba(201,168,76,0.06)' : 'transparent'}}>
          <input type="checkbox" checked={!!o.done} onChange={()=>toggle(i)} style={{accentColor:colors.gold,marginTop:3,flexShrink:0,cursor:'pointer'}}/>
          <textarea value={o.text} onChange={e=>edit(i, e.target.value)} rows={2}
            style={{...npcInput, flex:1, minWidth:0, resize:'vertical', fontSize:12, lineHeight:1.4,
              color:o.done?colors.textDead:colors.text, textDecoration:o.done?'line-through':'none'}}/>
          <button onClick={()=>remove(i)} title="Remove" style={{...btn, flexShrink:0, fontSize:10, padding:'2px 6px', color:'#c96a4c'}}>✕</button>
        </div>
      ))}
      <div style={{display:'flex',gap:4,marginTop:6}}>
        <input value={adding} onChange={e=>setAdding(e.target.value)} placeholder="Add an objective…"
          onKeyDown={e=>{ if (e.key==='Enter') add(); }} style={{...npcInput, flex:1}}/>
        <button onClick={add} style={{...btn, flexShrink:0}}>+</button>
      </div>
      <button onClick={regen} disabled={busy} style={{...btn, width:'100%', marginTop:6, opacity:busy?0.5:1}}>
        {busy ? '…' : (objs.length || arcGoal ? '🎲 REGENERATE ARC GOAL' : '🎲 GENERATE ARC GOAL')}
      </button>
      {status && <div style={{fontSize:12,color:status.startsWith('✗')?'#c96a4c':colors.goldFaint,marginTop:4,lineHeight:1.4}}>{status}</div>}
    </CollapsibleSection>
  );
}

// ── Standing instructions: always-sent DM directives (moved from the header) ──
function DirectivesEditor({ directives, onChangeDirectives }) {
  return (
    <CollapsibleSection title="📌 STANDING INSTRUCTIONS" defaultOpen={false}>
      <div style={{fontSize:10,color:colors.textFaint,marginBottom:6,lineHeight:1.4}}>Sent to the DM every turn — lasting directions that should not be forgotten. Leave blank for none.</div>
      <textarea
        value={directives}
        onChange={e => onChangeDirectives(e.target.value)}
        placeholder={'e.g. The current journey should play out as its own arc — give it encounters and events along the way, not a single skip.'}
        rows={4}
        style={{...npcInput, resize:'vertical', lineHeight:1.5}}
      />
    </CollapsibleSection>
  );
}

// ── Debug log viewer (moved from the header) ──────────────────────────────────
function DebugViewer({ debugLog, debugStatus, onExportDebug, onCopyDebug }) {
  return (
    <CollapsibleSection title="🐛 DEBUG LOG" count={debugLog?.length || 0} defaultOpen={false}>
      <div style={{fontFamily:'monospace',fontSize:9,color:'#7fc97f',maxHeight:220,overflowY:'auto'}}>
        {debugStatus && <div style={{color:'#c9a84c',marginBottom:4}}>{debugStatus}</div>}
        {(debugLog||[]).map((entry, i) => <div key={i} style={{borderBottom:'1px solid #1a1208',paddingBottom:2,marginBottom:2,wordBreak:'break-all'}}>{entry}</div>)}
        {(!debugLog || debugLog.length === 0) && <div style={{color:'#4a3a20'}}>no logs yet</div>}
      </div>
      {debugLog?.length > 0 && (onExportDebug || onCopyDebug) && (
        <div style={{display:'flex',gap:4,marginTop:6}}>
          {onCopyDebug && <button onClick={onCopyDebug} style={{...btn, flex:1, fontSize:10}}>⧉ Copy</button>}
          {onExportDebug && <button onClick={onExportDebug} style={{...btn, flex:1, fontSize:10}}>⬇ Download .txt</button>}
        </div>
      )}
    </CollapsibleSection>
  );
}

// ── Crafting: pick materials, ask what they could become, confirm, create ─────
function CraftingPanel({ character, db, onProposeCrafting, onExecuteCrafting }) {
  const [selected, setSelected] = useState({});   // { name: count }
  const [intent, setIntent]     = useState('');
  const [asSet, setAsSet]       = useState(false);
  const [busy, setBusy]         = useState(false);
  const [options, setOptions]   = useState(null);
  const [status, setStatus]     = useState('');
  const [filter, setFilter]     = useState('');
  const [showAll, setShowAll]   = useState(false);

  // Default to things that read as crafting stock, but categorisation is
  // keyword-based and imperfect — 'Carapace Plates' lands in armor, scale mail
  // you mean to melt down lands in worn. 'Show all' is the escape hatch so
  // nothing is ever unreachable because of a misfiled category.
  // Materials mostly live in the STASH, not carried inventory, so draw from
  // both. Track which source each stack came from — consumption has to remove
  // from the right list.
  const invCount = {}, stashCount = {}, bagCount = {}, bagWhere = {};
  (character.inventory || []).forEach(nm => { invCount[nm] = (invCount[nm] || 0) + 1; });
  (character.stash || []).forEach(nm => { stashCount[nm] = (stashCount[nm] || 0) + 1; });
  // Bags keep their contents in customItems[bag].contents, not the inventory
  // array — without this, anything packed away is invisible to the forge.
  ['customItems', 'stashedCustomItems'].forEach(store => {
    Object.entries(character[store] || {}).forEach(([bagName, d]) => {
      if (d?.type === 'bag' && d.contents) {
        Object.entries(d.contents).forEach(([item, ct]) => {
          if (ct > 0) { bagCount[item] = (bagCount[item] || 0) + ct; (bagWhere[item] = bagWhere[item] || []).push(bagName); }
        });
      }
    });
  });
  const allNames = [...new Set([...Object.keys(invCount), ...Object.keys(stashCount), ...Object.keys(bagCount)])];
  const stockData = (nm) => db[nm] || (character.stashedCustomItems || {})[nm];
  const isStock = (nm) => {
    if (stockData(nm)?.type === 'bag') return false;   // a bag is a container, not material
    const cat = categorizeItem(nm, stockData(nm));
    return cat === 'materials' || cat === 'misc' || cat === 'valuables';
  };  // constructs excluded — breaking one down should be a deliberate choice
  const q = filter.trim().toLowerCase();
  const hiddenCount = allNames.filter(nm => !isStock(nm)).length;
  const candidates = allNames
    .filter(nm => showAll || isStock(nm))
    .filter(nm => !q || nm.toLowerCase().includes(q))
    .sort((a, b) => a.localeCompare(b))
    .map(nm => [nm, (invCount[nm] || 0) + (stashCount[nm] || 0) + (bagCount[nm] || 0), {
      inv: invCount[nm] || 0,
      stash: stashCount[nm] || 0,
      bag: bagCount[nm] || 0,
      bags: bagWhere[nm] || [],
    }]);

  const toggle = (nm, max) => setSelected(prev => {
    const next = { ...prev };
    if (next[nm]) delete next[nm]; else next[nm] = max;
    return next;
  });
  // Keep the raw text while typing so deleting a digit doesn't instantly snap
  // back to 1; clamp only when the field loses focus.
  const [draft, setDraft] = useState({});
  const commitCount = (nm, max) => {
    const raw = draft[nm];
    if (raw === undefined) return;
    const parsed = parseInt(raw, 10);
    const v = Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(max, parsed));
    setSelected(prev => ({ ...prev, [nm]: v }));
    setDraft(prev => { const next = { ...prev }; delete next[nm]; return next; });
  };

  const propose = async () => {
    setBusy(true); setStatus('Consulting the forge…'); setOptions(null);
    try {
      // Send the full definition, not just the label — when upgrading, the model
      // needs to SEE the existing stats to preserve and exceed them.
      const mats = Object.entries(selected).map(([nm, count]) => ({ name: nm, count, data: stockData(nm) || null }));
      const opts = await onProposeCrafting({ materials: mats, intent, asSet });
      setOptions(opts); setStatus('');
    } catch (e) { setStatus('✗ ' + e.message); }
    setBusy(false);
  };

  const make = (opt) => {
    try {
      const made = onExecuteCrafting(opt);
      setStatus(`✓ Crafted ${made}`);
      setOptions(null); setSelected({}); setDraft({}); setIntent(''); setFilter('');
    } catch (e) { setStatus('✗ ' + e.message); }
  };

  const selCount = Object.keys(selected).length;
  return (
    <CollapsibleSection title="🔨 CRAFTING" count={selCount || undefined} defaultOpen={true}>
      <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
        Select materials, then ask what they could become. Nothing is consumed until you confirm.
      </div>

      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder={`Search ${candidates.length} ${showAll ? 'items' : 'materials'}…`}
        style={{...npcInput, marginBottom:4}}/>

      {hiddenCount > 0 && (
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:colors.textDim,marginBottom:6,cursor:'pointer'}}>
          <input type="checkbox" checked={showAll} onChange={()=>setShowAll(v=>!v)} style={{accentColor:colors.gold,flexShrink:0}}/>
          Show all inventory ({hiddenCount} hidden — categories are guesses, tick this if something's missing)
        </label>
      )}

      <div style={{maxHeight:340,overflowY:'auto',border:`1px solid ${colors.borderFaint}`,borderRadius:4,padding:4,marginBottom:6}}>
        {candidates.length === 0 && <div style={{fontSize:11,color:colors.textDead,fontStyle:'italic',padding:'4px 2px'}}>No materials in inventory.</div>}
        {candidates.map(([nm, max, src]) => {
          const on = selected[nm] !== undefined;
          return (
            <div key={nm} style={{display:'flex',alignItems:'center',gap:6,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
              <input type="checkbox" checked={on} onChange={()=>toggle(nm, max)} style={{accentColor:colors.gold,cursor:'pointer',flexShrink:0}}/>
              <span style={{flex:1,minWidth:0,fontSize:12,color:on?colors.text:colors.textDim,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {nm}
                {src.stash > 0 && <span style={{fontSize:9,color:colors.textGhost,marginLeft:4}} title="in stash">📦</span>}
                {src.bag > 0 && <span style={{fontSize:9,color:colors.textGhost,marginLeft:4}} title={`in ${src.bags.join(', ')}`}>👜</span>}
              </span>
              {max > 1 && (
                on
                  ? <input value={draft[nm] ?? selected[nm]}
                      onChange={e=>setDraft(prev=>({...prev,[nm]:e.target.value}))}
                      onBlur={()=>commitCount(nm, max)}
                      onKeyDown={e=>{ if (e.key === 'Enter') e.currentTarget.blur(); }}
                      inputMode="numeric"
                      style={{width:38,flexShrink:0,background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.gold,fontFamily:fonts.mono,fontSize:11,padding:'1px 4px',borderRadius:3,textAlign:'center',outline:'none'}}/>
                  : <span style={{fontSize:11,color:colors.goldFaint,fontFamily:fonts.mono,flexShrink:0}}>x{max}</span>
              )}
            </div>
          );
        })}
      </div>

      <input value={intent} onChange={e=>setIntent(e.target.value)} placeholder="What do you want made? (optional)"
        style={{...npcInput, marginBottom:4}}/>

      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:colors.textDim,marginBottom:6,cursor:'pointer'}}>
        <input type="checkbox" checked={asSet} onChange={()=>setAsSet(v=>!v)} style={{accentColor:colors.gold,flexShrink:0}}/>
        Forge a matched set (several pieces, different slots — costs more material)
      </label>

      <button onClick={propose} disabled={busy || selCount === 0}
        style={{...btn(false), width:'100%', opacity:(busy||selCount===0)?0.4:1}}>
        {busy ? '…' : `🔨 WHAT CAN I ${asSet ? 'FORGE AS A SET' : 'MAKE'}?${selCount ? ` (${selCount})` : ''}`}
      </button>
      {status && <div style={{fontSize:12,color:status.startsWith('✗')?'#c96a4c':colors.goldFaint,marginTop:6,lineHeight:1.4}}>{status}</div>}

      {options && options.map((o, i) => (
        <div key={i} style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:8,marginTop:6}}>
          <div style={{fontFamily:fonts.display,fontSize:13,color:colors.gold,marginBottom:2}}>
            {o.name}{o.pieces?.length ? <span style={{color:colors.textGhost,fontSize:10}}> · {o.pieces.length} pieces</span> : null}
          </div>
          {o.pieces?.length ? (
            o.pieces.map((pc, j) => (
              <div key={j} style={{borderLeft:`1px solid ${colors.borderDim}`,paddingLeft:6,marginBottom:4}}>
                <div style={{fontSize:12,color:colors.text}}>{pc.name}</div>
                <div style={{fontSize:10,color:colors.textGhost,lineHeight:1.4}}>
                  {pc.type}{pc.slot && pc.slot !== pc.type ? ` · ${pc.slot}` : ''}{pc.ac !== undefined && pc.ac !== '' ? ` · AC ${pc.ac}` : ''}{pc.damage ? ` · ${pc.damage}` : ''}{pc.bonuses ? ` · ${pc.bonuses}` : ''}
                </div>
                {pc.label && <div style={{fontSize:10,color:colors.textDim,lineHeight:1.4}}>{pc.label}</div>}
              </div>
            ))
          ) : (
            <>
              <div style={{fontSize:11,color:colors.textDim,marginBottom:4,lineHeight:1.4}}>{o.label}</div>
              <div style={{fontSize:10,color:colors.textGhost,marginBottom:4,lineHeight:1.4}}>
                {o.type}{o.slot ? ` · ${o.slot}` : ''}{o.damage ? ` · ${o.damage}` : ''}{o.bonuses ? ` · ${o.bonuses}` : ''}
              </div>
            </>
          )}
          <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
            Consumes: {(o.consumes||[]).map(m=>`${m.name}${m.count>1?` x${m.count}`:''}`).join(', ') || 'nothing'}
            {o.reason ? ` — ${o.reason}` : ''}
          </div>
          <button onClick={()=>make(o)} style={{...btn(true), width:'100%', fontSize:11, padding:'4px 0'}}>{o.pieces?.length ? '✓ FORGE THE SET' : '✓ FORGE THIS'}</button>
        </div>
      ))}
    </CollapsibleSection>
  );
}

// ── Salvage: break finished items back down into materials ───────────────────
function SalvagePanel({ character, db, onProposeDismantle, onExecuteDismantle }) {
  const [selected, setSelected] = useState({});
  const [busy, setBusy]         = useState(false);
  const [result, setResult]     = useState(null);
  const [status, setStatus]     = useState('');
  const [filter, setFilter]     = useState('');
  const [showAll, setShowAll]   = useState(false);

  const invCount = {}, stashCount = {};
  (character.inventory || []).forEach(nm => { invCount[nm] = (invCount[nm] || 0) + 1; });
  (character.stash || []).forEach(nm => { stashCount[nm] = (stashCount[nm] || 0) + 1; });
  const equipped = new Set(Object.values(character.slots || {}).filter(Boolean));
  const allNames = [...new Set([...Object.keys(invCount), ...Object.keys(stashCount)])];
  const stockData = (nm) => db[nm] || (character.stashedCustomItems || {})[nm];
  // Inverse of crafting: finished goods, not raw materials.
  const isSalvageable = (nm) => {
    const cat = categorizeItem(nm, stockData(nm));
    return ['weapons','worn','magic','tools','gear','ammo'].includes(cat);
  };
  const q = filter.trim().toLowerCase();
  const hiddenCount = allNames.filter(nm => !isSalvageable(nm) && !equipped.has(nm)).length;
  const candidates = allNames
    .filter(nm => !equipped.has(nm))                       // never offer worn gear
    .filter(nm => showAll || isSalvageable(nm))
    .filter(nm => !q || nm.toLowerCase().includes(q))
    .sort((a, b) => a.localeCompare(b))
    .map(nm => [nm, (invCount[nm] || 0) + (stashCount[nm] || 0), { stash: stashCount[nm] || 0, inv: invCount[nm] || 0 }]);

  const toggle = (nm, max) => setSelected(prev => {
    const next = { ...prev };
    if (next[nm]) delete next[nm]; else next[nm] = max;   // default to the whole stack
    return next;
  });
  // Raw text while typing, clamped on blur (see crafting panel).
  const [draft, setDraft] = useState({});
  const commitCount = (nm, max) => {
    const raw = draft[nm];
    if (raw === undefined) return;
    const parsed = parseInt(raw, 10);
    const v = Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(max, parsed));
    setSelected(prev => ({ ...prev, [nm]: v }));
    setDraft(prev => { const next = { ...prev }; delete next[nm]; return next; });
  };

  const submitted = () => Object.entries(selected).map(([name, count]) => ({ name, count }));

  const propose = async () => {
    setBusy(true); setStatus('Taking it apart…'); setResult(null);
    try {
      const r = await onProposeDismantle({ items: submitted() });
      setResult(r); setStatus('');
    } catch (e) { setStatus('✗ ' + e.message); }
    setBusy(false);
  };
  const confirm = () => {
    try {
      const got = onExecuteDismantle(result, submitted());
      setStatus(`✓ Recovered ${got}`);
      // Clear the search too: a filter matching the item just consumed would
      // leave the list looking empty until the panel is closed and reopened.
      setResult(null); setSelected({}); setDraft({}); setFilter('');
    } catch (e) { setStatus('✗ ' + e.message); }
  };

  const selCount = Object.keys(selected).length;
  return (
    <CollapsibleSection title="🔧 SALVAGE" count={selCount || undefined} defaultOpen={false}>
      <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
        Break made things down into materials — lossy, you never get everything back. Harvesting a corpse or unworked remains is NOT lossy: the full yield is there for the taking. Equipped gear is not listed.
      </div>

      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder={`Search ${candidates.length} items…`}
        style={{...npcInput, marginBottom:4}}/>

      {hiddenCount > 0 && (
        <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:colors.textDim,marginBottom:6,cursor:'pointer'}}>
          <input type="checkbox" checked={showAll} onChange={()=>setShowAll(v=>!v)} style={{accentColor:colors.gold,flexShrink:0}}/>
          Show all inventory ({hiddenCount} hidden)
        </label>
      )}

      <div style={{maxHeight:340,overflowY:'auto',border:`1px solid ${colors.borderFaint}`,borderRadius:4,padding:4,marginBottom:6}}>
        {candidates.length === 0 && <div style={{fontSize:11,color:colors.textDead,fontStyle:'italic',padding:'4px 2px'}}>Nothing to break down.</div>}
        {candidates.map(([nm, max, src]) => {
          const on = selected[nm] !== undefined;
          return (
            <div key={nm} style={{display:'flex',alignItems:'center',gap:6,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
              <input type="checkbox" checked={on} onChange={()=>toggle(nm, max)} style={{accentColor:colors.gold,cursor:'pointer',flexShrink:0}}/>
              <span style={{flex:1,minWidth:0,fontSize:12,color:on?colors.text:colors.textDim,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {nm}
                {src.stash > 0 && <span style={{fontSize:9,color:colors.textGhost,marginLeft:4}}>{src.inv > 0 ? '📦+🎒' : '📦'}</span>}
              </span>
              {max > 1 && (
                on
                  ? <input value={draft[nm] ?? selected[nm]}
                      onChange={e=>setDraft(prev=>({...prev,[nm]:e.target.value}))}
                      onBlur={()=>commitCount(nm, max)}
                      onKeyDown={e=>{ if (e.key === 'Enter') e.currentTarget.blur(); }}
                      inputMode="numeric"
                      style={{width:38,flexShrink:0,background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.gold,fontFamily:fonts.mono,fontSize:11,padding:'1px 4px',borderRadius:3,textAlign:'center',outline:'none'}}/>
                  : <span style={{fontSize:11,color:colors.goldFaint,fontFamily:fonts.mono,flexShrink:0}}>x{max}</span>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={propose} disabled={busy || selCount === 0}
        style={{...btn(false), width:'100%', opacity:(busy||selCount===0)?0.4:1}}>
        {busy ? '…' : `🔧 WHAT DO I GET BACK?${selCount ? ` (${selCount})` : ''}`}
      </button>
      {status && <div style={{fontSize:12,color:status.startsWith('✗')?'#c96a4c':colors.goldFaint,marginTop:6,lineHeight:1.4}}>{status}</div>}

      {result && (
        <div style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:8,marginTop:6}}>
          <div style={{fontFamily:fonts.display,fontSize:12,color:colors.gold,marginBottom:4}}>RECOVERS</div>
          {(result.recovers || []).length === 0
            ? <div style={{fontSize:11,color:colors.textDead,fontStyle:'italic',marginBottom:6}}>Nothing usable.</div>
            : <div style={{fontSize:12,color:colors.text,marginBottom:6,lineHeight:1.5}}>
                {result.recovers.map(r => `${r.name}${r.count > 1 ? ` x${r.count}` : ''}`).join(', ')}
              </div>}
          {result.note && <div style={{fontSize:10,color:colors.textGhost,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>{result.note}</div>}
          <div style={{fontSize:10,color:'#c96a4c',marginBottom:6,lineHeight:1.4}}>
            Destroys: {submitted().map(i => `${i.name}${i.count > 1 ? ` x${i.count}` : ''}`).join(', ')}
          </div>
          <button onClick={confirm} style={{...btn(true), width:'100%', fontSize:11, padding:'4px 0'}}>✓ BREAK IT DOWN</button>
        </div>
      )}
    </CollapsibleSection>
  );
}

// ── Bio editor: view/edit the player's backstory (the DM's behavior anchor) ────
function BioEditor({ character, onSaveBio }) {
  const [text, setText] = useState(character.bio || '');
  const [dirty, setDirty] = useState(false);
  return (
    <CollapsibleSection title="📖 BIO" defaultOpen={false}>
      <textarea value={text} rows={7}
        onChange={e=>{ setText(e.target.value); setDirty(true); }}
        placeholder="Backstory / bio — who this character is, how they act, what drives them. The DM reads this every message."
        style={{...npcInput, resize:'vertical', lineHeight:1.5, marginBottom:6}}/>
      <button onClick={()=>{ onSaveBio(text.trim()); setDirty(false); }} disabled={!dirty}
        style={{...btn, width:'100%', opacity:dirty?1:0.4}}>{dirty ? '✓ SAVE BIO' : 'SAVED'}</button>
    </CollapsibleSection>
  );
}

// ── Town Manager: extract-from-log + edit/add/delete for towns/locations ──────
const dictToLines = (d) => Object.entries(d || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
const linesToDict = (text) => {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim(); if (!line) continue;
    const i = line.indexOf(':');
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    else out[line] = '';
  }
  return out;
};
function TownManager({ character, onExtractTown, onSaveNPC, onDeleteNPC }) {
  const [exName, setExName] = useState('');
  const [exFrom, setExFrom] = useState('');
  const [exTo, setExTo]     = useState('');
  const [busy, setBusy]     = useState(false);
  const [exNote, setExNote] = useState('');
  const [status, setStatus] = useState('');
  const [editKey, setEditKey] = useState('');   // '' | 'new' | name
  const [tName, setTName]   = useState('');
  const [tDesc, setTDesc]   = useState('');
  const [tStatus, setTStatus] = useState('');
  const [tLocs, setTLocs]   = useState('');
  const [tRes, setTRes]     = useState('');

  const runExtract = async () => {
    const from = parseInt(exFrom, 10), to = parseInt(exTo, 10);
    if (Number.isNaN(from) || Number.isNaN(to)) { setStatus('✗ Enter the message # range'); return; }
    setBusy(true); setStatus('Extracting…');
    try {
      const { applied } = await onExtractTown({ name: exName, from, to, note: exNote });
      setStatus(applied.length ? `✓ Saved: ${applied.join(', ')}` : 'No locations found in that range');
      if (applied.length) { setExName(''); setExNote(''); }
    } catch (e) { setStatus('✗ ' + e.message); }
    setBusy(false);
  };

  const openEdit = (n) => {
    const e = character.towns?.[n] || {};
    setEditKey(n); setTName(n); setTDesc(e.desc || ''); setTStatus(e.status || '');
    setTLocs(dictToLines(e.notable_locations)); setTRes(dictToLines(e.minor_residents));
  };
  const openNew = () => { setEditKey('new'); setTName(''); setTDesc(''); setTStatus(''); setTLocs(''); setTRes(''); };
  const saveEdit = () => {
    const finalName = tName.trim();
    if (!finalName) { setStatus('✗ Name required'); return; }
    const isNew = editKey === 'new';
    const entry = { ...((!isNew && character.towns?.[editKey]) || {}) };
    const put = (k, v) => { const t = v.trim(); if (t) entry[k] = t; else delete entry[k]; };
    put('desc', tDesc); put('status', tStatus);
    const locs = linesToDict(tLocs), res = linesToDict(tRes);
    if (Object.keys(locs).length) entry.notable_locations = locs; else delete entry.notable_locations;
    if (Object.keys(res).length) entry.minor_residents = res; else delete entry.minor_residents;
    onSaveNPC('towns', finalName, entry, !isNew ? editKey : null);
    setStatus(`✓ Saved ${finalName}`); setEditKey('');
  };
  const deleteEdit = () => {
    if (editKey === 'new') { setEditKey(''); return; }
    onDeleteNPC('towns', editKey); setStatus(`✓ Deleted ${editKey}`); setEditKey('');
  };

  const townNames = Object.keys(character.towns || {});
  return (
    <CollapsibleSection title="🏘️ TOWN MANAGER" count={townNames.length} defaultOpen={false}>
      <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,margin:'4px 0 4px'}}>EXTRACT FROM LOG</div>
      <input value={exName} onChange={e=>setExName(e.target.value)} placeholder="Town name (blank = find all significant)" style={{...npcInput, marginBottom:4}}/>
      <div style={{display:'flex', gap:4, marginBottom:6}}>
        <input value={exFrom} onChange={e=>setExFrom(e.target.value)} placeholder="From #" inputMode="numeric" style={{...npcInput, flex:1}}/>
        <input value={exTo} onChange={e=>setExTo(e.target.value)} placeholder="To #" inputMode="numeric" style={{...npcInput, flex:1}}/>
      </div>
      <input value={exNote} onChange={e=>setExNote(e.target.value)}
        placeholder="What changed? (optional)"
        style={{...npcInput, marginBottom:6}}/>
      <button onClick={runExtract} disabled={busy} style={{...btn, width:'100%', opacity:busy?0.5:1}}>{busy ? '…' : '📥 EXTRACT'}</button>
      {status && <div style={{fontSize:12,color:status.startsWith('✗')?'#c96a4c':colors.goldFaint,marginTop:4,lineHeight:1.4}}>{status}</div>}

      <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,margin:'10px 0 4px'}}>EDIT ENTRIES</div>
      <div style={{display:'flex',gap:4,marginBottom:4}}>
        <select value={editKey !== 'new' ? editKey : ''} onChange={e=>{ if (e.target.value) openEdit(e.target.value); }} style={{...npcInput, flex:1}}>
          <option value="">Select a town to edit…</option>
          {townNames.map(n=><option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={openNew} style={{...btn, flexShrink:0}}>+ New</button>
      </div>

      {editKey && (
        <div style={{border:`1px solid ${colors.borderDim}`, borderRadius:4, padding:8, marginTop:2}}>
          <input value={tName} onChange={e=>setTName(e.target.value)} placeholder="Town name" style={{...npcInput, marginBottom:4}}/>
          <input value={tStatus} onChange={e=>setTStatus(e.target.value)} placeholder="Status (e.g. established base, hostile)" style={{...npcInput, marginBottom:4}}/>
          <textarea value={tDesc} onChange={e=>setTDesc(e.target.value)} placeholder="Description — what this place is" rows={3} style={{...npcInput, resize:'vertical', marginBottom:4}}/>
          <textarea value={tLocs} onChange={e=>setTLocs(e.target.value)} placeholder={"Notable locations, one per line:\nGilded Peacock: high-end inn, Garden District"} rows={4} style={{...npcInput, resize:'vertical', marginBottom:4}}/>
          <textarea value={tRes} onChange={e=>setTRes(e.target.value)} placeholder={"Minor residents, one per line:\nJhasso: nervous spice merchant, owes a favor"} rows={4} style={{...npcInput, resize:'vertical', marginBottom:6}}/>
          <div style={{fontSize:10,color:colors.textGhost,marginBottom:6,lineHeight:1.4}}>Full detail is sent to the DM only while the location tag matches this town — otherwise just name, description and status.</div>
          <div style={{display:'flex',gap:4}}>
            <button onClick={saveEdit} style={{...btn, flex:1}}>✓ SAVE</button>
            {editKey !== 'new' && <button onClick={deleteEdit} style={{...btn, flex:1, color:'#c96a4c', borderColor:'#5a2a1a'}}>✕ DELETE</button>}
            <button onClick={closeEditTown(setEditKey)} style={{...btn, flexShrink:0}}>CANCEL</button>
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
const closeEditTown = (set) => () => set('');

// ── NPC Manager: extract-from-log + edit/add/delete for npcs & companions ──────
const npcInput = { width:'100%', boxSizing:'border-box', background:'rgba(0,0,0,0.4)', border:`1px solid ${colors.borderDim}`, color:colors.text, fontFamily:fonts.body, fontSize:13, padding:'6px 8px', borderRadius:4, outline:'none' };
function NPCManager({ character, onExtractNPC, onSaveNPC, onDeleteNPC }) {
  const [exName, setExName] = useState('');
  const [exFrom, setExFrom] = useState('');
  const [exTo, setExTo]     = useState('');
  const [exComp, setExComp] = useState(false);
  const [exNote, setExNote] = useState('');
  const [busy, setBusy]     = useState(false);
  const [status, setStatus] = useState('');
  const [editKey, setEditKey] = useState('');   // '' | 'new' | 'group|name'
  const [eGroup, setEGroup] = useState('npcs');
  const [eName, setEName]   = useState('');
  const [eLoc, setELoc]     = useState('');
  const [eRel, setERel]     = useState('');
  const [eDesc, setEDesc]   = useState('');
  const [eNotes, setENotes] = useState('');
  // companion-only structured fields (prompt uses these when desc is empty)
  const [eRace, setERace]   = useState('');
  const [eRole, setERole]   = useState('');
  const [eApp, setEApp]     = useState('');
  const [ePers, setEPers]   = useState('');
  const [eStatus, setEStatus] = useState('');
  const [eTrue, setETrue]   = useState('');
  const [eAbil, setEAbil]   = useState('');

  const runExtract = async () => {
    const from = parseInt(exFrom, 10), to = parseInt(exTo, 10);
    if (Number.isNaN(from) || Number.isNaN(to)) { setStatus('✗ Enter the message # range (numbers next to messages)'); return; }
    setBusy(true); setStatus('Extracting… (reads those messages via a separate AI call)');
    try {
      const { applied } = await onExtractNPC({ name: exName, from, to, asCompanion: exComp, note: exNote });
      setStatus(applied.length ? `✓ Saved: ${applied.join(', ')}` : 'No one found in that range');
      if (applied.length) { setExName(''); setExNote(''); }
    } catch (e) { setStatus('✗ ' + e.message); }
    setBusy(false);
  };

  const openEdit = (group, n) => {
    const e = character[group]?.[n] || {};
    setEditKey(group + '|' + n); setEGroup(group); setEName(n);
    setELoc(e.location || ''); setERel(e.relationship || ''); setEDesc(e.desc || '');
    setENotes(e.notes || ''); setERace(e.race || ''); setERole(e.role || '');
    setEApp(e.appearance || ''); setEPers(e.personality || ''); setEStatus(e.status || '');
    setETrue(e.trueName || '');
    setEAbil(Array.isArray(e.abilities) ? e.abilities.join(', ') : (e.abilities || ''));
  };
  const openNew = () => {
    setEditKey('new'); setEGroup('npcs'); setEName(''); setELoc(''); setERel(''); setEDesc('');
    setENotes(''); setERace(''); setERole(''); setEApp(''); setEPers(''); setEStatus(''); setETrue(''); setEAbil('');
  };
  const closeEdit = () => setEditKey('');
  const saveEdit = () => {
    const finalName = eName.trim();
    if (!finalName) { setStatus('✗ Name required'); return; }
    const isNew = editKey === 'new';
    const [origGroup, origName] = isNew ? [eGroup, null] : editKey.split('|');
    // Carry ALL original fields (slots, tier, anything unknown) even across a
    // group move, so promoting an NPC to companion never drops data.
    const entry = { ...((!isNew && character[origGroup]?.[origName]) || {}) };
    // Set-or-remove: an emptied field is deleted, not silently kept.
    const put = (key, val) => { const v = val.trim(); if (v) entry[key] = v; else delete entry[key]; };
    put('location', eLoc); put('relationship', eRel); put('desc', eDesc); put('notes', eNotes);
    put('race', eRace); put('role', eRole); put('appearance', eApp);
    put('personality', ePers); put('status', eStatus); put('trueName', eTrue); put('abilities', eAbil);
    if (!isNew && origGroup !== eGroup) onDeleteNPC(origGroup, origName);
    onSaveNPC(eGroup, finalName, entry, (!isNew && origGroup === eGroup) ? origName : null);
    setStatus(`✓ Saved ${finalName}`); setEditKey('');
  };
  const deleteEdit = () => {
    if (editKey === 'new') { setEditKey(''); return; }
    const [g, n] = editKey.split('|');
    onDeleteNPC(g, n); setStatus(`✓ Deleted ${n}`); setEditKey('');
  };

  const npcNames  = Object.keys(character.npcs || {});
  const compNames = Object.keys(character.companions || {});

  return (
    <CollapsibleSection title="📇 NPC MANAGER" count={npcNames.length + compNames.length} defaultOpen={false}>
      {/* Extract from log */}
      <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,margin:'4px 0 4px'}}>EXTRACT FROM LOG</div>
      <input value={exName} onChange={e=>setExName(e.target.value)} placeholder="Name (blank = find everyone significant)" style={{...npcInput, marginBottom:4}}/>
      <div style={{display:'flex', gap:4, marginBottom:4}}>
        <input value={exFrom} onChange={e=>setExFrom(e.target.value)} placeholder="From #" inputMode="numeric" style={{...npcInput, flex:1}}/>
        <input value={exTo} onChange={e=>setExTo(e.target.value)} placeholder="To #" inputMode="numeric" style={{...npcInput, flex:1}}/>
      </div>
      <input value={exNote} onChange={e=>setExNote(e.target.value)}
        placeholder="What changed? (optional — e.g. 'she married Grimjaw')"
        style={{...npcInput, marginBottom:4}}/>
      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:colors.textDim,marginBottom:6,cursor:'pointer'}}>
        <input type="checkbox" checked={exComp} onChange={()=>setExComp(v=>!v)} style={{accentColor:colors.gold}}/>
        Save as companion
      </label>
      <button onClick={runExtract} disabled={busy} style={{...btn, width:'100%', opacity:busy?0.5:1}}>{busy ? '…' : '📥 EXTRACT'}</button>
      {status && <div style={{fontSize:12,color:status.startsWith('✗')?'#c96a4c':colors.goldFaint,marginTop:4,lineHeight:1.4}}>{status}</div>}

      {/* Edit / add */}
      <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,margin:'10px 0 4px'}}>EDIT ENTRIES</div>
      <div style={{display:'flex',gap:4,marginBottom:4}}>
        <select value={editKey.includes('|') ? editKey : ''} onChange={e=>{ const v=e.target.value; if (v) { const [g,n]=v.split('|'); openEdit(g,n);} }} style={{...npcInput, flex:1}}>
          <option value="">Select an entry to edit…</option>
          {npcNames.length > 0 && <optgroup label="NPCs">{npcNames.map(n=><option key={'n'+n} value={'npcs|'+n}>{n}</option>)}</optgroup>}
          {compNames.length > 0 && <optgroup label="Companions">{compNames.map(n=><option key={'c'+n} value={'companions|'+n}>{n}</option>)}</optgroup>}
        </select>
        <button onClick={openNew} style={{...btn, flexShrink:0}}>+ New</button>
      </div>

      {editKey && (
        <div style={{border:`1px solid ${colors.borderDim}`, borderRadius:4, padding:8, marginTop:2}}>
          <input value={eName} onChange={e=>setEName(e.target.value)} placeholder="Name" style={{...npcInput, marginBottom:4}}/>
          <div style={{display:'flex',gap:8,marginBottom:4,fontSize:12,color:colors.textDim}}>
            <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
              <input type="radio" checked={eGroup==='npcs'} onChange={()=>setEGroup('npcs')} style={{accentColor:colors.gold}}/> NPC
            </label>
            <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
              <input type="radio" checked={eGroup==='companions'} onChange={()=>setEGroup('companions')} style={{accentColor:colors.gold}}/> Companion
            </label>
          </div>
          <input value={eLoc} onChange={e=>setELoc(e.target.value)} placeholder="Location (e.g. Calimport - Gem Quarter)" style={{...npcInput, marginBottom:4}}/>
          <input value={eRel} onChange={e=>setERel(e.target.value)} placeholder="Relationship to the player" style={{...npcInput, marginBottom:4}}/>
          {eGroup === 'companions' && (
            <>
              <div style={{display:'flex',gap:4,marginBottom:4}}>
                <input value={eRace} onChange={e=>setERace(e.target.value)} placeholder="Race" style={{...npcInput, flex:1}}/>
                <input value={eRole} onChange={e=>setERole(e.target.value)} placeholder="Role" style={{...npcInput, flex:1}}/>
              </div>
              <input value={eApp} onChange={e=>setEApp(e.target.value)} placeholder="Appearance" style={{...npcInput, marginBottom:4}}/>
              <input value={ePers} onChange={e=>setEPers(e.target.value)} placeholder="Personality" style={{...npcInput, marginBottom:4}}/>
              <input value={eStatus} onChange={e=>setEStatus(e.target.value)} placeholder="Status (current state / condition)" style={{...npcInput, marginBottom:4}}/>
              <input value={eTrue} onChange={e=>setETrue(e.target.value)} placeholder="True name (if any)" style={{...npcInput, marginBottom:4}}/>
              <input value={eAbil} onChange={e=>setEAbil(e.target.value)} placeholder="Abilities (comma-separated)" style={{...npcInput, marginBottom:4}}/>
            </>
          )}
          <textarea value={eDesc} onChange={e=>setEDesc(e.target.value)} placeholder="Description — appearance, personality, notable facts" rows={4} style={{...npcInput, resize:'vertical', marginBottom:2}}/>
          {eGroup === 'companions' && (
            <div style={{fontSize:10,color:colors.textGhost,marginBottom:4,lineHeight:1.4}}>If Description is filled, the AI uses it INSTEAD of the Race/Role/Appearance/Personality/Status fields above. Use one or the other.</div>
          )}
          <textarea value={eNotes} onChange={e=>setENotes(e.target.value)} placeholder="Notes (always sent alongside, e.g. behavior rules)" rows={2} style={{...npcInput, resize:'vertical', marginBottom:6}}/>
          <div style={{display:'flex',gap:4}}>
            <button onClick={saveEdit} style={{...btn, flex:1}}>✓ SAVE</button>
            {editKey !== 'new' && <button onClick={deleteEdit} style={{...btn, flex:1, color:'#c96a4c', borderColor:'#5a2a1a'}}>✕ DELETE</button>}
            <button onClick={closeEdit} style={{...btn, flexShrink:0}}>CANCEL</button>
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}

const slotItemLabel = (name, data) => {
  if (!data) return name;
  if (data.type === 'weapon') return `${name} (${data.damage}${data.bonus?`+${data.bonus}`:''})`;
  if (data.type === 'armor')  return `${name} (AC ${data.ac})`;
  if (data.type === 'shield') return `${name} (+${data.ac||2}AC)`;
  if (data.type === 'focus')  return `${name} [${data.label}]`;
  if (data.label)             return `${name} [${data.label}]`;
  return name;
};

// Companion equipment slots — interactive, mirroring the player's slot list.
// Tap an empty slot to open the item picker; tap the ✕ to return gear to inventory.
function CompanionSlots({ companion, name, db, character, onSlotClick, onUnequip }) {
  const slots = companion.slots || {};
  const slotDefs = companion.type === 'wolf'
    ? [{ id:'neck', label:'Collar', emoji:'📿' }, { id:'armor', label:'Barding', emoji:'🥋' }]
    : SLOTS;
  return (
    <div style={{marginTop:4,paddingLeft:6,borderLeft:`1px solid ${colors.borderFaint}`}}>
      {slotDefs.map(slot => {
        const itemName = slots[slot.id];
        const data     = itemName ? db[itemName] : null;
        const canEquip = !itemName && character && equippableInSlot(character, slot.id).length > 0;
        const active   = itemName || canEquip;
        return (
          <div key={slot.id}
            onClick={() => active && onSlotClick?.(name, slot.id)}
            style={{display:'flex',alignItems:'center',gap:5,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`,cursor:active?'pointer':'default',opacity:active?1:0.4}}>
            <span style={{fontSize:11,flexShrink:0}}>{slot.emoji}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:colors.textGhost,fontFamily:fonts.display}}>{slot.label}</div>
              {itemName
                ? <div style={{fontSize:12,color:colors.gold,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{slotItemLabel(itemName, data)}</div>
                : <div style={{fontSize:12,color:colors.textDead,fontStyle:'italic'}}>{canEquip?'tap to equip':'—'}</div>
              }
            </div>
            {itemName && (
              <span onClick={(e)=>{ e.stopPropagation(); onUnequip?.(name, slot.id); }}
                style={{fontSize:12,color:colors.textDead,flexShrink:0,cursor:'pointer',padding:'0 4px'}} title="Unequip">✕</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────────────────────
export function Sidebar({ character, onSlotClick, onCompanionSlotClick, onCompanionUnequip, onSaveClick, onClose, onAbilitiesClick, onMoveToStash, onMoveToInventory, onCreateBag, onAddToBag, onRemoveFromBag, onDeleteItem, onDeleteFromBag, selectedModel, onToggleModel, pacing, onTogglePacing, environment, onChangeEnvironment, arcAntagonist, onClearArc, onRollArc, onSetArc, onToggleContextExclusion, onExtractNPC, onExtractTown, onSaveNPC, onDeleteNPC, onSaveBio, arcObjectives, arcGoal, onSetArcGoal, onGenerateObjectives, onSetObjectives, disposition, onSaveDisposition, defeatedAntagonists, onReviveAntagonist, onCycleConstructStatus, onProposeCrafting, onExecuteCrafting, onProposeDismantle, onExecuteDismantle, voiceSettings, showRawTags, onToggleRawTags, debugLog, debugStatus, onExportDebug, onCopyDebug, directives, onChangeDirectives }) {
  const db       = allItems(character.customItems || {});
  const [activeTab, setActiveTab] = useState('character');
  const [stashFilter, setStashFilter] = useState('');
  const [arcCustomOpen, setArcCustomOpen] = useState(false);
  const [arcCustomText, setArcCustomText] = useState('');
  const effStats = character.stats.dex ? effectiveStats(character.stats, character.slots, character.customItems||{}) : character.stats;
  const gearSkills = skillBonuses(character.slots, character.customItems || {});
  const ac       = character.stats.dex ? calcAC(character.slots, character.stats, character.customItems||{}) : '—';
  const weapon   = character.stats.dex ? getMainWeapon(character.slots, character.stats, character.customItems||{}) : null;
  const pb       = profBonus(character.level);

  // Bag creation state
  const [bagMode, setBagMode] = useState(false);       // are we in bag creation mode?
  const [bagSelected, setBagSelected] = useState({});  // { itemName: count }
  const [bagName, setBagName] = useState('');
  const [addingToBag, setAddingToBag] = useState(null); // bag name we're adding to
  const [expandedBags, setExpandedBags] = useState({});  // { bagName: true } — show contents
  const [expandedLabels, setExpandedLabels] = useState({}); // { itemName: true } — show full label

  // Select or deselect ALL copies of an item at once (fixes 100-click problem)
  const toggleBagItemAll = (itemName, maxCount) => {
    setBagSelected(prev => {
      const next = { ...prev };
      if (next[itemName] >= maxCount) delete next[itemName];
      else next[itemName] = maxCount;
      return next;
    });
  };

  const iconBtn = {background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textDead,fontSize:9,padding:'1px 4px',borderRadius:2,cursor:'pointer',flexShrink:0,lineHeight:1.4};
  const delBtn = {background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.redFaint||'#8a3a3a',fontSize:9,padding:'1px 4px',borderRadius:2,cursor:'pointer',flexShrink:0,lineHeight:1.4};

  const existingBags = Object.entries(character.customItems || {})
    .filter(([, v]) => v.type === 'bag')
    .map(([name]) => name);

  const toggleBagItem = (itemName) => {
    setBagSelected(prev => {
      const current = prev[itemName] || 0;
      const max = character.inventory.filter(i => i === itemName).length;
      if (current >= max) {
        const next = { ...prev };
        delete next[itemName];
        return next;
      }
      return { ...prev, [itemName]: current + 1 };
    });
  };

  const confirmBag = () => {
    const items = Object.entries(bagSelected).flatMap(([name, count]) => Array(count).fill(name));
    if (addingToBag) {
      onAddToBag?.(addingToBag, items);
    } else {
      if (!bagName.trim()) return;
      onCreateBag?.(bagName.trim(), items);
    }
    setBagMode(false);
    setBagSelected({});
    setBagName('');
    setAddingToBag(null);
  };

  const startAddToBag = (name) => {
    setAddingToBag(name);
    setBagMode(true);
    setBagSelected({});
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const sidebarStyle = {
    width: isMobile ? '100vw' : 285, flexShrink:0,
    height:'100vh',
    background:'rgba(10,7,3,0.97)',
    borderRight:`1px solid ${colors.border}`,
    overflowY:'auto',
    overflowX:'hidden',
    display:'flex', flexDirection:'column', gap:10, padding:12,
    boxSizing:'border-box',
  };

  const sectionLabel = (text) => (
    <div style={{fontFamily:fonts.display,fontSize:13,color:colors.textGhost,letterSpacing:3,marginBottom:4}}>{text}</div>
  );

  const statBox = (label, value) => (
    <div style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:'5px 6px',textAlign:'center'}}>
      <div style={{fontFamily:fonts.display,fontSize:12,color:colors.goldFaint,letterSpacing:2}}>{label}</div>
      <div style={{fontFamily:fonts.mono,fontSize:18,color:colors.gold,fontWeight:'bold'}}>{value}</div>
    </div>
  );

  // Categorize inventory
  const stacked = stackInventory(character.inventory);
  const categorized = {};
  Object.entries(stacked).forEach(([name, count]) => {
    const cat = categorizeItem(name, db[name]);
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push({ name, count });
  });

  return (
    <div style={sidebarStyle}>

      {/* Mobile close button */}
      {onClose && (
        <button onClick={onClose} style={{width:'100%',background:'rgba(201,168,76,0.08)',border:`1px solid ${colors.border}`,color:colors.gold,padding:'12px 0',fontSize:16,fontFamily:fonts.display,letterSpacing:2,borderRadius:4,cursor:'pointer'}}>
          ✕  CLOSE
        </button>
      )}

      {/* Tab bar */}
      <div style={{display:'flex',gap:6,marginBottom:4}}>
        {[
          ['character', '🎲 CHARACTER'],
          ['crafting',  '🔨 CRAFTING'],
          ['settings',  '⚙️ SETTINGS'],
        ].map(([id, label]) => (
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{flex:1,background:activeTab===id?'rgba(201,168,76,0.15)':'transparent',border:`1px solid ${activeTab===id?colors.gold:colors.borderDim}`,color:activeTab===id?colors.gold:colors.textFaint,padding:'8px 2px',fontSize:10,fontFamily:fonts.display,letterSpacing:0.5,borderRadius:3,cursor:'pointer',whiteSpace:'nowrap'}}>
            {label}
          </button>
        ))}
      </div>

      {activeTab==='settings' && <>
      {/* Save button */}
      <button onClick={onSaveClick} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0'}}>
        💾 Save / Load
      </button>
      </>}

      {activeTab==='character' && <>
      {/* Abilities button */}
      {onAbilitiesClick && (
        <button onClick={onAbilitiesClick} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0'}}>
          📚 Manage Abilities
        </button>
      )}
      </>}

      {activeTab==='settings' && <>
      {/* Model toggle */}
      {onToggleModel && (
        <button onClick={onToggleModel} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',borderColor:selectedModel==='sonnet'?colors.gold:colors.border}}>
          {selectedModel==='sonnet' ? '✨ DM: Sonnet' : '⚡ DM: Haiku'}
        </button>
      )}

      {voiceSettings && <VoiceSettings {...voiceSettings} />}

      {/* Pacing knob — how often the world pushes back */}
      {onTogglePacing && (
        <button onClick={onTogglePacing} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',marginTop:6,opacity:pacing==='off'?0.6:1,borderColor:pacing==='dangerous'?colors.red:pacing==='normal'?colors.gold:colors.border}}>
          {PACING[pacing]?.label || PACING.normal.label}
        </button>
      )}

      {onChangeEnvironment && (
        <select value={environment || 'wilderness'} onChange={e=>onChangeEnvironment(e.target.value)}
          title="Where you are — encounters match your surroundings"
          style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:13,padding:'7px 8px',borderRadius:4,outline:'none',marginTop:6,cursor:'pointer'}}>
          {ENVIRONMENTS.map(env => <option key={env.id} value={env.id}>📍 {env.label}</option>)}
        </select>
      )}

      {/* Story arc — the hidden antagonist all foreshadowing builds toward */}
      {onClearArc && (
        <div style={{marginTop:6,padding:'7px 9px',background:'rgba(0,0,0,0.25)',border:`1px solid ${colors.borderDim}`,borderRadius:3}}>
          <div style={{fontSize:10,color:colors.textGhost,letterSpacing:0.5,marginBottom:3}}>STORY ARC</div>
          <div style={{fontSize:12,color:arcAntagonist?colors.textDim:colors.textFaint,fontStyle:'italic',marginBottom:6,lineHeight:1.35}}>
            {arcAntagonist ? 'A hidden antagonist is in play.' : 'Open — no antagonist. The story drifts where you take it.'}
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={onRollArc} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>🎲 {arcAntagonist?'Reroll':'Roll'}</button>
            <button onClick={()=>setArcCustomOpen(v=>!v)} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>✎ Custom</button>
            {arcAntagonist && <button onClick={onClearArc} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>✕ Clear</button>}
          </div>
          {arcCustomOpen && (
            <div style={{marginTop:6}}>
              <input value={arcCustomText} onChange={e=>setArcCustomText(e.target.value)}
                placeholder="e.g. a rival dhampir elder and her brood"
                style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:12,padding:'5px 8px',borderRadius:4,outline:'none',marginBottom:4}}/>
              <div style={{fontSize:10,color:colors.textGhost,marginBottom:4,lineHeight:1.35}}>Write it as a noun phrase — it fills sentences like "scouts of ___ attack".</div>
              <button onClick={()=>{ const t=arcCustomText.trim(); if(t){ onSetArc?.(t); setArcCustomText(''); setArcCustomOpen(false);} }}
                style={{...btn(false),width:'100%',fontSize:11,padding:'4px 0'}}>✓ SET ANTAGONIST</button>
            </div>
          )}
        </div>
      )}

      {onReviveAntagonist && (defeatedAntagonists?.length > 0) && (
        <CollapsibleSection title="⚰️ DEFEATED FOES" count={defeatedAntagonists.length} defaultOpen={false}>
          <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
            Arcs you've finished. These are never rolled as a new antagonist again — remove one to let it return.
          </div>
          {defeatedAntagonists.map(name => (
            <div key={name} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
              <span style={{flex:1,minWidth:0,fontSize:12,color:colors.textDim,lineHeight:1.4}}>{name}</span>
              <button title="Let this foe return — makes it rollable again"
                onClick={()=>onReviveAntagonist(name)}
                style={{...btn(false),flexShrink:0,fontSize:10,padding:'2px 6px'}}>↺</button>
            </div>
          ))}
        </CollapsibleSection>
      )}
      </>}

      {activeTab==='character' && <>
      {/* Identity */}
      <div>
        {sectionLabel('ADVENTURER')}
        <div style={{fontSize:20,marginBottom:2}}>{character.cls?.emoji}</div>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13}}>{character.name}</div>
        <div style={{fontSize:12,color:colors.textFaint}}>
          {character.race?.name} · Lv {character.level}
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>
          {Object.entries(character.classLevels || { [character.cls?.name]: character.level }).map(([cls, lvl]) => (
            <div key={cls} style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:3,padding:'2px 6px',fontSize:13,color:colors.textFaint,fontFamily:fonts.display}}>
              {cls} {lvl}
            </div>
          ))}
        </div>
      </div>

      <HPBar current={character.hp} max={effectiveMaxHp(character)}/>
      {gearHpBonus(character) !== 0 && (
        <div style={{fontSize:9,color:colors.textGhost,textAlign:'right',marginTop:-2}}>
          includes {gearHpBonus(character) > 0 ? '+' : ''}{gearHpBonus(character)} from gear CON
        </div>
      )}
      <XPBar xp={character.xp||0} level={character.level}/>

      {/* Combat stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
        {statBox('ARMOR CLASS', ac)}
        {statBox('PROF BONUS', `+${pb}`)}
      </div>

      {/* Active weapon */}
      {weapon && (
        <div style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:4,padding:'6px 8px'}}>
          {sectionLabel('WEAPON')}
          <div style={{fontSize:13,color:colors.gold,fontFamily:fonts.display}}>{weapon.name}</div>
          <div style={{fontSize:12,color:colors.textFaint}}>
            Dmg: {weapon.damage}{weapon.bonus?`+${weapon.bonus}`:''} {weapon.statBonus>=0?`+ ${weapon.statBonus}`:`- ${Math.abs(weapon.statBonus)}`} · Atk: +{weapon.statBonus+pb+(weapon.bonus||0)}
            {(weapon.extras||[]).map((e,i) => (
              <span key={i} style={{color:colors.goldFaint}}> + {e.dice} {e.type}</span>
            ))}
          </div>
          {weapon.finesse && <div style={{fontSize:12,color:colors.textDead}}>finesse · using DEX</div>}
        </div>
      )}

      {/* Stats */}
      <div>
        {sectionLabel('STATS')}
        {Object.entries(effStats).map(([k,v]) => (
          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
            <span style={{fontSize:12,color:colors.textFaint}}>{STAT_NAMES[k]}</span>
            <span style={{fontFamily:fonts.mono,fontSize:13,color:v>=15?colors.gold:colors.text,fontWeight:'bold'}}>
              {v} <span style={{color:colors.textDead,fontSize:12}}>({modStr(v)})</span>
            </span>
          </div>
        ))}
      </div>

      {/* Skills — all 18, with any gear bonus folded in */}
      {character.stats.dex && (
        <CollapsibleSection
          title="SKILLS"
          count={Object.keys(gearSkills).length || undefined}
          defaultOpen={false}
        >
          {SKILL_LIST.map(({ key, label, ability }) => {
            // gear may name a skill by an alias (sleight vs sleightofhand)
            const gear = Object.entries(gearSkills)
              .filter(([g]) => g.toLowerCase() === key || SKILL_ABILITY[g.toLowerCase()] === ability && g.toLowerCase().replace(/\s+/g,'') === key)
              .reduce((sum, [, v]) => sum + v, 0);
            const aMod  = statMod(effStats[ability]);
            const total = aMod + pb + gear;
            return (
              <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
                <span style={{fontSize:12,color:gear?colors.text:colors.textFaint}}>
                  {label}
                  <span style={{color:colors.textGhost,fontSize:10}}> {ability.toUpperCase()}</span>
                </span>
                <span style={{fontFamily:fonts.mono,fontSize:13,color:gear?colors.gold:colors.text,fontWeight:gear?'bold':'normal'}}>
                  {total >= 0 ? `+${total}` : total}
                  {gear > 0 && <span style={{color:colors.textDead,fontSize:11}}> (+{gear} gear)</span>}
                </span>
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      {/* Gold */}
      <div>
        {sectionLabel('GOLD')}
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13}}>⚜ {coinsToString(character.coins)}</div>
      </div>

      {/* Equipment slots */}
      <CollapsibleSection title="EQUIPMENT" count={Object.values(character.slots).filter(Boolean).length} defaultOpen={false}>
        {SLOTS.map(slot => {
          const itemName = character.slots[slot.id];
          const data     = itemName ? db[itemName] : null;
          const label    = itemName ? slotItemLabel(itemName, data) : null;
          const canEquip = !itemName && equippableInSlot(character, slot.id).length > 0;
          return (
            <div key={slot.id} onClick={() => onSlotClick(slot.id)}
              style={{display:'flex',alignItems:'center',gap:5,padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`,cursor:itemName||canEquip?'pointer':'default',opacity:itemName||canEquip?1:0.4}}>
              <span style={{fontSize:13,flexShrink:0}}>{slot.emoji}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,color:colors.textGhost,fontFamily:fonts.display}}>{slot.label}</div>
                {itemName
                  ? <div style={{fontSize:12,color:colors.gold,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</div>
                  : <div style={{fontSize:13,color:colors.textDead,fontStyle:'italic'}}>{canEquip?'tap to equip':'—'}</div>
                }
              </div>
              {itemName && <span style={{fontSize:12,color:colors.textDead,flexShrink:0}}>✕</span>}
            </div>
          );
        })}
      </CollapsibleSection>

      {/* Abilities — spells, cantrips, infusions */}
      {character.abilities && (
        <>
          {character.abilities.cantrips?.length > 0 && (
            <CollapsibleSection title="✨ CANTRIPS" count={character.abilities.cantrips.length} defaultOpen={false}>
              {character.abilities.cantrips.map(name => (
                <div key={name} style={{fontSize:12,color:colors.textFaint,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
                  · {name}
                </div>
              ))}
            </CollapsibleSection>
          )}
          {character.abilities.spells?.length > 0 && (
            <CollapsibleSection title="📖 SPELLS" count={character.abilities.spells.length} defaultOpen={false}>
              {character.abilities.spells.map(name => (
                <div key={name} style={{fontSize:12,color:colors.textFaint,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
                  · {name}
                </div>
              ))}
            </CollapsibleSection>
          )}
          {character.abilities.infusions?.length > 0 && (
            <CollapsibleSection title="⚙️ INFUSIONS" count={character.abilities.infusions.length} defaultOpen={false}>
              {character.abilities.infusions.map(name => (
                <div key={name} style={{fontSize:12,color:colors.textFaint,padding:'2px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
                  · {name}
                </div>
              ))}
            </CollapsibleSection>
          )}
        </>
      )}

      {/* Companions */}
      {character.companions && Object.keys(character.companions).length > 0 && (
        <CollapsibleSection title="COMPANIONS" count={Object.keys(character.companions).length} defaultOpen={false}>
          {Object.entries(character.companions).map(([name, data]) => {
            const excluded = character.contextExclusions?.companions?.[name];
            return (
              <div key={name} style={{padding:'4px 0',borderBottom:`1px solid ${colors.borderFaint}`,opacity:excluded?0.4:1}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input type="checkbox" checked={!excluded} onChange={()=>onToggleContextExclusion?.('companions',name)}
                    style={{cursor:'pointer',accentColor:colors.gold,flexShrink:0}} title={excluded?'Excluded from AI context':'Included in AI context'}/>
                  <div style={{color:colors.gold,fontFamily:fonts.display,fontSize:12}}>{data.emoji||'👤'} {name}</div>
                </div>
                {data.desc && <div style={{color:colors.textGhost,fontSize:13,marginTop:1,lineHeight:1.4}}>{data.desc}</div>}
                <CompanionSlots companion={data} name={name} db={db} character={character} onSlotClick={onCompanionSlotClick} onUnequip={onCompanionUnequip}/>
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      </>}

      {activeTab==='crafting' && <>
      {/* Crafting — turn materials into gear */}
      {onProposeCrafting && (
        <CraftingPanel character={character} db={db} onProposeCrafting={onProposeCrafting} onExecuteCrafting={onExecuteCrafting} />
      )}

      {/* Salvage — break items back into materials */}
      {onProposeDismantle && (
        <SalvagePanel character={character} db={db} onProposeDismantle={onProposeDismantle} onExecuteDismantle={onExecuteDismantle} />
      )}
      </>}

      {activeTab==='settings' && <>
      {/* Arc objectives — the campaign skeleton */}
      {onGenerateObjectives && (
        <ObjectivesPanel arcObjectives={arcObjectives} onGenerateObjectives={onGenerateObjectives} onSetObjectives={onSetObjectives} />
      )}

      {/* Disposition — who the character actually is */}
      {onSaveDisposition && (
        <DispositionEditor key={JSON.stringify(disposition)} disposition={disposition} onSaveDisposition={onSaveDisposition} />
      )}

      {/* Bio — the DM's behavior anchor */}
      {onSaveBio && <BioEditor key={character.bio || 'empty'} character={character} onSaveBio={onSaveBio} />}

      {/* NPC Manager — extract from log, edit, add, delete */}
      {(onExtractNPC || onSaveNPC) && (
        <NPCManager character={character} onExtractNPC={onExtractNPC} onSaveNPC={onSaveNPC} onDeleteNPC={onDeleteNPC} />
      )}

      {/* Town Manager — extract from log, edit, add, delete */}
      {(onExtractTown || onSaveNPC) && (
        <TownManager character={character} onExtractTown={onExtractTown} onSaveNPC={onSaveNPC} onDeleteNPC={onDeleteNPC} />
      )}

      {/* Raw tag visibility (moved from the header) */}
      {onToggleRawTags && (
        <button onClick={onToggleRawTags} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',marginTop:6,borderColor:showRawTags?colors.gold:colors.border}}>
          🏷️ Raw tags: {showRawTags ? 'shown' : 'hidden'}
        </button>
      )}

      {/* Standing instructions (moved from the header) */}
      {onChangeDirectives && <DirectivesEditor directives={directives} onChangeDirectives={onChangeDirectives} />}

      {/* Debug log (moved from the header) */}
      {debugLog !== undefined && <DebugViewer debugLog={debugLog} debugStatus={debugStatus} onExportDebug={onExportDebug} onCopyDebug={onCopyDebug} />}
      </>}

      {activeTab==='character' && <>
      {/* Key NPCs */}
      {character.npcs && Object.keys(character.npcs).length > 0 && (
        <CollapsibleSection title="KEY NPCs" count={Object.keys(character.npcs).length} defaultOpen={false}>
          {Object.entries(character.npcs).map(([name, data]) => {
            const excluded = character.contextExclusions?.npcs?.[name];
            return (
              <div key={name} style={{padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`,opacity:excluded?0.4:1}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input type="checkbox" checked={!excluded} onChange={()=>onToggleContextExclusion?.('npcs',name)}
                    style={{cursor:'pointer',accentColor:colors.gold,flexShrink:0}} title={excluded?'Excluded from AI context':'Included in AI context'}/>
                  <div style={{color:colors.textDim,fontFamily:fonts.display,fontSize:12}}>{name}</div>
                </div>
                <div style={{color:colors.textGhost,fontSize:13}}>{data.location}</div>
                <div style={{color:colors.textGhost,fontSize:13,fontStyle:'italic'}}>{data.relationship}</div>
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      {/* Towns */}
      {character.towns && Object.keys(character.towns).length > 0 && (
        <CollapsibleSection title="🏙️ TOWNS" count={Object.keys(character.towns).length} defaultOpen={false}>
          {Object.entries(character.towns).map(([townName, data]) => {
            const isCurrent = character.currentLocation
              ? character.currentLocation.toLowerCase().includes(townName.toLowerCase()) || townName.toLowerCase().includes(character.currentLocation.toLowerCase())
              : false;
            const excluded = character.contextExclusions?.towns?.[townName];
            return (
              <div key={townName} style={{padding:'4px 0',borderBottom:`1px solid ${colors.borderFaint}`,opacity:excluded?0.4:1}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <input type="checkbox" checked={!excluded} onChange={()=>onToggleContextExclusion?.('towns',townName)}
                    style={{cursor:'pointer',accentColor:colors.gold,flexShrink:0}} title={excluded?'Excluded from AI context':'Included in AI context'}/>
                  <div style={{color:isCurrent?colors.gold:colors.textDim,fontFamily:fonts.display,fontSize:12}}>{townName}</div>
                  {isCurrent && <span style={{fontSize:10,color:colors.gold}}>◆ HERE</span>}
                </div>
                {data.desc && <div style={{color:colors.textGhost,fontSize:12,marginTop:1}}>{data.desc}</div>}
                {data.status && <div style={{color:colors.textDead,fontSize:11,fontStyle:'italic',marginTop:1}}>{data.status}</div>}
                {data.notable_locations && Object.keys(data.notable_locations).length > 0 && (
                  <div style={{marginTop:3}}>
                    {Object.entries(data.notable_locations).map(([loc, desc]) => (
                      <div key={loc} style={{fontSize:11,color:colors.textGhost,paddingLeft:6}}>· <span style={{color:colors.textFaint}}>{loc}</span>: {desc}</div>
                    ))}
                  </div>
                )}
                {data.minor_residents && Object.keys(data.minor_residents).length > 0 && (
                  <div style={{marginTop:3}}>
                    {Object.entries(data.minor_residents).map(([res, desc]) => (
                      <div key={res} style={{fontSize:11,color:colors.textGhost,paddingLeft:6}}>· <span style={{color:colors.textFaint}}>{res}</span>: {desc}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      {/* Bag mode toolbar */}
      {bagMode && (
        <div style={{background:colors.bgDark,border:`1px solid ${colors.gold}`,borderRadius:4,padding:'8px 10px',marginBottom:8}}>
          <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:10,letterSpacing:2,marginBottom:6}}>
            {addingToBag ? `ADDING TO: ${addingToBag}` : '🎒 CREATE BAG'}
          </div>
          {!addingToBag && (
            <input
              value={bagName}
              onChange={e => setBagName(e.target.value)}
              placeholder="Bag name..."
              style={{width:'100%',boxSizing:'border-box',background:colors.bg,border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.body,fontSize:12,padding:'4px 8px',borderRadius:3,marginBottom:6,outline:'none'}}
            />
          )}
          <div style={{fontSize:10,color:colors.textGhost,marginBottom:6}}>
            {Object.keys(bagSelected).length === 0 ? 'Tap items to select · use "all" to grab a whole stack' : Object.entries(bagSelected).map(([n,c]) => `${n}${c>1?` x${c}`:''}`).join(', ')}
          </div>
          <div style={{display:'flex',gap:4}}>
            <button onClick={confirmBag} disabled={Object.keys(bagSelected).length === 0 || (!addingToBag && !bagName.trim())}
              style={{...btn(true),flex:2,fontSize:10,opacity:(Object.keys(bagSelected).length>0&&(addingToBag||bagName.trim()))?1:0.4}}>
              {addingToBag ? 'ADD TO BAG' : 'CREATE'}
            </button>
            <button onClick={()=>{setBagMode(false);setBagSelected({});setBagName('');setAddingToBag(null);}}
              style={{...btn(false),flex:1,fontSize:10}}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Bag creation / add-to-bag trigger */}
      {!bagMode && (
        <div style={{display:'flex',gap:4,marginBottom:6,flexWrap:'wrap'}}>
          <button onClick={()=>{setBagMode(true);setAddingToBag(null);}}
            style={{...btn(false),fontSize:9,padding:'2px 8px'}}>🎒 Create Bag</button>
          {existingBags.map(name => (
            <button key={name} onClick={() => startAddToBag(name)}
              style={{...btn(false),fontSize:9,padding:'2px 8px'}}>+ {name}</button>
          ))}
        </div>
      )}

      {/* Collapsible inventory sections */}
      {Object.entries(CATEGORY_META).map(([cat, meta]) => {
        const items = (categorized[cat] || []).slice().sort((a, b) => a.name.localeCompare(b.name));
        if (items.length === 0) return null;
        return (
          <CollapsibleSection key={cat} title={meta.label} count={items.length} defaultOpen={false}>
            {items.map(({ name, count }) => {
              const data = db[name];
              const isBag = data?.type === 'bag';
              const statLabel = data?.type==='weapon'?`(${data.damage}${data.bonus?`+${data.bonus}`:''})`
                : data?.type==='armor'?`(AC${data.ac})`
                : '';
              const fullLabel = data?.label || (isBag ? data?.label : '');
              const selectedCount = bagSelected[name] || 0;
              const labelOpen = expandedLabels[name];
              const bagOpen = expandedBags[name];
              return (
                <div key={name} style={{borderBottom:`1px solid ${colors.borderFaint}`,
                  background: bagMode && selectedCount > 0 ? 'rgba(201,168,76,0.08)' : 'transparent'}}>
                  <div style={{fontSize:14,color:data?colors.textFaint:colors.textGhost,padding:'3px 0',display:'flex',alignItems:'center',gap:4}}>
                    {/* fixed-width delete column on the left — names line up regardless */}
                    {!bagMode && (
                      <span style={{width:44,flexShrink:0,display:'flex',justifyContent:'flex-start',gap:3}}>
                        {onDeleteItem && <button title="Delete one" onClick={() => onDeleteItem(name, false)} style={delBtn}>✕</button>}
                        {onDeleteItem && count > 1 && <button title="Delete all" onClick={() => onDeleteItem(name, true)} style={delBtn}>✕✕</button>}
                      </span>
                    )}
                    {bagMode && !isBag && (
                      <span style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
                        <span onClick={() => toggleBagItem(name)}
                          style={{cursor:'pointer',color:selectedCount>0?colors.gold:colors.textDead,fontSize:12,width:14,textAlign:'center'}}>
                          {selectedCount > 0 ? `${selectedCount}` : '○'}
                        </span>
                        {count > 1 && (
                          <button title={`Select all ${count}`} onClick={() => toggleBagItemAll(name, count)}
                            style={{...iconBtn,color:selectedCount>=count?colors.gold:colors.textDead,borderColor:selectedCount>=count?colors.gold:colors.borderDim}}>
                            all
                          </button>
                        )}
                      </span>
                    )}
                    {/* name — truncated, tap to expand label if it has one */}
                    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0,cursor:(bagMode&&!isBag)?'pointer':(fullLabel?'pointer':'default')}}
                      onClick={bagMode && !isBag ? () => toggleBagItem(name) : (fullLabel ? () => setExpandedLabels(p=>({...p,[name]:!p[name]})) : undefined)}>
                      {name} {statLabel && <span style={{color:colors.textDead}}>{statLabel}</span>}{fullLabel && !labelOpen && <span style={{color:colors.textDead}}> ⓘ</span>}
                    </span>
                    {/* construct status — tap to cycle dormant/active/bound */}
                    {data?.type === 'construct' && onCycleConstructStatus && !bagMode && (
                      <button
                        title="Tap to cycle: dormant → active → bound"
                        onClick={(e) => { e.stopPropagation(); onCycleConstructStatus(name); }}
                        style={{flexShrink:0,background:'transparent',border:`1px solid ${(data.status||'dormant')==='active'?colors.gold:colors.borderDim}`,
                          color:(data.status||'dormant')==='active'?colors.gold:colors.textDead,
                          fontFamily:fonts.display,fontSize:9,letterSpacing:1,padding:'1px 5px',borderRadius:3,cursor:'pointer'}}>
                        {(data.status || 'dormant').toUpperCase()}
                      </button>
                    )}
                    {/* qty — pinned to the line, never pushed off */}
                    {count > 1 && <span style={{color:colors.gold,fontFamily:fonts.mono,fontSize:14,flexShrink:0}}>x{count}</span>}
                    {/* bag expand toggle */}
                    {isBag && !bagMode && (
                      <span onClick={()=>setExpandedBags(p=>({...p,[name]:!p[name]}))}
                        style={{cursor:'pointer',color:colors.textDead,fontSize:10,flexShrink:0,padding:'0 2px'}}>{bagOpen?'▲':'▼'}</span>
                    )}
                    {!bagMode && (
                      <span style={{display:'flex',gap:3,flexShrink:0}}>
                        {onMoveToStash && (
                          <>
                            <button title="Move one to stash" onClick={() => onMoveToStash(name, false)} style={iconBtn}>📦</button>
                            {count > 1 && <button title="Move all to stash" onClick={() => onMoveToStash(name, true)} style={iconBtn}>📦📦</button>}
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  {/* expanded full label */}
                  {fullLabel && labelOpen && (
                    <div style={{fontSize:13,color:colors.textDead,padding:'0 0 4px 44px',lineHeight:1.4,fontStyle:'italic'}}>{fullLabel}</div>
                  )}
                  {/* expanded bag contents */}
                  {isBag && bagOpen && (
                    <div style={{padding:'2px 0 6px 14px'}}>
                      {Object.keys(data.contents||{}).length === 0 && (
                        <div style={{fontSize:11,color:colors.textDead,fontStyle:'italic'}}>Empty bag.</div>
                      )}
                      {Object.entries(data.contents||{}).map(([itemName, itemCount]) => {
                        const idata = db[itemName];
                        const ilabel = idata?.label;
                        return (
                          <div key={itemName} style={{fontSize:13,color:colors.textDead,padding:'2px 0',display:'flex',alignItems:'center',gap:4,borderBottom:`1px solid ${colors.borderFaint}`}}>
                            {onDeleteFromBag && (
                              <span style={{width:22,flexShrink:0,display:'flex',justifyContent:'flex-start'}}>
                                <button title="Delete from bag" onClick={()=>onDeleteFromBag(name,itemName,itemCount>1?false:true)} style={delBtn}>✕</button>
                              </span>
                            )}
                            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0}}>– {itemName}{ilabel?` [${ilabel}]`:''}</span>
                            {itemCount > 1 && <span style={{color:colors.goldFaint,fontFamily:fonts.mono,fontSize:13,flexShrink:0}}>x{itemCount}</span>}
                            {onRemoveFromBag && (
                              <>
                                <button title="Take one out" onClick={()=>onRemoveFromBag(name,itemName,false)} style={iconBtn}>↑</button>
                                {itemCount>1 && <button title="Take all out" onClick={()=>onRemoveFromBag(name,itemName,true)} style={iconBtn}>↑↑</button>}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CollapsibleSection>
        );
      })}

      {/* Stash — hidden from DM, persists in save */}
      {(() => {
        const stash = character.stash || [];
        const stackedStash = stackInventory(stash);
        const allStashEntries = Object.entries(stackedStash).sort((a, b) => a[0].localeCompare(b[0]));
        // Case-insensitive substring filter — stashes run to hundreds of distinct
        // entries, so scrolling to find one thing is impractical.
        const q = stashFilter.trim().toLowerCase();
        const stashEntries = q
          ? allStashEntries.filter(([name]) => {
              const data = db[name] || (character.stashedCustomItems || {})[name];
              return name.toLowerCase().includes(q) || (data?.label || '').toLowerCase().includes(q);
            })
          : allStashEntries;
        return (
          <CollapsibleSection
            title="📦 STASH"
            count={allStashEntries.length}
            defaultOpen={false}
          >
            <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
              Stored items — invisible to the DM. Quest relics, old gear, keepsakes.
            </div>
            {allStashEntries.length > 0 && (
              <div style={{display:'flex',gap:4,marginBottom:6}}>
                <input
                  value={stashFilter}
                  onChange={e => setStashFilter(e.target.value)}
                  placeholder={`Search ${allStashEntries.length} entries…`}
                  style={{flex:1,minWidth:0,boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:12,padding:'5px 8px',borderRadius:4,outline:'none'}}
                />
                {stashFilter && (
                  <button onClick={()=>setStashFilter('')} title="Clear search"
                    style={{...btn(false),flexShrink:0,fontSize:11,padding:'0 8px'}}>✕</button>
                )}
              </div>
            )}
            {allStashEntries.length === 0 && (
              <div style={{fontSize:12,color:colors.textDead,fontStyle:'italic',padding:'2px 0'}}>Empty — move items here to hide them from the DM.</div>
            )}
            {allStashEntries.length > 0 && stashEntries.length === 0 && (
              <div style={{fontSize:12,color:colors.textDead,fontStyle:'italic',padding:'2px 0'}}>No stash items match “{stashFilter}”.</div>
            )}
            {stashEntries.map(([name, count]) => {
              const data = db[name] || (character.stashedCustomItems || {})[name];
              const fullLabel = data?.label || '';
              const labelOpen = expandedLabels['stash:'+name];
              return (
                <div key={name} style={{borderBottom:`1px solid ${colors.borderFaint}`}}>
                  <div style={{fontSize:14,color:colors.textGhost,padding:'3px 0',display:'flex',alignItems:'center',gap:4}}>
                    <span style={{width:44,flexShrink:0}}/>
                    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0,opacity:0.7,cursor:fullLabel?'pointer':'default'}}
                      onClick={fullLabel?()=>setExpandedLabels(p=>({...p,['stash:'+name]:!p['stash:'+name]})):undefined}>
                      {name}{fullLabel && !labelOpen && <span style={{color:colors.textDead}}> ⓘ</span>}
                    </span>
                    {count > 1 && <span style={{color:colors.goldFaint,fontFamily:fonts.mono,fontSize:14,flexShrink:0}}>x{count}</span>}
                    {onMoveToInventory && (
                      <>
                        <button title="Return one to inventory" onClick={() => onMoveToInventory(name, false)} style={iconBtn}>↑</button>
                        {count > 1 && <button title="Return all to inventory" onClick={() => onMoveToInventory(name, true)} style={iconBtn}>↑↑</button>}
                      </>
                    )}
                  </div>
                  {fullLabel && labelOpen && (
                    <div style={{fontSize:13,color:colors.textDead,padding:'0 0 4px 44px',lineHeight:1.4,fontStyle:'italic'}}>{fullLabel}</div>
                  )}
                </div>
              );
            })}
          </CollapsibleSection>
        );
      })()}

      </>}

      <button style={{...btn(false),width:'100%',fontSize:12,marginTop:'auto'}} onClick={onSaveClick}>
        💾 Save / Export
      </button>

      <div style={{minHeight:40,flexShrink:0}}/>
    </div>
  );
}
