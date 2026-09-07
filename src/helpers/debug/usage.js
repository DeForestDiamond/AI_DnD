export const logHelperUsage = ({ sideCostRef, label, data, log }) => {
  const u=data?.usage; if(!u)return;
  const cacheRead=u.cache_read_input_tokens??0, cacheWrite=u.cache_creation_input_tokens??0, input=u.input_tokens??0, output=u.output_tokens??0;
  const cost=(input*3+cacheWrite*3.75+cacheRead*0.30+output*15)/1e6;
  sideCostRef.current={calls:sideCostRef.current.calls+1,cost:sideCostRef.current.cost+cost};
  log(`[COST] ${label}: ${(input+cacheRead+cacheWrite).toLocaleString()} in / ${output.toLocaleString()} out = $${cost.toFixed(4)}  ·  session helper total $${sideCostRef.current.cost.toFixed(3)} over ${sideCostRef.current.calls} calls`);
};
