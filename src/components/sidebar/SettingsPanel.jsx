import { StoryOptions } from '../StoryOptions.jsx';
import { useState } from 'react';
import { PACING, ENVIRONMENTS } from '../../constants/encounters.js';
import { fixedArcLocationFor, arcLocationOptionsFor } from '../../constants/encounters/arcLocations.js';
import { colors, fonts, btn } from '../../styles/theme.js';
import { CollapsibleSection } from './common/index.jsx';
import { VoiceSettings, DispositionEditor, ObjectivesPanel, DirectivesEditor, DebugViewer } from './settings/Controls.jsx';
import { PromptRequestViewer } from './settings/PromptRequestViewer.jsx';
import { TokenCostViewer } from './settings/TokenCostViewer.jsx';
import { BioEditor, TownManager, NPCManager } from './world/Panels.jsx';

export function SettingsPanel({
  character,
  onChangeStoryOptions,
  onSaveClick,
  selectedModel,
  onToggleModel,
  voiceSettings,
  pacing,
  onTogglePacing,
  environment,
  onChangeEnvironment,
  adventure,
  arcAntagonist,
  onRollAdventure,
  onClearAdventure,
  onSetAdventure,
  adventureOptions=[],
  arcLocation,
  onClearArc,
  onRollArc,
  onSetArc,
  onSetArcLocation,
  antagonistOptions=[],
  completedAdventures,
  onRestoreAdventure,
  defeatedAntagonists,
  onReviveAntagonist,
  onStartNewCampaign,
  onCharacterTools,
  characterToolsDisabled = false,
  arcObjectives,
  arcGoal,
  onSetArcGoal,
  onGenerateObjectives,
  onSetObjectives,
  disposition,
  onSaveDisposition,
  onSaveBio,
  onSaveAppearance,
  onExtractNPC,
  onExtractTown,
  onSaveNPC,
  onDeleteNPC,
  lootDestination,
  onToggleLootDestination,
  showRawTags,
  onToggleRawTags,
  directives,
  onChangeDirectives,
  tokenCostLog,
  debugLog,
  dmRequests,
  debugStatus,
  onExportDebug,
  onCopyDebug,
}) {
  const [arcCustomOpen, setArcCustomOpen] = useState(false);
  const [revealedFor, setRevealedFor] = useState(null);
  const [newCampaignArmed, setNewCampaignArmed] = useState(false);
  const [arcCustomText, setArcCustomText] = useState('');
  const [storyAntagonistPick, setStoryAntagonistPick] = useState('');
  const [storyAdventurePick, setStoryAdventurePick] = useState('');
  const [showAllAdventures, setShowAllAdventures] = useState(false);
  const [showAllAntagonists, setShowAllAntagonists] = useState(false);

  const completedAdventureTitles = new Set((completedAdventures || []).map(entry => typeof entry === 'string' ? entry : entry?.title).filter(Boolean));
  const defeatedAntagonistNames = new Set(defeatedAntagonists || []);
  const visibleAdventureOptions = showAllAdventures
    ? (adventureOptions || [])
    : (adventureOptions || []).filter(option => !completedAdventureTitles.has(option?.title));
  const visibleAntagonistOptions = showAllAntagonists
    ? (antagonistOptions || [])
    : (antagonistOptions || []).filter(name => !defeatedAntagonistNames.has(name));

  return <>
    <button onClick={onSaveClick} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0'}}>💾 Save / Load</button>

    {onToggleModel && (
      <button onClick={onToggleModel} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',borderColor:selectedModel==='sonnet'?colors.gold:(selectedModel==='gpt'||selectedModel==='terra')?'#7aa7ff':(selectedModel==='grok'||selectedModel==='grok46')?'#9ad17b':colors.border}}>
        {selectedModel==='sonnet' ? '✨ DM: Sonnet' : selectedModel==='haiku' ? '⚡ DM: Haiku' : selectedModel==='gpt' ? '🧠 DM: GPT Sol' : selectedModel==='terra' ? '🌍 DM: GPT Terra' : selectedModel==='grok46' ? '🚀 DM: Grok 4.6' : '🚀 DM: Grok 4.3'}
      </button>
    )}

    {voiceSettings && <VoiceSettings {...voiceSettings} />}
    <CollapsibleSection title="🎭 STORY OPTIONS" defaultOpen={false}>
      <StoryOptions character={character} onChange={onChangeStoryOptions} embedded />
    </CollapsibleSection>

    <CollapsibleSection title="⚔️ ENCOUNTERS" defaultOpen={false}>
      {onTogglePacing && (
        <button onClick={onTogglePacing} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',opacity:pacing==='off'?0.6:1,borderColor:pacing==='dangerous'?colors.red:pacing==='normal'?colors.gold:colors.border}}>
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
    </CollapsibleSection>

    {onRollAdventure && character.storyMode !== 'continuous' && (
      <CollapsibleSection title="🎭 ADVENTURE" defaultOpen={false}>
        <div style={{fontSize:10,color:colors.textGhost,letterSpacing:0.5,marginBottom:3}}>ADVENTURE</div>
        <div style={{fontSize:12,color:adventure?colors.textDim:colors.textFaint,fontStyle:'italic',marginBottom:6,lineHeight:1.35}}>
          {adventure ? adventure.title : (arcAntagonist ? 'Inactive — antagonist arc is the current story driver.' : 'Open — no Adventure is active.')}
        </div>
        {adventure?.premise && <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.4,marginBottom:6}}>{adventure.premise}</div>}
        {adventure?.location && <div style={{fontSize:10,color:colors.textGhost,lineHeight:1.35,marginBottom:6}}>📍 {adventure.location}</div>}
        <div style={{display:'flex',gap:6,marginBottom:4}}>
          <select value={storyAdventurePick} onChange={e=>setStoryAdventurePick(e.target.value)} style={{flex:1,minWidth:0,background:colors.bgDark,border:`1px solid ${colors.borderDim}`,color:colors.textDim,fontSize:10,padding:'4px 5px',borderRadius:3}}>
            <option value="">Choose Adventure…</option>
            {visibleAdventureOptions.map(a => <option key={a.title} value={a.title}>{a.title}</option>)}
          </select>
          <button disabled={!storyAdventurePick} onClick={()=>{ if(storyAdventurePick){ onSetAdventure?.(storyAdventurePick); setStoryAdventurePick(''); } }} style={{...btn(false),fontSize:10,padding:'4px 7px',opacity:storyAdventurePick?1:0.4}}>Set</button>
        </div>
        <button onClick={()=>{ setShowAllAdventures(v=>!v); setStoryAdventurePick(''); }} style={{...btn(showAllAdventures),width:'100%',fontSize:9,padding:'3px 0',marginBottom:6}}>
          {showAllAdventures ? '✓ Showing all adventures' : `Show all adventures (${(adventureOptions||[]).length})`}
        </button>
        <div style={{display:'flex',gap:6}}>
          <button onClick={onRollAdventure} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>🎭 {adventure?'Reroll':'Roll Adventure'}</button>
          {adventure && <button onClick={onClearAdventure} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>✕ Clear</button>}
        </div>
        <div style={{fontSize:9,color:colors.textDead,lineHeight:1.35,marginTop:5}}>Picker defaults to unfinished adventures. Rolling an Adventure clears any antagonist. [ADVENTURE COMPLETE] clears it without rolling a replacement.</div>
      </CollapsibleSection>
    )}

    {onClearArc && character.storyMode !== 'continuous' && (
      <CollapsibleSection title="👁️ ANTAGONIST" defaultOpen={false}>
        <div style={{fontSize:10,color:colors.textGhost,letterSpacing:0.5,marginBottom:3}}>ANTAGONIST ARC</div>
        <div style={{display:'flex',gap:6,marginBottom:4}}>
          <select value={storyAntagonistPick} onChange={e=>setStoryAntagonistPick(e.target.value)} style={{flex:1,minWidth:0,background:colors.bgDark,border:`1px solid ${colors.borderDim}`,color:colors.textDim,fontSize:10,padding:'4px 5px',borderRadius:3}}>
            <option value="">Choose Antagonist…</option>
            {visibleAntagonistOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button disabled={!storyAntagonistPick} onClick={()=>{ if(storyAntagonistPick){ onSetArc?.(storyAntagonistPick); setStoryAntagonistPick(''); } }} style={{...btn(false),fontSize:10,padding:'4px 7px',opacity:storyAntagonistPick?1:0.4}}>Set</button>
        </div>
        <button onClick={()=>{ setShowAllAntagonists(v=>!v); setStoryAntagonistPick(''); }} style={{...btn(showAllAntagonists),width:'100%',fontSize:9,padding:'3px 0',marginBottom:6}}>
          {showAllAntagonists ? '✓ Showing all antagonists' : `Show all antagonists (${(antagonistOptions||[]).length})`}
        </button>
        {arcAntagonist && (() => {
          const fixed = fixedArcLocationFor(arcAntagonist);
          const locations = arcLocationOptionsFor(arcAntagonist);
          return <div style={{marginBottom:6}}>
            <div style={{fontSize:9,color:colors.textGhost,marginBottom:3}}>ANTAGONIST LOCATION</div>
            {fixed
              ? <div style={{fontSize:10,color:colors.textFaint,padding:'4px 5px',border:`1px solid ${colors.borderDim}`,borderRadius:3}}>📍 {fixed} <span style={{color:colors.textDead}}>(fixed)</span></div>
              : <select value={arcLocation || ''} onChange={e=>e.target.value && onSetArcLocation?.(e.target.value)} style={{width:'100%',background:colors.bgDark,border:`1px solid ${colors.borderDim}`,color:colors.textDim,fontSize:10,padding:'4px 5px',borderRadius:3}}><option value="">Choose location…</option>{locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select>}
          </div>;
        })()}

        <div style={{fontSize:10,color:colors.textGhost,letterSpacing:0.5,marginBottom:3}}>STORY ARC</div>
        <div style={{fontSize:12,color:arcAntagonist?colors.textDim:colors.textFaint,fontStyle:'italic',marginBottom:6,lineHeight:1.35}}>
          {arcAntagonist ? 'A hidden antagonist is in play.' : 'Open — no antagonist. The story drifts where you take it.'}
        </div>
        {arcAntagonist && (
          <div style={{marginBottom:6}}>
            {revealedFor === arcAntagonist ? (
              <div style={{padding:'6px 8px',borderRadius:4,background:'rgba(201,168,76,0.06)',border:`1px solid ${colors.borderDim}`}}>
                <div style={{fontSize:12,color:colors.gold,lineHeight:1.4}}>{arcAntagonist}</div>
                {arcLocation && <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.4,marginTop:3}}>📍 {arcLocation}</div>}
                <div onClick={()=>setRevealedFor(null)} style={{fontSize:10,color:colors.textDead,cursor:'pointer',marginTop:4}}>🙈 hide</div>
              </div>
            ) : (
              <button onClick={()=>setRevealedFor(arcAntagonist)} style={{...btn(false),width:'100%',fontSize:10,padding:'3px 0',color:colors.textDead}}>👁 Reveal antagonist (spoiler)</button>
            )}
          </div>
        )}
        <div style={{display:'flex',gap:6}}>
          <button onClick={onRollArc} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>🎲 {arcAntagonist?'Reroll':'Roll'}</button>
          <button onClick={()=>setArcCustomOpen(v=>!v)} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>✎ Custom</button>
          {arcAntagonist && <button onClick={onClearArc} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>✕ Clear</button>}
        </div>
        {arcCustomOpen && (
          <div style={{marginTop:6}}>
            <input value={arcCustomText} onChange={e=>setArcCustomText(e.target.value)} placeholder="e.g. a rival dhampir elder and her brood"
              style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.borderDim}`,color:colors.text,fontFamily:fonts.body,fontSize:12,padding:'5px 8px',borderRadius:4,outline:'none',marginBottom:4}}/>
            <div style={{fontSize:10,color:colors.textGhost,marginBottom:4,lineHeight:1.35}}>Write it as a noun phrase — it fills sentences like "scouts of ___ attack".</div>
            <button onClick={()=>{ const t=arcCustomText.trim(); if(t){ onSetArc?.(t); setArcCustomText(''); setArcCustomOpen(false);} }} style={{...btn(false),width:'100%',fontSize:11,padding:'4px 0'}}>✓ SET ANTAGONIST</button>
          </div>
        )}
      </CollapsibleSection>
    )}

    {onRestoreAdventure && completedAdventures?.length > 0 && (
      <CollapsibleSection title="📚 COMPLETED ADVENTURES" count={completedAdventures.length} defaultOpen={false}>
        <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>Adventures you've completed. These stay out of the Adventure shuffle — remove one to let it be rolled again.</div>
        {completedAdventures.map((entry, i) => {
          const title = typeof entry === 'string' ? entry : entry?.title || 'Adventure';
          return <div key={title+i} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
            <span style={{flex:1,minWidth:0,fontSize:12,color:colors.textDim,lineHeight:1.4}}>{title}</span>
            <button title="Return this Adventure to the shuffle" onClick={()=>onRestoreAdventure(title)} style={{...btn(false),flexShrink:0,fontSize:10,padding:'2px 6px'}}>↺</button>
          </div>;
        })}
      </CollapsibleSection>
    )}

    {onReviveAntagonist && defeatedAntagonists?.length > 0 && (
      <CollapsibleSection title="⚰️ DEFEATED FOES" count={defeatedAntagonists.length} defaultOpen={false}>
        <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>Arcs you've finished. These are never rolled as a new antagonist again — remove one to let it return.</div>
        {defeatedAntagonists.map(name => <div key={name} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',borderBottom:`1px solid ${colors.borderFaint}`}}>
          <span style={{flex:1,minWidth:0,fontSize:12,color:colors.textDim,lineHeight:1.4}}>{name}</span>
          <button title="Let this foe return — makes it rollable again" onClick={()=>onReviveAntagonist(name)} style={{...btn(false),flexShrink:0,fontSize:10,padding:'2px 6px'}}>↺</button>
        </div>)}
      </CollapsibleSection>
    )}

    {onCharacterTools && <CollapsibleSection title="🧬 CHARACTER TOOLS" defaultOpen={false}>
      <div style={{fontSize:11,color:colors.textDim,lineHeight:1.5,marginBottom:8}}>
        Edit your identity, reset levels, or create a new character with selected possessions and world records.
      </div>
      <button disabled={characterToolsDisabled} onClick={onCharacterTools} style={{...btn(false),width:'100%',fontSize:11,padding:'8px 0',opacity:characterToolsDisabled?0.5:1}}>Edit / create character</button>
      {characterToolsDisabled && <div style={{fontSize:10,color:colors.textFaint,marginTop:5}}>Available after the DM response finishes.</div>}
    </CollapsibleSection>}

    {onStartNewCampaign && (
      <CollapsibleSection title="🗺️ NEW CAMPAIGN" defaultOpen={false}>
        <div style={{fontSize:11,color:colors.textDim,marginBottom:8,lineHeight:1.45}}>
          Keeps everything the character <b>is</b> — level, XP, gear, inventory, companions, NPCs, towns, bio, disposition — and clears everything the last campaign <b>was</b>: the story log, the summary and the arc. The same as exporting the character and loading it back.
        </div>
        {newCampaignArmed ? (
          <div style={{display:'flex',gap:4}}>
            <button onClick={()=>{ setNewCampaignArmed(false); onStartNewCampaign(); }} style={{...btn(true),flex:1,fontSize:11,padding:'5px 0'}}>✓ Yes, start fresh</button>
            <button onClick={()=>setNewCampaignArmed(false)} style={{...btn(false),flex:1,fontSize:11,padding:'5px 0'}}>Cancel</button>
          </div>
        ) : (
          <button onClick={()=>setNewCampaignArmed(true)} style={{...btn(false),width:'100%',fontSize:11,padding:'5px 0'}}>🗺️ Start a new campaign</button>
        )}
        <div style={{fontSize:10,color:colors.textDead,marginTop:6,lineHeight:1.4}}>Save first if you want to come back to this story — it cannot be undone.</div>
      </CollapsibleSection>
    )}

    {onGenerateObjectives && (
      <ObjectivesPanel arcObjectives={arcObjectives} arcGoal={arcGoal} onSetArcGoal={onSetArcGoal} onGenerateObjectives={onGenerateObjectives} onSetObjectives={onSetObjectives} />
    )}
    {onSaveDisposition && <DispositionEditor key={JSON.stringify(disposition)} disposition={disposition} onSaveDisposition={onSaveDisposition} />}
    {onSaveBio && <BioEditor key={`${character.bio || 'empty'}|${character.appearance || 'empty'}`} character={character} onSaveBio={onSaveBio} onSaveAppearance={onSaveAppearance} />}
    {(onExtractNPC || onSaveNPC) && <NPCManager character={character} onExtractNPC={onExtractNPC} onSaveNPC={onSaveNPC} onDeleteNPC={onDeleteNPC} />}
    {(onExtractTown || onSaveNPC) && <TownManager character={character} onExtractTown={onExtractTown} onSaveNPC={onSaveNPC} onDeleteNPC={onDeleteNPC} />}

    {onToggleLootDestination && (
      <CollapsibleSection title="🎒 DM LOOT LOCATION" defaultOpen={false}>
        <div style={{display:'flex',gap:4}}>
          {['inventory','stash'].map(dest => (
            <button key={dest} onClick={() => dest !== (lootDestination || 'inventory') && onToggleLootDestination()}
              style={{...btn(dest === (lootDestination || 'inventory')),flex:1,fontSize:11,padding:'5px 0'}}>
              {dest === 'inventory' ? '🎒 Inventory' : '📦 Stash'}
            </button>
          ))}
        </div>
        <div style={{fontSize:9,color:colors.textDead,marginTop:5,lineHeight:1.35}}>New loot granted by the DM goes here. Crafted and salvaged items keep their existing destination controls.</div>
      </CollapsibleSection>
    )}

    {onToggleRawTags && (
      <CollapsibleSection title="🏷️ TAGS" defaultOpen={false}>
        <button onClick={onToggleRawTags} style={{...btn(false),width:'100%',fontSize:12,padding:'6px 0',borderColor:showRawTags?colors.gold:colors.border}}>Raw tags: {showRawTags ? 'shown' : 'hidden'}</button>
      </CollapsibleSection>
    )}
    {onChangeDirectives && <DirectivesEditor directives={directives} onChangeDirectives={onChangeDirectives} />}
    {tokenCostLog !== undefined && <TokenCostViewer entries={tokenCostLog} />}
    {dmRequests !== undefined && <PromptRequestViewer requests={dmRequests} />}
    {debugLog !== undefined && <DebugViewer debugLog={debugLog} debugStatus={debugStatus} onExportDebug={onExportDebug} onCopyDebug={onCopyDebug} />}
  </>;
}

