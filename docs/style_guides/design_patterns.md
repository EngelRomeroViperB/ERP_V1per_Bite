# Design Patterns

## Resumen ejecutivo
Catálogo de patrones de diseño aplicados en el proyecto con ejemplos concretos extraídos del código real. Incluye patrones positivos a mantener y antipatrones a evitar.

## Alcance
Frontend, APIs, integración y persistencia.

---

## Patrón 1: Strategy — Selección de modelo IA

**Dónde**: `src/lib/gemini.ts`, `src/app/api/ai/chat/route.ts`, `src/app/api/ai/quick-capture/route.ts`

**Descripción**: En lugar de un modelo IA único, se intenta una cadena de candidatos en orden, con fallback a lógica local si todos fallan.

```ts
// src/lib/gemini.ts
const DEFAULT_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

export function getGeminiModelCandidates() {
  const configured = (process.env.GEMINI_MODELS ?? "")
    .split(",").map(m => m.trim()).filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_GEMINI_MODELS;
}

// Uso en route handler
for (const modelName of getGeminiModelCandidates()) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: GEMINI_API_VERSION });
    const result = await model.generateContent(prompt);
    aiParsed = normalizeCaptureResult(JSON.parse(result.response.text()), inputText);
    break; // éxito → salir del loop
  } catch (err) {
    if (isGeminiQuotaError(err.message)) quotaDetected = true;
  }
}
if (!aiParsed) parsed = classifyLocally(inputText); // fallback
```

**Beneficio**: resiliencia ante fallos parciales de modelos o cuota.

---

## Patrón 2: Adapter — Webhook Shopify → Entidad financiera

**Dónde**: `src/app/api/webhooks/shopify/route.ts`

**Descripción**: El payload de Shopify se adapta al esquema interno de `finances` antes de persistir.

```ts
// Entrada: payload Shopify orders/paid
const order = payload as ShopifyOrder;
const amount = parseFloat(order.total_price ?? "0");

// Adaptación → estructura interna
const insertData = {
  title: `Orden Shopify #${order.order_number}`,
  amount,
  type: "income" as const,
  source: shopDomain,
  transaction_date: order.created_at?.slice(0, 10) ?? today,
  is_shopify: true,
  shopify_meta: { order_id: order.id, currency: order.currency, ... },
};
await supabase.from("finances").insert(insertData);
```

**Beneficio**: el dominio de finanzas no conoce la estructura de Shopify.

---

## Patrón 3: Portal — Modal fuera del árbol DOM del layout

**Dónde**: `src/components/layout/Header.tsx`

**Descripción**: El modal de Quick Capture se renderiza en `document.body` via `ReactDOM.createPortal()` para evitar clipping por el header sticky con `backdrop-filter`.

```tsx
import { createPortal } from "react-dom";

// En el render del Header:
{showCapture && typeof document !== "undefined" && createPortal(
  <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
    <div className="glass rounded-2xl p-5 w-full max-w-lg">
      {/* contenido del modal */}
    </div>
  </div>,
  document.body
)}
```

**Beneficio**: el modal no hereda `overflow: hidden` ni `transform` del header, que romperían `position: fixed`.

---

## Patrón 4: Server Component + Client Component híbrido

**Dónde**: `src/app/(app)/dashboard/page.tsx` (Server) + `src/app/(app)/dashboard/TrendChart.tsx` (Client)

**Descripción**: La página agrega datos en servidor (sin waterfall en cliente), y delega solo la visualización interactiva a componentes cliente.

```tsx
// page.tsx — Server Component
export default async function DashboardPage() {
  const supabase = await createClient(); // server client
  const { data: weekMetrics } = await supabase.from("daily_metrics").select("...").gte("metric_date", trendStart);
  return <TrendChart data={weekMetrics ?? []} />; // pasa data serializable
}

// TrendChart.tsx — Client Component
"use client";
export function TrendChart({ data }: { data: MetricPoint[] }) {
  return <ResponsiveContainer>...</ResponsiveContainer>; // Recharts requiere client
}
```

**Beneficio**: datos fresh sin useEffect, charts interactivos donde se necesitan.

---

## Patrón 5: Preferencias configurables que afectan runtime

**Dónde**: `src/app/api/ai/quick-capture/route.ts`, `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/finances/page.tsx`

**Descripción**: Las preferencias del usuario guardadas en `profiles.preferences` (JSONB) son leídas en cada request y modifican el comportamiento:

```ts
// En quick-capture: usa prioridad y auto-tags del usuario
const preferences = (profile?.preferences ?? {}) as Record<string, unknown>;
const preferredPriority = normalizeTaskPriority(
  typeof preferences.quick_capture_default_priority === "string"
    ? preferences.quick_capture_default_priority : "P3"
);

// En dashboard: usa trend range configurado
const trendDays = [7, 14, 30].includes(Number(preferences.dashboard_trend_days))
  ? Number(preferences.dashboard_trend_days) : 7;

// En finances: usa locale y moneda configurados
const fmt = (n: number) => new Intl.NumberFormat(
  preferences.finance_locale ?? "es-CO",
  { style: "currency", currency: preferences.finance_currency ?? "COP" }
).format(n);
```

**Riesgo**: sin validación estricta, un valor corrupto en `preferences` puede causar comportamientos inesperados silenciosos.

---

## Antipatrones identificados (evitar)

### ❌ Lógica de dominio mezclada con transporte
```ts
// Evitar: regla de negocio dentro del route handler
if (amount > 0) {
  await supabase.from("finances").insert(...)
} else {
  // fallback a brain_notes...
}
// Mover a: FinanceService.saveOrFallback(amount, text, userId)
```

### ❌ Casting genérico sin validación
```ts
// Evitar
const preferences = profile?.preferences as Record<string, unknown>;
const priority = preferences.priority as string; // puede ser undefined/null/number

// Preferir
const priority = typeof preferences.priority === "string" ? preferences.priority : "P3";
```

### ❌ Dependencias de efecto estables no declaradas
```tsx
// Evitar: abre puerta a bugs de stale closure
useEffect(() => { fetchNotifications(); }, []); // eslint-disable-line

// Preferir documentar el por qué si es intencional
useEffect(() => {
  fetchNotifications(); // intencional: solo al montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

---

## Riesgos y limitaciones
- Sin capa de servicios formal, los patrones dependen de disciplina del desarrollador.
- Adapter de Shopify no tiene versioning del esquema del payload.

## Checklist operativo
- [ ] Revisar nuevos route handlers contra el patrón estándar.
- [ ] Verificar que componentes cliente solo reciben data serializable.
- [ ] Validar preferencias con narrowing explícito antes de usar.

## Próximos pasos
1. Crear módulo `src/services/` con interfaces explícitas por dominio.
2. Implementar Result type para manejo consistente de errores.
3. Documentar cada nuevo patrón con ejemplo real en este archivo.
