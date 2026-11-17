// Build & schedule all local notifications from the current state.
import { store } from './store.js';
import { t, fmtTime, fmtDate } from './i18n.js';
import { dkey, addDays, startOfDay, at, toMin, hashStr, debounce } from './utils.js';
import { classesOn, isComplete, dueAt, examAt } from './data.js';
import { scheduleNotifications } from './native.js';

const HORIZON_DAYS = 14;

function inDND(date, n) {
  if (!n.dnd) return false;
  const m = date.getHours() * 60 + date.getMinutes();
  const s = toMin(n.dndStart), e = toMin(n.dndEnd);
  return s <= e ? m >= s && m < e : m >= s || m < e;
}

export function buildReminders(now = new Date()) {
  const st = store.state, n = st.settings.notif;
  if (!n.enabled) return [];
  const out = [];
  const end = addDays(now, HORIZON_DAYS);
  const push = (key, when, title, body, cat) => {
    if (!when || when <= now || when > end) return;
    if (inDND(when, n) && cat !== 'pomodoro') return;
    out.push({ id: hashStr(key) % 2000000000, at: when.getTime(), title, body });
  };

  if (n.class) {
    for (let i = 0; i <= HORIZON_DAYS; i++) {
      const d = addDays(startOfDay(now), i);
      for (const c of classesOn(d)) {
        const lead = Number(c.remind ?? n.classLead);
        if (lead < 0) continue;
        const s = at(dkey(d), c.start);
        push(`c|${c.id}|${c.sid || ''}|${dkey(d)}`, new Date(s - lead * 60000), t('notif.classTitle', { name: c.name || c.code }),
          t('notif.classBody', { time: fmtTime(c.start), loc: c.location || '-', min: lead }), 'class');
      }
    }
  }
  if (n.assignment) {
    for (const a of st.assignments) {
      if (isComplete(a) || !a.dueDate) continue;
      const due = dueAt(a);
      const lead = Number(a.remind ?? n.assignmentLead);
      push(`a|${a.id}|lead`, new Date(due - lead * 60000), t('notif.asgTitle', { title: a.title }), t('notif.asgBody', { when: fmtDate(a.dueDate) + ' ' + fmtTime(a.dueTime || '23:59') }), 'assignment');
      if (lead > 120) push(`a|${a.id}|1h`, new Date(due - 3600000), t('notif.asgTitle', { title: a.title }), t('notif.asgSoon'), 'assignment');
    }
  }
  if (n.exam || n.review) {
    for (const e of st.exams) {
      const ex = examAt(e);
      if (n.exam) {
        for (const d of e.remindDays || n.examDays) {
          push(`e|${e.id}|${d}`, at(dkey(addDays(ex, -d)), n.reviewTime), t('notif.examTitle', { name: e.course, n: d }), t('notif.examBody'), 'exam');
        }
        push(`e|${e.id}|day`, new Date(ex - 2 * 3600000), t('notif.examTodayTitle', { name: e.course }), t('notif.examTodayBody', { time: fmtTime(e.time || '09:00'), loc: e.location || '-' }), 'exam');
      }
      if (n.review) {
        for (const p of e.plan || []) {
          if (p.done || !p.date) continue;
          push(`p|${p.id}`, at(p.date, n.reviewTime), t('notif.reviewTitle', { name: e.course }), p.title, 'review');
        }
      }
    }
  }
  if (n.todo) {
    for (const td of st.todos) {
      if (td.done || !td.due) continue;
      push(`t|${td.id}`, at(td.due, '09:00'), t('notif.todoTitle'), td.title, 'todo');
    }
  }
  if (n.pomodoro && st.timer.running && st.timer.endAt) {
    push(`timer|${st.timer.endAt}`, new Date(st.timer.endAt), st.timer.mode === 'focus' ? t('notif.focusDone') : t('notif.breakDone'),
      st.timer.mode === 'focus' ? t('notif.focusDoneBody') : t('notif.breakDoneBody'), 'pomodoro');
  }
  return out;
}

const channelNames = () => ({ chime: t('sound.chime'), bell: t('sound.bell'), bubble: t('sound.bubble'), piano: t('sound.piano'), none: t('sound.none') });

export const reschedule = debounce(() => {
  scheduleNotifications(buildReminders(), store.state.settings.notif.sound, channelNames()).catch((e) => console.warn(e));
}, 700);
