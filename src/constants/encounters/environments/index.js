import * as wilderness from './faerun/wilderness.js';
import * as city from './faerun/city.js';
import * as ocean from './faerun/ocean.js';
import * as underdark from './faerun/underdark.js';
import * as avernus from './nineHells/avernus.js';
import * as feywild from './feywild.js';
import * as astral from './astral.js';
import * as shadowfell from './shadowfell.js';
import * as fire from './elemental/fire.js';
import * as water from './elemental/water.js';
import * as air from './elemental/air.js';
import * as earth from './elemental/earth.js';
import * as limbo from './limbo.js';
import * as mechanus from './mechanus.js';
import * as sigil from './sigil.js';
import * as hells from './nineHells/general.js';
import * as abyss from './abyss.js';
import * as hades from './hades.js';
import * as gehenna from './gehenna.js';
import * as carceri from './carceri.js';
import * as arborea from './arborea.js';
import * as ysgard from './ysgard.js';
import * as celestia from './celestia.js';
import * as elysium from './elysium.js';
import * as ethereal from './ethereal.js';
import { hostile as faerunCommonHostile } from './faerun/common.js';

const ENV = {
  "wilderness": wilderness,
  "city": city,
  "ocean": ocean,
  "underdark": underdark,
  "avernus": avernus,
  "feywild": feywild,
  "astral": astral,
  "shadowfell": shadowfell,
  "fire": fire,
  "water": water,
  "air": air,
  "earth": earth,
  "limbo": limbo,
  "mechanus": mechanus,
  "sigil": sigil,
  "hells": hells,
  "abyss": abyss,
  "hades": hades,
  "gehenna": gehenna,
  "carceri": carceri,
  "arborea": arborea,
  "ysgard": ysgard,
  "celestia": celestia,
  "elysium": elysium,
  "ethereal": ethereal,
};

export const HOSTILE = [faerunCommonHostile, ...Object.values(ENV).map(e => e.hostile || [])].flat();
export const SOCIAL_BY_ENV = Object.fromEntries(Object.entries(ENV).map(([k,v]) => [k, v.social || []]));
export const WEIRD_BY_ENV = Object.fromEntries(Object.entries(ENV).map(([k,v]) => [k, v.weird || []]));
