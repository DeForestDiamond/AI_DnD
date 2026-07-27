import { useState, useRef } from 'react';
import { animations, colors, fonts, btn, panel, cardStyle } from './styles/theme.js';
import { CLASSES, RACES, STAT_NAMES, STAT_DESC } from './constants/classes.js';
import { DEITIES } from './constants/deities.js';
import { SLOTS } from './constants/items.js';
import { useCharacter, modStr, statMod, calcAC, equippableInSlot, allItems } from './hooks/useCharacter.js';
import { useVoice } from './hooks/useVoice.js';
import { useSave } from './hooks/useSave.js';
import { useGame, buildSystemPrompt, buildSystemPromptSonnet, cleanDisplayText, MODEL_CONFIGS } from './hooks/useGame.js';
import { rollAntagonist, encounterChance, rollEncounterDirective, PACING_ORDER } from './constants/encounters.js';
import { Sidebar } from './components/Sidebar.jsx';
import { MessageFeed } from './components/MessageFeed.jsx';
import { InputBar } from './components/InputBar.jsx';
import { SaveModal } from './components/modals/SaveModal.jsx';
import { MulticlassModal } from './components/modals/MulticlassModal.jsx';
import { ItemPickerModal } from './components/modals/ItemPickerModal.jsx';
import { AbilitiesModal } from './components/modals/AbilitiesModal.jsx';
import { DeityModal, WARLOCK_PATRONS } from './components/modals/DeityModal.jsx';
import { SubclassModal } from './components/modals/SubclassModal.jsx';
import { AdventureStartModal } from './components/modals/StartModal.jsx';
import { owedSubclasses } from './constants/subclasses.js';

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
  const [apiKey, setApiKey]     = useState('');
  const [apiError, setApiError] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [slotTarget, setSlotTarget] = useState(null);
  const [companionSlotTarget, setCompanionSlotTarget] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
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
  const [selectedModel, setSelectedModel] = useState('sonnet'); // 'sonnet' or 'haiku'
  const [storySummary, setStorySummary] = useState('');
  const [tokenUsage, setTokenUsage]     = useState(null);
  const storySummaryRef = useRef('');
  const isMobile = window.innerWidth < 768;

  const log = (msg, data) => {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`;
    console.log(entry);
    setDebugLog(prev => [...prev.slice(-49), entry]);
  };

  const {
    character, charRef, updateChar, loadCharacter,
    selectRace, selectClass, selectDeity, finalizeCharacter,
    applyEffects, spendStatPoint,
    equipToSlot, unequipSlot, equipCompanionItem, unequipCompanionItem,
    moveToStash, moveToInventory,
    createBag, addToBag, removeFromBag, deleteItem, deleteFromBag,
    toggleContextExclusion,
    pendingStatPoint, setPendingStatPoint,
    levelUpMsg,
  } = useCharacter();

  const voice = useVoice();
  const { callDM, buildActionContext, interceptRollRequest } = useGame({ charRef, apiKey });

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
  const SPELLCASTER_CLASSES = ['Artificer','Cleric','Wizard','Warlock','Sorcerer','Druid','Paladin','Ranger'];

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

  const applyLoadedFull = (char, msgs, summary = '') => {
    loadCharacter(char);
    setFullLog(msgs);
    fullLogRef.current = msgs;
    setStorySummary(summary);
    storySummaryRef.current = summary;
    initSummarizedAt(msgs.length, summary);
    queuePostLoadModals(char);
    setPhase('playing');
  };

  const applyLoadedCharacter = (char) => {
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

  const save = useSave({
    charRef,
    messages: fullLog,
    storySummaryRef,
    onLoadFull: applyLoadedFull,
    onLoadCharacter: applyLoadedCharacter,
  });

  // Auto-save after every DM response
  const addMessage = (msg) => {
    setFullLog(prev => {
      const next = [...prev, msg];
      fullLogRef.current = next;
      save.autoSave(charRef.current, next);
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

  const startAdventure = async (char, openingOverride = null, antagonistOverride = null) => {
    log('startAdventure', { level: char.level, xp: char.xp, hp: char.hp });
    setLoading(true);
    setApiError('');
    try {
      const modelConfig = MODEL_CONFIGS[selectedModel];
      let seedPrompt;
      let arcAntagonist;
      if (openingOverride && openingOverride.trim()) {
        // Player wrote the opening — use their antagonist if given, else roll a hidden one.
        arcAntagonist = antagonistOverride?.trim() || rollAntagonist(char.level, null, char.defeatedAntagonists);
        seedPrompt = `[ADVENTURE START — PLAYER-SPECIFIED OPENING]\nBegin the adventure exactly as the player describes below. Do NOT randomize the setting, location, or situation — use what they wrote. Open the scene there with vivid physical detail, keep it within the story scope appropriate to a level ${char.level} character, and end with exactly 4 numbered choices (at least one chaotic or unconventional, at least one ruthless or self-serving, all written neutrally).\n\nPLAYER'S OPENING:\n${openingOverride.trim()}`;
      } else {
        const seed = rollAdventureSeed(char.level);
        arcAntagonist = seed.antagonist;
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
ANTAGONIST (do NOT reveal or name yet — plant subtle setup only): ${seed.antagonist}

REQUIRED: Set the opening in a real Faerûn location — a canon city or region of the Forgotten Realms (e.g. a tavern in Baldur's Gate, the docks of Waterdeep, a roadhouse on the Trade Way near Daggerford). You may invent a specific local spot (a named inn, shrine, or alley) but it must sit inside a real canon place. Ground the scene in physical details matching the weather and time, and open it in the OPENING STYLE above rather than a stock "you stand in X" description. Emit a [LOCATION:] tag with the canon place name. End at a natural decision point and ALWAYS close with exactly 4 numbered choices — vary the framing that leads into them (a question an NPC puts to the player, a confrontation, a deadline), but the 4 numbered choices themselves are mandatory and never omitted. At least one should be chaotic or unconventional, at least one ruthless or self-serving, all written neutrally.

NON-COMPLIANCE: If you open with anything other than the parameters above, you have failed your role as DM.`;
      }
      // Persist the arc so every later turn's foreshadowing points at the same villain.
      const charWithArc = { ...char, arc: { antagonist: arcAntagonist } };
      log(`[ARC] Adventure start — antagonist rolled: ${arcAntagonist}`);
      const system = selectedModel === 'sonnet'
        ? buildSystemPromptSonnet(charWithArc)
        : buildSystemPrompt(charWithArc);
      const { text, usage } = await callDM(
        [{ role:'user', content: seedPrompt }],
        system,
        modelConfig
      );
      if (usage) setTokenUsage(usage);
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
          system: `You are a D&D session scribe writing an APPEND-ONLY story log. Write ONLY the new entry for recent events — do NOT rewrite or reference anything already in the log. Write 3-5 sentences.

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

      if (!res.ok) { lastSummarizedAt.current = prevSummarizedAt; return; }
      const data = await res.json();
      const newEntry = data.content?.[0]?.text || '';
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
  const proposeCrafting = async ({ materials, intent, asSet }) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    const char = charRef.current;
    if (!materials.length) throw new Error('Select at least one material');

    const matList = materials.map(m => `NAME: ${m.name} | HAVE: ${m.count}${m.label ? ` | NOTE: ${m.label}` : ''}`).join('\n');
    const levelNote = `The character is level ${char.level}.`;
    const wantNote = intent?.trim()
      ? `The player specifically wants: "${intent.trim()}". Honour this if the materials plausibly allow it; if they do not, say why in the reason field and propose the closest achievable thing.`
      : 'The player has no specific request — propose what these materials most naturally become.';

    const setShape = `{ "options": [ { "name": "Set Name", "pieces": [ { "name": "Piece Name", "type": "weapon|armor|magic", "slot": "the slot this piece occupies", "damage": "weapons only", "heavy": "armor only", "maxDex": "armor only", "bonuses": "stat:N pairs or empty", "label": "what this piece does" } ], "consumes": [{"name":"Material Name","count":2}], "reason": "one sentence on the set and why these materials make it" } ] }`;
    const shape = `{ "options": [ { "name": "Item Name", "type": "weapon|armor|magic|consumable|construct — use armor ONLY for a main chest piece; every other wearable is magic; use construct for golems, animated things and bound entities", "status": "construct only — dormant, active, or bound", "slot": "one of: mainhand offhand armor face head neck shoulders cloak torso arms hands waist ring1 ring2 feet — omit for weapon/consumable", "damage": "weapons only — base dice, optional +N enchantment, and optional extra damage dice of another type: 1d8, 1d8+2, or 1d8+1 plus 1d4 radiant, or 2d6 plus 2d6 fire", "heavy": "armor only — true if it is heavy armour that ignores the wearer's Dexterity, false otherwise", "maxDex": "armor only — a number if the armour caps the Dexterity bonus (medium armour is usually 2), otherwise null", "bonuses": "stat:N pairs like ac:1 or str:2 or perception:3, or empty string", "label": "what it does, in plain words", "consumes": [{"name":"Material Name","count":2}], "reason": "one sentence on why these materials make this" } ] }`;

    const setRules = asSet ? `

CRAFTING A MATCHED SET: propose exactly 2 alternative SETS of 3-5 pieces each. Keep every label to ONE short sentence — brevity matters here, a long response gets cut off. Each set is a group of pieces that clearly belong together — shared material, shared motif, a shared name. Rules specific to sets:
- Use a DIFFERENT slot for each piece so the whole set can be worn at once. At most ONE piece may be the main chest armour (type "armor"); every other worn piece is type "magic" with its own slot. A weapon may be included if the materials suit it.
- Typical sets run 3-6 pieces: armour + head + hands + feet, or cloak + torso + arms + waist.
- BALANCE: the set's TOTAL power scales with the MATERIALS, then gets spread across the pieces. Rough guide for the whole set combined, not per piece:
    ordinary hide, iron, common beast parts        -> about +2 total across all bonuses
    rare or monstrous parts (drake, troll, giant)   -> about +4 total
    legendary parts (ancient dragon, tarrasque, demon lord, archfiend, god-touched) -> +6 to +9 total, and pieces may carry damage resistances, regeneration or other named effects in their labels
  Spread that total across the pieces however suits them — a set may be +3 AC on the chest and helm with +2 STR on the gauntlets and +1 CON on the greaves. Do NOT hand a legendary set a single +1: materials of that calibre must produce armour worth wearing.
- A set consumes proportionally more material than one item. Do not propose a six-piece set from three bones.
- NAMING: every piece name must clearly belong to the set. Derive each from the set's name or motif — for a set called "Apocalypse Plate": "Apocalypse Helm", "Apocalypse Gauntlets", "Greaves of the Apocalypse". Do NOT name pieces after the material they came from ("Tarrasque Breastplate", "Demogorgon Helm") — that reads as a pile of loot, not a matched set. The materials belong in the label, not the name.` : '';

    log(`[CRAFT] Proposing ${asSet ? 'matched SETS' : 'items'} from ${materials.length} material stacks`);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        // A set is several pieces per option, each with name/slot/stats/label —
        // far more output than single items. Too small a ceiling truncates the
        // JSON mid-object and it fails to parse.
        max_tokens: asSet ? 4000 : 3000,
        system: `You are a master crafter in a D&D 5e game (Forgotten Realms). Given raw materials, propose 2-3 DISTINCT items that could plausibly be made from them — different in function, not just renamed versions of each other.

RULES:
- Power must fit the materials AND the character's level. Ordinary parts make ordinary gear; rare/monstrous parts make genuinely magical items. Do not hand out legendary power for common scraps.
- Only consume materials that make sense for that item, and never more than the player has.
- In "consumes", the "name" MUST be copied EXACTLY as it appears after NAME: in the material list — no quantity, no description, no parenthetical. Writing "Iron Ingot (dwarven, high carbon)" instead of "Iron Ingot" means the material cannot be found and the craft fails.
- Every magical item must have a REAL mechanical effect: a +N on weapon damage, or stat:N bonuses, or both. "Enchanted" with no effect is forbidden.
- Name items for what they do or where they came from — never "Enchanted X".
- CONSTRUCTS, GOLEMS AND BOUND ENTITIES use type "construct" — a thing the player OWNS AND COMMANDS rather than wears or carries: golems, animated skeletons, bound spirits and elementals, war machines, a wraith sealed in a gem. They take no equipment slot. Give a status ("dormant", "active", or "bound") and put everything else — what it is, what it can do, what commanding it costs — in the label. Their power is narrative, so do not give them stat bonuses; describe what they do instead.
- ITEM TYPE IS STRICT. Use type "armor" ONLY for a main chest/body piece (breastplate, chain shirt, plate) — it takes the armor slot and its AC REPLACES the wearer's armour. EVERY other wearable is type "magic" with the matching slot: a cloak is magic/cloak, boots are magic/feet, a helm is magic/head, bracers are magic/arms, a belt is magic/waist, a shirt is magic/torso, gloves are magic/hands, a mask or goggles are magic/face, pauldrons are magic/shoulders, an amulet is magic/neck, a ring is magic/ring1. Giving a cloak type "armor" puts it in the armour slot and throws away the wearer's real armour — never do this.
- A magic wearable's power lives in its bonuses (ac:N, str:N, dex:N ...). Protective effects that aren't calculable — disadvantage on attacks against you, advantage on saves, resistances — should be represented by a sensible ac:N bonus AND described in the label, so the item does something mechanically as well as narratively.
- ELEMENTAL AND DIVINE WEAPONS express their extra damage in the damage field as "plus <dice> <type>" — e.g. "1d8+1 plus 1d4 radiant", "2d6 plus 3d10 necrotic", and these stack: "1d6+2 plus 1d4 lightning plus 1d4 thunder". The app rolls these separately and doubles them on a critical hit. Damage described ONLY in the label is never rolled, so a flaming sword whose fire lives in the label is mechanically a plain sword.
- ONLY these bonus keys are calculated: ac, str, dex, con, int, wis, cha, and skill names (perception, stealth, athletics, persuasion ...). Invented keys like "necrotic_resistance:full" or "fire_immunity:true" do nothing — express resistances, immunities and per-day powers in the LABEL instead.
- The label states the effect in plain words. Charges and per-day effects are narrative text; there is no charge counter.
- ${levelNote}${setRules}
Respond with ONLY valid JSON in exactly this shape, no prose, no markdown fences: ${asSet ? setShape : shape}`,
        messages: [{ role: 'user', content: `MATERIALS AVAILABLE:\n${matList}\n\n${wantNote}\n\nRespond with ONLY the JSON now.` }],
      }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    const raw = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
    let parsed;
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
    const normOpt = (o) => ({ ...o, bonuses: normBonuses(o.bonuses) });
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
  // Resolve a material name returned by the model back to an item the player
  // actually holds. Models sometimes echo the descriptive form ("Iron Ingot
  // (dwarven)") or a quantity suffix; match exactly first, then progressively
  // looser, so a formatting slip doesn't fail an otherwise valid craft.
  const resolveHeldName = (wanted, held) => {
    const w = (wanted || '').trim();
    const exact = held.find(h => h.toLowerCase() === w.toLowerCase());
    if (exact) return exact;
    const stripped = w.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+x\d+$/i, '').trim();
    const onStripped = held.find(h => h.toLowerCase() === stripped.toLowerCase());
    if (onStripped) return onStripped;
    // longest held name that the requested string begins with (handles a
    // trailing description appended without brackets)
    const prefix = held
      .filter(h => stripped.toLowerCase().startsWith(h.toLowerCase()))
      .sort((a, b) => b.length - a.length)[0];
    return prefix || w;
  };

  const executeCrafting = (option) => {
    const c = charRef.current;
    // Materials can come from inventory OR stash. Count both, verify the player
    // still holds enough (guards a stale panel), then consume inventory first
    // and take the remainder from the stash.
    const invCount = {}, stashCount = {};
    (c.inventory || []).forEach(n => { invCount[n] = (invCount[n] || 0) + 1; });
    (c.stash || []).forEach(n => { stashCount[n] = (stashCount[n] || 0) + 1; });
    // Normalise every requested material to a name the player actually holds
    const heldNames = [...new Set([...Object.keys(invCount), ...Object.keys(stashCount)])];
    const consumes = (option.consumes || []).map(m => ({ ...m, name: resolveHeldName(m.name, heldNames) }));
    for (const m of consumes) {
      const held = (invCount[m.name] || 0) + (stashCount[m.name] || 0);
      if (held < (m.count || 1)) throw new Error(`Not enough ${m.name} (have ${held}, need ${m.count || 1})`);
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
      return `[ITEM: ${o.name} | magic | ${o.slot || 'neck'} | ${o.bonuses || ''} | ${o.label || ''}]`;
    };
    // A set creates every piece from one craft; the materials are consumed once.
    const isSet = Array.isArray(option.pieces) && option.pieces.length > 0;
    const tag = isSet ? option.pieces.map(tagFor).join('') : tagFor(option);

    // [REMOVE:] only touches inventory, so split the consumption: take what we
    // can from inventory via tags, and splice the rest out of the stash here.
    const stashTakes = [];
    const removeTags = consumes.map(m => {
      const want = m.count || 1;
      const fromInv = Math.min(want, invCount[m.name] || 0);
      const fromStash = want - fromInv;
      if (fromStash > 0) stashTakes.push({ name: m.name, count: fromStash });
      return fromInv > 0 ? `[REMOVE: ${m.name}${fromInv > 1 ? ` | qty:${fromInv}` : ''}]` : '';
    }).join('');

    let next = applyEffects(tag + removeTags, c);
    if (stashTakes.length) {
      const stash = [...(next.stash || [])];
      for (const t of stashTakes) {
        for (let i = 0; i < t.count; i++) {
          const idx = stash.findIndex(n => n.toLowerCase() === t.name.toLowerCase());
          if (idx !== -1) stash.splice(idx, 1);
        }
      }
      next = { ...next, stash };
    }
    updateChar(next);
    const madeDesc = isSet ? `${option.name} (${option.pieces.length} pieces)` : option.name;
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

    const db = { ...(char.customItems || {}), ...(char.stashedCustomItems || {}) };
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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2500,
        system: `You are a salvager in a D&D 5e game (Forgotten Realms). Given finished items, determine what raw materials are recovered by breaking them down.

RULES:
- Recovery is ALWAYS LOSSY. Breaking something apart ruins some of it — recover meaningfully less than went into making it. Never return more material than the item plausibly contains.
- Recover the item's actual substance: a steel blade yields steel, a drake-hide cloak yields hide and maybe scales, a wand yields its focus crystal and rare wood. Magical items may yield a residue or spent component alongside the physical parts.
- Some things are NOT worth salvaging or cannot be: state that in the note and return an empty recovers array rather than inventing materials.
- Material names should be simple and reusable ("Steel Scrap", "Drake Hide", "Spent Arcane Crystal") so they can be crafted with again — not one-off names.
- Return exactly ONE result object covering all the submitted items together.
Respond with ONLY valid JSON in exactly this shape, no prose, no markdown fences: ${shape}`,
        messages: [{ role: 'user', content: `ITEMS TO BREAK DOWN:\n${itemList}\n\nRespond with ONLY the JSON now.` }],
      }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
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
    const invCount = {}, stashCount = {};
    (c.inventory || []).forEach(n => { invCount[n] = (invCount[n] || 0) + 1; });
    (c.stash || []).forEach(n => { stashCount[n] = (stashCount[n] || 0) + 1; });
    for (const it of submitted) {
      const held = (invCount[it.name] || 0) + (stashCount[it.name] || 0);
      if (held < it.count) throw new Error(`Not enough ${it.name} (have ${held}, need ${it.count})`);
    }

    const addTags = (result.recovers || [])
      .map(r => `[ITEM: ${r.name}${(r.count || 1) > 1 ? ` | qty:${r.count}` : ''}]`)
      .join('');
    const stashTakes = [];
    const removeTags = submitted.map(it => {
      const fromInv = Math.min(it.count, invCount[it.name] || 0);
      const fromStash = it.count - fromInv;
      if (fromStash > 0) stashTakes.push({ name: it.name, count: fromStash });
      return fromInv > 0 ? `[REMOVE: ${it.name}${fromInv > 1 ? ` | qty:${fromInv}` : ''}]` : '';
    }).join('');

    let next = applyEffects(addTags + removeTags, c);
    if (stashTakes.length) {
      const stash = [...(next.stash || [])];
      for (const t of stashTakes) {
        for (let i = 0; i < t.count; i++) {
          const idx = stash.findIndex(n => n.toLowerCase() === t.name.toLowerCase());
          if (idx !== -1) stash.splice(idx, 1);
        }
      }
      next = { ...next, stash };
    }
    updateChar(next);
    log(`[SALVAGE] Broke down ${submitted.map(i => `${i.name} x${i.count}`).join(', ')}`);
    return (result.recovers || []).map(r => `${r.name} x${r.count || 1}`).join(', ') || 'nothing';
  };

  // Remove a foe from the defeated ledger — they become rollable again. In the
  // Realms very little stays dead, so this is a normal thing to want.
  const reviveAntagonist = (name) => {
    const c = charRef.current;
    updateChar({ ...c, defeatedAntagonists: (c.defeatedAntagonists || []).filter(d => d !== name) });
    log(`[ARC] ${name} removed from the defeated ledger — rollable again`);
  };

  // Cycle a construct's status: dormant -> active -> bound -> dormant.
  // Works whether the construct is carried or stashed.
  const cycleConstructStatus = (name) => {
    const c = charRef.current;
    const ORDER = ['dormant', 'active', 'bound'];
    const store = c.customItems?.[name] ? 'customItems' : (c.stashedCustomItems?.[name] ? 'stashedCustomItems' : null);
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

    const outgoing = continuePrefix + userMsg + actionCtx + encounterCtx;

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
      const system = selectedModel === 'sonnet'
        ? buildSystemPromptSonnet(charRef.current)
        : buildSystemPrompt(charRef.current);
      const { text: dmText, usage: dmUsage } = await callDM(
        [...history, { role:'user', content: outgoing }],
        system,
        modelConfig,
        signal
      );
      if (dmUsage) setTokenUsage(dmUsage);

      // Check if DM requested a skill roll — intercept and roll it
      const { resultText, rollResult: skillRoll } = interceptRollRequest(dmText, charRef.current, log);
      let finalText = dmText;
      let finalRoll = actionRoll || skillRoll || null;
      let rollSetupText = '';

      // If DM requested a roll, send the result back for narration
      if (resultText) {
        // Surface the DM's pre-roll message (the setup that called the roll) in the
        // feed — otherwise the player only sees post-roll narration and the scene
        // looks like it jumped mid-action. Strip the [ROLL:] tag from the display.
        const setupText = dmText.replace(/\[ROLL:[^\]]*\]/gi, '').trim();
        if (setupText) {
          rollSetupText = setupText;
          addMessage({ role:'dm', text: setupText, id: Date.now() - 1, roll: null });
        }
        const { text: followUp, usage: followUpUsage } = await callDM(
          [...history,
           { role:'user', content: outgoing },
           { role:'assistant', content: dmText },
           { role:'user', content: resultText }
          ],
          system,
          modelConfig,
          signal
        );
        if (followUpUsage) setTokenUsage(followUpUsage);
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

      let newChar = applyEffects(finalText, charRef.current);
      if (newChar.arc?.antagonist !== charRef.current.arc?.antagonist) {
        log(`[ARC] Arc complete — new antagonist rolled: ${newChar.arc?.antagonist}`);
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
    const char = finalizeCharacter(nameInput, bioInput);
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
          style={{width:'100%',boxSizing:'border-box',background:colors.bg,border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.body,fontSize:13,lineHeight:1.5,padding:'10px 14px',borderRadius:4,marginBottom:16,outline:'none',resize:'vertical'}}/>
        <div style={{display:'flex',gap:8}}>
          <button style={{...btn(false),flex:1}} onClick={()=>setPhase(['Cleric','Warlock','Paladin'].includes(character.cls?.name)?'create-deity':'create-class')}>← BACK</button>
          <button style={{...btn(true),flex:2}} onClick={handleFinalize}>BEGIN THE ADVENTURE →</button>
        </div>
      </div>
    </div>
  );

  // ── Playing ────────────────────────────────────────────────────────────────
  const db = allItems(character.customItems || {});

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

      {pendingStatPoint && (
        <MulticlassModal
          character={character}
          classLevels={character.classLevels || { [character.cls?.name]: character.level }}
          deityPending={showDeityModal}
          onChooseClass={(cls) => {
            if (['Cleric','Warlock','Paladin'].includes(cls) && !character.deity) {
              setDeityModalContext('multiclass');
              setDeityModalClass(cls);
              setShowDeityModal(true);
            }
          }}
          onChooseStat={(className, stat) => {
            spendStatPoint(className, stat);
            // If this level-up crosses the class's subclass pick level (e.g.
            // Druid 2, Monk 3), prompt now instead of waiting for a file load.
            const cur = charRef.current;
            const newLevels = { ...(cur.classLevels || {}), [className]: ((cur.classLevels || {})[className] || 0) + 1 };
            const owed = owedSubclasses({ ...cur, classLevels: newLevels });
            if (owed.length) {
              setSubclassQueue(q => [...new Set([...q, ...owed])]);
              setShowSubclassModal(true);
            }
          }}
        />
      )}

      {adventureStartChar && (
        <AdventureStartModal
          onRandom={() => { const c = adventureStartChar; setAdventureStartChar(null); startAdventure(c); }}
          onManual={(text, antagonist) => { const c = adventureStartChar; setAdventureStartChar(null); startAdventure(c, text, antagonist); }}
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

      {levelUpMsg && !pendingStatPoint && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',background:`linear-gradient(135deg,${colors.gold},${colors.goldDim})`,color:colors.bg,fontFamily:fonts.display,fontWeight:'bold',fontSize:13,padding:'12px 24px',borderRadius:6,zIndex:200,animation:'levelUp 6s ease forwards',whiteSpace:'nowrap'}}>
          {levelUpMsg}
        </div>
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
            debugStatus={`char: lv${character.level} xp:${character.xp} pending:${String(pendingStatPoint)}`}
            directives={character.directives || ''}
            onChangeDirectives={(text)=>updateChar({ ...charRef.current, directives: text })}
            voiceSettings={voice.voiceSupported ? {
              voiceName: voice.voiceName, setVoiceName: voice.setVoiceName,
              rate: voice.rate, setRate: voice.setRate,
              pitch: voice.pitch, setPitch: voice.setPitch,
              availableVoices: voice.availableVoices, preview: voice.previewVoice,
            } : null}
            character={character}
            onSlotClick={handleSlotClick}
            onCompanionSlotClick={handleCompanionSlotClick}
            onCompanionUnequip={unequipCompanionItem}
            onSaveClick={()=>setShowSave(true)}
            onAbilitiesClick={()=>setShowAbilitiesModal(true)}
            onClose={isMobile ? ()=>setSidebarOpen(false) : null}
            onMoveToStash={moveToStash}
            onMoveToInventory={moveToInventory}
            onCreateBag={createBag}
            onAddToBag={addToBag}
            onRemoveFromBag={removeFromBag}
            onDeleteItem={deleteItem}
            onDeleteFromBag={deleteFromBag}
            selectedModel={selectedModel}
            onToggleModel={() => setSelectedModel(m => m === 'sonnet' ? 'haiku' : 'sonnet')}
            pacing={character.pacing || 'normal'}
            environment={character.environment || 'wilderness'}
            onChangeEnvironment={(env)=>updateChar({ ...charRef.current, environment: env })}
            onTogglePacing={() => {
              const cur = charRef.current.pacing || 'normal';
              const next = PACING_ORDER[(PACING_ORDER.indexOf(cur) + 1) % PACING_ORDER.length];
              updateChar({ ...charRef.current, pacing: next });
            }}
            arcAntagonist={character.arc?.antagonist || null}
            onClearArc={() => {
              const { arc, ...rest } = charRef.current;
              updateChar(rest);
              log('[ARC] Cleared by player — no antagonist, story is open');
            }}
            onRollArc={() => {
              const a = rollAntagonist(charRef.current.level, charRef.current.arc?.antagonist, charRef.current.defeatedAntagonists);
              updateChar({ ...charRef.current, arc: { antagonist: a } });
              log(`[ARC] Rolled by player — new antagonist: ${a}`);
            }}
            onSetArc={(text) => {
              updateChar({ ...charRef.current, arc: { antagonist: text } });
              log(`[ARC] Custom antagonist set by player: ${text}`);
            }}
            onToggleContextExclusion={toggleContextExclusion}
            onSaveBio={(bio) => { updateChar({ ...charRef.current, bio }); log('[BIO] Updated by player'); }}
            defeatedAntagonists={character.defeatedAntagonists || []}
            onReviveAntagonist={reviveAntagonist}
            onCycleConstructStatus={cycleConstructStatus}
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
