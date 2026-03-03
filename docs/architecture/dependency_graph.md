# Dependency Graph

## Resumen ejecutivo
Las 3 dependencias core del sistema son Next.js, Supabase SDK y Gemini. El resto son utilitarios de UI/visualización. Se documenta impacto arquitectónico, versión usada y riesgo de actualización.

## Alcance
`package.json` completo con análisis de impacto por dependencia.

## Top 3 dependencias core

### 1. `next@^15.1.3` + `react@^19.0.0`
- **Rol**: runtime completo — SSR, CSR, Route Handlers, Middleware.
- **Riesgo upgrade**: App Router en v15 tiene cambios breaking en cache behavior y async Server Components. Upgrades requieren smoke tests completos.
- **Archivos críticos**: `src/app/`, `src/middleware.ts`, `next.config.ts`.

### 2. `@supabase/ssr@^0.5.2` + `@supabase/supabase-js@^2.48.1`
- **Rol**: acceso a DB, Auth (cookies SSR), queries con RLS.
- **Riesgo upgrade**: `@supabase/ssr` cambia la API de `getServerSideProps` y cookies frecuentemente en minor versions. Siempre revisar changelog.
- **Archivos críticos**: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`.

### 3. `@google/generative-ai@^0.21.0`
- **Rol**: clasificación NLP en quick-capture y chat conversacional.
- **Riesgo upgrade**: API de modelos cambia con cada versión. `v1beta` hardcodeado en `src/lib/gemini.ts` puede quedar obsoleto.
- **Archivos críticos**: `src/lib/gemini.ts`, APIs de IA.

## Diagrama de dependencias

```mermaid
graph TD
    subgraph CORE[Core Framework]
        NEXT[next@15.1.3]
        REACT[react@19.0.0]
        NEXT --> REACT
    end

    subgraph DATA[Data & Auth]
        SUP_SSR[@supabase/ssr@0.5.2]
        SUP_JS[@supabase/supabase-js@2.48.1]
        SUP_SSR --> SUP_JS
    end

    subgraph AI[Inteligencia Artificial]
        GEMINI[@google/generative-ai@0.21.0]
    end

    subgraph UI[UI Components & Styling]
        LUCIDE[lucide-react@0.469.0]
        RECHARTS[recharts@2.15.0]
        TAILWIND[tailwindcss@3.4.17]
        RADIX[@radix-ui/*]
        CVA[class-variance-authority]
        CLSX[clsx]
        CVA --> CLSX
    end

    subgraph UTILS[Utilities]
        DATEFNS[date-fns@4.1.0]
        FRAMER[framer-motion@11.15.0]
        ZUSTAND[zustand@5.0.3]
        DEXIE[dexie@4.0.9]
        D3[d3@7.9.0]
    end

    NEXT --> DATA
    NEXT --> AI
    NEXT --> UI
    NEXT --> UTILS
```

## Archivos de configuración críticos

| Archivo | Propósito | Riesgo si se modifica incorrectamente |
|---|---|---|
| `package.json` | Scripts + versiones de deps | Build/deploy roto |
| `next.config.ts` | Headers seguridad + image domains + package imports | Fallo de seguridad o build |
| `tailwind.config.ts` | Design tokens + colores + animaciones | Regresión visual completa |
| `tsconfig.json` | Paths, strict mode, targets | Errores de compilación |
| `.eslintrc.json` | Reglas de calidad | Deriva de estilo sin detección |
| `supabase/migrations/*.sql` | Esquema + RLS + triggers | Drift de DB en producción |
| `public/sw.js` | Service Worker para push | Notificaciones rotas |
| `.env.example` | Contrato de variables de entorno | Onboarding incompleto |

## Dependencias por categoría

| Categoría | Paquetes |
|---|---|
| Framework | `next`, `react`, `react-dom` |
| Base de datos / Auth | `@supabase/ssr`, `@supabase/supabase-js` |
| Inteligencia Artificial | `@google/generative-ai` |
| UI Components | `@radix-ui/*` (10 paquetes), `lucide-react`, `cmdk` |
| Visualización | `recharts`, `d3` |
| Estilos | `tailwindcss`, `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge` |
| Datos/tiempo | `date-fns` |
| Estado | `zustand`, `@tanstack/react-query` (+ devtools) |
| Offline/cache | `dexie`, `dexie-react-hooks` |
| Animaciones | `framer-motion` |
| Syntax highlight | `shiki` |

## Configuración y variables de entorno
- `optimizePackageImports: ["lucide-react", "recharts", "date-fns"]` en `next.config.ts` reduce bundle size tree-shaking estas librerías.

## Riesgos y limitaciones
- Next 15 + React 19 son versiones muy recientes. Librerías de terceros pueden no ser compatibles aún.
- `@tanstack/react-query` instalado pero su uso en el proyecto no es central — posible dependencia fantasma.
- `dexie` sugiere intención de capacidad offline que puede no estar completamente implementada.

## Checklist operativo
- [ ] Revisar `npm outdated` mensualmente.
- [ ] Probar build completo tras upgrades de `next` o `@supabase/ssr`.
- [ ] Congelar versiones críticas antes de ventana de estabilización.

## Próximos pasos
1. Implementar Dependabot o Renovate con grupos por criticidad.
2. Definir política: major upgrades solo en sprints planificados.
3. Auditar si `dexie`, `framer-motion` y `d3` justifican su peso en bundle.
