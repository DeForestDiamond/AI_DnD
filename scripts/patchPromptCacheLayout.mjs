import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

// Repair the NPC-rule wording added earlier. That rule lives inside a
// single-quoted JS string, so the ASCII apostrophe in "player's" terminates the
// string and makes Vite fail to parse useGame.js. A typographic apostrophe keeps
// the exact human-readable wording without becoming JS syntax.
if (s.includes("merely because they exist in the player's history")) {
  s = s.replaceAll(
    "merely because they exist in the player's history",
    "merely because they exist in the player’s history"
  );
  changed = true;
}

// Idempotent build/dev-time migration: the large arc policy used to live in
// CURRENT STATE, making ~2k tokens volatile every turn. Keep only the actual
// antagonist/location there and move the policy into the stable Sonnet/GPT
// instructions where prefix caching can reuse it.
if (!s.includes('const ARC_RULES_BLOCK = `')) {
  const arcAnchor = "  const arcLine = char.arc?.antagonist\n    ? `";
  const a = s.indexOf(arcAnchor);
  if (a < 0) throw new Error('arcLine anchor not found');
  const innerStart = a + arcAnchor.length;
  const innerEnd = s.indexOf("`\n    : '';", innerStart);
  if (innerEnd < 0) throw new Error('arcLine end not found');

  const inner = s.slice(innerStart, innerEnd);
  const marker = "${char.arc.arcLocation || 'Faerûn'}.";
  const markerAt = inner.indexOf(marker);
  if (markerAt < 0) throw new Error('arc location marker not found');
  const cut = markerAt + marker.length;
  const dynamicArc = inner.slice(0, cut);
  let policy = inner.slice(cut).trimStart();

  if (policy.length < 1000) throw new Error(`arc policy unexpectedly short (${policy.length})`);
  if (policy.includes('`') || policy.includes('${')) {
    throw new Error('arc policy contains unexpected template syntax');
  }

  policy = policy
    .replaceAll('The antagonist above', 'The antagonist named in CURRENT STATE')
    .replaceAll('the antagonist above', 'the antagonist named in CURRENT STATE');

  // Replace volatile arcLine with antagonist + arc location only.
  s = s.slice(0, innerStart) + dynamicArc + s.slice(innerEnd);

  // Define the unchanged policy once in the stable shared-rule area.
  const settingDecl = '// ── Shared setting/geography (both models)';
  const settingAt = s.indexOf(settingDecl);
  if (settingAt < 0) throw new Error('setting declaration anchor not found');
  const arcBlock = `// ── Shared arc policy (stable; antagonist/location stay dynamic) ───────────────\nconst ARC_RULES_BLOCK = \`── ACTIVE ARC RULES (apply whenever CURRENT STATE names an active antagonist) ──\nThe active antagonist and arc location themselves are supplied in CURRENT STATE each turn.\n${policy}\`;\n\n`;
  s = s.slice(0, settingAt) + arcBlock + s.slice(settingAt);

  // GPT uses the Sonnet builder, so add it only to that stable prompt. Haiku's
  // own arc machinery is left untouched.
  const sonnetStart = s.indexOf('// ── System Prompt — Sonnet');
  if (sonnetStart < 0) throw new Error('Sonnet prompt anchor not found');
  const beforeSonnet = s.slice(0, sonnetStart);
  let sonnet = s.slice(sonnetStart);
  const settingUse = '${SETTING_BLOCK}\n\n${NPC_BLOCK}';
  if (!sonnet.includes(settingUse)) throw new Error('Sonnet setting/NPC insertion point not found');
  sonnet = sonnet.replace(
    settingUse,
    '${ARC_RULES_BLOCK}\n\n${SETTING_BLOCK}\n\n${NPC_BLOCK}'
  );
  s = beforeSonnet + sonnet;
  changed = true;
}

// Report OpenAI's ACTUAL cache accounting. [PROMPT] is only our rough block-size
// estimate; this line shows what the API really counted as cached and uncached.
const cacheLog = "      if (log) log(`[CACHE] OpenAI actual: total ${totalInput.toLocaleString()} · cached ${cached.toLocaleString()} · write ${cacheWrite.toLocaleString()} · uncached ${Math.max(0, totalInput - cached - cacheWrite).toLocaleString()}`);\n";
if (!s.includes('[CACHE] OpenAI actual:')) {
  const logAnchor = '      if (promptRecord) onPrompt({ ...promptRecord, usage });';
  if (!s.includes(logAnchor)) throw new Error('OpenAI promptRecord anchor not found');
  s = s.replace(logAnchor, cacheLog + logAnchor);
  changed = true;
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('Prompt migration applied: NPC syntax repaired and arc policy moved to stable cache.');
} else {
  console.log('Prompt cache layout already patched.');
}
