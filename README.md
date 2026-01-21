# 🎮 FACEIT Hub Stats - Next.js

Sistema completo de estatísticas para HUB FACEIT com Next.js 15, TypeScript e cache inteligente.

## 📦 Arquivos do Projeto

### 🎯 BACKEND (1 arquivo)
```
src/app/api/faceit/hub-stats/route.ts
```
- Endpoint principal: `GET /api/faceit/hub-stats`
- Cache em memória
- Integração com FACEIT API
- Atualização às 02:00

### 🎨 FRONTEND (3 arquivos)
```
src/app/
├── layout.tsx      # Layout raiz
├── page.tsx        # Página principal
└── globals.css     # Estilos Tailwind
```

### 🧩 COMPONENTES (5 arquivos)
```
src/components/
├── PlayerCard.tsx       # Card de jogador
├── PlayerTable.tsx      # Tabela responsiva
├── StatsHeader.tsx      # Filtros e busca
├── LoadingState.tsx     # Loading skeleton
└── ErrorState.tsx       # Tela de erro
```

### ⚙️ SERVICES (3 arquivos)
```
src/services/
├── faceit.service.ts    # Integração FACEIT API
├── cache.service.ts     # Sistema de cache (02:00)
└── storage.service.ts   # localStorage wrapper
```

### 📊 TYPES (2 arquivos)
```
src/types/
├── faceit.types.ts      # Tipos da FACEIT API
└── app.types.ts         # Tipos da aplicação
```

### 🛠️ UTILS (2 arquivos)
```
src/utils/
├── date.utils.ts        # Lógica de datas (02:00)
└── stats.utils.ts       # Cálculos e filtros
```

### ⚙️ CONFIG (1 arquivo)
```
src/config/
└── constants.ts         # Configurações centralizadas
```

---

## 🚀 Instalação

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env.local
```

Edite `.env.local`:
```env
FACEIT_API_KEY=SUA_CHAVE_AQUI
NEXT_PUBLIC_HUB_ID=SEU_HUB_ID_AQUI
```

### 3. Configurar jogadores
Edite `src/config/constants.ts`:
```typescript
export const PLAYER_POTS: Record<string, number> = {
  'nickname1': 1,  // Pote 1
  'nickname2': 2,  // Pote 2
  // ... adicione todos os jogadores
};
```

### 4. Executar
```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 📋 Checklist de Configuração

- [ ] Node.js 18+ instalado
- [ ] `npm install` executado
- [ ] `.env.local` criado com credenciais
- [ ] Lista de jogadores configurada em `constants.ts`
- [ ] `npm run dev` rodando
- [ ] Site acessível em localhost:3000

---

## 🎯 Features

- ✅ Cache inteligente (atualização às 02:00)
- ✅ Busca por jogador
- ✅ Filtro por pote
- ✅ Ordenação (pontos, K/D, Win Rate, ADR, ELO)
- ✅ Vista Cards ou Tabela
- ✅ Design responsivo
- ✅ Tema FACEIT

---

## 🔧 Estrutura Completa

```
faceit-hub-stats-next/
├── src/
│   ├── app/
│   │   ├── api/faceit/hub-stats/route.ts  ⭐ Backend
│   │   ├── layout.tsx                      ⭐ Layout
│   │   ├── page.tsx                        ⭐ Frontend
│   │   └── globals.css
│   ├── components/                         ⭐ 5 componentes
│   ├── services/                           ⭐ 3 services
│   ├── types/                              ⭐ 2 types
│   ├── utils/                              ⭐ 2 utils
│   └── config/                             ⭐ 1 config
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── .env.example
```

**Total: 17 arquivos TypeScript + 6 configurações = 23 arquivos**

---

## 📚 Documentação

Todos os arquivos estão comentados e explicados.

Para detalhes de cada parte, veja os comentários nos arquivos:
- `route.ts` - Lógica do backend
- `page.tsx` - Lógica do frontend
- `cache.service.ts` - Sistema de cache
- `date.utils.ts` - Lógica às 02:00

---

## 🚀 Deploy

### Vercel
```bash
git push origin main
# Importar em vercel.com
# Configurar env vars
```

### Render
```bash
# Build: npm install && npm run build
# Start: npm start
```

---

## 📞 Suporte

Todos os arquivos estão prontos e organizados.

Se tiver dúvidas, verifique:
1. Console do navegador (F12)
2. Logs do terminal
3. Arquivo `.env.local` configurado
4. Lista de jogadores em `constants.ts`

---

Desenvolvido com ❤️ para o Mix Dez 2025
