// Compact inventory/stash storage. One entry represents every identical copy of
// a named item in that location: { name: 'Iron Ingot', qty: 300000 }.
// Item definitions live separately in character.items; stacks only track where
// copies are and how many exist.

const cleanQty = (qty) => Math.max(0, Math.floor(Number(qty) || 0));

export const normalizeStacks = (value) => {
  const out = [];
  const index = new Map();
  const add = (name, qty) => {
    const n = String(name ?? '').trim();
    const q = cleanQty(qty);
    if (!n || q <= 0) return;
    const key = n.toLowerCase();
    const at = index.get(key);
    if (at !== undefined) out[at] = { ...out[at], qty: out[at].qty + q };
    else { index.set(key, out.length); out.push({ name:n, qty:q }); }
  };

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string') add(entry, 1);                // legacy in-memory form
      else if (entry && typeof entry === 'object') add(entry.name, entry.qty ?? 1);
    }
  } else if (value && typeof value === 'object') {
    // Legacy save compression: { "Iron Ingot": 300000 }
    for (const [name, qty] of Object.entries(value)) add(name, qty);
  }
  return out;
};

export const stackCount = (stacks, name) => {
  const key = String(name ?? '').toLowerCase();
  const found = normalizeStacks(stacks).find(s => s.name.toLowerCase() === key);
  return found?.qty || 0;
};

export const stackHas = (stacks, name) => stackCount(stacks, name) > 0;

export const stackCounts = (stacks) => Object.fromEntries(
  normalizeStacks(stacks).map(({ name, qty }) => [name, qty])
);

export const addStack = (stacks, name, qty = 1) => {
  const list = normalizeStacks(stacks);
  const q = cleanQty(qty);
  if (q <= 0 || !String(name ?? '').trim()) return list;
  const key = String(name).toLowerCase();
  const idx = list.findIndex(s => s.name.toLowerCase() === key);
  if (idx === -1) return [...list, { name:String(name).trim(), qty:q }];
  return list.map((s, i) => i === idx ? { ...s, qty:s.qty + q } : s);
};

// Returns the new stack list plus the number actually removed.
export const takeStack = (stacks, name, qty = 1) => {
  const list = normalizeStacks(stacks);
  const q = cleanQty(qty);
  const key = String(name ?? '').toLowerCase();
  const idx = list.findIndex(s => s.name.toLowerCase() === key);
  if (idx === -1 || q <= 0) return { stacks:list, removed:0 };
  const removed = Math.min(q, list[idx].qty);
  const left = list[idx].qty - removed;
  return {
    stacks: left > 0
      ? list.map((s, i) => i === idx ? { ...s, qty:left } : s)
      : list.filter((_, i) => i !== idx),
    removed,
  };
};

export const takeAllStack = (stacks, name) => takeStack(stacks, name, Number.MAX_SAFE_INTEGER);

export const renameStack = (stacks, from, to) => {
  const sourceKey = String(from ?? '').toLowerCase();
  const target = String(to ?? '').trim();
  if (!sourceKey || !target) return normalizeStacks(stacks);
  const list = normalizeStacks(stacks);
  const source = list.find(s => s.name.toLowerCase() === sourceKey);
  if (!source) return list;
  const without = list.filter(s => s.name.toLowerCase() !== sourceKey);
  return addStack(without, target, source.qty);
};

export const stackNames = (stacks) => normalizeStacks(stacks).map(s => s.name);
