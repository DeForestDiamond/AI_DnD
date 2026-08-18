import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

// This patch is intentionally idempotent. It exists so the deployed/dev build
// gets the corrected prompt layout even when repository write tooling cannot
// safely replace the very large useGame.js file directly.
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
  if (policy.includes('`') || policy.includes('${')) throw new Error('arc policy contains unexpected template syntax');

  // The old wording says "above" because the policy used to sit immediately
  // after the dynamic antagonist. It now lives in the stable rules block.
  policy = policy
    .replaceAll('The antagonist above', 'The antagonist named in CURRENT STATE')
    .replaceAll('the antagonist above', 'the antagonist named in CURRENT STATE');

  s = s.slice(0, innerStart) + dynamicArc + s.slice(innerEnd);

  const settingDecl = '// ── Shared setting/geography (both models)';
  const settingAt = s.indexOf(settingDecl);
  if (settingAt < 0) throw new Error('setting declaration anchor not found');
  const arcBlock = `// ── Shared arc policy (stable; antagonist/location stay dynamic) ───────────────\nconst ARC_RULES_BLOCK = \`── ACTIVE ARC RULES (apply whenever CURRENT STATE names an active antagonist) ──\nThe active antagonist and arc location themselves are supplied in CURRENT STATE each turn.\n${policy}\`;\n\n`;
  s = s.slice(0, settingAt) + arcBlock + s.slice(settingAt);

  const sonnetStart = s.indexOf('// ── System Prompt — Sonnet');
  if (sonnetStart < 0) throw new Error('Sonnet prompt anchor not found');
  const beforeSonnet = s.slice(0, sonnetStart);
  let sonnet = s.slice(sonnetStart);
  const settingUse = '${SETTING_BLOCK}\\n\\n${NPC_BLOCK}';
  if (!sonnet.includes(settingUse)) throw new Error('Sonnet setting/NPC insertion point not found');
  sonnet = sonnet.replace(settingUse, '${ARC_RULES_BLOCK}\\n\\n${SETTING_BLOCK}\\n\\n${NPC_BLOCK}');
  s = beforeSonnet + sonnet;
  changed = true;
}

// Sonnet/GPT currently append two completely static rule sections to the
// volatile CURRENT STATE tail. Move them into staticPart so they cache too.
const dynamicAnchor = "  const dynamicPart = `── CURRENT STATE (changes every message) ──\n${cb.dynamicPart}\n\nHOOKS — ARC OR NO ARC:";
if (s.includes(dynamicAnchor)) {
  const sonnetStart = s.indexOf('// ── System Prompt — Sonnet');
  const dynStart = s.indexOf('  const dynamicPart = `── CURRENT STATE (changes every message) ──', sonnetStart);
  if (dynStart < 0) throw new Error('Sonnet dynamicPart not found');
  const dynTemplateStart = s.indexOf('`', dynStart) + 1;
  const dynEnd = s.indexOf('`;\n\n  return { static: staticPart', dynTemplateStart);
  if (dynEnd < 0) throw new Error('Sonnet dynamicPart end not found');
  const dynamicBody = s.slice(dynTemplateStart, dynEnd);
  const splitMarker = '\n\nHOOKS — ARC OR NO ARC:';
  const splitAt = dynamicBody.indexOf(splitMarker);
  if (splitAt < 0) throw new Error('Sonnet static-tail split marker not found');
  const stateOnly = dynamicBody.slice(0, splitAt);
  const tailRules = dynamicBody.slice(splitAt + 2); // drop only the blank line

  // Insert the rules just before the closing backtick of staticPart.
  const staticClose = s.lastIndexOf('`;\n\n  const gearBlock = cb.gearBlock;', dynStart);
  if (staticClose < 0) throw new Error('Sonnet staticPart close not found');
  s = s.slice(0, staticClose) + `\n\n${tailRules}` + s.slice(staticClose);

  // dynStart shifted by the insertion, so find it again.
  const newDynStart = s.indexOf('  const dynamicPart = `── CURRENT STATE (changes every message) ──', sonnetStart);
  const newDynTemplateStart = s.indexOf('`', newDynStart) + 1;
  const newDynEnd = s.indexOf('`;\n\n  return { static: staticPart', newDynTemplateStart);
  s = s.slice(0, newDynTemplateStart) + stateOnly + s.slice(newDynEnd);
  changed = true;
}

// The existing [PROMPT] line is an estimated layout. Add the API's real cache
// accounting so debugging shows what OpenAI actually billed as cached/fresh.
const cacheLog = "      if (log) log(`[CACHE] OpenAI actual: total ${totalInput.toLocaleString()} · cached ${cached.toLocaleString()} · write ${cacheWrite.toLocaleString()} · uncached ${Math.max(0, totalInput - cached - cacheWrite).toLocaleString()}`);\n";
if (!s.includes('[CACHE] OpenAI actual:')) {
  const logAnchor = '      if (promptRecord) onPrompt({ ...promptRecord, usage });';
  if (!s.includes(logAnchor)) throw new Error('OpenAI promptRecord anchor not found');
  s = s.replace(logAnchor, cacheLog + logAnchor);
  changed = true;
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('Prompt cache layout patched: static arc/rule policy moved out of volatile state.');
} else {
  console.log('Prompt cache layout already patched.');
}
