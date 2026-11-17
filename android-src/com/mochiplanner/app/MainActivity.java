package com.mochiplanner.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** Friend uid from a tapped message notification; read by the web app via MochiWidgets.takeOpenChat. */
    static volatile String pendingChat = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        readIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        readIntent(intent);
    }

    private void readIntent(Intent i) {
        if (i != null && i.hasExtra("openChat")) { pendingChat = i.getStringExtra("openChat"); i.removeExtra("openChat"); }
    }
}
