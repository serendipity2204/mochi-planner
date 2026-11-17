package com.mochiplanner.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;

/** Optional "fast mode": a foreground service that checks for friend messages every 20 seconds. */
public class MessageService extends Service {
    static final String CHANNEL = "mochi_watch";
    static final int NOTIF_ID = 7302;
    static final long EVERY = 20 * 1000L;
    private HandlerThread thread;
    private Handler handler;

    static void start(Context ctx) {
        try {
            Intent i = new Intent(ctx, MessageService.class);
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i); else ctx.startService(i);
        } catch (Exception ignored) { } // not allowed from the background on some versions; retried when the app opens
    }

    static void stop(Context ctx) {
        try { ctx.stopService(new Intent(ctx, MessageService.class)); } catch (Exception ignored) { }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        thread = new HandlerThread("mochi-msgs");
        thread.start();
        handler = new Handler(thread.getLooper());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification n = buildNotification();
        try {
            if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            else startForeground(NOTIF_ID, n);
        } catch (Exception e) { stopSelf(); return START_NOT_STICKY; }
        if (!MessageCheckWorker.instant(this)) { stopSelf(); return START_NOT_STICKY; }
        handler.removeCallbacksAndMessages(null);
        handler.post(loop);
        return START_STICKY;
    }

    private final Runnable loop = new Runnable() {
        @Override public void run() {
            Context ctx = getApplicationContext();
            if (!MessageCheckWorker.instant(ctx)) { stopSelf(); return; }
            MessageCheckWorker.check(ctx);
            handler.postDelayed(this, EVERY);
        }
    };

    private Notification buildNotification() {
        SharedPreferences p = getSharedPreferences(MessageCheckWorker.PREFS, Context.MODE_PRIVATE);
        String title = "Mochi", text = "", chName = "Message watch";
        try {
            JSONObject l = new JSONObject(p.getString("labels", "{}"));
            title = l.optString("watchTitle", title); text = l.optString("watchText", text); chName = l.optString("watchChannel", chName);
        } catch (Exception ignored) { }
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, chName, NotificationManager.IMPORTANCE_MIN);
                ch.setShowBadge(false);
                nm.createNotificationChannel(ch);
            }
        }
        Intent open = new Intent(this, MainActivity.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        int icon = getResources().getIdentifier("ic_stat_mochi", "drawable", getPackageName());
        if (icon == 0) icon = getApplicationInfo().icon;
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(icon).setContentTitle(title).setContentText(text)
            .setOngoing(true).setShowWhen(false).setColor(0xFFEC6F9B)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setContentIntent(PendingIntent.getActivity(this, 7303, open, flags))
            .build();
    }

    @Override
    public void onDestroy() {
        if (handler != null) handler.removeCallbacksAndMessages(null);
        if (thread != null) thread.quitSafely();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
