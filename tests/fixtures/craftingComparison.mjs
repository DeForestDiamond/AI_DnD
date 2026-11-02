const source=(item,quote)=>({item,quote});
export function craftingFixture(mode='upgrade') {
  const base={name:'Ossuary Robe',data:{type:'armor',slot:'armor',ac:21,dexBonus:true,maxDex:2,bonuses:{con:2},label:'Commands undead independently. Shields souls from hostile necromancy. Repairs damaged undead.'},count:1};
  const bones={name:'Divine Bones',data:{type:'misc',label:'Divine crafting stock.'},count:500};
  const a={name:'Ossuary Sovereign',type:'armor',slot:'armor',ac:20,heavy:false,maxDex:2,bonuses:'con:2',label:'Commands undead independently. Shields souls from hostile necromancy. Repairs damaged undead. Transforms individual undead into death-domain champions.',count:1,consumes:[{name:base.name,count:1},{name:bones.name,count:180}],reason:'Individual enhancement and soul protection.'};
  const b={...a,name:'Sepulchral Apotheosis',ac:22,label:'Commands undead independently. Shields souls from hostile necromancy. Repairs damaged undead. Establishes fortified necromantic strongpoints with autonomous undead commanders.',consumes:[{name:base.name,count:1},{name:bones.name,count:300}],reason:'Army command and battlefield infrastructure.'};
  const options=[a,b];
  const analysis={options:options.map((o,i)=>({optionIndex:i,baseNames:[base.name],focus:i?'Army command and infrastructure':'Individual undead enhancement',summary:i?'Autonomous commanders and fortified strongpoints.':'Individual undead become death-domain champions.',evidence:[source(o.name,i?'Establishes fortified necromantic strongpoints with autonomous undead commanders.':'Transforms individual undead into death-domain champions.')],changes:[
    {kind:'added',ability:i?'Fortified strongpoints':'Death-domain champions',explanation:i?'Adds fortified strongpoints and autonomous undead commanders.':'Adds death-domain champion enhancement.',before:[],after:[source(o.name,i?'Establishes fortified necromantic strongpoints with autonomous undead commanders.':'Transforms individual undead into death-domain champions.')]},
    {kind:'retained',ability:'Undead command, soul shielding, and repair',explanation:'Original command, soul shielding, and repair remain.',before:[source(base.name,base.data.label)],after:[source(o.name,base.data.label)]},
  ]})),recommendation:{optionIndex:null,reason:'Sovereign specializes in individual champions at 180 bones; Apotheosis adds army infrastructure at 300 bones. Choose by purpose rather than armor alone.',evidence:[source(a.name,'Transforms individual undead into death-domain champions.'),source(b.name,'Establishes fortified necromantic strongpoints with autonomous undead commanders.')]}};
  let materials=[base,bones];
  if(mode==='single') {
    materials=[bones];
    options.forEach(o=>o.consumes=o.consumes.filter(c=>c.name===bones.name));
    analysis.options.forEach(o=>{o.baseNames=[];o.changes=o.changes.filter(c=>c.kind==='added');});
  }
  if(mode==='set') {
    const helm={name:'Ossuary Helm',data:{type:'magic',slot:'head',bonuses:{wis:2},label:'Sees spirits.'},count:1};
    materials.push(helm);
    options.forEach((o,i)=>{
      const robe={...o};delete robe.consumes;delete robe.count;delete robe.reason;
      o.pieces=[robe,{name:`${o.name} Crown`,type:'magic',slot:'head',bonuses:i?'wis:3':'wis:2',label:'Sees spirits.'}];
      o.name+= ' Regalia';delete o.label;delete o.ac;delete o.bonuses;delete o.type;delete o.slot;
      o.consumes.push({name:helm.name,count:1});
      analysis.options[i].baseNames.push(helm.name);
    });
  }
  if(mode==='construct') {
    materials=[bones];
    options.forEach(o=>{o.isConstruct=true;o.race='bone sentinel';o.role=o.reason;o.abilities=o.label;o.desc='A sentinel forged from divine bones.';o.cr=20;delete o.label;delete o.type;o.consumes=o.consumes.filter(c=>c.name===bones.name);});
    analysis.options.forEach(o=>{o.baseNames=[];o.changes=o.changes.filter(c=>c.kind==='added');});
  }
  return {materials,options,analysis,intent:'Improve undead support, preserve soul shielding, and compare individual enhancement with army infrastructure.'};
}
