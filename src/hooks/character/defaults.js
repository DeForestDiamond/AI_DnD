import { EMPTY_SLOTS } from '../../constants/items.js';
import { SAVE_VERSION } from '../../constants/progression.js';

// -- Empty character ------------------------------------------------------------
export const EMPTY_CHAR = {
  _v: SAVE_VERSION,
  name:'', race:null, cls:null, deity:null,
  hp:0, maxHp:0, stats:{},
  level:1, xp:0,
  classLevels: {},
  subclasses: {},
  slots:{ ...EMPTY_SLOTS },
  inventory:[], stash:[], coins:1000, bankedCoins:0, environment:'wilderness', defeatedAntagonists:[],
  disposition: { alignment:'', cares:'', indifferent:'', methods:'', lines:'' },
  items:{},
  contextExclusions: { companions:{}, npcs:{}, towns:{} },
  bio: '',
  appearance: '',
  directives: '',
  currentLocation: '',
  companions: {},
  npcs: {},
  towns: {},
  abilities: {
    cantrips: [],
    spells: [],
    infusions: [],
  },
};

// Companion slot types
export const COMPANION_SLOT_DEFS = {
  humanoid: ['mainhand','offhand','armor','head','neck','cloak','hands','ring1','feet'],
  wolf:     ['neck','armor'],
};

export const emptyCompanionSlots = (type = 'humanoid') =>
  Object.fromEntries((COMPANION_SLOT_DEFS[type] || COMPANION_SLOT_DEFS.humanoid).map(s => [s, null]));

