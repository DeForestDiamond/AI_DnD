const TYPES = 'acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder';

// Accept older comma-separated saves as well as the crafting "plus" format.
// Flat terms in damage are damage-only; bonus remains the enchantment to hit
// AND damage. Never infer an attack bonus from a damage expression.
export function parseWeaponDamage(value) {
  const text = String(value || '').toLowerCase().replace(/[−–]/g, '-');
  const base = [], extras = [];
  let damageBonus = 0;
  const terms = text.matchAll(/([+-]?)\s*(\d*)d\s*(\d+)|([+-])\s*(\d+)(?!\s*d)/g);
  for (const m of terms) {
    if (m[3]) {
      const count = Number(m[2] || 1), sides = Number(m[3]);
      if (count < 1 || sides < 1 || count > 10000 || sides > 1000000) continue;
      const sign = m[1] === '-' ? '-' : '';
      const dice = sign + count + 'd' + sides;
      const tail = text.slice(m.index + m[0].length);
      const type = tail.match(new RegExp('^\\s*(' + TYPES + ')\\b'))?.[1];
      if (type && base.length) extras.push({ dice, type });
      else base.push(dice);
    } else damageBonus += (m[4] === '-' ? -1 : 1) * Number(m[5]);
  }
  return { damage:base.join('+').replace(/\+-/g, '-') || '0d1', damageBonus, extras };
}

export function normalizeWeaponDamage(weapon) {
  const parsed = parseWeaponDamage(weapon.damage);
  const extras = [...parsed.extras];
  for (const extra of weapon.extras || []) {
    // Avoid rolling the same component twice when a save stores both forms.
    if (!extras.some(e => e.dice === extra.dice && e.type === extra.type)) extras.push(extra);
  }
  return { ...weapon, damage:parsed.damage,
    damageBonus:(Number(weapon.damageBonus) || 0) + parsed.damageBonus, extras };
}
