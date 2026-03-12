# CJ-League - Documentação Completa

## Visão Geral

**CJ-League** é uma aplicação web para exibir rankings e estatísticas de jogadores de um hub FACEIT de CS2. Construída com Next.js 15 (App Router), TypeScript, Tailwind CSS e Redis (Upstash) como cache.

- **Versão:** 2.0.0
- **Framework:** Next.js 15 com App Router
- **Linguagem:** TypeScript
- **Estilo:** Tailwind CSS com tema customizado FACEIT
- **Banco de dados:** Upstash Redis (KV)
- **Fonte de dados:** FACEIT API v4

---

## Índice

1. [Estrutura do Projeto](#estrutura-do-projeto)
2. [Variáveis de Ambiente](#variáveis-de-ambiente)
3. [Sistema de Seasons](#sistema-de-seasons)
4. [Sistema de Ranking](#sistema-de-ranking)
5. [API Routes](#api-routes)
6. [Página Admin](#página-admin-admin)
7. [Página de Jogador](#página-de-jogador-playerid)
8. [Mocks](#mocks-srcmocksplayersts)
9. [Componentes](#componentes)
10. [Serviços](#serviços)
11. [Hooks](#hooks)
12. [Tipos](#tipos)
13. [Utilitários](#utilitários)
14. [Configuração](#configuração)
15. [Fluxo de Dados](#fluxo-de-dados)
16. [GitHub Actions](#github-actions)
17. [Como ir ao ar (Deploy)](#como-ir-ao-ar-deploy)

---

## Estrutura do Projeto

```
CJ-League/
├── .github/
│   └── workflows/
│       ├── batch-once.yml
│       └── update-stats.yml
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── batch-update/route.ts
│   │   │   │   ├── update-incremental/route.ts
│   │   │   │   ├── update-map-stats/route.ts
│   │   │   │   ├── update-ratings/route.ts
│   │   │   │   └── update-status/route.ts
│   │   │   └── faceit/
│   │   │       ├── hub-stats/route.ts
│   │   │       └── map-stats/route.ts
│   │   ├── player/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── mocks/
│   │   └── players.ts
│   ├── components/
│   │   ├── admin/
│   │   │   └── UpdateMapStatsButton.tsx
│   │   ├── AdminPanel.tsx
│   │   ├── ErrorState.tsx
│   │   ├── LoadingState.tsx
│   │   ├── MapDistributionCard.tsx
│   │   ├── MapStatsCards.tsx
│   │   ├── PlayerCard.tsx
│   │   ├── PlayerManagementPanel.tsx
│   │   ├── PlayerTable.tsx
│   │   ├── SeasonHeader.tsx
│   │   ├── SeasonStatsSection.tsx
│   │   ├── StatsHeader.tsx
│   │   ├── UpdateBadge.tsx
│   │   └── UpdateToast.tsx
│   ├── config/
│   │   └── constants.ts
│   ├── hooks/
│   │   ├── useAdmin.ts
│   │   ├── useBackgroundUpdate.ts
│   │   └── useUpdateNotification.ts
│   ├── services/
│   │   ├── faceit.service.ts
│   │   ├── kv-cache.service.ts
│   │   └── storage.service.ts
│   ├── types/
│   │   ├── app.types.ts
│   │   └── faceit.types.ts
│   └── utils/
│       ├── date.utils.ts
│       ├── rating.utils.ts
│       └── stats.utils.ts
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

### Obrigatórias (Server-side)
```env
FACEIT_API_KEY=         # Bearer token da FACEIT API
ADMIN_SECRET=           # Senha de acesso ao painel admin
KV_REST_API_URL=        # URL da REST API do Upstash Redis
KV_REST_API_TOKEN=      # Token da REST API do Upstash Redis
```

### Opcionais / Client-side
```env
NEXT_PUBLIC_HUB_ID=                  # ID do hub FACEIT
NEXT_PUBLIC_APP_URL=                 # URL pública da aplicação
NEXT_PUBLIC_ADMIN_SECRET=admin123    # Segredo admin (client-side, para fallback)
```

---

## Sistema de Seasons

O projeto suporta múltiplas temporadas de competição.

### Seasons Configuradas (`src/config/constants.ts`)

| Season | ID | Período | Status |
|---|---|---|---|
| Season 0 | `f2dec63c-b3c1-4df6-8193-0b83fc6640ef` | Dez/2024 – Jan/2025 | Finalizada |
| Season 1 | `bcbe03eb-3ed0-49d7-a4e0-7959c7e27728` | Fev/2025 – em andamento | Ativa |

```typescript
type SeasonId = 'SEASON_0' | 'SEASON_1'
ACTIVE_SEASON = SEASONS.SEASON_1
```

Todos os caches no Redis são isolados por season, usando chaves prefixadas com o `seasonId`.

---

## Sistema de Ranking

### Cálculo de Pontos

```typescript
RANKING_CONFIG = {
  INITIAL_POINTS: 1000,
  POINTS_PER_WIN: +3,
  POINTS_PER_LOSS: -3,
  calculatePoints: (wins, losses) => 1000 + (wins * 3) - (losses * 3)
}
```

### Critérios de Desempate (Season 1)
1. Pontos de ranking
2. Quantidade de vitórias
3. Menos partidas jogadas (quem chegou ao mesmo ponto com menos partidas está à frente)

### Jogadores Livres (Free)
Os seguintes nicknames são excluídos do ranking (definidos em `FREE_PLAYERS` em `constants.ts`):
```
BITENCOURT95, SnalpinhA, pablitanus, Matheusgsr1, nansch, NegaoReinert, JapaMarley
```

### Potes (Classificação)
Jogadores são distribuídos em potes (1–5) definidos em `PLAYER_POTS`. O pote é usado para filtros e exibição visual.

### Rating (Sistema Simplificado)

Calculado em `rating.utils.ts`. Escala de 0.0 a ~2.0 (média esperada: ~1.0).

| Componente | Peso | Descrição |
|---|---|---|
| KPR | 40% | Kills por round |
| SPR | 25% | Sobrevivência por round |
| DPR | 20% | Dano por round (ADR) |
| MKF | 10% | Multi-kills |
| EFF | 5% | Eficiência (K/D + HS%) |

#### Tiers de Rating

| Tier | Rating | Cor |
|---|---|---|
| Elite | >= 1.30 | ⭐ Dourado |
| Excelente | >= 1.20 | 🔥 Laranja |
| Bom | >= 1.10 | Verde |
| Médio | >= 0.90 | Amarelo |
| Abaixo | < 0.90 | Vermelho |

---

## API Routes

### Rotas Públicas

#### `GET /api/faceit/hub-stats`

Retorna as estatísticas em cache dos jogadores. Não faz chamadas à API da FACEIT.

**Query params:**
- `season` — `SEASON_0` | `SEASON_1` (padrão: `SEASON_1`)
- `t` — timestamp para cache-busting

**Resposta:**
```json
{
  "success": true,
  "data": [PlayerStats],
  "cache": {
    "lastUpdated": "2025-03-10T14:00:00.000Z",
    "nextUpdate": "2025-03-11T05:00:00.000Z",
    "fromCache": true
  }
}
```

**Headers:** `Cache-Control: no-store, no-cache, must-revalidate`

Retorna `503` se o cache estiver vazio.

---

#### `GET /api/faceit/map-stats`

Retorna as estatísticas de distribuição dos mapas.

**Query params:**
- `season` — `SEASON_0` | `SEASON_1`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "mostPlayed": { "map": "de_mirage", "count": 45, "percentage": 32.1 },
    "leastPlayed": { "map": "de_anubis", "count": 8, "percentage": 5.7 },
    "totalMatches": 140,
    "mapDistribution": { "de_mirage": 45, "de_inferno": 38 }
  }
}
```

Tenta o Redis primeiro. Se vazio, busca da FACEIT API (até 100 partidas) e salva no cache.

---

### Rotas Admin (Requerem `Authorization: Bearer {ADMIN_SECRET}`)

#### `POST /api/admin/batch-update`

Processa todos os jogadores em lotes de 1 por vez para não ultrapassar o timeout de 300s da Vercel.

**Query params:**
- `season` — `SEASON_0` | `SEASON_1`

**Body:**
```json
{
  "batchNumber": 0,
  "existingPlayers": [],
  "seasonId": "SEASON_1"
}
```

**Resposta:**
```json
{
  "success": true,
  "batch": {
    "current": 1,
    "total": 49,
    "processed": 1,
    "totalPlayers": 1,
    "currentPlayer": "LEON1D4S"
  },
  "hasMore": true,
  "nextBatch": 1,
  "players": [PlayerStats]
}
```

**Limites:**
- `MAX_DURATION`: 300s
- `BATCH_SIZE`: 1 jogador por requisição
- `MAX_MATCHES_PER_PLAYER`: 200 partidas

---

#### `POST /api/admin/update-incremental`

Atualização delta: busca apenas as novas partidas e aplica incrementos nas estatísticas existentes. Mais rápido que o batch-update completo.

**Deltas calculados:** kills, deaths, damage, headshots, wins/losses, `matchADRs` (ADR por partida), `matchRatings` (rating por partida), `matchResults` (resultado por partida)

> Os arrays de histórico por partida (`matchADRs`, `matchRatings`, `matchResults`) são atualizados incrementalmente — novas partidas são acrescentadas ao início do array, mantendo o histórico existente.

**Resposta:**
```json
{
  "success": true,
  "newMatches": 5,
  "playersUpdated": 3,
  "totalPlayers": 49,
  "duration": "12.4s",
  "timestamp": "2025-03-10T15:00:00.000Z"
}
```

---

#### `POST /api/admin/update-ratings`

Recalcula o rating de todos os jogadores usando os dados já existentes no cache, sem fazer chamadas à FACEIT API. Usa `calculateSimplifiedRating()`. Instantâneo.

**Query params:**
- `season` — `SEASON_0` | `SEASON_1`

**Resposta:**
```json
{
  "success": true,
  "updated": 43,
  "skipped": 0,
  "total": 43,
  "duration": "0.3s"
}
```

---

#### `POST /api/admin/update-map-stats`

Atualiza as estatísticas de distribuição de mapas (busca até 300 partidas: 3 páginas × 100).

**Resposta:**
```json
{
  "success": true,
  "totalMatches": 140,
  "pagesSearched": 2,
  "mapDistribution": { "de_mirage": 45 },
  "mostPlayed": { "map": "de_mirage", "count": 45, "percentage": 32.1 },
  "leastPlayed": { "map": "de_anubis", "count": 8, "percentage": 5.7 },
  "duration": "8.3s"
}
```

**Limites:** `MAX_DURATION`: 60s, `MATCHES_PER_PAGE`: 100, `MAX_PAGES`: 3

---

#### `GET /api/admin/update-status`

Retorna metadados sobre o estado atual do cache.

**Resposta:**
```json
{
  "success": true,
  "seasonId": "SEASON_1",
  "lastDataUpdate": "2025-03-10T14:00:00.000Z",
  "lastCheck": "2025-03-10T14:30:00.000Z",
  "totalPlayers": 43,
  "totalMatches": 140
}
```

---

## Página Admin (`/admin`)

`src/app/admin/page.tsx` — página dedicada ao painel de administração (client component).

**Autenticação:** Login via senha armazenada no `sessionStorage`. Sem a senha, exibe apenas o formulário de login.

**Cards de ação disponíveis:**

| Card | Rota chamada | Descrição |
|---|---|---|
| Atualização Incremental | `POST /api/admin/update-incremental` | Aplica deltas desde o último cache (~30s) |
| Estatísticas de Mapas | `POST /api/admin/update-map-stats` | Recalcula distribuição de mapas (~1 min) |
| Recalcular Ratings | `POST /api/admin/update-ratings` | Recalcula ratings sem API (instantâneo) |
| Atualização Completa (Batch) | `POST /api/admin/batch-update` | Reprocessa todos os jogadores do zero (~25–98 min) |

O card de Batch Update exibe um log em tempo real com o progresso de cada jogador processado.

---

## Página de Jogador (`/player/[id]`)

`src/app/player/[id]/page.tsx` — página detalhada de um jogador individual (client component).

**Roteamento:** Aceita `id` como `playerId` ou `nickname` (case-insensitive).

**Modo desenvolvimento:** Usa `getMockPlayerById(id)` de `src/mocks/players.ts`. Em produção, deve ser substituído por fetch real via `/api/faceit/hub-stats`.

### Layout

A página é dividida em duas colunas que crescem naturalmente conforme o conteúdo:
- **Coluna esquerda (2/3):** cards de performance principal
- **Coluna direita (1/3):** cards de contexto e comparação

As colunas não têm altura forçada — cada uma ocupa o espaço necessário pelo seu conteúdo, sem espaço sobrando.

### Seções exibidas

| Seção | Dados |
|---|---|
| Hero | Avatar, nickname, badge de pote, posição, nível FACEIT, forma recente (8 partidas), rating |
| Quick Stats | K/D, ADR, HS%, Win Rate, KAST, Aces |
| Rating por Partida | Gráfico AreaChart (verde=vitória, vermelho=derrota, linha de referência em 1.0) — alimentado por `matchRatings` (batch popula histórico; incremental mantém atualizado) |
| Clutch | Breakdown 1v1→1v5 com barras de progresso e label HARD para 1v4/1v5 |
| Desempenho na Season | Pontos, peak, partidas, barra W/L, barra de peak vs teto (1500) |
| Estatísticas Detalhadas | Por Jogo (K/D/A) + Totais na Season (8 stats: kills, deaths, assists, headshots, rounds, dano, triple kills, quad kills) |
| Comparar com | Select para comparar métricas lado a lado com barras bidirecionais (laranja=jogador atual, azul=comparado) |
| Pote X / N jogadores | Rank do jogador no pote por Rating, K/D, ADR, KAST, Win Rate (com valor, média e `#rank`) |
| ADR por Partida | Gráfico BarChart (azul=acima da média, cinza=abaixo) — alimentado por `matchADRs` (batch popula histórico; incremental mantém atualizado) |
| Vitórias & Derrotas | Donut chart com win rate central |
| Sequência | Streak atual e maior sequência de vitórias |
| Maior Rival | Adversário mais frequente com W/L e barra proporcional |
| Amuleto | Melhor parceiro (maior win rate juntos) em verde |
| Kriptonita | Pior parceiro (menor win rate juntos) em vermelho |

> **Seções removidas (dados indisponíveis na API da FACEIT):**
> - **Entry Performance** — entryKills/entryDeaths não são expostos pela API do FACEIT para CS2
> - **Suporte & Impacto** — flashAssists e utilityDamage não disponíveis na API; MVPs disponível mas ainda não coletado no batch
> - **Posição na Liga** — exigiria snapshot de todos os jogadores a cada partida; histórico perdido, inviável retroativamente

### Cores de acento por pote

| Pote | Cor |
|---|---|
| 1 | `#FCA5A5` (rosa) |
| 2 | `#D8B4FE` (lilás) |
| 3 | `#86EFAC` (verde) |
| 4 | `#FDBA74` (laranja) |
| 5 | `#FDE68A` (amarelo) |

---

## Mocks (`src/mocks/players.ts`)

Dados fictícios para desenvolvimento local. Contém 9 jogadores distribuídos em 3 potes:

- **Pote 1:** `CrunchyTaco` (mock-001), `xSniper99` (mock-002), `LaserFocus` (mock-003), `ShadowBlade` (mock-004), `VoidStriker` (mock-005)
- **Pote 2:** `NightOwl` (mock-006), `CrimsonAce` (mock-007)
- **Pote 3:** `IronSight` (mock-008), `StormBreaker` (mock-009)

Os 3 primeiros jogadores possuem dados completos incluindo: rival, amuleto, kriptonita, histórico de partidas, gráficos e estatísticas avançadas.

```typescript
export function getMockPlayerById(id: string): PlayerStats | undefined
// Aceita playerId ou nickname (case-insensitive)
```

---

## Componentes

### `AdminPanel`

Modal de autenticação e controle admin.

**Props:**
```typescript
{
  isAdmin: boolean;
  showModal: boolean;
  onLogin: (password: string) => void;
  onClose: () => void;
  onLogout: () => void;
  onForceUpdate: (seasonId: SeasonId) => void;
  isUpdating: boolean;
}
```

**Funcionalidades:**
- Formulário de login por senha
- Botões de atualização por season (Season 0 e Season 1)
- Estado de carregamento durante atualização
- Logout

---

### `PlayerCard`

Exibe as estatísticas de um jogador em formato de card.

**Props:** `{ player: PlayerStats }`

**Exibe:**
- Avatar, posição no ranking, nickname
- Badge do pote e badge de rating (com valor numérico)
- Grid 2×2: Pontos, ADR, K/D, HS%
- Rival (se tiver 2+ partidas contra o mesmo oponente)
- Win rate e total de partidas

---

### `PlayerTable`

Tabela de jogadores com colunas ordenáveis.

**Props:** `{ players: PlayerStats[] }`

**Colunas:** Posição, Jogador, Pote, Pontos, Partidas, Win Rate, K/D, ADR, HS%, Rating

**Funcionalidades:**
- Clique no cabeçalho para ordenar
- Coluna de posição fixa à esquerda
- Medalhas para top 3 (🥇 🥈 🥉)
- Indicadores visuais de ordenação

---

### `SeasonHeader`

Seletor de seasons e informações de atualização.

**Props:**
```typescript
{
  activeSeason: SeasonId;
  onSeasonChange: (season: SeasonId) => void;
  lastUpdated: Date | null;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}
```

---

### `MapStatsCards`

Exibe o pool de mapas com contagem e distribuição percentual.

**Mapas suportados:** `de_dust2`, `de_mirage`, `de_inferno`, `de_nuke`, `de_overpass`, `de_ancient`, `de_anubis`

**Estado de carregamento:** Skeleton animado

---

### `UpdateBadge`

Badge flutuante que aparece quando há novos dados disponíveis.

**Props:**
```typescript
{
  hasNewData: boolean;
  onRefresh: () => void;
  isUpdating?: boolean;
}
```

**Animação:** Framer Motion (entrada/saída + pulsação)

---

### `LoadingState`

Componentes de carregamento.

**Exports:**
- `LoadingState()` — Tela cheia com spinner
- `CardSkeleton()` — Skeleton para cards
- `TableSkeleton()` — Skeleton para tabela

---

### `ErrorState`

Tela de erro com botão de retry opcional.

**Props:** `{ error: string; onRetry?: () => void }`

---

### `UpdateToast`

Toast de notificação quando novos dados estão prontos para serem aplicados.

---

### `SeasonStatsSection`

Seção que agrupa `MapStatsCards` e outras estatísticas da season ativa.

---

### `StatsHeader`

Barra de busca, filtros (pote, ordenação) e informações de atualização.

---

### `PlayerManagementPanel`

Painel admin para gerenciar a lista de jogadores do hub.

---

### `admin/UpdateMapStatsButton`

Botão admin para atualizar manualmente as estatísticas de mapas via `/api/admin/update-map-stats`.

---

## Serviços

### `FaceitService` (`faceit.service.ts`)

Camada de integração com a FACEIT API v4.

#### Constantes de configuração
```typescript
PARALLEL_MATCHES = 3        // 3 requisições paralelas de match stats
REQUEST_TIMEOUT = 20000     // 20s timeout
MIN_DELAY_BETWEEN_REQUESTS = 1200   // 1.2s entre requisições
DELAY_BETWEEN_CHUNKS = 1500         // 1.5s entre chunks
```

#### Métodos principais

**`getPlayerByNickname(nickname)`**
Busca informações do jogador (ID, avatar, ELO, skill level).

**`getPlayerStats(playerId)`**
Busca estatísticas lifetime do jogador na FACEIT.

**`fetchPlayerWithMatches(nickname, maxMatches?, lastMatchId?, queueId?, previousStats?)`**
Versão incremental: se `lastMatchId` for encontrado, acumula stats sobre os dados anteriores. Caso contrário, recalcula do zero.

**`calculateStatsFromMatches(matches, playerInfo, nickname)`**
Processa uma lista de partidas e retorna um `PlayerStats` completo com K/D, ADR, win rate, streaks, peak points, matchRatings, matchADRs, matchResults e rivais.

> **Nota sobre ADR:** A FACEIT API não retorna o campo `Damage` nos player stats. O campo disponível é `ADR` (Average Damage per Round, pré-calculado). O `totalDamage` é derivado como `Math.round(ADR * matchRounds)` para poder recalcular ADR corretamente no cache incremental.

#### Singleton
```typescript
export function getFaceitService(apiKey?: string): FaceitService
```

---

### `KvCacheService` (`kv-cache.service.ts`)

Wrapper sobre o Upstash Redis para cache server-side.

#### Chaves do Redis

| Chave | Propósito |
|---|---|
| `cj-stats:players:{seasonId}` | Cache geral de todos os jogadores |
| `cj-stats:player:{seasonId}:{nickname}` | Cache individual por jogador |
| `cj-stats:maps:{seasonId}` | Estatísticas de mapas |
| `cj-stats:last-check:{seasonId}` | Timestamp da última verificação |

#### Métodos

**Cache de jogadores:**
- `saveCache(players, seasonId)` — Salva todos os jogadores (sem expiração)
- `getCache(seasonId)` — Retorna todos os jogadores em cache
- `savePlayerCache(nickname, data, seasonId)` — Salva cache individual
- `getPlayerCache(nickname, seasonId)` — Retorna cache individual
- `clearCache(seasonId)` — Limpa cache da season (ou todos)
- `hasCache(seasonId)` — Verifica se existe cache

**Map stats:**
- `saveMapStats(mapStats, seasonId)` — Salva distribuição de mapas
- `getMapStats(seasonId)` — Retorna distribuição de mapas

**Última verificação:**
- `setLastCheck(seasonId)` — Atualiza timestamp de verificação
- `getLastCheck(seasonId)` — Retorna timestamp de verificação

---

### `StorageService` (`storage.service.ts`)

Wrapper sobre `localStorage` para cache client-side com fallback.

#### Métodos

**Cache:**
- `saveCache(data, seasonId)` — Salva no localStorage
- `getCache(seasonId)` — Recupera do localStorage
- `clearCache(seasonId)` — Limpa cache

**Preferências:**
- `savePreferences(preferences)` — Salva preferências do usuário
- `getPreferences()` — Retorna preferências
- `getPreferencesWithDefaults()` — Retorna preferências com fallbacks

**Meta:**
- `saveLastVisit()` — Registra timestamp da última visita
- `getLastVisit()` — Retorna timestamp da última visita
- `isFirstVisit()` — Verifica se é a primeira visita

#### Singleton
```typescript
export const storageService = new StorageService()
```

---

## Hooks

### `useAdmin()`

Gerencia autenticação e estado do modo admin.

**Retorna:**
```typescript
{
  isAdmin: boolean;
  showAdminModal: boolean;
  setShowAdminModal: (show: boolean) => void;
  adminLogin: (password: string) => boolean;
  adminLogout: () => void;
}
```

**Formas de ativar:**
- URL: `?admin=ADMIN_SECRET`
- Teclado: `Ctrl+Shift+A`
- Persistência via `sessionStorage`

---

### `useBackgroundUpdate(onDataReady)`

Verifica atualizações em background sem bloquear a UI.

**Parâmetro:** `onDataReady: (players: PlayerStats[]) => void`

**Retorna:**
```typescript
{
  status: {
    isUpdating: boolean;
    progress: number;       // 0-100
    hasNewData: boolean;
    error: string | null;
  };
  checkForUpdates: () => Promise<void>;
  applyUpdate: () => void;
}
```

**Comportamento:** Verifica a cada 2s automaticamente. O usuário decide quando aplicar.

---

### `useUpdateNotification(seasonId?)`

Faz polling para detectar novos dados no servidor.

**Parâmetro:** `seasonId: string = 'SEASON_1'`

**Retorna:**
```typescript
{
  hasNewData: boolean;
  checkForUpdates: () => Promise<void>;
  markAsRead: () => void;
  lastChecked: Date | null;
}
```

**Comportamento:** Polling a cada 30s em `/api/admin/update-status`. Compara timestamps com o localStorage para detectar atualizações.

---

## Tipos

### `PlayerStats` (tipo principal)

```typescript
interface PlayerStats {
  // Identidade
  playerId: string;
  nickname: string;
  avatar: string;
  country: string;

  // Classificação
  pot?: number;               // Pote (1-5)
  rating?: number;            // Rating calculado (0.0-2.0)

  // Ranking
  rankingPoints: number;
  peakRankingPoints?: number; // Maior pontuação já atingida na season
  position: number;

  // Partidas
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;            // 0-100

  // Combate
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  kr: number;
  adr: number;
  headshotPercentage: number;
  totalKills?: number;
  totalDeaths?: number;
  totalDamage?: number;
  totalRounds?: number;
  totalHeadshots?: number;
  matchResults?: boolean[];   // Histórico de vitórias/derrotas (mais recente primeiro — índice 0 = partida mais recente)
  matchADRs?: number[];       // ADR por partida
  matchRatings?: number[];    // Rating por partida (para gráfico de tendência)

  // FACEIT
  faceitElo: number;
  skillLevel: number;

  // Streak
  currentStreak: number;
  longestWinStreak: number;

  // Rival (adversário mais frequente)
  rivalNickname?: string;
  rivalMatchCount?: number;
  rivalWins?: number;
  rivalLosses?: number;

  // Amuleto (melhor parceiro) / Kriptonita (pior parceiro)
  amuletoNickname?: string;    // Maior win rate jogando junto
  amuletoWinRate?: number;
  amuletoMatchCount?: number;
  kriptoniaNickname?: string;  // Menor win rate jogando junto
  kritoniaWinRate?: number;    // Nota: prefixo "kritonia" (sem 'p')
  kritoniaMatchCount?: number;

  // Estatísticas avançadas
  kast?: number;               // KAST % médio
  matchKASTs?: number[];
  clutchAttempts?: number;
  clutchWins?: number;
  clutchRate?: number;
  clutch1v1?: number;  clutch1v1Attempts?: number;
  clutch1v2?: number;  clutch1v2Attempts?: number;
  clutch1v3?: number;  clutch1v3Attempts?: number;
  clutch1v4?: number;  clutch1v4Attempts?: number;
  clutch1v5?: number;  clutch1v5Attempts?: number;
  tripleKills?: number;
  quadroKills?: number;
  pentaKills?: number;
  mvps?: number;

  // Meta
  lastMatch?: Date;
  lastMatchId?: string;
}
```

### Outros tipos importantes

```typescript
interface CacheData {
  players: PlayerStats[];
  lastUpdated: string;  // ISO8601
  nextUpdate: string;   // ISO8601
  version: string;
}

interface MapStats {
  mostPlayed: { map: string; count: number; percentage: number } | null;
  leastPlayed: { map: string; count: number; percentage: number } | null;
  totalMatches: number;
  mapDistribution: Record<string, number>;
}

interface PlayerFilters {
  searchTerm: string;
  pot: 'all' | number;
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
  minMatches?: number;
}

type SortOption =
  | 'rankingPoints'
  | 'position'
  | 'winRate'
  | 'kd'
  | 'adr'
  | 'matchesPlayed'
  | 'faceitElo'
  | 'rating';
```

### Tipos da FACEIT API

- `FaceitPlayer` — Info básica do jogador
- `FaceitPlayerStats` — Estatísticas lifetime
- `FaceitMatch` — Dados de uma partida
- `FaceitMatchStats` — Estatísticas detalhadas por jogador em uma partida
- `FaceitHubRanking` — Posição no leaderboard do hub

---

## Utilitários

### `stats.utils.ts`

| Função | Descrição |
|---|---|
| `calculateKD(kills, deaths)` | Ratio K/D seguro (evita divisão por zero) |
| `calculateWinRate(wins, losses)` | Porcentagem de vitória |
| `calculateRankingPoints(wins, losses)` | Pontos de ranking |
| `comparePlayers(a, b, sortBy, order, season)` | Comparação com critérios de desempate |
| `filterBySearch(players, term)` | Filtro por nickname |
| `filterByPot(players, pot)` | Filtro por pote |
| `getKDColor(kd)` | Cor baseada no K/D |
| `getWinRateColor(winRate)` | Cor baseada no win rate |
| `getADRColor(adr)` | Cor baseada no ADR |
| `formatPosition(pos)` | Posição ordinal (1º, 2º...) |

---

### `rating.utils.ts`

Implementação do HLTV Rating 2.0 adaptada para os dados disponíveis na API da FACEIT.

| Função | Descrição |
|---|---|
| `calculateSimplifiedRating(data)` | Calcula o rating HLTV 2.0 estimado (escala ~0.6–1.5) |

**Interface de entrada (`PlayerRatingData`):**
```typescript
{
  totalKills: number;
  totalDeaths: number;
  totalDamage: number;
  totalRounds: number;
  totalHeadshots: number;
  tripleKills?: number;
  quadroKills?: number;
  pentaKills?: number;
}
```

---

### `date.utils.ts`

| Função | Descrição |
|---|---|
| `getNextUpdateTime()` | Próxima atualização agendada (02:00) |
| `shouldUpdateCache(lastUpdated)` | Verifica se o cache está desatualizado |
| `formatRelativeTime(date)` | "há 2 horas", "há 5 min" |
| `formatDateTime(date)` | "dd/MM/yyyy HH:mm" |
| `formatCountdown(ms)` | "HH:mm:ss" |
| `fromUnixTimestamp(ts)` | Segundos → Date |
| `getUserTimezone()` | Timezone do navegador |

---

## Configuração

### `next.config.js`

```javascript
{
  images: {
    remotePatterns: [
      { hostname: 'avatars.faceit.com' },
      { hostname: 'cdn.faceit.com' },
      { hostname: 'distribution.faceit-cdn.net' },
      { hostname: 'assets.faceit-cdn.net' }
    ]
  },
  reactStrictMode: true
}
```

### `tailwind.config.ts` — Cores customizadas

| Token | Valor | Uso |
|---|---|---|
| `faceit-orange` | `#ff5500` | Cor primária (botões, destaques) |
| `faceit-dark` | `#0d0f12` | Background principal |
| `faceit-darker` | `#07080a` | Background mais escuro |
| `faceit-gray` | `#1e2126` | Cards e superfícies |
| `faceit-light-gray` | `#2d3137` | Bordas e divisores |
| `text-primary` | `#ffffff` | Texto principal |
| `text-secondary` | `#b0b3b8` | Texto secundário |
| `success` | `#22c55e` | Verde |
| `warning` | `#f59e0b` | Amarelo/Aviso |
| `danger` | `#ef4444` | Vermelho/Erro |

---

## Fluxo de Dados

### Carregamento inicial (usuário)

```
1. Abre o site
2. StorageService.getCache() → cache no localStorage?
   ├─ Sim → exibe dados imediatamente
   └─ Não → GET /api/faceit/hub-stats → Redis → exibe dados
3. GET /api/faceit/map-stats → Redis → exibe estatísticas de mapas
4. useUpdateNotification polling a cada 30s → detecta novos dados
```

### Atualização completa (admin)

```
1. Admin abre modal (Ctrl+Shift+A ou ?admin=SECRET)
2. Clica "Forçar Atualização"
3. Loop: POST /api/admin/batch-update (1 jogador por vez)
   ├─ FaceitService busca até 200 partidas do jogador
   ├─ Calcula stats completas
   └─ Salva no Redis (cache geral + cache individual)
4. GET /api/faceit/hub-stats → atualiza a UI
```

### Atualização incremental (admin)

```
POST /api/admin/update-incremental
  ├─ Busca partidas após o timestamp do último cache
  ├─ Calcula deltas (kills, deaths, damage, assists, multiKills, etc.)
  ├─ Aplica deltas sobre os dados existentes no Redis
  └─ Atualiza cache geral e individuais
```

### Automação (GitHub Actions)

```
A cada 2 horas (update-stats.yml):
  1. POST /api/admin/update-incremental → aplica deltas
  2. POST /api/admin/update-map-stats   → recalcula mapas

Admin manual (via /admin):
  - update-incremental  → rápido (~30s)
  - update-ratings      → instantâneo, sem FACEIT API
  - update-map-stats    → ~1 min
  - batch-update        → completo, ~25-98 min
```

### Troca de season (usuário)

```
1. Usuário clica na aba de season
2. StorageService.getCache(newSeason) → cache local?
   ├─ Sim → exibe imediatamente
   └─ Não → GET /api/faceit/hub-stats?season=SEASON_X → Redis
3. GET /api/faceit/map-stats?season=SEASON_X → atualiza mapas
```

---

## GitHub Actions

### `update-stats.yml` — Atualização automática incremental

Executa a cada 2 horas e também pode ser disparado manualmente.

```yaml
on:
  schedule:
    - cron: '0 */2 * * *'
  workflow_dispatch:
```

**Steps:**
1. `POST /api/admin/update-incremental?season=SEASON_1` — aplica deltas de partidas novas
2. `POST /api/admin/update-map-stats?season=SEASON_1` — recalcula distribuição de mapas

**Autenticação:** `Authorization: Bearer ${{ secrets.ADMIN_SECRET }}`

---

### `batch-once.yml` — Atualização completa manual

Disparo exclusivamente manual (`workflow_dispatch`). Processa todos os jogadores em loop de batches até `hasMore = false`. Timeout: 60 minutos.

---

## Scripts

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # ESLint
npm run type-check   # TypeScript sem emit
```

---

## Como ir ao ar (Deploy)

### 1. Configurar variáveis de ambiente

Crie `.env.local` na raiz com:

```env
# Obrigatórias (server-side)
FACEIT_API_KEY=seu_bearer_token_faceit
ADMIN_SECRET=senha_segura_do_admin
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=token_do_upstash

# Opcionais (client-side)
NEXT_PUBLIC_HUB_ID=id_do_hub_faceit
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

### 2. Verificar o build localmente

```bash
npm run type-check   # Zero erros esperado
npm run build        # Build de produção
```

### 3. Deploy na Vercel

1. Push para o GitHub (branch `main`)
2. Vercel detecta automaticamente Next.js e faz deploy
3. Adicionar as variáveis de ambiente no painel da Vercel (Settings → Environment Variables)

### 4. Popular o Redis (primeira vez)

Após o deploy:
1. Acessar `https://seu-dominio.vercel.app/admin`
2. Autenticar com `ADMIN_SECRET`
3. Clicar em **Atualização Completa (Batch)** — processa todos os jogadores do zero (~25–98 min)
4. Após concluir, verificar o ranking na página principal

### 5. Configurar GitHub Actions

No repositório GitHub → Settings → Secrets and variables → Actions:

| Secret | Valor |
|---|---|
| `ADMIN_SECRET` | Mesma senha do `.env.local` |
| `APP_URL` | URL pública da Vercel (ex: `https://cj-league.vercel.app`) |

Isso habilita as atualizações automáticas a cada 2 horas.

### 6. Integrar a página de jogador com dados reais

A página `src/app/player/[id]/page.tsx` usa mock em desenvolvimento. Em produção, busca os dados do Redis via `/api/faceit/hub-stats` e filtra pelo `id` (aceita `playerId` ou `nickname` case-insensitive).
