package com.mochiplanner.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;

/** Re-arming 1-minute alarm that checks for friend messages while the app is closed. */
public class MessageAlarmReceiver extends BroadcastReceiver {
    static final long EVERY = 60 * 1000L;

    private static PendingIntent pi(Context ctx) {
        Intent i = new Intent(ctx, MessageAlarmReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getBroadcast(ctx, 7301, i, flags);
    }

    static void schedule(Context ctx, boolean on) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent p = pi(ctx);
        if (!on) { am.cancel(p); return; }
        long at = SystemClock.elapsedRealtime() + EVERY;
        try {
            boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
            if (Build.VERSION.SDK_INT >= 23) {
                if (exact) am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, p);
                else am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, p);
            } else {
                am.setExact(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, p);
            }
        } catch (SecurityException e) {
            am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, p);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        final Context ctx = context.getApplicationContext();
        if (!MessageCheckWorker.enabled(ctx)) return;
        schedule(ctx, true); // arm the next round first
        final PendingResult pr = goAsync();
        new Thread(() -> {
            try { MessageCheckWorker.check(ctx); } finally { pr.finish(); }
        }).start();
    }
}
