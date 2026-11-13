// Select only declared hands. Merely equipping a second weapon does not grant
// an attack with it; ambiguous attacks retain the existing main-hand default.
export function declaredAttackHands(text, char) {
  const action=String(text || '').toLowerCase();
  const main=/\bmain[- ]?hand\b/.test(action);
  const off=/\boff[- ]?hand\b/.test(action);
  const both=/\bboth (?:weapons|hands|blades|swords|daggers|pistols|axes)\b|\b(?:dual[- ]wield(?:ing)?|two[- ]weapon) (?:attack|strike)\b/.test(action);
  const mainName=char.slots?.mainhand?.toLowerCase();
  const offName=char.slots?.offhand?.toLowerCase();
  const namesDiffer=mainName && offName && mainName!==offName;
  const namedMain=namesDiffer && action.includes(mainName);
  const namedOff=namesDiffer && action.includes(offName);
  if(both || (main && off) || (namedMain && namedOff)) return ['mainhand','offhand'];
  if(off || (namedOff && !namedMain)) return ['offhand'];
  return ['mainhand'];
}
