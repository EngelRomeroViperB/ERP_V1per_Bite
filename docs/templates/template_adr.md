# ADR-XXX: [Título de la decisión]

> **Instrucciones de uso**: Copia este archivo, renómbralo como `ADR-NNN_titulo-corto.md`, completa cada sección y agrégalo al índice en `docs/architecture/ADR.md`.

---

## Metadatos

| Campo | Valor |
|---|---|
| **ID** | ADR-XXX |
| **Título** | [Descripción corta e imperativa, ej: "Usar Zod para validación de schemas"] |
| **Estado** | `Propuesta` / `Aceptada` / `Rechazada` / `Deprecada` / `Supersedida por ADR-YYY` |
| **Fecha** | YYYY-MM-DD |
| **Owner** | [Nombre del responsable de la decisión] |
| **Archivos afectados** | `src/lib/...`, `src/app/api/...` |

---

## Contexto

> Describe el problema o situación que requiere una decisión. ¿Qué fuerza o restricción técnica lo motiva? ¿Por qué se necesita tomar esta decisión ahora?

[Ejemplo: "El campo `profiles.preferences` es JSONB sin validación. Cada vez que se agrega un nuevo campo de configuración, se requiere narrowing manual defensivo en todos los consumidores, lo que genera código repetitivo y silencia errores de tipo."]

### Restricciones conocidas
- [Restricción 1: ej. debe ser compatible con Next.js App Router]
- [Restricción 2: ej. sin aumentar el bundle size del cliente]
- [Restricción 3: ej. debe funcionar en Vercel Edge Runtime si aplica]

---

## Decisión

> Una oración clara en voz activa describiendo QUÉ se decide hacer.

**Decisión**: [Ej: "Adoptar `zod` como librería de validación de schemas para `profiles.preferences` y para los payloads de todos los Route Handlers."]

---

## Justificación técnica

> ¿Por qué esta opción es mejor que las alternativas? Ser específico con ventajas concretas.

1. [Ventaja 1 con ejemplo concreto]
2. [Ventaja 2 con ejemplo concreto]
3. [Ventaja 3 con ejemplo concreto]

### Ejemplo de implementación

```ts
// src/lib/schemas/preferences.ts
import { z } from "zod";

export const PreferencesSchema = z.object({
  finance_currency: z.string().default("COP"),
  quick_capture_default_priority: z.enum(["P1", "P2", "P3"]).default("P3"),
}).partial();

// Uso en consumidor
const parsed = PreferencesSchema.safeParse(profile.preferences);
if (parsed.success) {
  const { finance_currency } = parsed.data;
}
```

---

## Alternativas consideradas

### Alternativa A: [Nombre]
- **Descripción**: [qué era y cómo funcionaría]
- **Por qué se descartó**: [razón específica]

### Alternativa B: [Nombre]
- **Descripción**: [qué era y cómo funcionaría]
- **Por qué se descartó**: [razón específica]

---

## Consecuencias e impacto

### Positivo
- [Consecuencia positiva 1]
- [Consecuencia positiva 2]

### Negativo / Deuda introducida
- [Consecuencia negativa 1, ej: "Aumenta el bundle size en ~12KB (gzip)"]
- [Consecuencia negativa 2]

### Riesgos
- `[ACTIVO]` [Riesgo que queda abierto después de la decisión]
- `[MITIGADO]` [Riesgo que esta decisión resuelve]

---

## Plan de implementación

| Paso | Descripción | Archivo | Prioridad |
|---|---|---|---|
| 1 | [Primer paso concreto] | `src/...` | Alta |
| 2 | [Segundo paso] | `src/...` | Media |
| 3 | [Validación / prueba] | `src/tests/...` | Media |

---

## Checklist de validación

- [ ] Build pasa: `npm run build`
- [ ] Lint pasa: `npm run lint`
- [ ] [Check específico de esta decisión]
- [ ] [Check específico de esta decisión]
- [ ] Documentado en `docs/architecture/ADR.md`

---

## Próximos pasos

1. [Próximo paso a ejecutar]
2. [Decisión relacionada que puede requerir su propio ADR]

---

## Referencias

- [Enlace a issue, PR o discusión relacionada]
- [Documentación externa relevante]
- ADR relacionados: [ADR-001], [ADR-002]
