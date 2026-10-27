// The title: the HTML code box in the browser, the keypad in VR, and what a code or cheat does to the next run.
// The last code you were given is remembered on this device, so you don't have to type it again.
import { useCode, describe, CHEAT_NAMES, newProgress } from '../save.js';
import { createKeypad } from './keypad.js';

const KEY = 'lastdrop-code';
const $ = id => document.getElementById(id);

/** @param {{ onStart: () => void }} o */
export function createTitle({ onStart }) {
  const T = {
    progress: newProgress(), chapter: 1, cheats: new Set(), lastCode: '',
  };
  const cheatLine = () => [...T.cheats].map(c => CHEAT_NAMES[c] || c).join(' + ');
  function submit(code) {
    const r = useCode(code, T.cheats);
    if (r.ok && r.kind === 'cheat') { if (r.on) T.cheats.add(r.cheat); else T.cheats.delete(r.cheat); }
    if (r.ok && r.kind === 'progress') { T.progress = r.progress; T.chapter = r.chapter; T.lastCode = code; remember(code); }
    keypad.K.cheats = cheatLine(); keypad.K.progress = describe(T.progress); keypad.draw();
    return r;
  }
  function remember(code) { try { localStorage.setItem(KEY, code); } catch (e) {} }
  const keypad = createKeypad({ onSubmit: submit, onStart });

  // the browser form
  const form = $('codeForm'), input = /** @type {HTMLInputElement} */ ($('code')), msg = $('codeMsg');
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const r = submit(input.value);
    msg.textContent = r.msg + (T.cheats.size ? ' · cheats: ' + cheatLine() : '');
    msg.className = r.ok ? 'ok' : 'bad';
    if (r.ok && r.kind === 'cheat') input.value = '';
  });
  // the code from last time, ready to use
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) { input.value = saved; const r = submit(saved); if (r.ok) { msg.textContent = 'Last code: ' + r.msg; msg.className = 'ok'; } }
  } catch (e) {}

  /** A chapter just ended with this new code. */
  T.gotCode = (code, progress) => { T.progress = progress; T.lastCode = code; remember(code); input.value = code; keypad.K.progress = describe(progress); keypad.K.msg = 'YOUR CODE ' + code; keypad.K.msgOk = true; keypad.draw(); };
  T.keypad = keypad;
  T.submit = submit;
  return T;
}
