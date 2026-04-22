import { useEffect, useRef } from 'react';
import { colors, fonts } from '../styles/theme.js';
import { cleanDisplayText } from '../hooks/useGame.js';

function DiceRollDisplay({ roll }) {
  if (!roll) return null;
  const hit = roll.dc == null || roll.value >= roll.dc;
  return (
    <div style={{marginTop:6,display:'flex',flexWrap:'wrap',gap:6}}>
      <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#1e1508',border:`1px solid ${colors.gold}`,borderRadius:6,padding:'4px 10px'}}>
        <span style={{fontSize:14}}>🎲</span>
        <span style={{fontFamily:fonts.display,color:colors.gold,fontSize:11}}>
          {roll.label}: <strong style={{color:hit?colors.green:colors.red}}>{roll.value}</strong>
          {roll.dc != null && <span style={{color:colors.textFaint,fontSize:10}}> (need {roll.dc})</span>}
          {roll.dc != null && <span style={{marginLeft:6,fontSize:10,color:hit?colors.green:colors.red}}>{hit?'✓ Success':'✗ Fail'}</span>}
        </span>
      </div>
      {roll.dmg != null && (
        <div style={{display:'inline-flex',alignItems:'center',gap:4,background:'#1e0808',border:`1px solid ${colors.red}`,borderRadius:6,padding:'4px 10px'}}>
          <span style={{fontFamily:fonts.display,color:colors.red,fontSize:11}}>💥 {roll.dmg} damage</span>
        </div>
      )}
    </div>
  );
}

export function MessageFeed({ messages, loading, characterEmoji }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  return (
    <div style={{flex:1,overflowY:'auto',padding:'20px 18px',display:'flex',flexDirection:'column',gap:16}}>

      {messages.length === 0 && loading && (
        <div style={{textAlign:'center',color:colors.textDead,fontFamily:fonts.display,fontSize:12,letterSpacing:2,paddingTop:40}}>
          THE DUNGEON MASTER PREPARES YOUR TALE...
        </div>
      )}

      {messages.map(msg => (
        <div key={msg.id} className={`msg-${msg.role}`}
          style={{display:'flex',gap:10,justifyContent:msg.role==='user'?'flex-end':'flex-start'}}>

          {msg.role === 'dm' && <div style={{fontSize:20,flexShrink:0,marginTop:2}}>📜</div>}

          <div style={{
            maxWidth:'80%',
            background: msg.role==='dm' ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.04)',
            border:`1px solid ${msg.role==='dm' ? colors.borderDim : '#2a2a1a'}`,
            borderRadius: msg.role==='dm' ? '2px 8px 8px 8px' : '8px 2px 8px 8px',
            padding:'12px 14px',
          }}>
            {msg.role === 'dm' && (
              <div style={{fontFamily:fonts.display,fontSize:8,color:'#4a3820',letterSpacing:3,marginBottom:6}}>DUNGEON MASTER</div>
            )}
            <div style={{fontSize:14,lineHeight:1.9,color:msg.role==='dm'?colors.textDim:colors.textMuted,whiteSpace:'pre-wrap'}}>
              {cleanDisplayText(msg.text)}
            </div>
            {msg.role === 'dm' && <DiceRollDisplay roll={msg.roll}/>}
          </div>

          {msg.role === 'user' && <div style={{fontSize:20,flexShrink:0,marginTop:2}}>{characterEmoji}</div>}
        </div>
      ))}

      {loading && messages.length > 0 && (
        <div style={{display:'flex',gap:10}}>
          <div style={{fontSize:20}}>📜</div>
          <div style={{background:'rgba(201,168,76,0.05)',border:`1px solid ${colors.borderDim}`,borderRadius:'2px 8px 8px 8px',padding:'12px 14px',display:'flex',gap:5,alignItems:'center'}}>
            {[0,1,2].map(i => (
              <div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#4a3820',animation:`pulse 0.6s ${i*0.2}s infinite alternate`}}/>
            ))}
            <span style={{fontFamily:fonts.display,fontSize:10,color:colors.textDead,marginLeft:6,letterSpacing:2}}>THE DM IS WEAVING YOUR FATE...</span>
          </div>
        </div>
      )}

      <div ref={endRef}/>
    </div>
  );
}
