# Config Files — Archivos de Configuración Críticos

## Resumen ejecutivo
Inventario de todos los archivos de configuración del proyecto, su propósito, quién los consume, y el riesgo de modificarlos incorrectamente.

## Alcance
Raíz del repositorio + `supabase/` + `src/app/api/`.

---

## Tabla de archivos críticos

| Archivo | Propósito | Consumidor | Riesgo si se modifica mal |
|---|---|---|---|
| `next.config.ts` | Headers HTTP, image domains, package imports optimizados | Next.js build + runtime | Build roto o fallo de seguridad |
| `tailwind.config.ts` | Tokens de diseño, colores, animaciones, content paths | PostCSS / Tailwind | Regresión visual completa |
| `tsconfig.json` | Compilación TypeScript, path aliases, strict mode | TypeScript compiler + IDE | Errores de tipo silenciados o paths rotos |
| `.eslintrc.json` | Reglas de calidad de código | ESLint / pre-commit | Código de baja calidad sin detección |
| `package.json` | Deps, versiones, scripts npm | npm + build system | Deps inconsistentes, scripts rotos |
| `postcss.config.mjs` | Pipeline CSS (Tailwind + Autoprefixer) | Webpack/Turbopack | CSS no compilado |
| `.env.example` | Contrato de variables de entorno del proyecto | Devs nuevos + CI | Onboarding incompleto |
| `.env.local` | Variables locales (no commitear) | Next.js runtime dev | Secretos expuestos si se commitea |
| `.gitignore` | Exclusiones de Git | Git | Secretos o node_modules commitados |
| `supabase/migrations/*.sql` | Esquema DB, RLS, triggers, seeds | Supabase CLI / dashboard | Drift de schema, pérdida de datos |
| `public/sw.js` | Service Worker para push notifications | Navegador | Notificaciones push rotas |
| `public/manifest.json` | PWA manifest | Navegador | PWA instalación rota |

---

## Detalle de archivos clave

### `next.config.ts`
```ts
// Puntos críticos:
experimental: { optimizePackageImports: ["lucide-react", "recharts", "date-fns"] }
// → tree-shaking automático; si se remueven pueden crecer los bundles

images: { remotePatterns: [...] }
// → si se agrega un dominio de imagen externo sin agregar aquí, da 400

async headers()
// → CSP, HSTS, etc. aplicados a /(.*) — cambio aquí afecta toda la app
```

### `tailwind.config.ts`
```ts
// darkMode: ["class"] — modo oscuro activado por clase en el HTML
// colors: usa CSS variables (hsl(var(--primary))) → la fuente real es globals.css
// borderRadius: --radius es 0.75rem → rounded-lg = 12px
// plugins: tailwindcss-animate (obligatorio para acordeones y animaciones)
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "strict": true,           // Habilita todos los checks estrictos
    "paths": { "@/*": ["./src/*"] }, // Alias de importación
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "moduleResolution": "bundler"
  }
}
```
⚠️ El alias `@/` es fundamental para todos los imports del proyecto. Si se cambia `paths`, rompe todos los imports internos.

### `.eslintrc.json`
```json
{
  "extends": ["next/core-web-vitals", "next/typescript"]
}
```
Solo reglas base de Next.js. Sin reglas de dominio custom ni `@typescript-eslint/no-explicit-any`.

### `supabase/migrations/`
| Archivo | Contenido |
|---|---|
| `001_initial_schema.sql` | 15+ tablas, FK, índices, `updated_at` trigger |
| `002_rls_policies.sql` | Políticas RLS por tabla (`user_id = auth.uid()`) |
| `003_triggers.sql` | `auto_complete_tasks`, métricas automáticas |
| `004_seed_data.sql` | `seed_user_defaults()` — datos iniciales de usuario |
| `005_security_fixes.sql` | `SET search_path` en funciones para evitar SQL injection |

⚠️ **Nunca editar migraciones ya aplicadas en producción**. Crear siempre un nuevo archivo `00N_descripcion.sql`.

### `public/sw.js`
- Service Worker registrado desde `Header.tsx`.
- Maneja eventos `push` y muestra `showNotification()`.
- Variables dependientes: `VAPID_PUBLIC_KEY` para `pushManager.subscribe()`.

### `.env.example`
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
SHOPIFY_WEBHOOK_SECRET=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:tu@email.com
```

---

## Reglas de gestión

1. **`.env.local` y `.env` nunca se commitean** — están en `.gitignore`.
2. **Variables `NEXT_PUBLIC_*`** son expuestas al navegador — nunca poner secretos.
3. **Nuevas variables** deben documentarse en `.env.example` con valor de ejemplo o vacío.
4. **Migraciones SQL** son inmutables una vez aplicadas; solo agregar nuevas.
5. **`next.config.ts`** debe pasar `npm run build` tras cualquier cambio.

---

## Riesgos y limitaciones
- Sin rotación de secretos automatizada.
- `.env.local` y `.env` con secretos reales en máquinas de desarrollo.
- Sin validación de que `.env.example` esté sincronizado con el código.

## Checklist operativo
- [ ] Verificar `.env.example` al agregar nueva variable de entorno.
- [ ] `npm run build` tras modificar `next.config.ts` o `tsconfig.json`.
- [ ] Revisar que `.gitignore` incluye todos los archivos de entorno.
- [ ] Nunca editar migraciones existentes — siempre crear nueva.

## Próximos pasos
1. Implementar validación de env vars al startup (`src/lib/env.ts` con zod).
2. Agregar comentarios inline a `next.config.ts` explicando cada decisión.
3. Crear script de validación: `npm run check:env`.
