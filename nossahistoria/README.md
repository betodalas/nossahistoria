# 💍 Nossa História

App web para casais registrarem sua história antes e depois do casamento.

**Stack:** React + TypeScript + Tailwind CSS + Node.js + Express + PostgreSQL

---

## Estrutura do projeto

```
nossahistoria/
├── backend/
│   └── src/
│       ├── controllers/     # Um arquivo por domínio
│       │   ├── authController.ts
│       │   ├── momentsController.ts
│       │   ├── questionsController.ts
│       │   ├── paymentController.ts
│       │   ├── storageController.ts
│       │   ├── lettersController.ts
│       │   └── guestPostsController.ts
│       ├── middleware/
│       │   └── auth.ts       # JWT + premium check
│       ├── routes/
│       │   └── index.ts      # Todas as rotas da API
│       ├── utils/
│       │   ├── db.ts         # Pool PostgreSQL
│       │   ├── email.ts      # Nodemailer / Resend
│       │   └── migrate.ts    # Criação de tabelas + índices
│       └── index.ts          # Servidor Express (entry point)
│
└── frontend/
    └── src/
        ├── pages/            # Login, Dashboard, Timeline, etc.
        ├── components/       # Layout, MusicPlayer, etc.
        ├── services/         # api.ts (axios)
        ├── contexts/         # AuthContext
        └── App.tsx
```

---

## 1. Configurar o backend

```bash
cd backend
npm install
cp .env.example .env
# Preencha todas as variáveis no .env (veja .env.example para instruções)
npm run db:migrate      # Cria tabelas e índices no PostgreSQL
npm run dev             # http://localhost:3001
```

### Gerar segredos seguros

```bash
# JWT_SECRET
openssl rand -hex 64

# ADMIN_SECRET
openssl rand -hex 32
```

---

## 2. Configurar o frontend

```bash
cd frontend
npm install
cp .env.example .env
# Preencha VITE_API_URL e VITE_PAYPAL_CLIENT_ID
npm run dev             # http://localhost:5173
```

---

## 3. Deploy

### Backend → Render
1. Crie conta em render.com
2. **New → Web Service** → conecte seu repositório GitHub
3. Root directory: `backend`
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Adicione todas as variáveis de ambiente do `.env.example`
7. **New → PostgreSQL** → copie a connection string para `DATABASE_URL`

### Frontend → Vercel
1. Crie conta em vercel.com
2. **Import Project** → conecte seu repositório GitHub
3. Root directory: `frontend`
4. Adicione as variáveis:
   - `VITE_API_URL` = URL do backend no Render + `/api`
   - `VITE_PAYPAL_CLIENT_ID` = seu PayPal client ID

---

## 4. Primeiro acesso após o deploy

```bash
# Popular o banco com perguntas iniciais (apenas uma vez)
curl -X POST https://SEU-BACKEND.onrender.com/api/questions/seed \
  -H "x-admin-secret: SEU_ADMIN_SECRET"
```

---

## 5. Funcionalidades

### Gratuito
- ✅ Cadastro e login (e-mail + Google)
- ✅ Recuperação de senha por e-mail
- ✅ Vinculação de casal por convite
- ✅ Linha do tempo (até 10 momentos)
- ✅ Perspectivas duplas por momento
- ✅ Perguntas do casal (3 por semana)

### Premium (R$49 único via PayPal)
- ✅ Momentos ilimitados com foto e áudio
- ✅ Perguntas ilimitadas + exclusivas
- ✅ Datas de desbloqueio especiais
- ✅ Compartilhamento com família
- ✅ Álbum de convidados
- ✅ Cartas/cápsulas do tempo
- 🔜 Livro digital em PDF

---

## 6. Segurança implementada

- **Helmet** — headers HTTP de segurança
- **Rate limiting** — 200 req/15min geral, 20 req/15min nas rotas de auth
- **bcrypt** — senhas com salt rounds 12
- **JWT** — tokens de 30 dias
- **Verificação de e-mail** — obrigatória antes do login
- **CORS** — restrito ao domínio do frontend
- **Endpoint de seed** — protegido por `x-admin-secret`
- **Endpoint de unlink** — disponível apenas em `NODE_ENV=development`

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, React Router |
| Backend | Node.js, Express, TypeScript |
| Banco | PostgreSQL (pg) |
| Auth | JWT, bcryptjs, Google OAuth |
| Storage | Cloudinary |
| Pagamento | PayPal REST API |
| E-mail | Resend / Nodemailer |
| Deploy | Vercel (frontend) + Render (backend + banco) |
