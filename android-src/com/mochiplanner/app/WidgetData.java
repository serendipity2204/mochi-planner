package com.mochiplanner.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/** Builds widget views from the JSON snapshot the web app stores in SharedPreferences. */
public final class WidgetData {
    static final String PREFS = "mochi_widgets";
    static final String KEY = "data";
    static final int MAX_ROWS = 5;
    static final int[] ROWS = { R.id.row0, R.id.row1, R.id.row2, R.id.row3, R.id.row4 };
    static final int[] BARS = { R.id.bar0, R.id.bar1, R.id.bar2, R.id.bar3, R.id.bar4 };
    static final int[] TITLES = { R.id.title0, R.id.title1, R.id.title2, R.id.title3, R.id.title4 };
    static final int[] SUBS = { R.id.sub0, R.id.sub1, R.id.sub2, R.id.sub3, R.id.sub4 };
    static final int[] RIGHTS = { R.id.right0, R.id.right1, R.id.right2, R.id.right3, R.id.right4 };
    static final int TEXT = 0xFF4A3540;
    static final int MUTED = 0xFFA08890;
    static final int RED = 0xFFF26D6D;
    static final int YELLOW = 0xFFF2B33D;
    static final int GREEN = 0xFF45BF86;
    static final int PINK = 0xFFEC6C9C;

    private WidgetData() {}

    static JSONObject load(Context c) {
        try {
            String s = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
            return s == null ? null : new JSONObject(s);
        } catch (Exception e) {
            return null;
        }
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, TodayWidget.class))) m.updateAppWidget(id, buildToday(c));
        for (int id : m.getAppWidgetIds(new ComponentName(c, AssignmentsWidget.class))) m.updateAppWidget(id, buildAssignments(c));
        for (int id : m.getAppWidgetIds(new ComponentName(c, TodosWidget.class))) m.updateAppWidget(id, buildTodos(c));
        for (int id : m.getAppWidgetIds(new ComponentName(c, ExamsWidget.class))) m.updateAppWidget(id, buildExams(c));
    }

    static Class<?> providerFor(String kind) {
        if ("assignments".equals(kind)) return AssignmentsWidget.class;
        if ("todos".equals(kind)) return TodosWidget.class;
        if ("exams".equals(kind)) return ExamsWidget.class;
        return TodayWidget.class;
    }

    static long startOfToday() {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    /** Whole days from today to the given local-midnight timestamp (negative = past). */
    static int daysUntil(long dayStartMs) {
        return (int) Math.round((dayStartMs - startOfToday()) / 86400000.0);
    }

    static String relDay(JSONObject d, int n) {
        if (n < 0) return label(d, "overdue", "Overdue");
        if (n == 0) return label(d, "todayShort", "Today");
        if (n == 1) return label(d, "tomorrow", "Tomorrow");
        return label(d, "daysLeft", "%dd left").replace("%d", String.valueOf(n));
    }

    static String label(JSONObject d, String k, String def) {
        JSONObject l = d == null ? null : d.optJSONObject("labels");
        return l == null ? def : l.optString(k, def);
    }

    static PendingIntent openApp(Context c, int requestCode) {
        Intent i = new Intent(c, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        // Tell the app which page to open: 1 classes, 2 assignments, 3 to-dos, 4 exams
        String[] pages = {"", "schedule", "tasks:asg", "tasks:todo", "tasks:exam"};
        if (requestCode > 0 && requestCode < pages.length) i.putExtra("openPage", pages[requestCode]);
        return PendingIntent.getActivity(c, requestCode, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static String header(JSONObject d) {
        Calendar cal = Calendar.getInstance();
        int m = cal.get(Calendar.MONTH), day = cal.get(Calendar.DAY_OF_MONTH), wd = cal.get(Calendar.DAY_OF_WEEK) - 1;
        JSONArray w = d == null ? null : d.optJSONArray("wd");
        String wds = w != null ? w.optString(wd, "") : "";
        if (d != null && "zh".equals(d.optString("lang"))) return (m + 1) + "月" + day + "日 " + wds;
        JSONArray mo = d == null ? null : d.optJSONArray("mon");
        return (wds + " " + day + " " + (mo != null ? mo.optString(m, "") : "")).trim();
    }

    static RemoteViews base(Context c, String title, JSONObject d, int requestCode) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_list);
        v.setTextViewText(R.id.w_title, title);
        v.setTextViewText(R.id.w_date, header(d));
        v.setOnClickPendingIntent(R.id.w_root, openApp(c, requestCode));
        for (int r : ROWS) v.setViewVisibility(r, View.GONE);
        v.setViewVisibility(R.id.w_more, View.GONE);
        v.setViewVisibility(R.id.w_empty, View.GONE);
        return v;
    }

    static void empty(RemoteViews v, String text) {
        v.setTextViewText(R.id.w_empty, text);
        v.setViewVisibility(R.id.w_empty, View.VISIBLE);
    }

    static String todayKey() {
        Calendar c = Calendar.getInstance();
        return String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    static int toMin(String hm) {
        try {
            String[] p = hm.split(":");
            return Integer.parseInt(p[0]) * 60 + Integer.parseInt(p[1]);
        } catch (Exception e) {
            return 0;
        }
    }

    static String fmtTime(JSONObject d, String hm) {
        if (d == null || !"12".equals(d.optString("timeFmt"))) return hm;
        int m = toMin(hm), h = m / 60, mm = m % 60;
        boolean pm = h >= 12;
        int h12 = h % 12 == 0 ? 12 : h % 12;
        return String.format(Locale.US, "%d:%02d %s", h12, mm, pm ? "PM" : "AM");
    }

    static int color(String s, int def) {
        try {
            return Color.parseColor(s);
        } catch (Exception e) {
            return def;
        }
    }

    static String join(String a, String b) {
        if (a == null || a.isEmpty()) return b == null ? "" : b;
        if (b == null || b.isEmpty()) return a;
        return a + " · " + b;
    }

    static RemoteViews buildToday(Context c) {
        JSONObject d = load(c);
        RemoteViews v = base(c, label(d, "today", "Today's classes"), d, 1);
        if (d == null) {
            empty(v, label(d, "openApp", "Open Mochi Planner once to load your data"));
            return v;
        }
        JSONObject all = d.optJSONObject("classes");
        JSONArray list = all == null ? null : all.optJSONArray(todayKey());
        if (list == null || list.length() == 0) {
            empty(v, label(d, "noClass", "No classes today"));
            return v;
        }
        Calendar now = Calendar.getInstance();
        int nm = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        List<JSONObject> items = new ArrayList<>();
        for (int i = 0; i < list.length(); i++) items.add(list.optJSONObject(i));
        // When there are more classes than rows, drop finished ones first
        while (items.size() > MAX_ROWS && toMin(items.get(0).optString("e")) <= nm) items.remove(0);
        int shown = Math.min(MAX_ROWS, items.size());
        boolean allDone = true;
        for (int i = 0; i < shown; i++) {
            JSONObject o = items.get(i);
            String s = o.optString("s"), e = o.optString("e");
            boolean past = toMin(e) <= nm;
            boolean live = toMin(s) <= nm && !past;
            if (!past) allDone = false;
            v.setViewVisibility(ROWS[i], View.VISIBLE);
            v.setInt(BARS[i], "setBackgroundColor", past ? 0xFFE0D0D6 : color(o.optString("col"), PINK));
            v.setTextViewText(TITLES[i], (live ? "▶ " : "") + o.optString("n"));
            v.setTextColor(TITLES[i], past ? MUTED : (live ? PINK : TEXT));
            v.setTextViewText(SUBS[i], join(o.optString("c"), o.optString("l")));
            v.setTextViewText(RIGHTS[i], fmtTime(d, s) + "\n" + fmtTime(d, e));
            v.setTextColor(RIGHTS[i], past ? MUTED : TEXT);
        }
        if (items.size() > shown) {
            v.setTextViewText(R.id.w_more, label(d, "more", "+%d more").replace("%d", String.valueOf(items.size() - shown)));
            v.setViewVisibility(R.id.w_more, View.VISIBLE);
        } else if (allDone) {
            v.setTextViewText(R.id.w_more, label(d, "allDone", "All classes done today"));
            v.setViewVisibility(R.id.w_more, View.VISIBLE);
        }
        return v;
    }

    static RemoteViews buildAssignments(Context c) {
        JSONObject d = load(c);
        RemoteViews v = base(c, label(d, "asg", "Assignments"), d, 2);
        if (d == null) {
            empty(v, label(d, "openApp", "Open Mochi Planner once to load your data"));
            return v;
        }
        JSONArray list = d.optJSONArray("assignments");
        if (list == null || list.length() == 0) {
            empty(v, label(d, "noAsg", "All assignments done"));
            return v;
        }
        long now = System.currentTimeMillis();
        int shown = Math.min(MAX_ROWS, list.length());
        for (int i = 0; i < shown; i++) {
            JSONObject o = list.optJSONObject(i);
            long due = o.optLong("due");
            long ms = due - now;
            String when;
            int whenColor = TEXT;
            if (ms < 0) {
                when = label(d, "overdue", "Overdue");
                whenColor = RED;
            } else if (ms < 24L * 3600000L) {
                when = label(d, "hoursLeft", "%dh left").replace("%d", String.valueOf(Math.max(1, ms / 3600000L)));
                whenColor = YELLOW;
            } else {
                when = label(d, "daysLeft", "%dd left").replace("%d", String.valueOf(ms / 86400000L));
            }
            String st = o.optString("st");
            int bar = "green".equals(st) ? GREEN : "yellow".equals(st) ? YELLOW : RED;
            v.setViewVisibility(ROWS[i], View.VISIBLE);
            v.setInt(BARS[i], "setBackgroundColor", bar);
            v.setTextViewText(TITLES[i], o.optString("t"));
            v.setTextColor(TITLES[i], TEXT);
            v.setTextViewText(SUBS[i], join(o.optString("c"), o.optInt("p") + "%"));
            v.setTextViewText(RIGHTS[i], when);
            v.setTextColor(RIGHTS[i], whenColor);
        }
        if (list.length() > shown) {
            v.setTextViewText(R.id.w_more, label(d, "more", "+%d more").replace("%d", String.valueOf(list.length() - shown)));
            v.setViewVisibility(R.id.w_more, View.VISIBLE);
        }
        return v;
    }

    static RemoteViews buildTodos(Context c) {
        JSONObject d = load(c);
        RemoteViews v = base(c, label(d, "todo", "To-do"), d, 3);
        if (d == null) {
            empty(v, label(d, "openApp", "Open Mochi Planner once to load your data"));
            return v;
        }
        JSONArray list = d.optJSONArray("todos");
        if (list == null || list.length() == 0) {
            empty(v, label(d, "noTodo", "Nothing to do"));
            return v;
        }
        int shown = Math.min(MAX_ROWS, list.length());
        for (int i = 0; i < shown; i++) {
            JSONObject o = list.optJSONObject(i);
            String pri = o.optString("pr");
            int bar = "high".equals(pri) ? RED : "low".equals(pri) ? GREEN : YELLOW;
            v.setViewVisibility(ROWS[i], View.VISIBLE);
            v.setInt(BARS[i], "setBackgroundColor", bar);
            v.setTextViewText(TITLES[i], "○ " + o.optString("t"));
            v.setTextColor(TITLES[i], TEXT);
            v.setTextViewText(SUBS[i], o.optString("pl"));
            long day = o.optLong("day", 0);
            if (day > 0) {
                int n = daysUntil(day);
                v.setTextViewText(RIGHTS[i], relDay(d, n));
                v.setTextColor(RIGHTS[i], n < 0 ? RED : n == 0 ? YELLOW : TEXT);
            } else {
                v.setTextViewText(RIGHTS[i], "");
            }
        }
        if (list.length() > shown) {
            v.setTextViewText(R.id.w_more, label(d, "more", "+%d more").replace("%d", String.valueOf(list.length() - shown)));
            v.setViewVisibility(R.id.w_more, View.VISIBLE);
        }
        return v;
    }

    static RemoteViews buildExams(Context c) {
        JSONObject d = load(c);
        RemoteViews v = base(c, label(d, "exam", "Exams"), d, 4);
        if (d == null) {
            empty(v, label(d, "openApp", "Open Mochi Planner once to load your data"));
            return v;
        }
        JSONArray all = d.optJSONArray("exams");
        List<JSONObject> list = new ArrayList<>();
        long now = System.currentTimeMillis();
        if (all != null) {
            for (int i = 0; i < all.length(); i++) {
                JSONObject o = all.optJSONObject(i);
                if (o != null && o.optLong("at") > now - 3L * 3600000L) list.add(o);
            }
        }
        if (list.isEmpty()) {
            empty(v, label(d, "noExam", "No upcoming exams"));
            return v;
        }
        int shown = Math.min(MAX_ROWS, list.size());
        for (int i = 0; i < shown; i++) {
            JSONObject o = list.get(i);
            int n = daysUntil(o.optLong("day"));
            v.setViewVisibility(ROWS[i], View.VISIBLE);
            v.setInt(BARS[i], "setBackgroundColor", n <= 3 ? RED : PINK);
            v.setTextViewText(TITLES[i], o.optString("t"));
            v.setTextColor(TITLES[i], TEXT);
            v.setTextViewText(SUBS[i], o.optString("w"));
            String right = n <= 0 ? label(d, "todayShort", "Today") : label(d, "examDays", "%d days").replace("%d", String.valueOf(n));
            v.setTextViewText(RIGHTS[i], right);
            v.setTextColor(RIGHTS[i], n <= 3 ? RED : PINK);
        }
        if (list.size() > shown) {
            v.setTextViewText(R.id.w_more, label(d, "more", "+%d more").replace("%d", String.valueOf(list.size() - shown)));
            v.setViewVisibility(R.id.w_more, View.VISIBLE);
        }
        return v;
    }
}
