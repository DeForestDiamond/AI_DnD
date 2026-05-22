export const colors = {
  bg:         '#0d0802',
  bgDark:     '#0a0600',
  bgPanel:    'rgba(10,7,3,0.9)',
  border:     '#3a2a10',
  borderDim:  '#2a1e0a',
  borderFaint:'#1a1208',
  gold:       '#c9a84c',
  goldDim:    '#8a6820',
  goldFaint:  '#6a5a2a',
  text:       '#f0e6c8',
  textDim:    '#e8d8b0',
  textMuted:  '#d4c080',
  textFaint:  '#c4a860',
  textGhost:  '#a89050',
  textDead:   '#907840',
  green:      '#7fc97f',
  yellow:     '#d4a84c',
  red:        '#e07070',
};

export const fonts = {
  display: "'Cinzel', serif",
  body:    "'EB Garamond', Georgia, serif",
  mono:    'monospace',
};

export const btn = (primary = true) => ({
  background:   primary ? `linear-gradient(135deg, ${colors.gold}, ${colors.goldDim})` : 'transparent',
  border:       primary ? 'none' : `1px solid #4a3820`,
  color:        primary ? colors.bg : colors.gold,
  fontFamily:   fonts.display,
  fontWeight:   primary ? 'bold' : 'normal',
  fontSize:     12,
  letterSpacing: 1,
  padding:      '8px 16px',
  borderRadius: 3,
  cursor:       'pointer',
  transition:   'all 0.2s',
});

export const panel = {
  background:   colors.bgPanel,
  border:       `1px solid ${colors.border}`,
  borderRadius: 4,
  padding:      16,
};

export const cardStyle = (selected) => ({
  background:  selected ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.02)',
  border:      `1px solid ${selected ? colors.gold : colors.borderDim}`,
  borderRadius: 6,
  padding:     14,
  cursor:      'pointer',
  transition:  'all 0.2s',
  transform:   selected ? 'scale(1.02)' : 'scale(1)',
});

export const animations = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    from { opacity: 0.4; }
    to   { opacity: 1; }
  }
  @keyframes levelUp {
    0%   { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    10%  { opacity: 1; transform: translateX(-50%) translateY(0); }
    80%  { opacity: 1; }
    100% { opacity: 0; transform: translateX(-50%) translateY(0); }
  }
  .msg-dm   { animation: fadeIn 0.4s ease; }
  .msg-user { animation: fadeIn 0.2s ease; }
`;
