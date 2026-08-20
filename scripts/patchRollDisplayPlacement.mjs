import fs from 'node:fs';

const path = 'src/App.jsx';
let s = fs.readFileSync(path, 'utf8');

const already = "addMessage({ role:'dm', text: setupText, id: Date.now() - 1, roll: skillRoll || null });";
if (s.includes(already)) {
  console.log('Roll display placement already applied.');
  process.exit(0);
}

const oldFinal = `      let finalText = dmText;\n      let finalRoll = actionRoll || skillRoll || null;\n      let rollSetupText = '';`;
const newFinal = `      let finalText = dmText;\n      // Player-initiated attacks belong on the final DM response. A DM-requested\n      // roll belongs on the setup message that actually requested it.\n      let finalRoll = actionRoll || null;\n      let rollSetupText = '';`;

if (!s.includes(oldFinal)) {
  throw new Error('Roll final-message anchor not found; refusing broad edit');
}
s = s.replace(oldFinal, newFinal);

const oldSetup = `        if (setupText) {\n          rollSetupText = setupText;\n          addMessage({ role:'dm', text: setupText, id: Date.now() - 1, roll: null });\n        }`;
const newSetup = `        if (setupText) {\n          rollSetupText = setupText;\n          addMessage({ role:'dm', text: setupText, id: Date.now() - 1, roll: skillRoll || null });\n        } else if (skillRoll) {\n          // Bare [ROLL:] requests have no visible setup message, so keep the\n          // result on the follow-up narration rather than dropping it.\n          finalRoll = skillRoll;\n        }`;

if (!s.includes(oldSetup)) {
  throw new Error('Roll setup-message anchor not found; refusing broad edit');
}
s = s.replace(oldSetup, newSetup);

fs.writeFileSync(path, s);
console.log('Roll display placement applied.');
