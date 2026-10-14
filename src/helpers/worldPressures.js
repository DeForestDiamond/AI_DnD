// A narrative ledger, not a turn-count timer. The DM advances it using game time.
export const applyWorldPressures = (text, existing = {}) => {
  const pressures = Object.fromEntries(Object.entries(existing || {}).filter(([, p]) => p && typeof p === 'object' && !Array.isArray(p)));
  for (const match of String(text || '').matchAll(/\[(PRESSURE|PRESSURE END):\s*([^\]]+)\]/gi)) {
    const parts = match[2].split('|').map(s => s.trim());
    const id = parts[0];
    if (!/^[a-z0-9_-]{1,64}$/i.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id.toLowerCase())) continue;
    if (match[1].toUpperCase() === 'PRESSURE END') {
      if (parts.length === 1) delete pressures[id];
    } else if (parts.length === 4 && parts.every(Boolean)) {
      pressures[id] = { current: parts[1], next: parts[2], timing: parts[3] };
    }
  }
  return pressures;
};

export const worldPressureContext = (char) => {
  const entries = Object.entries(char?.worldPressures || {}).filter(([, p]) => p && typeof p.current === 'string' && typeof p.next === 'string' && typeof p.timing === 'string');
  if (!entries.length) return '';
  return '\nONGOING WORLD PRESSURES (DM MEMORY; plans are not completed outcomes):\n' + entries.map(([id, p]) => JSON.stringify({ id, ...p })).join('\n');
};
