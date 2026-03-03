# Context Prompt — Resumen ejecutivo para el "yo del futuro"

## Para usar este documento
Copia el bloque de "Prompt para IA" al inicio de una conversación nueva con Windsurf/Cursor/ChatGPT cuando retomes el proyecto después de un tiempo o cuando incorpores a alguien nuevo.

---

## Prompt para IA (copiar y pegar)

```
Estás trabajando en el proyecto "ERP de Vida" (repo: EngelRomeroViperB/ERP_V1per_Bite).

## Stack
- Next.js 15 (App Router) + TypeScript + React 19
- Supabase (PostgreSQL + Auth + Storage)
- Google Gemini AI (gemini-2.5-flash → gemini-2.0-flash → fallback local)
- Tailwind CSS + Radix UI + Recharts
- Vercel (deploy)

## Arquitectura
- Monolito full-stack: páginas en src/app/(app)/, APIs en src/app/api/
- Auth via middleware (src/middleware.ts) → redirige a /login sin sesión
- Datos de usuario aislados por RLS en Supabase
- Config del usuario en profiles.preferences (JSONB)
- 4 Route Handlers: /api/ai/chat, /api/ai/quick-capture, /api/notifications/push, /api/webhooks/shopify

## Módulos del sistema
| Ruta | Descripción |
|---|---|
| /dashboard | KPIs + hábitos + tendencias + finanzas |
| /tasks | Tareas con P1/P2/P3 |
| /projects | Proyectos con % completado |
| /areas | Áreas de vida (jerarquía) |
| /habits | Hábitos con heatmap 28 días |
| /metrics | Mood, peso, sueño, energía, estrés |
| /finances | Ingresos/gastos + integración Shopify |
| /brain | Notas, snippets, recursos |
| /nlp | Chat IA con contexto de datos |
| /crm | Contactos e interacciones |
| /skills | Árbol de habilidades |
| /settings | Preferencias del usuario |

## Variables de entorno requeridas
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
GEMINI_API_KEY, SHOPIFY_WEBHOOK_SECRET,
VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

## Patrones importantes
1. Route handlers: siempre validar auth → payload → lógica → respuesta
2. JSONB preferences: siempre usar narrowing explícito, nunca casteo directo
3. Modales: usar React.createPortal() hacia document.body
4. IA: la cadena de fallback ya existe, no romperla
5. Vercel: Root Directory debe estar VACÍO en Project Settings

## Deuda técnica activa
- Sin capa de servicios (lógica en route handlers)
- preferences sin schema validation (zod pendiente)
- Sin CI formal
- Sin tests automatizados
- Sin idempotencia en webhook Shopify

## Archivos más críticos
- src/middleware.ts → auth guard
- src/lib/gemini.ts → modelo IA + fallback
- src/lib/supabase/server.ts → cliente server
- src/app/api/ai/quick-capture/route.ts → captura con IA
- src/app/(app)/settings/SettingsClient.tsx → preferencias
- supabase/migrations/001_initial_schema.sql → esquema DB

## Reglas de este proyecto
1. Nunca commitear .env.local
2. npm run lint && npm run build antes de push a master
3. Nuevas migraciones siempre en nuevo archivo (00N_*.sql), nunca editar las existentes
4. Documentar toda decisión técnica nueva en docs/architecture/ADR.md
5. Documentar todo incidente en docs/analysis/post_mortem.md
```

---

## Resumen técnico ejecutivo

### ¿Qué es este proyecto?
Sistema SaaS personal para gestión de tareas, hábitos y finanzas con IA integrada. Dashboard personalizable, captura rápida por voz/texto, integración con Shopify y push notifications.

### ¿Dónde está el código más importante?
```
src/app/
├── (app)/           → páginas autenticadas (11 módulos)
├── (auth)/          → login + callback
├── api/             → 4 route handlers
└── globals.css      → paleta de colores + utilitarios

src/lib/
├── supabase/        → clients browser/server
├── gemini.ts        → cadena IA + detección de cuota
└── utils.ts         → cn() helper

src/middleware.ts    → auth guard para toda la app

supabase/migrations/ → esquema DB (5 archivos SQL)
```

### ¿Qué NO está implementado aún?
- Tests automatizados (0%)
- CI/CD formal (solo Vercel auto-deploy)
- Monitoreo de errores en producción (sin Sentry)
- Idempotencia en webhook Shopify
- Envío activo de push notifications desde servidor
- Capa de servicios (lógica mezclada con route handlers)
- Stripe / Firebase

### ¿Cuál es el primer archivo a leer al retomar?
`docs/analysis/technical_debt.md` → te da el estado actual de la deuda y qué resolver primero.

### ¿Cuál es el riesgo más urgente?
Sin CI ni tests, un cambio en el route handler de quick-capture o en el middleware puede romper la app en producción silenciosamente.

---

## Onboarding checklist para dev nuevo

- [ ] Leer este documento completo.
- [ ] Leer `docs/devops/README_DEV.md` para setup local.
- [ ] Ejecutar migraciones SQL en Supabase (001 → 005).
- [ ] Configurar Google OAuth en Supabase Dashboard.
- [ ] Obtener `GEMINI_API_KEY` de Google AI Studio.
- [ ] Ejecutar `npm run dev` y verificar login + dashboard + quick-capture.
- [ ] Leer `docs/analysis/technical_debt.md` antes de hacer cualquier cambio.
- [ ] Leer `docs/architecture/ADR.md` para entender decisiones del stack.

---

## Reglas no negociables

| Regla | Razón |
|---|---|
| Root Directory vacío en Vercel | `.` rompe la detección de Next.js |
| No editar migraciones existentes | Genera drift de DB en producción |
| `npm run lint && npm run build` antes de push | Sin CI, es la única gate de calidad |
| Narrowing explícito en `preferences` | Evita errores silenciosos por campos corruptos |
| Portal para todos los overlays | `backdrop-filter` rompe `position: fixed` en descendientes |

## Próximos pasos
1. Compartir este prompt al inicio de cada sesión de trabajo larga.
2. Actualizar la sección "¿Qué NO está implementado aún?" a medida que se completan items.
3. Revisar "Reglas no negociables" trimestralmente.
