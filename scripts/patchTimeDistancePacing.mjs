import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let source = fs.readFileSync(path, 'utf8');

const startMarker = '── TIME & DISTANCE — THE WORLD MUST MOVE ──';
const endMarker = '── INFORMATION MUST BE EARNED ──';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start === -1 || end === -1) {
  if (source.includes('Do not skip an entire day in a single response')) {
    console.log('Time/distance pacing prompt already updated.');
  } else {
    throw new Error('Could not find the existing time/distance prompt block.');
  }
} else {
  const replacement = `── TIME & DISTANCE ──
Time passes naturally as a consequence of actions. Keep the current time of day consistent and let it progress as scenes unfold. Do not freeze time across repeated activity, but do not rush through the day either.

Match pacing to the player's action. Immediate actions and conversations usually move time only slightly. Longer activities such as travel, hunting, crafting, searching, or waiting can move time by a meaningful amount.

When the player chooses to continue an uneventful ongoing activity — continuing watch, continuing travel, waiting, working, or similar — it is appropriate to compress the uneventful stretch and advance to a later part of the day or the next meaningful event. Do not repeatedly resolve an uneventful activity in tiny increments.

Do not skip an entire day in a single response unless the player explicitly chose an activity that reasonably occupies the entire day or asked to continue until a specific later time. Ordinarily, allow several meaningful scenes or activities within a day.

Mention the approximate time of day naturally when establishing scenes or after meaningful time has passed so temporal continuity remains visible. Treat previously established temporal descriptions as continuity facts; do not silently reset to an earlier time of day.

Travel should likewise make believable progress without rushing the player to the destination. Encounters interrupt travel but do not erase progress already made. Preserve established distances, durations, departure times, and expected arrivals when they exist.

Do not fast-forward through an unresolved scene the player is actively participating in, skip decisions, or invent delays merely to consume time. The goal is natural pacing: zoom in while something meaningful is happening and zoom out across uneventful continuation.

`;

  source = source.slice(0, start) + replacement + source.slice(end);
  console.log('Replaced time/distance pacing prompt.');
}

const oldNpcLogic = `      const nloc = (data.location||'').toLowerCase();
      const here = loc ? nloc.includes(loc.toLowerCase())||loc.toLowerCase().includes(nloc) : false;
      if (here||!data.location) lines.push(\`- \${name} [NEARBY]: \${data.desc||''} | Relationship: \${data.relationship||'neutral'}\${data.notes?\` | \${data.notes}\`:''}\`);
      else lines.push(\`- \${name} (\${data.location}): \${data.relationship||'neutral'}\`);`;

const newNpcLogic = `      const nloc = (data.location||'').toLowerCase();
      const here = loc ? nloc.includes(loc.toLowerCase())||loc.toLowerCase().includes(nloc) : false;
      if (!data.location) {
        // No location means this NPC travels with the player. Give the DM the
        // complete record every turn instead of reducing them to the distant-NPC tier.
        const fields = [data.trueName?\`True name: \${data.trueName}\`:'',data.race?\`Race: \${data.race}\`:'',data.role?\`Role: \${data.role}\`:'',data.appearance?\`Appearance: \${data.appearance}\`:'',data.personality?\`Personality: \${data.personality}\`:'',data.status?\`Status: \${data.status}\`:''].filter(Boolean).join(' | ');
        const desc = [fields, data.desc].filter(Boolean).join(' | ');
        const ab = data.abilities ? (Array.isArray(data.abilities)?data.abilities.join(', '):data.abilities) : '';
        lines.push(\`- \${name} [WITH PLAYER — FULL CONTEXT]: \${desc} | Relationship: \${data.relationship||'neutral'}\${ab?\` | Abilities: \${ab}\`:''}\${data.notes?\` | \${data.notes}\`:''}\`);
      } else if (here) lines.push(\`- \${name} [NEARBY]: \${data.desc||''} | Relationship: \${data.relationship||'neutral'}\${data.notes?\` | \${data.notes}\`:''}\`);
      else lines.push(\`- \${name} (\${data.location}): \${data.relationship||'neutral'}\`);`;

if (source.includes(oldNpcLogic)) {
  source = source.replace(oldNpcLogic, newNpcLogic);
  console.log('Updated locationless NPCs to full-context tier.');
} else if (source.includes('[WITH PLAYER — FULL CONTEXT]')) {
  console.log('Locationless NPC full-context tier already updated.');
} else {
  throw new Error('Could not find the existing NPC location-tier logic.');
}

fs.writeFileSync(path, source);
