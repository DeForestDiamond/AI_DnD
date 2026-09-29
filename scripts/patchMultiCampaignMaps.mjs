import fs from 'node:fs';

const MAX_MAPS = 4;

function helperSource(provider) {
  const cap = provider === 'openai' ? 'OpenAi' : 'Xai';
  const label = provider === 'openai' ? 'GPT' : 'Grok';
  const apiHost = provider === 'openai' ? 'api.openai.com/v1/responses' : 'api.x.ai/v1/responses';
  const oldKey = provider === 'openai'
    ? 'ai-dnd-persistent-campaign-map-v1'
    : 'ai-dnd-persistent-campaign-map-xai-v1';
  const newKey = oldKey.replace('-v1', '-v2');
  const endBreakpoint = provider === 'openai'
    ? ", prompt_cache_breakpoint: { mode: 'explicit' }"
    : '';

  return `// Image transport for ${label} models.\n//\n// One-turn screenshots are consumed by the next request. Up to four persistent\n// campaign maps are reused on every turn and inserted together before changing\n// conversation history so they remain a stable visual/cache prefix.\n\nlet pendingImage = null;\nlet persistentMaps = [];\nlet persistentMapsLoaded = false;\nlet interceptorInstalled = false;\nlet originalFetch = null;\n\nconst MAX_AGE_MS = 5 * 60 * 1000;\nconst MAX_MAPS = ${MAX_MAPS};\nconst MAP_STORAGE_KEY = '${newKey}';\nconst LEGACY_MAP_STORAGE_KEY = '${oldKey}';\nconst MAX_STORED_DATA_URL_CHARS = 3_500_000;\n\nexport const setPending${cap}Image = ({ dataUrl, name = 'screenshot' }) => {\n  pendingImage = dataUrl ? { dataUrl, name, createdAt: Date.now() } : null;\n};\nexport const clearPending${cap}Image = () => { pendingImage = null; };\nexport const hasPending${cap}Image = () => Boolean(pendingImage && (Date.now() - pendingImage.createdAt) < MAX_AGE_MS);\n\nconst cleanMaps = maps => (Array.isArray(maps) ? maps : maps ? [maps] : [])\n  .filter(m => m?.dataUrl)\n  .slice(0, MAX_MAPS)\n  .map((m, i) => ({ dataUrl:m.dataUrl, name:m.name || \`campaign map \${i + 1}\` }));\n\nconst persistMaps = () => {\n  if (typeof window === 'undefined') return;\n  try {\n    const totalChars = persistentMaps.reduce((sum, m) => sum + (m.dataUrl?.length || 0), 0);\n    if (!persistentMaps.length) {\n      window.sessionStorage?.removeItem(MAP_STORAGE_KEY);\n      window.sessionStorage?.removeItem(LEGACY_MAP_STORAGE_KEY);\n    } else if (totalChars <= MAX_STORED_DATA_URL_CHARS) {\n      window.sessionStorage?.setItem(MAP_STORAGE_KEY, JSON.stringify(persistentMaps));\n      window.sessionStorage?.removeItem(LEGACY_MAP_STORAGE_KEY);\n    } else {\n      window.sessionStorage?.removeItem(MAP_STORAGE_KEY);\n    }\n  } catch (err) {\n    console.warn('[MAP] Campaign maps are active in memory but could not be cached in browser storage:', err);\n  }\n};\n\nconst loadPersistentMaps = () => {\n  if (persistentMapsLoaded) return persistentMaps;\n  persistentMapsLoaded = true;\n  if (typeof window === 'undefined') return persistentMaps;\n  try {\n    const raw = window.sessionStorage?.getItem(MAP_STORAGE_KEY);\n    if (raw) {\n      persistentMaps = cleanMaps(JSON.parse(raw));\n      return persistentMaps;\n    }\n    const legacyRaw = window.sessionStorage?.getItem(LEGACY_MAP_STORAGE_KEY);\n    if (legacyRaw) {\n      persistentMaps = cleanMaps(JSON.parse(legacyRaw));\n      persistMaps();\n    }\n  } catch (err) {\n    console.warn('[MAP] Could not restore persistent campaign maps:', err);\n  }\n  return persistentMaps;\n};\n\nexport const setPersistent${cap}Maps = maps => {\n  persistentMapsLoaded = true;\n  persistentMaps = cleanMaps(maps);\n  persistMaps();\n};\nexport const setPersistent${cap}Map = map => setPersistent${cap}Maps(map ? [map] : []);\nexport const clearPersistent${cap}Map = () => setPersistent${cap}Maps([]);\nexport const getPersistent${cap}Maps = () => loadPersistentMaps();\nexport const getPersistent${cap}Map = () => loadPersistentMaps()[0] || null;\nexport const hasPersistent${cap}Map = () => loadPersistentMaps().length > 0;\n\nconst isResponsesRequest = input => {\n  const url = typeof input === 'string' ? input : input?.url;\n  return typeof url === 'string' && url.includes('${apiHost}');\n};\n\nconst injectTurnImage = (body, image) => {\n  if (!body || !Array.isArray(body.input) || !image?.dataUrl) return body;\n  let target = null;\n  for (let i = body.input.length - 1; i >= 0; i -= 1) {\n    const item = body.input[i];\n    if (item?.type === 'message' && item?.role === 'user') { target = item; break; }\n  }\n  if (!target) return body;\n  const existing = Array.isArray(target.content)\n    ? target.content\n    : [{ type:'input_text', text:String(target.content || '') }];\n  target.content = [\n    ...existing,\n    { type:'input_text', text:'\\n\\n[PLAYER-SUPPLIED VISUAL REFERENCE — IMPORTANT: Inspect the attached image directly. For visible geography, roads, labels, routes, room layouts, symbols, diagrams, or other concrete visual facts, treat the supplied image and the player\\'s explicit description as authoritative over assumptions from memory. Do not argue with the player based on remembered geography when the supplied visual evidence shows otherwise.]' },\n    { type:'input_image', image_url:image.dataUrl, detail:'high' },\n  ];\n  return body;\n};\n\nconst injectPersistentMaps = (body, maps) => {\n  if (!body || !Array.isArray(body.input) || !maps?.length) return body;\n  const developerIdx = body.input.findIndex(item => item?.type === 'message' && item?.role === 'developer');\n  const insertAt = developerIdx >= 0 ? developerIdx + 1 : 0;\n  const content = [{\n    type:'input_text',\n    text:\`[PERSISTENT CAMPAIGN MAPS — \${maps.length} ACTIVE]\\nThese maps are authoritative visual references for visible geography, roads, routes, labels, settlements, borders, and relative positions. Treat them as complementary pieces when they cover different regions. Inspect the relevant map directly whenever those facts matter. If remembered geography conflicts with a supplied map or the player's explicit route description, use the supplied visual/player description.\`\n  }];\n  maps.forEach((map, i) => {\n    content.push({ type:'input_text', text:\`[MAP \${i + 1}: \${map.name || \`campaign map \${i + 1}\`}]\` });\n    content.push({ type:'input_image', image_url:map.dataUrl, detail:'high' });\n  });\n  content.push({ type:'input_text', text:'[END PERSISTENT CAMPAIGN MAPS]'${endBreakpoint} });\n  body.input.splice(insertAt, 0, { type:'message', role:'user', content });\n  return body;\n};\n\nexport const install${cap}ImageInterceptor = () => {\n  if (interceptorInstalled || typeof window === 'undefined' || typeof window.fetch !== 'function') return;\n  interceptorInstalled = true;\n  originalFetch = window.fetch.bind(window);\n  window.fetch = async (input, init = {}) => {\n    if (!isResponsesRequest(input) || typeof init?.body !== 'string') {\n      if (pendingImage && !hasPending${cap}Image()) pendingImage = null;\n      return originalFetch(input, init);\n    }\n    const maps = loadPersistentMaps();\n    const hasTurnImage = hasPending${cap}Image();\n    if (!maps.length && !hasTurnImage) return originalFetch(input, init);\n    const image = hasTurnImage ? pendingImage : null;\n    if (image) pendingImage = null;\n    try {\n      const parsed = JSON.parse(init.body);\n      if (maps.length) injectPersistentMaps(parsed, maps);\n      if (image) injectTurnImage(parsed, image);\n      return originalFetch(input, { ...init, body:JSON.stringify(parsed) });\n    } catch (err) {\n      console.warn('[IMAGE] Could not inject visual reference into ${provider === 'openai' ? 'OpenAI' : 'xAI'} request:', err);\n      return originalFetch(input, init);\n    }\n  };\n};\n`;
}

fs.writeFileSync('src/helpers/openai/pendingImage.js', helperSource('openai'));
fs.writeFileSync('src/helpers/xai/pendingImage.js', helperSource('xai'));

const controlsPath = 'src/components/sidebar/settings/Controls.jsx';
let controls = fs.readFileSync(controlsPath, 'utf8');
const marker = '// ── Voice settings: pick an installed TTS voice + speaking speed ──────────────';
const markerIndex = controls.indexOf(marker);
if (markerIndex < 0) throw new Error('Campaign map patch marker not found in Controls.jsx');

const newTop = `import { useRef, useState } from 'react';
import { colors, fonts, btn } from '../../../styles/theme.js';
import { CollapsibleSection, npcInput } from '../common/index.jsx';
import { getPersistentOpenAiMaps, setPersistentOpenAiMaps } from '../../../helpers/openai/pendingImage.js';
import { setPersistentXaiMaps } from '../../../helpers/xai/pendingImage.js';

const MAX_CAMPAIGN_MAPS = 4;

export function CampaignMapSettings() {
  const [campaignMaps, setCampaignMaps] = useState(() => getPersistentOpenAiMaps());
  const fileRef = useRef(null);

  const syncMaps = (next) => {
    const capped = next.slice(0, MAX_CAMPAIGN_MAPS);
    setCampaignMaps(capped);
    setPersistentOpenAiMaps(capped);
    setPersistentXaiMaps(capped);
  };

  const handlePick = (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    const room = MAX_CAMPAIGN_MAPS - campaignMaps.length;
    if (!files.length || room <= 0) return;
    const chosen = files.filter(f => f.type?.startsWith('image/')).slice(0, room);
    const tooLarge = chosen.find(f => f.size > 10 * 1024 * 1024);
    if (tooLarge) {
      alert(\`${'${tooLarge.name}'} is over 10 MB. Crop or resize it and try again.\`);
      return;
    }
    Promise.all(chosen.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string'
        ? { name:file.name || 'campaign map', dataUrl:reader.result }
        : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    }))).then(loaded => syncMaps([...campaignMaps, ...loaded.filter(Boolean)]));
  };

  const removeMap = (index) => {
    const map = campaignMaps[index];
    if (!window.confirm(\`Remove ${'${map?.name || \'this campaign map\'}'}?\`)) return;
    syncMaps(campaignMaps.filter((_, i) => i !== index));
  };

  const clearMaps = () => {
    if (!window.confirm('Clear all persistent campaign maps?')) return;
    syncMaps([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <CollapsibleSection title="🗺️ CAMPAIGN MAPS" count={campaignMaps.length ? \`${'${campaignMaps.length}'}/${'${MAX_CAMPAIGN_MAPS}'}\` : undefined} defaultOpen={false}>
      <div style={{fontSize:10,color:colors.textFaint,marginBottom:7,lineHeight:1.45}}>
        Up to four persistent visual references for GPT Terra / Sol and Grok. Maps are sent together before changing conversation history so the stable visual context can benefit from prompt caching. They are not written into campaign saves or summaries.
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePick} style={{display:'none'}} />
      {campaignMaps.map((map, index) => (
        <div key={\`${'${map.name}'}-${'${index}'}\`} style={{display:'flex',alignItems:'center',gap:8,padding:7,border:\`1px solid ${'${colors.borderDim}'}\`,borderRadius:4,background:'rgba(201,168,76,0.05)',marginBottom:6}}>
          <img src={map.dataUrl} alt={\`Campaign map ${'${index + 1}'}\`} style={{width:64,height:48,objectFit:'cover',borderRadius:3,border:\`1px solid ${'${colors.borderDim}'}\`}} />
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontSize:10,color:colors.gold,fontFamily:fonts.display,letterSpacing:1}}>MAP {index + 1} · ACTIVE / CACHED</div>
            <div style={{fontSize:10,color:colors.textGhost,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{map.name}</div>
          </div>
          <button onClick={()=>removeMap(index)} title="Remove map" style={{...btn(false),fontSize:10,padding:'4px 7px',color:'#c96a4c'}}>✕</button>
        </div>
      ))}
      <div style={{display:'flex',gap:6,marginTop:7}}>
        <button onClick={()=>fileRef.current?.click()} disabled={campaignMaps.length >= MAX_CAMPAIGN_MAPS}
          style={{...btn(false),flex:1,fontSize:10,padding:'5px 0',opacity:campaignMaps.length >= MAX_CAMPAIGN_MAPS ? 0.4 : 1}}>
          🗺️ {campaignMaps.length ? 'Add Map' : 'Set Campaign Map'}
        </button>
        {campaignMaps.length > 1 && <button onClick={clearMaps} style={{...btn(false),flex:1,fontSize:10,padding:'5px 0',color:'#c96a4c'}}>✕ Clear All</button>}
      </div>
      {campaignMaps.length >= MAX_CAMPAIGN_MAPS && <div style={{fontSize:9,color:colors.textDead,marginTop:5}}>Maximum of four active campaign maps.</div>}
    </CollapsibleSection>
  );
}

`;

controls = newTop + controls.slice(markerIndex);
fs.writeFileSync(controlsPath, controls);
console.log('Applied multi-campaign-map patch.');
