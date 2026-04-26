# Lupa

Gerenciador de Ordens de Serviço desktop para oficinas de joalheria, com arquitetura local-first, busca fuzzy instantânea e impressão em duas vias.

## Visão Geral

- Interface reativa com busca fuzzy (Fuse.js) para autocompletar clientes e serviços
- Arquitetura local-first: funciona offline com cache local, sincroniza com MongoDB Atlas quando online
- Impressão imediata de OS em duas vias (A4) via CSS `@media print`
- Command Bar global (`Ctrl+K`) para busca unificada
- Notificação ao cliente via WhatsApp (deep linking) quando o serviço está pronto
- Edição de itens, quantidades e preços após a criação da OS
- Fluxo de status: Orçamento → Pendente → Em Andamento → Pronto → Entregue

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Desktop | Electron 39 + electron-vite 5 |
| UI | React 19 + TypeScript 5.9 |
| Estilo | Tailwind CSS v4 + shadcn/ui |
| Estado | Zustand 5 |
| Banco | MongoDB Atlas (Mongoose 9) |
| Busca | Fuse.js 7 |
| Rotas | React Router DOM 7 |
| Testes | Vitest 4 |

## Pré-requisitos

- Node.js 18+
- npm 9+
- Conta MongoDB Atlas com cluster ativo

## Instalação

```bash
npm install
```

## Configuração

Na primeira execução, se nenhuma URI do MongoDB estiver configurada, o app exibe automaticamente a tela de Configurações pedindo a conexão.

Para pular essa etapa, criar arquivo `.env` na raiz do projeto:

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/lupa
```

Ou configurar a URI diretamente pela interface em **Configurações → Banco de Dados**. A URI é criptografada localmente com `safeStorage` do Electron.

> **Nota para Linux:** Em distribuições que usam `systemd-resolved` (Ubuntu, etc.), o DNS do sistema não resolve registros SRV do MongoDB Atlas. O app inclui um resolver customizado (`src/main/database/resolver.ts`) com fallback automático para 8.8.8.8 / 1.1.1.1 / 8.8.4.4.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento com hot reload |
| `npm run build` | Typecheck + build de produção |
| `npm run typecheck` | Verificação de tipos (Node + Web) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test` | Rodar testes |
| `npm run test:watch` | Testes em modo watch |
| `npm run start` | Preview do build |
| `npm run build:win` | Build instalador Windows |
| `npm run build:mac` | Build macOS |
| `npm run build:linux` | Build Linux (AppImage / deb) |

## Arquitetura

O projeto segue a arquitetura de **Processos Segregados** do Electron:

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process (Node)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ DatabaseSvc  │  │  DNS Resolver │  │  localStore    │  │
│  │ (Mongoose)   │  │  (SRV+fallback)│  │  (JSON cache)  │  │
│  └──────┬───────┘  └──────────────┘  └───────┬────────┘  │
│         │                                    │           │
│  ┌──────┴────────────────────────────────────┴────────┐  │
│  │              IPC Handlers (CRUD)                   │  │
│  └──────────────────────┬────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────┘
                          │ IPC (contextBridge)
┌─────────────────────────┼───────────────────────────────┐
│               Preload (window.api)                       │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│              Renderer Process (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Zustand  │  │  Pages   │  │ Command  │  │ shadcn   │  │
│  │ Stores   │  │ (Router) │  │   Bar    │  │    UI    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────┘
```

- **Main Process**: Conexão MongoDB Atlas, cache local JSON, DNS resolver com fallback, handlers IPC com validação de input
- **Preload**: Ponte segura via `contextBridge` — o renderer nunca acessa o DB diretamente. Expõe `openExternal()` (validado) e `onUriChange()` para transição setup → app normal
- **Renderer**: React UI, Zustand stores, Fuse.js para busca instantânea no cache, Error Boundary global

### Segurança

- `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`
- Content Security Policy em produção (CSP)
- `safeStorage` do Electron para criptografar a URI do MongoDB no disco
- Validação de input nos IPC handlers (ObjectId, status enum, config keys allowlist)
- `open-external` só aceita protocolos `https:` e `http:`
- URI mascarada (`maskUri`) ao enviar ConnectionInfo ao renderer
- Checksum SHA-256 para integridade do cache local
- Counter atômico (`$inc`) para geração de `osNumber` sem race condition
- `serialize()` recursivo com `stripInternalFields()` para sanitizar dados na fronteira IPC

### DatabaseService

Singleton com máquina de estados (`DISCONNECTED → CONNECTING → CONNECTED / FAILED`):

- Auto-reconnect com backoff exponencial
- Health check periódico com ping
- `execute(op, fallback)` — opera no banco se online, executa fallback do cache se offline
- Guarda de `readyState === 0` para evitar erros de topologia fechada
- `whenReady()` para aguardar conexão antes de operações críticas

### Resolver DNS

O módulo `resolver.ts` resolve registros SRV do MongoDB Atlas usando DNS servers de fallback quando o resolver do sistema não suporta SRV:

1. Tenta resolver com o DNS do sistema
2. Em caso de falha, tenta 8.8.8.8 → 1.1.1.1 → 8.8.4.4
3. Converte `mongodb+srv://` para `mongodb://` com os hosts resolvidos
4. Aplica precedência de 3 camadas: defaults SRV → registros TXT → parâmetros do usuário

### Cache Local

Persistência offline via arquivo JSON (`src/main/cache/localStore.ts`). O `execute()` do DatabaseService usa o cache como fallback automático quando a conexão cai, garantindo que o app nunca trave por falta de rede. O cache inclui checksum SHA-256 para detectar adulteração.

## Estrutura de Diretórios

```
src/
├── main/
│   ├── index.ts                       # Entry point do Electron
│   ├── lib/
│   │   └── logger.ts                  # Logger condicional (dev only)
│   ├── cache/
│   │   └── localStore.ts              # Cache local JSON com checksum
│   ├── config/
│   │   └── AppConfig.ts               # Config com safeStorage
│   ├── database/
│   │   ├── DatabaseService.ts         # Singleton DB com reconnect
│   │   ├── resolver.ts                # DNS SRV resolver com fallback
│   │   └── models/                    # Mongoose schemas
│   │       ├── Counter.ts             # Counter atômico para osNumber
│   │       ├── Customer.ts
│   │       ├── Service.ts
│   │       └── ServiceOrder.ts
│   └── ipc/
│       └── handlers.ts                # Handlers IPC com validação
├── preload/
│   ├── index.ts                      # contextBridge API
│   └── index.d.ts                    # Tipagens window.api
└── renderer/src/
    ├── main.tsx                       # Entry React
    ├── App.tsx                        # Router com setup guard
    ├── lib/utils.ts                   # cn(), formatCurrency(), formatDate(), formatPhone(), normalizePhone(), buildWhatsAppUrl(), buildReadyMessage(), lineTotal(), isValidBrazilianPhone()
    ├── types/index.ts                 # Tipos e constantes de status
    ├── stores/                        # Zustand stores
    │   ├── useServiceOrderStore.ts
    │   ├── useServiceStore.ts
    │   ├── useCustomerStore.ts
    │   ├── useSyncStore.ts
    │   └── useThemeStore.ts
    ├── components/
    │   ├── CommandBar.tsx             # Busca global (Ctrl+K) com Fuse.js
    │   ├── ErrorBoundary.tsx          # Error boundary global
    │   ├── layout/
    │   │   ├── AppLayout.tsx          # Shell: Sidebar + Outlet + hotkeys
    │   │   └── Sidebar.tsx           # Navegação + indicador online/offline
    │   └── ui/                        # shadcn/ui components
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── dialog.tsx
    │       ├── input.tsx
    │       ├── select.tsx
    │       ├── table.tsx
    │       └── textarea.tsx
    └── pages/
        ├── Dashboard.tsx              # Visão geral com contadores e atividade recente
        ├── ServiceOrdersPage.tsx      # Lista com busca, filtro e ordenação
        ├── ServiceOrderForm.tsx       # Formulário com autocomplete, quick-create e quantidade
        ├── ServiceOrderDetail.tsx     # Detalhe com fluxo de status, edição de itens e entrada
        ├── PrintServiceOrder.tsx      # Impressão 2 vias A4
        ├── ServicesPage.tsx           # Catálogo de serviços (CRUD)
        ├── CustomersPage.tsx          # Clientes (CRUD)
        ├── WorkshopPage.tsx           # Visão oficina (kanban por status)
        └── SettingsPage.tsx           # Configurações (DB URI, tema)
```

## Modelo de Dados

### ServiceOrder

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `osNumber` | `number` | Número auto-incremento (counter atômico) |
| `customer` | `{ name, phone }` | Cliente vinculado |
| `items` | `[{ description, quantity, price }]` | Itens do serviço (quantity padrão 1) |
| `status` | `enum` | `quote` \| `pending` \| `in_progress` \| `ready` \| `delivered` |
| `dates` | `{ created, deadline, finished? }` | Datas de controle |
| `financial` | `{ total, deposit, balance }` | Valores financeiros (total = soma de qty × price) |
| `notes` | `string?` | Observações gerais |
| `attachments` | `string[]` | Caminhos para fotos das peças |

### Customer

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | `string` | Nome do cliente |
| `phone` | `string` | Telefone |
| `email` | `string?` | E-mail |
| `address` | `string?` | Endereço |
| `notes` | `string?` | Observações |

### Service

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `label` | `string` | Descrição do serviço |
| `category` | `string` | Categoria (Conserto, Fabricação, Limpeza, Restauração, Outro) |
| `basePrice` | `number` | Preço sugerido |
| `tags` | `string[]` | Tags para busca fuzzy |

## Fluxo de Status

```
Orçamento → Pendente → Em Andamento → Pronto → Entregue
 (quote)    (pending)  (in_progress)   (ready)  (delivered)
```

Cada transição é feita via botões na tela de detalhes da OS, ou pelo seletor inline na listagem.

## Rotas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | Dashboard | Contadores e atividade recente |
| `/os` | ServiceOrdersPage | Listagem com busca, filtro e ordenação |
| `/os/new` | ServiceOrderForm | Nova OS com autocomplete e quantidade |
| `/os/:id` | ServiceOrderDetail | Detalhe, edição de itens e fluxo de status |
| `/os/:id/print` | PrintServiceOrder | Impressão 2 vias A4 |
| `/services` | ServicesPage | Catálogo de serviços |
| `/customers` | CustomersPage | Clientes |
| `/workshop` | WorkshopPage | Visão oficina (kanban) |
| `/settings` | SettingsPage | Configurações (DB URI, tema) |

## Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+K` | Abrir Command Bar (busca global fuzzy) |
| `Ctrl+N` | Nova Ordem de Serviço |
| `Esc` | Voltar / Fechar Command Bar |

## Impressão

A rota `/os/:id/print` renderiza duas vias da OS em uma folha A4 usando `window.print()` com regras CSS `@media print`. A tabela de itens inclui colunas de quantidade e subtotal. Sem dependências externas de geração de PDF — aproveita o motor Chromium do Electron.

## WhatsApp

Quando uma OS atinge o status **Pronto** (`ready`), um botão verde de WhatsApp aparece na tela de detalhe. O fluxo:

1. O atendente clica em **WhatsApp**
2. O app gera automaticamente a mensagem com nome do cliente, número da OS, itens (com quantidade) e saldo pendente
3. Abre `https://wa.me/{phone}?text={message}` via `shell.openExternal()` (apenas protocolos https/http permitidos)
4. O WhatsApp Desktop (ou navegador) abre com a mensagem pré-preenchida — basta enviar

O telefone é validado e normalizado automaticamente: verifica DDD, dígito 9 para celular, e adiciona `55` se necessário. O template da mensagem:

```
Olá {nome}! Sua OS #{numero} está pronta para retirada.
Itens: {item1}, {item2} x3, ...
Total: R$ {total} | Saldo pendente: R$ {saldo}
```

Se o saldo estiver zerado, exibe **"Quitado"** no lugar do valor.

## Testes

```bash
npm run test          # rodar uma vez
npm run test:watch    # modo watch
```

- Testes de integração usam o database `/test` no Atlas (nunca o de produção)
- Requer `MONGODB_URI` configurado no `.env`
- Timeout de 60s para testes com Atlas
- 23 testes no total: resolver (6), DatabaseService (9), ServiceOrder (8)

## IDE Recomendada

[VSCode](https://code.visualstudio.com/) com as extensões:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Licença

MIT © Murilo Alves
