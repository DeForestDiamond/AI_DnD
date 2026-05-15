import { useState, useRef } from 'react';
import { animations, colors, fonts, btn, panel, cardStyle } from './styles/theme.js';
import { CLASSES, RACES, STAT_NAMES, STAT_DESC } from './constants/classes.js';
import { DEITIES } from './constants/deities.js';
import { SLOTS, allItems as allItemsHelper } from './constants/items.js';
import { useCharacter, modStr, statMod, calcAC, equippableInSlot, allItems } from './hooks/useCharacter.js';
import { useVoice } from './hooks/useVoice.js';
import { useSave } from './hooks/useSave.js';
import { useGame, buildSystemPrompt } from './hooks/useGame.js';
import { Sidebar } from './components/Sidebar.jsx';
import { MessageFeed } from './components/MessageFeed.jsx';
import { InputBar } from './components/InputBar.jsx';
import { SaveModal } from './components/modals/SaveModal.jsx';
import { LevelUpModal } from './components/modals/LevelUpModal.jsx';
import { MulticlassModal } from './components/modals/MulticlassModal.jsx';
import { ItemPickerModal } from './components/modals/ItemPickerModal.jsx';
import { AbilitiesModal } from './components/modals/AbilitiesModal.jsx';
import { DeityModal } from './components/modals/DeityModal.jsx';

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
  const [messages, setMessages] = useState([]);
  const [fullLog,  setFullLog]  = useState([]);
  const fullLogRef = useRef([]);
  const [loading, setLoading]   = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [apiKey, setApiKey]     = useState('');
  const [apiError, setApiError] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [slotTarget, setSlotTarget] = useState(null);
  const [levelUpToast, setLevelUpToast] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [showAbilitiesModal, setShowAbilitiesModal] = useState(false);
  const [showDeityModal, setShowDeityModal] = useState(false);
  const [deityModalContext, setDeityModalContext] = useState('multiclass'); // 'multiclass' or 'oldSave'
  const [storySummary, setStorySummary] = useState('');
  const [tokenUsage, setTokenUsage]     = useState(null);
  const storySummaryRef = useRef('');
  const isMobile = window.innerWidth < 768;

  // Keep storySummary ref in sync
  storySummaryRef.current = storySummary;

  const log = (msg, data) => {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`;
    console.log(entry);
    setDebugLog(prev => [...prev.slice(-49), entry]);
  };

  const {
    character, charRef, updateChar, loadCharacter,
    selectRace, selectClass, selectDeity, finalizeCharacter,
    applyEffects, spendStatPoint,
    equipToSlot, unequipSlot,
    moveToStash, moveToInventory,
    pendingStatPoint, setPendingStatPoint,
    levelUpMsg,
  } = useCharacter();

  const voice = useVoice();
  const { callDM, buildActionContext, interceptRollRequest, processEnemyAttacks } = useGame({ charRef, apiKey });

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  fullLogRef.current = fullLog;

  // ── Save/Load ──────────────────────────────────────────────────────────────
  const isClericCharacter = (char) =>
    char.cls?.name === 'Cleric' ||
    (char.classLevels && Object.keys(char.classLevels).includes('Cleric'));

  const save = useSave({
    charRef,
    messages: fullLog,
    storySummary,
    onLoadFull: (char, msgs, summary = '') => {
      loadCharacter(char);
      setFullLog(msgs);
      fullLogRef.current = msgs;
      const tail = summary ? msgs.slice(-KEEP_RECENT) : msgs;
      setMessages(tail);
      setStorySummary(summary);
      storySummaryRef.current = summary;
      if (char._needsDeitySelection && isClericCharacter(char)) {
        setDeityModalContext('oldSave');
        setShowDeityModal(true);
      }
      setPhase('playing');
    },
    onLoadCharacter: (char) => {
      loadCharacter(char);
      setMessages([]); setFullLog([]); fullLogRef.current = [];
      if (char._needsDeitySelection && isClericCharacter(char)) {
        setDeityModalContext('oldSave');
        setShowDeityModal(true);
      }
      setPhase('playing');
      setTimeout(() => startAdventure(char), 100);
    },
  });

  // Auto-save after every DM response
  const addMessage = (msg) => {
    // Update display window immediately — simple and reliable
    setMessages(prev => [...prev, msg]);
    // Update full log separately for persistence
    setFullLog(prev => {
      const next = [...prev, msg];
      fullLogRef.current = next;
      save.autoSave(charRef.current, next);
      return next;
    });
  };

  // ── Adventure RNG seed ─────────────────────────────────────────────────────
  const rollAdventureSeed = () => {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    const settings = [
      'a busy coastal port city', 'a sprawling inland trade city', 'a remote mountain fortress',
      'a dense ancient forest', 'a vast open grassland', 'a scorching desert town',
      'a frozen northern settlement', 'a swamp village on stilts', 'a noble estate in the countryside',
      'a thieves guild underground beneath a city', 'a moving merchant caravan on the road',
      'a remote island', 'an active volcano region', 'a halfling shire', 'a dwarven mine complex',
    ];
    const times = [
      'early morning just after dawn', 'midday under a bright sun', 'a warm afternoon',
      'golden hour just before sunset', 'early evening as lanterns are lit', 'late night',
    ];
    const weathers = [
      'clear and sunny', 'warm with a light breeze', 'overcast but dry', 'light rain',
      'a sudden thunderstorm rolling in', 'thick morning fog', 'crisp and cold', 'sweltering heat',
      'a beautiful spring day with wildflowers', 'heavy snow', 'gusty and windy',
    ];
    const tones = [
      'lighthearted and fun', 'gritty and grounded', 'tense and political', 'mysterious but not dark',
      'comedic with real stakes', 'action-packed from the start', 'slow burn intrigue',
    ];
    const hooks = [
      'a job offer from a stranger', 'something valuable has been stolen', 'an old enemy resurfaces',
      'a local problem nobody else will deal with', 'a competition or tournament',
      'a merchant needs an escort', 'someone is missing', 'a strange creature has been spotted',
      'a noble needs a discreet service', 'a dungeon entrance has been discovered nearby',
      'a heist opportunity', 'a festival goes wrong', 'a bounty posted on a dangerous target',
      'a shipment of contraband intercepted', 'a monster terrorising the area',
    ];
    const antagonists = [
      'a thieves guild', 'a corrupt local official', 'a gang of bandits', 'a goblin warband',
      'a troll', 'a pack of gnolls', 'a rogue wizard', 'a smuggling ring', 'a rival adventuring party',
      'a cult (not cosmic horror — a mundane power-hungry cult)', 'a dragon (young)',
      'a vampire and their thralls', 'a necromancer raising the local dead', 'a pirate captain',
      'a yuan-ti slaver operation', 'a group of hobgoblin soldiers', 'a giant causing problems',
    ];
    const locations = [
      'a crowded market', 'a dockside tavern', 'a crossroads inn', 'the city gates',
      'a noble\'s receiving hall', 'a back alley', 'a guildhall', 'a temple courtyard',
      'a busy harbor', 'a village square', 'a roadside camp', 'a dungeon entrance',
      'a tournament grounds', 'a prison visiting room', 'a magic shop',
    ];

    return {
      setting: pick(settings),
      time: pick(times),
      weather: pick(weathers),
      tone: pick(tones),
      hook: pick(hooks),
      antagonist: pick(antagonists),
      location: pick(locations),
    };
  };

  // ── API call ───────────────────────────────────────────────────────────────
  const startAdventure = async (char) => {
    log('startAdventure', { level: char.level, xp: char.xp, hp: char.hp });
    setLoading(true);
    setApiError('');
    try {
      const system = buildSystemPrompt(char);
      const seed = rollAdventureSeed();
      const seedPrompt = `Begin the adventure with EXACTLY these parameters — do not deviate:
Setting: ${seed.setting}
Time of day: ${seed.time}
Weather: ${seed.weather}
Tone: ${seed.tone}
Opening location: ${seed.location}
Adventure hook: ${seed.hook}
Antagonist (do not reveal yet, just set up): ${seed.antagonist}
Generate a fresh specific location name that fits the setting. Set the scene and give the first choices.`;
      const { text, usage } = await callDM(
        [{ role:'user', content: seedPrompt }],
        system
      );
      if (usage) setTokenUsage(usage);
      const newChar = applyEffects(text, char);
      log('applyEffects after startAdventure', { xpBefore: char.xp, xpAfter: newChar.xp, levelBefore: char.level, levelAfter: newChar.level });
      updateChar(newChar);
      const firstMsg = { role:'dm', text, id:Date.now(), roll:null };
      setMessages([firstMsg]);
      setFullLog([firstMsg]);
      fullLogRef.current = [firstMsg];
      save.autoSave(newChar, [firstMsg]);
      voice.speak(text);
    } catch (e) {
      setApiError(e.message);
      setMessages([{ role:'dm', text:`The candle flickers... (${e.message})`, id:Date.now(), roll:null }]);
    }
    setLoading(false);
  };

  const SUMMARIZE_AFTER = 20;  // summarize when history exceeds this many messages
  const KEEP_RECENT     = 6;   // always keep this many recent messages verbatim
  const lastSummarizedAt = useRef(0); // track last message count we summarized at

  // Condense old messages into a rolling summary, keep recent tail verbatim
  const maybeAutoSummarize = async (allMessages) => {
    if (allMessages.length < SUMMARIZE_AFTER) return;
    // Only fire once per SUMMARIZE_AFTER block — not on every message after 20
    const nextThreshold = lastSummarizedAt.current + SUMMARIZE_AFTER;
    if (allMessages.length < nextThreshold) return;
    lastSummarizedAt.current = allMessages.length;
    const toSummarize = allMessages.slice(0, allMessages.length - KEEP_RECENT);
    const recent      = allMessages.slice(-KEEP_RECENT);

    const prevSummary = storySummaryRef.current;    const historyForSummary = toSummarize.map(m => ({
      role: m.role === 'dm' ? 'assistant' : 'user',
      content: m.text.substring(0, 600),
    }));

    // Add-only: never rewrite existing summary, only append new events
    const summaryPrompt = prevSummary
      ? `NEW EVENTS TO LOG (these happened after the existing log below):\n`
      : `Log what has happened in this adventure so far:\n`;

    try {
      const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
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
          system: `You are a D&D session scribe writing an APPEND-ONLY story log. Your job is to write ONLY the new entry for recent events — do NOT rewrite, summarize, or reference anything already in the log. Write 3-5 sentences covering: key events, NPCs encountered, places visited, important items or gold gained, who the victims and who the threats were (never invert these), active legal agreements, contained entities, faction changes. Begin your entry with the current location or arc in brackets e.g. [Thornwick]. Plain text only. No bullet points. No preamble. Just the new log entry.`,
          messages: [
            ...historyForSummary,
            { role: 'user', content: summaryPrompt + 'Write only the new log entry now.' },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newEntry = data.content?.[0]?.text || '';
        if (newEntry) {
          // Append new entry to existing log — never replace it
          const updatedSummary = prevSummary
            ? prevSummary + '\n\n' + newEntry
            : newEntry;
          setStorySummary(updatedSummary);
          storySummaryRef.current = updatedSummary;
          // Only trim display window if there are actually more messages than KEEP_RECENT
          if (allMessages.length > KEEP_RECENT) {
            setMessages(recent);
            log('[SUMMARY] Appended new log entry — kept last ' + KEEP_RECENT + ' messages in view');
          }
        }
      }
    } catch (e) {
      log('[SUMMARY] Failed: ' + e.message);
    }
  };

  // Build the API history from summary + recent messages
  const buildApiHistory = (allMessages) => {
    const summary = storySummaryRef.current;
    const apiMsgs = allMessages.map(m => ({
      role: m.role === 'dm' ? 'assistant' : 'user',
      content: m.text,
    }));
    if (!summary) return apiMsgs;
    // Prepend summary as a user/assistant exchange so the DM has full context
    return [
      { role: 'user',      content: '[STORY SO FAR — read before continuing]\n' + summary },
      { role: 'assistant', content: 'Understood. I have the full story context and will continue from where we left off.' },
      ...apiMsgs,
    ];
  };

  const handleSend = async (userMsg) => {
    setLoading(true);
    setApiError('');

    // Detect "please continue" — skip attack context, inject resume instruction
    const isContinue = /^\s*(please\s+)?(continue|finish|go on|keep going|finish the scene|resume|you got cut off|message got cut off|got cut off|finish the story|finish that|finish your)\b/i.test(userMsg.trim());

    // Build attack context if player is attacking (skip for continue requests)
    const { context: actionCtx, rollResult: actionRoll } = isContinue
      ? { context: '', rollResult: null }
      : buildActionContext(userMsg);

    const continuePrefix = isContinue
      ? '[Your previous response was cut off mid-sentence. Continue EXACTLY where you left off — do not restart or summarize the scene, just resume the prose from where it ended.]\n\n'
      : '';

    const history = buildApiHistory(fullLogRef.current);

    addMessage({ role:'user', text:userMsg, id:Date.now() });

    // Check if we should auto-summarize (based on full log length)
    const allMsgs = fullLogRef.current;
    if (allMsgs.length >= SUMMARIZE_AFTER) {
      maybeAutoSummarize(allMsgs); // fire-and-forget, don't await
    }

    try {
      const system = buildSystemPrompt(charRef.current);
      const { text: dmText, usage: dmUsage } = await callDM(
        [...history, { role:'user', content: continuePrefix + userMsg + actionCtx }],
        system
      );
      if (dmUsage) setTokenUsage(dmUsage);

      // Check if DM requested a skill roll — intercept and roll it
      const { resultText, rollResult: skillRoll } = interceptRollRequest(dmText, charRef.current, log);
      let finalText = dmText;
      let finalRoll = actionRoll || skillRoll || null;

      // If DM requested a roll, send the result back for narration
      if (resultText) {
        const { text: followUp, usage: followUpUsage } = await callDM(
          [...history,
           { role:'user', content: continuePrefix + userMsg + actionCtx },
           { role:'assistant', content: dmText },
           { role:'user', content: resultText }
          ],
          system
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
      updateChar(newChar);
      addMessage({ role:'dm', text:finalText, id:Date.now(), roll:finalRoll });
      voice.speak(finalText);
    } catch (e) {
      setApiError(e.message);
      addMessage({ role:'dm', text:`The magic wavers... (${e.message})`, id:Date.now(), roll:null });
    }
    setLoading(false);
  };

  // ── Slot handling ──────────────────────────────────────────────────────────
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
    const char = finalizeCharacter(nameInput);
    setPhase('playing');
    await startAdventure(char);
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
        onLoadFull={(char, msgs, summary = '') => {
          loadCharacter(char);
          setFullLog(msgs); fullLogRef.current = msgs;
          const tail = summary ? msgs.slice(-KEEP_RECENT) : msgs;
          setMessages(tail); setStorySummary(summary); storySummaryRef.current = summary;
          setPhase('playing');
          if (char._needsDeitySelection && isClericCharacter(char)) {
            setDeityModalContext('oldSave');
            setShowDeityModal(true);
          }
        }}
        onLoadCharacter={(char) => {
          loadCharacter(char);
          setMessages([]); setFullLog([]); fullLogRef.current = [];
          setPhase('playing');
          if (char._needsDeitySelection && isClericCharacter(char)) {
            setDeityModalContext('oldSave');
            setShowDeityModal(true);
          }
          setTimeout(()=>startAdventure(char),100);
        }}
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
          <button style={{...btn(true),flex:2,opacity:character.cls?1:0.4}} disabled={!character.cls} onClick={()=>character.cls?.name === 'Cleric' ? setPhase('create-deity') : setPhase('create-name')}>CONTINUE →</button>
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
        <h2 style={{fontFamily:fonts.display,color:colors.gold,fontSize:22,margin:'0 0 6px'}}>Choose Your Deity</h2>
        <p style={{color:colors.textGhost,fontSize:13,marginBottom:24}}>Which god do you serve? Your deity shapes your divine powers and moral path.</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
          {DEITIES.map(deity => (
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
        <p style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:4,marginBottom:8}}>CHARACTER CREATION — STEP {character.cls?.name==='Cleric'?'4':'3'} OF {character.cls?.name==='Cleric'?'4':'3'}</p>
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
          {Object.entries(character.stats).map(([k,v])=>(
            <StatBar key={k} label={STAT_NAMES[k]} value={v} desc={STAT_DESC[k]}/>
          ))}
        </div>
        <input value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleFinalize()} placeholder="Enter your hero's name..."
          style={{width:'100%',boxSizing:'border-box',background:colors.bg,border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.body,fontSize:16,padding:'10px 14px',borderRadius:4,marginBottom:16,outline:'none'}}/>
        <div style={{display:'flex',gap:8}}>
          <button style={{...btn(false),flex:1}} onClick={()=>setPhase(character.cls?.name==='Cleric'?'create-deity':'create-class')}>← BACK</button>
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
        onLoadFull={(char, msgs, summary = '') => {
          loadCharacter(char);
          setFullLog(msgs);
          fullLogRef.current = msgs;
          const tail = summary ? msgs.slice(-KEEP_RECENT) : msgs;
          setMessages(tail);
          setStorySummary(summary);
          storySummaryRef.current = summary;
          setPhase('playing');
          if (char._needsDeitySelection && isClericCharacter(char)) {
            setDeityModalContext('oldSave');
            setShowDeityModal(true);
          }
          const spellcasters = ['Artificer','Cleric','Wizard'];
          const hasSpellClass = Object.keys(char.classLevels || {}).some(c => spellcasters.includes(c));
          const needsAbilities = hasSpellClass && (!char.abilities || (
            char.abilities.cantrips?.length === 0 &&
            char.abilities.spells?.length === 0 &&
            char.abilities.infusions?.length === 0
          ));
          if (needsAbilities) setTimeout(() => setShowAbilitiesModal(true), 500);
        }}
        onLoadCharacter={(char) => {
          loadCharacter(char);
          setMessages([]); setFullLog([]); fullLogRef.current = [];
          setPhase('playing');
          if (char._needsDeitySelection && isClericCharacter(char)) {
            setDeityModalContext('oldSave');
            setShowDeityModal(true);
          }
          const spellcasters = ['Artificer','Cleric','Wizard'];
          const hasSpellClass = Object.keys(char.classLevels || {}).some(c => spellcasters.includes(c));
          const needsAbilities = hasSpellClass && (!char.abilities || (
            char.abilities.cantrips?.length === 0 &&
            char.abilities.spells?.length === 0 &&
            char.abilities.infusions?.length === 0
          ));
          if (needsAbilities) setTimeout(() => setShowAbilitiesModal(true), 500);
          setTimeout(()=>startAdventure(char),100);
        }}
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

      {showDeityModal && (
        <DeityModal
          context={deityModalContext}
          onSelectDeity={(deity) => {
            selectDeity(deity);
            updateChar({ ...charRef.current, deity, _needsDeitySelection: false });
            setShowDeityModal(false);
          }}
        />
      )}

      {pendingStatPoint && (
        <MulticlassModal
          character={character}
          classLevels={character.classLevels || { [character.cls?.name]: character.level }}
          deityPending={showDeityModal}
          onChooseClass={(cls) => {
            if (cls === 'Cleric' && !character.deity) {
              setDeityModalContext('multiclass');
              setShowDeityModal(true);
            }
          }}
          onChooseStat={(className, stat) => spendStatPoint(className, stat)}
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

      {/* Debug overlay */}
      <div style={{position:'fixed',bottom:0,left:0,zIndex:999}}>
        <button onClick={()=>setShowDebug(v=>!v)} style={{background:'#1a0f05',border:'1px solid #3a2a10',color:'#4a3a20',fontSize:9,padding:'3px 6px',cursor:'pointer',fontFamily:'monospace'}}>
          🐛 debug
        </button>
        {showDebug && (
          <div style={{position:'fixed',bottom:30,left:0,width:360,height:300,background:'rgba(0,0,0,0.95)',border:'1px solid #3a2a10',overflowY:'auto',padding:8,fontFamily:'monospace',fontSize:9,color:'#7fc97f'}}>
            <div style={{color:'#c9a84c',marginBottom:4,display:'flex',justifyContent:'space-between'}}>
              <span>DEBUG LOG</span>
              <span>char: lv{character.level} xp:{character.xp} pending:{String(pendingStatPoint)}</span>
            </div>
            {debugLog.map((entry, i) => <div key={i} style={{borderBottom:'1px solid #1a1208',paddingBottom:2,marginBottom:2,wordBreak:'break-all'}}>{entry}</div>)}
            {debugLog.length === 0 && <div style={{color:'#4a3a20'}}>no logs yet</div>}
          </div>
        )}
      </div>

      {/* Sidebar — hidden on mobile when closed */}
      {(!isMobile || sidebarOpen) && (
        <div style={{position: isMobile ? 'fixed' : 'relative', zIndex: isMobile ? 50 : 'auto', top:0, left:0, height:'100vh'}}>
          <Sidebar
            character={character}
            onSlotClick={handleSlotClick}
            onSaveClick={()=>setShowSave(true)}
            onAbilitiesClick={()=>setShowAbilitiesModal(true)}
            onClose={isMobile ? ()=>setSidebarOpen(false) : null}
            onMoveToStash={moveToStash}
            onMoveToInventory={moveToInventory}
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
            {/* Sidebar toggle button */}
            <button onClick={()=>setSidebarOpen(v=>!v)}
              style={{background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textFaint,padding:'4px 8px',fontSize:14,borderRadius:3,cursor:'pointer'}}>
              {sidebarOpen && !isMobile ? '◀' : '▶'}
            </button>
            <span style={{fontFamily:fonts.display,fontSize:13,color:colors.gold,letterSpacing:2}}>🐉 TALES OF THE REALM</span>
          </div>
          {storySummary && (
            <button onClick={()=>setSummaryOpen(v=>!v)}
              style={{background:'transparent',border:`1px solid ${colors.borderDim}`,color:colors.textFaint,padding:'4px 8px',fontSize:14,borderRadius:3,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
              <span style={{fontSize:10,fontFamily:fonts.display,letterSpacing:1,color:colors.gold}}>📜</span>
              {summaryOpen ? '▲' : '▼'}
            </button>
          )}
        </div>

        {storySummary && summaryOpen && (
          <div style={{background:'rgba(30,20,5,0.85)',borderBottom:`1px solid ${colors.borderDim}`,padding:'7px 16px',display:'flex',alignItems:'flex-start',gap:8,flexShrink:0,maxHeight:160,overflowY:'auto'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:fonts.display,fontSize:10,color:colors.gold,letterSpacing:2,marginBottom:4}}>STORY LOG</div>
              <span style={{fontSize:11,color:colors.textFaint,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{storySummary}</span>
            </div>
          </div>
        )}

        <MessageFeed
          messages={fullLog}
          loading={loading}
          characterEmoji={character.cls?.emoji}
        />

        <InputBar
          onSend={handleSend}
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
            const lastDM = [...messages].reverse().find(m => m.role === 'dm');
            if (lastDM) voice.speak(lastDM.text);
          }}
          tokenUsage={tokenUsage}
        />
      </div>
    </div>
  );
}
