# Architecture Decision Records (ADR)

## Resumen ejecutivo
Este documento registra las decisiones arquitectónicas de mayor impacto en el sistema ERP de Vida (Windsurf). Cada ADR incluye contexto, decisión, justificación técnica profunda, alternativas descartadas y riesgos introducidos.

## Alcance
Stack completo: Next.js 15 App Router, Supabase (Auth + PostgreSQL + RLS), IA Gemini con fallback local, Vercel serverless, integración Shopify webhook y push web via Service Worker.

## Archivos de referencia clave
- `src/middleware.ts` — auth guard
- `src/lib/gemini.ts` — modelo IA y fallback
- `src/app/api/ai/chat/route.ts` — chat IA
- `src/app/api/ai/quick-capture/route.ts` — captura inteligente
- `src/app/api/webhooks/shopify/route.ts` — webhook Shopify
- `src/lib/supabase/server.ts` / `client.ts` — acceso a datos
- `supabase/migrations/001_initial_schema.sql` — esquema completo
- `next.config.ts` — headers de seguridad

---

## ADR-001: Next.js 15 App Router como monolito full-stack

| Campo | Valor |
|---|---|
| Estado | ✅ Aceptada |
| Fecha | 2025 |
| Owner | Engel Romero |

### Decisión
Usar Next.js 15 con App Router como único runtime, unificando SSR, CSR y API Routes en el mismo proceso y repositorio.

### Justificación técnica profunda
- SSR nativo reduce latency para rutas autenticadas (dashboard, settings).
- Route Handlers en `src/app/api/` permiten lógica backend sin servidor separado.
- Deploy en Vercel es trivial: sin Dockerfile, sin ECS, sin clusters.
- Shared types entre frontend y backend elimina contrato duplicado.

### Alternativas descartadas
1. **Next.js + Express API separada** → complejidad operativa innecesaria para equipo pequeño.
2. **Remix** → madurez del ecosistema y soporte Vercel inferior al momento de decisión.
3. **SvelteKit** → menor ecosistema de componentes UI disponible.

### Impacto futuro
- Escala bien hasta ~50 req/s en Vercel serverless.
- Al crecer en features, requiere modularización estricta de dominios.
- Acoplamiento fuerte entre deploy FE y BE puede ser limitante en equipos grandes.

### Riesgos introducidos
- `[ACTIVO]` Lógica de dominio mezclada con capa de transporte en route handlers.
- `[ACTIVO]` Sin separación de releases FE/BE.

---

## ADR-002: Supabase como único proveedor de Auth + DB + Storage

| Campo | Valor |
|---|---|
| Estado | ✅ Aceptada |
| Fecha | 2025 |

### Decisión
Usar Supabase para PostgreSQL, autenticación (Google OAuth + Magic Link) y almacenamiento de assets.

### Justificación técnica profunda
- RLS (Row Level Security) aísla datos por usuario a nivel de base de datos, reduciendo riesgo de data leaks por bug de aplicación.
- Auth + DB en mismo vendor reduce latencia de consultas autenticadas.
- SDK `@supabase/ssr` maneja cookies en Server Components de forma segura.
- Migraciones SQL versionadas en `supabase/migrations/` permiten evolución controlada.

### Alternativas descartadas
1. **Firebase** → menor afinidad SQL para analytics y relaciones complejas.
2. **Auth0 + Neon + Prisma** → tres vendors, mayor costo de integración y monitoreo.
3. **PlanetScale** → sin soporte real de foreign keys; incompatible con esquema relacional actual.

### Impacto futuro
- Las 15+ tablas del esquema tienen índices bien definidos para queries frecuentes.
- Si se requiere analítica pesada, evaluar separar a ClickHouse o BigQuery.
- Dependencia de Supabase como vendor único es un riesgo de lock-in gestionable.

### Riesgos introducidos
- `[ACTIVO]` RLS mal configurada puede filtrar datos entre usuarios.
- `[ACTIVO]` `profiles.preferences` como JSONB sin esquema versionado.
- `[MITIGADO]` RLS cubierta en `002_rls_policies.sql`.

---

## ADR-003: JSONB `profiles.preferences` para configuración extensible

| Campo | Valor |
|---|---|
| Estado | ⚠️ Aceptada con deuda |
| Fecha | 2025 |

### Decisión
Centralizar toda la configuración de usuario (dashboard, notificaciones, quick-capture, finanzas, metas) en una columna JSONB en `profiles`.

### Justificación técnica profunda
- Permite agregar campos de config sin migraciones.
- Reduce join overhead para cargar preferencias en cada request.
- Flexible para fase de producto early-stage con alta mutabilidad de features.

### Alternativas descartadas
1. **Tabla normalizada key/value** → más robusta, pero costo de migración alto por cada feature nueva.
2. **Redis/KV store** → latencia adicional y costo operativo.

### Impacto futuro
- Alta velocidad de iteración a corto plazo.
- A largo plazo: riesgo de inconsistencia semántica entre campos.
- Necesita estrategia de versioning y validación.

### Riesgos introducidos
- `[ACTIVO]` Sin validación de esquema, datos corruptos pasan silenciosamente.
- `[ACTIVO]` Tipo `Record<string, unknown>` en TypeScript requiere casteo manual y es frágil.

---

## ADR-004: IA Gemini con cadena de fallback y modo contingencia local

| Campo | Valor |
|---|---|
| Estado | ✅ Aceptada |
| Fecha | 2025 |
| Archivos | `src/lib/gemini.ts`, `src/app/api/ai/chat/route.ts`, `src/app/api/ai/quick-capture/route.ts` |

### Decisión
Usar Google Gemini (`gemini-2.5-flash` → `gemini-2.0-flash`) con fallback local configurable por env var y modo contingencia para preservar UX ante falta de cuota.

```ts
// src/lib/gemini.ts
const DEFAULT_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
export const GEMINI_API_VERSION = "v1beta";
```

### Justificación técnica profunda
- El usuario puede seguir usando quick-capture incluso sin GEMINI_API_KEY.
- La cadena de modelos permite absorber cortes parciales de disponibilidad de un modelo.
- `isGeminiQuotaError()` detecta 429/quota/rate-limit para degradar con gracia.

### Alternativas descartadas
1. **Bloquear funcionalidad cuando IA no está disponible** → inaceptable para UX.
2. **Modelo único sin fallback** → punto único de fallo.
3. **OpenAI GPT** → costo por token más alto; Gemini tiene capa gratuita generosa.

### Riesgos introducidos
- `[ACTIVO]` Clasificación del fallback local puede divergir de la IA real.
- `[ACTIVO]` Sin monitoreo de tasa de uso del fallback, es difícil saber cuándo se degrada.

---

## ADR-005: Webhook Shopify con validación HMAC-SHA256

| Campo | Valor |
|---|---|
| Estado | ✅ Aceptada |
| Archivo | `src/app/api/webhooks/shopify/route.ts` |

### Decisión
Verificar firma HMAC antes de procesar cualquier payload de Shopify, registrar en `webhook_logs` y crear transacción financiera para `orders/paid`.

```ts
const digest = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
```

### Riesgos introducidos
- `[ACTIVO]` Sin idempotencia por `event_id`: retry de Shopify puede duplicar transacciones.
- `[ACTIVO]` Sin cola async: si la DB falla, el evento se pierde.

---

## ADR-006: Security Headers en next.config.ts

| Campo | Valor |
|---|---|
| Estado | ✅ Aceptada |
| Archivo | `next.config.ts` |

### Decisión
Aplicar headers de seguridad a todas las rutas vía `headers()` en Next.js config:

```
Content-Security-Policy: default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Riesgos introducidos
- `[ACTIVO]` CSP con `unsafe-eval` y `unsafe-inline` en scripts por necesidad de Next.js — reduce eficacia del CSP contra XSS.

---

## Configuración y variables de entorno
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
GEMINI_MODELS=gemini-2.5-flash,gemini-2.0-flash  # opcional
SHOPIFY_WEBHOOK_SECRET=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:tu@email.com
```

## Riesgos y limitaciones
- Sin separación de bounded contexts explícita.
- Sin CI estricto como gate de calidad.
- Dependencia de configuración manual de Vercel (Root Directory vacío, envs por ambiente).

## Checklist operativo
- [ ] Validar envs críticas antes de deploy a producción.
- [ ] Revisar políticas RLS tras cada migración.
- [ ] Ejecutar `npm run lint && npm run build` antes de merge.
- [ ] Verificar fallback IA en escenario sin API key.
- [ ] Revisar logs de webhook para detectar duplicados.

## Próximos pasos
1. Agregar ADR formal por cada decisión nueva con template `docs/templates/template_adr.md`.
2. Implementar idempotencia en webhook Shopify.
3. Versionar `profiles.preferences` con esquema explícito.
4. Explorar `zod` para validación de payloads y preferencias.
