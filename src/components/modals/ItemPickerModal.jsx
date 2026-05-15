import { colors, fonts, btn } from '../../styles/theme.js';
import { SLOTS } from '../../constants/items.js';

const itemLabel = (name, data) => {
  if (!data) return name;
  if (data.type === 'weapon') return `${name} (${data.damage}${data.bonus ? `+${data.bonus}` : ''})`;
  if (data.type === 'armor')  return `${name} (Armor Class ${data.ac})`;
  if (data.type === 'shield') return `${name} (+${data.ac||2} Armor Class)`;
  if (data.label)             return `${name} [${data.label}]`;
  return name;
};

export function ItemPickerModal({ slotId, options, allItemsDB, onPick, onClose }) {
  const slotInfo = SLOTS.find(s => s.id === slotId);
  // Filter options to only items that actually belong in this slot
  const filtered = options.filter(name => {
    const data = allItemsDB[name];
    if (!data) return false;
    if (!slotInfo?.accepts) return true;
    return slotInfo.accepts.includes(data.type);
  });

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:150,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:colors.bgPanel,border:`1px solid ${colors.border}`,borderRadius:4,padding:16,maxWidth:320,width:'100%',maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
        <div style={{fontFamily:fonts.display,color:colors.gold,fontSize:13,marginBottom:12,flexShrink:0}}>
          {slotInfo?.emoji} Choose item for {slotInfo?.label}
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          {filtered.length === 0 && (
            <div style={{color:colors.textDead,fontSize:12,fontStyle:'italic',padding:'8px 0'}}>
              No items available for this slot
            </div>
          )}
          {filtered.map(name => {
            const data = allItemsDB[name];
            return (
              <div key={name} onClick={() => onPick(name)}
                style={{padding:'8px 10px',cursor:'pointer',borderBottom:`1px solid ${colors.borderFaint}`,color:colors.textDim,fontSize:13,display:'flex',justifyContent:'space-between',transition:'color 0.15s'}}
                onMouseEnter={e => e.currentTarget.style.color = colors.gold}
                onMouseLeave={e => e.currentTarget.style.color = colors.textDim}>
                <span>{itemLabel(name, data)}</span>
                <span style={{color:colors.textDead,fontSize:10,flexShrink:0,marginLeft:8}}>equip →</span>
              </div>
            );
          })}
        </div>
        <button style={{...btn(false),width:'100%',marginTop:10,fontSize:11,flexShrink:0}} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
