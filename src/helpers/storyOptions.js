export const isContinuousStory = char => char?.storyMode === 'continuous';
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
