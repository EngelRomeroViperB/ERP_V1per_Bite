# Third-Party Integrations

## Resumen ejecutivo
Documentación de todas las integraciones externas del proyecto: Supabase, Google Gemini, Shopify y Web Push. Incluye configuración, casos de uso, manejo de errores y estado actual.

---

## 1. Supabase

### Rol en el sistema
- **Auth**: Google OAuth + Magic Link. Gestión de sesiones con cookies SSR.
- **Base de datos**: PostgreSQL con RLS por usuario.
- **Storage**: Avatares de usuarios (dominio `*.supabase.co`).

### Configuración
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=   # Solo para operaciones de admin en servidor
```

### Clients usados
```ts
// Browser client — componentes cliente
import { createBrowserClient } from "@supabase/ssr";
// → src/lib/supabase/client.ts

// Server client — Server Components y Route Handlers
import { createServerClient } from "@supabase/ssr";
// → src/lib/supabase/server.ts
```

### Configuración en Supabase Dashboard
1. **Authentication → Providers → Google**: Client ID + Secret de Google Cloud Console.
2. **Authentication → URL Configuration**:
   ```
   Site URL:      https://tu-dominio.vercel.app
   Redirect URLs: https://tu-dominio.vercel.app/callback
                  http://localhost:3000/callback
   ```
3. **SQL Editor**: ejecutar migraciones en orden `001` → `005`.

### Manejo de errores
```ts
const { data, error } = await supabase.from("tasks").insert({ ... });
if (error) {
  // Error típico: violación de RLS → code "42501"
  // Error de FK: code "23503"
  // Error de unique: code "23505"
  console.error("[supabase] insert error:", error.code, error.message);
  throw error;
}
```

### Riesgos
- RLS mal configurada puede filtrar datos entre usuarios.
- `anon_key` es público pero sin RLS activa expone todos los datos.
- Sin PgBouncer activo en plan Free → límite de 60 conexiones simultáneas.

---

## 2. Google Gemini AI

### Rol en el sistema
- Clasificación de texto en Quick Capture (tarea/hábito/métrica/finanza/nota).
- Chat conversacional con contexto de datos del usuario.

### Configuración
```env
GEMINI_API_KEY=AIza...
GEMINI_MODELS=gemini-2.5-flash,gemini-2.0-flash   # opcional, override de modelos
```

### Integración (`src/lib/gemini.ts`)
```ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
export const GEMINI_API_VERSION = "v1beta";
const DEFAULT_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

export function getGeminiModelCandidates(): string[] {
  const configured = (process.env.GEMINI_MODELS ?? "")
    .split(",").map(m => m.trim()).filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_GEMINI_MODELS;
}

export function isGeminiQuotaError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("429") || lower.includes("quota") ||
         lower.includes("rate limit") || lower.includes("resource exhausted");
}
```

### Prompt de clasificación (Quick Capture)
El prompt instruye al modelo a responder SOLO con JSON válido, sin markdown ni explicaciones. Define 5 categorías con sus campos específicos.

### Cadena de fallback
```
gemini-2.5-flash
    ↓ (error/quota)
gemini-2.0-flash
    ↓ (error/quota)
classifyLocally(text)  ← heurísticas por keywords
```

### Casos de error y manejo
| Error | Código/Mensaje | Manejo |
|---|---|---|
| Cuota agotada | `429 / "quota exceeded"` | `isGeminiQuotaError()` → fallback local |
| Modelo no disponible | `404 / "model not found"` | Siguiente modelo en cadena |
| JSON inválido en respuesta | `SyntaxError` | Fallback local |
| API key inválida | `401 / "API_KEY_INVALID"` | Error 500 sin fallback posible |
| Timeout de red | `ECONNRESET` | Fallback local |

### Obtener API Key
1. Ir a [Google AI Studio](https://aistudio.google.com).
2. **Get API key → Create API key in new project**.
3. Copiar la key y guardar en `GEMINI_API_KEY`.

### Límites del plan gratuito
| Modelo | Requests/min | Tokens/día |
|---|---|---|
| `gemini-2.5-flash` | 15 RPM | 1M TPD |
| `gemini-2.0-flash` | 15 RPM | 1M TPD |

### Riesgos
- Sin monitoreo de uso de quota — el fallback puede estar activo días sin que nadie lo note.
- JSON parsing puede fallar si el modelo incluye texto extra fuera del JSON.
- Sin cache de respuestas — mismo input hace llamada nueva cada vez.

---

## 3. Shopify Webhooks

### Rol en el sistema
Recibe notificaciones de pedidos pagados y los convierte en transacciones de ingreso en `finances`.

### Configuración en Shopify
1. **Admin → Settings → Notifications → Webhooks**.
2. **Agregar webhook**:
   - Event: `Order payment`
   - URL: `https://tu-dominio.vercel.app/api/webhooks/shopify`
   - Format: `JSON`
3. Copiar el **Signing secret** → guardar en `SHOPIFY_WEBHOOK_SECRET`.

### Configuración en el proyecto
```env
SHOPIFY_WEBHOOK_SECRET=shpss_...
```

### Flujo de procesamiento
```ts
// 1. Verificar firma HMAC-SHA256
const rawBody = await req.text();
const hmacHeader = req.headers.get("x-shopify-hmac-sha256") ?? "";
const isValid = verifyShopifyHmac(rawBody, hmacHeader, secret);
if (!isValid) return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });

// 2. Log del webhook
await supabase.from("webhook_logs").insert({ source: "shopify", payload, status: "received" });

// 3. Procesar evento orders/paid
const order = JSON.parse(rawBody);
await supabase.from("finances").insert({
  title: `Orden Shopify #${order.order_number}`,
  amount: parseFloat(order.total_price),
  type: "income",
  is_shopify: true,
  shopify_meta: { order_id: order.id, currency: order.currency, email: order.email },
  transaction_date: order.created_at?.slice(0, 10) ?? today,
});
```

### Estructura de `shopify_meta`
```ts
interface ShopifyMeta {
  order_id: number;
  currency: string;         // "COP", "USD", etc.
  email?: string;
  customer_name?: string;
  line_items_count?: number;
  fulfillment_status?: string;
}
```

### Política de reintentos de Shopify
Shopify reintenta el webhook hasta **19 veces** en 48 horas si no recibe `2xx`. Esto puede causar duplicados sin idempotencia.

### Manejo de errores
```ts
// Siempre responder 200 para evitar reintentos innecesarios
// Logear errores internamente, no exponer al webhook
await supabase.from("webhook_logs")
  .update({ status: "error", error_message: err.message })
  .eq("id", logId);
return NextResponse.json({ received: true }, { status: 200 });
```

### Riesgos
- `[CRÍTICO]` Sin idempotencia por `order_id` — reintentos duplican transacciones.
- Sin queue async — timeout de Shopify (5s) puede ocurrir en cold start.
- Sin filtro por tienda — cualquier tienda con el mismo secret puede enviar eventos.

---

## 4. Web Push Notifications

### Rol en el sistema
Notificaciones push del navegador via Service Worker. Usa el estándar Web Push con VAPID.

### Configuración
```bash
# Generar keys VAPID
npx web-push generate-vapid-keys
```

```env
VAPID_PUBLIC_KEY=BNl...   # Compartido con el cliente
VAPID_PRIVATE_KEY=abc...  # Solo servidor
VAPID_SUBJECT=mailto:tu@email.com
```

### Flujo de suscripción
```ts
// 1. Registrar Service Worker (Header.tsx)
const registration = await navigator.serviceWorker.register("/sw.js");

// 2. Solicitar suscripción push
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: NEXT_PUBLIC_VAPID_PUBLIC_KEY,
});

// 3. Guardar en backend
await fetch("/api/notifications/push", {
  method: "POST",
  body: JSON.stringify({ enabled: true, subscription }),
});
```

### Service Worker (`public/sw.js`)
```js
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Notificación", {
      body: data.body ?? "",
      icon: "/favicon.ico",
      data: data.action ?? {},
    })
  );
});
```

### Estado actual
⚠️ El envío activo de notificaciones push (desde el servidor hacia el cliente) no está implementado en los route handlers. Solo se guarda la suscripción. El Service Worker puede recibir push si se envía externamente.

### Riesgos
- Sin implementación de envío activo de push desde el backend.
- `VAPID_PUBLIC_KEY` mal configurada rompe silenciosamente la suscripción.
- Las suscripciones push expiran — sin renovación automática.

---

## 5. Stripe / Firebase (estado actual)

| Integración | Estado |
|---|---|
| Stripe | ⬜ No implementado — mencionado como futuro en ADR |
| Firebase | ⬜ No implementado — `dexie` sugiere intención de cache offline |

Ambas integraciones están en el roadmap de Fase 2 (`docs/future/future_recommendations.md`).

---

## Riesgos globales

| Riesgo | Integración | Severidad |
|---|---|---|
| Lock-in de Supabase como vendor único | Supabase | Media |
| Sin monitoreo de quota Gemini | Gemini | Alta |
| Duplicados por reintentos Shopify | Shopify | Alta |
| Push sin envío activo implementado | Web Push | Baja |
| VAPID keys sin rotación | Web Push | Media |

## Checklist operativo
- [ ] Verificar RLS en Supabase tras cada migración.
- [ ] Monitorear uso de quota Gemini en Google AI Studio mensualmente.
- [ ] Agregar idempotencia por `order_id` en webhook Shopify.
- [ ] Verificar que `VAPID_PUBLIC_KEY` coincide en frontend y backend.
- [ ] Probar Service Worker en Chrome DevTools → Application → Service Workers.

## Próximos pasos
1. Implementar idempotencia en Shopify webhook.
2. Implementar envío activo de push notifications desde servidor.
3. Agregar monitoreo de quota Gemini con alertas automáticas.
4. Evaluar Stripe para monetización en Fase 2.
