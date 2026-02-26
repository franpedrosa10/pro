# AGENTS.md

## Proyecto

Repositorio de **Fantasy + Prode Mundial 2026** construido con:

- `Next.js` App Router + TypeScript
- `Supabase` (Postgres + Auth + RLS)
- `Tailwind CSS`

El producto mezcla dos juegos en paralelo:

1. Fantasy (armado de plantel estilo Gran DT)
2. Prode (prediccion de resultados)

Tambien incluye ligas privadas, tabla global y perfil de usuario.

## Estado actual (hoy)

- Login con email/password y Google OAuth.
- Registro por email pide: `nombre`, `apellido`, `telefono`, `email`, `password`.
- Dashboard con navbar: `prode`, `mi equipo`, `ligas`, `resultados globales`, `mi cuenta`.
- Squad builder con:
  - Formaciones: `3-4-3`, `3-5-2`, `4-3-3`, `4-4-2`
  - Max 15 jugadores
  - 11 titulares + 4 suplentes
  - 1 suplente por posicion
  - Capitan solo titular
  - Filtros por posicion, seleccion y puntaje
- Prode editable solo antes del kickoff.
- Ligas privadas (crear + unirse por codigo).
- Rankings globales y por fecha.
- Perfil editable desde `Mi cuenta`.

## UI/UX direction actual

- Tema claro, limpio, con foco en contraste.
- Paleta principal: blanco + amarillo (sin estilo oscuro/tech extremo).
- Componentes globales reutilizables en `src/app/globals.css`:
  - `panel`, `panel-strong`, `panel-soft`
  - `btn-primary`, `btn-ghost`
  - `input-tech`, `select-tech`
  - `table-shell`, `kpi-card`, `chip`

## Estructura importante

- `src/app/page.tsx`: landing publica.
- `src/app/login/page.tsx`: acceso/registro.
- `src/app/auth/callback/route.ts`: callback OAuth.
- `src/app/dashboard/*`: secciones privadas.
- `src/components/*`: bloques UI principales.
- `src/app/api/*`: endpoints backend.
- `src/lib/domain/rules.ts`: reglas de negocio fantasy/prode.
- `src/lib/supabase/*`: clientes SSR/browser + middleware.
- `supabase/schema.sql`: esquema completo consolidado.
- `supabase/seed.sql`: datos de prueba.

## Endpoints backend (contratos vigentes)

- `POST /api/leagues`
- `POST /api/leagues/join`
- `PUT /api/squad`
- `PUT /api/prode/predictions`
- `PUT /api/profile`

No romper contratos de request/response sin migrar frontend.

## Base de datos (fuente de verdad)

Usar **siempre** `supabase/schema.sql` como referencia principal.

Incluye:

- Tipos enum (`player_position`, `squad_slot`, `fixture_status`)
- Tablas core (`profiles`, `players`, `fixtures`, `fantasy_teams`, `prode_predictions`, etc.)
- Triggers de validacion (`validate_fantasy_team_state`, `prevent_late_predictions`)
- Vistas de scoring/standings (`v_global_standings`, `v_league_standings`)
- Funciones de RLS para ligas (`is_league_member`, `is_league_owner`)
- Policies RLS completas

Nota: los scripts `hotfix_*.sql` existen por compatibilidad historica, pero el estado final ya esta integrado en `schema.sql`.

## Setup local rapido

1. `npm install`
2. Copiar `.env.example` a `.env.local` (o usar `.env`)
3. Definir:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
4. Ejecutar en Supabase SQL Editor:
   - `supabase/schema.sql`
   - opcional `supabase/seed.sql`
5. `npm run dev`

## Configuracion Supabase (Google OAuth)

Si aparece `Unsupported provider: provider is not enabled`:

1. Activar Google en `Authentication -> Providers -> Google`.
2. Cargar `Client ID` + `Client Secret`.
3. En Google Cloud OAuth app agregar redirect URI:
   - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
4. En `Authentication -> URL Configuration`:
   - Site URL: `http://localhost:3000` (o dominio real)
   - Redirect URL: `http://localhost:3000/auth/callback`

## Reglas para futuros agentes

- Priorizar cambios incrementales, sin romper flujo de juego.
- Mantener consistencia entre reglas frontend y constraints/trigger en DB.
- No remover RLS.
- Si se agregan tablas nuevas, agregar policies.
- Si cambian reglas de armado/prode, actualizar:
  - `src/lib/domain/rules.ts`
  - validaciones API
  - constraints/funciones en SQL
- Ejecutar siempre antes de cerrar:
  - `npm run lint`
  - `npm run build`

## Pendientes naturales para siguiente sesion

1. Admin panel para carga de puntos/precios/resultados.
2. Job de cierre por fecha y recalculo automatico.
3. Tests de reglas de dominio y rutas API.
4. Mejoras UX finas (empty states, feedback de guardado, loading skeletons).
