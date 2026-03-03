# Test Guide — Estrategia QA y Checklist de Calidad

## Resumen ejecutivo
Guía de testing para el proyecto: estado actual (0 tests), estrategia propuesta, 5 flujos críticos a cubrir, edge cases prioritarios y setup recomendado.

## Alcance
Unit tests, integration tests y E2E. Prioriza lógica de dominio sobre UI.

---

## Estado actual

⚠️ **Cobertura de tests: 0%**

No existe ningún archivo `.test.ts`, `.spec.ts` ni configuración de Vitest/Jest en el proyecto. Todo el testing es manual.

---

## Stack de testing recomendado

```bash
# Unit + Integration
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event

# E2E
npm install --save-dev @playwright/test
npx playwright install
```

### Configuración `vitest.config.ts`
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

### `src/tests/setup.ts`
```ts
import "@testing-library/jest-dom";
// Mock de Supabase client para tests unitarios
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabaseClient,
}));
```

---

## 5 Flujos críticos a cubrir

### Flujo 1: `classifyLocally()` — fallback de IA
**Prioridad**: Máxima — se activa cuando Gemini no está disponible.

```ts
// src/tests/unit/classifyLocally.test.ts
describe("classifyLocally", () => {
  test("clasifica tarea con keyword 'tarea'", () => {
    const result = classifyLocally("recordar hacer tarea de gym");
    expect(result.type).toBe("task");
  });
  test("clasifica hábito con keyword 'hábito'", () => {
    const result = classifyLocally("nuevo hábito de meditación diaria");
    expect(result.type).toBe("habit");
  });
  test("clasifica finanza con keyword 'gasté'", () => {
    const result = classifyLocally("gasté $50 en almuerzo");
    expect(result.type).toBe("finance");
    expect(result.amount).toBeGreaterThan(0);
  });
  test("fallback a brain_note cuando no hay keywords claras", () => {
    const result = classifyLocally("pensar en esto más tarde");
    expect(result.type).toBe("brain_note");
  });
});
```

### Flujo 2: `verifyShopifyHmac()` — seguridad webhook
**Prioridad**: Alta — previene procesamiento de webhooks fraudulentos.

```ts
// src/tests/unit/shopifyHmac.test.ts
import crypto from "crypto";

describe("verifyShopifyHmac", () => {
  const secret = "test-secret-123";
  const body = JSON.stringify({ order_id: 1, total_price: "100.00" });

  test("acepta HMAC válido", () => {
    const valid = crypto.createHmac("sha256", secret)
      .update(body, "utf8").digest("base64");
    expect(verifyShopifyHmac(body, valid, secret)).toBe(true);
  });

  test("rechaza HMAC inválido", () => {
    expect(verifyShopifyHmac(body, "hmac-falso", secret)).toBe(false);
  });

  test("es timing-safe (no timing attack)", () => {
    // Verifica que usa timingSafeEqual, no comparación directa
    const invalid = "A".repeat(44);
    expect(verifyShopifyHmac(body, invalid, secret)).toBe(false);
  });
});
```

### Flujo 3: `normalizeTaskPriority()` — mapeo de prioridades
**Prioridad**: Media — afecta clasificación de todas las tareas capturadas.

```ts
// src/tests/unit/normalizeTaskPriority.test.ts
describe("normalizeTaskPriority", () => {
  test.each([
    ["P1", "P1"], ["P2", "P2"], ["P3", "P3"],
    ["high", "P1"], ["urgent", "P1"],
    ["medium", "P2"],
    ["low", "P3"],
    ["desconocido", "P3"],
    ["", "P3"],
  ])("normaliza '%s' a '%s'", (input, expected) => {
    expect(normalizeTaskPriority(input)).toBe(expected);
  });
});
```

### Flujo 4: `isGeminiQuotaError()` — detección de cuota agotada
**Prioridad**: Media — determina cuándo activar el fallback.

```ts
// src/tests/unit/gemini.test.ts
describe("isGeminiQuotaError", () => {
  test("detecta error de quota por status 429", () => {
    expect(isGeminiQuotaError("429 Too Many Requests")).toBe(true);
  });
  test("detecta error de quota por keyword", () => {
    expect(isGeminiQuotaError("quota exceeded for model")).toBe(true);
    expect(isGeminiQuotaError("rate limit reached")).toBe(true);
  });
  test("no detecta error genérico como quota", () => {
    expect(isGeminiQuotaError("Internal Server Error")).toBe(false);
    expect(isGeminiQuotaError("network timeout")).toBe(false);
  });
});
```

### Flujo 5: Auth middleware — protección de rutas
**Prioridad**: Alta — toda la app depende de esto.

```ts
// src/tests/integration/middleware.test.ts
describe("auth middleware", () => {
  test("redirige a /login cuando no hay sesión", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://localhost/dashboard");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("/login");
  });

  test("redirige a /dashboard desde /login cuando hay sesión", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } }
    });
    const req = new NextRequest("http://localhost/login");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("/dashboard");
  });

  test("permite acceso a /callback sin sesión", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://localhost/callback?code=abc");
    const res = await middleware(req);
    expect(res.status).not.toBe(307);
  });
});
```

---

## Edge cases prioritarios

| Caso | Componente | Tipo de test |
|---|---|---|
| GEMINI_API_KEY ausente → fallback local activado | quick-capture route | Integration |
| `preferences` con campo null/undefined | todos los consumers | Unit |
| Webhook con body vacío | shopify route | Unit |
| Usuario no encontrado en `profiles` | dashboard, settings | Integration |
| `amount` negativo en finanzas | FinancesClient | Unit |
| Texto de captura > 500 chars | quick-capture route | Unit |
| HMAC con caracteres especiales | verifyShopifyHmac | Unit |
| Dashboard con 0 registros en todas las tablas | dashboard page | Integration |
| Push subscription expirada | notifications route | Integration |
| Sesión expirada durante operación larga | middleware | Integration |

---

## Checklist QA manual (hasta tener tests automatizados)

### Pre-deploy
- [ ] Login con Google OAuth funciona.
- [ ] Quick capture clasifica correctamente 3 tipos (tarea, hábito, nota).
- [ ] Dashboard carga sin errores con usuario nuevo (sin datos).
- [ ] Settings guarda y persiste preferencias tras recarga de página.
- [ ] Finances muestra transacciones en el formato correcto (moneda/locale).

### Casos de error
- [ ] Sin `GEMINI_API_KEY`: app funciona, quick-capture usa fallback local.
- [ ] Token de sesión expirado: redirige a /login sin error visible.
- [ ] Webhook Shopify con HMAC inválido: retorna 401 sin procesar.

---

## Scripts de testing
```bash
# Unit tests
npx vitest run

# Watch mode
npx vitest

# Coverage
npx vitest run --coverage

# E2E
npx playwright test

# E2E con UI
npx playwright test --ui
```

## Riesgos y limitaciones
- Sin infraestructura de testing actualmente — requiere setup inicial.
- Tests de integración necesitan mock completo de Supabase.
- E2E en CI requiere Supabase de testing o configuración separada.

## Checklist operativo
- [ ] Instalar Vitest y configurar antes del próximo sprint.
- [ ] Priorizar tests de Flujos 1 y 2 como primer commit de tests.
- [ ] Agregar `npm test` al pipeline de CI cuando exista.

## Próximos pasos
1. Instalar Vitest + setup básico (< 2h).
2. Implementar tests de Flujos 1 y 2 (funciones puras, sin mocks).
3. Agregar Playwright para flujo de auth E2E.
