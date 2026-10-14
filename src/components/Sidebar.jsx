import { useState } from 'react';
import { colors, fonts, btn } from '../styles/theme.js';
import { allItems } from '../hooks/useCharacter.js';
import { CharacterPanel } from './sidebar/CharacterPanel.jsx';
import { LevelUpPanel } from './sidebar/LevelUpPanel.jsx';
import { CraftingTab } from './sidebar/CraftingTab.jsx';
import { SettingsPanel } from './sidebar/SettingsPanel.jsx';
export { resetCraftingPanels } from './sidebar/crafting/Panels.jsx';

// Sidebar is intentionally just the shell now. Each tab owns its own transient UI
// state and rendering so a change in inventory, settings, or level-up cannot leak
// undeclared helpers across one giant component again.
export function Sidebar(props) {
  const {
    character, onSaveClick, onClose, levelUpsAvailable=0,
    onLevelClassSelect, onLevelStatSelect,
  } = props;
  const [activeTab, setActiveTab] = useState('character');
  const db = allItems(character.items || {});

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const sidebarStyle = {
    width:isMobile?'100vw':285, flexShrink:0, height:'100vh',
    background:'rgba(10,7,3,0.97)', borderRight:`1px solid ${colors.border}`,
    overflowY:'auto', overflowX:'hidden', display:'flex', flexDirection:'column',
    gap:10, padding:12, boxSizing:'border-box',
  };

  return (
    <div style={sidebarStyle}>
      {onClose && (
        <button onClick={onClose} style={{width:'100%',background:'rgba(201,168,76,0.08)',border:`1px solid ${colors.border}`,color:colors.gold,padding:'12px 0',fontSize:16,fontFamily:fonts.display,letterSpacing:2,borderRadius:4,cursor:'pointer'}}>
          ✕ CLOSE
        </button>
      )}

      <div style={{display:'flex',gap:6,marginBottom:4}}>
        {[
          ['character','🎲 CHAR'],
          ['levelup',`⭐ LEVEL${levelUpsAvailable>0?` · ${levelUpsAvailable}`:''}`],
          ['crafting','🔨 CRAFT'],
          ['settings','⚙️ SET'],
        ].map(([id,label]) => (
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{flex:1,background:activeTab===id?'rgba(201,168,76,0.15)':'transparent',border:`1px solid ${activeTab===id?colors.gold:(id==='levelup'&&levelUpsAvailable>0?colors.goldFaint:colors.borderDim)}`,color:activeTab===id?colors.gold:(id==='levelup'&&levelUpsAvailable>0?colors.goldFaint:colors.textFaint),padding:'8px 1px',fontSize:9,fontFamily:fonts.display,letterSpacing:0.2,borderRadius:3,cursor:'pointer',whiteSpace:'nowrap'}}>
            {label}
          </button>
        ))}
      </div>

      {activeTab==='character' && <CharacterPanel
        character={character} db={db}
        onAbilitiesClick={props.onAbilitiesClick}
        onSlotClick={props.onSlotClick}
        onCompanionSlotClick={props.onCompanionSlotClick}
        onCompanionUnequip={props.onCompanionUnequip}
        onBankCoins={props.onBankCoins}
        onWithdrawCoins={props.onWithdrawCoins}
        onToggleContextExclusion={props.onToggleContextExclusion}
        onMoveToStash={props.onMoveToStash}
        onMoveToInventory={props.onMoveToInventory}
        onCreateBag={props.onCreateBag}
        onAddToBag={props.onAddToBag}
        onRemoveFromBag={props.onRemoveFromBag}
        onDeleteItem={props.onDeleteItem}
        onRenameItem={props.onRenameItem}
        onDeleteFromBag={props.onDeleteFromBag}
        onCycleConstructStatus={props.onCycleConstructStatus}
        onPromoteConstruct={props.onPromoteConstruct}
      />}

      {activeTab==='levelup' && <LevelUpPanel
        character={character}
        levelUpsAvailable={levelUpsAvailable}
        onLevelClassSelect={onLevelClassSelect}
        onLevelStatSelect={onLevelStatSelect}
      />}

      {activeTab==='crafting' && <CraftingTab
        character={character} db={db}
        onProposeCrafting={props.onProposeCrafting}
        onExecuteCrafting={props.onExecuteCrafting}
        onProposeConsolidation={props.onProposeConsolidation}
        onExecuteConsolidation={props.onExecuteConsolidation}
        onProposeDismantle={props.onProposeDismantle}
        onExecuteDismantle={props.onExecuteDismantle}
      />}

      {activeTab==='settings' && <SettingsPanel
        character={character}
        onChangeStoryOptions={props.onChangeStoryOptions}
        onSaveClick={onSaveClick}
        selectedModel={props.selectedModel}
        onToggleModel={props.onToggleModel}
        voiceSettings={props.voiceSettings}
        pacing={props.pacing}
        onTogglePacing={props.onTogglePacing}
        environment={props.environment}
        onChangeEnvironment={props.onChangeEnvironment}
        adventure={props.adventure}
        arcAntagonist={props.arcAntagonist}
        onRollAdventure={props.onRollAdventure}
        onClearAdventure={props.onClearAdventure}
        onSetAdventure={props.onSetAdventure}
        adventureOptions={props.adventureOptions}
        arcLocation={props.arcLocation}
        onClearArc={props.onClearArc}
        onRollArc={props.onRollArc}
        onSetArc={props.onSetArc}
        onSetArcLocation={props.onSetArcLocation}
        antagonistOptions={props.antagonistOptions}
        completedAdventures={props.completedAdventures}
        onRestoreAdventure={props.onRestoreAdventure}
        defeatedAntagonists={props.defeatedAntagonists}
        onReviveAntagonist={props.onReviveAntagonist}
        onStartNewCampaign={props.onStartNewCampaign}
        arcObjectives={props.arcObjectives}
        arcGoal={props.arcGoal}
        onSetArcGoal={props.onSetArcGoal}
        onGenerateObjectives={props.onGenerateObjectives}
        onSetObjectives={props.onSetObjectives}
        disposition={props.disposition}
        onSaveDisposition={props.onSaveDisposition}
        onSaveBio={props.onSaveBio}
        onSaveAppearance={props.onSaveAppearance}
        onExtractNPC={props.onExtractNPC}
        onExtractTown={props.onExtractTown}
        onSaveNPC={props.onSaveNPC}
        onDeleteNPC={props.onDeleteNPC}
        lootDestination={props.lootDestination}
        onToggleLootDestination={props.onToggleLootDestination}
        showRawTags={props.showRawTags}
        onToggleRawTags={props.onToggleRawTags}
        directives={props.directives}
        onChangeDirectives={props.onChangeDirectives}
        tokenCostLog={props.tokenCostLog}
        debugLog={props.debugLog}
        debugStatus={props.debugStatus}
        onExportDebug={props.onExportDebug}
        onCopyDebug={props.onCopyDebug}
      />}

      <button style={{...btn(false),width:'100%',fontSize:12,marginTop:'auto'}} onClick={onSaveClick}>💾 Save / Export</button>
      <div style={{minHeight:40,flexShrink:0}}/>
    </div>
  );
}

