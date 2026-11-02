import { colors, fonts } from '../../../styles/theme.js';
import { itemMetrics } from '../../../helpers/craftingComparison.js';

const labels = {added:'New',improved:'Improved',weakened:'Regression',lost:'Confirmed loss',uncertain:'Uncertain omission / review',tradeoff:'Trade-offs',retained:'Unchanged',redundant:'Already covered'};
const tone = kind => ['weakened','lost'].includes(kind)?colors.red:kind==='uncertain'?colors.yellow:['added','improved'].includes(kind)?colors.green:colors.textDim;
const detailStyle = {marginTop:8,borderTop:`1px solid ${colors.borderDim}`,paddingTop:4};
const summaryStyle = {cursor:'pointer',padding:'7px 0',minHeight:24,color:colors.gold,fontSize:12};
const textStyle = {fontSize:12,lineHeight:1.5,overflowWrap:'anywhere'};

function Change({change}) {
  return <li style={{marginBottom:6,color:tone(change.kind)}}>
    <strong>{labels[change.kind]}: </strong>{change.explanation}
    {!change.numeric && (change.before?.length>0||change.after?.length>0) && <details>
      <summary style={{...summaryStyle,fontSize:11}}>Source excerpts</summary>
      {[['Original',change.before],['Result',change.after]].map(([label,refs])=>refs?.map((ref,i)=><div key={`${label}-${i}`} style={{color:colors.textDim,fontSize:11,marginBottom:4}}><b>{label} · {ref.item}:</b> “{ref.quote}”</div>))}
    </details>}
  </li>;
}

function Changes({changes}) {
  return <ul style={{...textStyle,margin:'4px 0',paddingLeft:18}}>{changes.map((change,i)=><Change key={`${change.kind}-${i}`} change={change}/>)}</ul>;
}

export function CraftingComparison({comparison}) {
  if (!comparison?.rows?.length) return null;
  const {rows,recommendation,originals,costNames}=comparison;
  return <section aria-label="Crafting result comparison" style={{marginTop:12,padding:10,border:`1px solid ${colors.border}`,borderRadius:6,background:'rgba(201,168,76,0.04)',minWidth:0,overflowWrap:'anywhere'}}>
    <h3 style={{fontFamily:fonts.display,fontSize:14,color:colors.gold,margin:'0 0 6px'}}>Compare results</h3>
    <p style={{...textStyle,color:colors.textFaint,margin:'0 0 8px'}}>Stats and costs come from the actual items. Ability highlights are AI interpretations checked against quoted sources, not a complete audit. Unmentioned abilities are unverified, not confirmed losses.</p>
    {comparison.intent && <details style={detailStyle}><summary style={summaryStyle}>Your crafting request</summary><div style={textStyle}>{comparison.intent}</div></details>}
    {recommendation && <div style={{...textStyle,padding:'8px 0',color:colors.text}}><b style={{color:colors.gold}}>{recommendation.index===null?'Which purpose fits?':`Suggested fit · Option ${recommendation.index+1}`} </b>{recommendation.reason}<details><summary style={summaryStyle}>Recommendation sources</summary>{recommendation.evidence.map((e,i)=><div key={i}><b>{e.item}:</b> “{e.quote}”</div>)}</details></div>}
    {!recommendation && rows.length>1 && <p style={{...textStyle,color:colors.textDim}}>No universal winner selected. Compare each option’s utility, restrictions, and material cost for your purpose.</p>}
    {rows.map(row=>{
      const warnings=row.changes.filter(c=>['weakened','lost','uncertain'].includes(c.kind));
      const highlights=row.changes.filter(c=>!['weakened','lost','uncertain','retained','redundant'].includes(c.kind));
      const retained=row.changes.filter(c=>c.kind==='retained');
      const redundant=row.changes.filter(c=>c.kind==='redundant');
      return <article key={row.index} aria-label={`Option ${row.index+1} comparison`} style={{padding:'10px 0',borderTop:`1px solid ${colors.borderDim}`,minWidth:0}}>
        <h4 style={{margin:'0 0 4px',fontSize:13,color:colors.gold}}>Option {row.index+1} — {row.name}{row.isSet?' · whole set':''}</h4>
        {row.focus && <div style={textStyle}><b>Focus:</b> {row.focus}</div>}
        {row.summary && <p style={{...textStyle,margin:'4px 0',color:colors.text}}>{row.summary}</p>}
        {row.bases.length>0 && <div style={{...textStyle,color:colors.textFaint}}>Compared with {row.bases.join(', ')}</div>}
        {row.metrics.map((m,i)=><div key={i} style={{...textStyle,color:colors.textDim}}>{m}</div>)}
        {row.unchangedStats>0 && <div style={{...textStyle,color:colors.textFaint}}>{row.unchangedStats} structured stat entries unchanged.</div>}
        <div style={{...textStyle,color:colors.textDim}}>Makes ×{row.count.toLocaleString()} · Total cost: {row.costs.map(c=>`${c.count.toLocaleString()} ${c.name}`).join('; ')||'No materials listed'}</div>
        {row.unavailable.length>0 && <div style={{...textStyle,color:colors.red}}>Unavailable: {row.unavailable.join('; ')}</div>}
        {warnings.length>0 && <div style={detailStyle}><b style={{...textStyle,color:colors.yellow}}>Regressions & uncertainty ({warnings.length})</b><Changes changes={warnings.slice(0,2)}/>{warnings.length>2&&<details><summary style={summaryStyle}>All warnings ({warnings.length})</summary><Changes changes={warnings.slice(2)}/></details>}</div>}
        {highlights.length>0 && <div style={detailStyle}><Changes changes={highlights.slice(0,2)}/>{highlights.length>2&&<details><summary style={summaryStyle}>More differences ({highlights.length-2})</summary><Changes changes={highlights.slice(2)}/></details>}</div>}
        {(retained.length>0||redundant.length>0) && <details style={detailStyle}><summary style={summaryStyle}>Unchanged / already covered ({retained.length+redundant.length} groups)</summary><Changes changes={[...retained,...redundant]}/></details>}
        {!row.analyzed && <p style={{...textStyle,color:colors.textFaint}}>Ability analysis unavailable or unsupported. Only verified structured differences are shown; expand the full descriptions below.</p>}
        {row.incomplete&&row.analyzed && <p style={{...textStyle,color:colors.yellow}}>Some analysis could not be verified and was omitted. Review full descriptions before choosing.</p>}
        {row.isSet&&row.pieces.length>0 && <details style={detailStyle}><summary style={summaryStyle}>Piece-by-piece upgrade checks ({row.pieces.length})</summary>{row.pieces.map((piece,i)=><div key={i} style={{marginBottom:10}}><b style={textStyle}>{piece.base} → {piece.result||'unmatched'}</b>{piece.changes.length?<Changes changes={piece.changes}/>:<div style={textStyle}>No structured stat differences detected. Narrative preservation is not implied.</div>}</div>)}</details>}
        {row.evidence.length>0 && <details style={detailStyle}><summary style={summaryStyle}>Summary sources</summary>{row.evidence.map((e,i)=><div key={i} style={textStyle}><b>{e.item}:</b> “{e.quote}”</div>)}</details>}
      </article>;
    })}
    {rows.length>1&&costNames.length>0 && <details style={detailStyle}><summary style={summaryStyle}>Side-by-side material costs</summary><div style={{overflowX:'auto',maxWidth:'100%'}} tabIndex={0} role="region" aria-label="Material costs by option"><table style={{...textStyle,borderCollapse:'collapse',width:'100%'}}><caption style={{textAlign:'left',color:colors.textFaint}}>Total materials per returned batch; different materials have no assumed equivalent value.</caption><thead><tr><th scope="col" style={{textAlign:'left',padding:6}}>Material</th>{rows.map(r=><th key={r.index} scope="col" style={{padding:6}}>Option {r.index+1}</th>)}</tr></thead><tbody>{costNames.map(name=><tr key={name}><th scope="row" style={{textAlign:'left',padding:6,fontWeight:'normal'}}>{name}</th>{rows.map(r=><td key={r.index} style={{textAlign:'center',padding:6}}>{r.costs.filter(c=>c.name===name).reduce((n,c)=>n+Number(c.count||0),0).toLocaleString()}</td>)}</tr>)}</tbody></table></div></details>}
    {originals.length>0 && <details style={detailStyle}><summary style={summaryStyle}>Full original item descriptions ({originals.length})</summary>{originals.map(item=><div key={item.name} style={{...textStyle,marginBottom:12}}><b>{item.name}</b><div>{itemMetrics(item).join(' · ')}</div>{['label','appearance','abilities','desc'].filter(k=>item[k]).map(k=><p key={k} style={{margin:'4px 0',whiteSpace:'pre-wrap'}}>{item[k]}</p>)}</div>)}</details>}
  </section>;
}
