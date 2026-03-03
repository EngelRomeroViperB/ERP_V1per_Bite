# Code Style Guide

## Resumen ejecutivo
Guía de estilo para mantener consistencia en TypeScript/React/Next.js. Cubre nomenclatura, patrones de validación, manejo de errores, convenciones de commits y naming de branches.

## Alcance
Aplica a todo `src/`, migraciones SQL y configuración. Basado en patrones reales del repositorio.

---

## Nomenclatura

### Archivos y carpetas
```
PascalCase.tsx         → Componentes React (ej: SettingsClient.tsx)
camelCase.ts           → Utilidades y helpers (ej: utils.ts, gemini.ts)
route.ts               → Route Handlers (nombre fijo de Next.js)
page.tsx               → Server Components de página
layout.tsx             → Layouts
kebab-case/            → carpetas de rutas (ej: quick-capture/)
SCREAMING_SNAKE.sql    → No aplica; usar NN_nombre_descripcion.sql
```

### Componentes
```tsx
// ✅ Correcto: named export + PascalCase
export function SettingsClient({ initialProfile }: Props) { ... }

// ❌ Evitar: default export anónimo
export default function() { ... }
```

### Variables y funciones
```ts
// ✅ Correcto
const parsedPreferences = parsePreferenceList(value);
function buildLocalFallbackReply(message: string) { ... }

// ❌ Evitar
const d = parse(v);
function fn(m: string) { ... }
```

### Tipos e interfaces
```ts
// ✅ Interfaces para props y contratos de dominio
interface FinancesClientProps {
  initialTransactions: Transaction[];
  categories: Category[];
  financePreferences: FinancePreferences;
}

// ✅ Type alias para unions y primitivos compuestos
type TaskPriority = "P1" | "P2" | "P3";
type CaptureType = "task" | "habit" | "metric" | "finance" | "note";
```

---

## Patrones de validación en APIs

### Patrón estándar de route handler
```ts
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticar
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Parsear y validar payload
    const body = await req.json();
    const text: unknown = body?.text;
    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Texto inválido" }, { status: 400 });
    }
    if (text.length > 500) {
      return NextResponse.json({ error: "Texto demasiado largo (máx. 500 caracteres)" }, { status: 400 });
    }

    // 3. Lógica de negocio
    // ...

    // 4. Respuesta exitosa
    return NextResponse.json({ ok: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[route-name] error:", errMsg);
    return NextResponse.json({ error: `Error: ${errMsg}` }, { status: 500 });
  }
}
```

### Validación de tipos
```ts
// ✅ Preferir unknown + narrowing explícito
const value: unknown = body?.field;
if (typeof value !== "string") return;

// ❌ Evitar any
const value: any = body?.field;
```

---

## Manejo de errores
```ts
// ✅ Siempre manejar error de Supabase
const { data, error } = await supabase.from("tasks").insert({ ... });
if (error) throw error;

// ✅ Preferir throw sobre return null silencioso
if (!user) throw new Error("Usuario no autenticado");

// ✅ Logs descriptivos con prefijo de contexto
console.error("[quick-capture] AI fallback:", lastModelError);
```

---

## Convenciones de commits

### Formato
```
<tipo>(<scope>): <descripción en imperativo>
```

### Tipos permitidos
| Tipo | Cuándo usarlo |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Cambio de código sin bug ni feature |
| `docs` | Solo documentación |
| `chore` | Tareas de mantenimiento (deps, CI, config) |
| `style` | Formato, espacios, punto y coma (sin lógica) |
| `perf` | Mejora de rendimiento |
| `test` | Agregar o corregir tests |

### Ejemplos reales del repo
```
feat: expand settings-driven behavior across dashboard and finances
feat: add voice-to-text support to quick capture modal
fix: render quick capture modal in body portal
chore: trigger vercel rebuild
docs: add technical documentation pack
refactor: extract Gemini model fallback to shared lib
```

---

## Naming de branches
```
feature/<descripcion-corta>     → nuevas funcionalidades
fix/<descripcion-bug>           → correcciones
chore/<tarea>                   → tareas de mantenimiento
docs/<seccion>                  → documentación
```

---

## Imports
```ts
// Orden: externos → internos (lib) → relativos
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiModelCandidates, isGeminiQuotaError } from "@/lib/gemini";
import { normalizeCaptureResult } from "./helpers";
```

---

## Constantes
```ts
// ✅ Definir constantes al nivel de módulo, nunca inline en JSX/render
const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DASHBOARD_CARD_KEYS = ["mood", "weight", "kcal", "finance"] as const;

// ✅ Usar as const para arrays/objetos de solo lectura y mejor inferencia
```

---

## Configuración y variables de entorno
- Nunca hardcodear valores sensibles.
- Usar `process.env.VARIABLE_NAME` directamente; no desestructurar `process.env`.
- Documentar toda variable nueva en `.env.example`.

## Riesgos y limitaciones
- No hay reglas custom de ESLint para dominio específico.
- Sin Prettier configurado explícitamente — formato puede divergir entre devs.
- Sin Husky/lint-staged configurado — calidad depende de disciplina manual.

## Checklist operativo
- [ ] `npm run lint` antes de cada commit.
- [ ] `npm run build` antes de push a `master`.
- [ ] Verificar que imports siguen el orden establecido.
- [ ] No commitear `.env.local` ni secretos.

## Próximos pasos
1. Configurar Prettier con `.prettierrc`.
2. Instalar Husky + lint-staged para gates pre-commit.
3. Agregar reglas ESLint custom: no-console en producción, no-any, import-order.
