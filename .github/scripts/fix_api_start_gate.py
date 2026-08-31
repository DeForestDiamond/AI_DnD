from pathlib import Path
p=Path('src/App.jsx')
s=p.read_text()
old="""          <button style={{...btn(true),fontSize:14,padding:'12px 28px',opacity:apiKey?1:0.4}} disabled={!apiKey} onClick={()=>setPhase('create-race')}>
            BEGIN YOUR LEGEND
          </button>
          <button style={{...btn(false),fontSize:12,padding:'12px 18px',opacity:apiKey?1:0.4}} disabled={!apiKey} onClick={()=>{setShowSave(true);}}>
            📂 Load / Import
          </button>
        </div>
        {!apiKey && <div style={{fontSize:11,color:colors.textGhost,marginTop:12}}>Enter your API key above to begin</div>}"""
new="""          <button style={{...btn(true),fontSize:14,padding:'12px 28px',opacity:(apiKey || openAiApiKey)?1:0.4}} disabled={!apiKey && !openAiApiKey} onClick={()=>setPhase('create-race')}>
            BEGIN YOUR LEGEND
          </button>
          <button style={{...btn(false),fontSize:12,padding:'12px 18px',opacity:(apiKey || openAiApiKey)?1:0.4}} disabled={!apiKey && !openAiApiKey} onClick={()=>{setShowSave(true);}}>
            📂 Load / Import
          </button>
        </div>
        {!apiKey && !openAiApiKey && <div style={{fontSize:11,color:colors.textGhost,marginTop:12}}>Enter an Anthropic or OpenAI API key above to begin</div>}"""
if s.count(old)!=1:
    raise SystemExit(f'expected one API gate block, found {s.count(old)}')
s=s.replace(old,new)
# Make the explanatory text provider-neutral too.
s=s.replace('Your key stays in your browser only. Get one at console.anthropic.com. Using Haiku model for low cost.', 'Your keys stay in your browser only. Enter either provider key to begin; the selected model will use its matching provider.')
p.write_text(s)
print('Updated welcome gate to accept either Anthropic or OpenAI API key')
