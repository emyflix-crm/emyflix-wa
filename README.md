# EMYFLIX WA — Plataforma SaaS de Agendamento WhatsApp

<div align="center">
  <h3>🚀 Automatize seus envios no WhatsApp com EMYFLIX WA</h3>
  <p>Plataforma SaaS moderna para agendamento de mensagens em grupos do WhatsApp</p>
</div>

---

## Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Backend | NestJS + TypeScript |
| Banco de Dados | PostgreSQL + Prisma ORM |
| Fila de Jobs | BullMQ + Redis |
| WhatsApp | Evolution API |
| E-mail | Resend |
| Pagamento | Mercado Pago |

---

## Pré-requisitos

- Node.js 18+ 
- PostgreSQL 15+
- Redis 7+
- Evolution API rodando (já configurada no EasyPanel)

---

## 🖥️ Desenvolvimento Local

### 1. Clonar e instalar dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Subir banco de dados e Redis com Docker

```bash
docker compose up -d postgres redis
```

### 3. Configurar variáveis de ambiente

```bash
# Backend - copiar e preencher
cp .env.example .env

# Frontend - copiar e preencher
cd frontend
cp .env.local.example .env.local
```

### 4. Rodar migrations e seed

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

Isso cria:
- Admin: `admin@emyflix.com` / `Admin@123456`
- 4 planos: Prata, Gold, Diamante, Empresarial

### 5. Iniciar os servidores

```bash
# Terminal 1 - Backend (porta 3001)
cd backend
npm run start:dev

# Terminal 2 - Frontend (porta 3000)
cd frontend
npm run dev
```

Acesse: http://localhost:3000

---

## 🚀 Deploy no EasyPanel

### Estrutura de serviços no EasyPanel

Crie **4 serviços** no EasyPanel:

---

### Serviço 1: PostgreSQL

- **Type**: PostgreSQL
- **Version**: 15
- **Database**: `emyflix_wa`
- **User**: `emyflix`
- **Password**: (escolha uma senha forte)
- Anote a **Connection String** gerada

---

### Serviço 2: Redis

- **Type**: Redis
- **Version**: 7
- Anote o **host** e **password**

---

### Serviço 3: Backend (NestJS)

- **Type**: App
- **Source**: Upload do código ou Git repo
- **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Start Command**: `npm run start:prod`
- **Port**: `3001`

**Variáveis de ambiente:**
```
DATABASE_URL=postgresql://emyflix:SENHA@postgres-host:5432/emyflix_wa
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=redis-password
JWT_SECRET=troque-por-uma-chave-secreta-longa-e-segura
JWT_REFRESH_SECRET=troque-por-outra-chave-secreta-longa-e-segura
PORT=3001
FRONTEND_URL=https://seu-frontend.easypanel.host
EVOLUTION_API_URL=http://n8n_evolution-api:8080
EVOLUTION_API_KEY=sua-evolution-api-key-aqui
RESEND_API_KEY=sua-resend-api-key-aqui
RESEND_FROM=noreply@emyflix.com
RESEND_FROM_NAME=EMYFLIX WA
MERCADOPAGO_ACCESS_TOKEN=seu-mp-access-token
MERCADOPAGO_WEBHOOK_SECRET=seu-mp-webhook-secret
APP_URL=https://seu-backend.easypanel.host
NODE_ENV=production
```

---

### Serviço 4: Frontend (Next.js)

- **Type**: App
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Port**: `3000`

**Variáveis de ambiente:**
```
NEXT_PUBLIC_API_URL=https://seu-backend.easypanel.host/api
NEXT_PUBLIC_APP_NAME=EMYFLIX WA
NEXT_PUBLIC_APP_URL=https://seu-frontend.easypanel.host
```

---

### Após o deploy

1. Acesse `https://seu-frontend.easypanel.host`
2. Faça login com: `admin@emyflix.com` / `Admin@123456`
3. **Troque a senha imediatamente**
4. Vá em Administração → Planos para configurar os planos
5. Configure o webhook do Mercado Pago apontando para: `https://seu-backend.easypanel.host/api/payments/webhook`

---

## 📁 Estrutura do Projeto

```
emyflix-wa/
├── backend/
│   ├── src/
│   │   ├── auth/           # JWT, login, registro, recuperação de senha
│   │   ├── users/          # Perfil de usuário
│   │   ├── plans/          # Gestão de planos
│   │   ├── whatsapp/       # Integração Evolution API
│   │   ├── groups/         # Sincronização de grupos
│   │   ├── campaigns/      # Criação e gestão de campanhas
│   │   ├── scheduler/      # Fila BullMQ de envios
│   │   ├── history/        # Histórico de mensagens
│   │   ├── admin/          # Painel administrativo
│   │   ├── payments/       # Mercado Pago
│   │   ├── email/          # Resend email service
│   │   └── prisma/         # Prisma service
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (public)/   # Landing, Login, Cadastro
│       │   ├── (auth)/     # Dashboard, Agendamentos, etc.
│       │   └── admin/      # Painel admin
│       ├── components/
│       ├── lib/
│       ├── store/
│       └── types/
└── docker-compose.yml
```

---

## 🔐 Segurança

- Senhas criptografadas com bcrypt (salt rounds: 12)
- JWT com refresh tokens (access: 15min, refresh: 7 dias)
- Rate limiting: 100 req/min por IP
- Validação de dados com class-validator
- Separação total de dados por usuário (multi-tenant lógico)
- Guards de roles (USER / ADMIN)
- CORS configurado

---

## 📊 Planos Padrão

| Plano | Preço | Mensagens/dia | Grupos | Campanhas | Instâncias |
|---|---|---|---|---|---|
| Prata | R$ 29,90 | 100 | 50 | 20 | 1 |
| Gold | R$ 59,90 | 500 | 150 | 100 | 2 |
| Diamante | R$ 119,90 | 2.000 | 500 | 500 | 5 |
| Empresarial | R$ 249,90 | 5.000 | 1.000 | 9.999 | 20 |

> Os limites são configuráveis pelo painel administrativo em tempo real.

---

## 🆘 Suporte

Para dúvidas sobre configuração ou uso da plataforma, acesse a seção **Suporte** dentro da plataforma.

---

**EMYFLIX WA** © 2024 — Todos os direitos reservados.
