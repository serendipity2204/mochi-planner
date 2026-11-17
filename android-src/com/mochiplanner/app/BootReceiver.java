package com.mochiplanner.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Restarts the friend-message checks after a reboot or an app update. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        MessageCheckWorker.ensure(context.getApplicationContext());
    }
}
