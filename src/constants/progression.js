// XP needed to reach each level (index = level)
// Tuned for ~500-1000 XP per major arc — expect 1-2 levels per arc at low levels,
// and meaningful progress at high levels without grinding.
export const XP_THRESHOLDS = [
  0,      // 0  (unused)
  0,      // 1  (starting level)
  200,    // 2
  500,    // 3
  900,    // 4
  1400,   // 5
  2000,   // 6
  2700,   // 7
  3500,   // 8
  4400,   // 9
  5400,   // 10
  6500,   // 11
  7700,   // 12
  9000,   // 13
  10500,  // 14
  12000,  // 15
  13700,  // 16
  15500,  // 17
  17500,  // 18
  19500,  // 19
  22000,  // 20
  25000,  // 21
  28000,  // 22
  31500,  // 23
  35000,  // 24
  39000,  // 25
  43000,  // 26
  47500,  // 27
  52000,  // 28
  57000,  // 29
  62000,  // 30
  67500,  // 31
  73500,  // 32
  80000,  // 33
  87000,  // 34
  94500,  // 35
  102500, // 36
  111000, // 37
  120000, // 38
  129500, // 39
  139500, // 40
  150000, // 41
  161000, // 42
  172500, // 43
  184500, // 44
  197000, // 45
  210000, // 46
  223500, // 47
  237500, // 48
  252000, // 49
  267000, // 50
];

// HP gained per level up (before CON modifier) per class
export const HP_PER_LEVEL = { Paladin:6, Ranger:6, Fighter:6, Wizard:4, Rogue:5, Cleric:5, Artificer:5, Illrigger:6, Monk:5, Barbarian:7, Warlock:5, 'Blood Hunter':5, Sorcerer:4, Druid:5 };

// HP at level 1 (before CON modifier) per class
export const HP_BASE = { Paladin:10, Ranger:10, Fighter:10, Wizard:6, Rogue:8, Cleric:8, Artificer:8, Illrigger:10, Monk:8, Barbarian:12, Warlock:8, 'Blood Hunter':8, Sorcerer:6, Druid:8 };

export const SAVE_VERSION = 11;
