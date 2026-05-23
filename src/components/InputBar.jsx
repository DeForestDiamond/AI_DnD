import { useState, useRef, useEffect } from 'react';
import { colors, fonts, btn } from '../styles/theme.js';

export function InputBar({ onSend, loading, isListening, sttSupported, onMicClick, isSpeaking, voiceSupported, ttsEnabled, onToggleTts, onStopSpeaking, onReplay, tokenUsage }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!loading) setTimeout(() => inputRef.current?.focus(), 100);
  }, [loading]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput('');
  };

  // Allow parent to inject text (e.g. from mic)
  useEffect(() => {
    const handler = (e) => { if (e.detail) setInput(e.detail); };
    window.addEventListener('dnd-set-input', handler);
    return () => window.removeEventListener('dnd-set-input', handler);
  }, []);

  return (
    <div style={{background:'rgba(10,7,3,0.9)',borderTop:`1px solid ${colors.border}`,padding:14,flexShrink:0}}>
      <div style={{display:'flex',gap:8}}>
        {sttSupported && (
          <button onClick={onMicClick} disabled={loading}
            style={{background:isListening?'rgba(201,168,76,0.2)':'transparent',border:`1px solid ${isListening?colors.gold:'#4a3820'}`,color:isListening?colors.gold:'#6a5a3a',padding:'10px 12px',fontSize:16,borderRadius:3,cursor:'pointer',animation:isListening?'pulse 0.6s infinite alternate':'none',opacity:loading?0.4:1}}>
            🎙
          </button>
        )}
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="What do you do?"
          disabled={loading}
          rows={3}
          style={{flex:1,background:colors.bg,border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.body,fontSize:15,padding:'10px 12px',borderRadius:4,outline:'none',opacity:loading?0.5:1,resize:'none',overflowY:'auto',lineHeight:1.5}}
        />
        <button style={{...btn(true),padding:'10px 18px',fontSize:13,opacity:loading?0.4:1}} disabled={loading} onClick={handleSend}>
          ACT
        </button>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
        <div style={{fontSize:10,color:colors.textDead,fontFamily:fonts.display,letterSpacing:1}}>
          Enter to act · Shift+Enter for new line{sttSupported?' · 🎙 speak':''} · 💾 save in sidebar
        </div>
        {voiceSupported && (
          <div style={{display:'flex',gap:6}}>
            {isSpeaking && <button onClick={onStopSpeaking} style={{...btn(false),padding:'3px 8px',fontSize:10,borderColor:colors.gold,color:colors.gold}}>⏹ Stop</button>}
            {!isSpeaking && onReplay && <button onClick={onReplay} style={{...btn(false),padding:'3px 8px',fontSize:10}}>🔁 Replay</button>}
            <button onClick={onToggleTts} style={{...btn(ttsEnabled),padding:'3px 8px',fontSize:10}}>
              {ttsEnabled?'🔊':'🔇'}
            </button>
          </div>
        )}
      </div>
      {tokenUsage && (
        <div style={{display:'flex',gap:16,marginTop:5,paddingTop:5,borderTop:`1px solid rgba(74,56,32,0.3)`}}>
          <span style={{fontSize:10,color:'rgba(150,130,90,0.6)',fontFamily:fonts.display,letterSpacing:1}}>
            ↑ {tokenUsage.input_tokens?.toLocaleString() ?? '—'} tokens sent
          </span>
          <span style={{fontSize:10,color:'rgba(150,130,90,0.6)',fontFamily:fonts.display,letterSpacing:1}}>
            ↓ {tokenUsage.output_tokens?.toLocaleString() ?? '—'} tokens received
          </span>
          <span style={{fontSize:10,color:'rgba(150,130,90,0.45)',fontFamily:fonts.display,letterSpacing:1}}>
            ∑ {((tokenUsage.input_tokens ?? 0) + (tokenUsage.output_tokens ?? 0)).toLocaleString()} total
          </span>
        </div>
      )}
    </div>
  );
}
