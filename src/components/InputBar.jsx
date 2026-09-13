import { useState, useRef, useEffect } from 'react';
import { colors, fonts, btn } from '../styles/theme.js';
import { clearPendingOpenAiImage, installOpenAiImageInterceptor, setPendingOpenAiImage } from '../helpers/openai/pendingImage.js';
import { clearPendingXaiImage, installXaiImageInterceptor, setPendingXaiImage } from '../helpers/xai/pendingImage.js';

// USD per million tokens. Cache writes are billed separately from cache reads.
// OpenAI rates here are the standard short-context API rates used by this app's
// explicit-cache path. Requests above the long-context threshold have different
// pricing; normal game turns are far below it.
const PRICING = {
  sonnet:   { input: 3.0, output: 15.0, cacheWrite: 3.75,  cacheRead: 0.30 },
  haiku:    { input: 1.0, output: 5.0,  cacheWrite: 1.25,  cacheRead: 0.10 },
  gpt:      { input: 5.0, output: 30.0, cacheWrite: 6.25,  cacheRead: 0.50 },
  terra:    { input: 2.5, output: 15.0, cacheWrite: 3.125, cacheRead: 0.25 },
  grok:     { input: 1.25, output: 2.50, cacheWrite: 1.25, cacheRead: 0.20 },
};

export function InputBar({ onSend, onStop, loading, isListening, sttSupported, onMicClick, isSpeaking, voiceSupported, ttsEnabled, onToggleTts, onStopSpeaking, onReplay, tokenUsage, selectedModel }) {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const openAiModel = selectedModel === 'terra' || selectedModel === 'gpt';
  const xaiModel = selectedModel === 'grok';
  const imageModel = openAiModel || xaiModel;

  useEffect(() => {
    installOpenAiImageInterceptor();
    installXaiImageInterceptor();
  }, []);

  useEffect(() => {
    if (!loading) setTimeout(() => inputRef.current?.focus(), 100);
  }, [loading]);

  // If the player switches back to Claude before sending, discard only the
  // one-turn provider screenshot. The persistent campaign map is managed safely
  // from Settings and remains ready for the next Terra/Sol turn.
  useEffect(() => {
    if (!imageModel && attachment) {
      setAttachment(null);
      clearPendingOpenAiImage();
      clearPendingXaiImage();
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [imageModel, attachment]);

  const handleImagePick = (e) => {
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
      const next = { name: file.name || 'screenshot', dataUrl };
      setAttachment(next);
      if (xaiModel) setPendingXaiImage(next);
      else setPendingOpenAiImage(next);
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    clearPendingOpenAiImage();
    clearPendingXaiImage();
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSend = () => {
    if ((!input.trim() && !attachment) || loading) return;
    const text = input.trim() || 'Use the attached screenshot as reference.';
    onSend(text);
    setInput('');
    // Do NOT clear the pending transport here — callDM consumes it when the
    // actual provider request is assembled. Only clear the local preview.
    setAttachment(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Allow parent to inject text (e.g. from mic)
  useEffect(() => {
    const handler = (e) => { if (e.detail) setInput(e.detail); };
    window.addEventListener('dnd-set-input', handler);
    return () => window.removeEventListener('dnd-set-input', handler);
  }, []);

  return (
    <div style={{background:'rgba(10,7,3,0.9)',borderTop:`1px solid ${colors.border}`,padding:14,flexShrink:0}}>
      <div style={{display:'flex',gap:6,marginBottom:8}}>
        {[1,2,3,4].map(n => (
          <button key={n} onClick={() => !loading && onSend(`Option ${n}`)} disabled={loading}
            style={{flex:1,background:'transparent',border:'1px solid #4a3820',color:'#8a7a5a',padding:'8px 0',fontSize:14,fontFamily:fonts.display,letterSpacing:1,borderRadius:3,cursor:loading?'default':'pointer',opacity:loading?0.4:1}}>
            {n}
          </button>
        ))}
      </div>

      {attachment && (
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,padding:'7px 9px',border:'1px solid #4a3820',borderRadius:4,background:'rgba(201,168,76,0.05)'}}>
          <img src={attachment.dataUrl} alt="Attached screenshot" style={{width:54,height:42,objectFit:'cover',borderRadius:3,border:'1px solid #4a3820'}} />
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontSize:10,color:colors.gold,fontFamily:fonts.display,letterSpacing:1}}>SCREENSHOT ATTACHED — THIS TURN</div>
            <div style={{fontSize:10,color:colors.textGhost,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{attachment.name}</div>
          </div>
          <button onClick={removeAttachment} disabled={loading} title="Remove screenshot"
            style={{background:'transparent',border:'1px solid #4a3820',color:'#8a7a5a',borderRadius:3,padding:'4px 8px',cursor:'pointer',opacity:loading?0.4:1}}>
            ✕
          </button>
        </div>
      )}

      <div style={{display:'flex',gap:8}}>
        {sttSupported && (
          <button onClick={onMicClick} disabled={loading}
            style={{background:isListening?'rgba(201,168,76,0.2)':'transparent',border:`1px solid ${isListening?colors.gold:'#4a3820'}`,color:isListening?colors.gold:'#6a5a3a',padding:'10px 12px',fontSize:16,borderRadius:3,cursor:'pointer',animation:isListening?'pulse 0.6s infinite alternate':'none',opacity:loading?0.4:1}}>
            🎙
          </button>
        )}
        {imageModel && (
          <>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImagePick} style={{display:'none'}} />
            <button onClick={() => !loading && fileRef.current?.click()} disabled={loading} title="Attach screenshot for this turn"
              style={{background:attachment?'rgba(201,168,76,0.2)':'transparent',border:`1px solid ${attachment?colors.gold:'#4a3820'}`,color:attachment?colors.gold:'#6a5a3a',padding:'10px 12px',fontSize:16,borderRadius:3,cursor:'pointer',opacity:loading?0.4:1}}>
              🖼️
            </button>
          </>
        )}
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            // Desktop: Enter sends, Shift+Enter newline
            // Mobile: Enter always newlines (ACT button is the only send)
            const isMobile = window.innerWidth < 768;
            if (e.key === 'Enter' && !e.shiftKey && !isMobile) handleSend();
          }}
          placeholder={attachment ? 'What should the DM look at?' : 'What do you do?'}
          disabled={loading}
          rows={3}
          style={{flex:1,background:colors.bg,border:`1px solid ${colors.border}`,color:colors.text,fontFamily:fonts.body,fontSize:15,padding:'10px 12px',borderRadius:4,outline:'none',opacity:loading?0.5:1,resize:'none',overflowY:'auto',lineHeight:1.5}}
        />
        {loading
          ? <button style={{...btn(false),padding:'10px 18px',fontSize:13,borderColor:'#8a3020',color:'#c05040'}} onClick={onStop}>
              ⏹ Stop
            </button>
          : <button style={{...btn(true),padding:'10px 18px',fontSize:13}} onClick={handleSend}>
              ACT
            </button>
        }
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
        <div style={{fontSize:10,color:colors.textDead,fontFamily:fonts.display,letterSpacing:1}}>
          {loading ? 'Tap ⏹ Stop to cancel' : `ACT to send · Shift+Enter for new line${sttSupported?' · 🎙 speak':''}${imageModel?' · 🖼️ turn screenshot':''} · 💾 save in sidebar`}
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
      {tokenUsage && (() => {
        const fresh       = tokenUsage.input_tokens ?? 0;
        const cacheRead   = tokenUsage.cache_read_input_tokens ?? 0;
        const cacheCreate = tokenUsage.cache_creation_input_tokens ?? 0;
        const inputTotal  = fresh + cacheRead + cacheCreate;
        const output      = tokenUsage.output_tokens ?? 0;
        const total       = inputTotal + output;
        const rate = PRICING[selectedModel] || PRICING.sonnet;
        const cost = (
          fresh       * rate.input +
          cacheCreate * rate.cacheWrite +
          cacheRead   * rate.cacheRead +
          output      * rate.output
        ) / 1e6;

        const cellStyle = {
          minWidth:0,
          whiteSpace:'nowrap',
          fontSize:10,
          color:'rgba(150,130,90,0.65)',
          fontFamily:fonts.display,
          letterSpacing:0.8,
        };
        const labelStyle = {
          color:'rgba(150,130,90,0.42)',
          marginRight:5,
        };
        const cells = [
          ['INPUT', inputTotal.toLocaleString()],
          ['CACHE HIT', cacheRead.toLocaleString()],
          ['CACHE WRITE', cacheCreate.toLocaleString()],
          ['FRESH', fresh.toLocaleString()],
          ['OUTPUT', output.toLocaleString()],
          ['TOTAL', total.toLocaleString()],
          ['COST', `$${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(3)}`],
        ];

        return (
          <div style={{marginTop:5,paddingTop:6,borderTop:`1px solid rgba(74,56,32,0.3)`,overflowX:'auto'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7, minmax(105px, 1fr))',columnGap:14,minWidth:820}}>
              {cells.map(([label, value]) => (
                <div key={label} style={cellStyle}>
                  <span style={labelStyle}>{label}</span>{value}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
