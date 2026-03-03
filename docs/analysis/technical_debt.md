# Technical Debt

## Resumen ejecutivo
Inventario de deuda técnica identificada, clasificada por severidad e impacto. Incluye autocrítica directa, riesgos de escalabilidad y refactors priorizados.

## Alcance
Todo el codebase: `src/`, `supabase/`, configuración y DevOps.

---

## Matriz de deuda técnica

| ID | Deuda | Severidad | Impacto | Esfuerzo de fix | Prioridad |
|---|---|---|---|---|---|
| DT-01 | Sin capa de servicios (lógica en route handlers) | Alta | Mantenibilidad, testabilidad | Alto | 1 |
| DT-02 | JSONB `preferences` sin schema validation | Alta | Datos corruptos silenciosos | Medio | 2 |
| DT-03 | Sin CI/CD formal | Alta | Calidad de código, deploys rotos | Medio | 3 |
| DT-04 | Sin monitoreo de errores en producción | Alta | Incidentes invisibles | Bajo | 4 |
| DT-05 | Sin idempotencia en webhook Shopify | Media | Duplicados de transacciones | Bajo | 5 |
| DT-06 | `unsafe-eval` en CSP | Media | Exposición XSS reducida | Alto | 6 |
| DT-07 | Sin rate limiting en APIs IA | Media | Abuso de quota, costo | Medio | 7 |
| DT-08 | Sin Prettier / Husky configurados | Media | Deriva de estilo entre devs | Bajo | 8 |
| DT-09 | Sin staging environment | Media | Pruebas solo en producción | Medio | 9 |
| DT-10 | Sin tests automatizados | Alta | Regresiones invisibles | Alto | — |

---

## DT-01: Sin capa de servicios (crítico)

**Descripción**: Lógica de dominio mezclada con transporte HTTP en route handlers.

```ts
// ❌ Estado actual: src/app/api/ai/quick-capture/route.ts
export async function POST(req: NextRequest) {
  // autenticación + validación + lógica IA + clasificación + insert DB
  // ~250 líneas en un solo archivo
}

// ✅ Objetivo: separación de responsabilidades
// src/services/CaptureService.ts
export class CaptureService {
  async classify(text: string, userId: string): Promise<CaptureResult> { ... }
  async save(result: CaptureResult, userId: string): Promise<void> { ... }
}

// src/app/api/ai/quick-capture/route.ts — solo orquestación
export async function POST(req: NextRequest) {
  const body = await validateRequest(req);
  const result = await captureService.classify(body.text, user.id);
  await captureService.save(result, user.id);
  return NextResponse.json(result);
}
```

**Riesgo de escalabilidad**: Al agregar features de IA (resumen, priorización automática), el archivo crece sin límite controlado.

---

## DT-02: JSONB `preferences` sin schema validation (alto)

**Descripción**: El campo `profiles.preferences` acepta cualquier estructura JSONB. No hay validación al escribir ni al leer.

```ts
// ❌ Estado actual
const preferences = (profile?.preferences ?? {}) as Record<string, unknown>;
const priority = preferences.quick_capture_default_priority; // puede ser cualquier tipo

// ✅ Objetivo
import { z } from "zod";
const PreferencesSchema = z.object({
  quick_capture_default_priority: z.enum(["P1","P2","P3"]).default("P3"),
  finance_currency: z.string().default("COP"),
  dashboard_trend_days: z.number().int().default(7),
  // ... todos los campos
});
const parsed = PreferencesSchema.safeParse(profile?.preferences);
```

**Riesgo**: Campo corrupto puede romper la app silenciosamente para un usuario específico.

---

## DT-03: Sin CI/CD formal

**Descripción**: No existe pipeline automatizado. El flujo actual es: push → Vercel detecta → build → deploy. Sin gates de calidad.

**Consecuencia real**: Un `npm run build` fallido puede llegar a `master` si el dev no ejecuta el check local.

**Solución mínima viable** (< 1 día de implementación):
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

---

## DT-04: Sin monitoreo de errores en producción

**Descripción**: Errores en producción solo son visibles en Vercel Function Logs, sin alertas ni agregación.

**Riesgo**: Un error silencioso (ej. quota IA, RLS incorrecta) puede afectar usuarios durante horas sin que nadie lo note.

**Solución recomendada**:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Costo: Plan gratuito de Sentry cubre 5000 errores/mes.

---

## DT-05: Sin idempotencia en webhook Shopify

**Descripción**: Shopify puede reintentar webhooks (hasta 19 veces en 48h). Sin verificación de duplicados, cada retry crea una nueva transacción financiera.

**Solución**:
```sql
-- Agregar constraint unique
ALTER TABLE webhook_logs ADD UNIQUE (event_id, topic);
ALTER TABLE finances ADD COLUMN shopify_order_id TEXT UNIQUE;
```

```ts
// Antes de insertar
const existing = await supabase.from("finances")
  .select("id").eq("shopify_order_id", order.id).single();
if (existing.data) return NextResponse.json({ received: true, duplicate: true });
```

---

## DT-10: Sin tests automatizados (deuda estructural)

**Descripción**: Cero tests en el proyecto. Ni unitarios, ni de integración, ni E2E.

**Impacto**:
- Cualquier refactor tiene riesgo de regresión invisible.
- Onboarding de devs nuevos sin red de seguridad.
- Imposible verificar comportamiento del fallback IA automáticamente.

**Prioridad de cobertura inicial**:
1. `classifyLocally()` — función crítica de fallback.
2. `verifyShopifyHmac()` — seguridad.
3. Flujo de autenticación (middleware).
4. Cálculos financieros (totales, límite de gasto).
5. `PreferencesSchema.parse()` cuando se implemente.

---

## Riesgos de escalabilidad

| Escenario | Problema actual | Umbral estimado de falla |
|---|---|---|
| +500 usuarios activos | Queries de dashboard sin cache | ~100 req/s concurrentes en hora pico |
| +10 webhooks/min de Shopify | Serverless cold starts + timeouts | >5 webhooks/min en ventana de 1min |
| JSONB preferences > 10KB | Latencia creciente en queries | Sin umbral definido |
| +50 route handlers | Sin organización de dominio | Mantenibilidad degrada exponencialmente |

## Refactors prioritarios

```
Semana 1-2:
  → DT-03: Implementar GitHub Actions CI (< 4h)
  → DT-04: Instalar Sentry (< 2h)

Semana 3-4:
  → DT-05: Idempotencia webhook (< 1 día)
  → DT-02: Zod schema para preferences (< 2 días)

Mes 2:
  → DT-01: Capa de servicios (2-3 sprints)
  → DT-10: Tests unitarios de funciones críticas (ongoing)
```

## Checklist operativo
- [ ] Revisar esta lista en cada sprint planning.
- [ ] No agregar nueva deuda sin documentarla aquí.
- [ ] Prioridad 1-4 deben resolverse antes de lanzamiento público.

## Próximos pasos
1. Implementar CI en próximo sprint (DT-03) — mayor ROI con menor esfuerzo.
2. Crear `src/schemas/preferences.ts` con zod (DT-02).
3. Agregar constraint unique en `webhook_logs` (DT-05).
