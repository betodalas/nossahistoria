package com.nossahistoria.app;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FcmTokenPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
