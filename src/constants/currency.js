// ── Currency ────────────────────────────────────────────────────────────────
// All money is stored as ONE integer: total value in COPPER (char.coins).
// Denominations are parsing/display fiction over that number, so change-making
// is automatic: 1gp − 5sp is just 100 − 50 = 50 (= 5sp). 5e rates:
//   1pp = 10gp = 100sp = 1000cp
export const COIN_VALUES = { pp: 1000, gp: 100, sp: 10, cp: 1 };

// Parse a coin amount string into signed copper.
// Accepts: "10" (bare = gold), "-5sp", "+2pp", "3gp 5sp", "-1gp 5sp" (sign
// carries across following unsigned tokens: "-1gp 5sp" = −150cp).
export const parseCoinAmount = (raw) => {
  let total = 0;
  let lastSign = 1;
  const tokens = [...String(raw).matchAll(/([+-]?)\s*(\d+)\s*(pp|gp|sp|cp)?/gi)];
  for (const [, sign, num, denom] of tokens) {
    if (sign) lastSign = sign === '-' ? -1 : 1;
    total += lastSign * parseInt(num, 10) * COIN_VALUES[(denom || 'gp').toLowerCase()];
  }
  return total;
};

// Display total copper as a gp-primary string: "12gp 3sp 4cp" (zero parts
// omitted; "0gp" when broke). Platinum is accepted on input but displayed
// folded into gold — players and the DM think in gold.
export const coinsToString = (coins) => {
  const c = Math.max(0, Math.floor(coins || 0));
  const gp = Math.floor(c / 100);
  const sp = Math.floor((c % 100) / 10);
  const cp = c % 10;
  const parts = [];
  if (gp) parts.push(`${gp}gp`);
  if (sp) parts.push(`${sp}sp`);
  if (cp) parts.push(`${cp}cp`);
  return parts.length ? parts.join(' ') : '0gp';
};
