import fs from 'node:fs';
const path='src/components/Sidebar.jsx';
let s=fs.readFileSync(path,'utf8');
const once=(from,to,label)=>{const n=s.split(from).length-1;if(n===0&&s.includes(to.slice(0,Math.min(80,to.length))))return false;if(n!==1)throw new Error(`Adventure settings patch: expected one ${label}, found ${n}`);s=s.replace(from,to);return true;};
let changed=false;
changed|=once(
"export function Sidebar({ character, onSlotClick, onCompanionSlotClick, onCompanionUnequip, onSaveClick, onClose, onAbilitiesClick, onMoveToStash, onMoveToInventory, onBankCoins, onWithdrawCoins, onCreateBag, onAddToBag, onRemoveFromBag, onDeleteItem, onRenameItem, onDeleteFromBag, selectedModel, onToggleModel, pacing, onTogglePacing, environment, onChangeEnvironment, arcAntagonist, arcLocation, onClearArc, onRollArc, onSetArc, onToggleContextExclusion, onExtractNPC, onExtractTown, onSaveNPC, onDeleteNPC, onSaveBio, onStartNewCampaign, arcObjectives, arcGoal, onSetArcGoal, onGenerateObjectives, onSetObjectives, disposition, onSaveDisposition, defeatedAntagonists, onReviveAntagonist, onCycleConstructStatus, onPromoteConstruct, onProposeCrafting, onExecuteCrafting, onProposeDismantle, onExecuteDismantle, voiceSettings, showRawTags, onToggleRawTags, debugLog, debugStatus, onExportDebug, onCopyDebug, directives, onChangeDirectives, levelUpsAvailable=0, onLevelClassSelect, onLevelStatSelect }) {",
"export function Sidebar({ character, onSlotClick, onCompanionSlotClick, onCompanionUnequip, onSaveClick, onClose, onAbilitiesClick, onMoveToStash, onMoveToInventory, onBankCoins, onWithdrawCoins, onCreateBag, onAddToBag, onRemoveFromBag, onDeleteItem, onRenameItem, onDeleteFromBag, selectedModel, onToggleModel, pacing, onTogglePacing, environment, onChangeEnvironment, arcAntagonist, arcLocation, onClearArc, onRollArc, onSetArc, adventure, onClearAdventure, onRollAdventure, onToggleContextExclusion, onExtractNPC, onExtractTown, onSaveNPC, onDeleteNPC, onSaveBio, onStartNewCampaign, arcObjectives, arcGoal, onSetArcGoal, onGenerateObjectives, onSetObjectives, disposition, onSaveDisposition, defeatedAntagonists, onReviveAntagonist, onCycleConstructStatus, onPromoteConstruct, onProposeCrafting, onExecuteCrafting, onProposeDismantle, onExecuteDismantle, voiceSettings, showRawTags, onToggleRawTags, debugLog, debugStatus, onExportDebug, onCopyDebug, directives, onChangeDirectives, levelUpsAvailable=0, onLevelClassSelect, onLevelStatSelect }) {",
'sidebar adventure props');
changed|=once(
"      {/* Story arc — the hidden antagonist all foreshadowing builds toward */}",
`      {/* Situation Adventure — mutually exclusive with antagonist arcs */}
      {onRollAdventure && (
        <div style={{marginTop:6,padding:'7px 9px',background:'rgba(0,0,0,0.25)',border:\`1px solid \${colors.borderDim}\`,borderRadius:3}}>
          <div style={{fontSize:10,color:colors.textGhost,letterSpacing:0.5,marginBottom:3}}>ADVENTURE</div>
          <div style={{fontSize:12,color:adventure?colors.textDim:colors.textFaint,fontStyle:'italic',marginBottom:6,lineHeight:1.35}}>
            {adventure ? adventure.title : (arcAntagonist ? 'Inactive — antagonist arc is the current story driver.' : 'Open — no Adventure is active.')}
          </div>
          {adventure?.premise && (
            <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.4,marginBottom:6}}>{adventure.premise}</div>
          )}
          {adventure?.location && (
            <div style={{fontSize:10,color:colors.textGhost,lineHeight:1.35,marginBottom:6}}>📍 {adventure.location}</div>
          )}
          <div style={{display:'flex',gap:6}}>
            <button onClick={onRollAdventure} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>🎭 {adventure?'Reroll':'Roll Adventure'}</button>
            {adventure && <button onClick={onClearAdventure} style={{...btn(false),flex:1,fontSize:11,padding:'4px 0'}}>✕ Clear</button>}
          </div>
          <div style={{fontSize:9,color:colors.textDead,lineHeight:1.35,marginTop:5}}>
            Rolling an Adventure clears any antagonist. [ADVENTURE COMPLETE] clears it without rolling a replacement.
          </div>
        </div>
      )}

      {/* Story arc — the hidden antagonist all foreshadowing builds toward */}`,
'adventure settings UI');
if(changed){fs.writeFileSync(path,s);console.log('Adventure settings controls applied.');}else console.log('Adventure settings controls already applied.');
