import fs from 'node:fs';
const p='src/components/Sidebar.jsx';
let s=fs.readFileSync(p,'utf8');
const i=s.indexOf('function CraftingPanel');
if(i<0) throw new Error('CraftingPanel not found');
console.log(s.slice(i,i+24000));
