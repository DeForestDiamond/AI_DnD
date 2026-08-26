import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

const diceMarker = 'DICE FREQUENCY: Rolls are exceptional, not the default.';
if (!s.includes(diceMarker)) {
  const npcAnchor = "NPC INTRODUCTIONS: The first time a character appears, explicitly state their race or creature type in the narration (for example human, elf, gnome, dragonborn, tiefling, aasimar). Do not rely on appearance alone to imply it.";
  const replacement = npcAnchor + "\\n\\nDICE FREQUENCY: Rolls are exceptional, not the default. Do not request [ROLL:] for routine actions, ordinary looting, taking items from defeated or unresisting targets, walking, talking, shopping, or inspecting something obvious. Ask for a roll only when the outcome is genuinely uncertain, failure would matter, and no app-generated GAME DATA already resolves the action. Several turns may pass with no rolls at all. AUTOMATED ATTACK DATA IS CONDITIONAL: the app uses simple verb matching and can occasionally attach attack-roll GAME DATA to a message that was not actually an attack. First read the player's message. Only narrate supplied attack/damage results when the player clearly declared an actual attack against a target. If the player did not actually attack, ignore the automated attack GAME DATA completely; do not invent an attack, hit, miss, weapon use, damage, hostile reaction, or combat state to justify the roll. Never request a second attack roll when valid GAME DATA already supplies an attack roll and damage; narrate that supplied result instead. NEVER request two rolls back-to-back. After any [ROLL:] request is resolved, narrate the consequence and return control to the player; do not immediately end that resolution with another [ROLL:]. If a sequence could plausibly require several checks, use one meaningful roll to resolve the immediate uncertainty and only ask for another on a later player action if a new, distinct uncertainty actually arises. Looting should only require a roll when the player is actively searching for something hidden, dealing with a trap, racing an opponent, or facing another meaningful uncertainty.";
  const count = s.split(npcAnchor).length - 1;
  if (count !== 1) throw new Error(`GPT dice chill patch: expected one NPC anchor, found ${count}`);
  s = s.replace(npcAnchor, replacement);
  changed = true;
} else {
  const oldDiceRule = "Several turns may pass with no rolls at all. Never request a second attack roll when GAME DATA already supplies an attack roll and damage; narrate that supplied result instead. Looting should only require a roll when the player is actively searching for something hidden, dealing with a trap, racing an opponent, or facing another meaningful uncertainty.";
  const newDiceRule = "Several turns may pass with no rolls at all. Never request a second attack roll when GAME DATA already supplies an attack roll and damage; narrate that supplied result instead. NEVER request two rolls back-to-back. After any [ROLL:] request is resolved, narrate the consequence and return control to the player; do not immediately end that resolution with another [ROLL:]. If a sequence could plausibly require several checks, use one meaningful roll to resolve the immediate uncertainty and only ask for another on a later player action if a new, distinct uncertainty actually arises. Looting should only require a roll when the player is actively searching for something hidden, dealing with a trap, racing an opponent, or facing another meaningful uncertainty.";
  if (!s.includes(newDiceRule)) {
    const count = s.split(oldDiceRule).length - 1;
    if (count !== 1) throw new Error(`GPT dice chill patch: expected one existing dice rule anchor, found ${count}`);
    s = s.replace(oldDiceRule, newDiceRule);
    changed = true;
  }
}

// The automatic attack detector is deliberately lightweight and occasionally
// produces a false positive from an attack-ish verb used in a non-attack sense.
// The DM must treat GAME DATA as conditional on what the player actually said,
// rather than reverse-engineering an attack because a roll happened to appear.
const falsePositiveRule = "AUTOMATED ATTACK DATA IS CONDITIONAL: the app uses simple verb matching and can occasionally attach attack-roll GAME DATA to a message that was not actually an attack. First read the player's message. Only narrate supplied attack/damage results when the player clearly declared an actual attack against a target. If the player did not actually attack, ignore the automated attack GAME DATA completely; do not invent an attack, hit, miss, weapon use, damage, hostile reaction, or combat state to justify the roll.";
if (!s.includes(falsePositiveRule)) {
  const anchor = "Several turns may pass with no rolls at all. Never request a second attack roll when GAME DATA already supplies an attack roll and damage; narrate that supplied result instead.";
  const replacement = `Several turns may pass with no rolls at all. ${falsePositiveRule} Never request a second attack roll when valid GAME DATA already supplies an attack roll and damage; narrate that supplied result instead.`;
  const count = s.split(anchor).length - 1;
  if (count !== 1) throw new Error(`GPT dice chill patch: expected one attack GAME DATA rule anchor, found ${count}`);
  s = s.replace(anchor, replacement);
  changed = true;
}

const oldAttackWords = "    const attackWords = /\\b(attack|strike|stab|slash|swing|lunge|thrust|smite|bash|cleave|slice|hack|fight|engage|charge)\\b/i;";
const newAttackWords = "    const attackWords = /\\b(attack|strike|stab|slash|swing|lunge|thrust|smite|bash|cleave|slice|hack|fight|engage|charge|shoot|fire|loose)\\b/i;";
if (!s.includes(newAttackWords)) {
  const count = s.split(oldAttackWords).length - 1;
  if (count !== 1) throw new Error(`GPT dice chill patch: expected one attackWords anchor, found ${count}`);
  s = s.replace(oldAttackWords, newAttackWords);
  changed = true;
}

const oldInsideQuotes = "    const insideQuotes = /[\"'「][^\"'「」]*\\b(attack|strike|stab|slash|swing|lunge|thrust|smite|bash|cleave|slice|hack|fight|engage|charge)\\b[^\"'「」]*[\"'」]/i;";
const newInsideQuotes = "    const insideQuotes = /[\"'「][^\"'「」]*\\b(attack|strike|stab|slash|swing|lunge|thrust|smite|bash|cleave|slice|hack|fight|engage|charge|shoot|fire|loose)\\b[^\"'「」]*[\"'」]/i;";
if (!s.includes(newInsideQuotes)) {
  const count = s.split(oldInsideQuotes).length - 1;
  if (count !== 1) throw new Error(`GPT dice chill patch: expected one quoted attackWords anchor, found ${count}`);
  s = s.replace(oldInsideQuotes, newInsideQuotes);
  changed = true;
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('GPT dice frequency softened; false-positive automated attacks ignored; back-to-back rolls blocked; ranged attack verbs restored.');
} else {
  console.log('GPT dice frequency, false-positive attack handling, back-to-back roll rule, and ranged attack verbs already patched.');
}
