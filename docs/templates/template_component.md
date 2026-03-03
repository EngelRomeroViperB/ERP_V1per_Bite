# Documentación de Componente: [NombreComponente]

> **Instrucciones de uso**: Copia este archivo, renómbralo `[NombreComponente].md` y colócalo en `docs/reusable/components/`. Completa cada sección basándote en el código real del componente.

---

## Metadatos

| Campo | Valor |
|---|---|
| **Nombre** | `[NombreComponente]` |
| **Archivo** | `src/components/[ruta]/[NombreComponente].tsx` |
| **Tipo** | `Server Component` / `Client Component` / `Shared` |
| **Categoría** | `Layout` / `UI` / `Feature` / `Data` |
| **Versión** | 1.0.0 |
| **Owner** | [Nombre del responsable] |
| **Última actualización** | YYYY-MM-DD |

---

## Resumen ejecutivo

> Una o dos oraciones que describan QUÉ hace el componente y CUÁNDO se usa. Sin jerga de implementación.

[Ejemplo: "`FinancesClient` gestiona la visualización y CRUD de transacciones financieras del usuario. Se monta como Client Component para manejar filtros interactivos, el formulario de nueva transacción y el formatter de moneda basado en preferencias del usuario."]

---

## Props

```tsx
interface [NombreComponente]Props {
  // Reemplazar con props reales
  propRequerida: string;           // Descripción de la prop
  propOpcional?: number;           // Descripción. Default: 0
  onCallback?: (value: string) => void;  // Descripción del callback
}
```

### Tabla de props

| Prop | Tipo | Requerida | Default | Descripción |
|---|---|---|---|---|
| `propRequerida` | `string` | ✅ Sí | — | [Descripción] |
| `propOpcional` | `number` | ❌ No | `0` | [Descripción] |
| `onCallback` | `function` | ❌ No | `undefined` | [Descripción] |

---

## Responsabilidades

> Lista qué hace y qué NO hace este componente.

### Hace
- [Responsabilidad 1, ej: "Renderiza lista de transacciones con filtro por tipo"]
- [Responsabilidad 2]
- [Responsabilidad 3]

### No hace
- [Lo que está fuera del scope, ej: "No persiste datos directamente — delega a la API"]
- [Exclusión 2]

---

## Flujos clave

### Flujo 1: [Nombre del flujo principal]
```
Usuario hace [acción]
  → [paso 1]
  → [paso 2]
  → [resultado]
```

### Flujo 2: [Nombre del flujo secundario]
```
[descripción del flujo]
```

---

## Estado interno (solo Client Components)

```tsx
// Estado principal
const [items, setItems] = useState<ItemType[]>(initialItems);
const [filter, setFilter] = useState<"all" | "typeA" | "typeB">("all");
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Estado derivado (memoizado)
const filteredItems = useMemo(() =>
  filter === "all" ? items : items.filter(i => i.type === filter),
  [items, filter]
);
```

---

## Dependencias externas

| Dependencia | Tipo | Uso en este componente |
|---|---|---|
| `@supabase/ssr` | Cliente DB | Queries y mutations |
| `lucide-react` | UI | Iconos específicos usados |
| `recharts` | Visualización | Si aplica |
| `date-fns` | Utilidad | Formateo de fechas |

---

## Configuración y variables de entorno

> Listar solo las variables que afectan directamente el comportamiento de este componente.

| Variable | Impacto si falta |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Componente no puede hacer queries |
| [Otra variable] | [Impacto] |

---

## Casos de borde y manejo de errores

| Caso | Comportamiento esperado |
|---|---|
| Lista vacía (0 items) | Mostrar estado vacío con mensaje contextual |
| Error de red / DB | Mostrar mensaje de error, no pantalla en blanco |
| Usuario sin preferencias configuradas | Usar valores default |
| [Caso específico del componente] | [Comportamiento] |

---

## Ejemplo de uso

```tsx
// Uso mínimo
<[NombreComponente]
  propRequerida="valor"
/>

// Uso completo
<[NombreComponente]
  propRequerida="valor"
  propOpcional={42}
  onCallback={(value) => console.log(value)}
/>
```

### Contexto de uso en el proyecto
```tsx
// src/app/(app)/[ruta]/page.tsx
import [NombreComponente] from "./[NombreComponente]";

export default async function Page() {
  const data = await fetchData();
  return <[NombreComponente] propRequerida={data} />;
}
```

---

## Accesibilidad

- [ ] Atributos `aria-*` correctos en elementos interactivos.
- [ ] Navegable por teclado (tab order lógico).
- [ ] Contraste de color cumple WCAG AA (4.5:1 para texto normal).
- [ ] Imágenes con `alt` descriptivo.
- [ ] Mensajes de error anunciados con `role="alert"`.

---

## Performance

- [ ] Listas largas usan virtualización o paginación.
- [ ] Callbacks memoizados con `useCallback` si se pasan como props.
- [ ] Computaciones costosas memoizadas con `useMemo`.
- [ ] Sin re-renders innecesarios por estado que no afecta al render.

---

## Riesgos y limitaciones

| Riesgo | Severidad | Estado |
|---|---|---|
| [Riesgo 1, ej: "Sin paginación en listas > 100 items"] | Media | Activo |
| [Riesgo 2] | [Alta/Media/Baja] | [Activo/Mitigado] |

---

## Tests recomendados

```ts
// [NombreComponente].test.tsx
describe("[NombreComponente]", () => {
  test("renderiza correctamente con props mínimas", () => { ... });
  test("muestra estado vacío cuando no hay items", () => { ... });
  test("filtra items correctamente al cambiar filtro", () => { ... });
  test("llama onCallback con el valor correcto", () => { ... });
  test("muestra error cuando la query falla", () => { ... });
});
```

---

## Evolución y próximos pasos

- [ ] [Mejora futura 1, ej: "Agregar paginación infinita"]
- [ ] [Mejora futura 2]
- [ ] [Deuda técnica específica de este componente]

---

## Historial de cambios

| Fecha | Versión | Cambio | Author |
|---|---|---|---|
| YYYY-MM-DD | 1.0.0 | Creación inicial | [Nombre] |
| YYYY-MM-DD | 1.1.0 | [Descripción del cambio] | [Nombre] |
