# Lessons Learned

## Resumen ejecutivo
Los 5 patrones más valiosos aprendidos en el desarrollo del proyecto y las lecciones que cambiaron decisiones técnicas. Tono autocrítico y directo.

## Alcance
Desarrollo completo del sistema: arquitectura, DevOps, IA, frontend y base de datos.

---

## Lección 1: El fallback siempre debe ser diseñado primero, no después

**Patrón**: Diseñar para la ausencia antes de diseñar para la presencia.

**Contexto**: El quick-capture con IA fue diseñado inicialmente asumiendo que Gemini siempre estaría disponible. Cuando se encontró con límites de cuota, la UX se rompía completamente.

**Lo que se hizo bien**: Se implementó `classifyLocally()` y la cadena de modelos (`gemini-2.5-flash` → `gemini-2.0-flash` → local).

**Lo que debería haberse hecho desde el inicio**:
```ts
// Diseño defensivo desde el inicio
async function classifyWithFallback(text: string): Promise<CaptureResult> {
  try {
    return await classifyWithGemini(text);
  } catch {
    return classifyLocally(text); // fallback siempre listo
  }
}
```

**Principio generalizable**: Para cualquier dependencia externa (IA, pagos, emails), diseñar el comportamiento sin esa dependencia antes de integrarla.

---

## Lección 2: JSONB flexible es una deuda de migración diferida

**Patrón**: La flexibilidad temprana genera rigidez tardía.

**Contexto**: `profiles.preferences` como JSONB permitió agregar nuevas configuraciones sin migraciones. Perfecto para las primeras semanas. Con el tiempo, múltiples campos con nombres evolucionados, tipos inconsistentes y defaults asumidos.

**Costo real**:
- Cada nuevo campo requiere narrowing defensivo en TypeScript.
- Campos renombrados rompen silenciosamente para usuarios con datos viejos.
- Sin documentación del contrato, el schema se convierte en arqueología.

**Lección**: JSONB es correcto para datos verdaderamente variables (metadatos, snapshots). Para configuración estructurada con semántica definida, es mejor una tabla normalizada o al menos un zod schema como contrato versionado.

---

## Lección 3: La configuración de Vercel es tan crítica como el código

**Patrón**: El entorno de deploy es parte del producto, no un detalle.

**Contexto**: El proyecto tuvo downtime real por Root Directory mal configurado en Vercel. El error `"No Next.js version detected"` costó tiempo de investigación que podría haberse evitado con documentación desde el inicio.

**Lección**: Documentar la configuración exacta del proveedor de deploy (no solo el código) en el README desde el primer deploy. Incluir screenshots si es necesario.

**Regla establecida**:
- Root Directory en Vercel: **vacío** (ni `.` ni `./`).
- Documentado en `docs/devops/README_DEV.md`.
- Agregar a checklist de onboarding.

---

## Lección 4: Los portales de React son la solución correcta para modales sobre sticky headers

**Patrón**: Cuando el DOM structure interfiere con el comportamiento visual, reestructura el DOM.

**Contexto**: El modal de Quick Capture aparecía cortado en mobile porque el header usa `backdrop-filter: blur()`, lo que crea un nuevo stacking context y contiene a los elementos `position: fixed` descendientes.

**Solución definitiva**:
```tsx
import { createPortal } from "react-dom";

// Renderizar FUERA del árbol del header
{showModal && createPortal(<Modal />, document.body)}
```

**Lección**: `position: fixed` no es relativo al viewport cuando un ancestro tiene `transform`, `filter`, `backdrop-filter`, `perspective` o `will-change`. Siempre usar portales para overlays que necesiten estar sobre cualquier elemento.

---

## Lección 5: Sin CI, la calidad del código es una promesa, no una garantía

**Patrón**: Las herramientas de calidad sin enforcement son documentación.

**Contexto**: El proyecto tiene ESLint, TypeScript strict y convenciones de commits. Pero sin GitHub Actions, Husky ni lint-staged, ninguno de estos controles se ejecuta automáticamente. Un developer puede pushear código con errores de lint, y Vercel desplegará igual.

**Impacto real observado**: Builds fallidos llegaron a `master` en al menos una ocasión durante el desarrollo activo.

**Lección**: El tiempo invertido en configurar CI (< 4 horas para un pipeline básico) se amortiza en la primera semana. Sin CI, cada merge a `master` es una apuesta.

**Implementación mínima que habría evitado problemas**:
```yaml
# .github/workflows/ci.yml
- run: npm run lint
- run: npm run build
```

---

## Patrones de valor para reutilizar en futuros proyectos

| # | Patrón | Dónde aplicar |
|---|---|---|
| 1 | Cadena de fallback para servicios externos | IA, pagos, emails, SMS |
| 2 | Zod schema para cualquier JSONB de configuración | Cualquier preferencias de usuario |
| 3 | React Portal para todos los overlays | Modales, tooltips, dropdowns |
| 4 | Root Directory vacío en Vercel documentado desde el inicio | Cualquier proyecto Next.js en Vercel |
| 5 | CI mínimo antes de primer deploy a producción | Todos los proyectos |

---

## Errores que no volvería a cometer

1. **Asumir disponibilidad de servicios externos** sin diseñar fallback.
2. **Usar JSONB** para datos con semántica fuerte sin schema de validación.
3. **No documentar** la configuración del proveedor de deploy desde el inicio.
4. **Postegar CI** — siempre en la primera semana del proyecto.
5. **No agregar idempotencia** desde el inicio en webhooks de terceros.

## Riesgos y limitaciones
- Las lecciones están sesgadas hacia problemas de un solo desarrollador — pueden no aplicar igual en equipo.
- Sin métricas formales de cuánto tiempo costó cada incidente.

## Checklist operativo
- [ ] Revisar esta lista al iniciar un proyecto nuevo.
- [ ] Compartir con nuevos devs durante onboarding.
- [ ] Actualizar con cada nuevo incidente documentado en `post_mortem.md`.

## Próximos pasos
1. Convertir estas lecciones en ítems del checklist de onboarding.
2. Crear ADR específicos para cada decisión que generó lección.
3. Agregar a `docs/future/context_prompt.md` las reglas derivadas de estas lecciones.
