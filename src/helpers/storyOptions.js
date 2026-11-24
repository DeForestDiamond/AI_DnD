export const isContinuousStory = char => char?.storyMode === 'continuous';
// Match the active story driver: Long Story overrides saved drivers, and an
// Adventure takes precedence over stale arc data in imported/older saves.
const hasText = value => typeof value === 'string' && value.trim().length > 0;
export const isConnectedArc = arc => arc?.kind === 'connected' &&
  hasText(arc.title) && hasText(arc.centralConflict) &&
  Array.isArray(arc.members) && arc.members.length >= 2 &&
  arc.members.every(member => hasText(member?.name) && hasText(member?.role)) &&
  Array.isArray(arc.relationships) && arc.relationships.length > 0 && arc.relationships.every(hasText);
export const hasConnectedArc = char => !isContinuousStory(char) && !char?.adventure && isConnectedArc(char?.arc);
export const hasAntagonistArc = char => !isContinuousStory(char) && !char?.adventure &&
  (char?.arc?.kind === 'connected' ? isConnectedArc(char.arc) : Boolean(char?.arc?.antagonist));
export const isFullDarkFantasy = char => char?.fantasyTone === 'full-dark';
export const isCombatFirst = char => char?.combatFirst === true;
export const hasOpenStoryScale = char => isContinuousStory(char) || isFullDarkFantasy(char);

// Switching modes preserves the current driver so it can be resumed later.
export const changeStoryOptions = (char, options) => {
  const next = { ...char };
  if (options.combatFirst !== undefined) next.combatFirst = options.combatFirst === true;
  if (options.fantasyTone !== undefined) next.fantasyTone = options.fantasyTone === 'full-dark' ? 'full-dark' : 'standard';
  if (options.storyMode !== undefined) {
    next.storyMode = options.storyMode === 'continuous' ? 'continuous' : 'arcs';
    if (isContinuousStory(next) && !isContinuousStory(char)) {
      next.suspendedStoryDriver = { arc: char.arc || null, adventure: char.adventure || null };
      next.arc = null;
      delete next.adventure;
    } else if (!isContinuousStory(next) && isContinuousStory(char)) {
      const saved = char.suspendedStoryDriver;
      next.arc = saved?.arc || null;
      if (saved?.adventure) next.adventure = saved.adventure;
      delete next.suspendedStoryDriver;
    }
  }
  return next;
};
