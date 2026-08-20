from pathlib import Path

p = Path('src/App.jsx')
s = p.read_text()

old = """      let finalText = dmText;
      let finalRoll = actionRoll || skillRoll || null;
      let rollSetupText = '';
"""
new = """      let finalText = dmText;
      // Player-initiated attacks belong on the final DM response. A DM-requested
      // roll belongs on the setup message that actually requested it; attaching
      // it only to the second narration response made those rolls easy to lose.
      let finalRoll = actionRoll || null;
      let rollSetupText = '';
"""
if s.count(old) != 1:
    raise SystemExit(f'Expected one finalRoll anchor, found {s.count(old)}')
s = s.replace(old, new, 1)

old2 = """        if (setupText) {
          rollSetupText = setupText;
          addMessage({ role:'dm', text: setupText, id: Date.now() - 1, roll: null });
        }
"""
new2 = """        if (setupText) {
          rollSetupText = setupText;
          // Surface the resolved roll on the exact message that called for it.
          // This uses the same msg.roll field DiceRollDisplay already renders.
          addMessage({ role:'dm', text: setupText, id: Date.now() - 1, roll: skillRoll || null });
        } else if (skillRoll) {
          // A bare [ROLL:] response has no visible setup text, so preserve the
          // result on the follow-up narration instead of dropping it entirely.
          finalRoll = skillRoll;
        }
"""
if s.count(old2) != 1:
    raise SystemExit(f'Expected one setup-message anchor, found {s.count(old2)}')
s = s.replace(old2, new2, 1)

p.write_text(s)
print('Attached DM-requested rolls to their setup messages')
