# Post-Mortem

## Resumen ejecutivo
Análisis de los incidentes técnicos más significativos del desarrollo del proyecto: causas raíz, impacto, resolución y lecciones que cambiaron decisiones arquitectónicas.

## Alcance
Incidentes de producción y desarrollo que generaron retrabajo significativo o cambios de dirección técnica.

---

## Incidente 1: Vercel — "No Next.js version detected" (P1)

### Descripción
Después de múltiples redeployments, Vercel comenzó a fallar con el error `No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies"`. La app devolvía 404 en el dominio de producción.

### Causa raíz
La configuración de **Root Directory** en el proyecto de Vercel apuntaba a una subcarpeta incorrecta. Vercel no encontraba el `package.json` donde esperaba y por lo tanto no detectaba Next.js como framework.

### Línea de tiempo
```
Commit push → Vercel build iniciado → No framework detected → Build fallido → 404 en producción
```

### Resolución
1. Dashboard Vercel → Settings → General → **Root Directory** → dejar **vacío** (no `.`, no `./`).
2. Redeploy manual.
3. Verificar que Framework Preset se autodetecta como `Next.js`.

### Impacto
- Downtime de producción durante investigación (~1-2 horas).
- Pérdida de confianza en el proceso de deploy.

### Lecciones aprendidas
- La diferencia entre Root Directory vacío y `.` en Vercel tiene consecuencias críticas.
- Nunca asumir que Vercel auto-detecta el framework si Root Directory no está vacío.
- Documentar configuración exacta del proyecto Vercel en README.

### Cambios implementados
- Documentado en `docs/devops/README_DEV.md`.
- Regla: Root Directory = vacío, siempre.

---

## Incidente 2: Modal Quick Capture — Clipping por backdrop-filter (P2)

### Descripción
El modal de Quick Capture aparecía cortado detrás del header en mobile. El `position: fixed` del modal estaba siendo contenido por un ancestro con `transform` o `backdrop-filter`.

### Causa raíz
El header usa `backdrop-blur-md` (que internamente aplica `backdrop-filter`) creando un nuevo **stacking context** y **containing block** para elementos `position: fixed`. Esto hace que el `fixed` del modal quede relativo al header, no al viewport.

### Resolución
Migrar el renderizado del modal a `document.body` usando **React Portal**:
```tsx
import { createPortal } from "react-dom";

{showCapture && typeof document !== "undefined" && createPortal(
  <div className="fixed inset-0 z-50 ...">
    {/* modal */}
  </div>,
  document.body
)}
```

### Impacto
- Experiencia de usuario degradada en mobile (feature principal no funcionaba).
- Requirió refactor del componente Header.

### Lecciones aprendidas
- `backdrop-filter` y `transform` rompen `position: fixed` en descendientes.
- Los modales deben renderizarse siempre fuera del árbol DOM del header.
- Probar UX en mobile desde el día 1 de cada feature.

---

## Incidente 3: JSONB `preferences` — Datos corruptos silenciosos (P2)

### Descripción
Cambios en la estructura de `profiles.preferences` causaban que configuraciones antiguas de usuarios generaran comportamientos inesperados: moneda incorrecta en finanzas, cards del dashboard en orden erróneo, prioridad de captura ignorada.

### Causa raíz
El campo `preferences` es JSONB sin esquema fijo. Código nuevo que leía campos renombrados o reestructurados no encontraba los valores esperados, caía al default silenciosamente pero sin notificar al usuario ni al developer.

### Ejemplo concreto
```ts
// Campo renombrado de "default_priority" a "quick_capture_default_priority"
// Código nuevo:
const priority = preferences.quick_capture_default_priority ?? "P3";
// → usuarios con campo viejo ("default_priority") reciben siempre "P3"
// → sin error, sin log, invisible
```

### Resolución
- Narrowing defensivo en todos los accesos a `preferences`.
- Migración de campo vía update SQL para usuarios afectados.
- Documentar contrato de campos en `docs/data/data_dictionary.md`.

### Lecciones aprendidas
- JSONB sin esquema es rápido al inicio pero crea deuda de migración de datos.
- Toda lectura de `preferences` debe incluir fallback explícito y log de warning si el campo no existe.
- Evaluar `zod.parse()` para validar estructura completa al cargar perfil.

---

## Incidente 4: Webhook Shopify — Timeout por operación síncrona lenta (P2)

### Descripción
Shopify esperaba respuesta 200 en < 5s. Si el insert en Supabase tardaba (cold start de serverless + DB), el webhook timeout y Shopify lo marcaba como fallido, generando reintentos que duplicaban transacciones.

### Causa raíz
La arquitectura síncrona del route handler (`await supabase.from(...).insert(...)`) no garantiza completar en el tiempo límite de Shopify. En Vercel serverless, el cold start puede añadir 500-1000ms.

### Resolución parcial
- Responder `200 { received: true }` lo antes posible.
- Mover el insert después de la respuesta usando `waitUntil` (limitado en Vercel Edge).

### Estado actual
⚠️ **Sin resolución completa** — aún no hay idempotencia ni queue async implementados.

### Lecciones aprendidas
- Webhooks de terceros requieren procesamiento async (queue).
- La arquitectura serverless no es ideal para procesamiento intensivo de webhooks.
- El ID único del evento (`order_id`) debe ser la clave de idempotencia.

---

## Decisiones que hoy limitan el proyecto

| Decisión | Limitación actual |
|---|---|
| JSONB para `preferences` | Migración de datos complicada al cambiar estructura |
| Sin capa de servicios | Lógica de dominio en route handlers, difícil de testear |
| Sin CI formal | Builds rotos pueden llegar a `master` |
| Sin idempotencia en webhooks | Duplicados posibles en datos financieros |
| Monolito Next.js | Deploy de FE y BE acoplado |
| Sin monitoreo de errores | Incidentes en producción invisibles |

## Riesgos y limitaciones
- El historial de incidentes no está formalizado — este documento reconstruye desde memoria.
- Pueden existir incidentes menores no documentados.

## Checklist operativo
- [ ] Documentar todo nuevo incidente aquí con causa raíz y resolución.
- [ ] Revisar "Decisiones que limitan el proyecto" mensualmente.
- [ ] Antes de cada release, revisar incidentes anteriores relacionados.

## Próximos pasos
1. Implementar Sentry para captura automática de incidentes.
2. Crear ADR para la decisión de procesamiento async de webhooks.
3. Implementar idempotencia en webhook Shopify como prioridad.
