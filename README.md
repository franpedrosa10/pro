# Prode Mundial 2026

MVP fullstack con `Next.js + Supabase` para competir en Prode durante todo el Mundial:

- Predicciones por partido (editable solo antes del kickoff)
- Ligas privadas con codigo + link de invitacion
- Liga oficial por pais (union en 1 click)
- Ranking global, por fecha y por pais
- Registro completo con pais obligatorio

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth + RLS)

## Setup local

1. Instalar dependencias

```bash
npm install
```

2. Configurar entorno

```bash
cp .env.example .env.local
```

Completar:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (ej. `http://localhost:3000`)

3. Aplicar DB en Supabase SQL Editor

- Ejecutar [`supabase/schema.sql`](./supabase/schema.sql)
- Opcional: [`supabase/seed.sql`](./supabase/seed.sql)

4. Correr app

```bash
npm run dev
```

## Google OAuth

Si aparece `Unsupported provider: provider is not enabled` o `redirect_uri_mismatch`:

1. En Supabase: `Authentication -> Providers -> Google`, habilitar provider
2. Cargar `Client ID` y `Client Secret`
3. En Google Cloud OAuth agregar redirect URI:
   - `https://<TU_PROJECT_REF>.supabase.co/auth/v1/callback`
4. En Supabase `Authentication -> URL Configuration`:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`

## Invitaciones de liga

- Cada liga privada tiene codigo + link compartible
- Ruta de invitacion: `/invite/[joinCode]`
- Si el usuario no tiene sesion, se redirige a login y luego vuelve al link
- El join se resuelve por RPC segura en DB: `join_league_with_code`
- Liga oficial por pais: API `POST /api/leagues/country` (crea si no existe y une al usuario)

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Estructura clave

- [`src/app/dashboard`](/c:/Users/Win10/Desktop/pro/src/app/dashboard)
- [`src/app/invite`](/c:/Users/Win10/Desktop/pro/src/app/invite)
- [`src/app/api`](/c:/Users/Win10/Desktop/pro/src/app/api)
- [`src/components`](/c:/Users/Win10/Desktop/pro/src/components)
- [`src/lib/domain`](/c:/Users/Win10/Desktop/pro/src/lib/domain)
- [`supabase/schema.sql`](/c:/Users/Win10/Desktop/pro/supabase/schema.sql)

## Estado actual

- Auth email/password + Google
- Perfil con nombre, apellido, telefono y pais
- Prode por partido con lock por kickoff
- Ligas privadas + invitacion por link
- Ranking global, por fecha y por pais
