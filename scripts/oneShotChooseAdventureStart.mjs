import fs from 'node:fs';

const appPath = 'src/App.jsx';
const modalPath = 'src/components/modals/StartModal.jsx';
const advPath = 'src/constants/adventures.js';

let app = fs.readFileSync(appPath, 'utf8');
let modal = fs.readFileSync(modalPath, 'utf8');
let adv = fs.readFileSync(advPath, 'utf8');

// ── adventures.js: reusable constructor for a specifically chosen premise ──
if (!adv.includes('export function prepareSituationAdventure(')) {
  const marker = `export function rollSituationAdventure(completedAdventures = []) {\n`;
  if (!adv.includes(marker)) throw new Error('rollSituationAdventure marker not found');
  const helper = `export function prepareSituationAdventure(adventureOrTitle) {\n  const a = typeof adventureOrTitle === 'string'\n    ? ADVENTURES.find(x => x.title === adventureOrTitle)\n    : adventureOrTitle;\n  if (!a) return null;\n  return { ...a, location: pick(a.locations), tone: pick(tones), openingStyle: pick(openingStyles) };\n}\n\n`;
  adv = adv.replace(marker, helper + marker);
  adv = adv.replace(
    `  const a = pick(available);\n  return { ...a, location: pick(a.locations), tone: pick(tones), openingStyle: pick(openingStyles) };`,
    `  const a = pick(available);\n  return prepareSituationAdventure(a);`
  );
}

// ── App.jsx: import chooser data/helper and allow selected seed ──
app = app.replace(
  `import { rollSituationAdventure } from './constants/adventures.js';`,
  `import { ADVENTURES, rollSituationAdventure, prepareSituationAdventure } from './constants/adventures.js';`
);

app = app.replace(
  `const startAdventure = async (char, openingOverride = null, antagonistOverride = null, situationMode = false) => {`,
  `const startAdventure = async (char, openingOverride = null, antagonistOverride = null, situationMode = false, situationOverride = null) => {`
);

// Tolerate either old no-arg roll or completed-ledger-aware roll.
app = app.replace(/situationSeed = rollSituationAdventure\([^;]*\);/, `situationSeed = situationOverride || rollSituationAdventure(char.completedAdventures || []);`);

if (!app.includes('onChooseAdventure=')) {
  const marker = `          onSituationAdventure={() => { const c = adventureStartChar; setAdventureStartChar(null); startAdventure(c, null, null, true); }}\n`;
  if (!app.includes(marker)) throw new Error('AdventureStartModal situation callback marker not found');
  const replacement = `${marker}          onChooseAdventure={(title) => { const c = adventureStartChar; const chosen = prepareSituationAdventure(title); if (!chosen) return; setAdventureStartChar(null); startAdventure(c, null, null, true, chosen); }}\n          adventures={ADVENTURES}\n          completedAdventures={adventureStartChar?.completedAdventures || []}\n`;
  app = app.replace(marker, replacement);
}

// ── StartModal.jsx: add the chooser UI ──
modal = modal.replace(
  `export function AdventureStartModal({ onRandom, onSituationAdventure, onManual, onChooseAntagonist, antagonists = [], defeatedAntagonists = [] }) {`,
  `export function AdventureStartModal({ onRandom, onSituationAdventure, onChooseAdventure, onManual, onChooseAntagonist, antagonists = [], defeatedAntagonists = [], adventures = [], completedAdventures = [] }) {`
);

if (!modal.includes("const [adventureSearch, setAdventureSearch]")) {
  modal = modal.replace(
    `  const [showDefeated, setShowDefeated] = useState(false);\n`,
    `  const [showDefeated, setShowDefeated] = useState(false);\n  const [adventureSearch, setAdventureSearch] = useState('');\n  const [showCompletedAdventures, setShowCompletedAdventures] = useState(false);\n`
  );
}

if (!modal.includes('visibleAdventures')) {
  const marker = `  const visibleAntagonists = antagonists\n    .filter(a => showDefeated || !defeated.has(a.toLowerCase()))\n    .filter(a => !search.trim() || a.toLowerCase().includes(search.trim().toLowerCase()));\n`;
  if (!modal.includes(marker)) throw new Error('visibleAntagonists marker not found');
  const add = `${marker}\n  const completedTitles = new Set((completedAdventures || []).map(a => typeof a === 'string' ? a : a?.title).filter(Boolean));\n  const visibleAdventures = (adventures || [])\n    .filter(a => showCompletedAdventures || !completedTitles.has(a.title))\n    .filter(a => !adventureSearch.trim() || a.title.toLowerCase().includes(adventureSearch.trim().toLowerCase()));\n`;
  modal = modal.replace(marker, add);
}

if (!modal.includes('Choose Adventure</div>')) {
  const antagonistCard = `            <div onClick={()=>setMode('antagonist')} style={card} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>\n              <div style={{fontSize:28,marginBottom:6}}>👑</div><div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Choose Antagonist</div>\n              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Pick the arc foe yourself, then roll a fresh opening built around them.</div>\n            </div>\n`;
  if (!modal.includes(antagonistCard)) throw new Error('Choose Antagonist card marker not found');
  const chooseAdventureCard = `            <div onClick={()=>setMode('adventure')} style={card} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>\n              <div style={{fontSize:28,marginBottom:6}}>📜</div><div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:4}}>Choose Adventure</div>\n              <div style={{fontSize:11,color:colors.textFaint,lineHeight:1.5}}>Pick a situation premise yourself. Its location, tone, and opening style are still rolled fresh.</div>\n            </div>\n`;
  modal = modal.replace(antagonistCard, chooseAdventureCard + antagonistCard);
}

if (!modal.includes("mode === 'adventure' ?")) {
  const marker = `        ) : (\n          <div>\n            <div style={{fontSize:12,color:colors.textGhost,marginBottom:10,lineHeight:1.5}}>Choose the hidden antagonist for this arc. The app will roll the opening normally and build toward this foe.</div>`;
  if (!modal.includes(marker)) throw new Error('Antagonist branch marker not found');
  const adventureBranch = `        ) : mode === 'adventure' ? (\n          <div>\n            <div style={{fontSize:12,color:colors.textGhost,marginBottom:10,lineHeight:1.5}}>Choose the situation for this Adventure. The premise is fixed, but its compatible starting location, tone, and opening style are rolled fresh.</div>\n            <input value={adventureSearch} onChange={e=>setAdventureSearch(e.target.value)} autoFocus placeholder=\"Search adventures...\" style={{width:'100%',background:'rgba(0,0,0,0.4)',border:\`1px solid \${colors.borderDim}\`,borderRadius:3,color:colors.textDim,fontSize:13,fontFamily:'inherit',padding:'8px 10px',boxSizing:'border-box',marginBottom:10}} />\n            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:colors.textFaint,marginBottom:10,cursor:'pointer'}}><input type=\"checkbox\" checked={showCompletedAdventures} onChange={e=>setShowCompletedAdventures(e.target.checked)} />Show completed adventures ({completedTitles.size})</label>\n            <div style={{border:\`1px solid \${colors.borderDim}\`,borderRadius:4,maxHeight:'52vh',overflowY:'auto',marginBottom:12}}>\n              {visibleAdventures.length ? visibleAdventures.map(a => { const wasCompleted=completedTitles.has(a.title); return <div key={a.title} onClick={()=>onChooseAdventure(a.title)} style={{padding:'10px 12px',borderBottom:\`1px solid \${colors.borderFaint}\`,cursor:'pointer',color:wasCompleted?colors.textGhost:colors.textDim,opacity:wasCompleted?0.65:1}} onMouseEnter={e=>e.currentTarget.style.background=colors.bgDark} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><div style={{fontSize:12,lineHeight:1.4}}>{wasCompleted&&<span style={{marginRight:6}}>✓</span>}{a.title}{wasCompleted&&<span style={{fontSize:9,marginLeft:8,color:colors.textGhost}}>COMPLETED</span>}</div><div style={{fontSize:10,color:colors.textGhost,lineHeight:1.45,marginTop:4}}>{a.premise}</div></div>; }) : <div style={{padding:18,textAlign:'center',fontSize:11,color:colors.textGhost}}>No adventures match this filter.</div>}\n            </div>\n            <button style={{...btn(false),width:'100%'}} onClick={()=>setMode(null)}>← Back</button>\n          </div>\n${marker}`;
  modal = modal.replace(marker, adventureBranch);
}

fs.writeFileSync(appPath, app);
fs.writeFileSync(modalPath, modal);
fs.writeFileSync(advPath, adv);
console.log('Choose Adventure start option applied.');
