import fs from 'node:fs';

const appPath = 'src/App.jsx';
const sidePath = 'src/components/Sidebar.jsx';
let app = fs.readFileSync(appPath, 'utf8');
let side = fs.readFileSync(sidePath, 'utf8');
let changed = false;

const replaceOnce = (src, from, to, label) => {
  const n = src.split(from).length - 1;
  if (n === 0 && src.includes(to.slice(0, Math.min(100, to.length)))) return src;
  if (n !== 1) throw new Error(`Completed Adventures patch: expected one ${label}, found ${n}`);
  changed = true;
  return src.replace(from, to);
};

// Completion records the full rolled Adventure object so removing it from the
// completed ledger restores the exact premise to the shuffle. This ledger is
// player-facing state only; it is never added to the DM prompt.
app = replaceOnce(app,
`      if (/\\[ADVENTURE COMPLETE\\]/i.test(effectsText) && newChar.adventure) {
        const finished = newChar.adventure.title || 'Adventure';
        const { adventure, ...rest } = newChar;
        newChar = rest;
        log(\`[ADVENTURE] Complete — \${finished}. No replacement rolled.\`);
      }`,
`      if (/\\[ADVENTURE COMPLETE\\]/i.test(effectsText) && newChar.adventure) {
        const completed = newChar.adventure;
        const finished = completed.title || 'Adventure';
        const prior = Array.isArray(newChar.completedAdventures) ? newChar.completedAdventures : [];
        const completedAdventures = prior.some(a => (typeof a === 'string' ? a : a?.title) === finished)
          ? prior
          : [...prior, completed];
        const { adventure, ...rest } = newChar;
        newChar = { ...rest, completedAdventures };
        log(\`[ADVENTURE] Complete — \${finished} added to completed ledger. No replacement rolled.\`);
      }`,
'adventure completion ledger');

app = replaceOnce(app,
`  // Promote a construct ITEM into a companion record. Only worth doing for`,
`  // Remove an Adventure from the completed ledger so it becomes rollable again.
  // Like defeated foes, this list is history/shuffle control only and is never
  // sent to the DM.
  const restoreAdventure = (title) => {
    const c = charRef.current;
    updateChar({
      ...c,
      completedAdventures: (c.completedAdventures || []).filter(a => (typeof a === 'string' ? a : a?.title) !== title),
    });
    log(\`[ADVENTURE] \${title} removed from completed ledger — rollable again\`);
  };

  // Promote a construct ITEM into a companion record. Only worth doing for`,
'restore adventure function');

// All Adventure rolls exclude completed titles. If all 12 are completed, the
// roller returns null rather than silently repeating one.
app = app.replaceAll('rollSituationAdventure();', 'rollSituationAdventure(charRef.current?.completedAdventures || char?.completedAdventures || []);');
app = app.replaceAll('const adventure = rollSituationAdventure(charRef.current?.completedAdventures || char?.completedAdventures || []);', 'const adventure = rollSituationAdventure(charRef.current.completedAdventures || []);');
app = replaceOnce(app,
`              updateChar({ ...rest, adventure });
              log(\`[ADVENTURE] Rolled by player — \${adventure.title}\`);`,
`              if (!adventure) { log('[ADVENTURE] No rollable Adventures remain — restore one from Completed Adventures'); return; }
              updateChar({ ...rest, adventure });
              log(\`[ADVENTURE] Rolled by player — \${adventure.title}\`);`,
'empty adventure pool handling');

app = replaceOnce(app,
`            defeatedAntagonists={character.defeatedAntagonists || []}
            onReviveAntagonist={reviveAntagonist}`,
`            defeatedAntagonists={character.defeatedAntagonists || []}
            onReviveAntagonist={reviveAntagonist}
            completedAdventures={character.completedAdventures || []}
            onRestoreAdventure={restoreAdventure}`,
'adventure ledger sidebar props');

side = replaceOnce(side,
`defeatedAntagonists, onReviveAntagonist, onCycleConstructStatus`,
`defeatedAntagonists, onReviveAntagonist, completedAdventures, onRestoreAdventure, onCycleConstructStatus`,
'sidebar signature');

side = replaceOnce(side,
`      {onReviveAntagonist && (defeatedAntagonists?.length > 0) && (`,
`      {onRestoreAdventure && (completedAdventures?.length > 0) && (
        <CollapsibleSection title="📚 COMPLETED ADVENTURES" count={completedAdventures.length} defaultOpen={false}>
          <div style={{fontSize:10,color:colors.textDead,fontStyle:'italic',marginBottom:6,lineHeight:1.4}}>
            Adventures you've completed. These stay out of the Adventure shuffle — remove one to let it be rolled again.
          </div>
          {completedAdventures.map((entry, i) => {
            const title = typeof entry === 'string' ? entry : entry?.title || 'Adventure';
            return (
              <div key={title + i} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',borderBottom:\`1px solid \${colors.borderFaint}\`}}>
                <span style={{flex:1,minWidth:0,fontSize:12,color:colors.textDim,lineHeight:1.4}}>{title}</span>
                <button title="Return this Adventure to the shuffle"
                  onClick={()=>onRestoreAdventure(title)}
                  style={{...btn(false),flexShrink:0,fontSize:10,padding:'2px 6px'}}>↺</button>
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      {onReviveAntagonist && (defeatedAntagonists?.length > 0) && (`,
'completed adventures UI');

fs.writeFileSync(appPath, app);
fs.writeFileSync(sidePath, side);
console.log(changed ? 'Completed Adventure ledger applied.' : 'Completed Adventure ledger already applied.');
