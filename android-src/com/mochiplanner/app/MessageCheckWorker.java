package com.mochiplanner.app;

import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Checks Firestore for new friend messages while the app is closed and shows a notification.
 * Runs about every 15 minutes (Android's minimum for background work). No server needed:
 * it signs in with the user's Firebase refresh token and reads chats/{a_b} documents via REST.
 */
public class MessageCheckWorker extends Worker {
    static final String PREFS = "mochi_msgs";
    static final String WORK = "mochi_msg_check";
    static final String CHANNEL = "mochi_friends";

    public MessageCheckWorker(@NonNull Context c, @NonNull WorkerParameters p) { super(c, p); }

    static void schedule(Context ctx, boolean on) {
        WorkManager wm = WorkManager.getInstance(ctx);
        if (!on) { wm.cancelUniqueWork(WORK); return; }
        Constraints cons = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(MessageCheckWorker.class, 15, TimeUnit.MINUTES)
            .setConstraints(cons).build();
        wm.enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP, req);
    }

    @NonNull @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!p.getBoolean("enabled", false)) return Result.success();
        if (appInForeground(ctx)) return Result.success(); // the app shows its own alerts
        String uid = p.getString("uid", ""), rt = p.getString("refreshToken", ""), key = p.getString("apiKey", ""), proj = p.getString("projectId", "");
        if (uid.isEmpty() || rt.isEmpty() || key.isEmpty() || proj.isEmpty()) return Result.success();
        try {
            // 1. Refresh token -> ID token
            JSONObject tok = new JSONObject(http("https://securetoken.googleapis.com/v1/token?key=" + key, "POST",
                "application/x-www-form-urlencoded", "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(rt, "UTF-8"), null, ctx));
            String idToken = tok.optString("id_token", "");
            if (idToken.isEmpty()) return Result.success();
            String newRt = tok.optString("refresh_token", "");
            if (!newRt.isEmpty() && !newRt.equals(rt)) p.edit().putString("refreshToken", newRt).apply();

            // 2. Chats that include me
            JSONObject q = new JSONObject().put("structuredQuery", new JSONObject()
                .put("from", new JSONArray().put(new JSONObject().put("collectionId", "chats")))
                .put("where", new JSONObject().put("fieldFilter", new JSONObject()
                    .put("field", new JSONObject().put("fieldPath", "users"))
                    .put("op", "ARRAY_CONTAINS")
                    .put("value", new JSONObject().put("stringValue", uid)))));
            String res = http("https://firestore.googleapis.com/v1/projects/" + proj + "/databases/(default)/documents:runQuery",
                "POST", "application/json", q.toString(), idToken, ctx);
            JSONArray rows = new JSONArray(res);

            JSONObject notified = new JSONObject(p.getString("notified", "{}"));
            JSONObject names = new JSONObject(p.getString("names", "{}"));
            JSONObject labels = new JSONObject(p.getString("labels", "{}"));
            boolean changed = false;
            for (int i = 0; i < rows.length(); i++) {
                JSONObject doc = rows.getJSONObject(i).optJSONObject("document");
                if (doc == null) continue;
                String name = doc.optString("name", "");
                String chatId = name.substring(name.lastIndexOf('/') + 1);
                JSONObject f = doc.optJSONObject("fields");
                if (f == null) continue;
                JSONObject last = map(f.optJSONObject("last"));
                if (last == null) continue;
                String from = str(last.optJSONObject("from"));
                long at = num(last.optJSONObject("at"));
                if (from.isEmpty() || from.equals(uid) || at <= 0) continue;
                JSONObject read = map(f.optJSONObject("read"));
                long readAt = read == null ? 0 : num(read.optJSONObject(uid));
                if (at <= readAt || at <= notified.optLong(chatId, 0)) continue;
                notified.put(chatId, at); changed = true;
                String who = names.optString(from, labels.optString("friend", "Friend"));
                String type = str(last.optJSONObject("type"));
                String title = who, body = str(last.optJSONObject("text"));
                if ("poke".equals(type)) { title = labels.optString("poke", "{name}").replace("{name}", who); body = labels.optString("pokeBody", body); }
                if (body.isEmpty()) body = labels.optString("newMsg", "New message");
                show(ctx, chatId.hashCode(), title, body, from, labels.optString("channel", "Friends"));
            }
            if (changed) p.edit().putString("notified", notified.toString()).apply();
        } catch (Exception e) {
            return Result.success(); // try again next round
        }
        return Result.success();
    }

    private static JSONObject map(JSONObject v) { return v == null || v.optJSONObject("mapValue") == null ? null : v.optJSONObject("mapValue").optJSONObject("fields"); }
    private static String str(JSONObject v) { return v == null ? "" : v.optString("stringValue", ""); }
    private static long num(JSONObject v) {
        if (v == null) return 0;
        if (v.has("integerValue")) { try { return Long.parseLong(v.optString("integerValue", "0")); } catch (Exception e) { return 0; } }
        if (v.has("doubleValue")) return (long) v.optDouble("doubleValue", 0);
        return 0;
    }

    private static boolean appInForeground(Context ctx) {
        ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
        List<ActivityManager.RunningAppProcessInfo> list = am == null ? null : am.getRunningAppProcesses();
        if (list == null) return false;
        for (ActivityManager.RunningAppProcessInfo pi : list) {
            if (pi.processName.equals(ctx.getPackageName()) && pi.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) return true;
        }
        return false;
    }

    static void show(Context ctx, int id, String title, String body, String fromUid, String channelName) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            if (nm != null && nm.getNotificationChannel(CHANNEL) == null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, channelName, NotificationManager.IMPORTANCE_HIGH);
                nm.createNotificationChannel(ch);
            }
        }
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtra("openChat", fromUid);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getActivity(ctx, id, open, flags);
        int icon = ctx.getResources().getIdentifier("ic_stat_mochi", "drawable", ctx.getPackageName());
        if (icon == 0) icon = ctx.getApplicationInfo().icon;
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(icon).setContentTitle(title).setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setColor(0xFFEC6F9B).setAutoCancel(true).setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_HIGH).setCategory(NotificationCompat.CATEGORY_MESSAGE);
        try { NotificationManagerCompat.from(ctx).notify(id, b.build()); } catch (SecurityException ignored) { }
    }

    private static String http(String url, String method, String ctype, String body, String bearer, Context ctx) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(15000); c.setReadTimeout(20000);
        c.setRequestProperty("Content-Type", ctype);
        c.setRequestProperty("X-Android-Package", ctx.getPackageName());
        if (bearer != null) c.setRequestProperty("Authorization", "Bearer " + bearer);
        if (body != null) {
            c.setDoOutput(true);
            try (OutputStream os = c.getOutputStream()) { os.write(body.getBytes("UTF-8")); }
        }
        int code = c.getResponseCode();
        InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
        StringBuilder sb = new StringBuilder();
        if (in != null) try (BufferedReader r = new BufferedReader(new InputStreamReader(in, "UTF-8"))) { String l; while ((l = r.readLine()) != null) sb.append(l); }
        if (code >= 400) throw new Exception("HTTP " + code + " " + sb);
        return sb.toString();
    }
}
