import fs from 'node:fs';
const once=(path,from,to,label)=>{let s=fs.readFileSync(path,'utf8');const n=s.split(from).length-1;if(n!==1)throw new Error(`${path}: ${label} expected once, got ${n}`);fs.writeFileSync(path,s.replace(from,to));};
once('src/App.jsx',`    setTokenCostLog(prev => {
      const next = [...prev, entry];
      tokenCostLogRef.current = next;
      return next;
    });
    return entry;`,`    setTokenCostLog(prev => {
      const next = [...prev, entry];
      tokenCostLogRef.current = next;
      return next;
    });
    // Usage is campaign data. Persist it immediately instead of waiting for a
    // character mutation to happen to trigger the ordinary autosave effect.
    setTimeout(() => {
      try { save.autoSave(charRef.current, fullLogRef.current); } catch {}
    }, 0);
    return entry;`,'telemetry autosave');
const path='src/hooks/useGame.js';let s=fs.readFileSync(path,'utf8');const re=/\n    \/\/ Diagnostic: which region is actually costing tokens\.[\s\S]*?\n    \}\n\n    \/\/ Hand the assembled prompt to the caller/;if(!re.test(s))throw new Error('prompt diagnostic block not found');s=s.replace(re,'\n\n    // Hand the assembled prompt to the caller');fs.writeFileSync(path,s);
console.log('follow-up telemetry patch applied');
