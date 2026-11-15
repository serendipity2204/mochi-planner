// App PIN lock: setup flow and lock screen.
import { store, commit } from './store.js';
import { t } from './i18n.js';
import { sha256 } from './utils.js';
import { pigSVG } from './pig.js';
import { toast, tap } from './ui.js';

function pad(title, sub, onComplete, { cancellable = true } = {}) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'onboard';
    el.style.justifyContent = 'center';
    let val = '';
    const draw = (shake = false) => {
      el.innerHTML = `${cancellable ? `<button class="btn ghost skip" data-k="cancel">${t('common.cancel')}</button>` : ''}
        <div>${pigSVG({ size: 96, acc: store.state.settings.pig.acc, expr: 'smile', mood: 'happy', cls: 'pig-anim' }).replace('<svg', '<svg style="margin:0 auto"')}
        <h2 style="margin-top:8px">${title}</h2><div class="muted small" style="margin-top:4px">${sub}</div>
        <div class="pin-dots ${shake ? 'shake' : ''}">${[0, 1, 2, 3].map((i) => `<i class="${i < val.length ? 'on' : ''}"></i>`).join('')}</div>
        <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}<span></span><button data-k="0">0</button><button data-k="del">⌫</button></div></div>`;
    };
    draw();
    el.addEventListener('click', async (e) => {
      const k = e.target.closest('[data-k]')?.dataset.k;
      if (!k) return;
      if (k === 'cancel') { el.remove(); resolve(null); return; }
      tap();
      if (k === 'del') val = val.slice(0, -1);
      else if (val.length < 4) val += k;
      draw();
      if (val.length === 4) {
        const ok = await onComplete(val);
        if (ok) { el.remove(); resolve(val); } else { val = ''; setTimeout(() => draw(true), 120); }
      }
    });
    document.body.appendChild(el);
  });
}

export async function setupPin() {
  const first = await pad(t('lock.setTitle'), t('lock.setSub'), async () => true);
  if (!first) return false;
  const ok = await pad(t('lock.confirmTitle'), t('lock.confirmSub'), async (v) => { if (v !== first) toast(t('lock.mismatch'), 'err'); return v === first; });
  if (!ok) return false;
  store.state.settings.security.pin = await sha256('mochi:' + first);
  commit('settings');
  toast(t('lock.set'));
  return true;
}

export async function verifyPin(title = t('lock.enter')) {
  const hash = store.state.settings.security.pin;
  if (!hash) return true;
  const r = await pad(title, t('lock.enterSub'), async (v) => (await sha256('mochi:' + v)) === hash, { cancellable: false });
  return !!r;
}

export async function verifyPinCancellable() {
  const hash = store.state.settings.security.pin;
  if (!hash) return true;
  const r = await pad(t('lock.enter'), t('lock.enterSub'), async (v) => (await sha256('mochi:' + v)) === hash);
  return !!r;
}

let locking = false;
export async function lockIfNeeded() {
  if (locking || !store.state.settings.security.pin) return;
  locking = true;
  await verifyPin();
  locking = false;
}
