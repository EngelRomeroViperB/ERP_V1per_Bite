# UI/UX Guide

## Resumen ejecutivo
Sistema de diseño basado en tema oscuro con paleta de colores CSS variables, utilitarios Tailwind y componentes glass. Cubre paleta real, tipografía, animaciones, componentes reutilizables y principios de UX.

## Alcance
`src/app/globals.css`, `tailwind.config.ts`, componentes de layout y páginas.

---

## Paleta de colores (valores reales de `globals.css`)

### Tema oscuro (único tema activo)
| Token | Valor HSL | Hex aproximado | Uso |
|---|---|---|---|
| `--background` | `224 71% 4%` | `#050c1a` | Fondo principal de la app |
| `--foreground` | `213 31% 91%` | `#dde4ef` | Texto principal |
| `--card` | `224 71% 6%` | `#080f1f` | Fondo de tarjetas |
| `--card-foreground` | `213 31% 91%` | `#dde4ef` | Texto en tarjetas |
| `--primary` | `210 100% 60%` | `#3399ff` | Acciones principales, CTA |
| `--primary-foreground` | `222 47% 5%` | `#060b18` | Texto sobre primary |
| `--secondary` | `222 47% 12%` | `#111d3a` | Fondos secundarios, inputs |
| `--muted` | `223 47% 9%` | `#0d162c` | Fondos sutiles |
| `--muted-foreground` | `215 16% 56%` | `#7d8fa8` | Texto secundario/hints |
| `--accent` | `216 34% 14%` | `#162030` | Hover states, accents |
| `--border` | `216 34% 14%` | `#162030` | Bordes de elementos |
| `--destructive` | `0 63% 55%` | `#e03c3c` | Errores, acciones peligrosas |
| `--ring` | `210 100% 60%` | `#3399ff` | Focus ring |

### Colores semánticos usados en la app
| Color | Clase Tailwind | Uso principal |
|---|---|---|
| Verde | `text-green-400`, `bg-green-500/10` | Ingresos, éxito, completado |
| Rojo | `text-red-400`, `bg-red-500/10` | Gastos, errores, P1 priority |
| Amarillo | `text-yellow-400`, `bg-yellow-500/10` | P2 priority, advertencias |
| Azul | `text-blue-400`, `bg-blue-500/10` | P3 priority, info |
| Naranja | `text-orange-400`, `bg-orange-500` | Hábitos, streaks |
| Violeta | `text-purple-400`, `bg-purple-400` | IA, insights |
| Cyan | `text-cyan-300`, `bg-cyan-500/10` | Shopify, snippets |
| Emerald | `text-emerald-400`, `bg-emerald-500` | Balance positivo, finanzas |

### Chart colors
| Token | Uso |
|---|---|
| `--chart-1` `210 100% 60%` | Serie primaria |
| `--chart-2` `142 71% 45%` | Serie secundaria (verde) |
| `--chart-3` `38 92% 60%` | Serie terciaria (amarillo) |
| `--chart-4` `280 65% 60%` | Serie cuarta (violeta) |
| `--chart-5` `340 75% 60%` | Serie quinta (rosa) |

---

## Tipografía
- **Fuente**: sistema (no se detectó Google Fonts custom).
- `font-feature-settings: "rlig" 1, "calt" 1` activado en `body` para ligaduras tipográficas.
- Escala de tamaño: `text-xs` (hints), `text-sm` (body), `text-base` (default), `text-xl/2xl` (títulos de página).
- `text-2xl font-bold` para títulos principales de sección.

---

## Animaciones (definidas en `tailwind.config.ts`)

| Nombre | Duración | Easing | Uso |
|---|---|---|---|
| `animate-fade-in` | `0.3s` | `ease-out` | Entrada de páginas y secciones |
| `animate-accordion-down` | `0.2s` | `ease-out` | Expansión de acordeones |
| `animate-accordion-up` | `0.2s` | `ease-out` | Colapso de acordeones |

```css
/* Definición real en globals.css + tailwind.config.ts */
"fade-in": {
  from: { opacity: "0", transform: "translateY(4px)" },
  to:   { opacity: "1", transform: "translateY(0)" },
}
```

Uso estándar:
```tsx
<div className="space-y-6 animate-fade-in">
```

---

## Border radius
| Token | Valor calculado | Uso |
|---|---|---|
| `rounded-lg` | `0.75rem (12px)` | Tarjetas, modales |
| `rounded-xl` | `0.875rem` | Inputs, botones |
| `rounded-2xl` | `1rem` | Tarjetas grandes (glass) |
| `rounded-full` | `9999px` | Avatares, badges, progress |

---

## Componente glass (utilitario custom)
```css
/* src/app/globals.css */
.glass {
  @apply bg-card/60 backdrop-blur-md border border-border/50;
}
```

Uso estándar para tarjetas:
```tsx
<div className="glass rounded-2xl p-5">
  {/* contenido */}
</div>
```

**Importante**: `backdrop-blur-md` requiere que el elemento padre no tenga `overflow: hidden` — puede causar glitches en Safari.

---

## Scrollbar personalizado
```css
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 9999px; }
::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)/0.4); }
```

---

## Componentes reutilizables identificados

### Tarjeta KPI
```tsx
<div className="glass rounded-xl p-4">
  <div className="flex items-center gap-1.5 mb-1">
    <Icon className="w-3.5 h-3.5 text-primary" />
    <span className="text-xs text-muted-foreground">Label</span>
  </div>
  <p className="text-2xl font-bold">{value}</p>
</div>
```

### Progress bar semántico
```tsx
<div className="h-2 rounded-full bg-secondary overflow-hidden">
  <div
    className={cn("h-full rounded-full transition-all",
      isOver ? "bg-red-500" : "bg-emerald-500")}
    style={{ width: `${percent}%` }}
  />
</div>
```

### Badge de prioridad
```tsx
const priorityStyles = {
  P1: "bg-red-500/10 text-red-400",
  P2: "bg-yellow-500/10 text-yellow-400",
  P3: "bg-blue-500/10 text-blue-400",
};
<span className={`text-xs px-2 py-0.5 rounded-md font-mono ${priorityStyles[task.priority]}`}>
  {task.priority}
</span>
```

---

## Principios UX

1. **Feedback inmediato**: toda acción destructiva o de captura debe retornar un toast/mensaje en < 300ms visualmente.
2. **Estados vacíos informativos**: nunca pantalla en blanco — siempre un mensaje contextual con próximo paso.
3. **Degradación elegante de IA**: si Gemini no responde, el usuario sigue pudiendo capturar datos (fallback local).
4. **Semántica de color consistente**: verde=positivo, rojo=peligro/P1, amarillo=atención/P2.
5. **Mobile-first responsive**: modales en portal React para evitar clipping por sticky header.

## Riesgos y limitaciones
- `backdrop-blur` puede ser lento en dispositivos de gama baja.
- No hay modo claro (light mode) implementado — solo dark.
- Sin tokens formalizados en design tool (Figma/Tokens Studio).

## Checklist operativo
- [ ] Probar glass cards en Safari/iOS.
- [ ] Verificar contraste de texto en todos los colores semánticos.
- [ ] Confirmar `animate-fade-in` no causa layout shift.
- [ ] Revisar modal portal en móvil (320px).

## Próximos pasos
1. Crear modo claro con variables CSS alternativas.
2. Documentar componentes en Storybook o similar.
3. Sincronizar paleta con Figma para colaboración de diseño.
