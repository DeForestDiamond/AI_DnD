import { useEffect, useRef, useState } from 'react';
import { colors, fonts } from '../styles/theme.js';
import { cleanDisplayText } from '../hooks/useGame.js';
function DiceRollDisplay({ roll }) {
  if (!roll) return null;
  const hit = roll.dc == null || roll.value >= roll.dc;
  return (
    <div style={{marginTop:6,display:'flex',flexWrap:'wrap',gap:6}}>
      {roll.value != null && (
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#1e1508',border:`1px solid ${colors.gold}`,borderRadius:6,padding:'4px 10px'}}>
          <span style={{fontSize:14}}>🎲</span>
          <span style={{fontFamily:fonts.display,color:colors.gold,fontSize:11}}>
            {roll.label}: <strong style={{color:roll.fumble?colors.red:roll.crit?'#ffd700':hit?colors.green:colors.red}}>
              {roll.fumble?'FUMBLE!':roll.crit?`CRIT! (${roll.value})`:roll.value}
            </strong>
            {roll.dc != null && <span style={{color:colors.textFaint,fontSize:10}}> (need {roll.dc})</span>}
            {roll.dc != null && <span style={{marginLeft:6,fontSize:10,color:hit?colors.green:colors.red}}>{hit?'✓ Success':'✗ Fail'}</span>}
          </span>
        </div>
      )}
      {roll.dmg != null && !roll.fumble && (
        <div style={{display:'inline-flex',alignItems:'center',gap:4,background:'#1e0808',border:`1px solid ${colors.red}`,borderRadius:6,padding:'4px 10px'}}>
          <span style={{fontFamily:fonts.display,color:colors.red,fontSize:11}}>
            ⚔️ {roll.dmg} damage{roll.crit?' (Critical!)':''}{roll.sneak?' 🗡️ Sneak!':''}
          </span>
        </div>
      )}
      {roll.enemyDmg != null && (
        <div style={{display:'inline-flex',alignItems:'center',gap:4,background:'#200808',border:'1px solid #e07030',borderRadius:6,padding:'4px 10px'}}>
          <span style={{fontFamily:fonts.display,color:'#e07030',fontSize:11}}>
            💀 Enemy dealt {roll.enemyDmg} damage
          </span>
        </div>
      )}
    </div>
  );
}

const staticBtn = (label, onClick, dim = false) => (
  <button
    onClick={onClick}
    style={{
      background: 'transparent',
      border: `1px solid ${dim ? colors.borderFaint : colors.borderDim}`,
      color: dim ? 'rgba(255,255,255,0.15)' : colors.textDead,
      fontSize: 10, padding: '2px 7px', borderRadius: 3,
      cursor: 'pointer', lineHeight: 1.5, flexShrink: 0,
    }}
    onMouseEnter={e => { if (!dim) { e.currentTarget.style.borderColor = colors.gold; e.currentTarget.style.color = colors.gold; }}}
    onMouseLeave={e => { if (!dim) { e.currentTarget.style.borderColor = colors.borderDim; e.currentTarget.style.color = colors.textDead; }}}
  >{label}</button>
);

export function MessageFeed({ messages, loading, characterEmoji, onEditMessage, onRegenerate, editableFromId }) {
  const endRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const lastDMId   = [...messages].reverse().find(m => m.role === 'dm')?.id;
  const lastUserId = [...messages].reverse().find(m => m.role === 'user')?.id;

  // A message is editable if it appears at or after the editableFromId in the list
  const editableFromIdx = editableFromId
    ? messages.findIndex(m => m.id === editableFromId)
    : 0;

  const isEditable = (msg) =>
    msg.role === 'user' &&
    messages.findIndex(m => m.id === msg.id) >= editableFromIdx;

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(cleanDisplayText(msg.text));
  };

  const confirmEdit = (msgId) => {
    if (editText.trim()) onEditMessage?.(msgId, editText.trim());
    setEditingId(null);
  };

  return (
    <div style={{flex:1,overflowY:'auto',padding:'20px 18px',display:'flex',flexDirection:'column',gap:16}}>

      {/* Raw tag toggle */}
      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button onClick={() => setShowRaw(v => !v)} style={{
          background: showRaw ? 'rgba(201,168,76,0.15)' : 'transparent',
          border: `1px solid ${showRaw ? colors.gold : colors.borderDim}`,
          color: showRaw ? colors.gold : colors.textDead,
          fontSize: 9, padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
          fontFamily: fonts.display, letterSpacing: 1,
        }}>
          {showRaw ? '🏷️ TAGS ON' : '🏷️ TAGS OFF'}
        </button>
      </div>

      {messages.length === 0 && loading && (
        <div style={{textAlign:'center',color:colors.textDead,fontFamily:fonts.display,fontSize:12,letterSpacing:2,paddingTop:40}}>
          THE DUNGEON MASTER PREPARES YOUR TALE...
        </div>
      )}

      {messages.map(msg => {
        const editable = isEditable(msg);
        const isLastDM = msg.role === 'dm' && msg.id === lastDMId;

        return (
          <div key={msg.id} className={`msg-${msg.role}`}
            style={{display:'flex',gap:10,justifyContent:msg.role==='user'?'flex-end':'flex-start'}}>

            {msg.role === 'dm' && <div style={{fontSize:20,flexShrink:0,marginTop:2}}>📜</div>}

            <div style={{maxWidth:'80%'}}>
              <div style={{
                background: msg.role==='dm' ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.04)',
                border:`1px solid ${msg.role==='dm' ? colors.borderDim : '#2a2a1a'}`,
                borderRadius: msg.role==='dm' ? '2px 8px 8px 8px' : '8px 2px 8px 8px',
                padding:'12px 14px',
              }}>
                {msg.role === 'dm' && (
                  <div style={{fontFamily:fonts.display,fontSize:8,color:'#4a3820',letterSpacing:3,marginBottom:6}}>DUNGEON MASTER</div>
                )}
                {editingId === msg.id ? (
                  <div>
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      autoFocus
                      style={{width:'100%',boxSizing:'border-box',background:'rgba(0,0,0,0.4)',border:`1px solid ${colors.gold}`,color:colors.text,fontFamily:fonts.body,fontSize:13,lineHeight:1.7,padding:'8px 10px',borderRadius:4,resize:'vertical',minHeight:80,outline:'none'}}
                    />
                    <div style={{display:'flex',gap:6,marginTop:6}}>
                      {staticBtn('✓ Send', () => confirmEdit(msg.id))}
                      {staticBtn('✕ Cancel', () => setEditingId(null))}
                    </div>
                  </div>
                ) : (
                  <div style={{fontSize:14,lineHeight:1.9,color:msg.role==='dm'?colors.textDim:colors.textMuted,whiteSpace:'pre-wrap'}}>
                    {showRaw ? msg.text : cleanDisplayText(msg.text)}
                  </div>
                )}
                {msg.role === 'dm' && <DiceRollDisplay roll={msg.roll}/>}
              </div>

              {/* Static action buttons — always visible, dimmed if not applicable */}
              {!editingId && !loading && (
                <div style={{display:'flex',gap:4,marginTop:4,justifyContent:msg.role==='user'?'flex-end':'flex-start'}}>
                  {msg.role === 'user' && (
                    editable
                      ? staticBtn('✏️', () => startEdit(msg), false)
                      : staticBtn('✏️', null, true)
                  )}
                  {msg.role === 'dm' && (
                    isLastDM
                      ? staticBtn('↺', () => onRegenerate?.(), false)
                      : staticBtn('↺', null, true)
                  )}
                </div>
              )}
            </div>

            {msg.role === 'user' && <div style={{fontSize:20,flexShrink:0,marginTop:2}}>{characterEmoji}</div>}
          </div>
        );
      })}

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
