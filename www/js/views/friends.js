// Friends list, friend timetable, chat (text / photo / voice / shared cards) and class reminders.
import { store, commit } from '../store.js';
import { t, fmtTime, fmtDate, weekdayShort, weekdayLong, relDay } from '../i18n.js';
import { esc, uid, dkey, addDays, startOfDay, shrinkImage, blobToDataURL } from '../utils.js';
import { on, go, rerender, openSheet, closeSheet, sheetHead, confirmDialog, toast, empty, loading, pickFiles, celebrate, currentRoute, $, errMsg } from '../ui.js';
import { pigSVG } from '../pig.js';
import * as fr from '../friends.js';
import * as cloud from '../cloud.js';
import { saveFile, isNative, playSound } from '../native.js';
import { pigProps, sortedAssignments, upcomingExams } from '../data.js';
import { APP } from '../config.js';

const S = () => store.state;
const WEB_URL = 'https://serendipity2204.github.io/mochi-planner/';

const avatar = (a, size = 46) => `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${size / 2}px">${String(a || '🐷').startsWith('data:') ? `<img src="${a}" alt="">` : esc(a || '🐷')}</div>`;

export function statusLine(uidv) {
  const s = fr.friendStatus(uidv);
  if (s.state === 'hidden') return `<span class="muted">${t('friends.st.hidden')}</span>`;
  if (s.state === 'inClass') return `<b style="color:var(--primary)">📚 ${t('friends.st.inClass')}</b> · ${esc(s.course.code || s.course.name)} ${t('friends.until', { t: fmtTime(s.course.end) })}`;
  if (s.state === 'free') return `<b style="color:var(--green)">☕ ${t('friends.st.free')}</b> · ${t('friends.nextAt', { t: fmtTime(s.next.start), c: esc(s.next.code || s.next.name) })}`;
  if (s.state === 'done') return `<span class="muted">🌙 ${t('friends.st.done')}</span>`;
  return `<span class="muted">🎈 ${t('friends.st.noClass')}</span>`;
}

// ---------------- Friends page ----------------
export function renderFriends() {
  const u = cloud.status.user;
  if (!u) {
    return `<div class="page"><div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('friends.title')}</h1></div>
      <div class="card center">${pigSVG(pigProps({ mood: 'cheer', size: 120, cls: 'pig-anim' })).replace('<svg', '<svg style="margin:0 auto"')}
      <h2 style="margin:8px 0">${t('friends.needLogin')}</h2><p class="small muted">${t('friends.needLoginBody')}</p>
      <button class="btn primary" data-act="cloud.goAccount">☁️ ${t('cloud.signInToSync')}</button></div></div>`;
  }
  if (!fr.state.ready) return `<div class="page"><div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('friends.title')}</h1></div>${loading(t('cloud.connecting'))}</div>`;
  const code = fr.state.profile?.code || '······';
  const friends = [...fr.state.friends].sort((a, b) => (fr.unreadOf(b.other) - fr.unreadOf(a.other)) || fr.nameOf(a.other).localeCompare(fr.nameOf(b.other)));
  return `<div class="page"><div class="topbar"><button class="back" data-act="back">‹</button><h1>${t('friends.title')}</h1><button class="icon-btn" data-act="friends.settings" aria-label="${t('common.settings')}">⚙️</button></div>
    <div class="grid-2">
      <div class="card"><div class="card-title">🎟️ ${t('friends.myCode')}</div>
        <div class="row"><div class="grow" style="font-size:2rem;font-weight:900;letter-spacing:6px;color:var(--primary)">${esc(code)}</div>
        <button class="btn sm" data-act="friends.copy">📋 ${t('friends.copy')}</button></div>
        <button class="btn primary block" style="margin-top:10px" data-act="friends.share">📤 ${t('friends.invite')}</button></div>
      <form class="card" id="add-friend"><div class="card-title">➕ ${t('friends.add')}</div>
        <div class="row"><input class="input grow" name="code" maxlength="8" placeholder="${esc(t('friends.codePh'))}" style="text-transform:uppercase;letter-spacing:3px;font-weight:800" autocapitalize="characters"><button class="btn primary">${t('friends.addBtn')}</button></div>
        <div class="tiny muted" style="margin-top:8px">${t('friends.addHint')}</div></form>
    </div>
    ${fr.state.requests.length ? `<div class="set-group-title">📩 ${t('friends.requests')} (${fr.state.requests.length})</div><div class="list">${fr.state.requests.map((r) => `<div class="item">${avatar(fr.avatarOf(r.other), 42)}<div class="grow"><div class="title">${esc(fr.nameOf(r.other))}</div><div class="sub">${t('friends.wantsToAdd')}</div></div><button class="btn sm" data-act="friends.decline" data-id="${r.id}">${t('friends.decline')}</button><button class="btn sm primary" data-act="friends.accept" data-id="${r.id}">${t('friends.accept')}</button></div>`).join('')}</div>` : ''}
    ${fr.state.outgoing.length ? `<div class="set-group-title">⏳ ${t('friends.outgoing')}</div><div class="list">${fr.state.outgoing.map((r) => `<div class="item">${avatar(fr.avatarOf(r.other), 36)}<div class="grow"><div class="title">${esc(fr.nameOf(r.other))}</div><div class="sub">${t('friends.waiting')}</div></div><button class="btn sm ghost" data-act="friends.cancel" data-id="${r.id}">${t('common.cancel')}</button></div>`).join('')}</div>` : ''}
    <div class="set-group-title">👫 ${t('friends.list')} (${friends.length})</div>
    ${friends.length ? `<div class="list">${friends.map((f) => {
      const sh = fr.state.shared[f.other];
      return `<div class="item" style="flex-wrap:wrap"><button data-act="friends.menu" data-uid="${f.other}" aria-label="${t('chat.more')}">${avatar(fr.avatarOf(f.other))}</button><button class="row grow" style="text-align:left;min-width:0" data-act="chat.open" data-uid="${f.other}"><div class="grow" style="min-width:0"><div class="title ellipsis">${esc(fr.nameOf(f.other))} ${fr.unreadOf(f.other) ? '<span class="badge red">●</span>' : ''}</div><div class="sub ellipsis">${statusLine(f.other)}</div></div></button>
        <div class="row" style="gap:6px">${sh?.allowReminders !== false ? `<button class="icon-btn" data-act="friends.poke" data-uid="${f.other}" aria-label="${t('friends.poke')}">🔔</button>` : ''}<button class="icon-btn" data-act="friends.menu" data-uid="${f.other}" aria-label="${t('chat.more')}">⋯</button></div></div>`;
    }).join('')}</div>` : `<div class="card">${empty(t('friends.none'))}</div>`}
  </div>`;
}

export function mountFriends(root) {
  root.querySelector('#add-friend')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inp = e.target.code; const btn = e.target.querySelector('.btn.primary'); btn.disabled = true;
    try {
      const r = await fr.addByCode(inp.value);
      toast(t(r === 'accepted' ? 'friends.nowFriends' : 'friends.requestSent')); inp.value = '';
    } catch (err) { toast(errMsg(err), 'err'); } finally { btn.disabled = false; }
  });
  const pending = sessionStorage.getItem?.('mochi-invite');
  if (pending && root.querySelector('#add-friend')) { root.querySelector('#add-friend [name=code]').value = pending; sessionStorage.removeItem('mochi-invite'); }
}

// ---------------- Friend timetable ----------------
function timetableSheet(other) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  openSheet(`${sheetHead(t('friends.ttOf', { name: fr.nameOf(other) }))}
    <div class="card" style="margin-bottom:12px">${statusLine(other)}</div>
    ${days.map((d) => {
      const list = fr.friendClassesOn(other, d);
      return `<div class="set-group-title">${relDay(d)} · ${weekdayLong(d.getDay())}</div>${list.length ? `<div class="list">${list.map((c) => `<div class="item"><span class="bar" style="background:${esc(c.color || '#EC6C9C')}"></span><div class="grow"><div class="title">${esc(c.name || c.code)}</div><div class="sub">${esc([c.code, c.location].filter(Boolean).join(' · '))}</div></div><div class="right"><b style="color:var(--text)">${fmtTime(c.start)}</b><br>${fmtTime(c.end)}</div></div>`).join('')}</div>` : `<div class="small muted" style="padding:4px 8px">${t('cal.free')}</div>`}`;
    }).join('')}
    <p class="tiny muted">${t('friends.ttNote')}</p>`);
}

// ---------------- Chat ----------------
let chatUnsub = null, chatOther = null, messages = [], recorder = null;
export function renderChat(params) {
  chatOther = params.uid;
  const sh = fr.state.shared[chatOther];
  const media = sh?.allowMedia !== false && S().settings.friends.allowMedia !== false;
  return `<div class="page chat-page">
    <div class="topbar chat-top"><button class="back" data-act="back">‹</button>${avatar(fr.avatarOf(chatOther), 40)}<div class="grow" style="min-width:0"><div class="bold ellipsis">${esc(fr.nameOf(chatOther))}</div><div class="tiny ellipsis" id="chat-status">${statusLine(chatOther)}</div></div>
      ${sh?.shareTimetable ? `<button class="icon-btn" data-act="friends.timetable" data-uid="${chatOther}">📅</button>` : ''}${sh?.allowReminders !== false ? `<button class="icon-btn" data-act="friends.poke" data-uid="${chatOther}">🔔</button>` : ''}<button class="icon-btn" data-act="friends.menu" data-uid="${chatOther}" aria-label="${t('chat.more')}">⋯</button></div>
    <div id="msgs" class="msgs">${loading()}</div>
    <form class="composer" id="composer">
      <button type="button" class="icon-btn" data-act="chat.more" aria-label="${t('chat.share')}">＋</button>
      ${media ? `<button type="button" class="icon-btn" data-act="chat.photo" aria-label="${t('chat.photo')}">📷</button>` : ''}
      <input class="input grow" name="text" placeholder="${esc(t('chat.ph'))}" autocomplete="off" maxlength="1000">
      ${media ? `<button type="button" class="icon-btn" data-act="chat.voice" aria-label="${t('chat.voice')}" id="voice-btn">🎤</button>` : ''}
      <button class="icon-btn" style="background:var(--primary);color:#fff" aria-label="${t('chat.send')}">➤</button>
    </form>
    <div id="rec-bar" class="rec-bar hidden"><span class="dot red listening"></span><b id="rec-time">0:00</b><span class="grow small muted">${t('chat.recording')}</span><button class="btn sm" data-act="chat.recCancel">${t('common.cancel')}</button><button class="btn sm primary" data-act="chat.recSend">${t('chat.send')}</button></div>
  </div>`;
}

function msgHTML(m) {
  const mine = m.from === fr.state.me;
  const time = m.clientTime ? fmtTime(new Date(m.clientTime).toTimeString().slice(0, 5)) : '';
  let body;
  switch (m.type) {
    case 'image': body = `<img src="${m.data}" class="msg-img" data-act="chat.viewImg" data-id="${m.id}" alt="">`; break;
    case 'voice': body = `<audio controls preload="none" src="${m.data}" style="max-width:220px"></audio><div class="tiny muted">🎤 ${m.dur || ''}s</div>`; break;
    case 'poke': body = `<div class="center">${pigSVG({ size: 64, mood: 'cheer', acc: 'bow' }).replace('<svg', '<svg style="margin:0 auto"')}<b>🔔 ${esc(t('friends.pokeText'))}</b></div>`; break;
    case 'card': {
      const c = m.card || {};
      const ic = { course: '📚', assignment: '📝', exam: '🎯' }[c.kind] || '📎';
      body = `<div class="msg-card"><div class="bold">${ic} ${esc(c.title || '')}</div><div class="small muted">${esc(c.sub || '')}</div>${!mine ? `<button class="btn sm" style="margin-top:6px" data-act="chat.saveCard" data-id="${m.id}">＋ ${t('chat.saveCard')}</button>` : ''}</div>`;
      break;
    }
    default: body = esc(m.text || '').replace(/\n/g, '<br>');
  }
  return `<div class="msg ${mine ? 'mine' : ''} ${m.type}" data-mid="${m.id}"><div class="bubble-msg">${body}</div><div class="msg-time">${m.edited ? `<span>${t('chat.edited')}</span>` : ''}${time}${mine ? ` <button class="msg-del" data-act="chat.msgMenu" data-id="${m.id}" aria-label="${t('chat.more')}">⋯</button>` : ''}</div></div>`;
}

function paint() {
  const box = $('#msgs'); if (!box) return;
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  let lastDay = '';
  box.innerHTML = messages.length ? messages.map((m) => {
    const d = m.clientTime ? dkey(new Date(m.clientTime)) : '';
    const sep = d && d !== lastDay ? `<div class="day-sep">${relDay(d)} · ${fmtDate(d, { short: true })}</div>` : '';
    lastDay = d || lastDay;
    return sep + msgHTML(m);
  }).join('') : empty(t('chat.empty'));
  if (atBottom || !paint.done) { box.scrollTop = box.scrollHeight; window.scrollTo(0, document.body.scrollHeight); }
  paint.done = true;
}

export function mountChat(root, params) {
  unmountChat();
  chatOther = params.uid;
  fr.state.openChat = chatOther;
  paint.done = false;
  document.body.classList.add('in-chat');
  try {
    chatUnsub = fr.listenMessages(chatOther, (list, err) => {
      if (err) { const b = $('#msgs'); if (b) b.innerHTML = `<div class="empty">${esc(errMsg(err))}</div>`; return; }
      messages = list; paint(); fr.markRead(chatOther);
    });
  } catch (e) { $('#msgs').innerHTML = `<div class="empty">${esc(errMsg(cloud.normalize(e)))}</div>`; }
  root.querySelector('#composer').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inp = e.target.text; const text = inp.value.trim(); if (!text) return;
    inp.value = '';
    try { await fr.send(chatOther, { type: 'text', text }); } catch (err) { toast(errMsg(err), 'err'); inp.value = text; }
  });
}
export function unmountChat() {
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  stopRecording(true);
  fr.state.openChat = null;
  document.body.classList.remove('in-chat');
}
export function tickChat() { const s = $('#chat-status'); if (s && chatOther) s.innerHTML = statusLine(chatOther); }

async function sendImage() {
  const [file] = await pickFiles({ accept: 'image/*', multiple: false });
  if (!file) return;
  let img = await shrinkImage(file, 1024, 0.72);
  let data = await blobToDataURL(img);
  if (data.length > 700000) { img = await shrinkImage(file, 720, 0.6); data = await blobToDataURL(img); }
  if (data.length > 900000) return toast(t('err.fileTooBig'), 'err');
  toast(t('chat.sending'));
  await fr.send(chatOther, { type: 'image', data });
}

// Voice messages (MediaRecorder, max 60 s)
let recChunks = [], recStart = 0, recTimer = null, recStream = null;
async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast(t('chat.noRecord'), 'err');
  try { recStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { return toast(t('err.micDenied'), 'err'); }
  const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
  recorder = new MediaRecorder(recStream, mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : {});
  recChunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
  recorder.start();
  recStart = Date.now();
  $('#rec-bar')?.classList.remove('hidden'); $('#composer')?.classList.add('hidden');
  recTimer = setInterval(() => {
    const s = Math.floor((Date.now() - recStart) / 1000);
    const el = $('#rec-time'); if (el) el.textContent = `0:${String(s).padStart(2, '0')}`;
    if (s >= 60) finishRecording();
  }, 250);
}
function stopRecording(cancel) {
  clearInterval(recTimer); recTimer = null;
  if (recorder && recorder.state !== 'inactive') { if (cancel) recorder.ondataavailable = null; recorder.onstop = cancel ? null : recorder.onstop; recorder.stop(); }
  recStream?.getTracks().forEach((tr) => tr.stop()); recStream = null;
  $('#rec-bar')?.classList.add('hidden'); $('#composer')?.classList.remove('hidden');
  if (cancel) recorder = null;
}
function finishRecording() {
  if (!recorder) return;
  const r = recorder;
  const dur = Math.max(1, Math.round((Date.now() - recStart) / 1000));
  r.onstop = async () => {
    const blob = new Blob(recChunks, { type: r.mimeType || 'audio/webm' });
    recorder = null;
    if (dur < 1 || !blob.size) return;
    const data = await blobToDataURL(blob);
    if (data.length > 900000) return toast(t('err.fileTooBig'), 'err');
    try { await fr.send(chatOther, { type: 'voice', data, dur }); } catch (e) { toast(errMsg(e), 'err'); }
  };
  stopRecording(false);
}

function shareCardSheet() {
  const courses = S().courses.slice(0, 30), asg = sortedAssignments().filter((a) => a.dueDate).slice(0, 20), exams = upcomingExams().slice(0, 20);
  const item = (kind, id, ic, title, sub) => `<button class="item" data-act="chat.sendCard" data-kind="${kind}" data-id="${id}"><span>${ic}</span><div class="grow"><div class="title">${esc(title)}</div><div class="sub">${esc(sub)}</div></div></button>`;
  openSheet(`${sheetHead(t('chat.share'))}
    ${courses.length ? `<div class="set-group-title">📚 ${t('search.courses')}</div><div class="list">${courses.map((c) => item('course', c.id, '📚', c.name, `${c.code || ''} ${c.days.map(weekdayShort).join(' ')} ${fmtTime(c.start)}-${fmtTime(c.end)}`)).join('')}</div>` : ''}
    ${asg.length ? `<div class="set-group-title">📝 ${t('search.assignments')}</div><div class="list">${asg.map((a) => item('assignment', a.id, '📝', a.title, `${a.course || ''} · ${t('asg.due')} ${fmtDate(a.dueDate)} ${fmtTime(a.dueTime || '23:59')}`)).join('')}</div>` : ''}
    ${exams.length ? `<div class="set-group-title">🎯 ${t('search.exams')}</div><div class="list">${exams.map((e) => item('exam', e.id, '🎯', e.course, `${fmtDate(e.date)} ${fmtTime(e.time || '09:00')} ${e.location || ''}`)).join('')}</div>` : ''}
    ${!courses.length && !asg.length && !exams.length ? empty(t('chat.nothingToShare')) : ''}`);
}

function cardFor(kind, id) {
  if (kind === 'course') {
    const c = S().courses.find((x) => x.id === id);
    return { kind, title: c.name, sub: `${c.code || ''} · ${c.days.map(weekdayShort).join(' ')} ${fmtTime(c.start)}-${fmtTime(c.end)} ${c.location || ''}`.trim(), data: { name: c.name, code: c.code, start: c.start, end: c.end, days: c.days, startDate: c.startDate, endDate: c.endDate, location: c.location, lecturer: c.lecturer } };
  }
  if (kind === 'assignment') {
    const a = S().assignments.find((x) => x.id === id);
    return { kind, title: a.title, sub: `${a.course || ''} · ${t('asg.due')} ${fmtDate(a.dueDate)} ${fmtTime(a.dueTime || '23:59')}`, data: { title: a.title, course: a.course, dueDate: a.dueDate, dueTime: a.dueTime, desc: a.desc || '', subtasks: (a.subtasks || []).map((s) => s.title) } };
  }
  const e = S().exams.find((x) => x.id === id);
  return { kind, title: e.course, sub: `${fmtDate(e.date)} ${fmtTime(e.time || '09:00')} ${e.location || ''}`.trim(), data: { course: e.course, date: e.date, time: e.time, location: e.location, notes: e.notes || '' } };
}

function saveCard(m) {
  const c = m.card; if (!c?.data) return;
  const d = c.data;
  if (c.kind === 'course') S().courses.push({ id: uid(), name: d.name || d.code, code: d.code || '', start: d.start, end: d.end, days: d.days || [], startDate: d.startDate || '', endDate: d.endDate || '', location: d.location || '', lecturer: d.lecturer || '', remind: null, color: '' });
  else if (c.kind === 'assignment') S().assignments.push({ id: uid(), title: d.title, course: d.course || '', dueDate: d.dueDate, dueTime: d.dueTime || '23:59', desc: d.desc || '', notes: '', files: [], remind: null, subtasks: (d.subtasks || []).map((s) => ({ id: uid(), title: s, done: false })), createdAt: Date.now() });
  else S().exams.push({ id: uid(), course: d.course, date: d.date, time: d.time || '09:00', location: d.location || '', notes: d.notes || '', remindDays: [...S().settings.notif.examDays], plan: [], goalHours: '' });
  commit('friend-card');
  toast(t('chat.saved'));
}

// ---------------- Poke received ----------------
export function showPoke(other) {
  if (document.querySelector('.poke-sheet')) return;
  celebrate(window.innerWidth / 2, window.innerHeight / 2, 8, ['🔔', '💗', '⏰', '✨']);
  openSheet(`<div class="center poke-sheet">${pigSVG(pigProps({ mood: 'cheer', size: 140, cls: 'pig-anim pig-jump' })).replace('<svg', '<svg style="margin:0 auto"')}
    <h2 style="margin:8px 0">🔔 ${t('friends.pokeTitle', { name: esc(fr.nameOf(other)) })}</h2><p class="muted" style="margin:0 0 14px">${t('friends.pokeBody')}</p>
    <div class="row"><button class="btn grow" data-act="sheet.close">${t('friends.gotIt')}</button><button class="btn primary grow" data-act="friends.pokeReply" data-uid="${other}">💬 ${t('friends.reply')}</button></div></div>`, { center: true, cls: 'dialog' });
}

on({
  'chat.open': (el) => { closeSheet(); go('chat', { uid: el.dataset.uid }); },
  'friends.copy': async () => { try { await navigator.clipboard.writeText(fr.state.profile?.code || ''); toast(t('friends.copied')); } catch { toast(fr.state.profile?.code || ''); } },
  'friends.share': async () => {
    const code = fr.state.profile?.code || '';
    const text = t('friends.inviteText', { code, url: `${WEB_URL}?invite=${code}`, apk: `${APP.repoUrl}/releases/latest` });
    try {
      if (isNative()) { const SH = window.Capacitor?.registerPlugin?.('Share'); await SH.share({ title: t('app.name'), text, dialogTitle: t('friends.invite') }); }
      else if (navigator.share) await navigator.share({ title: t('app.name'), text });
      else { await navigator.clipboard.writeText(text); toast(t('friends.copied')); }
    } catch (e) { if (!/cancel|abort/i.test(e?.message || e?.name || '')) toast(t('friends.copied')); }
  },
  'friends.accept': async (el) => { await fr.accept(el.dataset.id); toast(t('friends.nowFriends')); celebrate(); },
  'friends.decline': async (el) => { await fr.removeFriendship(el.dataset.id); },
  'friends.cancel': async (el) => { await fr.removeFriendship(el.dataset.id); },
  'friends.timetable': (el) => { closeSheet(); timetableSheet(el.dataset.uid); },
  'friends.poke': async (el) => {
    const other = el.dataset.uid;
    if (el.closest('.sheet')) closeSheet();
    await fr.poke(other);
    const r = el.getBoundingClientRect(); celebrate(r.left + r.width / 2, r.top, 5, ['🔔', '💗', '⏰']);
    if (S().settings.sound.app) playSound('bell', 0.25);
    toast(t('friends.poked', { name: fr.nameOf(other) }));
  },
  'friends.pokeReply': (el) => { closeSheet(); go('chat', { uid: el.dataset.uid }); },
  'friends.settings': () => go('settings', { section: 'friends' }),
  'friends.remove': async (el) => {
    if (!(await confirmDialog(t('friends.removeMsg', { name: fr.nameOf(el.dataset.uid) }), { danger: true, ok: t('friends.remove') }))) return;
    await fr.removeFriendship(el.dataset.id); toast(t('common.deleted'));
  },
  'chat.more': () => shareCardSheet(),
  'chat.sendCard': async (el) => { closeSheet(); await fr.send(chatOther, { type: 'card', card: cardFor(el.dataset.kind, el.dataset.id) }); },
  'chat.saveCard': (el) => { const m = messages.find((x) => x.id === el.dataset.id); if (m) saveCard(m); },
  'chat.photo': () => sendImage(),
  'chat.voice': () => startRecording(),
  'chat.recCancel': () => stopRecording(true),
  'chat.recSend': () => finishRecording(),
  'chat.viewImg': (el) => { const m = messages.find((x) => x.id === el.dataset.id); if (m) openSheet(`${sheetHead(t('chat.photo'))}<img src="${m.data}" style="width:100%;border-radius:16px"><div class="sheet-actions"><button class="btn" data-act="chat.saveImg" data-id="${m.id}">⬇️ ${t('file.saveShare')}</button></div>`); },
  'chat.saveImg': async (el) => { const m = messages.find((x) => x.id === el.dataset.id); if (!m) return; const blob = await (await fetch(m.data)).blob(); await saveFile(`mochi-${m.id}.jpg`, blob); },
  'friends.menu': (el) => {
    const other = el.dataset.uid, sh = fr.state.shared[other];
    const row = (ic, label, act, extra = '') => `<button class="set-row" data-act="${act}" data-uid="${other}" ${extra}><span class="ic">${ic}</span><span class="label">${label}</span><span class="chev"></span></button>`;
    openSheet(`${sheetHead(fr.nameOf(other))}<div class="center" style="margin-bottom:12px">${avatar(fr.avatarOf(other), 72).replace('class="avatar"', 'class="avatar" style="margin:0 auto"')}<div class="small" style="margin-top:8px">${statusLine(other)}</div></div>
      <div class="set-group">${row('💬', t('chat.title'), 'chat.open')}${sh?.shareTimetable ? row('📅', t('friends.timetable'), 'friends.timetable') : ''}${sh?.allowReminders !== false ? row('🔔', t('friends.poke'), 'friends.poke') : ''}</div>
      <div class="set-group">${row('✂️', `<span style="color:var(--red)">${t('friends.disconnect')}</span>`, 'friends.disconnect')}</div>`);
  },
  'friends.disconnect': async (el) => {
    const other = el.dataset.uid, f = fr.friendshipWith(other);
    if (!f) return;
    if (!(await confirmDialog(t('friends.disconnectMsg', { name: fr.nameOf(other) }), { danger: true, ok: t('friends.disconnect'), title: t('friends.disconnect') }))) return;
    await fr.removeFriendship(f.id);
    closeSheet();
    toast(t('friends.disconnected', { name: fr.nameOf(other) }));
    if (currentRoute().name === 'chat') go('friends');
  },
  'chat.msgMenu': (el) => {
    const m = messages.find((x) => x.id === el.dataset.id); if (!m) return;
    openSheet(`${sheetHead(t('chat.msgOptions'))}<div class="set-group">
      ${m.type === 'text' ? `<button class="set-row" data-act="chat.edit" data-id="${m.id}"><span class="ic">✏️</span><span class="label">${t('chat.edit')}</span></button><button class="set-row" data-act="chat.copy" data-id="${m.id}"><span class="ic">📋</span><span class="label">${t('friends.copy')}</span></button>` : ''}
      <button class="set-row" data-act="chat.del" data-id="${m.id}"><span class="ic">🗑️</span><span class="label" style="color:var(--red)">${t('common.delete')}</span></button></div>`);
  },
  'chat.copy': async (el) => { const m = messages.find((x) => x.id === el.dataset.id); closeSheet(); try { await navigator.clipboard.writeText(m?.text || ''); toast(t('friends.copied')); } catch {} },
  'chat.edit': (el) => {
    const m = messages.find((x) => x.id === el.dataset.id); if (!m) return;
    closeSheet();
    const sh = openSheet(`${sheetHead(t('chat.edit'))}<form><textarea class="input" name="text" maxlength="1000" style="min-height:110px" autofocus>${esc(m.text || '')}</textarea>
      <div class="sheet-actions"><button type="button" class="btn" data-act="sheet.close">${t('common.cancel')}</button><button class="btn primary">${t('common.save')}</button></div></form>`);
    const ta = sh.querySelector('textarea'); setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 80);
    sh.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = ta.value.trim();
      if (!text || text === m.text) { closeSheet(); return; }
      try { await fr.editMessage(chatOther, m, text); closeSheet(); toast(t('chat.editedToast')); } catch (err) { toast(errMsg(err), 'err'); }
    });
  },
  'chat.del': async (el) => { closeSheet(); if (!(await confirmDialog(t('chat.delMsg'), { danger: true, ok: t('common.delete') }))) return; await fr.deleteMessage(chatOther, el.dataset.id); },
});
