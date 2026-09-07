import { useState, useRef, useEffect } from 'react';
import { animations, colors, fonts, btn, panel, cardStyle } from './styles/theme.js';
import { CLASSES, RACES, STAT_NAMES, STAT_DESC } from './constants/classes.js';
import { DEITIES } from './constants/deities.js';
import { SLOTS } from './constants/items.js';
import { useCharacter, modStr, statMod, calcAC, equippableInSlot, allItems, levelUpsAvailable, pruneDeadItemDefinitions } from './hooks/useCharacter.js';
import { useVoice } from './hooks/useVoice.js';
import { useSave } from './hooks/useSave.js';
import { useGame, buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptGpt, buildSystemPromptSol, buildSystemPromptTerra, cleanDisplayText, MODEL_CONFIGS } from './hooks/useGame.js';
import { rollAntagonist, rollArc, makeArc, antagonistsForLevel, encounterChance, rollEncounterDirective, PACING_ORDER } from './constants/encounters.js';
import { Sidebar, resetCraftingPanels } from './components/Sidebar.jsx';
import { MessageFeed } from './components/MessageFeed.jsx';
import { InputBar } from './components/InputBar.jsx';
import { SaveModal } from './components/modals/SaveModal.jsx';
import { stackCounts, stackCount, stackHas, addStack, takeStack } from './utils/itemStacks.js';
import { ItemPickerModal } from './components/modals/ItemPickerModal.jsx';
import { AbilitiesModal } from './components/modals/AbilitiesModal.jsx';
import { DeityModal, WARLOCK_PATRONS } from './components/modals/DeityModal.jsx';
import { SubclassModal } from './components/modals/SubclassModal.jsx';
import { AdventureStartModal } from './components/modals/StartModal.jsx';
import { owedSubclasses } from './constants/subclasses.js';
import { ADVENTURES, rollSituationAdventure, prepareSituationAdventure } from './constants/adventures.js';
import { rollAdventureSeed } from './helpers/adventure/seed.js';
import { callGptStoryEntry, callGptArchive } from './helpers/openai/history.js';
import { callGptTownManager } from './helpers/openai/towns.js';
import { callGptNpcManager } from './helpers/openai/npcs.js';
import { callGptSalvage } from './helpers/openai/salvage.js';
import { callGptCrafting } from './helpers/openai/crafting.js';
import { callGptConsolidate } from './helpers/openai/consolidate.js';
import { callAnthropicStoryEntry, callAnthropicArchive } from './helpers/anthropic/history.js';
import { callAnthropicTownManager } from './helpers/anthropic/towns.js';
import { callAnthropicNpcManager } from './helpers/anthropic/npcs.js';
import { callAnthropicSalvage } from './helpers/anthropic/salvage.js';
import { callAnthropicCrafting } from './helpers/anthropic/crafting.js';
import { callAnthropicConsolidate } from './helpers/anthropic/consolidate.js';
import { armAnthropicCacheKeepWarm, cancelAnthropicCacheKeepWarm } from './helpers/anthropic/cache.js';

function StatBar({ label, value, desc }) {
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
        <span style={{fontFamily:fonts.display,fontSize:10,color:colors.gold,letterSpacing:1}}>{label}</span>
        <span style={{fontFamily:fonts.mono,fontWeight:'bold',color:colors.text,fontSize:13}}>{value} <span style={{fontSize:9,color:colors.textGhost}}>({modStr(value)})</span></span>
      </div>
      <div style={{background:colors.borderFaint,borderRadius:2,height:5,overflow:'hidden'}}>
        <div style={{width:`${(value/20)*100}%`,height:'100%',background:value>=15?colors.gold:value>=12?'#8a7040':'#4a3a20',borderRadius:2,transition:'width 0.4s'}}/>
      </div>
      <div style={{fontSize:8,color:colors.textGhost,marginTop:1}}>{desc}</div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase]       = useState('welcome');
  const [fullLog,  setFullLog]  = useState([]);
  const fullLogRef = useRef([]);
  const [loading, setLoading]   = useState(false);
  const abortRef = useRef(null);
  const turnsSinceEncounter = useRef(0);

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
  };
  const [nameInput, setNameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [dispInput, setDispInput] = useState({ alignment:'', cares:'', indifferent:'', methods:'', lines:'' });
  const [apiKey, setApiKey]     = useState('');
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const [apiError, setApiError] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [slotTarget, setSlotTarget] = useState(null);
  const [companionSlotTarget, setCompanionSlotTarget] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const debugLogRef = useRef([]);
  const objectiveNoteRef = useRef('');   // queued note for the next API message

  // ── Prompt log ─────────────────────────────────────────────────────────────
  // The last N prompts exactly as sent, so a cost or behaviour question can be
  // answered from evidence instead of reconstruction. Blocks are deduplicated by
  // content hash: the static block is usually identical turn to turn, and storing
  // 20 copies of ~48KB would dwarf the rest of the save.
  // OFF by default. It stores the full static block, gear, items and the whole
  // cached history every turn, hashes each, then prunes — all on the main
  // thread while a request is in flight, and it accumulates across a session.
  // Diagnostics are not worth a stutter mid-play; turn it on when investigating.
  const PROMPT_LOG_ENABLED = true;
  const PROMPT_LOG_KEEP = 15;
  const promptLogRef = useRef({ blocks: {}, turns: [] });

  const hashText = (t) => {
    let h = 5381;
    for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
    return `${h.toString(36)}-${t.length}`;
  };

  const recordPrompt = (rec) => {
    if (!PROMPT_LOG_ENABLED) return;
    const store = promptLogRef.current;
    const blocks = { ...store.blocks };
    const keep = (text) => {
      if (!text) return null;
      const h = hashText(text);
      if (!blocks[h]) blocks[h] = text;
      return h;
    };
    const turn = {
      at: rec.at,
      model: rec.model,
      staticRef: keep(rec.staticBlock),
      itemsRef: keep(rec.itemsBlock),
      dynamic: rec.dynamicBlock,          // volatile, stored in full every turn
      cachedMsgRefs: rec.cachedMessages.map(m => ({ role: m.role, ref: keep(m.content) })),
      freshMessages: rec.freshMessages,   // small, and the most useful to read
      usage: rec.usage,
    };
    const turns = [...store.turns, turn].slice(-PROMPT_LOG_KEEP);
    // Drop any block no longer referenced by a retained turn.
    const live = new Set();
    turns.forEach(t => {
      if (t.staticRef) live.add(t.staticRef);
      if (t.itemsRef) live.add(t.itemsRef);
      t.cachedMsgRefs?.forEach(m => m.ref && live.add(m.ref));
    });
    Object.keys(blocks).forEach(h => { if (!live.has(h)) delete blocks[h]; });
    promptLogRef.current = { blocks, turns };
  };
  const sideCostRef = useRef({ calls: 0, cost: 0 });   // running total for non-DM calls
  const cacheTimerRef = useRef(null);   // one-shot Anthropic cache keep-warm
  const armCacheTimer = () => armAnthropicCacheKeepWarm({
    timerRef: cacheTimerRef,
    selectedModel,
    charRef,
    pingCache,
    onUsage: data => logUsage('cache keep-warm', data),
  });
  useEffect(() => () => cancelAnthropicCacheKeepWarm(cacheTimerRef), []);

  // Every helper call (crafting, salvage, extraction, summaries, objectives) is
  // a separate billed request that never appeared in the token bar. Log each
  // one's usage and keep a session running total so costs can be traced.
  const logUsage = (label, data) => {
    const u = data?.usage;
    if (!u) return;
    const cacheRead = u.cache_read_input_tokens ?? 0;
    const cacheWrite = u.cache_creation_input_tokens ?? 0;
    const input = u.input_tokens ?? 0;
    const output = u.output_tokens ?? 0;
    // Sonnet list pricing, per million tokens.
    const cost = (input * 3 + cacheWrite * 3.75 + cacheRead * 0.30 + output * 15) / 1e6;
    sideCostRef.current = { calls: sideCostRef.current.calls + 1, cost: sideCostRef.current.cost + cost };
    log(`[COST] ${label}: ${(input + cacheRead + cacheWrite).toLocaleString()} in / ${output.toLocaleString()} out = $${cost.toFixed(4)}  ·  session helper total $${sideCostRef.current.cost.toFixed(3)} over ${sideCostRef.current.calls} calls`);
  };
  const [adventureStartChar, setAdventureStartChar] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [showRawTags, setShowRawTags] = useState(false);
  const [showAbilitiesModal, setShowAbilitiesModal] = useState(false);
  const [showDeityModal, setShowDeityModal] = useState(false);
  const [deityModalContext, setDeityModalContext] = useState('multiclass'); // 'multiclass' or 'oldSave'
  const [deityModalClass, setDeityModalClass] = useState(null);
  const [showSubclassModal, setShowSubclassModal] = useState(false);
  const [subclassQueue, setSubclassQueue] = useState([]);
  const [selectedModel, setSelectedModel] = useState('sonnet'); // sonnet, haiku, gpt (Sol), terra
  const [storySummary, setStorySummary] = useState('');
  const [tokenUsage, setTokenUsage]     = useState(null);
  const storySummaryRef = useRef('');
  const isMobile = window.innerWidth < 768;

  const log = (msg, data) => {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`;
    console.log(entry);
    setDebugLog(prev => { const next = [...prev.slice(-999), entry]; debugLogRef.current = next; return next; });   // keep 1000
  };

  const {
    character, charRef, updateChar, loadCharacter,
    selectRace, selectClass, selectDeity, finalizeCharacter,
    applyEffects, spendStatPoint,
    equipToSlot, unequipSlot, equipCompanionItem, unequipCompanionItem,
    moveToStash, moveToInventory, bankCoins, withdrawCoins,
    createBag, addToBag, removeFromBag, deleteItem, deleteFromBag, renameItem,
    toggleContextExclusion,
  } = useCharacter(log);

  const voice = useVoice();
  const { callDM, buildActionContext, interceptRollRequest, pingCache } = useGame({ charRef, apiKey, openAiApiKey });

  // ── Save/Load ──────────────────────────────────────────────────────────────
  // Which patron class is the deity/patron being chosen for? Prefers Warlock so a
  // Fighter/Warlock multiclass shows patrons, not the cleric deity list.
  const patronClassOf = (c) =>
    ['Warlock', 'Cleric', 'Paladin'].find(k => c?.classLevels?.[k] || c?.cls?.name === k) || c?.cls?.name || null;

  const isClericCharacter = (char) => {
    const patronClasses = ['Cleric', 'Warlock', 'Paladin'];
    return patronClasses.includes(char.cls?.name) ||
      Object.keys(char.classLevels || {}).some(k => patronClasses.includes(k));
  };

  // ── Unified load handlers ──────────────────────────────────────────────────
  // Every load path (file, legacy code, autosave — welcome or playing phase)
  // funnels through these two so behavior can't drift between entry points.
  const SPELLCASTER_CLASSES = ['Artificer','Cleric','Wizard','Warlock','Sorcerer','Druid','Paladin','Ranger','Bard'];

  const queuePostLoadModals = (char) => {
    const needsDeity = char._needsDeitySelection && isClericCharacter(char);
    if (needsDeity) {
      setDeityModalContext('oldSave');
      setShowDeityModal(true);
    }
    const owedSC = owedSubclasses(char);
    if (owedSC.length && !needsDeity) {
      setSubclassQueue(owedSC);
      setShowSubclassModal(true);
    }
    const hasSpellClass = Object.keys(char.classLevels || {}).some(c => SPELLCASTER_CLASSES.includes(c));
    const needsAbilities = hasSpellClass && (!char.abilities || (
      char.abilities.cantrips?.length === 0 &&
      char.abilities.spells?.length === 0 &&
      char.abilities.infusions?.length === 0
    ));
    if (needsAbilities) setTimeout(() => setShowAbilitiesModal(true), 500);
  };

  const applyLoadedSettings = (settings) => {
    if (!settings || typeof settings !== 'object') return;
    if (settings.selectedModel && MODEL_CONFIGS[settings.selectedModel]) setSelectedModel(settings.selectedModel);
    if (typeof settings.showRawTags === 'boolean') setShowRawTags(settings.showRawTags);
    voice.applySavedSettings?.({ rate: settings.ttsRate, pitch: settings.ttsPitch });
  };

  const applyLoadedFull = (char, msgs, summary = '', settings = null) => {
    applyLoadedSettings(settings);
    resetCraftingPanels();   // any pending proposal refers to the character being replaced
    loadCharacter(char);
    setFullLog(msgs);
    fullLogRef.current = msgs;
    setStorySummary(summary);
    storySummaryRef.current = summary;
    initSummarizedAt(msgs.length, summary);
    queuePostLoadModals(char);
    setPhase('playing');
  };

  const applyLoadedCharacter = (char, settings = null) => {
    applyLoadedSettings(settings);
    resetCraftingPanels();   // any pending proposal refers to the character being replaced
    loadCharacter(char);
    setFullLog([]); fullLogRef.current = [];
    // Character exports are a clean start — clear any previous story's summary
    // so it doesn't leak into the new adventure.
    setStorySummary(''); storySummaryRef.current = '';
    initSummarizedAt(0);
    queuePostLoadModals(char);
    setPhase('playing');
    setTimeout(() => beginAdventure(char), 100);
  };

  // Start a fresh campaign with the character you already have — the same thing
  // as exporting the character and loading it back, without the round trip
  // through a file. Keeps everything the character IS (level, gear, companions,
  // NPCs, towns) and drops everything the last campaign WAS.
  const startNewCampaign = () => {
    const { arc, ...rest } = charRef.current;   // an export carries no arc
    log('[CAMPAIGN] Starting a new campaign — character kept, story cleared');
    // Matches a character export exactly: only the arc is stripped. The defeated
    // ledger stays — the character really did kill those foes, and keeping it
    // stops them being rolled again in the new campaign.
    applyLoadedCharacter(rest);
  };

  const save = useSave({
    charRef,
    messages: fullLog,
    storySummaryRef,
    debugLogRef,
    promptLogRef,
    getSettings: () => ({ selectedModel, showRawTags, ttsRate: voice.rate, ttsPitch: voice.pitch }),
    onLoadFull: applyLoadedFull,
    onLoadCharacter: applyLoadedCharacter,
  });

  // Autosave was only triggered by message events, so anything changed BETWEEN
  // turns was lost on reload — a crafting session, salvage, equipment changes,
  // stash moves, NPC edits, disposition. Watch the character itself instead and
  // write shortly after it settles, which covers every mutation path.
  useEffect(() => {
    if (phase !== 'playing' || !character?.stats?.dex) return;
    const t = setTimeout(() => {
      try {
        const t0 = performance.now();
        save.autoSave(charRef.current, fullLogRef.current);
        const ms = performance.now() - t0;
        // Serialising a long campaign to localStorage runs on the main thread.
        // If it is costing real time, say so rather than silently stuttering.
        if (ms > 150) log(`[SAVE] Autosave took ${Math.round(ms)}ms — ${fullLogRef.current.length} messages`);
      } catch (e) {
        log(`[SAVE] Autosave failed: ${e.message}`);
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [character, phase, selectedModel, showRawTags, voice.rate, voice.pitch]);

  // Browsers only allow a generic confirmation, but it is enough to stop a
  // stray back gesture discarding work that has not been written yet.
  useEffect(() => {
    if (phase !== 'playing') return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; return ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);


  // Auto-save after every DM response
  const addMessage = (msg) => {
    setFullLog(prev => {
      const next = [...prev, msg];
      fullLogRef.current = next;
      // The debounced character effect already autosaves; writing again here
      // doubled a 300KB serialise on every turn of a long campaign.
      // save.autoSave(charRef.current, next);
      return next;
    });
  };

  // ── API call ───────────────────────────────────────────────────────────────
  // Fresh adventures route through a choice: random seed or a player-written opening.
  const beginAdventure = (char) => setAdventureStartChar(char);

  const startAdventure = async (char, openingOverride = null, antagonistOverride = null, situationMode = false, situationOverride = null) => {
    log('startAdventure', { level: char.level, xp: char.xp, hp: char.hp });
    setLoading(true);
    setApiError('');
    try {
      const modelConfig = MODEL_CONFIGS[selectedModel];
      let seedPrompt;
      let arcAntagonist;
      let situationSeed = null;
      if (situationMode) {
        situationSeed = situationOverride || rollSituationAdventure(char.completedAdventures || []);
        arcAntagonist = null;
        seedPrompt = `[SITUATION ADVENTURE — OPENING]
TITLE: ${situationSeed.title}
PREMISE: ${situationSeed.premise}
STARTING CONTEXT: ${situationSeed.location}
TONE: ${situationSeed.tone}
OPENING STYLE: ${situationSeed.openingStyle}

This Adventure is a persistent BACKGROUND SITUATION, not an opening quest dump and not a predetermined plot. Establish the player naturally in the STARTING CONTEXT first. Let them arrive, look around, eat, drink, shop, travel, socialize, attend an event, or otherwise exist in the location before the Adventure demands attention. The premise may surface immediately only when that is genuinely natural; otherwise let it emerge through ordinary play.

The player's PREVIOUS campaign location is deliberately unavailable for this opening. Do not infer continuity from where the last story ended. Choose a fresh, appropriate actual location for this Adventure based on the premise and STARTING CONTEXT, then establish it with [LOCATION: ...].

Do not invent or reveal a villain, culprit, secret master, solution, final objective, or hidden explanation merely to make the premise feel like a quest. Let NPCs, relationships, complications, mysteries, enemies, discoveries, and goals emerge from what the player actually chooses to investigate or engage with. Combat is optional, not the default form of progress. Social interaction, exploration, negotiation, bargains, travel, humor, ordinary life, and unexpected relationships are first-class play.

Use the STARTING CONTEXT because it was chosen specifically for this premise; do not replace it with the generic random-start location generator. Place it in an appropriate real Faerûn/Feywild/planar location as context requires. PLAYER AGENCY IS ABSOLUTE. Never pre-act for the player. End with exactly 4 numbered choices.`;
      } else if (openingOverride && openingOverride.trim()) {
        // Player wrote the opening — use their antagonist if given, else roll a hidden one.
        arcAntagonist = antagonistOverride?.trim() || rollAntagonist(char.level, null, char.defeatedAntagonists);
        seedPrompt = `[ADVENTURE START — PLAYER-SPECIFIED OPENING]\nBegin the adventure exactly as the player describes below. Do NOT randomize the setting, location, or situation — use what they wrote. PLAYER AGENCY IS ABSOLUTE: do not invent any action, decision, conversation, combat, agreement, relationship, knowledge, or item acquisition for the player beyond what the player's opening explicitly states. Begin before the first unresolved action and let the player make it. Establish why the player is present and what they actually know before introducing mysteries that depend on context. Open the scene there with vivid physical detail, keep it within the story scope appropriate to a level ${char.level} character, and end with exactly 4 numbered choices (at least one chaotic or unconventional, at least one ruthless or self-serving, all written neutrally).\n\nPLAYER'S OPENING:\n${openingOverride.trim()}\n\nThe character's backstory is background only — do NOT open in their history or build the scene around it unless the player's opening above says to.`;
      } else {
        const seed = rollAdventureSeed(char.level);
        arcAntagonist = antagonistOverride?.trim() || seed.antagonist;
        seedPrompt = `[ADVENTURE SEED — MANDATORY COMPLIANCE REQUIRED]
You MUST open the adventure using ALL of the following parameters exactly as given. This is not a suggestion. Do not substitute, reinterpret, or ignore any field.

STORY SCOPE (the player is level ${char.level} — match the SIZE and stakes of the story to this): ${seed.scope}

SETTING: ${seed.setting}
TIME OF DAY: ${seed.time}
WEATHER: ${seed.weather}
TONE: ${seed.tone}
OPENING LOCATION (the specific place the scene starts): ${seed.location}
OPENING STYLE (HOW to open the scene — follow this structure, do not default to a generic establishing shot): ${seed.openingStyle}
WILDCARD (a distinctive detail to work into the opening): ${seed.wildcard}
ADVENTURE HOOK (what draws the player in): ${seed.hook}
ANTAGONIST (do NOT reveal or name yet — plant subtle setup only): ${arcAntagonist}

REQUIRED: Set the opening in a real Faerûn location — a canon city or region of the Forgotten Realms (e.g. a tavern in Baldur's Gate, the docks of Waterdeep, a roadhouse on the Trade Way near Daggerford). You may invent a specific local spot (a named inn, shrine, or alley) but it must sit inside a real canon place. Ground the scene in physical details matching the weather and time, and open it in the OPENING STYLE above rather than a stock "you stand in X" description. Emit a [LOCATION:] tag with the canon place name.

PLAYER AGENCY AT THE OPENING IS ABSOLUTE. NEVER BEGIN IN THE MIDDLE OF AN EVENT THE PLAYER DID NOT PLAY. NEVER INVENT ACTIONS, DECISIONS, CONVERSATIONS, COMBAT, INVESTIGATIONS, AGREEMENTS, RELATIONSHIPS, PURCHASES, TRAVEL, OR KNOWLEDGE FOR THE PLAYER CHARACTER IN ORDER TO CREATE AN EXCITING OPENING. Do not say the player already accepted a job, arrived mid-ambush, killed or fought anyone, questioned someone, agreed to help, took an item, followed a lead, met an NPC, or learned information unless that fact exists in supplied character/history context. The opening begins BEFORE the inciting event reaches the point where the player must act.

ESTABLISH CONTEXT BEFORE MYSTERY. The opening MUST make clear why the player is presently at this location and what they actually know. Any NPC who addresses the player as an acquaintance, employer, client, ally, enemy, or expected guest MUST already exist in supplied context; otherwise introduce them as a stranger and let the relationship form in play. Cryptic statements, unexplained names, secret ledgers, dying messengers, attacks, discoveries, and other hooks happen ON SCREEN where the player can react to them — never as events you claim just happened before the first response.

THE FIRST MEANINGFUL ACTION BELONGS TO THE PLAYER. You may present an event beginning around them — a stranger approaches, shouting erupts inside a building, someone asks for help, an alarm sounds, a suspicious figure appears — but STOP BEFORE deciding how the player responds. Do not resolve the hook for them. Do not place quest items in their possession unless the player chooses to take them.

End at that natural decision point and ALWAYS close with exactly 4 numbered choices — vary the framing that leads into them, but the 4 numbered choices themselves are mandatory and never omitted. At least one should be chaotic or unconventional, at least one ruthless or self-serving, all written neutrally. The choices are suggestions, not actions already taken.

NON-COMPLIANCE: If you invent pre-play actions or knowledge for the player, begin after the inciting event has already been acted upon, or open with anything other than the parameters above, you have failed your role as DM.`;
      }
      // Antagonists and situation Adventures are mutually exclusive story drivers.
      // The Adventure persists in the save until the DM emits [ADVENTURE COMPLETE]
      // or the player clears/replaces it from Settings. Completion never auto-rolls another.
      let charWithArc;
      if (situationMode) {
        // A new Adventure is a fresh opening, not a continuation of wherever the
        // previous campaign happened to end. Remove currentLocation before building
        // the player/system data so the DM cannot anchor itself to the old scene.
        // The opening response will establish the new place with [LOCATION: ...].
        const { arc, adventure, currentLocation, ...rest } = char;
        charWithArc = { ...rest, currentLocation: '', adventure: situationSeed };
        log(`[ADVENTURE] Situation start — ${situationSeed.title}; previous location hidden`);
      } else {
        const { adventure, ...rest } = char;
        charWithArc = { ...rest, arc: makeArc(arcAntagonist) };
        log(`[ARC] Adventure start — antagonist rolled: ${arcAntagonist}`);
      }
      const system = selectedModel === 'haiku'
        ? buildSystemPrompt(charWithArc)
        : selectedModel === 'sonnet'
        ? buildSystemPromptSonnet(charWithArc)
        : selectedModel === 'terra'
        ? buildSystemPromptTerra(charWithArc)
        : buildSystemPromptSol(charWithArc);
      const { text, usage } = await callDM(
        [{ role:'user', content: seedPrompt }],
        system,
        modelConfig,
        null,
        log
      );
      if (usage) setTokenUsage(usage);
      armCacheTimer();
      const newChar = applyEffects(text, charWithArc, false, charWithArc.lootDestination === 'stash' ? 'stash' : 'inventory');
      log('applyEffects after startAdventure', { xpBefore: char.xp, xpAfter: newChar.xp, levelBefore: char.level, levelAfter: newChar.level });
      updateChar(newChar);
      const firstMsg = { role:'dm', text, id:Date.now(), roll:null };
      setFullLog([firstMsg]);
      fullLogRef.current = [firstMsg];
      save.autoSave(newChar, [firstMsg]);
      voice.speak(text);
    } catch (e) {
      setApiError(e.message);
      const errMsg = { role:'dm', text:`The candle flickers... (${e.message})`, id:Date.now(), roll:null };
      setFullLog([errMsg]);
      fullLogRef.current = [errMsg];
    }
    setLoading(false);
  };

  const SUMMARIZE_AFTER   = 12;    // summary cadence (every N messages); API window grows up to this + KEEP_RECENT
  const KEEP_RECENT       = 4;     // keep this many recent messages raw (never summarized)
  const ENTRIES_BEFORE_COMPRESS = 6;  // compress oldest 4 entries when we hit this many
  const COMPRESS_KEEP_RECENT_ENTRIES = 2; // always keep newest N entries raw
  const lastSummarizedAt = useRef(0);

  // When a save loads, set lastSummarizedAt based on what's already been summarized
  // so the summarizer doesn't re-fire and overwrite existing summary content
  const initSummarizedAt = (loadedMsgCount, loadedSummary = '') => {
    if (loadedSummary) {
      // If we have an existing summary, calculate how many messages it covers
      // so we don't re-summarize already-covered content
      const obj = parseSummary(loadedSummary);
      // Each archived chunk absorbed the oldest entries minus the ones kept raw
      const entriesPerChunk = ENTRIES_BEFORE_COMPRESS - COMPRESS_KEEP_RECENT_ENTRIES;
      const summarizedEntries = (obj.chunks.length * entriesPerChunk) + obj.entries.length;
      // Each entry corresponds to one summarization fire, which happens every SUMMARIZE_AFTER messages
      const summarizedMsgCount = summarizedEntries * SUMMARIZE_AFTER;
      // Set to whichever is higher — summary coverage or message count rounded down
      lastSummarizedAt.current = Math.max(
        summarizedMsgCount,
        Math.floor(loadedMsgCount / SUMMARIZE_AFTER) * SUMMARIZE_AFTER
      );
    } else {
      lastSummarizedAt.current = Math.floor(loadedMsgCount / SUMMARIZE_AFTER) * SUMMARIZE_AFTER;
    }
    log(`[SUMMARY] Initialized lastSummarizedAt to ${lastSummarizedAt.current} (${loadedMsgCount} msgs loaded)`);
  };

  // Parse storySummary — handles both new JSON format and legacy plain string
  const parseSummary = (raw) => {
    if (!raw) return { chunks: [], entries: [] };
    try {
      const parsed = JSON.parse(raw);
      if (parsed.chunks !== undefined) return parsed;
    } catch {}
    // Legacy plain string — wrap as a single entry
    return { chunks: [], entries: [{ id: 1, type: 'entry', text: raw }] };
  };

  const serializeSummary = (obj) => JSON.stringify(obj);

  // Build the labeled context block sent to Haiku
  const formatSummaryForApi = (summaryObj) => {
    const { chunks, entries } = summaryObj;
    // Manually-archived (unchecked) entries are excluded from what the DM sees.
    const activeChunks  = chunks.filter(c => !c.excluded);
    const activeEntries = entries.filter(e => !e.excluded);
    if (activeChunks.length === 0 && activeEntries.length === 0) return '';
    const parts = [];
    activeChunks.forEach(chunk => {
      parts.push(`[ARCHIVED HISTORY — ${chunk.sessions}]\n${chunk.text}`);
    });
    activeEntries.forEach((entry, i) => {
      parts.push(`[RECENT SUMMARY ${i + 1}]\n${entry.text}`);
    });
    return parts.join('\n\n');
  };

  // Toggle a summary entry/chunk on or off (off = not sent to the DM). Persists in the save.
  const toggleSummaryEntry = (id) => {
    const obj = parseSummary(storySummaryRef.current);
    const flip = arr => arr.map(x => x.id === id ? { ...x, excluded: !x.excluded } : x);
    const serialized = serializeSummary({ chunks: flip(obj.chunks), entries: flip(obj.entries) });
    setStorySummary(serialized);
    storySummaryRef.current = serialized;
  };

  // Compress oldest entries into a frozen chunk
  const compressEntries = async (entriesToCompress, sessionLabel, key) => {
    log(`[SUMMARY] Compressing ${entriesToCompress.length} entries into archived chunk (${sessionLabel})`);
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      try {
        const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
        const { text: gptArchiveText, usage: gptArchiveUsage } = await callGptArchive({
        model: MODEL_CONFIGS[selectedModel].model,
          apiKey: gptKey,
          entriesText: entriesToCompress.map(e => e.text).join('\n\n'),
        });
        const gIn = gptArchiveUsage?.input_tokens || 0;
        const gOut = gptArchiveUsage?.output_tokens || 0;
        log(`[HELPER] archive via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
        log(`[SUMMARY] Archived chunk created: ${gptArchiveText.length} chars`);
        return gptArchiveText;
      } catch (e) {
        log('[SUMMARY] GPT compression failed: ' + e.message);
        return entriesToCompress.map(e => e.text).join('\n\n');
      }
    }
    try {
      const { text, usage } = await callAnthropicArchive({
        apiKey: key, entriesText: entriesToCompress.map(e => e.text).join('\n\n'),
      });
      if (usage) logUsage('archive summary', { usage });
      if (text) { log(`[SUMMARY] Archived chunk created: ${text.length} chars`); return text; }
    } catch (e) { log('[SUMMARY] Compression failed: ' + e.message); }
    // Fallback: join entries as-is
    return entriesToCompress.map(e => e.text).join('\n\n');
  };

  // Condense old messages into a rolling summary, keep recent tail verbatim
  const maybeAutoSummarize = async (allMessages) => {
    if (allMessages.length < SUMMARIZE_AFTER) return;
    const nextThreshold = lastSummarizedAt.current + SUMMARIZE_AFTER;
    if (allMessages.length < nextThreshold) {
      log(`[SUMMARY] Skipping — ${allMessages.length} msgs, next threshold: ${nextThreshold}`);
      return;
    }
    const prevSummarizedAt = lastSummarizedAt.current;
    lastSummarizedAt.current = allMessages.length;
    log(`[SUMMARY] Firing — ${allMessages.length} msgs`);

    // Only summarize messages NOT covered by previous fires. Previous coverage
    // ended at (prevSummarizedAt - KEEP_RECENT); sending the whole log again
    // just re-summarizes old events into duplicate entries at growing cost.
    const prevCovered = Math.max(0, prevSummarizedAt - KEEP_RECENT);
    const toSummarize = allMessages.slice(prevCovered, allMessages.length - KEEP_RECENT);
    if (toSummarize.length === 0) { lastSummarizedAt.current = prevSummarizedAt; return; }
    // Live summaries are working memory: give the scribe the full target messages.
    // Truncating each message destroyed exactly the location/motivation details the summary must preserve.
    const historyForSummary = toSummarize.map(m => ({
      role: m.role === 'dm' ? 'assistant' : 'user',
      content: m.text,
    }));
    const followingForSummary = allMessages.slice(allMessages.length - KEEP_RECENT).map(m => ({
      role: m.role === 'dm' ? 'assistant' : 'user',
      content: m.text,
    }));

    try {
      const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
      const currentObj = parseSummary(storySummaryRef.current);

      // Step 1 — write new entry for recent events
      let gptStoryEntry = '';
      let gptStoryUsage = null;
      if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
        const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
        const gptTranscript = historyForSummary.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n');
        const gptStory = await callGptStoryEntry({
        model: MODEL_CONFIGS[selectedModel].model,
          apiKey: gptKey,
          playerName: charRef.current?.name || 'the adventurer',
          currentLocation: charRef.current?.currentLocation || 'unknown',
          priorSummary: storySummaryRef.current || '',
          transcript: gptTranscript,
          followingTranscript: followingForSummary.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n'),
        });
        gptStoryEntry = gptStory.text;
        gptStoryUsage = gptStory.usage;
        const gIn = gptStoryUsage?.input_tokens || 0;
        const gOut = gptStoryUsage?.output_tokens || 0;
        log(`[HELPER] story log via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
      }
      let anthropicStory = null;
      if (!gptStoryEntry) {
        anthropicStory = await callAnthropicStoryEntry({
          apiKey: key,
          playerName: charRef.current?.name || 'the adventurer',
          currentLocation: charRef.current?.currentLocation || 'unknown',
          priorSummary: storySummaryRef.current || '',
          transcript: historyForSummary.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n'),
          followingTranscript: followingForSummary.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n'),
        });
        if (anthropicStory.usage) logUsage('story log entry', { usage: anthropicStory.usage });
      }
      const newEntry = gptStoryEntry || anthropicStory?.text || '';
      if (!newEntry) { lastSummarizedAt.current = prevSummarizedAt; return; }

      // From here the entry is real. Past this point we NEVER rewind
      // lastSummarizedAt — doing so would re-summarize these same messages into a
      // duplicate entry next fire. Compression is best-effort and isolated.
      const newId = Date.now();
      const updatedEntries = [...currentObj.entries, { id: newId, type: 'entry', text: newEntry }];

      let finalChunks = [...currentObj.chunks];
      let finalEntries = updatedEntries;

      if (updatedEntries.length >= ENTRIES_BEFORE_COMPRESS) {
        const toCompress = updatedEntries.slice(0, updatedEntries.length - COMPRESS_KEEP_RECENT_ENTRIES);
        const keepRaw    = updatedEntries.slice(-COMPRESS_KEEP_RECENT_ENTRIES);
        const chunkNum   = finalChunks.length + 1;
        const sessionStart = (chunkNum - 1) * toCompress.length * SUMMARIZE_AFTER + 1;
        const sessionEnd   = chunkNum * toCompress.length * SUMMARIZE_AFTER;
        const sessionLabel = `Sessions ${sessionStart}-${sessionEnd}`;
        let chunkText = '';
        try {
          chunkText = await compressEntries(toCompress, sessionLabel, key);
        } catch (ce) {
          log('[SUMMARY] Compression threw, keeping entries raw this cycle: ' + ce.message);
        }
        if (chunkText) {
          // Compression succeeded — archive the old entries, keep the newest raw
          finalChunks = [...finalChunks, { id: newId + 1, type: 'archived', sessions: sessionLabel, text: chunkText, frozen: true }];
          finalEntries = keepRaw;
          log(`[SUMMARY] New archived chunk created, ${keepRaw.length} entries remain raw`);
        }
        // If compression failed, finalEntries stays = updatedEntries (all kept raw).
        // They'll be compressed next cycle. The new entry is NOT lost or duplicated.
      }

      const finalObj = { chunks: finalChunks, entries: finalEntries };
      const serialized = serializeSummary(finalObj);
      setStorySummary(serialized);
      storySummaryRef.current = serialized;
      save.autoSave(charRef.current, fullLogRef.current);
      log(`[SUMMARY] Done — ${finalChunks.length} archived chunks, ${finalEntries.length} raw entries`);
    } catch (e) {
      // Only reached if Step 1 (the entry write) itself threw — safe to rewind
      // and retry next fire, because no entry was committed.
      lastSummarizedAt.current = prevSummarizedAt;
      log('[SUMMARY] Failed before entry committed: ' + e.message);
    }
  };

  // ── NPC extraction ─────────────────────────────────────────────────────────
  // Player-driven: reads a range of RAW fullLog messages (primary text, not the
  // degraded summary) via a dedicated API call and writes structured entries
  // into character.npcs / character.companions. Three modes:
  //   name given, not in store  -> create
  //   name given, already exists -> update (existing entry sent for merging)
  //   name blank                 -> multi-find (all significant characters)
  const extractNPCs = async ({ name, from, to, asCompanion, note }) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    const logArr = fullLogRef.current;
    const lo = Math.max(0, Math.min(from, to));
    const hi = Math.min(logArr.length - 1, Math.max(from, to));
    if (!logArr.length || hi < lo) throw new Error('Invalid message range');
    if (hi - lo + 1 > 80) throw new Error(`Range too large (${hi - lo + 1} messages, max 80) — narrow it down`);

    const char = charRef.current;
    const playerName = char?.name || 'the player';
    const group = asCompanion ? 'companions' : 'npcs';
    const trimmedName = (name || '').trim();
    const existing = trimmedName
      ? Object.entries({ ...char.npcs, ...char.companions }).find(([n]) => n.toLowerCase() === trimmedName.toLowerCase())
      : null;

    const apiMsgs = logArr.slice(lo, hi + 1).map(m => ({
      role: m.role === 'dm' ? 'assistant' : 'user',
      content: m.text,
    }));

    log(`[NPC] Extracting ${trimmedName || 'all significant characters'} from messages #${lo}-#${hi} (${apiMsgs.length} msgs)`);
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
      const transcript = apiMsgs.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n');
      const existingRecord = existing ? { [existing[0]]: existing[1] } : null;
      const { found: gptFound, usage: gptUsage } = await callGptNpcManager({
        model: MODEL_CONFIGS[selectedModel].model,
        apiKey: gptKey, playerName, transcript, name: trimmedName, existing: existingRecord, note,
      });
      const gIn = gptUsage?.input_tokens || 0;
      const gOut = gptUsage?.output_tokens || 0;
      log(`[HELPER] NPC manager via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
      const names = Object.keys(gptFound || {});
      if (!names.length) { log('[NPC] Nothing found in range'); return { applied: [] }; }
      const c = { ...charRef.current, npcs: { ...charRef.current.npcs }, companions: { ...charRef.current.companions } };
      const applied = [];
      for (const [n, e] of Object.entries(gptFound)) {
        const entry = { location: String(e?.location ?? ''), relationship: String(e?.relationship ?? ''), desc: String(e?.desc ?? '') };
        const inComp = Object.keys(c.companions).find(k => k.toLowerCase() === n.toLowerCase());
        const inNpc = Object.keys(c.npcs).find(k => k.toLowerCase() === n.toLowerCase());
        if (inComp) c.companions[inComp] = { ...c.companions[inComp], ...entry };
        else if (inNpc && !asCompanion) c.npcs[inNpc] = { ...c.npcs[inNpc], ...entry };
        else if (inNpc && asCompanion) { c.companions[n] = { ...c.npcs[inNpc], ...entry }; delete c.npcs[inNpc]; }
        else c[group][n] = entry;
        applied.push(n);
      }
      updateChar(c);
      log(`[NPC] Saved: ${applied.join(', ')}`);
      return { applied };
    }
    const { found, usage: anthropicUsage } = await callAnthropicNpcManager({
      apiKey: key, playerName, messages: apiMsgs, name: trimmedName,
      existing: existing ? { [existing[0]]: existing[1] } : null, note,
    });
    if (anthropicUsage) logUsage('NPC extraction', { usage: anthropicUsage });
    const names = Object.keys(found);
    if (!names.length) { log('[NPC] Nothing found in range'); return { applied: [] }; }

    // Sanitize to the three core keys and write. If a name already exists in
    // the OTHER group, update it there instead of duplicating across groups.
    const c = { ...charRef.current, npcs: { ...charRef.current.npcs }, companions: { ...charRef.current.companions } };
    const applied = [];
    for (const [n, e] of Object.entries(found)) {
      const entry = {
        location: String(e?.location ?? ''),
        relationship: String(e?.relationship ?? ''),
        desc: String(e?.desc ?? ''),
      };
      const inComp = Object.keys(c.companions).find(k => k.toLowerCase() === n.toLowerCase());
      const inNpc  = Object.keys(c.npcs).find(k => k.toLowerCase() === n.toLowerCase());
      if (inComp)      c.companions[inComp] = { ...c.companions[inComp], ...entry };
      else if (inNpc && !asCompanion) c.npcs[inNpc] = { ...c.npcs[inNpc], ...entry };
      else if (inNpc && asCompanion)  { c.companions[n] = { ...c.npcs[inNpc], ...entry }; delete c.npcs[inNpc]; }
      else             c[group][n] = entry;
      applied.push(n);
    }
    updateChar(c);
    log(`[NPC] Saved: ${applied.join(', ')}`);
    return { applied };
  };


  // ── Town/location extraction — same pattern as extractNPCs ─────────────────
  const extractTowns = async ({ name, from, to, note }) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    const logArr = fullLogRef.current;
    const lo = Math.max(0, Math.min(from, to));
    const hi = Math.min(logArr.length - 1, Math.max(from, to));
    if (!logArr.length || hi < lo) throw new Error('Invalid message range');
    if (hi - lo + 1 > 80) throw new Error(`Range too large (${hi - lo + 1} messages, max 80) — narrow it down`);

    const char = charRef.current;
    const playerName = char?.name || 'the player';
    const trimmedName = (name || '').trim();
    const existing = trimmedName
      ? Object.entries(char.towns || {}).find(([n]) => n.toLowerCase() === trimmedName.toLowerCase())
      : null;

    const apiMsgs = logArr.slice(lo, hi + 1).map(m => ({ role: m.role === 'dm' ? 'assistant' : 'user', content: m.text }));
    log(`[TOWN] Extracting ${trimmedName || 'all significant locations'} from messages #${lo}-#${hi}`);
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
      const transcript = apiMsgs.map(m => `${m.role === 'assistant' ? 'DM' : 'PLAYER'}: ${m.content}`).join('\n\n');
      const existingRecord = existing ? { [existing[0]]: existing[1] } : null;
      const { found: gptFound, usage: gptUsage } = await callGptTownManager({
        model: MODEL_CONFIGS[selectedModel].model,
        apiKey: gptKey, playerName, transcript, name: trimmedName, existing: existingRecord, note,
      });
      const gIn = gptUsage?.input_tokens || 0;
      const gOut = gptUsage?.output_tokens || 0;
      log(`[HELPER] town manager via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
      if (!Object.keys(gptFound || {}).length) { log('[TOWN] Nothing found in range'); return { applied: [] }; }
      const c = { ...charRef.current, towns: { ...charRef.current.towns } };
      const applied = [];
      const asDict = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
      for (const [n, e] of Object.entries(gptFound)) {
        const entry = { desc: String(e?.desc ?? ''), status: String(e?.status ?? ''), notable_locations: asDict(e?.notable_locations), minor_residents: asDict(e?.minor_residents) };
        const hit = Object.keys(c.towns).find(k => k.toLowerCase() === n.toLowerCase());
        if (hit) c.towns[hit] = { ...c.towns[hit], ...entry };
        else c.towns[n] = entry;
        applied.push(n);
      }
      updateChar(c);
      log(`[TOWN] Saved: ${applied.join(', ')}`);
      return { applied };
    }
    const { found, usage: anthropicUsage } = await callAnthropicTownManager({
      apiKey: key, playerName, messages: apiMsgs, name: trimmedName,
      existing: existing ? { [existing[0]]: existing[1] } : null, note,
    });
    if (anthropicUsage) logUsage('town extraction', { usage: anthropicUsage });
    if (!Object.keys(found).length) { log('[TOWN] Nothing found in range'); return { applied: [] }; }

    const c = { ...charRef.current, towns: { ...charRef.current.towns } };
    const applied = [];
    const asDict = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
    for (const [n, e] of Object.entries(found)) {
      const entry = {
        desc: String(e?.desc ?? ''),
        status: String(e?.status ?? ''),
        notable_locations: asDict(e?.notable_locations),
        minor_residents: asDict(e?.minor_residents),
      };
      const hit = Object.keys(c.towns).find(k => k.toLowerCase() === n.toLowerCase());
      if (hit) c.towns[hit] = { ...c.towns[hit], ...entry };
      else c.towns[n] = entry;
      applied.push(n);
    }
    updateChar(c);
    log(`[TOWN] Saved: ${applied.join(', ')}`);
    return { applied };
  };

  // ── Crafting: propose, then execute ────────────────────────────────────────
  // Two-phase like a real commission. proposeCrafting() asks a dedicated call
  // what the selected materials could become and returns options WITHOUT
  // touching the save. executeCrafting() consumes the materials and creates the
  // item only after the player confirms a choice.
  // Batch cap. Making things is linear now, so this only exists to stop a
  // typo'd quantity from producing something absurd.
  const MAX_CRAFT_BATCH = 1000;

  const proposeCrafting = async ({ materials, intent, asSet, asConstruct, qty }) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    const char = charRef.current;
    if (!materials.length) throw new Error('Select at least one material');

    // Describe each material fully. For FINISHED equipment this is what the model
    // needs in order to upgrade it — without the current numbers it reconstructs
    // them from prose and silently drops or lowers stats.
    const describeMat = (m) => {
      const d = m.data || {};
      const bits = [];
      if (d.type) bits.push(`type ${d.type}`);
      if (d.slot) bits.push(`slot ${d.slot}`);
      if (d.ac !== undefined) bits.push(`ARMOUR RATING ac ${d.ac}${d.dexBonus === false ? ' (heavy)' : d.maxDex != null ? ` (max dex ${d.maxDex})` : ''}`);
      if (d.damage) bits.push(`damage ${d.damage}${d.bonus ? `+${d.bonus}` : ''}`);
      if (Array.isArray(d.extras) && d.extras.length) bits.push(`extra damage ${d.extras.map(e => `${e.dice} ${e.type}`).join(' + ')}`);
      if (d.bonuses && Object.keys(d.bonuses).length) bits.push(`CURRENT BONUSES ${Object.entries(d.bonuses).map(([k, v]) => `${k}:${v}`).join(',')}`);
      if (d.label) bits.push(`"${d.label}"`);
      return `NAME: ${m.name} | HAVE: ${m.count}${bits.length ? ` | ${bits.join(' | ')}` : ''}`;
    };
    const matList = materials.map(describeMat).join('\n');
    const batchN = Math.max(1, Math.min(MAX_CRAFT_BATCH, parseInt(qty, 10) || 1));
    log(`[CRAFT] Proposing ${batchN > 1 ? `${batchN}x ` : ''}${asConstruct ? 'CONSTRUCTS' : asSet ? 'matched SETS' : 'items'} from ${materials.length} material stacks`);
    let parsed;
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
      const { parsed: gptParsed, usage: gptUsage } = await callGptCrafting({
        model: MODEL_CONFIGS[selectedModel].model,
        apiKey: gptKey,
        materialsText: matList,
        characterLevel: char.level,
        intent,
        asSet,
        asConstruct,
        quantity: batchN,
      });
      parsed = gptParsed;
      const gIn = gptUsage?.input_tokens || 0;
      const gOut = gptUsage?.output_tokens || 0;
      log(`[HELPER] crafting via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
    } else {
      const { parsed: anthropicParsed, usage: anthropicUsage } = await callAnthropicCrafting({
        apiKey: key, materialsText: matList, characterLevel: char.level, intent,
        asSet, asConstruct, quantity: batchN,
      });
      parsed = anthropicParsed;
      if (anthropicUsage) logUsage('crafting', { usage: anthropicUsage });
    }
    // Bonuses may come back as a string ("ac:2"), an object ({ac:2}) or an
    // array. Normalise to the string form the tag builder and parser expect —
    // an object silently stringified to "[object Object]" and the piece ended
    // up with no bonuses at all.
    const normBonuses = (b) => {
      if (!b) return '';
      if (typeof b === 'string') return b;
      if (Array.isArray(b)) return b.map(normBonuses).filter(Boolean).join(',');
      if (typeof b === 'object') {
        return Object.entries(b)
          .filter(([, v]) => v !== null && v !== undefined && v !== '')
          .map(([k, v]) => `${k}:${v}`).join(',');
      }
      return String(b);
    };
    // The model occasionally invents a component — often a name it read inside
    // another item's description. Check every option against what the player
    // actually holds NOW, and mark the ones that cannot be made, rather than
    // letting them fail only after being chosen.
    const heldNow = materialSources(charRef.current);
    const heldKeys = Object.keys(heldNow);
    const validate = (o) => {
      const missing = (o.consumes || []).map(m => {
        const resolved = resolveHeldName(m.name, heldKeys);
        const have = totalHeld(heldNow[resolved]);
        return have < (m.count || 1) ? `${m.name} (need ${m.count || 1}, have ${have})` : null;
      }).filter(Boolean);
      return missing.length ? { ...o, unavailable: missing } : o;
    };
    const normOpt = (o) => validate({ ...o, bonuses: normBonuses(o.bonuses) });
    if (asConstruct) {
      const list = (parsed.options || []).filter(o => o?.name).map(o => validate({ ...o, isConstruct: true }));
      if (!list.length) throw new Error('Nothing could be forged from those materials');
      log(`[CRAFT] ${list.length} constructs proposed: ${list.map(o => o.name).join(', ')}`);
      return list;
    }
    const options = (parsed.options || []).filter(o => o?.name).map(o => (
      asSet && Array.isArray(o.pieces)
        ? { ...o, pieces: o.pieces.filter(pc => pc?.name).map(normOpt) }
        : normOpt(o)
    ));
    if (!options.length) throw new Error('Nothing could be made from those materials');
    log(`[CRAFT] ${options.length} options proposed: ${options.map(o => o.name).join(', ')}`);
    return options;
  };

  // Build the [ITEM:] tag for a chosen option and apply it, then remove the
  // consumed materials. Reuses applyEffects so the item goes through the exact
  // same parser as DM-granted loot.
  // ── Arc objectives ─────────────────────────────────────────────────────────
  // A rough homebrew campaign skeleton for the current antagonist, shaped by the
  // character's disposition so the goals fit who they actually are.
  const generateObjectives = async (antagonist) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    const c = charRef.current;
    if (!antagonist) throw new Error('No antagonist to build a campaign around');
    const dp = c.disposition || {};
    const dpLines = [
      dp.alignment && `Alignment: ${dp.alignment}`,
      dp.cares && `Cares about: ${dp.cares}`,
      dp.indifferent && `Indifferent to: ${dp.indifferent}`,
      dp.methods && `Solves problems by: ${dp.methods}`,
      dp.lines && `Will not: ${dp.lines}`,
    ].filter(Boolean).join('\n');

    log(`[ARC] Generating goal + first objective for: ${antagonist}`);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 700,
        system: `You set up a Dungeons & Dragons story arc. You produce exactly two things: the arc's GOAL, and the FIRST objective toward it. Later objectives are written during play in response to what actually happens — do not plan them.

GOAL: one sentence naming what finishing this arc means. It must arise from THIS antagonist specifically — what it is doing, what it wants, and what actually stops it. A goal that could be pasted onto any other antagonist is wrong.
  MOST GOALS HAVE NO COUNT. Only include a number when the antagonist's own nature supplies one — twelve sealed vaults, a coven of three hags, four bridges into the city. Do NOT invent a count to make the goal look measurable: "seize four trade routes" or "reclaim seven revenue nodes" bolted onto a dragon or a mind flayer cell is exactly the failure to avoid. If the arc ends in one confrontation, one discovery, or one thing destroyed, say that plainly.
  Good, no count: "Find out what is emptying the minds of the dock district and put a stop to it." "Kill the thing in the deep mine before it finishes waking." "Break whatever hold has been taken over the city watch."
  Good, count justified by the antagonist: "Destroy all three of the coven's hags — killing fewer only makes the survivors stronger."
  The goal may reference the antagonist obliquely but must NOT name them — they are hidden from the player.

FIRST OBJECTIVE: one sentence, concrete and checkable, something the player can act on immediately from where they are now. Not vague ("learn about the cult"), not the whole arc in one line.

SHAPE BOTH TO THIS CHARACTER. They must be things THIS person would pursue for their own reasons. Do not assume heroism; do not build a rescue-the-innocent plot for someone indifferent to innocents. If they care about profit and power, the goal is about profit and power — the antagonist becomes their problem because of what it costs them.

Respond with ONLY valid JSON, no prose, no markdown fences: { "goal": "...", "objective": "..." }`,
        messages: [{ role: 'user', content: `HIDDEN ANTAGONIST: ${antagonist}\n\nPLAYER: ${c.name}, level ${c.level}${c.cls?.name ? `, ${c.cls.name}` : ''}. Currently in ${c.currentLocation || 'the Sword Coast'}.\n${dpLines ? `\nWHO THEY ARE:\n${dpLines}\n` : ''}${c.bio ? `\nBACKGROUND: ${c.bio.slice(0, 600)}\n` : ''}\nRespond with ONLY the JSON now.` }],
      }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    logUsage('arc objectives', data);
    const raw = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(raw); } catch {
      const cut = data.stop_reason === 'max_tokens' || !/[}\]]\s*$/.test(raw);
      throw new Error(cut ? 'The reply was cut off — try again' : 'Arc generation returned unreadable JSON — try again');
    }
    const goal = String(parsed.goal || '').trim();
    const first = String(parsed.objective || '').trim();
    if (!goal && !first) throw new Error('Nothing generated — try again');
    const objectives = first ? [{ text: first, done: false }] : [];
    updateChar({ ...charRef.current, arc: { ...(charRef.current.arc || {}), antagonist, goal, objectives } });
    log(`[ARC] Goal: ${goal}`);
    return { goal, objectives };
  };

  // Bags keep their contents on the bag definition in the single item registry.
  // A bag's physical stack determines whether those contents count as inventory
  // or stash for crafting/salvage filters.
  const materialSources = (c) => {
    const src = {};
    const bump = (nm, key, n) => {
      src[nm] = src[nm] || { inv: 0, stash: 0, bags: [] };
      if (key === 'bags') src[nm].bags.push(n); else src[nm][key] += n;
    };
    Object.entries(stackCounts(c.inventory)).forEach(([nm, qty]) => bump(nm, 'inv', qty));
    Object.entries(stackCounts(c.stash)).forEach(([nm, qty]) => bump(nm, 'stash', qty));
    Object.entries(c.items || {}).forEach(([bagName, d]) => {
      if (d?.type !== 'bag' || !d.contents) return;
      const bagStore = stackHas(c.stash, bagName) && !stackHas(c.inventory, bagName) ? 'stash' : 'inventory';
      Object.entries(d.contents).forEach(([item, count]) => {
        if (count > 0) bump(item, 'bags', { bag: bagName, store: bagStore, count });
      });
    });
    return src;
  };
  const totalHeld = (s) => (s ? s.inv + s.stash + s.bags.reduce((a, b) => a + b.count, 0) : 0);

  // Resolve a material name returned by the model back to an item the player
  // actually holds. Models sometimes echo the descriptive form ("Iron Ingot
  // (dwarven)") or a quantity suffix; match exactly first, then progressively
  // looser, so a formatting slip doesn't fail an otherwise valid craft.
  // Canonicalise names before comparing model output to held inventory. Models
  // frequently swap straight and curly apostrophes (Knight's vs Knight’s), and
  // may vary whitespace/case. Preserve the player's exact held spelling once a
  // match is found so downstream inventory/stash/bag operations still use the
  // real item key.
  const canonicalItemName = (name) => String(name || '')
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u02BC\uFF07]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const resolveHeldName = (wanted, held) => {
    const w = (wanted || '').trim();
    const exact = held.find(h => canonicalItemName(h) === canonicalItemName(w));
    if (exact) return exact;
    const stripped = w.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+x\d+$/i, '').trim();
    const strippedKey = canonicalItemName(stripped);
    const onStripped = held.find(h => canonicalItemName(h) === strippedKey);
    if (onStripped) return onStripped;
    // longest held name that the requested string begins with (handles a
    // trailing description appended without brackets)
    const prefix = held
      .filter(h => strippedKey.startsWith(canonicalItemName(h)))
      .sort((a, b) => b.length - a.length)[0];
    return prefix || w;
  };

  // Consume materials across all three stores. Returns { removeTags, apply } —
  // inventory removals go through [REMOVE:] tags so the normal item pipeline
  // handles them; stash and bag contents are edited directly afterwards.
  const consumeMaterials = (c, consumes) => {
    const src = materialSources(c);
    const stashTakes = [];
    const bagTakes = [];
    const removeTags = consumes.map(m => {
      let need = m.count || 1;
      const s = src[m.name] || { inv: 0, stash: 0, bags: [] };
      const fromInv = Math.min(need, s.inv); need -= fromInv;
      const fromStash = Math.min(need, s.stash); need -= fromStash;
      if (fromStash > 0) stashTakes.push({ name: m.name, count: fromStash });
      for (const b of s.bags) {
        if (need <= 0) break;
        const take = Math.min(need, b.count); need -= take;
        bagTakes.push({ ...b, name: m.name, take });
      }
      return fromInv > 0 ? `[REMOVE: ${m.name}${fromInv > 1 ? ` | qty:${fromInv}` : ''}]` : '';
    }).join('');

    const apply = (next) => {
      if (stashTakes.length) {
        for (const t of stashTakes) next = { ...next, stash: takeStack(next.stash, t.name, t.count).stacks };
      }
      for (const t of bagTakes) {
        const items = { ...(next.items || {}) };
        const bag = items[t.bag];
        if (!bag?.contents) continue;
        const contents = { ...bag.contents };
        contents[t.name] = (contents[t.name] || 0) - t.take;
        if (contents[t.name] <= 0) delete contents[t.name];
        items[t.bag] = { ...bag, contents };
        next = { ...next, items };
      }
      // [REMOVE:] can only see inventory at parse time. Stash/bag consumption
      // happens here afterwards, so prune definitions only after every source
      // has actually been updated.
      return pruneDeadItemDefinitions(next);
    };
    return { removeTags, apply, bagTakes };
  };

  const executeCrafting = (option) => {
    const c = charRef.current;
    // The proposal already allocated materials across the whole batch, so the
    // consumes list is the total — take it as given and just make `count` copies.
    const batch = Math.max(1, Math.min(MAX_CRAFT_BATCH, parseInt(option.count, 10) || 1));
    // Materials can come from inventory OR stash. Count both, verify the player
    // still holds enough (guards a stale panel), then consume inventory first
    // and take the remainder from the stash.
    const src = materialSources(c);
    // Normalise every requested material to a name the player actually holds
    const consumes = (option.consumes || []).map(m => ({ ...m, name: resolveHeldName(m.name, Object.keys(src)), count: m.count || 1 }));
    for (const m of consumes) {
      const held = totalHeld(src[m.name]);
      if (held < m.count) throw new Error(`Not enough ${m.name} — need ${m.count}, have ${held}`);
    }
    // Build the [ITEM:] tag for one piece (also used for single items).
    const tagFor = (o) => {
      if (o.type === 'weapon') {
        return `[ITEM: ${o.name} | weapon | ${o.damage || '1d6'} | | melee | ${o.label || ''}${o.bonuses ? ` | ${o.bonuses}` : ''}]`;
      }
      if (o.type === 'armor') {
        const dexBonus = o.heavy === true || o.heavy === 'true' ? 'false' : 'true';
        const maxDex = (o.maxDex === null || o.maxDex === undefined || o.maxDex === '') ? 'null' : o.maxDex;
        return `[ITEM: ${o.name} | armor | ${o.ac || 13} | ${dexBonus} | ${maxDex} | ${o.label || ''}${o.bonuses ? ` | ${o.bonuses}` : ''}]`;
      }
      if (o.type === 'construct') {
        return `[ITEM: ${o.name} | construct | ${o.status || 'dormant'} | ${o.label || ''}]`;
      }
      if (o.type === 'consumable') {
        return `[ITEM: ${o.name} | consumable | ${o.label || ''}]`;
      }
      if (o.type === 'misc') {
        return `[ITEM: ${o.name} | misc | ${o.label || ''}]`;
      }
      return `[ITEM: ${o.name} | magic | ${o.slot || 'neck'} | ${o.bonuses || ''} | ${o.label || ''}]`;
    };
    // A construct becomes a COMPANION record, not an item — it is an entity the
    // player commands, and companions already carry description, abilities,
    // status, equipment slots and location tiering.
    if (option.isConstruct) {
      const { removeTags: rmTags, apply: applyTakes } = consumeMaterials(c, consumes);
      let next = applyTakes(applyEffects(rmTags, c));
      // Every construct becomes a COMPANION, and companions are sent to the DM
      // in full — name, description, abilities — inside the cached prompt block.
      // A thousand would be ruinous, so constructs get their own much lower cap.
      const MAX_CONSTRUCTS = 25;
      const made_n = Math.min(batch, MAX_CONSTRUCTS);
      if (made_n < batch) log(`[CRAFT] ${batch} constructs requested — capped at ${MAX_CONSTRUCTS}, since each becomes a companion sent to the DM every turn.`);
      const roman = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];
      const entry = {
        race: option.race || 'construct',
        role: option.role || 'war construct',
        appearance: option.appearance || '',
        abilities: option.abilities || '',
        desc: option.desc || '',
        status: `dormant — CR ${option.cr || '?'}, awaiting its command word`,
        relationship: 'a construct the player forged and commands',
        location: '',
      };
      // Companions are keyed by name, so a batch needs distinct keys.
      const companions = { ...(next.companions || {}) };
      const made = [];
      for (let i = 0; i < made_n; i++) {
        let nm = `${option.name}${roman[i] !== undefined ? roman[i] : ` ${i + 1}`}`;
        while (companions[nm]) nm = `${nm}'`;
        companions[nm] = { ...entry };
        made.push(nm);
      }
      next = { ...next, companions };
      updateChar(next);
      log(`[CRAFT] Forged ${batch > 1 ? `${batch}x ` : ''}construct "${option.name}" (CR ${option.cr || '?'}); consumed ${consumes.map(m => `${m.name} x${m.count}`).join(', ') || 'nothing'}`);
      return `${made.join(', ')} — added to your companions`;
    }

    // A set creates every piece from one craft; the materials are consumed once.
    const isSet = Array.isArray(option.pieces) && option.pieces.length > 0;
    const withQty = (tag, qty) => qty > 1 ? tag.replace(/]$/, ` | qty:${qty}]`) : tag;
    const tag = isSet
      ? option.pieces.map(piece => withQty(tagFor(piece), batch)).join('')
      : withQty(tagFor(option), batch);

    const { removeTags, apply, bagTakes } = consumeMaterials(c, consumes);
    log(`[CRAFT TAG] ${tag}`);
    let next = apply(applyEffects(tag + removeTags, c));
    if (bagTakes.length) log(`[CRAFT] Drew from bags: ${bagTakes.map(b => `${b.name} x${b.take} from ${b.bag}`).join(', ')}`);

    // Verify the craft actually produced something. Materials are consumed in
    // the same call, so a silent failure here costs the player the materials
    // and gives nothing back — say so loudly rather than appearing to work.
    const wanted = isSet ? option.pieces.map(pc => pc.name) : [option.name];
    // Compare against the inventory that would remain AFTER consuming materials.
    // An upgrade may intentionally consume an item and recreate it with the SAME
    // name. Comparing raw before/after counts makes 1 consumed -> 1 forged look
    // like no item was created (1 -> 1), even though the replacement is valid.
    // consumeMaterials takes inventory first, so subtract only the same-name
    // quantity that would actually have been removed from inventory here.
    const consumedByName = consumes.reduce((acc, m) => {
      acc[m.name] = (acc[m.name] || 0) + (m.count || 1);
      return acc;
    }, {});
    const expectedMade = isSet
      ? wanted.reduce((acc, n) => ({ ...acc, [n]: (acc[n] || 0) + batch }), {})
      : { [option.name]: batch };
    const failures = wanted.filter(n => {
      const beforeInv = stackCount(c.inventory, n);
      const consumedFromInv = Math.min(beforeInv, consumedByName[n] || 0);
      const postConsumeBaseline = beforeInv - consumedFromInv;
      const afterInv = stackCount(next.inventory, n);
      return afterInv < postConsumeBaseline + (expectedMade[n] || 0);
    });
    if (failures.length) {
      log(`[CRAFT] FAILED: expected crafted item(s) missing: ${failures.join(', ')}. Tag was: ${tag.slice(0, 300)}`);
      throw new Error(`The forge produced nothing usable — materials NOT consumed. Try again, or reword the item.`);
    }
    const before = wanted.reduce((sum, n) => sum + stackCount(c.inventory, n), 0);
    const after = wanted.reduce((sum, n) => sum + stackCount(next.inventory, n), 0);
    log(`[CRAFT] Inventory ${before} -> ${after} of "${wanted.join(', ')}" (same-name upgrades allowed)`);
    updateChar(next);
    const madeDesc = `${batch > 1 ? `${batch}x ` : ''}${isSet ? `${option.name} (${option.pieces.length} pieces)` : option.name}`;
    log(`[CRAFT] Made ${madeDesc}; consumed ${consumes.map(m => `${m.name} x${m.count || 1}`).join(', ') || 'nothing'}`);
    return isSet ? `${option.name} — ${option.pieces.map(pc => pc.name).join(', ')}` : option.name;
  };

  // ── Inventory consolidation: intentionally erase distinctions between stacks ─
  const proposeConsolidation = async ({ items }) => {
    if (!items?.length) throw new Error('Select at least two stacks');
    const selected = new Map(items.map(x => [x.name, Math.max(1, Number(x.count) || 1)]));
    const itemsText = items.map(x => `${x.name} x${x.count}`).join('\n');
    let rawGroups = [];
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
      const out = await callGptConsolidate({ model: MODEL_CONFIGS[selectedModel].model, apiKey: gptKey, itemsText });
      rawGroups = out.groups || [];
      const u = out.usage || {};
      log(`[HELPER] smart grouping via GPT ${(u.input_tokens || 0).toLocaleString()} in / ${(u.output_tokens || 0).toLocaleString()} out`);
    } else {
      const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
      const out = await callAnthropicConsolidate({ apiKey: key, itemsText });
      rawGroups = out.groups || [];
      if (out.usage) logUsage('smart grouping', { usage: out.usage });
    }

    const used = new Set();
    const groups = [];
    for (const g of rawGroups) {
      const members=[];
      for (const it of g.items || []) {
        const exact=[...selected.keys()].find(n=>canonicalItemName(n)===canonicalItemName(it.name));
        if(!exact || used.has(exact)) continue;
        const count=Math.min(selected.get(exact),Math.max(1,Number(it.count)||1));
        members.push({name:exact,count}); used.add(exact);
      }
      if(members.length>=2 && String(g.name||'').trim()) groups.push({name:String(g.name).trim(),items:members,reason:String(g.reason||'').trim()});
      else members.forEach(x=>used.delete(x.name));
    }
    log(`[CONSOLIDATE] Smart grouping proposed ${groups.length} group(s)`);
    return groups;
  };

  const executeConsolidation = ({ items, name, destination='stash' }) => {
    const c=charRef.current;
    const finalName=String(name||'').trim();
    if(!finalName) throw new Error('Result name required');
    if(!items?.length) throw new Error('Nothing selected');
    const src=materialSources(c);
    const heldNames=Object.keys(src);
    const consumes=items.map(it=>({ name:resolveHeldName(it.name,heldNames), count:Math.max(1,Number(it.count)||1) }));
    for(const it of consumes){const have=totalHeld(src[it.name]);if(have<it.count)throw new Error(`Not enough ${it.name} — need ${it.count}, have ${have}`);}
    const total=consumes.reduce((n,x)=>n+x.count,0);
    const {removeTags,apply}=consumeMaterials(c,consumes);
    let next=apply(applyEffects(removeTags,c));
    if(destination==='inventory') next={...next,inventory:addStack(next.inventory,finalName,total)};
    else next={...next,stash:addStack(next.stash,finalName,total)};
    updateChar(next);
    log(`[CONSOLIDATE] ${consumes.map(x=>`${x.name} x${x.count}`).join(', ')} -> ${finalName} x${total} (${destination})`);
    return `${finalName} ×${total.toLocaleString()} → ${destination}`;
  };

  // ── Salvage: break an item down into materials ────────────────────────────
  // The inverse of crafting, same two-phase shape. Recovery is deliberately
  // LOSSY — you never get back everything that went in, so craft->salvage->craft
  // can't be farmed into infinite materials.
  const proposeDismantle = async ({ items }) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    const char = charRef.current;
    if (!items.length) throw new Error('Select something to break down');

    const db = char.items || {};
    const itemList = items.map(it => {
      const d = db[it.name];
      const bits = [];
      if (d?.type) bits.push(d.type);
      if (d?.damage) bits.push(`damage ${d.damage}${d.bonus ? `+${d.bonus}` : ''}`);
      if (d?.ac) bits.push(`AC ${d.ac}`);
      if (d?.bonuses && Object.keys(d.bonuses).length) bits.push(Object.entries(d.bonuses).map(([k, v]) => `${k}:${v}`).join(','));
      if (d?.label) bits.push(d.label);
      return `${it.name}${it.count > 1 ? ` x${it.count}` : ''}${bits.length ? ` — ${bits.join('; ')}` : ''}`;
    }).join('\n');

    log(`[SALVAGE] Proposing breakdown of ${items.length} item(s)`);
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') {
      const gptKey = openAiApiKey || import.meta.env.VITE_OPENAI_KEY;
      const { result: gptResult, usage: gptUsage } = await callGptSalvage({
        model: MODEL_CONFIGS[selectedModel].model,
        apiKey: gptKey,
        itemsText: itemList,
      });
      const gIn = gptUsage?.input_tokens || 0;
      const gOut = gptUsage?.output_tokens || 0;
      log(`[HELPER] salvage via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
      log(`[SALVAGE] Recovers: ${(gptResult.recovers || []).map(r => `${r.name} x${r.count}`).join(', ') || 'nothing'}`);
      return gptResult;
    }
    const { result, usage: anthropicUsage } = await callAnthropicSalvage({ apiKey: key, itemsText: itemList });
    if (anthropicUsage) logUsage('salvage', { usage: anthropicUsage });
    log(`[SALVAGE] Recovers: ${(result.recovers || []).map(r => `${r.name} x${r.count}`).join(', ') || 'nothing'}`);
    return result;
  };

  // Consume the submitted items (inventory first, then stash) and add whatever
  // was recovered. Mirrors executeCrafting's split-source handling.
  const executeDismantle = (result, submitted, destination = 'inventory') => {
    const c = charRef.current;
    const src = materialSources(c);
    for (const it of submitted) {
      const held = totalHeld(src[it.name]);
      if (held < it.count) throw new Error(`Not enough ${it.name} (have ${held}, need ${it.count})`);
    }

    const addTags = (result.recovers || [])
      .map(r => `[ITEM: ${r.name}${(r.count || 1) > 1 ? ` | qty:${r.count}` : ''}]`)
      .join('');
    const { removeTags, apply } = consumeMaterials(c, submitted);
    let next = apply(applyEffects(addTags + removeTags, c));
    if (destination === 'stash') {
      for (const recovered of result.recovers || []) {
        const count = Math.max(1, Number(recovered.count) || 1);
        next = {
          ...next,
          inventory: takeStack(next.inventory, recovered.name, count).stacks,
          stash: addStack(next.stash, recovered.name, count),
        };
      }
    }
    updateChar(next);
    log(`[SALVAGE] Broke down ${submitted.map(i => `${i.name} x${i.count}`).join(', ')}; recovery -> ${destination}`);
    return (result.recovers || []).map(r => `${r.name} x${r.count || 1}`).join(', ') || 'nothing';
  };

  // The player marks the current objective complete. The DM proved unreliable at
  // noticing, so this moves the trigger to the person who actually knows. Marks
  // it immediately and queues a note so the next turn opens with the DM being
  // told to acknowledge it and set the next step.
  const completeCurrentObjective = () => {
    const c = charRef.current;
    const objs = Array.isArray(c.arc?.objectives) ? c.arc.objectives : [];
    const idx = objs.findIndex(o => !o.done);
    if (idx === -1) return;
    const text = objs[idx].text;
    updateChar({ ...c, arc: { ...c.arc, objectives: objs.map((o, i) => i === idx ? { ...o, done: true } : o) } });
    objectiveNoteRef.current = `\n\n[SYSTEM: The player has marked objective ${idx + 1} ("${text}") COMPLETE. Acknowledge it naturally in the narration — do not announce it as a checklist item — and set the next step toward the arc GOAL this message with [OBJECTIVE: ...]. Do not emit [OBJECTIVE DONE:] for it; it is already recorded.]`;
    log(`[ARC] Player marked objective ${idx + 1} complete: ${text}`);
  };

  // Remove a foe from the defeated ledger — they become rollable again. In the
  // Realms very little stays dead, so this is a normal thing to want.
  const reviveAntagonist = (name) => {
    const c = charRef.current;
    updateChar({ ...c, defeatedAntagonists: (c.defeatedAntagonists || []).filter(d => d !== name) });
    log(`[ARC] ${name} removed from the defeated ledger — rollable again`);
  };

  // Remove an Adventure from the completed ledger so it becomes rollable again.
  // Like defeated foes, this list is history/shuffle control only and is never
  // sent to the DM.
  const restoreAdventure = (title) => {
    const c = charRef.current;
    updateChar({
      ...c,
      completedAdventures: (c.completedAdventures || []).filter(a => (typeof a === 'string' ? a : a?.title) !== title),
    });
    log(`[ADVENTURE] ${title} removed from completed ledger — rollable again`);
  };

  // Promote a construct ITEM into a companion record. Only worth doing for
  // actual entities — a spare arcane core is a component and belongs in the
  // inventory. Carries the label across as the description and removes the item.
  const promoteConstructToCompanion = (name) => {
    const c = charRef.current;
    const store = c.items?.[name] ? 'items' : null;
    if (!store) return;
    const d = c[store][name];
    if (d?.type !== 'construct') return;
    if (c.companions?.[name]) { log(`[CONSTRUCT] "${name}" is already a companion`); return; }

    const entry = {
      race: 'construct',
      role: 'a construct the player forged and commands',
      desc: d.label || '',
      abilities: '',
      status: `${d.status || 'dormant'} — awaiting its command word`,
      relationship: 'forged and bound by the player',
      location: '',
    };
    const nextStore = { ...c[store] };
    delete nextStore[name];
    const inventory = takeStack(c.inventory, name, stackCount(c.inventory, name)).stacks;
    const stash = takeStack(c.stash, name, stackCount(c.stash, name)).stacks;
    updateChar({ ...c, [store]: nextStore, inventory, stash,
      companions: { ...(c.companions || {}), [name]: entry } });
    log(`[CONSTRUCT] Promoted "${name}" to a companion`);
  };

  // Cycle a construct's status: dormant -> active -> bound -> dormant.
  // Works whether the construct is carried or stashed.
  const cycleConstructStatus = (name) => {
    const c = charRef.current;
    const ORDER = ['dormant', 'active', 'bound'];
    const store = c.items?.[name] ? 'items' : null;
    if (!store) return;
    const item = c[store][name];
    if (item?.type !== 'construct') return;
    const next = ORDER[(ORDER.indexOf(item.status || 'dormant') + 1) % ORDER.length];
    updateChar({ ...c, [store]: { ...c[store], [name]: { ...item, status: next } } });
    log(`[CONSTRUCT] ${name} -> ${next}`);
  };

  // Shared write path for the NPC edit panel (Feature 3) and manual adds.
  const saveNPCEntry = (group, name, entry, originalName = null) => {
    const c = { ...charRef.current, npcs: { ...charRef.current.npcs }, companions: { ...charRef.current.companions }, towns: { ...charRef.current.towns } };
    if (originalName && originalName !== name) delete c[group][originalName];
    c[group][name] = entry;
    updateChar(c);
    log(`[NPC] ${originalName && originalName !== name ? `Renamed ${originalName} -> ` : 'Saved '}${name} (${group})`);
  };
  const deleteNPCEntry = (group, name) => {
    const c = { ...charRef.current, npcs: { ...charRef.current.npcs }, companions: { ...charRef.current.companions }, towns: { ...charRef.current.towns } };
    delete c[group][name];
    updateChar(c);
    log(`[NPC] Deleted ${name} (${group})`);
  };

  const buildApiHistory = (overrideMsgs = null) => {
    const rawSummary = storySummaryRef.current;
    const base = overrideMsgs ?? fullLogRef.current;
    // Window = everything AFTER the point summaries already cover. This closes
    // the gap where messages could fall out of the sliding window before being
    // summarized, and makes the window append-only between summarizations so
    // the message-prefix cache actually gets hits instead of paying write cost
    // every turn. Guard: always send at least the last KEEP_RECENT messages.
    const coveredCount = Math.max(0, lastSummarizedAt.current - KEEP_RECENT);
    const start = Math.min(coveredCount, Math.max(0, base.length - KEEP_RECENT));
    const source = base.slice(start);
    const apiMsgs = source.map(m => ({
      role: m.role === 'dm' ? 'assistant' : 'user',
      content: m.text,
    }));
    if (!rawSummary) return apiMsgs;
    const summaryObj = parseSummary(rawSummary);
    const formatted = formatSummaryForApi(summaryObj);
    if (!formatted) return apiMsgs;
    return [
      { role: 'user',      content: `[CAMPAIGN HISTORY — read in order before continuing]\n\n${formatted}` },
      { role: 'assistant', content: 'Understood. I have read the full campaign history in order and will continue the story from the current point.' },
      ...apiMsgs,
    ];
  };

  const handleSend = async (userMsg, historyOverride = null) => {
    setLoading(true);
    setApiError('');
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    // Detect "please continue" — skip attack context, inject resume instruction
    const isContinue = /^\s*(please\s+)?(continue|finish|go on|keep going|finish the scene|resume|you got cut off|message got cut off|got cut off|finish the story|finish that|finish your)\b/i.test(userMsg.trim());

    // Build attack context if player is attacking (skip for continue requests)
    const { context: actionCtx, rollResult: actionRoll } = isContinue
      ? { context: '', rollResult: null }
      : buildActionContext(userMsg, log);

    // ── Encounter clock ──────────────────────────────────────────────────────
    // The app decides WHEN an encounter fires and WHAT it is; the DM only narrates.
    // Skips turns where the player is already attacking (don't stack chaos).
    let encounterCtx = '';
    if (!isContinue && !actionCtx) {
      const chance = encounterChance(turnsSinceEncounter.current, charRef.current.pacing || 'normal');
      if (chance > 0 && Math.random() < chance) {
        const enc = rollEncounterDirective(charRef.current);
        encounterCtx = enc.directive;
        log(`[ENCOUNTER] Fired after ${turnsSinceEncounter.current} turns (${enc.type}${enc.arcTied ? ', arc-tied' : ''}): ${enc.desc}`);
        turnsSinceEncounter.current = 0;
      } else {
        turnsSinceEncounter.current += 1;
      }
    } else if (!isContinue) {
      turnsSinceEncounter.current += 1;
    }

    const continuePrefix = isContinue
      ? '[Your previous response was cut off mid-sentence. Continue EXACTLY where you left off — do not restart or summarize the scene, just resume the prose from where it ended.]\n\n'
      : '';

    const objectiveCtx = objectiveNoteRef.current;
    objectiveNoteRef.current = '';
    const adv = charRef.current.adventure;
    const adventureCtx = adv
      ? `\n\n[ACTIVE ADVENTURE — BACKGROUND SITUATION]\nTITLE: ${adv.title}\nPREMISE: ${adv.premise}\nSTARTING CONTEXT: ${adv.location || ''}\n\nThis is the current story driver, but it is NOT the player's mandatory immediate objective. Introduce or advance it only when organic. It may sit dormant through unrelated conversations, shopping, crafting, travel activities, romance, social scenes, exploration, or player-chosen tangents. NEVER interrupt an active interaction merely to pull the player back to this Adventure. Do not repeatedly remind them it exists. Once the player engages, let their choices determine its pace and shape. Do not force a villain, combat, or predetermined solution.\n\nWhen the situation has ACTUALLY reached a natural resolution, emit [ADVENTURE COMPLETE] exactly once. Do not emit it merely because the player walks away, delays it, or changes subjects.`
      : '';
    const outgoing = continuePrefix + userMsg + actionCtx + encounterCtx + objectiveCtx + adventureCtx;

    const history = buildApiHistory(historyOverride);

    log(`[API] Sending: ${history.length} history messages (summary: ${storySummaryRef.current ? 'yes' : 'no'}, fullLog: ${fullLogRef.current.length})`);

    addMessage({ role:'user', text:userMsg, id:Date.now() });

    // Check if we should auto-summarize (based on full log length)
    const allMsgs = fullLogRef.current;
    if (allMsgs.length >= SUMMARIZE_AFTER) {
      maybeAutoSummarize(allMsgs); // fire-and-forget, don't await
    }

    try {
      const modelConfig = MODEL_CONFIGS[selectedModel];
      const system = selectedModel === 'haiku'
        ? buildSystemPrompt(charRef.current)
        : selectedModel === 'sonnet'
        ? buildSystemPromptSonnet(charRef.current)
        : selectedModel === 'terra'
        ? buildSystemPromptTerra(charRef.current)
        : buildSystemPromptSol(charRef.current);
      const { text: dmText, usage: dmUsage } = await callDM(
        [...history, { role:'user', content: outgoing }],
        system,
        modelConfig,
        signal,
        log,
        recordPrompt
      );
      if (dmUsage) setTokenUsage(dmUsage);
      armCacheTimer();

      // Check if DM requested a skill roll — intercept and roll it
      const { resultText, rollResult: skillRoll } = interceptRollRequest(dmText, charRef.current, log);
      let finalText = dmText;
      // Player-initiated attacks belong on the final DM response. A DM-requested
      // roll belongs on the setup message that actually requested it.
      let finalRoll = actionRoll || null;
      let rollSetupText = '';

      // If DM requested a roll, send the result back for narration
      if (resultText) {
        // Surface the DM's pre-roll message (the setup that called the roll) in the
        // feed — otherwise the player only sees post-roll narration and the scene
        // looks like it jumped mid-action. Strip the [ROLL:] tag from the display.
        const setupText = dmText.replace(/\[ROLL:[^\]]*\]/gi, '').trim();
        if (setupText) {
          rollSetupText = setupText;
          addMessage({ role:'dm', text: setupText, id: Date.now() - 1, roll: skillRoll || null });
        } else if (skillRoll) {
          // Bare [ROLL:] requests have no visible setup message, so keep the
          // result on the follow-up narration rather than dropping it.
          finalRoll = skillRoll;
        }
        const { text: followUp, usage: followUpUsage } = await callDM(
          [...history,
           { role:'user', content: outgoing },
           { role:'assistant', content: dmText },
           { role:'user', content: resultText }
          ],
          system,
          modelConfig,
          signal,
          log
        );
        if (followUpUsage) setTokenUsage(followUpUsage);
        armCacheTimer();
        finalText = followUp;
      }

      // Log XP gains
      const xpMatch = finalText.match(/\[XP:\s*\+?(\d+)\]/i);
      if (xpMatch) log(`[XP] +${xpMatch[1]} XP gained`);

      // Log items gained
      const itemMatches = [...finalText.matchAll(/\[ITEM:\s*([^\]|]+)/gi)];
      itemMatches.forEach(m => log(`[ITEM] ${m[1].trim()} added`));

      // Log damage taken
      const dmgMatch = finalText.match(/\[DAMAGE:\s*(\d+)\]/i);
      if (dmgMatch) log(`[DAMAGE] ${dmgMatch[1]} damage taken`);

      // A roll request causes a second DM response. State-change tags in the
      // pre-roll setup used to be lost because only the follow-up narration was
      // passed through applyEffects(). Preserve every non-roll setup tag and
      // apply it exactly once together with the follow-up effects.
      const effectsText = resultText
        ? `${dmText.replace(/\[ROLL:[^\]]*\]/gi, '')}\n${finalText}`
        : finalText;

      let newChar = applyEffects(effectsText, charRef.current, false, charRef.current.lootDestination === 'stash' ? 'stash' : 'inventory');
      if (/\[ADVENTURE COMPLETE\]/i.test(effectsText) && newChar.adventure) {
        const completed = newChar.adventure;
        const finished = completed.title || 'Adventure';
        const prior = Array.isArray(newChar.completedAdventures) ? newChar.completedAdventures : [];
        const completedAdventures = prior.some(a => (typeof a === 'string' ? a : a?.title) === finished)
          ? prior
          : [...prior, completed];
        const { adventure, ...rest } = newChar;
        newChar = { ...rest, completedAdventures };
        log(`[ADVENTURE] Complete — ${finished} added to completed ledger. No replacement rolled.`);
      }
      if (newChar.arc?.antagonist !== charRef.current.arc?.antagonist) {
        log(`[ARC] Arc complete — new antagonist rolled: ${newChar.arc?.antagonist}`);
        // Build a fresh campaign skeleton for the new arc, in the background so
        // it never blocks the player's turn. Failure is non-fatal — the arc
        // simply runs without objectives and can be generated manually.

      }
      updateChar(newChar);
      addMessage({ role:'dm', text:finalText, id:Date.now(), roll:finalRoll });
      // Speak the setup AND the outcome together so TTS reads the whole scene,
      // not just the post-roll half. cleanDisplayText strips tags before speaking.
      voice.speak(rollSetupText ? `${rollSetupText}\n\n${finalText}` : finalText);
    } catch (e) {
      if (e.name === 'AbortError') {
        // User stopped the request — remove the pending user message from log
        setFullLog(prev => {
          const n = prev.slice(0,-1);
          fullLogRef.current = n;
          save.autoSave(charRef.current, n);
          return n;
        });
      } else {
        setApiError(e.message);
        addMessage({ role:'dm', text:`The magic wavers... (${e.message})`, id:Date.now(), roll:null });
      }
    }
    abortRef.current = null;
    setLoading(false);
  };

  const handleEditMessage = async (msgId, newText) => {
    const log = fullLogRef.current;
    const idx = log.findIndex(m => m.id === msgId);
    if (idx === -1) return;
    // Truncate fullLog at the edited message (removes it and everything after)
    const truncated = log.slice(0, idx);
    setFullLog(truncated);
    fullLogRef.current = truncated;
    // Reset summarization threshold so it fires correctly at the new log length
    lastSummarizedAt.current = Math.floor(truncated.length / SUMMARIZE_AFTER) * SUMMARIZE_AFTER;
    await handleSend(newText, truncated);
  };

  const handleRegenerate = async () => {
    const log = fullLogRef.current;
    const lastUserIdx = [...log].reverse().findIndex(m => m.role === 'user');
    if (lastUserIdx === -1) return;
    const actualIdx = log.length - 1 - lastUserIdx;
    const lastUserMsg = log[actualIdx];
    const truncated = log.slice(0, actualIdx);
    setFullLog(truncated);
    fullLogRef.current = truncated;
    lastSummarizedAt.current = Math.floor(truncated.length / SUMMARIZE_AFTER) * SUMMARIZE_AFTER;
    await handleSend(lastUserMsg.text, truncated);
  };

  const bankedLevelUps = levelUpsAvailable(character);

  const handleLevelClassSelect = (cls) => {
    if (['Cleric','Warlock','Paladin'].includes(cls) && !charRef.current.deity) {
      setDeityModalContext('multiclass');
      setDeityModalClass(cls);
      setShowDeityModal(true);
    }
  };

  const handleLevelStatSelect = (className, stat) => {
    const cur = charRef.current;
    if (levelUpsAvailable(cur) <= 0) return;
    const newLevels = { ...(cur.classLevels || {}), [className]: ((cur.classLevels || {})[className] || 0) + 1 };
    const projected = { ...cur, level:(cur.level || 1) + 1, classLevels:newLevels };
    spendStatPoint(className, stat);
    const owed = owedSubclasses(projected);
    if (owed.length) {
      setSubclassQueue(q => [...new Set([...q, ...owed])]);
      setShowSubclassModal(true);
    }
  };

  // ── Slot handling ──────────────────────────────────────────────────────────
  const handleCompanionSlotClick = (companionName, slotId) => {
    const options = equippableInSlot(character, slotId);
    if (options.length === 0) return;
    if (options.length === 1) { equipCompanionItem(companionName, slotId, options[0]); }
    else setCompanionSlotTarget({ name: companionName, slotId });
  };

  const handleSlotClick = (slotId) => {
    if (character.slots[slotId]) {
      unequipSlot(slotId);
    } else {
      const options = equippableInSlot(character, slotId);
      if (options.length === 0) return;
      if (options.length === 1) { equipToSlot(slotId, options[0]); }
      else setSlotTarget(slotId);
    }
  };

  // ── Character creation helpers ─────────────────────────────────────────────
  const handleFinalize = async () => {
    const char = finalizeCharacter(nameInput, bioInput, dispInput);
    setPhase('playing');
    beginAdventure(char);
  };

  // ── Common styles ──────────────────────────────────────────────────────────
  const parchment = {
    background: `linear-gradient(135deg, #1a0f05 0%, ${colors.bg} 100%)`,
    minHeight:'100vh', fontFamily:fonts.body, color:colors.text,
    display:'flex', flexDirection:'column', position:'relative',
  };

  const creationWrap = {
    ...parchment, alignItems:'center', justifyContent:'center',
  };

  // ── Welcome ────────────────────────────────────────────────────────────────
  if (phase === 'welcome') return (
    <div style={{...creationWrap,textAlign:'center'}}>
      <style>{animations}</style>
      {showSave && <SaveModal
        onClose={()=>setShowSave(false)}
        generateFullSave={save.generateFullSave}
        generateCharExport={save.generateCharExport}
        loadFromFile={save.loadFromFile}
        loadFromCode={save.loadFromCode}
        hasAutoSave={save.hasAutoSave}
        loadAutoSave={save.loadAutoSave}
        onLoadFull={applyLoadedFull}
        onLoadCharacter={applyLoadedCharacter}
      />}
      <div style={{maxWidth:500,padding:40}}>
        <div style={{fontSize:64,marginBottom:16}}>🐉</div>
        <h1 style={{fontFamily:fonts.display,fontSize:32,color:colors.gold,margin:'0 0 8px',letterSpacing:3}}>TALES OF THE REALM</h1>
        <p style={{fontFamily:fonts.display,fontSize:12,color:colors.textGhost,letterSpacing:4,marginBottom:32}}>AN AI DUNGEON MASTER EXPERIENCE</p>
        <p style={{color:'#b09060',lineHeight:1.8,marginBottom:24,fontSize:15}}>
          Welcome, brave soul. An AI Dungeon Master awaits to guide you through a world of magic, monsters, and adventure.
        </p>

        {/* API Key input */}
        <div style={{marginBottom:24,textAlign:'left'}}>
          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:2,marginBottom:6}}>ANTHROPIC API KEY</div>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            style={{width:'100%',boxSizing:'border-box',background:colors.bg,border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.mono,fontSize:12,padding:'10px 12px',borderRadius:4,outline:'none',marginBottom:6}}
          />
          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:2,marginTop:12,marginBottom:6}}>OPENAI API KEY</div>
          <input
            type="password"
            value={openAiApiKey}
            onChange={e => setOpenAiApiKey(e.target.value)}
            placeholder="sk-..."
            style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.mono,fontSize:12,padding:'9px 10px',borderRadius:4,outline:'none'}}
          />
          <div style={{fontSize:10,color:colors.textGhost,lineHeight:1.5}}>
            Your keys stay in your browser only. Enter either provider key to begin; the selected model will use its matching provider.
          </div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
          <button style={{...btn(true),fontSize:14,padding:'12px 28px',opacity:(apiKey || openAiApiKey)?1:0.4}} disabled={!apiKey && !openAiApiKey} onClick={()=>setPhase('create-race')}>
            BEGIN YOUR LEGEND
          </button>
          <button style={{...btn(false),fontSize:12,padding:'12px 18px',opacity:(apiKey || openAiApiKey)?1:0.4}} disabled={!apiKey && !openAiApiKey} onClick={()=>{setShowSave(true);}}>
            📂 Load / Import
          </button>
        </div>
        {!apiKey && !openAiApiKey && <div style={{fontSize:11,color:colors.textGhost,marginTop:12}}>Enter an Anthropic or OpenAI API key above to begin</div>}
      </div>
    </div>
  );

  // ── Create Race ────────────────────────────────────────────────────────────
  if (phase === 'create-race') return (
    <div style={creationWrap}>
      <style>{animations}</style>
      <div style={{maxWidth:560,width:'100%',padding:24}}>
        <p style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:4,marginBottom:8}}>CHARACTER CREATION — STEP 1 OF 3</p>
        <h2 style={{fontFamily:fonts.display,color:colors.gold,fontSize:22,margin:'0 0 6px'}}>Choose Your Race</h2>
        <p style={{color:colors.textGhost,fontSize:13,marginBottom:24}}>Your race shapes your natural talents and heritage.</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
          {RACES.map(race => (
            <div key={race.name} style={cardStyle(character.race?.name===race.name)} onClick={()=>selectRace(race)}>
              <div style={{fontSize:28,marginBottom:6}}>{race.emoji}</div>
              <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>{race.name}</div>
              <div style={{fontSize:12,color:colors.textFaint,lineHeight:1.5}}>{race.desc}</div>
            </div>
          ))}
        </div>
        <button style={{...btn(true),width:'100%',opacity:character.race?1:0.4}} disabled={!character.race} onClick={()=>setPhase('create-class')}>
          CONTINUE →
        </button>
      </div>
    </div>
  );

  // ── Create Class ───────────────────────────────────────────────────────────
  if (phase === 'create-class') return (
    <div style={creationWrap}>
      <style>{animations}</style>
      <div style={{maxWidth:560,width:'100%',padding:24}}>
        <p style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:4,marginBottom:8}}>CHARACTER CREATION — STEP 2 OF 3</p>
        <h2 style={{fontFamily:fonts.display,color:colors.gold,fontSize:22,margin:'0 0 6px'}}>Choose Your Class</h2>
        <p style={{color:colors.textGhost,fontSize:13,marginBottom:24}}>Your class is your profession and fighting style.</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
          {CLASSES.map(cls => (
            <div key={cls.name} style={cardStyle(character.cls?.name===cls.name)} onClick={()=>selectClass(cls)}>
              <div style={{fontSize:28,marginBottom:6}}>{cls.emoji}</div>
              <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>{cls.name}</div>
              <div style={{fontSize:12,color:colors.textFaint,lineHeight:1.5,marginBottom:8}}>{cls.desc}</div>
              {character.cls?.name===cls.name && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:3}}>
                  {Object.entries(character.stats).map(([k,v])=>(
                    <div key={k} style={{textAlign:'center',background:colors.borderFaint,borderRadius:3,padding:'3px 4px'}}>
                      <div style={{fontSize:8,color:colors.textGhost,fontFamily:fonts.display}}>{k.toUpperCase()}</div>
                      <div style={{fontSize:11,fontWeight:'bold',color:v>=15?colors.gold:colors.text,fontFamily:fonts.mono}}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={{...btn(false),flex:1}} onClick={()=>setPhase('create-race')}>← BACK</button>
          <button style={{...btn(true),flex:2,opacity:character.cls?1:0.4}} disabled={!character.cls} onClick={()=>['Cleric','Warlock','Paladin'].includes(character.cls?.name) ? setPhase('create-deity') : setPhase('create-name')}>CONTINUE →</button>
        </div>
      </div>
    </div>
  );

  // ── Create Deity (Cleric only) ─────────────────────────────────────────────
  if (phase === 'create-deity') return (
    <div style={creationWrap}>
      <style>{animations}</style>
      <div style={{maxWidth:700,width:'100%',padding:24}}>
        <p style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:4,marginBottom:8}}>CHARACTER CREATION — STEP 3 OF 4</p>
        <h2 style={{fontFamily:fonts.display,color:colors.gold,fontSize:22,margin:'0 0 6px'}}>{character.cls?.name === 'Warlock' ? 'Choose Your Patron' : 'Choose Your Deity'}</h2>
        <p style={{color:colors.textGhost,fontSize:13,marginBottom:24}}>{character.cls?.name === 'Warlock' ? 'Who holds the other end of your pact? Choose carefully — your patron shapes your power and your fate.' : 'Which god do you serve? Your deity shapes your divine powers and moral path.'}</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
          {(character.cls?.name === 'Warlock' ? WARLOCK_PATRONS : DEITIES).map(deity => (
            <div key={deity.name} style={cardStyle(character.deity?.name===deity.name)} onClick={()=>selectDeity(deity)}>
              <div style={{fontSize:28,marginBottom:6}}>{deity.emoji}</div>
              <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:2}}>{deity.name}</div>
              <div style={{fontSize:9,color:colors.textGhost,marginBottom:8}}>{deity.alignment}</div>
              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5,marginBottom:6}}>{deity.desc}</div>
              {character.deity?.name===deity.name && (
                <div style={{fontSize:10,color:colors.gold,fontStyle:'italic',paddingTop:6,borderTop:`1px solid ${colors.border}`}}>✓ {deity.flavor}</div>
              )}
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={{...btn(false),flex:1}} onClick={()=>setPhase('create-class')}>← BACK</button>
          <button style={{...btn(true),flex:2,opacity:character.deity?1:0.4}} disabled={!character.deity} onClick={()=>setPhase('create-name')}>CONTINUE →</button>
        </div>
      </div>
    </div>
  );

  // ── Create Name ────────────────────────────────────────────────────────────
  if (phase === 'create-name') return (
    <div style={creationWrap}>
      <style>{animations}</style>
      <div style={{maxWidth:480,width:'100%',padding:24}}>
        <p style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:4,marginBottom:8}}>CHARACTER CREATION — STEP {['Cleric','Warlock','Paladin'].includes(character.cls?.name)?'4':'3'} OF {['Cleric','Warlock','Paladin'].includes(character.cls?.name)?'4':'3'}</p>
        <h2 style={{fontFamily:fonts.display,color:colors.gold,fontSize:22,margin:'0 0 24px'}}>Name Your Hero</h2>
        <div style={{...panel,marginBottom:20}}>
          <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:16}}>
            <div style={{fontSize:36}}>{character.cls?.emoji}</div>
            <div>
              <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:14}}>{character.race?.name} {character.cls?.name}</div>
              {character.deity && <div style={{fontSize:11,color:colors.textGhost}}>Devoted to {character.deity.name}</div>}
              <div style={{fontSize:12,color:colors.textGhost}}>Level 1 · {character.maxHp} HP</div>
            </div>
          </div>
          {Object.entries(character.stats).map(([k,v])=>{
            const racialBonus = character.race?.bonus?.[k] || 0;
            const baseVal = v - racialBonus;
            return (
              <div key={k} style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                  <span style={{fontFamily:fonts.display,fontSize:10,color:colors.gold,letterSpacing:1}}>{STAT_NAMES[k]}</span>
                  <span style={{fontFamily:fonts.mono,fontWeight:'bold',color:colors.text,fontSize:13}}>
                    {v} <span style={{fontSize:9,color:colors.textGhost}}>({modStr(v)})</span>
                    {racialBonus > 0 && <span style={{fontSize:9,color:colors.gold,marginLeft:4}}>({baseVal}+{racialBonus})</span>}
                  </span>
                </div>
                <div style={{background:colors.borderFaint,borderRadius:2,height:5,overflow:'hidden',display:'flex'}}>
                  <div style={{width:`${(baseVal/20)*100}%`,height:'100%',background:v>=15?'#8a7040':'#4a3a20',borderRadius:2,transition:'width 0.4s'}}/>
                  {racialBonus > 0 && <div style={{width:`${(racialBonus/20)*100}%`,height:'100%',background:colors.gold,transition:'width 0.4s'}}/>}
                </div>
                <div style={{fontSize:8,color:colors.textGhost,marginTop:1}}>{STAT_DESC[k]}</div>
              </div>
            );
          })}
        </div>
        <input value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleFinalize()} placeholder="Enter your hero's name..."
          style={{width:'100%',boxSizing:'border-box',background:colors.bg,border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.body,fontSize:16,padding:'10px 14px',borderRadius:4,marginBottom:10,outline:'none'}}/>
        <textarea value={bioInput} onChange={e=>setBioInput(e.target.value)} rows={5}
          placeholder="Backstory / bio (optional) — who this character is, how they act, what drives them. The DM reads this every message and anchors its behavior to it."
          style={{width:'100%',boxSizing:'border-box',background:colors.bg,border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.body,fontSize:13,lineHeight:1.5,padding:'10px 14px',borderRadius:4,marginBottom:10,outline:'none',resize:'vertical'}}/>

        {/* Disposition — the DM assumes heroism unless told otherwise. Optional
            at creation and editable later in Settings, but far better set now. */}
        <div style={{fontSize:11,color:colors.textFaint,marginBottom:6,lineHeight:1.4,textAlign:'left'}}>
          <b style={{color:colors.gold}}>Disposition</b> (optional) — how this character actually behaves. <b>Indifferent to</b> is what stops NPCs appealing to things they do not care about.
        </div>
        {[
          ['alignment',   'Alignment',                 'e.g. True Neutral'],
          ['cares',       'Cares about',               'what actually motivates them'],
          ['indifferent', 'Indifferent to',            'what genuinely does not move them'],
          ['methods',     'How they solve problems',   'violence, cunning, coin, building something'],
          ['lines',       'Lines they will not cross', 'or leave blank'],
        ].map(([k, label, ph]) => (
          <div key={k} style={{marginBottom:6,textAlign:'left'}}>
            <div style={{fontSize:10,color:colors.textGhost,letterSpacing:1,marginBottom:2}}>{label.toUpperCase()}</div>
            <textarea value={dispInput[k]} onChange={e=>setDispInput(prev=>({ ...prev, [k]: e.target.value }))}
              rows={k === 'alignment' ? 1 : 2} placeholder={ph}
              style={{width:'100%',boxSizing:'border-box',background:colors.bg,border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.body,fontSize:13,lineHeight:1.4,padding:'7px 12px',borderRadius:4,outline:'none',resize:'vertical'}}/>
          </div>
        ))}

        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button style={{...btn(false),flex:1}} onClick={()=>setPhase(['Cleric','Warlock','Paladin'].includes(character.cls?.name)?'create-deity':'create-class')}>← BACK</button>
          <button style={{...btn(true),flex:2}} onClick={handleFinalize}>BEGIN THE ADVENTURE →</button>
        </div>
      </div>
    </div>
  );

  // ── Playing ────────────────────────────────────────────────────────────────
  const db = allItems(character.items || {});

  return (
    <div style={{...parchment,flexDirection:'row',height:'100vh',overflow:'hidden'}}>
      <style>{animations}</style>

      {showSave && <SaveModal
        onClose={()=>setShowSave(false)}
        generateFullSave={save.generateFullSave}
        generateCharExport={save.generateCharExport}
        loadFromFile={save.loadFromFile}
        loadFromCode={save.loadFromCode}
        hasAutoSave={save.hasAutoSave}
        loadAutoSave={save.loadAutoSave}
        onLoadFull={applyLoadedFull}
        onLoadCharacter={applyLoadedCharacter}
      />}

      {showAbilitiesModal && (
        <AbilitiesModal
          character={character}
          onClose={() => setShowAbilitiesModal(false)}
          onSave={(selected) => {
            updateChar({ ...character, abilities: selected });
            setShowAbilitiesModal(false);
          }}
        />
      )}

      {showSubclassModal && subclassQueue.length > 0 && (
        <SubclassModal
          className={subclassQueue[0]}
          context="oldSave"
          remaining={subclassQueue.length - 1}
          onSelect={(subName) => {
            const cls = subclassQueue[0];
            const cur = charRef.current;
            updateChar({ ...cur, subclasses: { ...(cur.subclasses || {}), [cls]: subName } });
            const rest = subclassQueue.slice(1);
            setSubclassQueue(rest);
            if (rest.length === 0) setShowSubclassModal(false);
          }}
        />
      )}
      {showDeityModal && (
        <DeityModal
          context={deityModalContext}
          cls={deityModalClass || patronClassOf(character)}
          onSelectDeity={(deity) => {
            selectDeity(deity);
            updateChar({ ...charRef.current, deity, _needsDeitySelection: false });
            setShowDeityModal(false);
            setDeityModalClass(null);
          }}
        />
      )}


      {adventureStartChar && (
        <AdventureStartModal
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          hasAnthropic={!!(apiKey || import.meta.env.VITE_ANTHROPIC_KEY)}
          hasOpenAI={!!(openAiApiKey || import.meta.env.VITE_OPENAI_KEY)}
          antagonists={antagonistsForLevel(adventureStartChar.level)}
          defeatedAntagonists={adventureStartChar.defeatedAntagonists || []}
          onRandom={() => { const c = adventureStartChar; setAdventureStartChar(null); startAdventure(c); }}
          onSituationAdventure={() => { const c = adventureStartChar; setAdventureStartChar(null); startAdventure(c, null, null, true); }}
          onChooseAdventure={(title) => { const c = adventureStartChar; const chosen = prepareSituationAdventure(title); if (!chosen) return; setAdventureStartChar(null); startAdventure(c, null, null, true, chosen); }}
          adventures={ADVENTURES}
          completedAdventures={adventureStartChar?.completedAdventures || []}
          onManual={(text, antagonist) => { const c = adventureStartChar; setAdventureStartChar(null); startAdventure(c, text, antagonist); }}
          onChooseAntagonist={(antagonist) => { const c = adventureStartChar; setAdventureStartChar(null); startAdventure(c, null, antagonist); }}
        />
      )}

      {slotTarget && (
        <ItemPickerModal
          slotId={slotTarget}
          options={equippableInSlot(character, slotTarget)}
          allItemsDB={db}
          onPick={(name)=>{ equipToSlot(slotTarget, name); setSlotTarget(null); }}
          onClose={()=>setSlotTarget(null)}
        />
      )}

      {companionSlotTarget && (
        <ItemPickerModal
          slotId={companionSlotTarget.slotId}
          options={equippableInSlot(character, companionSlotTarget.slotId)}
          allItemsDB={db}
          onPick={(name)=>{ equipCompanionItem(companionSlotTarget.name, companionSlotTarget.slotId, name); setCompanionSlotTarget(null); }}
          onClose={()=>setCompanionSlotTarget(null)}
        />
      )}


      {apiError && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',background:'#3a0808',border:`1px solid ${colors.red}`,color:colors.red,fontFamily:fonts.display,fontSize:11,padding:'8px 16px',borderRadius:4,zIndex:200,maxWidth:400,textAlign:'center'}}>
          ⚠ {apiError}
        </div>
      )}

      {/* Sidebar — hidden on mobile when closed */}
      {(!isMobile || sidebarOpen) && (
        <div style={{position: isMobile ? 'fixed' : 'relative', zIndex: isMobile ? 50 : 'auto', top:0, left:0, height:'100vh', width: isMobile ? '100vw' : 'auto'}}>
          <Sidebar
            showRawTags={showRawTags}
            onToggleRawTags={()=>setShowRawTags(v=>!v)}
            debugLog={debugLog}
        onExportDebug={() => {
          const blob = new Blob([debugLog.join('\n')], { type:'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dnd-debug-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.txt`;
          a.click();
          URL.revokeObjectURL(url);
        }}
        onCopyDebug={() => navigator.clipboard?.writeText(debugLog.join('\n'))}
            debugStatus={`char: lv${character.level} xp:${character.xp} levelups:${bankedLevelUps} | arc: ${character.arc?.antagonist || 'none'} | arcLocation: ${character.arc?.arcLocation || 'none'}`}
            directives={character.directives || ''}
            onChangeDirectives={(text)=>updateChar({ ...charRef.current, directives: text })}
            voiceSettings={voice.voiceSupported ? {
              voiceName: voice.voiceName, setVoiceName: voice.setVoiceName,
              rate: voice.rate, setRate: voice.setRate,
              pitch: voice.pitch, setPitch: voice.setPitch,
              pronounce: voice.pronounce, setPronounce: voice.setPronounce,
              availableVoices: voice.availableVoices, preview: voice.previewVoice,
            } : null}
            character={character}
            levelUpsAvailable={bankedLevelUps}
            onLevelClassSelect={handleLevelClassSelect}
            onLevelStatSelect={handleLevelStatSelect}
            onSlotClick={handleSlotClick}
            onCompanionSlotClick={handleCompanionSlotClick}
            onCompanionUnequip={unequipCompanionItem}
            onSaveClick={()=>setShowSave(true)}
            onAbilitiesClick={()=>setShowAbilitiesModal(true)}
            onClose={isMobile ? ()=>setSidebarOpen(false) : null}
            onMoveToStash={moveToStash}
            onMoveToInventory={moveToInventory}
            onBankCoins={bankCoins}
            onWithdrawCoins={withdrawCoins}
            onCreateBag={createBag}
            onAddToBag={addToBag}
            onRemoveFromBag={removeFromBag}
            onDeleteItem={deleteItem}
            onRenameItem={renameItem}
            onDeleteFromBag={deleteFromBag}
            selectedModel={selectedModel}
            onToggleModel={() => setSelectedModel(m => m === 'sonnet' ? 'haiku' : m === 'haiku' ? 'gpt' : m === 'gpt' ? 'terra' : 'sonnet')}
            pacing={character.pacing || 'normal'}
            lootDestination={character.lootDestination || 'inventory'}
            onToggleLootDestination={() => {
              const next = (charRef.current.lootDestination || 'inventory') === 'inventory' ? 'stash' : 'inventory';
              updateChar({ ...charRef.current, lootDestination: next });
              log(`[LOOT] DM loot destination set to ${next}`);
            }}
            environment={character.environment || 'wilderness'}
            onChangeEnvironment={(env)=>updateChar({ ...charRef.current, environment: env })}
            onTogglePacing={() => {
              const cur = charRef.current.pacing || 'normal';
              const next = PACING_ORDER[(PACING_ORDER.indexOf(cur) + 1) % PACING_ORDER.length];
              updateChar({ ...charRef.current, pacing: next });
            }}
            arcAntagonist={character.arc?.antagonist || null}
            arcLocation={character.arc?.arcLocation || null}
            adventure={character.adventure || null}
            onClearAdventure={() => {
              const { adventure, ...rest } = charRef.current;
              updateChar(rest);
              log('[ADVENTURE] Cleared by player — no story driver');
            }}
            onRollAdventure={() => {
              const adventure = rollSituationAdventure(charRef.current.completedAdventures || []);
              const { arc, adventure: oldAdventure, ...rest } = charRef.current;
              if (!adventure) { log('[ADVENTURE] No rollable Adventures remain — restore one from Completed Adventures'); return; }
              updateChar({ ...rest, adventure });
              log(`[ADVENTURE] Rolled by player — ${adventure.title}`);
            }}
            onClearArc={() => {
              const { arc, ...rest } = charRef.current;
              updateChar(rest);
              log('[ARC] Cleared by player — no antagonist, story is open');
            }}
            onRollArc={() => {
              const arc = rollArc(charRef.current.level, charRef.current.arc?.antagonist, charRef.current.defeatedAntagonists);
              const { adventure, ...rest } = charRef.current;
              updateChar({ ...rest, arc });
              log(`[ARC] Rolled by player — new antagonist: ${arc.antagonist} @ ${arc.arcLocation}; Adventure cleared`);
            }}
            onSetArc={(text) => {
              const { adventure, ...rest } = charRef.current;
              updateChar({ ...rest, arc: makeArc(text) });
              log(`[ARC] Custom antagonist set by player: ${text}; Adventure cleared`);
            }}
            onToggleContextExclusion={toggleContextExclusion}
            onSaveBio={(bio) => { updateChar({ ...charRef.current, bio }); log('[BIO] Updated by player'); }}
            arcObjectives={character.arc?.objectives || []}
            arcGoal={character.arc?.goal || ''}
            onSetArcGoal={(goal) => updateChar({ ...charRef.current, arc: { ...(charRef.current.arc || {}), goal } })}
            onGenerateObjectives={() => generateObjectives(charRef.current.arc?.antagonist)}
            onSetObjectives={(objectives) => updateChar({ ...charRef.current, arc: { ...(charRef.current.arc || {}), objectives } })}
            disposition={character.disposition || {}}
            onSaveDisposition={(d) => updateChar({ ...charRef.current, disposition: d })}
            onStartNewCampaign={startNewCampaign}
            defeatedAntagonists={character.defeatedAntagonists || []}
            onReviveAntagonist={reviveAntagonist}
            completedAdventures={character.completedAdventures || []}
            onRestoreAdventure={restoreAdventure}
            onCycleConstructStatus={cycleConstructStatus}
            onPromoteConstruct={promoteConstructToCompanion}
            onProposeCrafting={proposeCrafting}
            onProposeConsolidation={proposeConsolidation}
            onExecuteConsolidation={executeConsolidation}
            onProposeDismantle={proposeDismantle}
            onExecuteDismantle={executeDismantle}
            onExecuteCrafting={executeCrafting}
            onExtractNPC={extractNPCs}
            onExtractTown={extractTowns}
            onSaveNPC={saveNPCEntry}
            onDeleteNPC={deleteNPCEntry}
          />
        </div>
      )}

      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div onClick={()=>setSidebarOpen(false)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:49}}/>
      )}

      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        {/* Header */}
        <div style={{background:'rgba(10,7,3,0.9)',borderBottom:`1px solid ${colors.border}`,padding:'10px 16px',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button onClick={()=>setSidebarOpen(v=>!v)}
              style={{background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textFaint,padding:'4px 8px',fontSize:14,borderRadius:3,cursor:'pointer'}}>
              {sidebarOpen && !isMobile ? '◀' : '▶'}
            </button>
            <span style={{fontFamily:fonts.display,fontSize:13,color:colors.gold,letterSpacing:2}}>🐉 TALES OF THE REALM</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            {bankedLevelUps > 0 && (
              <span title={`${bankedLevelUps} level-up${bankedLevelUps===1?'':'s'} available — open the LEVEL tab in the sidebar whenever you are ready`}
                style={{fontFamily:fonts.display,fontSize:10,color:colors.gold,letterSpacing:0.6,border:`1px solid ${colors.goldDim}`,background:'rgba(201,168,76,0.10)',padding:'4px 7px',borderRadius:3,whiteSpace:'nowrap'}}>
                ⭐ LEVEL UP{bankedLevelUps > 1 ? ` ×${bankedLevelUps}` : ''}
              </span>
            )}
            {/* Story log toggle */}
            {storySummary && (
              <button onClick={()=>setSummaryOpen(v=>!v)}
                style={{background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textFaint,padding:'4px 8px',fontSize:14,borderRadius:3,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                <span style={{fontSize:10,fontFamily:fonts.display,letterSpacing:1,color:colors.gold}}>📜</span>
                {summaryOpen ? '▲' : '▼'}
              </button>
            )}
          </div>
        </div>

        {/* Current objective — a compact strip so it's glanceable, with a tick
            to mark it done. The DM proved unreliable at noticing completions, so
            the player drives it. Editing and history live in Settings. */}
        {(() => {
          const objs = character.arc?.objectives || [];
          const live = objs.find(o => !o.done);
          const doneCount = objs.filter(o => o.done).length;
          if (!live) return null;
          return (
            <div style={{background:'rgba(201,168,76,0.06)',borderBottom:`1px solid ${colors.borderDim}`,padding:'6px 14px',flexShrink:0,display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontFamily:fonts.display,fontSize:9,color:colors.textGhost,letterSpacing:1,flexShrink:0}}>
                OBJECTIVE{doneCount ? ` ${doneCount + 1}` : ''}
              </span>
              <span style={{flex:1,minWidth:0,fontSize:12,color:colors.textDim,lineHeight:1.35}}>{live.text}</span>
              <button onClick={completeCurrentObjective} title="Mark this objective complete"
                style={{flexShrink:0,background:'transparent',border:`1px solid ${colors.gold}`,color:colors.gold,padding:'3px 9px',fontSize:12,borderRadius:3,cursor:'pointer'}}>✓</button>
            </div>
          );
        })()}

        {storySummary && summaryOpen && (
          <div style={{background:'rgba(30,20,5,0.85)',borderBottom:`1px solid ${colors.borderDim}`,padding:'7px 16px',display:'flex',alignItems:'flex-start',gap:8,flexShrink:0,maxHeight:160,overflowY:'auto'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:fonts.display,fontSize:10,color:colors.gold,letterSpacing:2,marginBottom:2}}>STORY LOG</div>
              <div style={{fontSize:9,color:colors.textFaint,marginBottom:6,lineHeight:1.4}}>Uncheck an entry to stop sending it to the DM once it's no longer relevant.</div>
              {(() => {
                const obj = parseSummary(storySummary);
                return (
                  <div>
                    {obj.chunks.map((chunk, i) => (
                      <div key={chunk.id || i} style={{marginBottom:8,opacity:chunk.excluded?0.4:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                          <input type="checkbox" checked={!chunk.excluded} onChange={()=>toggleSummaryEntry(chunk.id)} style={{cursor:'pointer',accentColor:colors.gold,flexShrink:0}}/>
                          <span style={{fontFamily:fonts.display,fontSize:9,color:'rgba(201,168,76,0.5)',letterSpacing:2}}>📦 ARCHIVED — {chunk.sessions}{chunk.excluded?' · off':''}</span>
                        </div>
                        <span style={{fontSize:11,color:'rgba(201,168,76,0.4)',lineHeight:1.6,whiteSpace:'pre-wrap',textDecoration:chunk.excluded?'line-through':'none'}}>{chunk.text}</span>
                      </div>
                    ))}
                    {obj.entries.map((entry, i) => (
                      <div key={entry.id || i} style={{marginBottom:6,opacity:entry.excluded?0.4:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                          <input type="checkbox" checked={!entry.excluded} onChange={()=>toggleSummaryEntry(entry.id)} style={{cursor:'pointer',accentColor:colors.gold,flexShrink:0}}/>
                          <span style={{fontFamily:fonts.display,fontSize:9,color:colors.gold,letterSpacing:2}}>📝 RECENT {i + 1}{entry.excluded?' · off':''}</span>
                        </div>
                        <span style={{fontSize:11,color:colors.textFaint,lineHeight:1.6,whiteSpace:'pre-wrap',textDecoration:entry.excluded?'line-through':'none'}}>{entry.text}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <MessageFeed
          messages={fullLog}
          loading={loading}
          characterEmoji={character.cls?.emoji}
          onEditMessage={handleEditMessage}
          onRegenerate={handleRegenerate}
          editableFromId={fullLog[lastSummarizedAt.current]?.id ?? fullLog[0]?.id}
          showRawTags={showRawTags}
        />

        <InputBar
          onSend={handleSend}
          onStop={handleStop}
          loading={loading}
          isListening={voice.isListening}
          sttSupported={voice.sttSupported}
          onMicClick={() => voice.isListening
            ? voice.stopListening()
            : voice.startListening(text => window.dispatchEvent(new CustomEvent('dnd-set-input', { detail:text })))
          }
          isSpeaking={voice.isSpeaking}
          voiceSupported={voice.voiceSupported}
          ttsEnabled={voice.ttsEnabled}
          onToggleTts={() => { voice.setTtsEnabled(v=>!v); if(voice.isSpeaking) voice.stopSpeaking(); }}
          onStopSpeaking={voice.stopSpeaking}
          onReplay={() => {
            const lastDM = [...fullLog].reverse().find(m => m.role === 'dm');
            if (lastDM) voice.speak(lastDM.text);
          }}
          tokenUsage={tokenUsage}
          selectedModel={selectedModel}
        />
      </div>
    </div>
  );
}
