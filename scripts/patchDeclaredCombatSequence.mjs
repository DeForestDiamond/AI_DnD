import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
const source = fs.readFileSync(path, 'utf8');

const oldText = 'Resolve one action and the enemy\'s response, then stop again — never a whole fight in one message.';
const newText = 'Resolve the complete action or attack sequence the player explicitly declared, then stop. If the player declared multiple attacks, targets, strikes, shots, or effects as part of that action, resolve all of them from the single roll result. Do not call additional rolls during the result message. A roll-result response must never contain another [ROLL:] tag. Do not continue beyond the player\'s declared sequence or invent additional player actions.';

const occurrences = source.split(oldText).length - 1;
if (occurrences === 0) {
  if (source.includes(newText)) {
    console.log('Declared combat sequence prompt already patched.');
    process.exit(0);
  }
  throw new Error('Expected combat-resolution prompt text was not found.');
}

if (occurrences !== 1) {
  throw new Error(`Expected exactly one combat-resolution prompt occurrence, found ${occurrences}.`);
}

const updated = source.replace(oldText, newText);
fs.writeFileSync(path, updated);
console.log('Patched declared combat sequence handling.');
