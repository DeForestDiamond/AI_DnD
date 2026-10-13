import { rollAntagonist } from '../../constants/encounters/antagonists.js';
import { makeArc, FAERUN_LOCATION_POOLS } from '../../constants/encounters/arcLocations.js';

export const rollAdventureSeed = (level = 1, { antagonist = null, arcLocation = null, defeated = [], continuous = false, openScale = false } = {}) => {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const settings = [
    'a busy coastal port city', 'a sprawling inland trade city', 'a remote mountain fortress',
    'a dense ancient forest', 'a vast open grassland', 'a scorching desert town',
    'a frozen northern settlement', 'a swamp village on stilts', 'a noble estate in the countryside',
    'a thieves guild underground beneath a city', 'a moving merchant caravan on the road',
    'a remote island', 'an active volcano region', 'a halfling shire', 'a dwarven mine complex',
    'a riverside mill town', 'a university city of mages', 'a border garrison town',
    'a pilgrimage road to a holy site', 'a floating market on a great river', 'a logging camp at the forest edge',
    'a ruined city slowly being resettled', 'a hot-spring resort town', 'a hillside monastery',
    'a canyon settlement carved into the cliffs', 'a windswept fishing village', 'a lonely crossroads trading post',
  ];
  const times = [
    'early morning just after dawn', 'midday under a bright sun', 'a warm afternoon',
    'golden hour just before sunset', 'early evening as lanterns are lit', 'late night',
    'the small hours before dawn', 'a grey, indeterminate hour',
  ];
  const weathers = [
    'clear and sunny', 'warm with a light breeze', 'overcast but dry', 'light rain',
    'a sudden thunderstorm rolling in', 'thick morning fog', 'crisp and cold', 'sweltering heat',
    'a beautiful spring day with wildflowers', 'heavy snow', 'gusty and windy',
    'humid and still before a storm', 'a fine drizzle', 'unseasonable warmth', 'the first frost of the season',
  ];
  const tones = [
    'lighthearted and fun', 'gritty and grounded', 'tense and political', 'dark fantasy with tangible local danger',
    'comedic with real stakes', 'action-packed from the start', 'slow burn intrigue',
    'warm and hopeful', 'eerie and unsettling, with menace that can become real', 'bittersweet', 'rowdy and chaotic',
    'somber and reflective',
  ];
  const hooks = [
    'a job offer from a stranger', 'something valuable has been stolen', 'an old enemy resurfaces',
    'a local problem nobody else will deal with', 'a competition or tournament',
    'a merchant needs an escort', 'someone is missing', 'a strange creature has been spotted',
    'a noble needs a discreet service', 'a dungeon entrance has been discovered nearby',
    'a heist opportunity', 'a festival goes wrong', 'a bounty posted on a dangerous target',
    'a shipment of contraband intercepted', 'a monster terrorising the area',
    'a debt the player owes comes due', 'two factions each want the player on their side',
    'a child or stray animal leads the player somewhere', 'the player witnesses a crime in progress',
    'a map or sealed letter falls into the player\'s hands', 'a dying stranger leaves the player something',
    'the player is mistaken for someone important', 'a local rite or ritual needs an outsider',
    'the player\'s lodging, ship, or transport falls through', 'a wager or game of chance with real stakes',
    'someone calls in an old favor', 'the wagon or ship the player is travelling on stops unexpectedly',
  ];
  const openingStyles = [
    'an external event begins at first contact (a pursuit approaches, a confrontation erupts, or a task goes wrong nearby); stop before deciding the player reacts',
    'open on dialogue: someone is already mid-sentence talking to the player as the scene begins',
    'a quiet, grounded moment (eating, resting, mending gear, working) that gets interrupted',
    'the player has just arrived somewhere new and is taking it in',
    'the immediate aftermath of something that already happened (a fight just ended, a deal collapsed, a storm just broke)',
    'a discovery: the player stumbles onto something they did not expect',
    'an ordinary activity nearby is interrupted; do not assume the player accepted a task or made a decision',
    'a tense standoff or confrontation already underway',
    'a calm, atmospheric establishing beat before anything happens',
  ];
  const wildcards = [
    'an unusual local custom or small festival happening right now',
    'a memorable, eccentric NPC who inserts themselves into the scene',
    'an odd sensory detail that sets this place apart (a strange smell, sound, or sight)',
    'a juicy piece of local gossip or rumour overheard nearby',
    'an animal or common creature behaving strangely',
    'a recent local event everyone is still talking about',
    'an eye-catching object, sign, or notice',
    'an unusual but harmless natural phenomenon',
    'a stranger who seems to mistake the player for someone else',
    'a minor mishap or inconvenience the player is already dealing with',
    'a street performance, market hawker, or impromptu crowd',
    'no wildcard — keep this one clean and straightforward',
  ];
  const locations = [
    'a crowded market', 'a dockside tavern', 'a crossroads inn', 'the city gates',
    'a noble\'s receiving hall', 'a back alley', 'a guildhall', 'a temple courtyard',
    'a busy harbor', 'a village square', 'a roadside camp', 'a dungeon entrance',
    'a tournament grounds', 'a prison visiting room', 'a magic shop',
    'a crowded festival', 'a riverboat deck', 'a blacksmith\'s forge', 'a library or archive',
    'a stable yard', 'a steaming bathhouse', 'a graveyard at dusk', 'a bridge over a gorge',
    'a farmhouse kitchen', 'a watchtower on the wall', 'a caravanserai', 'a ferry crossing',
  ];

  const scope =
    level <= 4  ? 'LOW-LEVEL, LOCAL STORY. The stakes are small and immediate — one village, caravan, road, farm, or neighbourhood. The hook is exactly what it appears to be. The antagonist wants something ordinary (coin, territory, revenge, fear, survival). Do NOT invent ancient evils, sealed entities, prophecies, secret bloodlines, centuries-old conspiracies, chosen-one destinies, or world-ending threats. Keep the history shallow and the danger mundane.'
    : level <= 10 ? 'REGIONAL STORY. Threats can span a town or region and involve organised factions with real plans, but nothing world-ending. Mysteries may have some depth; avoid cosmic or world-shaking stakes.'
    : level <= 16 ? 'REALM-SHAKING STORY. Powerful factions, old secrets, and large threats are appropriate; stakes can reach across a kingdom.'
    :               'LEGENDARY STORY. World-shaking and planar stakes suit a hero of this power — but the enemies themselves stay concrete: armies, dragons, archmages, fiend lords with names and agendas. Epic scale comes from the SIZE of the threat, not its age. No sealed entities, no slumbering ancients.';

  // Select the antagonist and geography together, once. The DM fits local scene
  // details to this anchor; it must not independently choose another region.
  const arc = continuous ? null : makeArc(antagonist?.trim() || rollAntagonist(level, null, defeated), arcLocation);
  const startingArea = arc?.arcLocation || pick(FAERUN_LOCATION_POOLS.general);
  if (arc) arc.localArea = startingArea;

  return {
    arc,
    startingArea,
    scope: (continuous || openScale) ? 'OPEN STORY SCALE. Scale and connections emerge from play, without a level-based story ceiling.' : scope,
    setting: pick(settings),
    time: pick(times),
    weather: pick(weathers),
    tone: pick(tones),
    hook: pick(hooks),
    antagonist: arc?.antagonist || null,
    location: pick(locations),
    openingStyle: pick(openingStyles),
    wildcard: pick(wildcards),
  };
};


