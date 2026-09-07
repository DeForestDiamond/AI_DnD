from pathlib import Path

# Make CollapsibleSection optionally controlled, while preserving every existing caller.
p = Path('src/components/sidebar/common/index.jsx')
s = p.read_text()
old = """export function CollapsibleSection({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div onClick={() => setOpen(v => !v)}
"""
new = """export function CollapsibleSection({ title, count, defaultOpen = false, open: controlledOpen, onOpenChange, children }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : internalOpen;
  const toggleOpen = () => {
    const next = !open;
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  return (
    <div>
      <div onClick={toggleOpen}
"""
if old not in s:
    raise SystemExit('CollapsibleSection marker not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Persist the three top-level crafting section open/closed states in their module stores.
p = Path('src/components/sidebar/crafting/Panels.jsx')
s = p.read_text()
s = s.replace("const craftStore = { selected: persistedSel.craft || {}, intent:'', mode:'item', options:null, status:'', filter:'', source:'both', showAll:false, draft:{}, infoOpen:{}, catClosed:{}, qty:'1' };",
              "const craftStore = { selected: persistedSel.craft || {}, intent:'', mode:'item', options:null, status:'', filter:'', source:'both', showAll:false, draft:{}, infoOpen:{}, catClosed:{}, qty:'1', open:false };")
s = s.replace("const consolidateStore = { selected: persistedSel.consolidate || {}, filter:'', source:'both', destination:'stash', draft:{}, catClosed:{}, groups:null, status:'' };",
              "const consolidateStore = { selected: persistedSel.consolidate || {}, filter:'', source:'both', destination:'stash', draft:{}, catClosed:{}, groups:null, status:'', open:false };")
s = s.replace("const salvageStore = { selected: persistedSel.salvage || {}, result:null, status:'', filter:'', source:'both', destination:'inventory', showAll:false, draft:{}, infoOpen:{}, catClosed:{} };",
              "const salvageStore = { selected: persistedSel.salvage || {}, result:null, status:'', filter:'', source:'both', destination:'inventory', showAll:false, draft:{}, infoOpen:{}, catClosed:{}, open:false };")

# Hook each panel into the store-backed open state.
craft_marker = """  const [qty, setQty]           = useStored(craftStore, 'qty');   // how many identical copies
"""
if craft_marker not in s: raise SystemExit('craft state marker not found')
s = s.replace(craft_marker, craft_marker + "  const [open, setOpen]         = useStored(craftStore, 'open');\n", 1)

cons_marker = """  const [status, setStatus] = useStored(consolidateStore, 'status');
"""
if cons_marker not in s: raise SystemExit('consolidate state marker not found')
s = s.replace(cons_marker, cons_marker + "  const [open, setOpen] = useStored(consolidateStore, 'open');\n", 1)

salvage_marker = """export function SalvagePanel({ character, db, onProposeDismantle, onExecuteDismantle }) {
"""
if salvage_marker not in s: raise SystemExit('salvage function marker not found')
s = s.replace(salvage_marker, salvage_marker + "  const [open, setOpen] = useStored(salvageStore, 'open');\n", 1)

# Convert only the three top-level crafting collapsibles to controlled sections.
repls = {
  '<CollapsibleSection title="🔨 CRAFTING" count={selCount || undefined} defaultOpen={true}>': '<CollapsibleSection title="🔨 CRAFTING" count={selCount || undefined} open={open} onOpenChange={setOpen}>',
  '<CollapsibleSection title="🧹 CONSOLIDATE" count={Object.keys(liveSelected).length || undefined} defaultOpen={true}>': '<CollapsibleSection title="🧹 CONSOLIDATE" count={Object.keys(liveSelected).length || undefined} open={open} onOpenChange={setOpen}>',
  '<CollapsibleSection title="🔧 SALVAGE" count={selCount || undefined} defaultOpen={false}>': '<CollapsibleSection title="🔧 SALVAGE" count={selCount || undefined} open={open} onOpenChange={setOpen}>',
}
for old_text, new_text in repls.items():
    if old_text not in s: raise SystemExit(f'top-level panel marker missing: {old_text}')
    s = s.replace(old_text, new_text, 1)

p.write_text(s)
