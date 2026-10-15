// The UI lists each spell once; saves still keep the two existing allowances.
export const normalizeSpellSelections = abilities => {
  const spells = [...new Set(abilities.spells || [])];
  const magicalSecrets = [...new Set(abilities.magicalSecrets || [])].filter(name => !spells.includes(name));
  return { ...abilities, spells, magicalSecrets };
};

export const spellChoice = (selected, name, available, totals, grantedNames = new Set()) => {
  const source = selected.spells.includes(name) ? 'spells' : selected.magicalSecrets.includes(name) ? 'magicalSecrets' : null;
  const classEligible = available.spells.has(name);
  const secretEligible = available.magicalSecrets.has(name) && totals.magicalSecrets > 0;
  const classCount = selected.spells.filter(spell => !grantedNames.has(spell)).length;
  return {
    source, classEligible, secretEligible,
    canUseClass: classEligible && (grantedNames.has(name) || classCount < totals.spells),
    canUseSecret: secretEligible && selected.magicalSecrets.length < totals.magicalSecrets,
  };
};

export const toggleSpellChoice = (selected, name, available, totals, grantedNames) => {
  const choice = spellChoice(selected, name, available, totals, grantedNames);
  if (choice.source) return { ...selected, spells:selected.spells.filter(n=>n!==name), magicalSecrets:selected.magicalSecrets.filter(n=>n!==name) };
  const source = choice.canUseClass ? 'spells' : choice.canUseSecret ? 'magicalSecrets' : null;
  return source ? { ...selected, [source]:[...selected[source],name] } : selected;
};

export const switchSpellSource = (selected, name, available, totals, grantedNames) => {
  const choice = spellChoice(selected, name, available, totals, grantedNames);
  const target = choice.source === 'spells' && choice.canUseSecret ? 'magicalSecrets'
    : choice.source === 'magicalSecrets' && choice.canUseClass ? 'spells' : null;
  if (!target) return selected;
  return { ...selected, [choice.source]:selected[choice.source].filter(n=>n!==name), [target]:[...selected[target],name] };
};
