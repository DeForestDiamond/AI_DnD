import { useState, Component } from 'react';
import { colors, fonts } from '../../../styles/theme.js';
import { XP_THRESHOLDS } from '../../../constants/progression.js';

export const npcInput = { width:'100%', boxSizing:'border-box', background:'rgba(0,0,0,0.4)', border:`1px solid ${colors.borderDim}`, color:colors.text, fontFamily:fonts.body, fontSize:13, padding:'6px 8px', borderRadius:4, outline:'none' };

// ── Sub-components ─────────────────────────────────────────────────────────────
export function HPBar({ current, max }) {
  const pct   = max > 0 ? Math.max(0, (current / max) * 100) : 0;
  const color = pct > 60 ? colors.green : pct > 30 ? colors.yellow : colors.red;
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontFamily:fonts.display,fontSize:12,color:colors.gold,letterSpacing:1}}>HIT POINTS</span>
        <span style={{fontFamily:fonts.mono,color,fontWeight:'bold',fontSize:12}}>{current}/{max}</span>
      </div>
      <div style={{background:colors.borderFaint,borderRadius:3,height:7,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:3,transition:'all 0.5s'}}/>
      </div>
    </div>
  );
}

export function XPBar({ xp, level }) {
  const next = XP_THRESHOLDS[Math.min(level+1, XP_THRESHOLDS.length-1)];
  const cur  = XP_THRESHOLDS[level] || 0;
  const pct  = next > cur ? Math.min(100, ((xp-cur)/(next-cur))*100) : 100;
  const max  = level >= XP_THRESHOLDS.length-1;
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
        <span style={{fontFamily:fonts.display,fontSize:13,color:colors.textGhost,letterSpacing:1}}>XP</span>
        <span style={{fontFamily:fonts.mono,color:colors.textGhost,fontSize:12}}>{xp}{max?' (max)':`/${next}`}</span>
      </div>
      <div style={{background:colors.borderFaint,borderRadius:3,height:4,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:colors.goldFaint,borderRadius:3,transition:'all 0.8s'}}/>
      </div>
    </div>
  );
}

export class PanelErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error:null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Sidebar panel render failed:', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{border:`1px solid ${colors.redFaint||'#8a3a3a'}`,borderRadius:4,padding:8,color:'#c96a4c',fontSize:11,lineHeight:1.45}}>
        <div style={{fontFamily:fonts.display,fontSize:12,marginBottom:4}}>CRAFTING PANEL ERROR</div>
        <div style={{fontFamily:fonts.mono,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{String(this.state.error?.message || this.state.error)}</div>
        <div style={{color:colors.textGhost,marginTop:5}}>The rest of the game is still safe. Copy this error and send it back for the exact failing data path.</div>
      </div>
    );
  }
}

export function CollapsibleSection({ title, count, defaultOpen = false, open: controlledOpen, onOpenChange, children }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : internalOpen;
  const toggleOpen = () => {
    const next = !open;
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  return (
    <div>
      <div onClick={toggleOpen}
        style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',padding:'3px 0',borderBottom:`1px solid ${colors.borderDim}`,marginBottom: open ? 4 : 0}}>
        <span style={{fontFamily:fonts.display,fontSize:13,color:colors.textFaint,letterSpacing:2}}>{title}</span>
        <span style={{fontFamily:fonts.mono,fontSize:13,color:colors.textGhost}}>
          {count > 0 && <span style={{color:colors.gold,marginRight:4}}>{count}</span>}
          {open ? '▲' : '▼'}
        </span>
      </div>
      {open && children}
    </div>
  );
}
