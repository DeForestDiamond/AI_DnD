import { HOSTILE, SOCIAL_BY_ENV, WEIRD_BY_ENV } from './environments/index.js';
import { encounterCRCap } from './pacing.js';
import { rollNpcDescriptor, NATIVE_ONLY_ENVIRONMENTS } from './npcRaces.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Arc-tied variants: the encounter doubles as guaranteed foreshadowing,
// because the app picked both the encounter AND the villain it points at.
const ARC_HOSTILE = [
  (a) => `scouts or agents of ${a} attack — they have clearly been watching the player`,
  (a) => `the player walks into an ambush laid by ${a}`,
  (a) => `enforcers working for ${a} try to warn the player off — it goes badly`,
];
const ARC_SOCIAL = [
  (a) => `a survivor fleeing ${a} stumbles onto the road, desperate to warn anyone who will listen`,
  (a) => `someone hunting ${a} for reasons of their own wants to compare notes`,
  (a) => `a frightened local quietly admits they have been paying off ${a} to be left alone`,
];
const ARC_WEIRD = [
  (a) => `the fresh aftermath of an attack by ${a} — and one detail worth following`,
  (a) => `a coded message, mark, or token that traces back to ${a}`,
  (a) => `evidence that ${a} passed through here recently, and was looking for something`,
];

const TABLES = { social: SOCIAL_BY_ENV, weird: WEIRD_BY_ENV };
const ARC_TABLES = { hostile: ARC_HOSTILE, social: ARC_SOCIAL, weird: ARC_WEIRD };

// ── Roll an encounter directive ────────────────────────────────────────────────
// Mix: 60% hostile / 25% social / 15% weird. 1-in-3 ties to the active arc.
// Hostile rolls only from entries at or under the level's CR ceiling.
export const rollEncounterDirective = (char) => {
  const r = Math.random();
  const type = r < 0.60 ? 'hostile' : r < 0.85 ? 'social' : 'weird';
  const arcTied = !!char?.arc?.antagonist && char.arc.status !== 'reserved' && Math.random() < (1 / 3);
  const cap = encounterCRCap(char?.level);

  let desc, crNote = '', npcNote = '';
  if (arcTied) {
    desc = pick(ARC_TABLES[type])(char.arc.antagonist);
  } else if (type === 'hostile') {
    // Native planar environments stay native; ordinary 'anywhere' trouble is only
    // mixed into Material-style environments. Then apply the CR ceiling.
    const envHere = char?.environment || 'wilderness';
    let pool = HOSTILE.filter(e => e.cr <= cap && (e.env?.includes(envHere) || (!NATIVE_ONLY_ENVIRONMENTS.has(envHere) && e.env?.includes('anywhere'))));
    if (!pool.length && !NATIVE_ONLY_ENVIRONMENTS.has(envHere)) pool = HOSTILE.filter(e => e.cr <= cap); // material safety net
    const entry = pick(pool);
    desc = entry.desc;
    crNote = `This is a CR ${entry.label} threat — keep it at exactly that power, do not escalate it into something bigger. `;
  } else {
    const envHere = char?.environment || 'wilderness';
    const envTable = TABLES[type]?.[envHere] || TABLES[type]?.wilderness || [];
    desc = pick(envTable);
  }
  if (type === 'social') {
    const envHere = char?.environment || 'wilderness';
    if (!NATIVE_ONLY_ENVIRONMENTS.has(envHere)) {
      npcNote = `The person at the center of this encounter is a ${rollNpcDescriptor(envHere)} — use exactly that race and gender, and give them one fresh memorable detail (no scars, no travel leathers, no merchant's clothes). `;
    }
  }

  const directive =
    `\n\n[ENCOUNTER — MANDATORY: This turn, the following occurs: ${desc}. ` +
    `OPEN the encounter at the MOMENT OF FIRST CONTACT — the creature appears, the stranger steps out, the thing is noticed — and then STOP for the player's choice. Do NOT start the scene already in progress, do NOT narrate the player dodging, drawing, striking, or reacting, and do NOT resolve any of it. Do NOT call any [ROLL:] in this message — the player has made no choice yet, so there is nothing to roll for; the roll (if any) comes AFTER they state what they do. Describe only what happens TO them and around them, then hand control back. ` +
    crNote + npcNote +
    (arcTied ? `This connects to the active arc antagonist — let that show without naming them outright. Scale any threat to the player's level. ` : '') +
    `End with your usual 4 numbered choices.]`;
  return { type, arcTied, desc, directive };
};

