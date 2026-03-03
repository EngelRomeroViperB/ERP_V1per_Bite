# Utils Library — Funciones Reutilizables, Hooks y Middlewares

## Resumen ejecutivo
Catálogo de utilidades, helpers y hooks personalizados presentes y propuestos en el proyecto. Incluye ejemplos concretos del código real y piezas a extraer como librería interna.

## Alcance
`src/lib/`, helpers inline en route handlers y componentes, y hooks identificados en el codebase.

---

## Utilidades existentes en `src/lib/`

### `utils.ts`
```ts
// Combina clases de Tailwind con resolución de conflictos (clsx + tailwind-merge)
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Uso
className={cn("base-class", condition && "conditional-class", props.className)}
```

### `gemini.ts`
```ts
// Obtiene lista de modelos Gemini configurados (o defaults)
export function getGeminiModelCandidates(): string[]

// Detecta si un error es de cuota/rate-limit de Gemini
export function isGeminiQuotaError(message: string): boolean

// Constantes
export const GEMINI_API_VERSION = "v1beta";
const DEFAULT_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
```

### `supabase/client.ts`
```ts
// Crea cliente de Supabase para componentes cliente (browser)
// Singleton pattern implícito via createBrowserClient
import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### `supabase/server.ts`
```ts
// Crea cliente de Supabase para Server Components y Route Handlers
// Lee/escribe cookies del request via next/headers
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(url, key, { cookies: { ... } });
}
```

---

## Helpers inline en route handlers (a extraer)

### `normalizeTaskPriority(value: string): "P1" | "P2" | "P3"`
**Ubicación actual**: `src/app/api/ai/quick-capture/route.ts`
```ts
function normalizeTaskPriority(value: string): "P1" | "P2" | "P3" {
  if (value === "P1" || value === "P2" || value === "P3") return value;
  const mapped: Record<string, "P1" | "P2" | "P3"> = {
    high: "P1", medium: "P2", low: "P3", urgent: "P1",
  };
  return mapped[value.toLowerCase()] ?? "P3";
}
```

### `classifyLocally(text: string): CaptureResult`
**Ubicación actual**: `src/app/api/ai/quick-capture/route.ts`
```ts
// Clasificación heurística local cuando Gemini no está disponible
// Basada en keywords: "hábito", "gasto", "nota", etc.
function classifyLocally(text: string): CaptureResult { ... }
```

### `verifyShopifyHmac(body: string, hmacHeader: string, secret: string): boolean`
**Ubicación actual**: `src/app/api/webhooks/shopify/route.ts`
```ts
function verifyShopifyHmac(body: string, hmacHeader: string, secret: string): boolean {
  const digest = crypto.createHmac("sha256", secret)
    .update(body, "utf8").digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(hmacHeader)
  );
}
```

### Formatter financiero
**Ubicación actual**: `src/app/(app)/finances/FinancesClient.tsx`
```ts
const fmt = (n: number) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    useGrouping,
  }).format(n);
```

---

## Hooks personalizados propuestos (a implementar)

### `usePreferences()`
```ts
// Carga y tipifica preferences del usuario desde el perfil
function usePreferences(): { preferences: ParsedPreferences; update: (patch: Partial<ParsedPreferences>) => Promise<void> }
```

### `useFinanceFormatter()`
```ts
// Retorna función fmt() basada en preferencias del usuario
function useFinanceFormatter(): (n: number) => string
```

### `useGeminiCapture()`
```ts
// Abstrae la lógica de quick-capture: call API, handle loading/error/fallback
function useGeminiCapture(): {
  capture: (text: string) => Promise<CaptureResult>;
  isLoading: boolean;
  error: string | null;
  usedFallback: boolean;
}
```

### `useSupabaseQuery<T>(query: () => Promise<T>)`
```ts
// Wrapper genérico para queries Supabase en componentes cliente
// Maneja loading, error y data refresh
function useSupabaseQuery<T>(queryFn: () => Promise<T>): {
  data: T | null;
  isLoading: boolean;
  error: PostgrestError | null;
  refetch: () => void;
}
```

---

## Estructura de librería interna propuesta

```
src/lib/
├── supabase/
│   ├── client.ts          ✅ Existe
│   └── server.ts          ✅ Existe
├── gemini.ts              ✅ Existe
├── utils.ts               ✅ Existe
├── schemas/               ⬜ Propuesto
│   ├── preferences.ts     → zod schema de profiles.preferences
│   ├── capture.ts         → zod schema de quick-capture payload
│   └── finance.ts         → zod schema de finance transaction
├── services/              ⬜ Propuesto
│   ├── CaptureService.ts
│   ├── FinanceService.ts
│   └── DashboardService.ts
├── formatters/            ⬜ Propuesto
│   ├── currency.ts        → fmt(), parseAmount()
│   └── date.ts            → formatRelative(), trendRange()
└── hooks/                 ⬜ Propuesto
    ├── usePreferences.ts
    ├── useGeminiCapture.ts
    └── useSupabaseQuery.ts
```

---

## Middlewares/Interceptores (`src/middleware.ts`)

### Auth Guard Middleware
```ts
// Protege rutas autenticadas en el edge
// Redirecciona a /login si no hay sesión
// Redirecciona a /dashboard si hay sesión y se accede a /login
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const supabase = createServerClient(/* cookie handlers */);
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthRoute = pathname.startsWith("/login");
  const isCallbackRoute = pathname.startsWith("/callback");

  if (!user && !isAuthRoute && !isCallbackRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // ...
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)"],
};
```

## Riesgos y limitaciones
- Helpers de dominio duplicados entre route handlers sin fuente única de verdad.
- Sin tipar el resultado de `classifyLocally()` de forma estricta.
- Hooks propuestos no existen aún — documento incluye propuestas.

## Checklist operativo
- [ ] Mover `normalizeTaskPriority` a `src/lib/formatters/priority.ts`.
- [ ] Mover `verifyShopifyHmac` a `src/lib/security/hmac.ts`.
- [ ] Implementar `usePreferences()` para centralizar acceso a settings.
- [ ] Crear `src/lib/schemas/preferences.ts` con zod.

## Próximos pasos
1. Crear `src/lib/schemas/` como primer paso de validación tipada.
2. Extraer helpers de route handlers a módulos de servicio.
3. Implementar hooks propuestos en orden de frecuencia de uso.
