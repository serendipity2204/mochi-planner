package com.mochiplanner.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
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
}
