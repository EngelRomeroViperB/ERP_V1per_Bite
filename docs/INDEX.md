# Documentación Técnica — ERP de Vida (Windsurf)

> Proyecto: `EngelRomeroViperB/ERP_V1per_Bite`  
> Stack: Next.js 15 · TypeScript · Supabase · Google Gemini · Vercel  
> Generado: Febrero 2026

---

## Estructura de `/docs`

```
docs/
├── INDEX.md                          ← Este archivo
│
├── architecture/
│   ├── ADR.md
│   ├── data_flow.md
│   ├── component_diagram.md
│   └── dependency_graph.md
│
├── style_guides/
│   ├── code_style_guide.md
│   ├── ui_ux_guide.md
│   └── design_patterns.md
│
├── devops/
│   ├── README_DEV.md
│   ├── security_performance.md
│   └── config_files.md
│
├── analysis/
│   ├── post_mortem.md
│   ├── technical_debt.md
│   └── benchmarking.md
│
├── reusable/
│   ├── utils_library.md
│   ├── test_guide.md
│   └── boilerplate/
│       ├── README.md
│       ├── eslintrc.json
│       ├── prettierrc.json
│       ├── husky-setup.md
│       └── github-actions-ci.yml
│
├── data/
│   ├── data_dictionary.md
│   ├── api_docs.md
│   └── third_party.md
│
├── future/
│   ├── lessons_learned.md
│   ├── future_recommendations.md
│   ├── context_prompt.md
│   └── faq_technical.md
│
└── templates/
    ├── template_adr.md
    └── template_component.md
```

---

## Índice por documento

### `architecture/`

| Archivo | Qué contiene |
|---|---|
| [`ADR.md`](./architecture/ADR.md) | 6 ADRs: Next.js monolito, Supabase, JSONB preferences, Gemini con fallback, webhook Shopify, headers de seguridad |
| [`data_flow.md`](./architecture/data_flow.md) | 4 flujos con diagramas Mermaid: auth, quick-capture, webhook Shopify, push notifications |
| [`component_diagram.md`](./architecture/component_diagram.md) | Jerarquía completa de componentes con diagrama Mermaid |
| [`dependency_graph.md`](./architecture/dependency_graph.md) | Top 3 deps core + tabla completa de dependencias + archivos de config críticos |

### `style_guides/`

| Archivo | Qué contiene |
|---|---|
| [`code_style_guide.md`](./style_guides/code_style_guide.md) | Nomenclatura, patrones de validación en APIs, manejo de errores, convenciones de commits y branches |
| [`ui_ux_guide.md`](./style_guides/ui_ux_guide.md) | Paleta de colores real (HSL + hex), tipografía, animaciones, componentes reutilizables, principios UX |
| [`design_patterns.md`](./style_guides/design_patterns.md) | 5 patrones aplicados con código real + antipatrones identificados |

### `devops/`

| Archivo | Qué contiene |
|---|---|
| [`README_DEV.md`](./devops/README_DEV.md) | Setup paso a paso, vars de entorno, scripts npm, flujo de desarrollo, CI/CD, despliegue en Vercel |
| [`security_performance.md`](./devops/security_performance.md) | Auth, RLS, headers CSP/HSTS, sanitización, índices DB, lazy loading, memoización |
| [`config_files.md`](./devops/config_files.md) | Inventario de 12 archivos de config críticos con propósito y riesgo |

### `analysis/`

| Archivo | Qué contiene |
|---|---|
| [`post_mortem.md`](./analysis/post_mortem.md) | 4 incidentes reales: Vercel config, modal clipping, JSONB corruption, Shopify timeout |
| [`technical_debt.md`](./analysis/technical_debt.md) | 10 items de deuda clasificados por severidad + refactors priorizados |
| [`benchmarking.md`](./analysis/benchmarking.md) | Bundle size estimado, TTFB por ruta, comparación con referencias maduras, KPIs objetivo |

### `reusable/`

| Archivo | Qué contiene |
|---|---|
| [`utils_library.md`](./reusable/utils_library.md) | Helpers existentes (`cn`, `gemini.ts`, Supabase clients) + helpers propuestos + hooks custom |
| [`test_guide.md`](./reusable/test_guide.md) | Setup Vitest, 5 flujos críticos con código de test, edge cases, checklist QA manual |
| [`boilerplate/README.md`](./reusable/boilerplate/README.md) | Estructura base del proyecto sin lógica de negocio |
| [`boilerplate/eslintrc.json`](./reusable/boilerplate/eslintrc.json) | Config ESLint recomendada con reglas de dominio |
| [`boilerplate/prettierrc.json`](./reusable/boilerplate/prettierrc.json) | Config Prettier con `prettier-plugin-tailwindcss` |
| [`boilerplate/husky-setup.md`](./reusable/boilerplate/husky-setup.md) | Instrucciones Husky + lint-staged para gates pre-commit |
| [`boilerplate/github-actions-ci.yml`](./reusable/boilerplate/github-actions-ci.yml) | Pipeline CI de referencia: lint + tsc + build |

### `data/`

| Archivo | Qué contiene |
|---|---|
| [`data_dictionary.md`](./data/data_dictionary.md) | 16 tablas con campos, tipos, constraints e índices. Schema de `profiles.preferences`. Diagrama ER |
| [`api_docs.md`](./data/api_docs.md) | 4 endpoints documentados con payloads, auth, cURL, respuestas y errores |
| [`third_party.md`](./data/third_party.md) | Supabase, Google Gemini, Shopify webhook, Web Push — config, casos de uso, manejo de errores |

### `future/`

| Archivo | Qué contiene |
|---|---|
| [`lessons_learned.md`](./future/lessons_learned.md) | 5 lecciones con patrones concretos y errores que no se repetirían |
| [`future_recommendations.md`](./future/future_recommendations.md) | Roadmap técnico Fase 2-3: CI, Sentry, Zod, tests, queue async, capa de servicios |
| [`context_prompt.md`](./future/context_prompt.md) | Prompt listo para copiar al iniciar sesión con IA + onboarding checklist + reglas no negociables |
| [`faq_technical.md`](./future/faq_technical.md) | 12 problemas reales con causa raíz, solución paso a paso y prevención |

### `templates/`

| Archivo | Qué contiene |
|---|---|
| [`template_adr.md`](./templates/template_adr.md) | Plantilla para nuevas decisiones técnicas con metadatos, contexto, alternativas, impacto y checklist |
| [`template_component.md`](./templates/template_component.md) | Plantilla para documentar componentes UI/UX con props, flujos, estado, tests y evolución |

---

## Guía de uso rápido

| Situación | Documento a leer |
|---|---|
| Soy dev nuevo y quiero configurar el proyecto | `devops/README_DEV.md` |
| Quiero entender la arquitectura general | `architecture/ADR.md` + `architecture/component_diagram.md` |
| Tengo un bug y no sé por qué | `future/faq_technical.md` |
| Voy a hacer un cambio grande | `analysis/technical_debt.md` + `architecture/ADR.md` |
| Retomé el proyecto después de semanas | `future/context_prompt.md` |
| Quiero agregar una nueva integración | `data/third_party.md` + `templates/template_adr.md` |
| Quiero documentar un componente nuevo | `templates/template_component.md` |
| Quiero entender el esquema de DB | `data/data_dictionary.md` |
| Quiero entender los endpoints | `data/api_docs.md` |
| Voy a hacer deploy a Vercel | `devops/README_DEV.md` (sección Vercel) |

---

## Pendientes para completar con el equipo

### Información que requiere acceso al dashboard de Vercel
- [ ] Project ID exacto del proyecto en Vercel para documentar en `README_DEV.md`.
- [ ] URL de producción final del dominio (custom o `.vercel.app`).
- [ ] Historial de deployments fallidos para complementar `post_mortem.md`.

### Información que requiere acceso a Supabase
- [ ] Referencia del proyecto Supabase (`<project-ref>.supabase.co`) — reemplazar `tu-proyecto`.
- [ ] Confirmar si PgBouncer está activado en el plan actual.
- [ ] Revisar si existen tablas adicionales no documentadas en `data_dictionary.md`.
- [ ] Confirmar políticas RLS exactas de `002_rls_policies.sql` para validar `security_performance.md`.

### Información que requiere decisión del equipo
- [ ] Definir SLA mínimo de performance (actualmente en "Supuestos" en `benchmarking.md`).
- [ ] Decidir si adoptar Inngest o alternativa para queue de webhooks (ver `future_recommendations.md`).
- [ ] Definir política de retención de datos de `webhook_logs` y `ai_insights`.
- [ ] Decidir si implementar modo claro (light mode) o mantener solo oscuro.
- [ ] Definir estrategia de staging environment (branch `develop` → Vercel Preview o ambiente dedicado).

### Tests pendientes de implementar
- [ ] Instalar Vitest + configurar setup básico.
- [ ] Implementar tests de `classifyLocally()` (Flujo 1 en `test_guide.md`).
- [ ] Implementar tests de `verifyShopifyHmac()` (Flujo 2 en `test_guide.md`).
- [ ] Implementar tests del middleware de auth (Flujo 5 en `test_guide.md`).

### Documentación pendiente de refinar
- [ ] Agregar métricas reales de Lighthouse una vez medidas (actualizar `benchmarking.md`).
- [ ] Completar schema de `shopify_meta` y `template_config` en `data_dictionary.md`.
- [ ] Documentar estructura completa de `public/sw.js` en `third_party.md`.
- [ ] Agregar documentación de componentes específicos usando `templates/template_component.md`.

---

*Documentación generada en Febrero 2026 a partir del análisis directo del código fuente del repositorio.*
