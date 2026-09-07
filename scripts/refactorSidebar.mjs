import fs from 'node:fs';
import path from 'node:path';

const sourcePath = 'src/components/Sidebar.jsx';
const s = fs.readFileSync(sourcePath, 'utf8');
const must = (needle) => {
  const i = s.indexOf(needle);
  if (i < 0) throw new Error(`Missing Sidebar marker: ${needle}`);
  return i;
};

const startCategorize = must('// ── Inventory categorization');
const startCommon = must('// ── Sub-components');
const startVoice = must('// ── Voice settings');
const startStore = must("const SEL_KEY = 'dnd-panel-selections';");
const startBio = must('function BioEditor(');
const startSidebar = must('// ── Main Sidebar');

const originalImports = s.slice(0, startCategorize).trimEnd();
const categorize = s.slice(startCategorize, startCommon).trim();
const common = s.slice(startCommon, startVoice).trim();
const controls = s.slice(startVoice, startStore).trim();
const crafting = s.slice(startStore, startBio).trim();
const world = s.slice(startBio, startSidebar).trim();
const sidebar = s.slice(startSidebar).trim();

const dir = 'src/components/sidebar';
for (const d of ['inventory', 'common', 'settings', 'crafting', 'world']) {
  fs.mkdirSync(path.join(dir, d), { recursive: true });
}

fs.writeFileSync(path.join(dir, 'inventory/categorization.js'), categorize
  .replace('const categorizeItem =', 'export const categorizeItem =')
  .replace('const hasInspectableItemInfo =', 'export const hasInspectableItemInfo =')
  .replace('const CATEGORY_META =', 'export const CATEGORY_META =') + '\n');

fs.writeFileSync(path.join(dir, 'common/index.jsx'), `import { useState, Component } from 'react';
import { colors, fonts } from '../../../styles/theme.js';
import { XP_THRESHOLDS } from '../../../constants/progression.js';

${common
  .replace('function HPBar(', 'export function HPBar(')
  .replace('function XPBar(', 'export function XPBar(')
  .replace('class PanelErrorBoundary', 'export class PanelErrorBoundary')
  .replace('function CollapsibleSection(', 'export function CollapsibleSection(')}
`);

fs.writeFileSync(path.join(dir, 'settings/Controls.jsx'), `import { useState } from 'react';
import { colors, fonts, btn } from '../../../styles/theme.js';

${controls
  .replace('function VoiceSettings(', 'export function VoiceSettings(')
  .replace('function DispositionEditor(', 'export function DispositionEditor(')
  .replace('function ObjectivesPanel(', 'export function ObjectivesPanel(')
  .replace('function DirectivesEditor(', 'export function DirectivesEditor(')
  .replace('function DebugViewer(', 'export function DebugViewer(')}
`);

fs.writeFileSync(path.join(dir, 'crafting/Panels.jsx'), `import { useState } from 'react';
import { colors, fonts, btn } from '../../../styles/theme.js';
import { allItems } from '../../../hooks/useCharacter.js';
import { stackCounts, stackCount, stackHas } from '../../../utils/itemStacks.js';
import { categorizeItem, CATEGORY_META, hasInspectableItemInfo } from '../inventory/categorization.js';
import { CollapsibleSection } from '../common/index.jsx';

${crafting
  .replace('function CraftingPanel(', 'export function CraftingPanel(')
  .replace('function ConsolidatePanel(', 'export function ConsolidatePanel(')
  .replace('function SalvagePanel(', 'export function SalvagePanel(')}
`);

fs.writeFileSync(path.join(dir, 'world/Panels.jsx'), `import { useState } from 'react';
import { colors, fonts, btn } from '../../../styles/theme.js';
import { SLOTS } from '../../../constants/items.js';
import { equippableInSlot } from '../../../hooks/useCharacter.js';

${world
  .replace('function BioEditor(', 'export function BioEditor(')
  .replace('function TownManager(', 'export function TownManager(')
  .replace('function NPCManager(', 'export function NPCManager(')
  .replace('function CompanionSlots(', 'export function CompanionSlots(')}
`);

const newImports = `${originalImports}
import { categorizeItem, CATEGORY_META, hasInspectableItemInfo } from './sidebar/inventory/categorization.js';
import { HPBar, XPBar, PanelErrorBoundary, CollapsibleSection } from './sidebar/common/index.jsx';
import { VoiceSettings, DispositionEditor, ObjectivesPanel, DirectivesEditor, DebugViewer } from './sidebar/settings/Controls.jsx';
import { CraftingPanel, ConsolidatePanel, SalvagePanel } from './sidebar/crafting/Panels.jsx';
import { BioEditor, TownManager, NPCManager, CompanionSlots } from './sidebar/world/Panels.jsx';
export { resetCraftingPanels } from './sidebar/crafting/Panels.jsx';

`;

fs.writeFileSync(sourcePath, newImports + sidebar + '\n');
console.log('Sidebar split complete', {
  inventory: categorize.split('\n').length,
  common: common.split('\n').length,
  settings: controls.split('\n').length,
  crafting: crafting.split('\n').length,
  world: world.split('\n').length,
  shell: sidebar.split('\n').length,
});
