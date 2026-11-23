package com.mochiplanner.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONObject;
import java.util.Iterator;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Bridge used by the web app to push widget data and pin widgets to the home screen. */
@CapacitorPlugin(name = "MochiWidgets")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("missing data");
            return;
        }
        Context ctx = getContext();
        ctx.getSharedPreferences(WidgetData.PREFS, Context.MODE_PRIVATE).edit().putString(WidgetData.KEY, data).apply();
        WidgetData.refreshAll(ctx);
        call.resolve();
    }

    @PluginMethod
    public void isPinSupported(PluginCall call) {
        JSObject r = new JSObject();
        boolean ok = false;
        if (Build.VERSION.SDK_INT >= 26) {
            ok = AppWidgetManager.getInstance(getContext()).isRequestPinAppWidgetSupported();
        }
        r.put("supported", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void pin(PluginCall call) {
        String kind = call.getString("kind", "today");
        JSObject r = new JSObject();
        boolean ok = false;
        if (Build.VERSION.SDK_INT >= 26) {
            AppWidgetManager m = AppWidgetManager.getInstance(getContext());
            if (m.isRequestPinAppWidgetSupported()) {
                Class<?> c = WidgetData.providerFor(kind);
                ok = m.requestPinAppWidget(new ComponentName(getContext(), c), null, null);
            }
        }
        r.put("requested", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void count(PluginCall call) {
        AppWidgetManager m = AppWidgetManager.getInstance(getContext());
        JSObject r = new JSObject();
        r.put("today", m.getAppWidgetIds(new ComponentName(getContext(), TodayWidget.class)).length);
        r.put("assignments", m.getAppWidgetIds(new ComponentName(getContext(), AssignmentsWidget.class)).length);
        r.put("todos", m.getAppWidgetIds(new ComponentName(getContext(), TodosWidget.class)).length);
        r.put("exams", m.getAppWidgetIds(new ComponentName(getContext(), ExamsWidget.class)).length);
        call.resolve(r);
    }

    /** Stores what the background message checker needs (or turns it off). */
    @PluginMethod
    public void configureMessages(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences p = ctx.getSharedPreferences(MessageCheckWorker.PREFS, Context.MODE_PRIVATE);
        boolean on = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        SharedPreferences.Editor e = p.edit().putBoolean("enabled", on).putBoolean("instant", Boolean.TRUE.equals(call.getBoolean("instant", false)));
        if (on) {
            String uid = call.getString("uid", "");
            if (!uid.equals(p.getString("uid", ""))) e.putString("notified", "{}").remove("idToken");
            e.putString("uid", uid)
             .putString("apiKey", call.getString("apiKey", ""))
             .putString("projectId", call.getString("projectId", ""))
             .putString("names", call.getString("names", "{}"))
             .putString("labels", call.getString("labels", "{}"));
            String rt = call.getString("refreshToken", "");
            if (!rt.isEmpty() && !rt.equals(p.getString("refreshToken", ""))) e.putString("refreshToken", rt).remove("idToken");
            e.apply();
            mergeNotified(p, call.getString("notified", "{}"));
        } else {
            e.remove("refreshToken").remove("uid").remove("idToken").apply();
        }
        MessageCheckWorker.ensure(ctx);
        call.resolve();
    }

    /** The app already alerted about this chat message, so the background checker should not repeat it. */
    @PluginMethod
    public void msgSeen(PluginCall call) {
        SharedPreferences p = getContext().getSharedPreferences(MessageCheckWorker.PREFS, Context.MODE_PRIVATE);
        try {
            JSONObject o = new JSONObject();
            o.put(call.getString("chat", ""), call.getDouble("at", 0d).longValue());
            mergeNotified(p, o.toString());
        } catch (Exception ignored) { }
        call.resolve();
    }

    /** Returns (once) the friend uid whose notification opened the app. */
    @PluginMethod
    public void takeOpenChat(PluginCall call) {
        JSObject r = new JSObject();
        r.put("uid", MainActivity.pendingChat);
        r.put("page", MainActivity.pendingPage);
        MainActivity.pendingChat = null;
        MainActivity.pendingPage = null;
        call.resolve(r);
    }

    private static synchronized void mergeNotified(SharedPreferences p, String json) {
        try {
            JSONObject cur = new JSONObject(p.getString("notified", "{}"));
            JSONObject add = new JSONObject(json);
            Iterator<String> it = add.keys();
            while (it.hasNext()) { String k = it.next(); long v = add.optLong(k, 0); if (v > cur.optLong(k, 0)) cur.put(k, v); }
            p.edit().putString("notified", cur.toString()).apply();
        } catch (Exception ignored) { }
    }
}
