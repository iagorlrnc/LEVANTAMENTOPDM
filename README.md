# Levantamento PDM 2025/2026 – Pé-de-Meia

Sistema web para a Secretaria da Educação do Tocantins (SEDUC-TO) que substitui o preenchimento manual de planilhas por escola, centralizando o levantamento do Programa Pé-de-Meia por Superintendência Regional de Educação (SRE).

## Stack

- **Frontend**: React 18 + TypeScript (strict) + Vite
- **Estilização**: Tailwind CSS
- **Roteamento**: React Router v6
- **Estado/Dados**: TanStack Query v5
- **Formulários**: React Hook Form + Zod
- **Backend**: Supabase (Postgres, Auth, RLS, Edge Functions)
- **Exportação**: ExcelJS

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)

## Configuração

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Anote a **URL** e a **Anon Key** (em Project Settings → API)
3. Anote a **Service Role Key** (mesma página, manter em segredo)

### 2. Rodar as migrations

No painel do Supabase, vá em **SQL Editor** e execute o conteúdo do arquivo:

```
supabase/migrations/20241001000000_initial.sql
```

Isso criará todas as tabelas, índices, triggers de auditoria e políticas RLS.

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com os valores do seu projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### 4. Instalar dependências e rodar o seed

```bash
npm install
npm run seed
```

O seed lerá o CSV com as 338 escolas e 13 SREs e imprimirá um relatório de conferência:

```
📊 Distribuição por SRE:
──────────────────────────────────────────────────
  ARAGUAÍNA                      50
  GURUPI                         45
  PALMAS                         33
  ARAGUATINS                     32
  PARAÍSO                        31
  PEDRO AFONSO                   28
  PORTO NACIONAL                 28
  TOCANTINÓPOLIS                 19
  DIANÓPOLIS                     17
  MIRACEMA DO TOCANTINS          16
  COLINAS DO TOCANTINS           15
  ARRAIAS                        12
  GUARAÍ                         12
──────────────────────────────────────────────────
  TOTAL                          338
```

### 5. Criar o primeiro administrador

No painel do Supabase, vá em **Authentication → Users** e clique em **Add user** (ou crie via e-mail e senha).
O trigger do banco de dados criará o perfil na tabela `perfis` **automaticamente** (definindo-o como `admin` por padrão caso seja o primeiro usuário).

Caso o usuário já tenha sido criado antes de rodar a migração, execute no **SQL Editor**:

```sql
INSERT INTO public.perfis (id, nome, papel)
SELECT u.id, 'Administrador', 'admin'
FROM auth.users u
LEFT JOIN public.perfis p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

### 6. Deploy da Edge Function

Instale a CLI do Supabase e faça deploy:

```bash
npx supabase functions deploy criar-usuario --project-ref SEU_REF
```

### 7. Rodar localmente

```bash
npm run dev
```

O sistema estará disponível em `http://localhost:3000`.

### 8. Deploy (Vercel)

1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. Framework: Vite
4. Build command: `npm run build`
5. Output directory: `dist`

## Estrutura do projeto

```
src/
├── components/         # Componentes reutilizáveis
│   ├── escola/        # Componentes das abas da escola
│   ├── Layout.tsx     # Layout principal com header
│   ├── ProtectedRoute.tsx
│   └── ui.tsx         # Componentes de UI genéricos
├── hooks/             # React hooks
│   ├── useAuth.tsx    # Contexto de autenticação
│   └── useData.ts    # TanStack Query hooks
├── lib/               # Utilitários
│   ├── supabase.ts   # Cliente Supabase
│   ├── validation.ts # Schemas Zod + validações
│   └── xlsx.ts       # Import/export XLSX
├── pages/             # Páginas da aplicação
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── SrePage.tsx
│   ├── EscolaPage.tsx
│   └── AdminPage.tsx
├── types/             # TypeScript types
├── App.tsx            # Router + providers
├── main.tsx           # Entry point
└── index.css          # Tailwind + design system

supabase/
├── migrations/        # SQL migrations
└── functions/         # Edge Functions

scripts/
└── seed.ts           # Script de seed (SREs + escolas)
```

## Papéis de acesso (RLS)

| Papel   | Escopo                                                  |
|---------|---------------------------------------------------------|
| admin   | Acesso total a todas as tabelas e módulos               |
| sre     | Acesso e gerenciamento das escolas e dados da sua SRE   |

## Funcionalidades

- ✅ Login com Supabase Auth (e-mail/senha) + recuperação de senha
- ✅ Painel com cards das 13 SREs e indicadores de andamento
- ✅ Prazo do levantamento (26/08 a 23/11/2026) com contagem regressiva
- ✅ Lista de escolas por SRE com busca, filtro e ordenação
- ✅ Página da escola com abas: Dados, Estudantes, Importar, Informações, Exportar
- ✅ CRUD completo de estudantes com validação de CPF
- ✅ CPF mascarado por padrão com opção de revelar
- ✅ Importação de XLSX/CSV no layout da planilha oficial
- ✅ Exportação XLSX idêntica ao layout original
- ✅ Ação em lote (definir situação 2026 para selecionados)
- ✅ Observações/informações adicionais com histórico cronológico
- ✅ Admin: gestão de usuários, situações e log de auditoria
- ✅ Estados de carregamento (skeletons) e estados vazios
- ✅ Layout responsivo (mobile-friendly)
- ✅ Auditoria automática via triggers
