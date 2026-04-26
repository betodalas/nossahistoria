package com.nossahistoria.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "NossaHistoria.FCM";
    private final Handler handler = new Handler(Looper.getMainLooper());
    private int retryCount = 0;
    private static final int MAX_RETRIES = 10;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        fetchToken();
    }

    private void fetchToken() {
        Log.d(TAG, "Tentando obter token FCM... tentativa " + (retryCount + 1));
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.e(TAG, "FALHOU: " + task.getException());
                    retry();
                    return;
                }
                String token = task.getResult();
                if (token == null || token.isEmpty()) {
                    Log.w(TAG, "Token vazio, tentando novamente...");
                    retry();
                    return;
                }
                Log.d(TAG, "============================");
                Log.d(TAG, "TOKEN FCM OBTIDO COM SUCESSO");
                Log.d(TAG, "TOKEN: " + token);
                Log.d(TAG, "============================");
            });
    }

    private void retry() {
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            handler.postDelayed(this::fetchToken, 3000);
        } else {
            Log.e(TAG, "Número máximo de tentativas atingido. FCM não disponível.");
        }
    }
}
