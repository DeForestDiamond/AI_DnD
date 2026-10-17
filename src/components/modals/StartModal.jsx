import { StoryOptions } from '../StoryOptions.jsx';
import { useState } from 'react';
import { colors, fonts, btn } from '../../styles/theme.js';
import { fixedArcLocationFor, arcLocationOptionsFor } from '../../constants/encounters/arcLocations.js';
import { adventureDeityCount, DIVINE_POWER_OPTIONS } from '../../constants/adventures.js';

// Fresh-campaign chooser. Situation Adventure is deliberately separate from the
// classic random/antagonist generator: its premise owns the starting context.
export function AdventureStartModal({ character, onChangeStoryOptions, onRandom, onSituationAdventure, onChooseAdventure, onManual, onChooseAntagonist, selectedModel = 'sonnet', onSelectModel, hasAnthropic = false, hasOpenAI = false, hasXAI = Boolean(import.meta.env.VITE_XAI_KEY), antagonists = [], defeatedAntagonists = [], adventures = [], completedAdventures = [] }) {
  const [mode, setMode] = useState(null);
  const [text, setText] = useState('');
  const [antagonist, setAntagonist] = useState('');
  const [search, setSearch] = useState('');
  const [showDefeated, setShowDefeated] = useState(false);
  const [adventureSearch, setAdventureSearch] = useState('');
  const [showCompletedAdventures, setShowCompletedAdventures] = useState(false);
  const [pendingAntagonist, setPendingAntagonist] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [pendingAdventure, setPendingAdventure] = useState(null);
  const [adventureDeities, setAdventureDeities] = useState(['', '']);
  const [startingLocation, setStartingLocation] = useState('');

  const chooseAdventure = (adventure) => {
    if (!adventureDeityCount(adventure)) { onChooseAdventure(adventure.title, {startingLocation}); return; }
    setPendingAdventure(adventure);
    setAdventureDeities(['', '']);
    setMode('adventure-deities');
  };

  const defeated = new Set((defeatedAntagonists || []).map(x => String(x).toLowerCase()));
  const visibleAntagonists = antagonists
    .filter(a => showDefeated || !defeated.has(a.toLowerCase()))
    .filter(a => !search.trim() || a.toLowerCase().includes(search.trim().toLowerCase()));

  const completedTitles = new Set((completedAdventures || []).map(a => typeof a === 'string' ? a : a?.title).filter(Boolean));
  const visibleAdventures = (adventures || [])
    .filter(a => showCompletedAdventures || !completedTitles.has(a.title))
    .filter(a => !adventureSearch.trim() || a.title.toLowerCase().includes(adventureSearch.trim().toLowerCase()));

  const locationOptions = pendingAntagonist ? arcLocationOptionsFor(pendingAntagonist) : [];
  const visibleLocations = locationOptions.filter(loc => !locationSearch.trim() || loc.toLowerCase().includes(locationSearch.trim().toLowerCase()));

  const chooseAntagonist = (name) => {
    const fixed = fixedArcLocationFor(name);
    if (fixed) { onChooseAntagonist(name, fixed); return; }
    setPendingAntagonist(name);
    setLocationSearch('');
    setMode('location');
  };

  const dmOptions = [
    { id:'sonnet', label:'✨ Sonnet', provider:'Anthropic', enabled:hasAnthropic },
    { id:'haiku', label:'⚡ Haiku', provider:'Anthropic', enabled:hasAnthropic },
    { id:'gpt', label:'🧠 GPT Sol', provider:'OpenAI', enabled:hasOpenAI },
    { id:'terra', label:'🌍 GPT Terra', provider:'OpenAI', enabled:hasOpenAI },
    { id:'grok', label:'🚀 Grok 4.3', provider:'xAI', enabled:hasXAI },
    { id:'grok46', label:'🚀 Grok 4.6', provider:'xAI', enabled:hasXAI },
  ];

  const card = { background:colors.bg,border:`1px solid ${colors.border}`,borderRadius:6,padding:16,cursor:'pointer',transition:'all 0.15s',textAlign:'left' };
  const hoverOn = e => { e.currentTarget.style.borderColor=colors.gold; e.currentTarget.style.background=colors.bgDark; };
  const hoverOff = e => { e.currentTarget.style.borderColor=colors.border; e.currentTarget.style.background=colors.bg; };
  const locationField = (
    <label style={{display:'block',fontSize:12,color:colors.gold,marginBottom:12}}>
      Adventure starting location (optional)
      <input value={startingLocation} onChange={e=>setStartingLocation(e.target.value)} placeholder="e.g. Cormyr, Waterdeep, or Suzail" style={{display:'block',width:'100%',background:colors.bg,border:`1px solid ${colors.borderDim}`,borderRadius:4,color:colors.textDim,fontFamily:'inherit',fontSize:13,padding:'10px',boxSizing:'border-box',marginTop:6}} />
      <span style={{display:'block',fontSize:10,color:colors.textGhost,lineHeight:1.45,marginTop:5}}>For Adventure and Choose Adventure. Enter a kingdom, country, region, or city. Leave blank to let the Adventure choose a fresh location.</span>
    </label>
  );

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:210,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:4,padding:24,maxWidth:640,width:'100%',maxHeight:'90vh',overflow:'auto'}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:16,marginBottom:16,textAlign:'center'}}>🎲 How should this adventure begin?</div>
        <div style={{marginBottom:12}}><StoryOptions character={character} onChange={onChangeStoryOptions} /></div>
        {mode === null ? (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{background:colors.bgDark,border:`1px solid ${colors.borderDim}`,borderRadius:6,padding:12}}>
              <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:11,marginBottom:8}}>Choose Dungeon Master</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>
                {dmOptions.map(dm => <button key={dm.id} disabled={!dm.enabled} onClick={()=>dm.enabled&&onSelectModel?.(dm.id)} style={{...btn(selectedModel===dm.id),padding:'8px 6px',fontSize:11,opacity:dm.enabled?1:0.35,cursor:dm.enabled?'pointer':'not-allowed'}} title={dm.enabled?dm.provider:`${dm.provider} API key required`}>{dm.label}</button>)}
              </div>
              <div style={{fontSize:10,color:colors.textGhost,marginTop:7,lineHeight:1.4}}>Select the DM before the opening request is sent. Models without an available API key are disabled.</div>
            </div>
            <div onClick={onRandom} style={card} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <div style={{fontSize:28,marginBottom:6}}>🎲</div><div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Random Start</div>
              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>{character?.storyMode === 'continuous' ? 'Roll a fresh opening for a continuing story, without an assigned antagonist.' : 'Roll a fresh setting, scene, hook, and antagonist scaled to your level.'}</div>
            </div>
            {locationField}
            <div onClick={()=>onSituationAdventure({startingLocation})} style={card} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <div style={{fontSize:28,marginBottom:6}}>🎭</div><div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Adventure</div>
              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Start from a social or exploratory situation with no predetermined villain or solution. Let the story emerge through play.</div>
            </div>
            <div onClick={()=>setMode('adventure')} style={card} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <div style={{fontSize:28,marginBottom:6}}>📜</div><div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Choose Adventure</div>
              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Pick a situation premise yourself. Its location, tone, and opening style are still rolled fresh.</div>
            </div>
            {character?.storyMode !== 'continuous' && <div onClick={()=>setMode('antagonist')} style={card} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <div style={{fontSize:28,marginBottom:6}}>👑</div><div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Choose Antagonist</div>
              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Pick the arc foe yourself, then roll a fresh opening built around them.</div>
            </div>}
            <div onClick={()=>setMode('manual')} style={card} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <div style={{fontSize:28,marginBottom:6}}>✍️</div><div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Write My Own Opening</div>
              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Describe where and how the story starts — pick up where you left off, or begin at a home base.</div>
            </div>
          </div>
        ) : mode === 'manual' ? (
          <div>
            <div style={{fontSize:12,color:colors.textGhost,marginBottom:8,lineHeight:1.5}}>Describe the opening. The DM will start exactly here instead of rolling a random scene.</div>
            <textarea value={text} onChange={e=>setText(e.target.value)} autoFocus placeholder={'e.g. I arrive back in Saltmere, my home city, after weeks on the road...'} rows={6}
              style={{width:'100%',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,borderRadius:3,color:colors.textDim,fontSize:13,fontFamily:'inherit',padding:'8px 10px',resize:'vertical',boxSizing:'border-box',marginBottom:12}} />
            {character?.storyMode !== 'continuous' && <>
            <div style={{fontSize:12,color:colors.textGhost,marginBottom:6,lineHeight:1.5}}>Arc antagonist <span style={{color:colors.textFaint}}>(optional — leave blank to roll one)</span></div>
            <input value={antagonist} onChange={e=>setAntagonist(e.target.value)} placeholder={'e.g. a smuggling ring run out of the Saltmere docks'}
              style={{width:'100%',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,borderRadius:3,color:colors.textDim,fontSize:13,fontFamily:'inherit',padding:'8px 10px',boxSizing:'border-box',marginBottom:12}} />
            </>}
            <div style={{display:'flex',gap:10}}><button style={{...btn(false),flex:'0 0 auto'}} onClick={()=>setMode(null)}>← Back</button><button style={{...btn(true),flex:1,opacity:text.trim()?1:0.4}} disabled={!text.trim()} onClick={()=>text.trim()&&onManual(text.trim(), antagonist.trim() || null)}>Begin Here →</button></div>
          </div>
        ) : mode === 'adventure-deities' ? (
          <div>
            <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:14,marginBottom:8}}>{pendingAdventure?.title}</div>
            <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5,marginBottom:14}}>{pendingAdventure?.premise}</div>
            {locationField}
            <div style={{fontSize:12,color:colors.textGhost,lineHeight:1.5,marginBottom:12}}>Choose the deity involved, or leave it random. This is the Adventure's deity; it does not change your character's faith or patron.</div>
            {Array.from({length:adventureDeityCount(pendingAdventure)}, (_, index) => (
              <label key={index} style={{display:'block',fontSize:12,color:colors.gold,marginBottom:14}}>
                {adventureDeityCount(pendingAdventure) === 2 ? `Deity ${index + 1}` : 'Deity'}
                <select value={adventureDeities[index]} onChange={e=>setAdventureDeities(current=>current.map((name, i)=>i===index?e.target.value:name))} style={{display:'block',width:'100%',background:colors.bg,color:colors.textDim,border:`1px solid ${colors.borderDim}`,borderRadius:4,fontFamily:'inherit',fontSize:13,padding:'10px',marginTop:6}}>
                  <option value="">🎲 Random deity</option>
                  {DIVINE_POWER_OPTIONS.filter(d=>d.name!==adventureDeities[1-index]).map(d=><option key={d.name} value={d.name}>{d.name} — {d.portfolio}</option>)}
                </select>
              </label>
            ))}
            <div style={{display:'flex',gap:10}}>
              <button style={{...btn(false),flex:1}} onClick={()=>setMode('adventure')}>← Back</button>
              <button style={{...btn(true),flex:1}} onClick={()=>onChooseAdventure(pendingAdventure.title, {deities:adventureDeities, startingLocation})}>Begin Adventure →</button>
            </div>
          </div>
        ) : mode === 'adventure' ? (
          <div>
            <div style={{fontSize:12,color:colors.textGhost,marginBottom:10,lineHeight:1.5}}>Choose the situation for this Adventure. Set a starting location below, or leave it blank for a fresh location. Tone and opening style are rolled fresh.</div>
            {locationField}
            <input value={adventureSearch} onChange={e=>setAdventureSearch(e.target.value)} autoFocus placeholder="Search adventures..." style={{width:'100%',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,borderRadius:3,color:colors.textDim,fontSize:13,fontFamily:'inherit',padding:'8px 10px',boxSizing:'border-box',marginBottom:10}} />
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:colors.textFaint,marginBottom:10,cursor:'pointer'}}><input type="checkbox" checked={showCompletedAdventures} onChange={e=>setShowCompletedAdventures(e.target.checked)} />Show completed adventures ({completedTitles.size})</label>
            <div style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,maxHeight:'52vh',overflowY:'auto',marginBottom:12}}>
              {visibleAdventures.length ? visibleAdventures.map(a => { const wasCompleted=completedTitles.has(a.title); return <div key={a.title} onClick={()=>chooseAdventure(a)} style={{padding:'10px 12px',borderBottom:`1px solid ${colors.borderFaint}`,cursor:'pointer',color:wasCompleted?colors.textGhost:colors.textDim,opacity:wasCompleted?0.65:1}} onMouseEnter={e=>e.currentTarget.style.background=colors.bgDark} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><div style={{fontSize:12,lineHeight:1.4}}>{wasCompleted&&<span style={{marginRight:6}}>✓</span>}{a.title}{wasCompleted&&<span style={{fontSize:9,marginLeft:8,color:colors.textGhost}}>COMPLETED</span>}</div><div style={{fontSize:10,color:colors.textGhost,lineHeight:1.45,marginTop:4}}>{a.premise}</div></div>; }) : <div style={{padding:18,textAlign:'center',fontSize:11,color:colors.textGhost}}>No adventures match this filter.</div>}
            </div>
            <button style={{...btn(false),width:'100%'}} onClick={()=>setMode(null)}>← Back</button>
          </div>
        ) : mode === 'antagonist' ? (
          <div>
            <div style={{fontSize:12,color:colors.textGhost,marginBottom:10,lineHeight:1.5}}>Choose the hidden antagonist for this arc. The app will roll the opening normally and build toward this foe.</div>
            <input value={search} onChange={e=>setSearch(e.target.value)} autoFocus placeholder="Search antagonists..." style={{width:'100%',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,borderRadius:3,color:colors.textDim,fontSize:13,fontFamily:'inherit',padding:'8px 10px',boxSizing:'border-box',marginBottom:10}} />
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:colors.textFaint,marginBottom:10,cursor:'pointer'}}><input type="checkbox" checked={showDefeated} onChange={e=>setShowDefeated(e.target.checked)} />Show defeated foes ({defeatedAntagonists.length})</label>
            <div style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,maxHeight:'52vh',overflowY:'auto',marginBottom:12}}>
              {visibleAntagonists.length ? visibleAntagonists.map(a => { const wasDefeated=defeated.has(a.toLowerCase()); const fixed=fixedArcLocationFor(a); return <div key={a} onClick={()=>chooseAntagonist(a)} style={{padding:'10px 12px',borderBottom:`1px solid ${colors.borderFaint}`,cursor:'pointer',fontSize:12,lineHeight:1.4,color:wasDefeated?colors.textGhost:colors.textDim,opacity:wasDefeated?0.65:1}} onMouseEnter={e=>e.currentTarget.style.background=colors.bgDark} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{wasDefeated&&<span style={{marginRight:6}}>☠</span>}{a}{fixed&&<span style={{fontSize:9,marginLeft:8,color:colors.textGhost}}>📍 {fixed}</span>}{wasDefeated&&<span style={{fontSize:9,marginLeft:8,color:colors.textGhost}}>DEFEATED</span>}</div>; }) : <div style={{padding:18,textAlign:'center',fontSize:11,color:colors.textGhost}}>No antagonists match this filter.</div>}
            </div>
            <button style={{...btn(false),width:'100%'}} onClick={()=>setMode(null)}>← Back</button>
          </div>
        ) : (
          <div>
            <div style={{fontSize:12,color:colors.textGhost,marginBottom:6,lineHeight:1.5}}>Choose where <span style={{color:colors.gold}}>{pendingAntagonist}</span> is based for this arc.</div>
            <div style={{fontSize:10,color:colors.textGhost,marginBottom:10,lineHeight:1.45}}>Antagonists with a required location skip this step automatically. Otherwise choose an opening area, or let the game choose one. The conflict starts in that same area.</div>
            <input value={locationSearch} onChange={e=>setLocationSearch(e.target.value)} autoFocus placeholder="Search locations..." style={{width:'100%',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,borderRadius:3,color:colors.textDim,fontSize:13,fontFamily:'inherit',padding:'8px 10px',boxSizing:'border-box',marginBottom:10}} />
            <div style={{border:`1px solid ${colors.borderDim}`,borderRadius:4,maxHeight:'48vh',overflowY:'auto',marginBottom:12}}>
              <div onClick={()=>onChooseAntagonist(pendingAntagonist, null)} style={{padding:'10px 12px',borderBottom:`1px solid ${colors.borderFaint}`,cursor:'pointer',color:colors.gold}} onMouseEnter={e=>e.currentTarget.style.background=colors.bgDark} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>🎲 Choose a shared opening area</div>
              {visibleLocations.map(loc => <div key={loc} onClick={()=>onChooseAntagonist(pendingAntagonist, loc)} style={{padding:'9px 12px',borderBottom:`1px solid ${colors.borderFaint}`,cursor:'pointer',fontSize:12,color:colors.textDim}} onMouseEnter={e=>e.currentTarget.style.background=colors.bgDark} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{loc}</div>)}
              {!visibleLocations.length && <div style={{padding:18,textAlign:'center',fontSize:11,color:colors.textGhost}}>No locations match this filter.</div>}
            </div>
            <button style={{...btn(false),width:'100%'}} onClick={()=>setMode('antagonist')}>← Back to Antagonists</button>
          </div>
        )}
      </div>
    </div>
  );
}


