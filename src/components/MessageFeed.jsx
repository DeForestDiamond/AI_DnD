import { useEffect, useRef, useState } from 'react';
import { colors, fonts } from '../styles/theme.js';
import { cleanDisplayText } from '../hooks/useGame.js';
import { clearPendingOpenAiImage, setPendingOpenAiImage } from '../helpers/openai/pendingImage.js';
function DiceRollDisplay({ roll }) {
  if (!roll) return null;
  const hit = roll.dc == null || roll.value >= roll.dc;
  const displayLabel = roll.dmg != null ? 'Attack' : roll.label;
  return (
    <div style={{marginTop:6,display:'flex',flexWrap:'wrap',gap:6}}>
      {roll.value != null && (
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#1e1508',border:`1px solid ${colors.gold}`,borderRadius:6,padding:'4px 10px'}}>
          <span style={{fontSize:14}}>🎲</span>
          <span style={{fontFamily:fonts.display,color:colors.gold,fontSize:11}}>
            {displayLabel}: <strong style={{color:roll.fumble?colors.red:roll.crit?'#ffd700':hit?colors.green:colors.red}}>
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
      cursor: dim ? 'default' : 'pointer', lineHeight: 1.5, flexShrink: 0,
    }}
    onMouseEnter={e => { if (!dim) { e.currentTarget.style.borderColor = colors.gold; e.currentTarget.style.color = colors.gold; }}}
    onMouseLeave={e => { if (!dim) { e.currentTarget.style.borderColor = colors.borderDim; e.currentTarget.style.color = colors.textDead; }}}
  >{label}</button>
);

export function MessageFeed({ messages, loading, characterEmoji, onEditMessage, onRegenerate, editableFromId, showRawTags }) {
  const endRef = useRef(null);
  const editFileRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editAttachment, setEditAttachment] = useState(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const lastDMId   = [...messages].reverse().find(m => m.role === 'dm')?.id;

  const editableFromIdx = editableFromId
    ? messages.findIndex(m => m.id === editableFromId)
    : 0;

  const isEditable = (msg) =>
    msg.role === 'user' &&
    messages.findIndex(m => m.id === msg.id) >= editableFromIdx;

  const clearEditAttachment = () => {
    setEditAttachment(null);
    clearPendingOpenAiImage();
    if (editFileRef.current) editFileRef.current.value = '';
  };

  const startEdit = (msg) => {
    clearEditAttachment();
    setEditingId(msg.id);
    setEditText(cleanDisplayText(msg.text));
  };

  const handleEditImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type?.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('That image is over 10 MB. Crop or resize it and try again.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      setEditAttachment({ name: file.name || 'screenshot', dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const confirmEdit = (msgId) => {
    if (!editText.trim()) return;
    // Editing replays the turn through handleSend(). Queue the image immediately
    // before that replay so the same turn-scoped OpenAI transport used by the
    // main input attaches it to the replacement player message.
    if (editAttachment) setPendingOpenAiImage(editAttachment);
    else clearPendingOpenAiImage();
    onEditMessage?.(msgId, editText.trim());
    setEditingId(null);
    setEditAttachment(null);
    if (editFileRef.current) editFileRef.current.value = '';
  };

  const cancelEdit = () => {
    clearEditAttachment();
    setEditingId(null);
  };

  return (
    <div style={{flex:1,overflowY:'auto',padding:'20px 18px',display:'flex',flexDirection:'column',gap:16}}>

      {messages.length === 0 && loading && (
        <div style={{textAlign:'center',color:colors.textDead,fontFamily:fonts.display,fontSize:12,letterSpacing:2,paddingTop:40}}>
          THE DUNGEON MASTER PREPARES YOUR TALE...
        </div>
      )}

      {messages.map((msg, msgIdx) => {
        const editable = isEditable(msg);
        const isLastDM = msg.role === 'dm' && msg.id === lastDMId;

        return (
          <div key={msg.id} className={`msg-${msg.role}`}
            style={{display:'flex',gap:10,justifyContent:msg.role==='user'?'flex-end':'flex-start'}}>

            {msg.role === 'dm' && <div style={{fontSize:20,flexShrink:0,marginTop:2}}>📜</div>}

            <div style={{maxWidth:'80%'}}>
              <div style={{fontSize:9,color:'#3d3d2d',fontFamily:fonts.mono,textAlign:msg.role==='user'?'right':'left',marginBottom:1,userSelect:'none'}}>#{msgIdx}</div>
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
                    {editAttachment && (
                      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6,padding:'6px 8px',border:'1px solid #4a3820',borderRadius:4,background:'rgba(201,168,76,0.05)'}}>
                        <img src={editAttachment.dataUrl} alt="Attached screenshot" style={{width:48,height:38,objectFit:'cover',borderRadius:3,border:'1px solid #4a3820'}} />
                        <div style={{minWidth:0,flex:1,fontSize:10,color:colors.textGhost,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{editAttachment.name}</div>
                        {staticBtn('✕', clearEditAttachment)}
                      </div>
                    )}
                    <div style={{display:'flex',gap:6,marginTop:6,alignItems:'center'}}>
                      {staticBtn('✓ Send', () => confirmEdit(msg.id))}
                      <input ref={editFileRef} type="file" accept="image/*" onChange={handleEditImagePick} style={{display:'none'}} />
                      {staticBtn('🖼️', () => editFileRef.current?.click())}
                      {staticBtn('✕ Cancel', cancelEdit)}
                    </div>
                  </div>
                ) : (
                  <div style={{fontSize:14,lineHeight:1.9,color:msg.role==='dm'?colors.textDim:colors.textMuted,whiteSpace:'pre-wrap'}}>
                  {showRawTags ? msg.text : cleanDisplayText(msg.text)}
                  </div>
                )}
                {msg.role === 'dm' && <DiceRollDisplay roll={msg.roll}/>}
              </div>

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
