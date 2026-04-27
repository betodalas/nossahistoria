package com.nossahistoria.app;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.installations.FirebaseInstallations;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "FcmToken")
public class FcmTokenPlugin extends Plugin {

    private static final String TAG = "FcmTokenPlugin";
    private static final int TIMEOUT_SECONDS = 15;

    @PluginMethod
    public void getToken(PluginCall call) {
        Log.d(TAG, "getToken() chamado — iniciando...");

        AtomicBoolean resolved = new AtomicBoolean(false);
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

        // Timeout: se não resolver em 15s, rejeita
        scheduler.schedule(() -> {
            if (resolved.compareAndSet(false, true)) {
                Log.e(TAG, "getToken() timeout após " + TIMEOUT_SECONDS + "s — Firebase Installations pode estar bloqueado");
                call.reject("Timeout: Firebase não retornou token em " + TIMEOUT_SECONDS + "s");
                scheduler.shutdown();
            }
        }, TIMEOUT_SECONDS, TimeUnit.SECONDS);

        // Tenta forçar registro do Firebase Installation primeiro
        Log.d(TAG, "Forçando registro do Firebase Installation...");
        FirebaseInstallations.getInstance().getId()
            .addOnCompleteListener(installTask -> {
                if (installTask.isSuccessful()) {
                    Log.d(TAG, "Firebase Installation ID: " + installTask.getResult());
                } else {
                    Log.w(TAG, "Firebase Installation falhou: " + 
                        (installTask.getException() != null ? installTask.getException().getMessage() : "null"));
                }

                // Tenta obter token FCM independente do resultado do Installation
                Log.d(TAG, "Solicitando token FCM...");
                FirebaseMessaging.getInstance().getToken()
                    .addOnSuccessListener(token -> {
                        if (resolved.compareAndSet(false, true)) {
                            scheduler.shutdown();
                            Log.d(TAG, "Token FCM obtido com sucesso: " + token.substring(0, Math.min(20, token.length())) + "...");
                            JSObject ret = new JSObject();
                            ret.put("token", token);
                            call.resolve(ret);
                        }
                    })
                    .addOnFailureListener(e -> {
                        if (resolved.compareAndSet(false, true)) {
                            scheduler.shutdown();
                            Log.e(TAG, "Falha ao obter token FCM: " + e.getMessage());
                            call.reject("Falha ao obter token FCM: " + e.getMessage(), e);
                        }
                    });
            });
    }
}
