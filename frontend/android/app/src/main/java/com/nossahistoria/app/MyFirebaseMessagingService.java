package com.nossahistoria.app;

import android.util.Log;
import androidx.annotation.NonNull;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFirebaseMessagingService extends MessagingService {
    private static final String TAG = "NossaHistoria.FCM";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token); // repassa o token ao Capacitor
        Log.d(TAG, "=== FCM TOKEN RECEBIDO ===");
        Log.d(TAG, "Token: " + token);
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage); // repassa a mensagem ao Capacitor
        Log.d(TAG, "Mensagem FCM recebida de: " + remoteMessage.getFrom());
    }
}
