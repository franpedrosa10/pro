# AGENTS.md

## Proyecto

Repositorio de **Prode Mundial 2026** con:

- `Next.js` App Router + TypeScript
- `Supabase` (Postgres + Auth + RLS)
- `Tailwind CSS`

Direccion de producto actual:

1. Prode por partido (core)
2. Ligas privadas (social)
3. Ranking global + ranking por pais

## Estado funcional actual

- Auth: email/password + Google OAuth.
- Registro por email requiere: `nombre`, `apellido`, `telefono`, `pais`.
- Ruta `/` redirige a `/login`.
- Fallback OAuth en `/`: si vuelve `?code=...`, reenvia automaticamente a `/auth/callback`.
- Login unificado en una sola pantalla (info + formulario).
- Flujo de recuperacion:
  - `/forgot-password`
  - `/reset-password`
- Dashboard privado con navbar:
  - `prode`
  - `ligas`
  - `resultados globales`
  - `mi cuenta`
- Prode:
  - Edicion permitida solo antes del kickoff
  - Guardado batch por API (`PUT /api/prode/predictions`)
  - UI por fecha (selector de matchday) con opcion de vista completa
  - Selector de fechas compacto (chips horizontales)
  - Guardado por fecha actual y guardado global
  - `x2 por fecha` desde cada card de partido (1 partido por fecha, bloquea al inicio de la fecha)
  - Eleccion de `campeon/subcampeon` (bloquea al cierre de fase de grupos)
- Ligas privadas:
  - Crear liga
  - Unirse por codigo
  - Compartir invitacion por link
  - Unirse a liga oficial por pais (auto-create + auto-join)
  - Ruta de invitacion: `/invite/[joinCode]`
- Resultados:
  - Ranking Prode global
  - Ranking por fecha
  - Filtro por pais (liga por pais)
  - home dashboard en 2 columnas para tablas global/pais (desktop)
  - fallback de nombre de jugador sin exponer UID parcial
- Footer global:
  - copyright
  - credito con link a portfolio de Francisco Pedrosa
- i18n:
  - idioma unico: `es`
  - locale server-side fijo en `es`

## Nota sobre Fantasy

- El codigo legacy de Fantasy sigue en el repo por compatibilidad tecnica.
- El producto activo es Prode-first: no exponer Fantasy en UX principal.
- No invertir tiempo en funcionalidades Fantasy salvo pedido explicito.

## Fuente de verdad DB

Usar siempre `supabase/schema.sql`.

Incluye:

- Tablas core (`profiles`, `fixtures`, `prode_predictions`, `leagues`, `league_members`, etc.)
- Triggers de integridad de Prode (`prevent_late_predictions`, `validate_prode_matchday_multiplier`, `prevent_late_podium_picks`)
- Tablas bonus Prode (`prode_matchday_multipliers`, `prode_podium_picks`)
- Vistas de scoring (`v_prode_user_fixture_points`, `v_prode_user_matchday_scores`, `v_prode_user_totals`)
- Vistas agregadas (`v_global_standings`, `v_league_standings`)
- Funciones de ligas (`join_league_with_code`, `join_country_league`)
- Policies RLS completas
- Dataset base del Mundial 2026:
  - Equipos reales + placeholders de repechaje y llaves
  - 8 matchdays (3 de grupos + eliminatorias)
  - 104 fixtures cargados de forma idempotente

## Cambios de pais en perfil

- `profiles` contiene:
  - `country_code` (ISO2)
  - `country_name`
- `handle_new_user` levanta estos campos desde metadata de signup.
- `PUT /api/profile` actualiza pais + metadata del usuario.

## Endpoints vigentes

- `POST /api/leagues`
- `POST /api/leagues/join`
- `POST /api/leagues/country`
- `PUT /api/prode/double`
- `PUT /api/prode/podium`
- `PUT /api/prode/predictions`
- `PUT /api/profile`

Endpoint legacy (no promocionado en UX):

- `PUT /api/squad`

## Setup rapido

1. `npm install`
2. Copiar `.env.example` a `.env.local` (o usar `.env`)
3. Definir:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
4. Ejecutar en Supabase SQL Editor:
   - `supabase/schema.sql`
   - si ya tenes DB creada y falla `league_id is ambiguous`: correr `supabase/hotfix_join_league_ambiguous.sql`
   - para actualizar DB existente con `x2 + podio`: correr `supabase/hotfix_prode_x2_podium.sql`
   - `supabase/seed.sql` es opcional solo para datos demo legacy
5. `npm run dev` (usa `next dev --webpack` para evitar error de persistencia de Turbopack)

## OAuth Google

Si aparece `Unsupported provider: provider is not enabled` o `redirect_uri_mismatch`:

1. Supabase -> Authentication -> Providers -> Google:
   - Enable provider
   - Client ID + Client Secret
2. Google Cloud OAuth client (Web):
   - Authorized redirect URI:
     - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. Supabase -> Authentication -> URL Configuration:
   - Site URL (produccion): `https://pro-kappa-nine.vercel.app`
   - Redirect URLs:
     - `https://pro-kappa-nine.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`
     - `http://127.0.0.1:3000/auth/callback`

## Reglas para futuros agentes

- Mantener consistencia entre:
  - validaciones frontend
  - validaciones API
  - constraints/funciones SQL
- No remover RLS.
- Si se agregan tablas nuevas, agregar policies.
- Si se cambian reglas de Prode o ranking por pais, actualizar:
  - consultas en `src/app/dashboard/*`
  - `src/app/api/*`
  - `supabase/schema.sql`
- Antes de cerrar cambios: correr `npm run lint` y `npm run build`.
