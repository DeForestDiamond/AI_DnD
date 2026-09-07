import fs from 'node:fs';

const path = 'src/components/Sidebar.jsx';
let s = fs.readFileSync(path, 'utf8');
const importNeedle = "import { categorizeItem, CATEGORY_META, hasInspectableItemInfo } from './sidebar/inventory/categorization.js';";
const importLine = importNeedle + "\nimport { slotItemLabel } from './sidebar/inventory/labels.js';";
if (!s.includes("from './sidebar/inventory/labels.js'")) {
  if (!s.includes(importNeedle)) throw new Error('Sidebar inventory import not found');
  s = s.replace(importNeedle, importLine);
}
if (!s.includes('slotItemLabel(itemName, data)')) throw new Error('slotItemLabel usage not found');
fs.writeFileSync(path, s);
