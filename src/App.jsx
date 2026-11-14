import { changeStoryOptions, isContinuousStory, isFullDarkFantasy } from './helpers/storyOptions.js';
import { prepareContinuousOpening } from './helpers/adventure/continuous.js';
import { useState, useRef, useEffect } from 'react';
import { animations, colors, fonts, btn, panel, cardStyle } from './styles/theme.js';
import { CLASSES, RACES, STAT_NAMES, STAT_DESC } from './constants/classes.js';
import { DEITIES, filterDeities } from './constants/deities.js';
import { SLOTS } from './constants/items.js';
import { useCharacter, modStr, statMod, calcAC, equippableInSlot, allItems, levelUpsAvailable } from './hooks/useCharacter.js';
import { useVoice } from './hooks/useVoice.js';
import { useSave } from './hooks/useSave.js';
import { useGame, buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptGpt, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46, cleanDisplayText, MODEL_CONFIGS } from './hooks/useGame.js';
import { rollAntagonist, rollArc, makeArc, antagonistsForLevel, encounterChance, rollEncounterDirective, PACING_ORDER } from './constants/encounters.js';
import { fixedArcLocationFor } from './constants/encounters/arcLocations.js';
import { Sidebar, resetCraftingPanels } from './components/Sidebar.jsx';
import { MessageFeed } from './components/MessageFeed.jsx';
import { InputBar } from './components/InputBar.jsx';
import { SaveModal } from './components/modals/SaveModal.jsx';
import { stackCount, takeStack } from './utils/itemStacks.js';
import { ItemPickerModal } from './components/modals/ItemPickerModal.jsx';
import { AbilitiesModal } from './components/modals/AbilitiesModal.jsx';
import { DeityModal, WARLOCK_PATRONS } from './components/modals/DeityModal.jsx';
import { SubclassModal } from './components/modals/SubclassModal.jsx';
import { AdventureStartModal } from './components/modals/StartModal.jsx';
import { owedSubclasses } from './constants/subclasses.js';
import { ADVENTURES, rollSituationAdventure, prepareSituationAdventure, situationLocationDirective } from './constants/adventures.js';
import { rollAdventureSeed } from './helpers/adventure/seed.js';
import { generateAdventureArc } from './helpers/adventure/arc.js';
import { callGptConsolidate } from './helpers/openai/consolidate.js';
import { armAnthropicCacheKeepWarm, cancelAnthropicCacheKeepWarm } from './helpers/anthropic/cache.js';
import { createPromptRecorder } from './helpers/debug/promptLog.js';
import { makeUsageEntry, snapshotCacheState, diffCacheState } from './helpers/debug/tokenCostLog.js';
import { createSummaryManager, parseSummary, formatSummaryForApi, coveredMessageCount, legacyHistoryStart } from './helpers/history/manager.js';
import { createExtractionManager } from './helpers/extraction/manager.js';
import { createItemManager } from './helpers/items/manager.js';
import { restoreWorldPressuresForHistory } from './helpers/worldPressures.js';

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
  const [deitySearch, setDeitySearch] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [appearanceInput, setAppearanceInput] = useState('');
  const [dispInput, setDispInput] = useState({ alignment:'', cares:'', indifferent:'', methods:'', lines:'' });
  const [apiKey, setApiKey]     = useState('');
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const [xAiApiKey, setXAiApiKey] = useState('');
  const [apiError, setApiError] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [slotTarget, setSlotTarget] = useState(null);
  const [companionSlotTarget, setCompanionSlotTarget] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const [dmRequests, setDMRequests] = useState([]);
  const debugLogRef = useRef([]);
  const objectiveNoteRef = useRef('');   // queued note for the next API message

  // ── Prompt log ─────────────────────────────────────────────────────────────
  const PROMPT_LOG_ENABLED = true;
  const PROMPT_LOG_KEEP = 15;
  const promptLogRef = useRef({ blocks: {}, turns: [] });
  const promptRecorder = createPromptRecorder({ enabled: PROMPT_LOG_ENABLED, keepTurns: PROMPT_LOG_KEEP });
  const recordPrompt = (rec) => promptRecorder(promptLogRef, rec);
  const cacheTimerRef = useRef(null);   // one-shot Anthropic cache keep-warm
  const armCacheTimer = () => armAnthropicCacheKeepWarm({
    timerRef: cacheTimerRef,
    selectedModel,
    charRef,
    pingCache,
    onUsage: data => logUsage('cache keep-warm', data),
  });
  useEffect(() => () => cancelAnthropicCacheKeepWarm(cacheTimerRef), []);

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
  const [selectedModel, setSelectedModel] = useState('sonnet'); // sonnet, haiku, gpt (Sol), terra, grok, grok46
  const [storySummary, setStorySummary] = useState('');
  const [tokenCostLog, setTokenCostLog] = useState([]);
  const tokenCostLogRef = useRef([]);
  const cacheStateRef = useRef(null);
  const storySummaryRef = useRef('');

  const SUMMARIZE_AFTER   = 12;
  const KEEP_RECENT       = 4;
  const ENTRIES_BEFORE_COMPRESS = 6;
  const COMPRESS_KEEP_RECENT_ENTRIES = 2;
  const lastSummarizedAt = useRef(0);

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
  const { callDM, buildActionContext, interceptRollRequest, pingCache } = useGame({ charRef, apiKey, openAiApiKey, xAiApiKey,
    onRequestCapture:record => setDMRequests(previous => {
      const index = previous.findIndex(r=>r.id===record.id);
      if (index >= 0) return previous.map(r=>r.id===record.id?record:r);
      // A delayed response must not reinsert a request already evicted.
      if (previous.length && record.id < previous[0].id) return previous;
      return [...previous,record].slice(-3);
    }),
  });

  const appendTokenCostEntry = (requestType, data, { includeCacheChanges=false, modelKey=selectedModel } = {}) => {
    if (!data) return null;
    const modelConfig = MODEL_CONFIGS[modelKey] || MODEL_CONFIGS[selectedModel];
    const snapshot = snapshotCacheState(charRef.current, storySummaryRef.current);
    const changes = includeCacheChanges ? diffCacheState(cacheStateRef.current, snapshot) : [];
    const entry = makeUsageEntry({ modelKey, modelConfig, requestType, data, changes });
    if (includeCacheChanges) cacheStateRef.current = snapshot;
    setTokenCostLog(prev => {
      const next = [...prev, entry];
      tokenCostLogRef.current = next;
      return next;
    });
    // Usage is campaign data. Persist it immediately instead of waiting for a
    // character mutation to happen to trigger the ordinary autosave effect.
    setTimeout(() => {
      try { save.autoSave(charRef.current, fullLogRef.current); } catch {}
    }, 0);
    return entry;
  };

  // Helper calls are billed too, but do not themselves consume the DM cache.
  // Their resulting state mutations (summary, NPC extraction, crafting, etc.) are
  // detected against the last gameplay snapshot on the next DM request.
  const logUsage = (label, data) => appendTokenCostEntry(label, data);

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

  const applyLoadedFull = (char, msgs, summary = '', settings = null, savedTokenCostLog = [], savedCacheState = null) => {
    applyLoadedSettings(settings);
    resetCraftingPanels();   // any pending proposal refers to the character being replaced
    loadCharacter(char);
    setFullLog(msgs);
    fullLogRef.current = msgs;
    setStorySummary(summary);
    storySummaryRef.current = summary;
    setTokenCostLog(savedTokenCostLog); tokenCostLogRef.current = savedTokenCostLog;
    cacheStateRef.current = savedCacheState;
    initSummarizedAt(msgs.length, summary, msgs);
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
    messagesRef: fullLogRef,
    storySummaryRef,
    debugLogRef,
    promptLogRef,
    tokenCostLogRef,
    cacheStateRef,
    getSettings: () => ({ selectedModel, showRawTags, ttsRate: voice.rate, ttsPitch: voice.pitch }),
    onLoadFull: applyLoadedFull,
    onLoadCharacter: applyLoadedCharacter,
  });

  const { initSummarizedAt, toggleSummaryEntry, toggleMemoryMode, maybeAutoSummarize } = createSummaryManager({
    lastSummarizedAt, storySummaryRef, setStorySummary, charRef, fullLogRef, save, selectedModel, MODEL_CONFIGS,
    apiKey, openAiApiKey, xAiApiKey, log, logUsage, SUMMARIZE_AFTER, KEEP_RECENT, ENTRIES_BEFORE_COMPRESS, COMPRESS_KEEP_RECENT_ENTRIES,
  });
  const { extractNPCs, extractTowns } = createExtractionManager({ apiKey, openAiApiKey, xAiApiKey, fullLogRef, charRef, updateChar, selectedModel, MODEL_CONFIGS, log, logUsage });
  const { proposeCrafting, executeCrafting, proposeConsolidation, executeConsolidation, proposeDismantle, executeDismantle } = createItemManager({ apiKey, openAiApiKey, xAiApiKey, charRef, updateChar, applyEffects, selectedModel, MODEL_CONFIGS, log, logUsage });

  // Autosave was only triggered by message events, so anything changed BETWEEN
  // turns was lost on reload — a crafting session, salvage, equipment changes,
  // stash moves, NPC edits, disposition. Watch the character itself instead and
  // write shortly after it settles, which covers every mutation path.
  useEffect(() => {
    if (phase !== 'playing' || !character?.stats?.dex) return;
    const t = setTimeout(() => {
      try {
        const t0 = performance.now();
        void save.autoSave(charRef.current, fullLogRef.current);
        const ms = performance.now() - t0;
        // Capturing a large snapshot still runs on the main thread; the durable
        // database commit runs asynchronously and reports failure in the UI.
        if (ms > 150) log(`[SAVE] Autosave took ${Math.round(ms)}ms — ${fullLogRef.current.length} messages`);
      } catch (e) {
        log(`[SAVE] Autosave failed: ${e.message}`);
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [character, fullLog, storySummary, phase, selectedModel, showRawTags, voice.rate, voice.pitch]);

  // Mobile browsers may kill a background tab without firing beforeunload.
  // Flush the latest refs as soon as the page is hidden, before a pending
  // debounce can be cancelled by closing the app.
  useEffect(() => {
    if (phase !== 'playing') return;
    const flush = () => { void save.autoSave(charRef.current,fullLogRef.current); };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange',hidden);
    window.addEventListener('pagehide',flush);
    return () => { document.removeEventListener('visibilitychange',hidden); window.removeEventListener('pagehide',flush); };
  },[phase, selectedModel, showRawTags, voice.rate, voice.pitch]);

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

  const startAdventure = async (char, openingOverride = null, antagonistOverride = null, situationMode = false, situationOverride = null, arcLocationOverride = null) => {
    log('startAdventure', { level: char.level, xp: char.xp, hp: char.hp });
    setLoading(true);
    setApiError('');
    try {
      const modelConfig = MODEL_CONFIGS[selectedModel];
      let seedPrompt;
      let arcAntagonist;
      let openingArc = null;
      let startingArea = null;
      let situationSeed = null;
      const continuousOpening = isContinuousStory(char) ? prepareContinuousOpening(char, openingOverride || '', situationOverride || (situationMode ? rollSituationAdventure(char.completedAdventures || []) : null)) : null;
      if (continuousOpening) {
        seedPrompt = continuousOpening.prompt;
        arcAntagonist = null;
      } else if (situationMode) {
        situationSeed = situationOverride || rollSituationAdventure(char.completedAdventures || []);
        arcAntagonist = null;
        seedPrompt = `[SITUATION ADVENTURE — OPENING]
TITLE: ${situationSeed.title}
Use the Adventure premise in the system instructions; do not replace it with a different situation.
STARTING CONTEXT: ${situationSeed.location}${situationLocationDirective(situationSeed)}
TONE: ${isFullDarkFantasy(char) ? 'Full Dark Fantasy — uncompromising darkness and tangible danger' : situationSeed.tone}
OPENING STYLE: ${situationSeed.openingStyle}

This Adventure is a persistent BACKGROUND SITUATION, not an opening quest dump and not a predetermined plot. Establish the player naturally in the STARTING CONTEXT first. Let them arrive, look around, eat, drink, shop, travel, socialize, attend an event, or otherwise exist in the location before the Adventure demands attention. The premise may surface immediately only when that is genuinely natural; otherwise let it emerge through ordinary play.

The player's PREVIOUS campaign location is deliberately unavailable for this opening. Do not infer continuity from where the last story ended. Choose a fresh, appropriate actual location for this Adventure based on the premise and STARTING CONTEXT, then establish it with [LOCATION: ...].

Do not invent or reveal a villain, culprit, secret master, solution, final objective, or hidden explanation merely to make the premise feel like a quest. Let NPCs, relationships, complications, mysteries, enemies, discoveries, and goals emerge from what the player actually chooses to investigate or engage with. Combat is optional, not the default form of progress. Social interaction, exploration, negotiation, bargains, travel, humor, ordinary life, and unexpected relationships are first-class play.

Use the STARTING CONTEXT because it was chosen specifically for this premise; do not replace it with the generic random-start location generator. Place it in an appropriate real Faerûn/Feywild/planar location as context requires. PLAYER AGENCY IS ABSOLUTE. Never pre-act for the player. End with exactly 4 numbered choices.`;
      } else if (openingOverride && openingOverride.trim()) {
        // Player wrote the opening — use their antagonist if given, else roll a hidden one.
        arcAntagonist = antagonistOverride?.trim() || rollAntagonist(char.level, null, char.defeatedAntagonists);
        seedPrompt = `[ADVENTURE START — PLAYER-SPECIFIED OPENING]\nBegin the adventure exactly as the player describes below. Do NOT randomize the setting, location, or situation — use what they wrote. PLAYER AGENCY IS ABSOLUTE: do not invent any action, decision, conversation, combat, agreement, relationship, knowledge, or item acquisition for the player beyond what the player's opening explicitly states. Begin before the first unresolved action and let the player make it. Establish why the player is present and what they actually know before introducing mysteries that depend on context. Open the scene there with vivid physical detail, ${isFullDarkFantasy(char) ? 'let scope follow the chosen setting and actual dangers without a level-based ceiling' : `keep it within the story scope appropriate to a level ${char.level} character`}, and end with exactly 4 numbered choices (at least one chaotic or unconventional, at least one ruthless or self-serving, all written neutrally).\n\nPLAYER'S OPENING:\n${openingOverride.trim()}\n\nThe character's backstory is background only — do NOT open in their history or build the scene around it unless the player's opening above says to.`;
      } else {
        const seed = rollAdventureSeed(char.level, {
          openScale: isFullDarkFantasy(char),
          antagonist: antagonistOverride,
          arcLocation: arcLocationOverride,
          defeated: char.defeatedAntagonists || [],
        });
        arcAntagonist = seed.antagonist;
        openingArc = seed.arc;
        startingArea = seed.startingArea;
        seedPrompt = `[ADVENTURE SEED — MANDATORY COMPLIANCE REQUIRED]
The antagonist and geographic anchor below are authoritative and were selected together. Build ONE coherent opening from them. Setting, weather, scene location, hook, and wildcard are creative ingredients: adapt incompatible details to the geography and antagonist rather than moving the adventure or inventing a separate conflict. Keep rich atmospheric scene-setting. Setting and wildcard details can remain background; they do not each need a plot explanation or actionable mystery.

STORY SCOPE (the player is level ${char.level} — match the SIZE and stakes of the story to this): ${seed.scope}

GEOGRAPHIC ANCHOR (start here, not across the continent): ${seed.startingArea}
SETTING: ${seed.setting}
TIME OF DAY: ${seed.time}
WEATHER: ${seed.weather}
TONE: ${isFullDarkFantasy(char) ? 'Full Dark Fantasy — uncompromising darkness and tangible danger' : seed.tone}
OPENING LOCATION (the specific place the scene starts): ${seed.location}
OPENING STYLE (HOW to open the scene — follow this structure, do not default to a generic establishing shot): ${seed.openingStyle}
WILDCARD (a distinctive detail to work into the opening): ${seed.wildcard}
ADVENTURE HOOK (adapt to this character and antagonist): ${seed.hook}
OPENING CLARITY: Establish one understandable immediate conflict or opportunity. Make visible actions, requests, immediate stakes, and any offered benefit concrete before adding deeper lore or complications. Several NPCs may take opposing sides in that conflict. Do not cram the antagonist's whole scheme into the first exchange. If the hook suggests a prior debt, favor, enemy, or relationship, use it only when supplied history supports it; otherwise adapt it into a present-day offer, dispute, or intrusion. Completed service and resolved obligations remain closed.
OPENING CONTACT: Begin with a concrete unfolding situation, direct offer, intrusion, or opportunity arising from this antagonist. Give this character something they can act on now, not merely a rumor about an optional distant quest. Do not assume heroic motives or prior acceptance. If urgent danger is established, show its present state and plausible next development, and record its pressure.
ANTAGONIST (identity hidden; the opening hook must arise from this antagonist): ${arcAntagonist}

REQUIRED: Set the opening inside the GEOGRAPHIC ANCHOR or its immediate approaches. The playable conflict must be accessible locally, within the same kingdom or region at minimum; never require cross-continent travel merely to begin. For a required lair such as Undermountain, start there or at its nearby entrance in Waterdeep. Planar anchors use their actual plane rather than an unrelated Faerûn city. Invent local inns, shrines, settlements, or alleys where appropriate. Ground the scene in physical details matching the weather and time, and open it in the OPENING STYLE above rather than a stock "you stand in X" description. Emit a [LOCATION:] tag with the canon place name.

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
      if (continuousOpening) {
        charWithArc = continuousOpening.character;
      } else if (situationMode) {
        // A new Adventure is a fresh opening, not a continuation of wherever the
        // previous campaign happened to end. Remove currentLocation before building
        // the player/system data so the DM cannot anchor itself to the old scene.
        // The opening response will establish the new place with [LOCATION: ...].
        const { arc, adventure, currentLocation, worldPressures, ...rest } = char;
        charWithArc = { ...rest, currentLocation: '', adventure: situationSeed };
        log(`[ADVENTURE] Situation start — ${situationSeed.title}; previous location hidden`);
      } else {
        const { adventure, worldPressures, ...rest } = char;
        charWithArc = {
          ...rest,
          ...(startingArea ? { currentLocation: startingArea } : {}),
          arc: openingArc || makeArc(arcAntagonist, arcLocationOverride, openingOverride ? '' : char.currentLocation),
        };
        log(`[ARC] Adventure start — antagonist rolled: ${arcAntagonist}`);
      }
      const system = selectedModel === 'haiku'
        ? buildSystemPrompt(charWithArc)
        : selectedModel === 'sonnet'
        ? buildSystemPromptSonnet(charWithArc)
        : selectedModel === 'terra'
        ? buildSystemPromptTerra(charWithArc)
        : selectedModel === 'grok'
        ? buildSystemPromptGrok43(charWithArc)
        : selectedModel === 'grok46'
        ? buildSystemPromptGrok46(charWithArc)
        : buildSystemPromptSol(charWithArc);
      const { text, usage } = await callDM(
        [{ role:'user', content: seedPrompt }],
        system,
        modelConfig,
        null,
        log,
        null,
        charWithArc
      );
      if (usage) appendTokenCostEntry('campaign opening', usage, { includeCacheChanges:true });
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

  // ── Arc objectives ─────────────────────────────────────────────────────────
  // A rough homebrew campaign skeleton for the current antagonist, shaped by the
  // character's disposition so the goals fit who they actually are.
  const generateObjectives = async (antagonist) => {
    const c = charRef.current;
    if (!antagonist) throw new Error('No antagonist to build a campaign around');
    const modelConfig = MODEL_CONFIGS[selectedModel];
    log(`[ARC] Generating goal + first objective with ${modelConfig?.label || selectedModel}: ${antagonist}`);

    const result = await generateAdventureArc({
      antagonist,
      character: c,
      modelConfig,
      anthropicApiKey: apiKey,
      openAiApiKey,
      xAiApiKey,
    });

    if (modelConfig?.provider === 'anthropic') {
      logUsage('arc objectives', result.rawData);
    } else if (result.usage) {
      const input = result.usage.input_tokens ?? 0;
      const output = result.usage.output_tokens ?? 0;
      log(`[ARC] ${modelConfig?.label || 'OpenAI'} usage: ${input.toLocaleString()} in / ${output.toLocaleString()} out`);
    }

    const { goal, objectives } = result;
    updateChar({ ...charRef.current, arc: { ...(charRef.current.arc || {}), antagonist, goal, objectives } });
    log(`[ARC] Goal: ${goal}`);
    return { goal, objectives };
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
    const summaryState = parseSummary(rawSummary);
    const coveredCount = coveredMessageCount(summaryState,base) ?? (summaryState.memoryMode === 'legacy' ? legacyHistoryStart(summaryState,base.length) : 0);
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

    // First-use migration finishes before any encounter/attack is rolled or
    // history is sent. On failure keep the old save intact and expose rollback.
    const pendingMemory = parseSummary(storySummaryRef.current);
    if (storySummaryRef.current && pendingMemory.memoryMode !== 'legacy' && !pendingMemory.memory) {
      await maybeAutoSummarize(fullLogRef.current);
      if (fullLogRef.current.length >= SUMMARIZE_AFTER && !parseSummary(storySummaryRef.current).memory) {
        setApiError('Campaign memory could not be built. Your original history is intact. Retry, or switch to original archives in Story Log.');
        abortRef.current = null; setLoading(false); return;
      }
    }
    if (signal.aborted) { abortRef.current = null; setLoading(false); return; }

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
    const outgoing = continuePrefix + userMsg + actionCtx + encounterCtx + objectiveCtx;

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
        : selectedModel === 'grok'
        ? buildSystemPromptGrok43(charRef.current)
        : selectedModel === 'grok46'
        ? buildSystemPromptGrok46(charRef.current)
        : buildSystemPromptSol(charRef.current);
      const { text: dmText, usage: dmUsage } = await callDM(
        [...history, { role:'user', content: outgoing }],
        system,
        modelConfig,
        signal,
        log,
        recordPrompt
      );
      if (dmUsage) appendTokenCostEntry('gameplay', dmUsage, { includeCacheChanges:true });
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
        if (followUpUsage) appendTokenCostEntry('roll follow-up', followUpUsage, { includeCacheChanges:true });
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
      if (!isContinuousStory(newChar) && /\[ADVENTURE COMPLETE\]/i.test(effectsText) && newChar.adventure) {
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

  const rewindHistory = (log, idx) => {
    const truncated = log.slice(0, idx);
    // Restore before summary persistence or handleSend can autosave/build a
    // prompt. Updates, newly created pressures, and END tags all rewind.
    updateChar(restoreWorldPressuresForHistory(charRef.current,truncated));
    setFullLog(truncated);
    fullLogRef.current = truncated;
    initSummarizedAt(truncated.length, storySummaryRef.current, truncated);
    return truncated;
  };

  const handleEditMessage = async (msgId, newText) => {
    const log = fullLogRef.current;
    const idx = log.findIndex(m => m.id === msgId);
    if (idx === -1) return;
    const truncated = rewindHistory(log,idx);
    await handleSend(newText, truncated);
  };

  const handleRegenerate = async () => {
    const log = fullLogRef.current;
    const lastUserIdx = [...log].reverse().findIndex(m => m.role === 'user');
    if (lastUserIdx === -1) return;
    const actualIdx = log.length - 1 - lastUserIdx;
    const lastUserMsg = log[actualIdx];
    const truncated = rewindHistory(log,actualIdx);
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
    const char = finalizeCharacter(nameInput, bioInput, appearanceInput, dispInput);
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
        autoSaveStatus={save.autoSaveStatus}
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
          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:2,marginTop:12,marginBottom:6}}>XAI API KEY</div>
          <input
            type="password"
            value={xAiApiKey}
            onChange={e => setXAiApiKey(e.target.value)}
            placeholder="xai-..."
            style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.mono,fontSize:12,padding:'9px 10px',borderRadius:4,outline:'none'}}
          />
          <div style={{fontSize:10,color:colors.textGhost,lineHeight:1.5,marginTop:6}}>
            Your keys stay in your browser only. Enter any provider key to begin; the selected model uses its matching provider.
          </div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
          <button style={{...btn(true),fontSize:14,padding:'12px 28px',opacity:(apiKey || openAiApiKey || xAiApiKey)?1:0.4}} disabled={!apiKey && !openAiApiKey && !xAiApiKey} onClick={()=>setPhase('create-race')}>
            BEGIN YOUR LEGEND
          </button>
          <button style={{...btn(false),fontSize:12,padding:'12px 18px',opacity:(apiKey || openAiApiKey || xAiApiKey)?1:0.4}} disabled={!apiKey && !openAiApiKey && !xAiApiKey} onClick={()=>{setShowSave(true);}}>
            📂 Load / Import
          </button>
        </div>
        {!apiKey && !openAiApiKey && !xAiApiKey && <div style={{fontSize:11,color:colors.textGhost,marginTop:12}}>Enter an Anthropic, OpenAI, or xAI API key above to begin</div>}
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
        <p style={{color:colors.textGhost,fontSize:13,marginBottom:24}}>{character.cls?.name === 'Warlock' ? 'Who holds the other end of your pact? Choose carefully — your patron shapes your power and your fate.' : 'Which god do you serve? Your deity shapes your faith and divine calling. Their alignment does not set your character’s alignment.'}</p>
        <input type="search" aria-label="Search deities or patrons" value={deitySearch} onChange={e=>setDeitySearch(e.target.value)} placeholder="Search name, alignment, domain, or calling…"
          style={{width:'100%',boxSizing:'border-box',background:colors.bg,color:colors.text,border:`1px solid ${colors.border}`,borderRadius:4,padding:10,marginBottom:12,fontSize:14}} />
        {filterDeities(character.cls?.name === 'Warlock' ? WARLOCK_PATRONS : DEITIES, deitySearch).length === 0 && <p role="status" style={{color:colors.textGhost}}>No matching deities or patrons. Try another search.</p>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%, 220px),1fr))',gap:12,marginBottom:24}}>
          {filterDeities(character.cls?.name === 'Warlock' ? WARLOCK_PATRONS : DEITIES, deitySearch).map(deity => (
            <div key={deity.name} style={cardStyle(character.deity?.name===deity.name)} onClick={()=>selectDeity(deity)}>
              <div style={{fontSize:28,marginBottom:6}}>{deity.emoji}</div>
              <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:2}}>{deity.name}</div>
              <div style={{fontSize:9,color:colors.textGhost,marginBottom:8}}>{deity.alignment}</div>
              {deity.domains?.length > 0 && <div style={{fontSize:10,color:colors.gold,marginBottom:6}}>Suggested domains: {deity.domains.join(', ')}</div>}
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
        <textarea value={appearanceInput} onChange={e=>setAppearanceInput(e.target.value)} rows={4}
          placeholder="Physical appearance (optional) — build, features, hair, eyes, clothing, scars, mannerisms, or anything the DM should consistently remember."
          style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.35)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:13,padding:'8px 10px',borderRadius:4,marginBottom:10,outline:'none',resize:'vertical'}}/>

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
      {save.autoSaveStatus.state==='error' && <div role="alert" style={{position:'fixed',bottom:76,left:12,right:12,zIndex:95,background:'#382019',border:'1px solid #c96a4c',borderRadius:5,padding:10,fontSize:12,color:'#f2c4b4'}}>
        {save.autoSaveStatus.message} <button style={{...btn(false),marginLeft:8}} onClick={()=>setShowSave(true)}>SAVE / LOAD</button>
      </div>}

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
        autoSaveStatus={save.autoSaveStatus}
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
          character={adventureStartChar}
          onChangeStoryOptions={options => setAdventureStartChar(c => changeStoryOptions(c, options))}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          hasAnthropic={!!(apiKey || import.meta.env.VITE_ANTHROPIC_KEY)}
          hasOpenAI={!!(openAiApiKey || import.meta.env.VITE_OPENAI_KEY)}
          hasXAI={!!(xAiApiKey || import.meta.env.VITE_XAI_KEY)}
          antagonists={antagonistsForLevel(adventureStartChar.level)}
          defeatedAntagonists={adventureStartChar.defeatedAntagonists || []}
          onRandom={() => { const c = adventureStartChar; setAdventureStartChar(null); startAdventure(c); }}
          onSituationAdventure={(options) => { const c = adventureStartChar; const chosen = rollSituationAdventure(c.completedAdventures || [], options); if (!chosen) return; setAdventureStartChar(null); startAdventure(c, null, null, true, chosen); }}
          onChooseAdventure={(title, options) => { const c = adventureStartChar; const chosen = prepareSituationAdventure(title, options); if (!chosen) return; setAdventureStartChar(null); startAdventure(c, null, null, true, chosen); }}
          adventures={ADVENTURES}
          completedAdventures={adventureStartChar?.completedAdventures || []}
          onManual={(text, antagonist) => { const c = adventureStartChar; setAdventureStartChar(null); startAdventure(c, text, antagonist); }}
          onChooseAntagonist={(antagonist, arcLocation) => { const c = adventureStartChar; setAdventureStartChar(null); startAdventure(c, null, antagonist, false, null, arcLocation); }}
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
            dmRequests={dmRequests}
            tokenCostLog={tokenCostLog}
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
            onChangeStoryOptions={options => updateChar(changeStoryOptions(charRef.current, options))}
            selectedModel={selectedModel}
            onToggleModel={() => setSelectedModel(m => m === 'sonnet' ? 'haiku' : m === 'haiku' ? 'gpt' : m === 'gpt' ? 'terra' : m === 'terra' ? 'grok' : m === 'grok' ? 'grok46' : 'sonnet')}
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
            antagonistOptions={antagonistsForLevel(character.level)}
            adventureOptions={ADVENTURES}
            adventure={character.adventure || null}
            onClearAdventure={() => {
              const { adventure, ...rest } = charRef.current;
              updateChar(rest);
              log('[ADVENTURE] Cleared by player — no story driver');
            }}
            onSetAdventure={(title) => {
              const selected = prepareSituationAdventure(title);
              if (!selected) return;
              const { arc, adventure: oldAdventure, ...rest } = charRef.current;
              updateChar({ ...rest, adventure: selected });
              log(`[ADVENTURE] Chosen by player — ${selected.title}`);
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
              const arc = rollArc(charRef.current.level, charRef.current.arc?.antagonist, charRef.current.defeatedAntagonists, charRef.current.currentLocation);
              const { adventure, ...rest } = charRef.current;
              updateChar({ ...rest, arc });
              log(`[ARC] Rolled by player — new antagonist: ${arc.antagonist} @ ${arc.arcLocation}; Adventure cleared`);
            }}
            onSetArcLocation={(location) => {
              const c = charRef.current;
              if (!c.arc?.antagonist) return;
              const fixed = fixedArcLocationFor(c.arc.antagonist);
              const nextLocation = fixed || location;
              updateChar({ ...c, arc: { ...c.arc, arcLocation: nextLocation } });
              log(`[ARC] Location chosen by player — ${nextLocation}`);
            }}
            onSetArc={(text) => {
              const { adventure, ...rest } = charRef.current;
              updateChar({ ...rest, arc: makeArc(text, null, charRef.current.currentLocation) });
              log(`[ARC] Custom antagonist set by player: ${text}; Adventure cleared`);
            }}
            onToggleContextExclusion={toggleContextExclusion}
            onSaveBio={(bio) => { updateChar({ ...charRef.current, bio }); log('[BIO] Updated by player'); }}
            onSaveAppearance={(appearance) => { updateChar({ ...charRef.current, appearance }); log('[APPEARANCE] Updated by player'); }}
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
              <div style={{fontSize:9,color:colors.textFaint,marginBottom:6,lineHeight:1.4}}>Layered memory keeps current facts and lasting memories together. Original records remain available below.</div>
              {(() => {
                const obj = parseSummary(storySummary);
                return (
                  <div>
                    <button onClick={toggleMemoryMode} disabled={loading} style={{background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.gold,cursor:'pointer',fontSize:11,padding:'4px 8px',marginBottom:8}}>
                      {obj.memoryMode === 'legacy' ? 'Try layered memory' : 'Switch to original archives'}
                    </button>
                    {obj.memoryMode !== 'legacy' && obj.memory && (
                      <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.6,whiteSpace:'pre-wrap',marginBottom:10}}>
                        {Object.entries({corrections:'Corrections',continuity:'Current continuity',history:'Lasting memories',recent:'Recent events'}).map(([key,label]) => obj.memory[key] ? (
                          <div key={key} style={{marginBottom:8}}><strong style={{color:colors.gold}}>{label}</strong><div>{obj.memory[key]}</div></div>
                        ) : null)}
                      </div>
                    )}
                    {obj.memoryMode !== 'legacy' && !obj.memory && <div style={{fontSize:11,color:colors.textFaint,marginBottom:8}}>Layered memory will build on the next eligible turn. Existing history remains available until it succeeds.</div>}
                    <details>
                    <summary style={{fontSize:11,color:colors.gold,cursor:'pointer',marginBottom:8}}>{obj.memoryMode !== 'legacy' && obj.memory ? 'Stored source records (not sent with layered memory)' : 'Original story records'}</summary>
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
                    </details>
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
          editableFromId={fullLog[coveredMessageCount(parseSummary(storySummary),fullLog) ?? 0]?.id}
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
          selectedModel={selectedModel}
        />
      </div>
    </div>
  );
}



