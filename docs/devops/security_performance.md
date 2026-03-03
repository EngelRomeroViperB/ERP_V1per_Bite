# Security & Performance

## Resumen ejecutivo
Controles de seguridad y rendimiento implementados en el proyecto. Basado en configuración real de `next.config.ts`, `src/middleware.ts` y políticas RLS en `supabase/migrations/`.

---

## Autenticación y sesiones

### Middleware de auth (`src/middleware.ts`)
```ts
// Protege TODAS las rutas excepto:
// - /login y /callback (auth routes)
// - /api/* (manejado por cada handler)
// - assets estáticos y _next/*

const { data: { user } } = await supabase.auth.getUser();

if (!user && !isAuthRoute && !isCallbackRoute) {
  return NextResponse.redirect(new URL("/login", request.url));
}
if (user && isAuthRoute) {
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
```

### Manejo de tokens (Supabase SSR)
- Sesión persistida en cookies HTTP-only gestionadas por `@supabase/ssr`.
- `createServerClient` en `src/lib/supabase/server.ts` — lee y refresca cookies automáticamente.
- `createBrowserClient` en `src/lib/supabase/client.ts` — para componentes cliente.

### RLS (Row Level Security)
- Definida en `supabase/migrations/002_rls_policies.sql`.
- **Principio**: cada usuario solo puede ver/modificar sus propios registros.
- Todas las tablas tienen `user_id` referenciando `profiles(id)` con `ON DELETE CASCADE`.

---

## Cabeceras HTTP de seguridad (`next.config.ts`)

Aplicadas a **todas las rutas** (`source: "/(.*)"`)

| Header | Valor | Protección |
|---|---|---|
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Filtración de URL en Referer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Acceso a APIs del navegador |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forzar HTTPS (2 años) |
| `X-DNS-Prefetch-Control` | `on` | Performance DNS |

### CSP (Content Security Policy)
```
default-src 'self'
script-src 'self' 'unsafe-eval' 'unsafe-inline'
style-src 'self' 'unsafe-inline'
img-src 'self' blob: data: https://*.supabase.co https://lh3.googleusercontent.com
font-src 'self'
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com
frame-ancestors 'none'
```

⚠️ **Riesgo activo**: `unsafe-eval` y `unsafe-inline` en `script-src` son necesarios para Next.js en desarrollo pero reducen la eficacia del CSP contra XSS en producción. Considerar nonces para producción.

---

## CORS
- Las APIs internas (`/api/ai/*`, `/api/notifications/*`) solo son accesibles desde el mismo origen (Vercel).
- No hay política CORS custom — se apoya en Same-Origin Policy del navegador.
- Para integraciones externas (Shopify), la autenticación es por HMAC, no por CORS.

⚠️ Si en el futuro se quiere exponer APIs a clientes externos, se debe implementar CORS explícito por endpoint.

---

## Sanitización de inputs

### En APIs (`src/app/api/ai/*/route.ts`)
```ts
// Validación de tipo y longitud
if (typeof text !== "string" || text.trim().length === 0) {
  return NextResponse.json({ error: "Texto inválido" }, { status: 400 });
}
if (text.length > 500) {
  return NextResponse.json({ error: "Texto demasiado largo (máx. 500 caracteres)" }, { status: 400 });
}
```

⚠️ **Brecha**: sin validación de esquema formal (zod/valibot). La validación es manual y puede quedar incompleta.

### Webhook Shopify
```ts
// Verificación de integridad con timing-safe compare
const digest = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
```

---

## Optimización de queries

### Índices definidos en `001_initial_schema.sql`
```sql
CREATE INDEX idx_tasks_user_status    ON public.tasks(user_id, status);
CREATE INDEX idx_tasks_due_date       ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_priority       ON public.tasks(user_id, priority);
CREATE INDEX idx_daily_metrics_date   ON public.daily_metrics(user_id, metric_date DESC);
CREATE INDEX idx_finances_date        ON public.finances(user_id, transaction_date DESC);
CREATE INDEX idx_brain_notes_user     ON public.brain_notes(user_id, type);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_ai_insights_date     ON public.ai_insights(user_id, insight_date DESC);
```

### Patrones de query eficientes usados
```ts
// Filtro siempre por user_id + columna indexada
.from("tasks").select("*").in("status", ["todo","in_progress"]).lte("due_date", today).limit(10)
.from("daily_metrics").gte("metric_date", trendStart).order("metric_date")
.from("finances").gte("transaction_date", days14Start).order("transaction_date", { ascending: true })
```

---

## Lazy loading y optimización de bundle

### Package imports optimizados (`next.config.ts`)
```ts
experimental: {
  optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
}
```
Esto genera tree-shaking automático para estas librerías pesadas, reduciendo el bundle size.

### Image optimization
```ts
// next.config.ts — dominios permitidos para next/image
remotePatterns: [
  { protocol: "https", hostname: "*.supabase.co" },
  { protocol: "https", hostname: "lh3.googleusercontent.com" }, // avatares Google
]
```

---

## Memoización y re-renders

### Buenas prácticas identificadas
- `useMemo` para listas filtradas costosas en cliente.
- Server Components para datos que no cambian en el cliente.
- `useState` con inicializadores de función para evitar re-computación.

```tsx
// Patrón: filtrado memorizado
const filtered = useMemo(() =>
  txs.filter(t => filterType === "all" || t.type === filterType),
  [txs, filterType]
);
```

---

## Estrategias de caching
- **Next.js default**: Server Components sin `cache: "no-store"` cachean resultado.
- **Supabase**: sin capa de cache adicional — consultas en cada request.
- Sin Redis ni CDN de datos implementado actualmente.

⚠️ En dashboards con muchos usuarios concurrentes, las queries de agregación pueden ser costosas sin cache.

---

## Riesgos y limitaciones
| Riesgo | Severidad | Estado |
|---|---|---|
| `unsafe-eval` + `unsafe-inline` en CSP | Alta | Activo |
| Sin rate limiting en APIs IA | Media | Activo |
| Sin idempotencia en webhook Shopify | Media | Activo |
| Sin schema validation (zod) | Media | Activo |
| RLS depende de migraciones correctas | Alta | Mitigado (005_security_fixes.sql) |
| Sin monitoreo de errores en producción | Media | Activo |

## Checklist operativo
- [ ] Revisar RLS tras cada migración nueva.
- [ ] Auditar CSP en Chrome DevTools → Security tab.
- [ ] Añadir rate limiting en `/api/ai/*`.
- [ ] Configurar alertas de errores (Sentry o similar).
- [ ] Revisar `EXPLAIN ANALYZE` en queries nuevas que recorren tablas grandes.

## Próximos pasos
1. Implementar validación con `zod` en todos los route handlers.
2. Agregar rate limiting por IP/token en endpoints públicos.
3. Reemplazar `unsafe-eval` con nonces en CSP para producción.
4. Introducir Sentry para monitoreo de errores en producción.
