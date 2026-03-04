# AGENTS.md

## Proyecto

Repositorio de **Fantasy + Prode Mundial 2026** con:

- `Next.js` App Router + TypeScript
- `Supabase` (Postgres + Auth + RLS)
- `Tailwind CSS`

Producto objetivo:

1. Modo Fantasy (plantel estilo Gran DT)
2. Modo Prode (resultados por partido)
3. Ligas privadas y ranking global combinado

## Estado funcional actual

- Auth: email/password + Google OAuth.
- Registro por email requiere: `nombre`, `apellido`, `telefono`.
- Dashboard privado con navbar fijo:
  - `prode`
  - `mi equipo`
  - `ligas`
  - `resultados globales`
  - `mi cuenta`
- Squad builder:
  - Formaciones: `3-4-3`, `3-5-2`, `4-3-3`, `4-4-2`
  - Max 15 jugadores
  - 11 titulares + 4 suplentes
  - 1 suplente por posicion
  - Capitan solo titular
  - Filtros por posicion/equipo/puntaje
- Prode:
  - Edicion permitida solo antes del kickoff
  - Guardado batch por API
- Ligas privadas:
  - Crear liga
  - Unirse por codigo
  - Compartir invitacion por link
  - Ruta de invitacion: `/invite/[joinCode]`

## Feature nueva: invitacion por link

### Frontend

- `LeagueManager` muestra:
  - Link de invitacion por liga
  - Boton `Copiar codigo`
  - Boton `Copiar link`
  - Boton `Compartir` (Web Share API con fallback a copiar)
  - Boton `WhatsApp`
- Ruta `src/app/invite/[joinCode]/page.tsx`:
  - Si no hay sesion: redirect a login preservando `next`
  - Si hay sesion: auto-join de liga usando RPC
  - Si ya era miembro: mensaje y acceso directo a tabla

### Backend/DB

- `POST /api/leagues/join` ahora usa RPC segura `join_league_with_code`.
- `PUT /api/squad` ahora persiste con RPC transaccional `replace_fantasy_team_players` para evitar estados intermedios si falla una validacion.
- En `supabase/schema.sql` existe:
  - `public.join_league_with_code(p_join_code text)`
  - `public.replace_fantasy_team_players(p_team_id uuid, p_players jsonb)`
  - `security definer`
  - `grant execute ... to authenticated`

## Fuente de verdad DB

Usar siempre `supabase/schema.sql`.

Incluye:

- Enums (`player_position`, `squad_slot`, `fixture_status`)
- Tablas core (`profiles`, `players`, `fixtures`, `fantasy_teams`, `prode_predictions`, etc.)
- Triggers de integridad (`validate_fantasy_team_state`, `prevent_late_predictions`)
- Vistas scoring/standings (`v_global_standings`, `v_league_standings`)
- Funciones auxiliares RLS (`is_league_member`, `is_league_owner`)
- Funciones operativas (`join_league_with_code`, `replace_fantasy_team_players`)
- Policies RLS completas

## Benchmark competitivo (Gran DT / FPL / Fantasy globales)

Funcionalidades observadas para diferenciar producto y mejorar retencion:

1. Ventanas de transferencias por fecha con cupo limitado.
2. Chips/boosters por torneo (capitan x3, comodin, banco activo).
3. Historial de movimientos con feed de liga (altas/bajas/capitanes).
4. Mini ligas H2H semanales aparte del ranking acumulado.
5. Premios por hitos (racha de aciertos, top fecha, prediccion exacta).
6. Notificaciones previas al cierre y post-publicacion de puntos.

Priorizacion sugerida:

1. Ventanas de transferencia + historial (alto impacto y costo medio).
2. H2H semanal en ligas privadas (alto impacto social).
3. Chips limitados por torneo (diferenciacion fuerte).
4. Notificaciones y premios (retencion).

## Endpoints vigentes

- `POST /api/leagues`
- `POST /api/leagues/join`
- `PUT /api/squad`
- `PUT /api/prode/predictions`
- `PUT /api/profile`

No romper contratos sin migrar frontend.

## Setup rapido

1. `npm install`
2. Copiar `.env.example` a `.env.local` (o usar `.env`)
3. Definir:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
4. Ejecutar en Supabase SQL Editor:
   - `supabase/schema.sql`
   - opcional: `supabase/seed.sql`
5. `npm run dev`

## OAuth Google (errores tipicos)

Si aparece `Unsupported provider: provider is not enabled`:

1. Activar Google en `Authentication -> Providers -> Google`.
2. Cargar `Client ID` y `Client Secret`.
3. En Google Cloud agregar redirect URI:
   - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
4. En `Authentication -> URL Configuration`:
   - Site URL (ej. `http://localhost:3000`)
   - Redirect URL (`http://localhost:3000/auth/callback`)

## Direccion de diseño actual

- Tema de alto contraste, deportivo/editorial, no genérico.
- Base visual:
  - fondo crema
  - acento amarillo fuerte
  - bordes negros marcados
  - sombras offset tipo sticker/card game
- Tipografias:
  - Body: `Manrope`
  - Display: `Barlow Condensed`

## Checklist para “salir a produ”

1. Observabilidad:
   - Error tracking (Sentry)
   - Logging estructurado en APIs
2. Seguridad:
   - Revisar todas las policies RLS con casos reales
   - Rate limit en endpoints de join/create
3. Datos:
   - Pipeline admin para resultados/puntajes/precios
   - Jobs de recálculo por fecha
4. Calidad:
   - Tests en `rules.ts`
   - Tests API (join, squad, prode)
5. UX:
   - Loading/empty/error states más finos
   - Confirmaciones contextuales y toasts

## Prioridad de roadmap (corto plazo)

1. Transferencias por ventana (limitadas por fecha)
2. Historial de puntos por fecha y por jugador
3. Feed social de liga (movimientos/capitán/top de fecha)
4. Penalizaciones por no completar XI antes del cierre
5. Notificaciones de cierre de fecha y resultados publicados

## Regla para próximos agentes

- Mantener coherencia entre lógica de frontend, validación API y constraints SQL.
- No remover RLS ni funciones security definer existentes.
- Si cambian reglas de juego, actualizar en 3 capas:
  - `src/lib/domain/rules.ts`
  - endpoints API
  - `supabase/schema.sql`
- Antes de cerrar cambios: correr `npm run lint` y `npm run build`.

