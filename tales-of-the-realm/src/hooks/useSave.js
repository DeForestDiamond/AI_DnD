import { SAVE_VERSION } from '../constants/progression.js';
import { migrateCharacter } from './useCharacter.js';

const encode = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
const decode = (str) => JSON.parse(decodeURIComponent(escape(atob(str.trim()))));

export function useSave({ charRef, messages, onLoadFull, onLoadCharacter }) {

  const generateFullSave = () => {
    return encode({
      _type: 'fullsave',
      _v: SAVE_VERSION,
      character: { ...charRef.current, _v: SAVE_VERSION },
      messages,
    });
  };

  const generateCharExport = () => {
    return encode({
      _type: 'character',
      _v: SAVE_VERSION,
      character: { ...charRef.current, _v: SAVE_VERSION },
    });
  };

  const loadFromCode = (code) => {
    const state = decode(code);
    if (!state.character) throw new Error('No character data');
    const { char: migrated, notes } = migrateCharacter(state.character);
    const isFullSave = state._type === 'fullsave' || !!state.messages;
    if (isFullSave) {
      onLoadFull(migrated, state.messages || []);
    } else {
      onLoadCharacter(migrated);
    }
    return { notes, isFullSave };
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

  return { generateFullSave, generateCharExport, loadFromCode, copyToClipboard };
}
