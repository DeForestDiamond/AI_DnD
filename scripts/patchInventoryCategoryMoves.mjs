import fs from 'node:fs';

const path = 'src/components/Sidebar.jsx';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

const once = (from, to, label) => {
  if (s.includes(to)) return;
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`Inventory category patch: expected one ${label}, found ${n}`);
  s = s.replace(from, to);
  changed = true;
};

// Inventory categories already collapse. Put a category-wide move button at the
// top of each opened category, using the existing per-item "move all" handler so
// stack counts and item definitions keep following the normal transfer path.
once(
`          <CollapsibleSection key={cat} title={meta.label} count={items.length} defaultOpen={false}>\n            {items.map(({ name, count }) => {`,
`          <CollapsibleSection key={cat} title={meta.label} count={items.length} defaultOpen={false}>\n            {onMoveToStash && !bagMode && (\n              <button\n                onClick={() => items.forEach(({ name }) => onMoveToStash(name, true))}\n                title={\`Move every item in ${'${meta.label}'} to stash\`}\n                style={{...btn(false),width:'100%',fontSize:9,padding:'3px 0',marginBottom:5}}>\n                📦 MOVE ALL ${'${meta.label.replace(/^[^ ]+\\s*/, \'\').toUpperCase()}'} TO STASH\n              </button>\n            )}\n            {items.map(({ name, count }) => {`,
'inventory category move-all button'
);

// Stash categories were only visual headers. Turn each one into the same
// collapsible component used by inventory, and add the reverse category-wide
// transfer control. During a search, categories open so matching rows remain
// visible; otherwise they start collapsed like inventory categories.
once(
`                return (\n                  <div key={cat}>\n                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0 2px',marginTop:2}}>\n                      <span style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:1}}>{meta.label}</span>\n                      <span style={{fontFamily:fonts.mono,fontSize:10,color:colors.textDead}}>{rows.length}</span>\n                    </div>\n                    {rows.map(([name, count]) => {`,
`                return (\n                  <CollapsibleSection key={cat + (q ? ':search' : '')} title={meta.label} count={rows.length} defaultOpen={!!q}>\n                    {onMoveToInventory && (\n                      <button\n                        onClick={() => rows.forEach(([name]) => onMoveToInventory(name, true))}\n                        title={\`Return every visible item in ${'${meta.label}'} to inventory\`}\n                        style={{...btn(false),width:'100%',fontSize:9,padding:'3px 0',marginBottom:5}}>\n                        ↑ MOVE ALL ${'${meta.label.replace(/^[^ ]+\\s*/, \'\').toUpperCase()}'} TO INVENTORY\n                      </button>\n                    )}\n                    {rows.map(([name, count]) => {`,
'stash collapsible category start'
);

once(
`                    })}\n                  </div>\n                );\n              });\n            })()}\n          </CollapsibleSection>`,
`                    })}\n                  </CollapsibleSection>\n                );\n              });\n            })()}\n          </CollapsibleSection>`,
'stash collapsible category end'
);

if (changed) fs.writeFileSync(path, s);
console.log(changed ? 'Inventory/stash category controls patch applied.' : 'Inventory/stash category controls already applied.');
