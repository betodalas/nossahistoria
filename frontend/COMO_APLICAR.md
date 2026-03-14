# Como aplicar as atualizações — Nossa História

## 1. Arquivos de código corrigidos

Copie os arquivos da pasta `src/` para dentro do seu projeto:

```bash
cp src/pages/Questions.tsx  SEU_PROJETO/frontend/src/pages/
cp src/pages/AddMoment.tsx  SEU_PROJETO/frontend/src/pages/
cp src/pages/Profile.tsx    SEU_PROJETO/frontend/src/pages/
cp src/components/*.tsx     SEU_PROJETO/frontend/src/components/
```

### O que foi corrigido:
- **Questions.tsx** — Remove resposta simulada. Busca resposta real do parceiro via API. Mostra "⏳ ainda não respondeu" se parceiro não respondeu.
- **AddMoment.tsx** — Salva momentos no backend (não só localStorage). Volta para home `/` após salvar.
- **Profile.tsx** — Salva dados do casal no backend.
- **Todos os arquivos** — Contraste melhorado (text-white/40 → text-white/60 etc.)

---

## 2. Ícones do app (Android)

Copie os ícones para a pasta `res/` do Android:

```bash
# Estrutura de destino:
# android/app/src/main/res/mipmap-*/ic_launcher.png

cp -r android-icons/mipmap-mdpi/     SEU_PROJETO/frontend/android/app/src/main/res/mipmap-mdpi/
cp -r android-icons/mipmap-hdpi/     SEU_PROJETO/frontend/android/app/src/main/res/mipmap-hdpi/
cp -r android-icons/mipmap-xhdpi/    SEU_PROJETO/frontend/android/app/src/main/res/mipmap-xhdpi/
cp -r android-icons/mipmap-xxhdpi/   SEU_PROJETO/frontend/android/app/src/main/res/mipmap-xxhdpi/
cp -r android-icons/mipmap-xxxhdpi/  SEU_PROJETO/frontend/android/app/src/main/res/mipmap-xxxhdpi/
```

O arquivo `android-icons/playstore/ic_launcher.png` (512x512) é para usar na Play Store.

---

## 3. Build do APK release

```bash
cd SEU_PROJETO/frontend

# 1. Build do frontend
npm run build

# 2. Sync para Android
npx cap sync android

# 3. Build release (precisa de keystore)
cd android
./gradlew assembleRelease
```

APK gerado em: `android/app/build/outputs/apk/release/app-release.apk`

> **Nota:** Para build release assinado, você precisa do arquivo `keystore.jks` e configurar
> `android/app/build.gradle` com as credenciais de assinatura.

---

## 4. Variáveis de ambiente (PayPal)

Configure no painel do Render (backend) e no `.env` do frontend:

**Backend (Render > Environment):**
```
PAYPAL_CLIENT_ID=seu_client_id_paypal
PAYPAL_CLIENT_SECRET=seu_client_secret
PAYPAL_MODE=sandbox   # ou production
PREMIUM_PRICE=49.00
FRONTEND_URL=https://seu-app.com
```

**Frontend (.env):**
```
VITE_PAYPAL_CLIENT_ID=seu_client_id_paypal
```

---

## 5. Google Sign-In no APK (solução futura)

O botão Google não funciona em WebView do Capacitor. Solução recomendada:

```bash
npm install @codetrix-studio/capacitor-google-auth
npx cap sync android
```

Configure o `AndroidClientId` no `capacitor.config.ts`:
```ts
plugins: {
  GoogleAuth: {
    androidClientId: "724555680441-djum1c4uitgotlptuf7qkmsqp732uu6c.apps.googleusercontent.com"
  }
}
```
