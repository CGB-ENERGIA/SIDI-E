# GSTC — Sistema de Gestão de Inspeções e Evidências

Plataforma web (desktop admin) + PWA mobile (campo) construída com Quasar/Vue 3, Pinia, Dexie (offline) e Supabase.

## Setup

```bash
cd gstc-app
npm install
cp .env.example .env   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
```

No Supabase: execute `supabase/schema.sql` no SQL Editor, crie um usuário admin (Authentication → Users) e configure as variáveis no `.env`.

```bash
npx quasar dev
```

- Desktop: `http://localhost:9000/login`
- Mobile/PWA: `http://localhost:9000/m/login`

## Fluxos

**Desktop:** login → dashboard, equipes, atividades, evidências, relatórios (CSV).

**Mobile:** login por prefixo da equipe → registrar serviço (2 fotos EPI + fotos da atividade) → sync offline-first.
