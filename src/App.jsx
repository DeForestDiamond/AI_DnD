import { useState, useRef, useEffect } from 'react';
import { animations, colors, fonts, btn, panel, cardStyle } from './styles/theme.js';
import { CLASSES, RACES, STAT_NAMES, STAT_DESC } from './constants/classes.js';
import { DEITIES } from './constants/deities.js';
import { SLOTS } from './constants/items.js';
import { useCharacter, modStr, statMod, calcAC, equippableInSlot, allItems, levelUpsAvailable, pruneDeadItemDefinitions } from './hooks/useCharacter.js';
import { useVoice } from './hooks/useVoice.js';
import { useSave } from './hooks/useSave.js';
import { useGame, buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptGpt, cleanDisplayText, MODEL_CONFIGS } from './hooks/useGame.js';
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
import { rollSituationAdventure } from './constants/adventures.js';
import { callGptStoryEntry, callGptArchive } from './helpers/openai/history.js';
import { callGptTownManager } from './helpers/openai/towns.js';
import { callGptNpcManager } from './helpers/openai/npcs.js';
import { callGptSalvage } from './helpers/openai/salvage.js';
import { callGptCrafting } from './helpers/openai/crafting.js';

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
  const cacheTimerRef = useRef(null);   // one-shot cache keep-warm

  // The prompt cache expires 5 minutes after its last use, and rebuilding it
  // costs ~12x what a read does. Four minutes after a turn, refresh it ONCE —
  // that buys another five minutes for a twelfth of the price. Fired once only:
  // continuous pinging costs more than a single rebuild past ~50 minutes idle.
  const armCacheTimer = () => {
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current);
    // OpenAI caching is automatic; Anthropic's explicit keep-warm ping does not apply.
    if (MODEL_CONFIGS[selectedModel]?.provider === 'openai') return;
    cacheTimerRef.current = setTimeout(async () => {
      cacheTimerRef.current = null;
      const c = charRef.current;
      if (!c?.stats?.dex) return;                       // no character in play
      const prompt = selectedModel === 'sonnet'
        ? buildSystemPromptSonnet(c)
        : selectedModel === 'haiku'
        ? buildSystemPrompt(c)
        : buildSystemPromptGpt(c);
      const data = await pingCache(prompt);
      if (data) logUsage('cache keep-warm', data);
    }, 4 * 60 * 1000);
  };
  useEffect(() => () => { if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current); }, []);

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
    getSettings: () => ({ selectedModel, showRawTags }),
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
  }, [character, phase, selectedModel, showRawTags]);

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

  // ── Adventure RNG seed ─────────────────────────────────────────────────────
  const rollAdventureSeed = (level = 1) => {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    const settings = [
      'a busy coastal port city', 'a sprawling inland trade city', 'a remote mountain fortress',
      'a dense ancient forest', 'a vast open grassland', 'a scorching desert town',
      'a frozen northern settlement', 'a swamp village on stilts', 'a noble estate in the countryside',
      'a thieves guild underground beneath a city', 'a moving merchant caravan on the road',
      'a remote island', 'an active volcano region', 'a halfling shire', 'a dwarven mine complex',
      'a riverside mill town', 'a university city of mages', 'a border garrison town',
      'a pilgrimage road to a holy site', 'a floating market on a great river', 'a logging camp at the forest edge',
      'a ruined city slowly being resettled', 'a hot-spring resort town', 'a hillside monastery',
      'a canyon settlement carved into the cliffs', 'a windswept fishing village', 'a lonely crossroads trading post',
    ];
    const times = [
      'early morning just after dawn', 'midday under a bright sun', 'a warm afternoon',
      'golden hour just before sunset', 'early evening as lanterns are lit', 'late night',
      'the small hours before dawn', 'a grey, indeterminate hour',
    ];
    const weathers = [
      'clear and sunny', 'warm with a light breeze', 'overcast but dry', 'light rain',
      'a sudden thunderstorm rolling in', 'thick morning fog', 'crisp and cold', 'sweltering heat',
      'a beautiful spring day with wildflowers', 'heavy snow', 'gusty and windy',
      'humid and still before a storm', 'a fine drizzle', 'unseasonable warmth', 'the first frost of the season',
    ];
    const tones = [
      'lighthearted and fun', 'gritty and grounded', 'tense and political', 'mysterious but not dark',
      'comedic with real stakes', 'action-packed from the start', 'slow burn intrigue',
      'warm and hopeful', 'eerie and unsettling (not horror)', 'bittersweet', 'rowdy and chaotic',
      'somber and reflective',
    ];
    const hooks = [
      'a job offer from a stranger', 'something valuable has been stolen', 'an old enemy resurfaces',
      'a local problem nobody else will deal with', 'a competition or tournament',
      'a merchant needs an escort', 'someone is missing', 'a strange creature has been spotted',
      'a noble needs a discreet service', 'a dungeon entrance has been discovered nearby',
      'a heist opportunity', 'a festival goes wrong', 'a bounty posted on a dangerous target',
      'a shipment of contraband intercepted', 'a monster terrorising the area',
      'a debt the player owes comes due', 'two factions each want the player on their side',
      'a child or stray animal leads the player somewhere', 'the player witnesses a crime in progress',
      'a map or sealed letter falls into the player\'s hands', 'a dying stranger leaves the player something',
      'the player is mistaken for someone important', 'a local rite or ritual needs an outsider',
      'the player\'s lodging, ship, or transport falls through', 'a wager or game of chance with real stakes',
      'someone calls in an old favor', 'the wagon or ship the player is travelling on stops unexpectedly',
    ];
    // HOW the scene opens — varies the structure/rhythm so starts don't all feel the same.
    const openingStyles = [
      'in media res: the player is already mid-action (a chase, a brawl, fleeing, or a task going wrong) when the scene opens',
      'open on dialogue: someone is already mid-sentence talking to the player as the scene begins',
      'a quiet, grounded moment (eating, resting, mending gear, working) that gets interrupted',
      'the player has just arrived somewhere new and is taking it in',
      'the immediate aftermath of something that already happened (a fight just ended, a deal collapsed, a storm just broke)',
      'a discovery: the player stumbles onto something they did not expect',
      'mid-task: the player is actively working, haggling, or travelling when things shift',
      'a tense standoff or confrontation already underway',
      'a calm, atmospheric establishing beat before anything happens',
    ];
    // A distinctive detail to weave in so each opening has its own texture.
    const wildcards = [
      'an unusual local custom or small festival happening right now',
      'a memorable, eccentric NPC who inserts themselves into the scene',
      'an odd sensory detail that sets this place apart (a strange smell, sound, or sight)',
      'a juicy piece of local gossip or rumour overheard nearby',
      'an animal or common creature behaving strangely',
      'a recent local event everyone is still talking about',
      'an eye-catching object, sign, or notice',
      'an unusual but harmless natural phenomenon',
      'a stranger who seems to mistake the player for someone else',
      'a minor mishap or inconvenience the player is already dealing with',
      'a street performance, market hawker, or impromptu crowd',
      'no wildcard — keep this one clean and straightforward',
    ];
    // Antagonist arrays live in constants/encounters.js so arc re-rolls use the same pool.
    const locations = [
      'a crowded market', 'a dockside tavern', 'a crossroads inn', 'the city gates',
      'a noble\'s receiving hall', 'a back alley', 'a guildhall', 'a temple courtyard',
      'a busy harbor', 'a village square', 'a roadside camp', 'a dungeon entrance',
      'a tournament grounds', 'a prison visiting room', 'a magic shop',
      'a crowded festival', 'a riverboat deck', 'a blacksmith\'s forge', 'a library or archive',
      'a stable yard', 'a steaming bathhouse', 'a graveyard at dusk', 'a bridge over a gorge',
      'a farmhouse kitchen', 'a watchtower on the wall', 'a caravanserai', 'a ferry crossing',
    ];

    const scope =
      level <= 4  ? 'LOW-LEVEL, LOCAL STORY. The stakes are small and immediate — one village, caravan, road, farm, or neighbourhood. The hook is exactly what it appears to be. The antagonist wants something ordinary (coin, territory, revenge, fear, survival). Do NOT invent ancient evils, sealed entities, prophecies, secret bloodlines, centuries-old conspiracies, chosen-one destinies, or world-ending threats. Keep the history shallow and the danger mundane.'
      : level <= 10 ? 'REGIONAL STORY. Threats can span a town or region and involve organised factions with real plans, but nothing world-ending. Mysteries may have some depth; avoid cosmic or world-shaking stakes.'
      : level <= 16 ? 'REALM-SHAKING STORY. Powerful factions, old secrets, and large threats are appropriate; stakes can reach across a kingdom.'
      :               'LEGENDARY STORY. World-shaking and planar stakes suit a hero of this power — but the enemies themselves stay concrete: armies, dragons, archmages, fiend lords with names and agendas. Epic scale comes from the SIZE of the threat, not its age. No sealed entities, no slumbering ancients.';

    return {
      scope,
      setting: pick(settings),
      time: pick(times),
      weather: pick(weathers),
      tone: pick(tones),
      hook: pick(hooks),
      antagonist: rollAntagonist(level),
      location: pick(locations),
      openingStyle: pick(openingStyles),
      wildcard: pick(wildcards),
    };
  };

  // ── API call ───────────────────────────────────────────────────────────────
  // Fresh adventures route through a choice: random seed or a player-written opening.
  const beginAdventure = (char) => setAdventureStartChar(char);

  const startAdventure = async (char, openingOverride = null, antagonistOverride = null, situationMode = false) => {
    log('startAdventure', { level: char.level, xp: char.xp, hp: char.hp });
    setLoading(true);
    setApiError('');
    try {
      const modelConfig = MODEL_CONFIGS[selectedModel];
      let seedPrompt;
      let arcAntagonist;
      let situationSeed = null;
      if (situationMode) {
        situationSeed = rollSituationAdventure(charRef.current?.completedAdventures || char?.completedAdventures || []);
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
        : buildSystemPromptGpt(charWithArc);
      const { text, usage } = await callDM(
        [{ role:'user', content: seedPrompt }],
        system,
        modelConfig,
        null,
        log
      );
      if (usage) setTokenUsage(usage);
      armCacheTimer();
      const newChar = applyEffects(text, charWithArc);
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
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 800,
          system: `You are archiving a section of a D&D campaign log into a permanent frozen reference of 200-300 words. This is the ONLY record that will survive of these events, so what you keep matters more than how you say it. Facts only, no scene-setting or atmosphere.


ARCHIVE COMPRESSION RULE: Target 200-300 words and make this archive substantially smaller than the source summaries. Merge related resolved events and preserve durable outcomes rather than intermediate steps. INFORMATION EXPIRES WHEN IT RESOLVES, NOT WHEN IT GETS OLD: unresolved threads and unresolved members of finite sets must remain specific enough to resume correctly, even if that occasionally requires exceeding the target. Do not use that exception for resolved history, flavor, dialogue, combat detail, repeated explanations, or routine loot.

PRESERVE ABOVE ALL — these are what the story is built on:
- OBLIGATIONS IN BOTH DIRECTIONS: debts owed to the player and by the player, promises made, bargains struck, favours banked, contracts signed, terms agreed. Who owes what to whom, and for what. Never drop these.
- RELATIONSHIPS AND HOW THEY CHANGED: who became an ally, enemy, employee, lover, rival; who was betrayed, spared, recruited, crossed. Record the change, not just the state.
- CONSEQUENTIAL DECISIONS and what followed from them, including who witnessed them and who will remember.
- DEATHS, disappearances, and who was responsible.
- QUEST THREADS opened, advanced, closed or abandoned; FACTION standing changes.
- PERMANENT CHANGES to the player: powers gained, oaths taken, curses, transformations, property or titles acquired.

NAMED PEOPLE: on first mention of any named NPC, give their pronoun AND race — "Harren (he, human)", "Vashaera (she, tiefling)", "Kess (they, kenku)". This is how future entries keep them consistent; without it a human becomes a kenku three sessions later.

RECORD BRIEFLY: significant items — named, magical, or quest-relevant — and only those. Locations visited and where the player ended up.

DROP ENTIRELY: routine loot and coin (a purse of gold from a bandit, ordinary supplies — the app tracks money and inventory itself), scene descriptions, dialogue, atmosphere, combat blow-by-blow, investigation detail that led nowhere, conversation that changed nothing.

RETCON RULE: if any events were walked back or declared not to have happened, omit them entirely.

Plain text only. No headers. No bullet points. Past tense. Output only the archive text.`,
          messages: [
            { role: 'user', content: `Archive these campaign log entries:\n\n${entriesToCompress.map(e => e.text).join('\n\n')}` },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        logUsage('archive summary', data);
        const text = data.content?.[0]?.text || '';
        if (text) {
          log(`[SUMMARY] Archived chunk created: ${text.length} chars`);
          return text;
        }
      }
    } catch (e) {
      log('[SUMMARY] Compression failed: ' + e.message);
    }
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
    const historyForSummary = toSummarize.map(m => ({
      role: m.role === 'dm' ? 'assistant' : 'user',
      content: m.text.substring(0, 600),
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
          transcript: gptTranscript,
        });
        gptStoryEntry = gptStory.text;
        gptStoryUsage = gptStory.usage;
        const gIn = gptStoryUsage?.input_tokens || 0;
        const gOut = gptStoryUsage?.output_tokens || 0;
        log(`[HELPER] story log via GPT ${gIn.toLocaleString()} in / ${gOut.toLocaleString()} out`);
      }
      const res = gptStoryEntry ? null : await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 800,
          system: `You are a D&D session scribe writing an APPEND-ONLY story log. Write ONLY the new entry for recent events — do NOT rewrite or reference anything already in the log. Use as much compact text as continuity requires; simple linear events should stay short.


CORE CONTINUITY RULE — INFORMATION EXPIRES WHEN IT RESOLVES, NOT WHEN IT GETS OLD. Compression is subordinate to continuity. Never omit, merge, generalize, or tidy away unresolved state merely to reduce length. If the story establishes a finite/enumerated set — opponents and wagers, suspects and clues, trials and prizes, contract clauses, objectives, promised rewards, destinations, components, or similar — preserve EVERY unresolved member and its associated detail until individually resolved. Open threads must retain who/what/where and their latest known state. Once genuinely resolved, they may be compressed aggressively into the outcome. There is no fixed length target when unresolved state requires more space.

WRITE DOWN FIRST, always, if any occurred:
- OBLIGATIONS BOTH WAYS: what someone now owes the player, what the player owes someone, promises made, bargains struck, terms agreed, favours banked or called in. These outlive everything else in the log — never omit one.
- RELATIONSHIP CHANGES with named people: who warmed, cooled, allied, betrayed, was hired, was spared, was crossed. Record the CHANGE, not a description of the person.
- Decisions with consequences, and who saw them made.
- Deaths and who caused them; quest threads opened or closed; faction standing shifts.
- Permanent changes to the player: oaths, curses, powers, titles, property.

THEN, briefly: significant items only — named, magical or quest-relevant — and where the player ended up.

DO NOT RECORD: routine loot and coin. Finding a purse of gold in a hoard is noise; the app tracks money and inventory itself. Ordinary supplies, ammunition and common gear are likewise not story. Skip conversation that changed nothing, investigation that led nowhere, and combat blow-by-blow — the outcome is enough.

NAMED PEOPLE: on first reference in this entry, give pronoun AND race — Harren (he, human), Vashaera (she, tiefling), Kess (they, kenku). Future entries rely on this; without it a human turns into a kenku three sessions later. GROUND TRUTH (authoritative — never contradict): the player character is ${charRef.current?.name || 'the adventurer'}; their current location at the END of this section is ${charRef.current?.currentLocation || 'unknown'}. Refer to the player by that exact name, and treat that location as where they are now — do NOT infer the player's name or current location from place names mentioned in the log text. Begin the entry with the current location in brackets, e.g. [${charRef.current?.currentLocation || 'Location'}]. Plain text only. No bullet points. No preamble. Just the new log entry.`,
          messages: [
            ...historyForSummary,
            { role: 'user', content: 'Write only the new log entry now.' },
          ],
        }),
      });

      if (!gptStoryEntry && !res.ok) { lastSummarizedAt.current = prevSummarizedAt; return; }
      const data = gptStoryEntry ? null : await res.json();
      if (data) logUsage('story log entry', data);
      const newEntry = gptStoryEntry || data?.content?.[0]?.text || '';
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

    const shape = '{ "npcs": { "Character Name": { "location": "Town or Town - District, or empty string", "relationship": "their relationship to ' + playerName + ' in a short phrase", "desc": "2-4 vivid sentences: appearance, personality, role, notable facts — include their gender pronoun on first mention" } } }';
    let task;
    if (trimmedName && existing) {
      task = `UPDATE the existing record for "${existing[0]}". The record below is ESTABLISHED TRUTH — treat it exactly as if it had appeared in the messages. Start from it, keep everything in it, and change only what these messages actually change.

The messages do NOT need to re-describe this character. They only need to show what happened. A range covering a single event is enough — read it for: how their relationship to ${playerName} changed, significant events they took part in, where they are now, obligations or promises between them, and any new facts. Fold those into the existing text and preserve the rest where nothing contradicts it.

NEVER return an empty result for an update. If the messages genuinely add nothing about this character, return the existing record unchanged.${note ? `

THE PLAYER SAYS THIS IS WHAT CHANGED — treat it as true and make sure the updated record reflects it: "${note}"` : ''}

EXISTING RECORD: ${JSON.stringify({ [existing[0]]: existing[1] })}`;
    } else if (trimmedName) {
      task = `Extract a record for ONLY the character named "${trimmedName}". If they do not appear in these messages, return { "npcs": {} }.`;
    } else {
      task = `Extract every SIGNIFICANT named character: recurring people, anyone with a name and a role in events. SKIP: ${playerName} (the player), unnamed extras, and one-line walk-ons like a merchant who appears once to sell something. When in doubt about significance, include them — the player chooses what to keep.`;
    }

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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: `You extract character records from D&D session transcripts. The player character is ${playerName} — never create a record for them. Base every record on what these messages establish PLUS, when updating, the existing record supplied in the task — that record is established truth, not invention, and must be preserved. Do not invent anything beyond those two sources. Respond with ONLY valid JSON in exactly this shape, no prose, no markdown fences: ${shape}`,
        messages: [
          ...apiMsgs,
          { role: 'user', content: task + '\n\nRespond with ONLY the JSON now.' },
        ],
      }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    logUsage('NPC extraction', data);
    const rawText = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cut = data.stop_reason === 'max_tokens' || !/[}\]]\s*$/.test(rawText);
      throw new Error(cut
        ? 'The reply was cut off before it finished — narrow the message range and try again'
        : 'Extraction returned unreadable JSON — try again or narrow the range');
    }
    const found = parsed.npcs || {};
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

    const shape = '{ "towns": { "Town Name": { "desc": "1-3 sentences: what this place is, its character and atmosphere", "status": "current state relative to ' + playerName + ' (e.g. established base, hostile, just passing through)", "notable_locations": { "Place Name": "one-line description" }, "minor_residents": { "Person Name": "one-line description with pronoun" } } } }';
    let task;
    if (trimmedName && existing) {
      task = `UPDATE the existing record for "${existing[0]}". The record below is ESTABLISHED TRUTH — treat it as if it had appeared in the messages. Start from it, keep everything in it, and change only what these messages change.

The messages do NOT need to re-describe the place. Read them for what is NEW: locations discovered, residents met, how the place changed, the player's standing there. ADD new notable_locations and minor_residents alongside the existing ones rather than replacing them.

NEVER return an empty result for an update. If the messages add nothing, return the existing record unchanged.${note ? `

THE PLAYER SAYS THIS IS WHAT CHANGED — treat it as true and reflect it: "${note}"` : ''}

EXISTING RECORD: ${JSON.stringify({ [existing[0]]: existing[1] })}`;
    } else if (trimmedName) {
      task = `Extract a record for ONLY the settlement/location named "${trimmedName}". If it does not appear in these messages, return { "towns": {} }.`;
    } else {
      task = `Extract every SIGNIFICANT settlement or major location: towns, cities, and named places where events happened or that the player will likely return to. SKIP one-line pass-throughs. When in doubt, include it — the player chooses what to keep.`;
    }

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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: `You extract settlement/location records from D&D session transcripts. Base every record on what these messages establish PLUS, when updating, the existing record supplied in the task — that record is established truth and must be preserved. notable_locations and minor_residents are name-keyed objects, not arrays. Respond with ONLY valid JSON in exactly this shape, no prose, no markdown fences: ${shape}`,
        messages: [...apiMsgs, { role: 'user', content: task + '\n\nRespond with ONLY the JSON now.' }],
      }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    logUsage('town extraction', data);
    const rawText = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cut = data.stop_reason === 'max_tokens' || !/[}\]]\s*$/.test(rawText);
      throw new Error(cut
        ? 'The reply was cut off before it finished — narrow the message range and try again'
        : 'Extraction returned unreadable JSON — try again or narrow the range');
    }
    const found = parsed.towns || {};
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
    const levelNote = `The character is level ${char.level}.`;
    const wantNote = intent?.trim()
      ? `The player specifically wants: "${intent.trim()}". Honour this if the materials plausibly allow it; if they do not, say why in the reason field and propose the closest achievable thing.`
      : 'The player has no specific request — propose what these materials most naturally become.';

    const setShape = `{ "options": [ { "name": "Set Name", "pieces": [ { "name": "Piece Name", "type": "weapon|armor|magic", "slot": "the slot this piece occupies", "damage": "weapons only", "heavy": "armor only", "maxDex": "armor only", "bonuses": "stat:N pairs or empty", "label": "what this piece does" } ], "count": "how many identical copies this makes — 1 unless the player asked for more", "consumes": [{"name":"Material Name","count":2}], "reason": "one sentence on the set and why these materials make it" } ] }`;
    const shape = `{ "options": [ { "name": "Item Name", "type": "weapon|armor|magic|consumable|construct|misc — armor ONLY for a main chest piece, every other wearable is magic, construct for golems and bound entities, misc for anything that is not gear at all", "status": "construct only — dormant, active, or bound", "slot": "one of: mainhand offhand armor face head neck shoulders cloak torso arms hands waist ring feet — omit for weapon/consumable", "damage": "weapons only — base dice, optional +N enchantment, and optional extra damage dice of another type: 1d8, 1d8+2, or 1d8+1 plus 1d4 radiant, or 2d6 plus 2d6 fire", "heavy": "armor only — true if it is heavy armour that ignores the wearer's Dexterity, false otherwise", "maxDex": "armor only — a number if the armour caps the Dexterity bonus (medium armour is usually 2), otherwise null", "bonuses": "stat:N pairs like ac:1 or str:2 or perception:3, or empty string", "label": "what it does, in plain words", "count": "how many identical copies this makes — 1 unless the player asked for more", "consumes": [{"name":"Material Name","count":2}], "reason": "one sentence on why these materials make this" } ] }`;

    // A construct is an ENTITY, not gear — it becomes a companion record with the
    // room to be described properly, rather than a label crammed into an item.
    const constructShape = `{ "options": [ { "name": "Construct Name", "cr": "challenge rating as a number", "race": "what it is, e.g. bone colossus, infernal war-construct", "role": "what it is for, e.g. siege engine, bodyguard, hunter", "appearance": "2-3 sentences on how it looks and moves", "abilities": "the kinds of power it wields — schools of magic, damage types, broad capabilities. NO specific spell names, NO damage dice, NO per-day counts", "desc": "3-5 sentences: what it is, how it was made, how it behaves, and what commanding it costs", "count": "how many identical copies this makes — 1 unless the player asked for more", "consumes": [{"name":"Material Name","count":2}], "reason": "one sentence on why these materials make this" } ] }`;
    const constructRules = asConstruct ? `

FORGING A CONSTRUCT: propose 2 alternative constructs — golems, war machines, animated dead, bound spirits. These are ENTITIES the player owns and commands, not equipment, so describe them properly:
- CR scales to the materials: ordinary parts CR 3-8, monstrous parts CR 10-16, legendary remains (ancient dragon, tarrasque, demon lord, archfiend) CR 20+.
- ABILITIES field: name the KINDS of power — "necrotic and shadow magic", "siege-scale physical force", "fear effects and command over lesser undead". Do NOT name specific spells, do NOT give damage dice, do NOT list per-day counts. The CR tells the DM how hard it hits; the rest is played, not tabulated.
- DESC field: this is the one place to be generous. What it is, how it was made, how it behaves, what it costs to command, and what it does when its bindings weaken. Do NOT write what commanding it requires or costs — not "as a bonus action", not "requires directed effort", not "costs focus" or "costs your attention". None of it is tracked, and a vague cost is worse than none because it reads as a rule. Write consequences in the world instead: what waking it announces, what it answers to, what happens as its binding weakens.
- Give it a real name, not a description-as-name.` : '';

    // A batch is DESIGNED by the model rather than multiplied by us: the player
    // may not hold N times each material, but a pile of mixed scrap can still
    // yield N things if the crafter allocates across it sensibly.
    const batchN = Math.max(1, Math.min(MAX_CRAFT_BATCH, parseInt(qty, 10) || 1));
    const batchRules = batchN > 1 ? `

MAKING SEVERAL — THIS OVERRIDES NOTHING ABOVE, IT ADDS TO IT. The player wants ${batchN} COPIES of whatever you propose. Still propose the usual 2-3 alternatives; each one is a design, and each design is made ${batchN} times.
Set "count": ${batchN} on EVERY option, and make its "consumes" cover all ${batchN} copies of that option together. A construct proposal means ${batchN} identical constructs, not one.
- They will NOT necessarily have ${batchN} times each material. Draw across the whole pile: different scrap for different copies is fine, and ${batchN} blades might come from assorted metal rather than ${batchN} identical ingots.
- If the materials cannot stretch to ${batchN}, propose the largest number they DO support, set "count" to that, and say so in the reason.
- Every copy is identical: one name, one description, one set of stats.` : '';

    const setRules = asSet ? `

CRAFTING A MATCHED SET: propose exactly 2 alternative SETS of 3-5 pieces each. Give every piece a proper label of 3-4 sentences — what it looks like, what it does, and what it was made from — the same care you would give a single crafted item. A set is a showpiece; describe it like one. Each set is a group of pieces that clearly belong together — shared material, shared motif, a shared name. Rules specific to sets:
- Use a DIFFERENT slot for each piece so the whole set can be worn at once. At most ONE piece may be the main chest armour (type "armor"); every other worn piece is type "magic" with its own slot. A weapon may be included if the materials suit it.
- Typical sets run 3-6 pieces: armour + head + hands + feet, or cloak + torso + arms + waist.
- POWER: judge each piece the way you would judge a single item made from a fair share of these materials, and give it that much. A set forged from tarrasque hide and demon lord remains must be LEGENDARY IN EVERY PIECE — real stat bonuses, meaningful AC, resistances, regeneration, named effects in the labels. Do NOT water pieces down to keep some total low; that produces a legendary set no better than one of drake hide, which is the opposite of the point. Ordinary materials still make ordinary gear — the scaling comes from what went in, exactly as it does for a single item.
- A set consumes proportionally more material than one item. Do not propose a six-piece set from three bones.
- NAMING: every piece name must clearly belong to the set. Derive each from the set's name or motif — for a set called "Apocalypse Plate": "Apocalypse Helm", "Apocalypse Gauntlets", "Greaves of the Apocalypse". Do NOT name pieces after the material they came from ("Tarrasque Breastplate", "Demogorgon Helm") — that reads as a pile of loot, not a matched set. The materials belong in the label, not the name.
- UPGRADING AN EXISTING SET: if the selection includes FINISHED EQUIPMENT (weapons, armour, worn magic items) rather than raw parts, those are pieces the player already owns and wants improved. Consume them and return their upgraded versions — keep each piece's identity and name lineage (an "Apocalypse Helm" becomes "Apocalypse Helm Reforged" or similar).
  Rewrite each upgraded piece's label from scratch to the current standard — 2-3 sentences, type-appropriate. Do not carry an old sprawling label across and add to it.
  AN UPGRADE MUST BE A REAL INCREASE, NOT A REARRANGEMENT. Each existing piece is listed above with its CURRENT BONUSES and, for armour, its ARMOUR RATING. Those numbers are a FLOOR:
    • every stat key present on the old piece must appear on the upgraded piece at an EQUAL OR HIGHER value — never drop a key, never lower a number
    • armour keeps or raises its ac value
    • weapons keep or raise their damage dice, enchantment and extra damage dice
    • everything the label promised still works, plus whatever the new materials add
  BUT REWRITE THE LABEL FROM SCRATCH to the current standard — 2-3 sentences, type-appropriate. Do NOT carry the old label across and append to it. Old items often have sprawling labels full of spell lists and damage numbers; an upgrade is the moment to condense that into what the item now IS and DOES. The mechanical floor above is about the STATS, not the prose: keep the numbers, discard the wordcount.
  Do NOT move a bonus from one piece to another and call it an upgrade, and do NOT reduce or delete anything to pay for an increase elsewhere. If the player asks to focus on one stat, ADD to that stat — do not strip the others to fund it. If the new materials are modest, add modestly, but every piece must end up strictly better than the one consumed. You may add NEW pieces to the set as well if the materials allow and a slot is free.` : '';

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
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          // A set is several pieces per option, each with name/slot/stats/label —
          // far more output than single items. Too small a ceiling truncates the
          // JSON mid-object and it fails to parse.
          max_tokens: asSet || asConstruct ? 4000 : 3000,
          system: `You are a master crafter in a D&D 5e game (Forgotten Realms). Given raw materials, propose 2-3 DISTINCT items that could plausibly be made from them — different in function, not just renamed versions of each other.

  RULES:
  - Power must fit the materials AND the character's level. Ordinary parts make ordinary gear; rare/monstrous parts make genuinely magical items. Do not hand out legendary power for common scraps.
  - Only consume materials that make sense for that item, and never more than the player has.
  - "consumes" MAY ONLY LIST MATERIALS FROM THE LIST ABOVE. Nothing else exists. Do not add a component because the design would sensibly need one, do not infer a material from another item's description, and do not reuse a name mentioned inside a NOTE — those are descriptions of what an item IS, not things the player holds. If the pile cannot make something, propose something the pile CAN make.
  - In "consumes", the "name" MUST be copied EXACTLY as it appears after NAME: in the material list — no quantity, no description, no parenthetical. Writing "Iron Ingot (dwarven, high carbon)" instead of "Iron Ingot" means the material cannot be found and the craft fails.
  - Every magical item must have a REAL mechanical effect: a +N on weapon damage, or stat:N bonuses, or both. "Enchanted" with no effect is forbidden.
  - Name items for what they do or where they came from — never "Enchanted X".
  - USE TYPE "misc" FOR ANYTHING THAT IS NOT GEAR. Refined stock and ingots, building material, furniture, rope, tools with no bonus, casks, instruments, art, trade goods, machinery, parts, a telescope, a printing press. If the player asks for something that is not worn, wielded, drunk or commanded, it is misc — do NOT force it into a weapon or magic slot to make it fit. Misc items carry a name and a label and nothing else: no slot, no bonuses, no damage.
  - CONSTRUCTS, GOLEMS AND BOUND ENTITIES use type "construct" — a thing the player OWNS AND COMMANDS rather than wears or carries: golems, animated skeletons, bound spirits and elementals, war machines, a wraith sealed in a gem. They take no equipment slot. Give a status ("dormant", "active", or "bound") and put everything else in the label. Their power is narrative, so do not give them stat bonuses; describe what they do instead.
    THE LABEL MUST OPEN WITH A CHALLENGE RATING — "CR 17. A forty-foot golem of fused bone..." — so the DM knows exactly how powerful it is when it acts. Set the CR from the materials: ordinary parts make a CR 3-8 servant, monstrous parts CR 10-16, legendary remains (ancient dragon, tarrasque, demon lord) CR 20+. Follow the CR with what it is, what it can do, and what commanding it costs.
  - ITEM TYPE IS STRICT. Use type "armor" ONLY for a main chest/body piece (breastplate, chain shirt, plate) — it takes the armor slot and its AC REPLACES the wearer's armour. EVERY other wearable is type "magic" with the matching slot: a cloak is magic/cloak, boots are magic/feet, a helm is magic/head, bracers are magic/arms, a belt is magic/waist, a shirt is magic/torso, gloves are magic/hands, a mask or goggles are magic/face, pauldrons are magic/shoulders, an amulet is magic/neck, a ring is magic/ring. OFFHAND is shared: a shield is magic/offhand with an appropriate ac:N bonus and any other effects; a spellcasting focus is magic/offhand with appropriate bonuses/effects. Giving a cloak type "armor" puts it in the armour slot and throws away the wearer's real armour — never do this.
  - A magic wearable's power lives in its bonuses (ac:N, str:N, dex:N ...). Protective effects that aren't calculable — disadvantage on attacks against you, advantage on saves, resistances — should be represented by a sensible ac:N bonus AND described in the label, so the item does something mechanically as well as narratively.
  - ELEMENTAL AND DIVINE WEAPONS express their extra damage in the damage field as "plus <dice> <type>" — e.g. "1d8+1 plus 1d4 radiant", "2d6 plus 3d10 necrotic", and these stack: "1d6+2 plus 1d4 lightning plus 1d4 thunder". The app rolls these separately and doubles them on a critical hit. Damage described ONLY in the label is never rolled, so a flaming sword whose fire lives in the label is mechanically a plain sword.
  - ONLY these bonus keys are calculated: ac, str, dex, con, int, wis, cha, and skill names (perception, stealth, athletics, persuasion ...). Invented keys like "necrotic_resistance:full" or "fire_immunity:true" do nothing — express resistances, immunities and per-day powers in the LABEL instead.
  - ARMOUR PROTECTION COMES FROM ITS "ac" FIELD, NOT A BONUS. For a type "armor" chest piece, better protection means a HIGHER ac VALUE — masterwork plate is ac 19 or 20, not ac 18 with a separate ac:2. Reserve the bonuses field on armour for STAT bonuses (con:2, str:1). Other worn pieces — helm, cloak, ring, boots — are type "magic" and DO use ac:N in their bonuses, since they have no ac field of their own.
  - LABELS ARE SHORT AND TYPE-APPROPRIATE. Only a weapon's damage field and its "plus" dice are ever rolled by the game — everything in a label is narration. A label stuffed with spell lists and damage numbers costs the player context on EVERY turn for the rest of the campaign and buys nothing mechanical.
    DO NOT WRITE WHAT IT COSTS TO USE OR COMMAND SOMETHING. The game tracks no actions, bonus actions, reactions, concentration or per-turn limits, so none of that is simulated — and a vague substitute is worse, because it sounds like a rule and is not one. ALL of these are banned: "as a bonus action", "requires an action", "once per turn", "as a reaction", "requires concentration", "requires directed effort", "costs focus", "costs your attention", "demands concentration to control", and every other phrase of that shape. Just omit the sentence. If the thing has a genuine consequence in the WORLD — it can be seen for miles when it wakes, it answers only to a word you set, its binding frays a little each time — write that instead, as a fact about the thing rather than a price the player pays to act.
    LABELS ARE NOTES, NOT PROSE. This text is fed to the DM on every turn for the rest of the campaign, so it is paid for hundreds of times. Write it telegraphically: fragments separated by semicolons, no full sentences, no connecting clauses, no "the X allowing you to Y" constructions. Keep what it looks like and what it does; cut everything that only makes it read nicely. Aim for under 25 words.
      BLOATED: "Mithral boots plated with dragon scales and mythallar circuits, the distribution nodes allowing you to anchor yourself to any surface or float weightlessly at will. The soles leave glowing footprints."
      RIGHT:   "Mithral, dragon scale, glowing footprints; anchor to any surface; float at will."
      BLOATED: "The three walkers function as nodes of a single strategic consciousness, their cognitive cores creating an overlapping hive intelligence."
      RIGHT:   "Three walkers, one hive mind; shared senses; coordinate without speech."
    Then, by type:
    WEAPON — the damage field carries the numbers. The label gets at most ONE special ability, in a clause. No second and third powers, no per-day spell lists.
    ARMOUR — defensive, protective and utility effects ONLY: resistances, immunities, endurance, movement, senses. Armour never has offensive abilities and never deals damage.
    ACCESSORIES (rings, cloaks, belts, boots, gloves, bracers, amulets, headwear, shirts) — utility and passive effects only. NO damage dice at all, and no attack powers.
    CONSTRUCTS — what it is, and what commanding it costs. The CR at the front tells the DM how hard it hits; do NOT list spells, per-day powers or damage numbers.
  - Charges and per-day effects are narrative text; there is no charge counter.
  - ${levelNote}${constructRules}${setRules}${batchRules}
  Respond with ONLY valid JSON in exactly this shape, no prose, no markdown fences: ${asConstruct ? constructShape : asSet ? setShape : shape}`,
          messages: [{ role: 'user', content: `MATERIALS AVAILABLE:\n${matList}\n\n${wantNote}\n\nRespond with ONLY the JSON now.` }],
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      logUsage('crafting', data);
      const raw = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
      try {
        parsed = JSON.parse(raw);
      } catch {
        // A response cut off by the token ceiling ends mid-object rather than
        // with a closing brace — say so instead of a generic parse failure.
        const truncated = data.stop_reason === 'max_tokens' || !/[}\]]\s*$/.test(raw);
        throw new Error(truncated
          ? 'The forge ran long and the answer was cut off — select fewer materials, or try again'
          : 'Crafting returned unreadable JSON — try again');
      }
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

    const shape = `{ "results": [ { "recovers": [{"name":"Material Name","count":2}], "destroyed": ["Item Name"], "note": "one sentence on what survived the process and what was lost" } ] }`;

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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        // A multi-corpse harvest returns many distinct materials; too small a
        // ceiling truncates the list and silently costs the player materials.
        // Generous by design: a batch harvest returns the full yield of every
        // creature submitted, and output is billed only when actually generated.
        max_tokens: 12000,
        system: `You are a salvager in a D&D 5e game (Forgotten Realms). Given finished items, determine what raw materials are recovered by breaking them down.

RULES:
- TWO DIFFERENT JOBS, decide which this is:
  (a) BREAKING DOWN SOMETHING MADE — a forged weapon, worked armour, a construct, an enchanted item. Recovery is LOSSY: the making is undone and some of it is ruined. Recover meaningfully less than went in, and never more than the item plausibly contains.
  (b) HARVESTING A BODY — a corpse, carcass, cadaver, severed part, or any unworked remains. This is NOT lossy: nothing was invested to be destroyed, the material is simply there to be taken. Return the FULL sensible yield of what such a creature actually contains — hide, scales, bone, claws, fangs, organs, blood, venom glands, essence — in quantities that match its size and power. A dragon carcass yields a great deal; a wolf yields a little.
  A body that has been WORKED into something (a bone golem, a skull carved into a focus) is case (a) again — the construction is what gets ruined.
- Recover the item's actual substance: a steel blade yields steel, a drake-hide cloak yields hide and maybe scales, a wand yields its focus crystal and rare wood. Magical items may yield a residue or spent component alongside the physical parts.
- Some things are NOT worth salvaging or cannot be: state that in the note and return an empty recovers array rather than inventing materials.
- NAME MATERIALS BY WHAT THEY ARE, NEVER BY WHAT THEY CAME FROM. This is the most important rule here. A recovered material must be a GENERIC STOCK NAME that will stack with the same material recovered from anything else — otherwise every salvage adds unique clutter to the inventory and nothing accumulates into a usable quantity.
  WRONG: "Iron Spear Head", "Wooden Spear Shaft"        RIGHT: "Scrap Iron", "Wooden Haft"
  WRONG: "Sword Blade", "Sword Hilt", "Sword Pommel"    RIGHT: "Scrap Steel" (one entry, not three)
  WRONG: "Hexapod Leg Actuator"                          RIGHT: "Arcane Actuator"
  WRONG: "Runewarden Cuirass Plating"                    RIGHT: "Mithral Plating"
  The test: could this exact name come out of salvaging a DIFFERENT item? If not, rename it until it could.
- CONSOLIDATE ACROSS THE WHOLE SUBMISSION. Do not give each submitted item its own material. Everything made of the same stuff collapses into ONE entry with the quantities summed, no matter what it used to be. Iron rims, iron axles, iron bosses, iron banding, iron spikes, iron rods and iron plate are all just SCRAP IRON — one line, not seven. The same for steel, mithral, wood, leather.
- NEVER USE "<thing> STOCK" OR A COMPONENT NAME. "Iron Spearhead Stock", "Steel Caliper Stock", "Mithral Weapon Mount", "Steel Bolt Head", "Wooden Bolt Shaft", "Arcanite Core Housings" all name the thing it came from. Say what the material IS: Scrap Iron, Scrap Steel, Mithral Stock, Wood.
- DO NOT MINE THE ITEM'S NAME FOR PARTS. Descriptive words tell you what a thing is LIKE, not what it separates into. A "Dwarven Strongbox - Triple-Locked" does not yield three locks — it yields iron and maybe one lock mechanism. "Iron-Rimmed", "Reinforced", "Masterwork", "Bladed", "Runed" and the like describe quality or construction, not a parts list to be counted off.
- SALVAGE YIELDS RAW MATERIAL, NOT WORKING PARTS. Breaking something down destroys its construction: a chest becomes scrap iron and fittings, not intact locks you could refit. The exception is genuinely precision or arcane components — an arcane core, an actuator, a focusing lens — which survive being extracted and are worth naming.
- KEEP THE LIST SHORT. Even a hundred submitted items should come back as roughly TEN TO FIFTEEN material types with large quantities — not one type per item. A long list means you have not consolidated. Distinct materials that genuinely differ (mithral vs steel, ruby vs sapphire, arcanite vs crystal) stay separate; variations of the same material do not.
- A genuinely distinctive MATERIAL still keeps its name — "Red Dragon Scale", "Demon Lord Essence", "Mithral Wire" are material types, not parts of a particular item, and they stack correctly across salvages.
- Return exactly ONE result object, but it must cover EVERY submitted item in full. Harvest each creature or item for ITS OWN parts and list them SEPARATELY — a drake and a troll and an owlbear yield drake scale, troll hide and owlbear claws as distinct entries, never a merged pool of "monster parts". Submitting five corpses must produce roughly five times the materials of submitting one; do not compress a large haul into a short list. There is no cap on how many entries the recovers array may hold — length it to match what was actually submitted.
- Multiply quantities by how many of each item were submitted: three drake carcasses yield three drakes' worth.
Respond with ONLY valid JSON in exactly this shape, no prose, no markdown fences: ${shape}`,
        messages: [{ role: 'user', content: `ITEMS TO BREAK DOWN:\n${itemList}\n\nRespond with ONLY the JSON now.` }],
      }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    logUsage('salvage', data);
    const raw = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const cut = data.stop_reason === 'max_tokens' || !/[}\]]\s*$/.test(raw);
      throw new Error(cut
        ? 'The reply was cut off before it finished — select fewer items and try again'
        : 'Salvage returned unreadable JSON — try again');
    }
    const result = (parsed.results || [])[0];
    if (!result) throw new Error('Nothing could be recovered');
    log(`[SALVAGE] Recovers: ${(result.recovers || []).map(r => `${r.name} x${r.count}`).join(', ') || 'nothing'}`);
    return result;
  };

  // Consume the submitted items (inventory first, then stash) and add whatever
  // was recovered. Mirrors executeCrafting's split-source handling.
  const executeDismantle = (result, submitted) => {
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
    updateChar(next);
    log(`[SALVAGE] Broke down ${submitted.map(i => `${i.name} x${i.count}`).join(', ')}`);
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
        : buildSystemPromptGpt(charRef.current);
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

      let newChar = applyEffects(effectsText, charRef.current);
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
            Your key stays in your browser only. Get one at console.anthropic.com. Using Haiku model for low cost.
          </div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
          <button style={{...btn(true),fontSize:14,padding:'12px 28px',opacity:apiKey?1:0.4}} disabled={!apiKey} onClick={()=>setPhase('create-race')}>
            BEGIN YOUR LEGEND
          </button>
          <button style={{...btn(false),fontSize:12,padding:'12px 18px',opacity:apiKey?1:0.4}} disabled={!apiKey} onClick={()=>{setShowSave(true);}}>
            📂 Load / Import
          </button>
        </div>
        {!apiKey && <div style={{fontSize:11,color:colors.textGhost,marginTop:12}}>Enter your API key above to begin</div>}
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
          antagonists={antagonistsForLevel(adventureStartChar.level)}
          defeatedAntagonists={adventureStartChar.defeatedAntagonists || []}
          onRandom={() => { const c = adventureStartChar; setAdventureStartChar(null); startAdventure(c); }}
          onSituationAdventure={() => { const c = adventureStartChar; setAdventureStartChar(null); startAdventure(c, null, null, true); }}
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
