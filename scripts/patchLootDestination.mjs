import fs from 'node:fs';

const patch = (path, edits) => {
  let s = fs.readFileSync(path, 'utf8');
  let changed = false;
  for (const [from, to, label] of edits) {
    if (s.includes(to)) continue;
    const n = s.split(from).length - 1;
    if (n !== 1) throw new Error(`${path}: expected one ${label}, found ${n}`);
    s = s.replace(from, to);
    changed = true;
  }
  if (changed) fs.writeFileSync(path, s);
  console.log(`${path}: ${changed ? 'patched' : 'already patched'}`);
};

patch('src/hooks/useCharacter.js', [
  [
    'const applyEffects = (text, currentChar, skipLevelUp = false) => {',
    "const applyEffects = (text, currentChar, skipLevelUp = false, itemDestination = 'inventory') => {",
    'applyEffects signature'
  ],
  [
    'if (grant > 0) c.inventory = addStack(c.inventory, name, grant);',
    "if (grant > 0) {\n        const destination = itemDestination === 'stash' ? 'stash' : 'inventory';\n        c[destination] = addStack(c[destination], name, grant);\n      }",
    'ITEM destination'
  ],
]);

patch('src/App.jsx', [
  [
    'const newChar = applyEffects(text, charWithArc);',
    "const newChar = applyEffects(text, charWithArc, false, charWithArc.lootDestination === 'stash' ? 'stash' : 'inventory');",
    'adventure loot routing'
  ],
  [
    'let newChar = applyEffects(effectsText, charRef.current);',
    "let newChar = applyEffects(effectsText, charRef.current, false, charRef.current.lootDestination === 'stash' ? 'stash' : 'inventory');",
    'gameplay loot routing'
  ],
  [
    "            pacing={character.pacing || 'normal'}\n            environment={character.environment || 'wilderness'}",
    "            pacing={character.pacing || 'normal'}\n            lootDestination={character.lootDestination || 'inventory'}\n            onToggleLootDestination={() => {\n              const next = (charRef.current.lootDestination || 'inventory') === 'inventory' ? 'stash' : 'inventory';\n              updateChar({ ...charRef.current, lootDestination: next });\n              log(`[LOOT] DM loot destination set to ${next}`);\n            }}\n            environment={character.environment || 'wilderness'}",
    'sidebar loot props'
  ],
]);

patch('src/components/Sidebar.jsx', [
  [
    'selectedModel, onToggleModel, pacing, onTogglePacing, environment, onChangeEnvironment,',
    'selectedModel, onToggleModel, pacing, onTogglePacing, lootDestination, onToggleLootDestination, environment, onChangeEnvironment,',
    'sidebar signature loot props'
  ],
  [
    "      {/* Raw tag visibility (moved from the header) */}",
    `      {/* DM loot destination — affects only [ITEM:] rewards from gameplay. Crafting/salvage keep their own destinations. */}\n      {onToggleLootDestination && (\n        <div style={{border:\`1px solid \${colors.borderDim}\`,borderRadius:4,padding:8,marginTop:6}}>\n          <div style={{fontFamily:fonts.display,fontSize:10,color:colors.textGhost,letterSpacing:2,marginBottom:5}}>LOOT DESTINATION</div>\n          <div style={{display:'flex',gap:4}}>\n            {['inventory','stash'].map(dest => (\n              <button key={dest} onClick={() => dest !== (lootDestination || 'inventory') && onToggleLootDestination()}\n                style={{...btn(dest === (lootDestination || 'inventory')),flex:1,fontSize:11,padding:'5px 0'}}>\n                {dest === 'inventory' ? '🎒 Inventory' : '📦 Stash'}\n              </button>\n            ))}\n          </div>\n          <div style={{fontSize:9,color:colors.textDead,marginTop:5,lineHeight:1.35}}>New loot granted by the DM goes here. Crafted and salvaged items keep their existing destination controls.</div>\n        </div>\n      )}\n\n      {/* Raw tag visibility (moved from the header) */}`,
    'settings loot toggle'
  ],
]);
