// Dashboard: date, pig status, next class countdown, today's classes, assignments, exams, focus, to-dos.
import { peekPig } from '../icons.js';
import { store, commit } from '../store.js';
import { t, fmtTime, fmtDate, relDay, weekdayLong, fmtCountdown, fmtDuration, lang } from '../i18n.js';
import { esc, dkey } from '../utils.js';
import { on, go, rerender, empty, ring, sheetOpen, celebrate, tap } from '../ui.js';
import { pigSVG } from '../pig.js';
import { pigProps, pigMood, nextClass, classesOn, courseColor, pendingAssignments, urgency, assignmentStatus, assignmentProgress, upcomingExams, examDaysLeft, focusOn, streak, sortedTodos } from '../data.js';
import { encouragement, pigName } from './focus.js';
import { avatarHTML } from './me.js';
import * as fr from '../friends.js';
import { status as cloudStatus } from '../cloud.js';
import { statusLine } from './friends.js';
import { reschedule } from '../reminders.js';

const S = () => store.state;

function greeting() {
  const h = new Date().getHours();
  const k = h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  return t('greet.' + k, { name: S().profile.name || t('greet.friend') });
}
function moodMessage() {
  const m = pigMood();
  const overdue = pendingAssignments().filter((a) => urgency(a) === 'overdue').length;
  if (m === 'worried') return t('mood.worried', { n: overdue });
  if (m === 'sleep') return t('mood.sleep');
  if (m === 'focus') return t('mood.focus');
  if (m === 'cheer') return t('mood.cheer');
  if (m === 'proud') return t('mood.proud', { n: streak() });
  return encouragement();
}

const SECTIONS = {
  friends() {
    if (!cloudStatus.user || !fr.state.ready) return '';
    const list = fr.state.friends.slice(0, 4);
    return `<div class="card"><div class="card-title"><span class="grow">👫 ${t('friends.title')}${fr.state.requests.length ? ` <span class="badge red">${fr.state.requests.length}</span>` : ''}</span><button class="link" data-act="nav" data-to="friends">${t('common.viewAll')}</button></div>
      ${list.length ? `<div class="list">${list.map((f) => `<div class="item"><button class="row grow" style="text-align:left;min-width:0" data-act="chat.open" data-uid="${f.other}"><div class="avatar" style="width:38px;height:38px;font-size:19px">${String(fr.avatarOf(f.other)).startsWith('data:') ? `<img src="${fr.avatarOf(f.other)}" alt="">` : esc(fr.avatarOf(f.other))}</div><div class="grow" style="min-width:0"><div class="title ellipsis">${esc(fr.nameOf(f.other))} ${fr.unreadOf(f.other) ? '<span class="badge red">●</span>' : ''}</div><div class="sub ellipsis">${statusLine(f.other)}</div></div></button>${fr.state.shared[f.other]?.allowReminders !== false ? `<button class="icon-btn" data-act="friends.poke" data-uid="${f.other}">🔔</button>` : ''}</div>`).join('')}</div>`
        : `<div class="empty">${t('friends.homeEmpty')}</div><button class="btn sm block" data-act="nav" data-to="friends">➕ ${t('friends.add')}</button>`}</div>`;
  },
  next() {
    const n = nextClass();
    if (!n) return `<div class="card next-card"><div class="muted small bold">${t('home.nextClass')}</div><div class="bold" style="font-size:1.15rem;margin-top:4px">${S().courses.length ? t('home.noMoreClasses') : t('home.noCourses')}</div>
      ${S().courses.length ? '' : `<button class="btn sm" style="margin-top:10px;background:#fff;color:var(--primary-ink)" data-act="course.add">＋ ${t('course.add')}</button>`}</div>`;
    const c = n.course;
    const ms = n.ongoing ? n.end - Date.now() : n.start - Date.now();
    return `<button class="card next-card" style="width:100%;text-align:left" data-act="course.open" data-id="${c.id}">
      <div class="row"><div class="grow"><div class="muted small bold">${n.ongoing ? t('home.inClass') : t('home.nextClass')}</div>
        <div class="bold ellipsis" style="font-size:1.2rem;margin-top:2px">${esc(c.name)}</div>
        <div class="small muted">${esc([c.code, c.location].filter(Boolean).join(' · '))}</div>
        <div class="small" style="margin-top:4px">${relDay(n.start)} ${fmtTime(c.start)} – ${fmtTime(c.end)}</div></div>
        <div style="text-align:right"><div class="small muted bold">${n.ongoing ? t('home.endsIn') : t('home.startsIn')}</div><div class="count" data-cd="${n.ongoing ? n.end.getTime() : n.start.getTime()}">${fmtCountdown(ms)}</div></div></div></button>`;
  },
  today() {
    const list = classesOn(new Date());
    const now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
    return `<div class="card"><div class="card-title"><span class="grow">📚 ${t('home.todayClasses')}</span><button class="link" data-act="nav" data-to="schedule">${t('common.viewAll')}</button></div>
      ${list.length ? `<div class="list">${list.map((c) => { const [sh, sm] = c.start.split(':').map(Number), [eh, em] = c.end.split(':').map(Number); const past = eh * 60 + em < nm, live = sh * 60 + sm <= nm && !past; return `<button class="item ${past ? 'done' : ''}" data-act="course.open" data-id="${c.id}"><span class="bar" style="background:${courseColor(c)}"></span><div class="grow"><div class="title ellipsis">${esc(c.name)}</div><div class="sub ellipsis">${esc([c.code, c.type ? t('course.type.' + c.type) : '', c.location].filter(Boolean).join(' · '))}</div></div><div class="right">${live ? `<span class="badge">${t('home.now')}</span><br>` : ''}${fmtTime(c.start)}<br>${fmtTime(c.end)}</div></button>`; }).join('')}</div>` : `<div class="empty">${t('home.noClassToday')}</div>`}</div>`;
  },
  focus() {
    const today = focusOn(new Date()), goal = S().settings.focus.dailyGoal;
    return `<div class="card has-peek">${peekPig()}<div class="card-title"><span class="grow">⏱️ ${t('home.focusToday')}</span><button class="link" data-act="nav" data-to="stats">${t('nav.stats')}</button></div>
      <div class="row" style="gap:16px">${ring(goal ? today / goal : 0, 78, 9, 'var(--primary)', `<div>${Math.round(goal ? Math.min(100, today / goal * 100) : 0)}%</div>`)}
      <div class="grow"><div class="bold">${fmtDuration(today)} <span class="muted small">/ ${fmtDuration(goal)}</span></div><div class="small muted">🔥 ${t('home.streakDays', { n: streak() })}</div>
      <button class="btn sm primary" style="margin-top:8px" data-act="nav" data-to="focus">▶ ${S().timer.running ? t('home.timerRunning') : t('focus.start')}</button></div></div></div>`;
  },
  assignments() {
    const list = pendingAssignments().slice(0, 4);
    return `<div class="card"><div class="card-title"><span class="grow">📝 ${t('home.dueSoon')}</span><button class="link" data-act="nav" data-to="tasks" data-tab="asg">${t('common.viewAll')}</button></div>
      ${list.length ? `<div class="list">${list.map((a) => { const u = urgency(a); return `<button class="item ${u}" data-act="asg.open" data-id="${a.id}"><span class="dot ${assignmentStatus(a)}"></span><div class="grow"><div class="title ellipsis">${esc(a.title)}</div><div class="sub">${a.course ? esc(a.course) + ' · ' : ''}${u === 'overdue' ? `<b style="color:var(--red)">${t('asg.overdue')}</b>` : relDay(a.dueDate) + ' ' + fmtTime(a.dueTime || '23:59')}</div></div><div class="right">${Math.round(assignmentProgress(a) * 100)}%</div></button>`; }).join('')}</div>` : `<div class="empty">${t('home.noAssignments')}</div>`}</div>`;
  },
  exams() {
    const list = upcomingExams().slice(0, 3);
    return `<div class="card"><div class="card-title"><span class="grow">🎯 ${t('home.upcomingExams')}</span><button class="link" data-act="nav" data-to="tasks" data-tab="exam">${t('common.viewAll')}</button></div>
      ${list.length ? `<div class="list">${list.map((e) => { const n = examDaysLeft(e); return `<button class="item" data-act="exam.open" data-id="${e.id}"><div class="grow"><div class="title ellipsis">${esc(e.course)}</div><div class="sub">${fmtDate(e.date, { short: true })} ${fmtTime(e.time || '09:00')}</div></div><div class="right"><b style="font-size:1.3rem;color:${n <= 3 ? 'var(--red)' : 'var(--primary)'}">${n <= 0 ? t('exam.today') : n}</b>${n > 0 ? `<br>${t('exam.daysLeft')}` : ''}</div></button>`; }).join('')}</div>` : `<div class="empty">${t('home.noExams')}</div>`}</div>`;
  },
  todos() {
    const list = sortedTodos().filter((x) => !x.done).slice(0, 5);
    return `<div class="card"><div class="card-title"><span class="grow">✅ ${t('home.todos')}</span><button class="link" data-act="nav" data-to="tasks" data-tab="todo">${t('common.viewAll')}</button></div>
      ${list.length ? `<div class="list">${list.map((x) => `<div class="item"><button class="check round" data-act="todo.toggle" data-id="${x.id}">✓</button><div class="grow"><div class="title ellipsis">${esc(x.title)}</div>${x.due ? `<div class="sub">${relDay(x.due)}</div>` : ''}</div><span class="pri-${x.priority}">●</span></div>`).join('')}</div>` : `<div class="empty">${t('home.noTodos')}</div>`}
      <button class="btn sm block" style="margin-top:10px" data-act="todo.add">＋ ${t('todo.add')}</button></div>`;
  },
};
export const SECTION_IDS = Object.keys(SECTIONS);

export function render() {
  const d = new Date();
  const h = S().settings.home;
  const order = [...h.sections.filter((s) => SECTIONS[s]), ...SECTION_IDS.filter((s) => !h.sections.includes(s))].filter((s) => !h.hidden.includes(s));
  const dateStr = lang() === 'zh' ? `${d.getMonth() + 1}月${d.getDate()}日` : fmtDate(d, { short: true });
  return `<div class="page">
    <div class="topbar" style="min-height:40px;margin-bottom:0"><button class="me-chip grow" data-act="tab" data-to="me" aria-label="${esc(t('nav.me'))}">${avatarHTML(36)}<span class="small muted bold ellipsis">${esc(greeting())}</span></button>
      <button class="icon-btn" data-act="nav" data-to="search" aria-label="${t('nav.search')}">🔍</button><button class="icon-btn" data-act="nav" data-to="settings" aria-label="${t('common.settings')}">⚙️</button></div>
    <div class="hero">
      <div class="pig-box" data-act="pig.poke">${pigSVG(pigProps({ size: 104, cls: 'pig-anim' }))}</div>
      <div class="grow"><div class="date-big">${dateStr} <span style="color:var(--primary-ink)">${weekdayLong(d.getDay())}</span></div>
        <div class="bubble" style="margin-top:8px;margin-left:8px" id="home-msg">${esc(moodMessage())}</div>
        <div class="tiny muted bold" style="margin:6px 0 0 10px">— ${esc(pigName())}</div></div>
    </div>
    <div class="masonry" style="margin-top:8px">${order.map((s) => SECTIONS[s]()).join('')}</div>
  </div>`;
}

let lastMin = -1;
export function tick() {
  for (const el of document.querySelectorAll('[data-cd]')) el.textContent = fmtCountdown(+el.dataset.cd - Date.now());
  const m = new Date().getMinutes();
  if (lastMin !== -1 && m !== lastMin && !sheetOpen() && !document.activeElement?.matches('input,textarea')) rerender();
  lastMin = m;
}

on({ nav: (el) => go(el.dataset.to, el.dataset.tab ? { tab: el.dataset.tab } : {}) });
