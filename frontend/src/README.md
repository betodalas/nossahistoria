# 💍 Nossa História — Setup completo

App web para casais registrarem sua história antes do casamento.
Stack: React + TypeScript + Node.js + PostgreSQL

---

## Estrutura do projeto

```
nossa-historia/
├── backend/          # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/    # Lógica de negócio
│   │   ├── middleware/     # Auth JWT + premium check
│   │   ├── routes/         # Rotas da API
│   │   └── utils/          # DB pool + migrations
│   ├── .env.example
│   └── package.json
│
└── frontend/         # React + TypeScript + Tailwind
    ├── src/
    │   ├── pages/          # Login, Dashboard, Timeline, etc.
    │   ├── services/       # Chamadas à API
    │   ├── contexts/       # AuthContext
    │   └── App.tsx
    └── package.json
```

---

## 1. Configurar o backend

```bash
cd backend
npm install
cp .env.example .env
# Preencha as variáveis no .env
npm run db:migrate      # Cria as tabelas no PostgreSQL
npm run dev             # Inicia em http://localhost:3001
```

### Variáveis do .env (backend)
| Variável | Como obter |
|---|---|
| `DATABASE_URL` | Render → PostgreSQL → Connection String |
| `JWT_SECRET` | Qualquer string longa aleatória |
| `PAYPAL_CLIENT_ID` | developer.paypal.com → My Apps |
| `PAYPAL_CLIENT_SECRET` | developer.paypal.com → My Apps |
| `PAYPAL_MODE` | `sandbox` para testes, `production` para produção |
| `CLOUDINARY_*` | cloudinary.com → Dashboard |
| `SMTP_*` | Gmail com senha de app ativada |

---

## 2. Configurar o frontend

```bash
cd frontend
npm install
cp .env.example .env
# Preencha VITE_API_URL e VITE_PAYPAL_CLIENT_ID
npm run dev             # Inicia em http://localhost:5173
```

Crie um arquivo `frontend/.env`:
```
VITE_API_URL=http://localhost:3001/api
VITE_PAYPAL_CLIENT_ID=seu_paypal_client_id_aqui
```

---

## 3. Deploy

### Backend → Render
1. Crie conta em render.com
2. New → Web Service → conecte seu repositório GitHub
3. Build command: `npm install && npm run build`
4. Start command: `node dist/index.js`
5. Adicione todas as variáveis de ambiente
6. New → PostgreSQL → copie a connection string para `DATABASE_URL`

### Frontend → Vercel
1. Crie conta em vercel.com
2. Import Project → conecte seu repositório GitHub
3. Root directory: `frontend`
4. Adicione as variáveis de ambiente:
   - `VITE_API_URL` = URL do seu backend no Render
   - `VITE_PAYPAL_CLIENT_ID` = seu PayPal client ID

---

## 4. Funcionalidades implementadas

### Gratuito
- ✅ Cadastro e login de usuários
- ✅ Vinculação de casal (por e-mail do parceiro)
- ✅ Linha do tempo (limite de 5 momentos)
- ✅ Perspectivas duplas por momento
- ✅ Perguntas e descobertas (3 por semana)

### Premium (R$49 único via PayPal)
- ✅ Momentos ilimitados com upload de foto
- ✅ Perguntas ilimitadas + perguntas exclusivas
- ✅ Datas de desbloqueio especiais (1, 5, 10 anos)
- ✅ Compartilhamento com família via link
- 🔜 Livro digital em PDF (próxima versão)
- 🔜 Notificações por e-mail (próxima versão)

---

## 5. Primeiros passos após o deploy

1. Acesse `POST /api/questions/seed` para popular o banco com perguntas iniciais
2. Crie uma conta e teste o fluxo completo no modo sandbox do PayPal
3. Quando estiver pronto para produção, mude `PAYPAL_MODE=production`

---

## Tecnologias usadas
- **Frontend**: React 18, TypeScript, Tailwind CSS, React Router, PayPal SDK
- **Backend**: Node.js, Express, TypeScript, PostgreSQL (pg), JWT, bcryptjs
- **Storage**: Cloudinary (fotos)
- **Pagamento**: PayPal
- **Deploy**: Vercel (frontend) + Render (backend + banco)
