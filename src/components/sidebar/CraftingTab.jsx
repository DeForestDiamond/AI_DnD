import { PanelErrorBoundary } from './common/index.jsx';
import { CraftingPanel, ConsolidatePanel, SalvagePanel } from './crafting/Panels.jsx';

export function CraftingTab({
  character,
  db,
  onProposeCrafting,
  onExecuteCrafting,
  onProposeConsolidation,
  onExecuteConsolidation,
  onProposeDismantle,
  onExecuteDismantle,
}) {
  return <PanelErrorBoundary>
    {onProposeCrafting && (
      <CraftingPanel character={character} db={db} onProposeCrafting={onProposeCrafting} onExecuteCrafting={onExecuteCrafting} />
    )}
    {onExecuteConsolidation && (
      <ConsolidatePanel character={character} db={db} onProposeConsolidation={onProposeConsolidation} onExecuteConsolidation={onExecuteConsolidation} />
    )}
    {onProposeDismantle && (
      <SalvagePanel character={character} db={db} onProposeDismantle={onProposeDismantle} onExecuteDismantle={onExecuteDismantle} />
    )}
  </PanelErrorBoundary>;
}
