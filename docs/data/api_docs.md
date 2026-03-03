# API Documentation

## Resumen ejecutivo
Documentación de los 4 Route Handlers de la API interna. Todos requieren sesión autenticada (excepto webhook Shopify que usa HMAC). Base URL: `https://tu-dominio.vercel.app`.

## Alcance
`src/app/api/ai/chat/route.ts`, `src/app/api/ai/quick-capture/route.ts`, `src/app/api/notifications/push/route.ts`, `src/app/api/webhooks/shopify/route.ts`.

---

## Autenticación general

Todos los endpoints internos validan la sesión de Supabase via cookies:
```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

El cliente debe enviar las cookies de sesión (`sb-access-token`, `sb-refresh-token`) automáticamente si usa el Supabase client del browser. No requiere header `Authorization` manual.

---

## `POST /api/ai/quick-capture`

Clasifica texto libre y lo guarda en la tabla correspondiente de Supabase.

### Request
```
POST /api/ai/quick-capture
Content-Type: application/json
Cookie: sb-access-token=...; sb-refresh-token=...
```

```json
{
  "text": "Tengo que pagar la factura del internet mañana"
}
```

### Validaciones
| Campo | Tipo | Regla |
|---|---|---|
| `text` | `string` | Requerido, no vacío, máximo 500 caracteres |

### Flujo interno
1. Valida autenticación.
2. Carga `profiles.preferences` del usuario (prioridad default, auto-tags).
3. Intenta clasificar con `gemini-2.5-flash`, luego `gemini-2.0-flash`.
4. Si ambos fallan → `classifyLocally(text)`.
5. Guarda en tabla según tipo: `tasks`, `habits`, `daily_metrics`, `finances`, `brain_notes`.
6. Retorna resultado con metadatos.

### Tipos de clasificación (definidos en prompt a Gemini)
| `type` | Tabla destino | Campos extraídos |
|---|---|---|
| `task` | `tasks` | `title`, `priority` (P1-P3) |
| `habit` | `habits` + `habit_logs` | `habit_names[]` |
| `metric` | `daily_metrics` | `weight_kg`, `sleep_hours`, `mood`, `energy`, `kcal` |
| `finance` | `finances` | `amount`, `transaction_type`, `description` |
| `note` | `brain_notes` | `title`, `content` |

### Response exitosa (200)
```json
{
  "type": "task",
  "title": "Pagar factura del internet",
  "priority": "P2",
  "label": "Tarea guardada",
  "saved": true,
  "usedFallback": false,
  "isQuotaError": false
}
```

### Response con fallback local (200)
```json
{
  "type": "note",
  "title": "Nota rápida",
  "label": "Nota guardada (modo local)",
  "saved": true,
  "usedFallback": true,
  "isQuotaError": true
}
```

### Errores
| Status | Mensaje | Causa |
|---|---|---|
| `400` | `"Texto requerido"` | Campo `text` ausente o vacío |
| `400` | `"Texto demasiado largo (máx. 500 caracteres)"` | `text.length > 500` |
| `401` | `"Unauthorized"` | Sin sesión activa |
| `500` | `"Error: <mensaje>"` | Error inesperado en clasificación o guardado |

### cURL
```bash
curl -X POST https://tu-dominio.vercel.app/api/ai/quick-capture \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=TOKEN; sb-refresh-token=REFRESH" \
  -d '{"text": "Gasté $15,000 en el almuerzo"}'
```

---

## `POST /api/ai/chat`

Chat conversacional con IA sobre datos personales del usuario. Persiste insights.

### Request
```
POST /api/ai/chat
Content-Type: application/json
```

```json
{
  "message": "¿Cómo ha sido mi semana en productividad?",
  "history": [
    { "role": "user", "parts": [{ "text": "hola" }] },
    { "role": "model", "parts": [{ "text": "Hola! ¿En qué puedo ayudarte?" }] }
  ]
}
```

### Campos
| Campo | Tipo | Descripción |
|---|---|---|
| `message` | `string` | Mensaje actual del usuario. Requerido. |
| `history` | `array` | Historial de conversación en formato Gemini. Opcional. |

### Flujo interno
1. Carga contexto del usuario: tareas recientes, hábitos del mes, métricas de la semana, finanzas de 30 días.
2. Construye prompt con contexto + historial + mensaje nuevo.
3. Llama a Gemini con multi-turn conversation.
4. Si Gemini falla, retorna respuesta de contingencia local.
5. Si la respuesta contiene insight valioso, lo persiste en `ai_insights`.

### Response exitosa (200)
```json
{
  "reply": "Esta semana completaste 7 de 10 tareas programadas (70%). Tu mayor área de productividad fue...",
  "usedFallback": false,
  "savedInsight": true
}
```

### Response contingencia (200)
```json
{
  "reply": "Tengo problemas para conectarme al servicio de IA. Intenta de nuevo en unos minutos.",
  "usedFallback": true,
  "savedInsight": false
}
```

### Errores
| Status | Mensaje | Causa |
|---|---|---|
| `400` | `"Mensaje requerido"` | `message` ausente o vacío |
| `401` | `"Unauthorized"` | Sin sesión activa |
| `500` | `"Error: <mensaje>"` | Error inesperado |

### cURL
```bash
curl -X POST https://tu-dominio.vercel.app/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=TOKEN; sb-refresh-token=REFRESH" \
  -d '{"message": "Resume mi semana", "history": []}'
```

---

## `POST /api/notifications/push`

Guarda o elimina la suscripción de push notifications del usuario en `profiles.preferences`.

### Request
```
POST /api/notifications/push
Content-Type: application/json
```

```json
{
  "enabled": true,
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BNl...",
      "auth": "tBh..."
    }
  }
}
```

Para desactivar:
```json
{ "enabled": false, "subscription": null }
```

### Flujo interno
1. Valida autenticación.
2. Lee `profiles.preferences` actual.
3. Actualiza:
   - `push_notifications_enabled: enabled`
   - `push_subscription: enabled ? subscription : null`
   - `push_last_updated_at: ISO timestamp`
4. Guarda en `profiles.preferences`.

### Response exitosa (200)
```json
{ "ok": true }
```

### Errores
| Status | Mensaje | Causa |
|---|---|---|
| `401` | `"Unauthorized"` | Sin sesión activa |
| `500` | `"<error message>"` | Error de DB al guardar |

### cURL
```bash
curl -X POST https://tu-dominio.vercel.app/api/notifications/push \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=TOKEN; sb-refresh-token=REFRESH" \
  -d '{"enabled": true, "subscription": {"endpoint": "https://...","keys":{"p256dh":"...","auth":"..."}}}'
```

---

## `POST /api/webhooks/shopify`

Recibe webhooks de Shopify, verifica HMAC-SHA256 y procesa el evento.

### ⚠️ Autenticación especial
No usa sesión de Supabase. Se autentica mediante firma HMAC en header.

```
POST /api/webhooks/shopify
Content-Type: application/json
X-Shopify-Hmac-Sha256: <base64_hmac>
X-Shopify-Topic: orders/paid
X-Shopify-Shop-Domain: tu-tienda.myshopify.com
```

### Verificación HMAC
```ts
const digest = crypto.createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
  .update(rawBody, "utf8").digest("base64");
crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
```

### Eventos soportados
| Topic | Acción |
|---|---|
| `orders/paid` | Crea transacción de ingreso en `finances` |
| Otros | Registrado en `webhook_logs` sin procesamiento |

### Payload `orders/paid` (subset relevante)
```json
{
  "id": 5678901234,
  "order_number": 1001,
  "total_price": "150000.00",
  "currency": "COP",
  "created_at": "2025-01-15T14:30:00-05:00",
  "email": "cliente@email.com"
}
```

### Response exitosa (200)
```json
{
  "received": true,
  "processed": true,
  "topic": "orders/paid",
  "amount": 150000
}
```

### Response HMAC inválido (401)
```json
{ "error": "Invalid HMAC signature" }
```

### Errores
| Status | Mensaje | Causa |
|---|---|---|
| `401` | `"Invalid HMAC signature"` | Firma inválida |
| `400` | `"Missing HMAC header"` | Header ausente |
| `500` | `"Error: <mensaje>"` | Error inesperado |

### Configurar en Shopify
```
Admin → Settings → Notifications → Webhooks
Event: Order payment     
URL: https://tu-dominio.vercel.app/api/webhooks/shopify
Format: JSON
```

---

## Variables de entorno requeridas por las APIs

| Variable | Endpoint |
|---|---|
| `GEMINI_API_KEY` | `/api/ai/chat`, `/api/ai/quick-capture` |
| `GEMINI_MODELS` (opcional) | `/api/ai/chat`, `/api/ai/quick-capture` |
| `SHOPIFY_WEBHOOK_SECRET` | `/api/webhooks/shopify` |
| `NEXT_PUBLIC_SUPABASE_URL` | Todos |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Todos |

## Riesgos y limitaciones
- Sin rate limiting — APIs de IA pueden ser abusadas.
- Sin idempotencia en webhook — reintentos de Shopify pueden duplicar `finances`.
- Sin versioning de API — cambios son breaking.
- Sin OpenAPI/Swagger spec generada automáticamente.

## Checklist operativo
- [ ] Probar endpoints con cURL en cada deploy.
- [ ] Verificar que HMAC validation rechaza firma incorrecta.
- [ ] Monitorear quota de Gemini en Google AI Studio.
- [ ] Confirmar que `usedFallback: true` se loguea cuando ocurre.

## Próximos pasos
1. Implementar rate limiting (ej: Upstash Rate Limit).
2. Generar spec OpenAPI con `next-swagger-doc`.
3. Agregar idempotencia por `order_id` en webhook.
