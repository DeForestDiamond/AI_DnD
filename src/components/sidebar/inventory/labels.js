export const slotItemLabel = (name, data) => {
  if (!data) return name;
  if (data.type === 'weapon') return `${name} (${data.damage}${data.bonus ? `+${data.bonus}` : ''})`;
  if (data.type === 'armor') return `${name} (AC ${data.ac})`;
  if (data.type === 'shield') return `${name} (+${data.ac || 2}AC)`;
  if (data.type === 'focus') return `${name} [${data.label}]`;
  if (data.label) return `${name} [${data.label}]`;
  return name;
};
