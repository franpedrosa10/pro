# Fantasy + Prode Mundial 2026

MVP fullstack con `Next.js + Supabase` para competir en dos modos simultaneos:

- Fantasy estilo Gran DT (presupuesto, formaciones, capitan, suplentes por posicion).
- Prode de resultados por partido.
- Ligas privadas por codigo.
- Ranking global y por fecha (Fantasy + Prode).

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth + RLS)

## Setup local

1. Instalar dependencias

```bash
npm install
```

2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Si preferis, tambien podes usar `.env`.

Completa:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (ej. `http://localhost:3000`)

3. Crear esquema de DB en Supabase

- Abri SQL Editor en tu proyecto.
- Ejecuta [`supabase/schema.sql`](./supabase/schema.sql).
- Opcional para probar rapido: [`supabase/seed.sql`](./supabase/seed.sql).

Si ya tenias tablas creadas y queres aplicar fixes incrementales:

- [`supabase/hotfix_league_rls_recursion.sql`](./supabase/hotfix_league_rls_recursion.sql)
- [`supabase/hotfix_profile_fields.sql`](./supabase/hotfix_profile_fields.sql)
- [`supabase/hotfix_bench_rule.sql`](./supabase/hotfix_bench_rule.sql)

4. Correr la app

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Auth (email + Google)

- Login por email/password.
- Login con Google OAuth.
- Signup por email pide: nombre, apellido, telefono, email y password.

### Fix para error Google: `Unsupported provider: provider is not enabled`

1. En Supabase: `Authentication -> Providers -> Google` y activar provider.
2. Cargar `Client ID` y `Client Secret` de Google Cloud.
3. En Google Cloud OAuth app agregar redirect URI:
   - `https://<TU_PROJECT_REF>.supabase.co/auth/v1/callback`
4. En Supabase `Authentication -> URL Configuration` agregar:
   - Site URL: `http://localhost:3000` (o tu dominio)
   - Redirect URL adicional: `http://localhost:3000/auth/callback`

## Scripts

- `npm run dev` - desarrollo
- `npm run build` - build produccion
- `npm run start` - correr build
- `npm run lint` - lint

## Estructura importante

- [`src/app/dashboard`](/c:/Users/Win10/Desktop/pro/src/app/dashboard) - paginas privadas (resumen, squad, prode, ligas, standings, cuenta)
- [`src/app/api`](/c:/Users/Win10/Desktop/pro/src/app/api) - endpoints backend
- [`src/components`](/c:/Users/Win10/Desktop/pro/src/components) - UI reusable
- [`src/lib/domain`](/c:/Users/Win10/Desktop/pro/src/lib/domain) - reglas de negocio fantasy/prode
- [`src/lib/supabase`](/c:/Users/Win10/Desktop/pro/src/lib/supabase) - clientes y middleware de sesion
- [`supabase/schema.sql`](/c:/Users/Win10/Desktop/pro/supabase/schema.sql) - modelo de datos + RLS + vistas

## Estado actual

- Auth email + Google operativo (con mensajes de configuracion si Google no esta habilitado).
- Constructor de equipo estilo Gran DT con cancha visual y banco por posicion.
- Prode por partido con bloqueo por kickoff.
- Ligas privadas (crear/unirse) y ranking global/por fecha.
- Perfil editable (`nombre`, `apellido`, `telefono`).
