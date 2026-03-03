# FAQ Técnico

## Resumen ejecutivo
Preguntas frecuentes basadas en problemas reales encontrados durante el desarrollo. Cada respuesta incluye causa raíz, solución paso a paso y cómo prevenir la recurrencia.

---

## Despliegue y Vercel

### ❓ Vercel dice "No Next.js version detected" y el deploy falla

**Causa**: `Root Directory` en el proyecto de Vercel apunta a una subcarpeta incorrecta. Vercel no encuentra el `package.json` con `"next"` como dependencia.

**Solución**:
1. Ir a Vercel Dashboard → Settings → General.
2. En **Root Directory**: borrar todo y dejar **vacío** (no `.`, no `./`).
3. Verificar que Framework Preset se auto-detecta como `Next.js`.
4. Redeploy desde Deployments → Redeploy.

**Prevención**: Documentar esta configuración en README. No cambiar Root Directory sin necesidad.

---

### ❓ El dominio de Vercel da 404 aunque el build fue exitoso

**Causa**: El deploy exitoso no está asignado como "Production". Puede ocurrir cuando hay un deploy manual o cuando se rompió la asignación de alias.

**Solución**:
1. Vercel Dashboard → Deployments.
2. Encontrar el deploy verde (Success) más reciente.
3. Menú (tres puntos) → **Promote to Production**.

---

### ❓ El build falla en Vercel pero funciona en local

**Causas más comunes** (en orden de frecuencia):
1. Variable de entorno faltante en Vercel → ir a Settings → Environment Variables.
2. Error de TypeScript ignorado localmente con `// @ts-ignore`.
3. Import de módulo de Node.js en componente cliente (ej: `crypto`, `fs`).
4. Dependencia en `devDependencies` que se necesita en build.

**Diagnóstico rápido**:
```bash
# Simular build de producción localmente
npm run build
# Si falla aquí, el problema está en el código, no en Vercel
```

---

## Autenticación y sesiones

### ❓ El login con Google redirige a `/callback` pero luego da error 500 o queda en blanco

**Causas comunes**:
1. Redirect URL no configurada en Supabase Dashboard.
2. Google Cloud Console no tiene el URI de callback autorizado.
3. Client ID/Secret de Google incorrecto en Supabase Auth Settings.

**Solución paso a paso**:
1. Supabase Dashboard → Authentication → URL Configuration:
   ```
   Redirect URLs: https://tu-dominio.vercel.app/callback
                  http://localhost:3000/callback
   ```
2. Google Cloud Console → Credenciales → OAuth Client → Authorized redirect URIs:
   ```
   https://<proyecto>.supabase.co/auth/v1/callback
   ```
3. Verificar Client ID/Secret en Supabase → Authentication → Providers → Google.

---

### ❓ El usuario queda atrapado en un loop de redirección entre `/login` y `/dashboard`

**Causa**: El middleware está leyendo cookies desactualizadas o hay un conflicto entre la sesión del servidor y del cliente.

**Solución**:
1. Limpiar cookies del navegador para el dominio.
2. Verificar `src/middleware.ts` — el `getUser()` debe usar el server client con cookies correctas.
3. Verificar que `src/lib/supabase/server.ts` implementa correctamente el `getAll`/`setAll` de cookies.

---

## Inteligencia Artificial

### ❓ Quick capture siempre usa el fallback local y no Gemini

**Diagnóstico**:
1. Verificar que `GEMINI_API_KEY` está en las variables de entorno de Vercel.
2. Revisar el log de la función: Vercel → Functions → `api/ai/quick-capture`.
3. Buscar `"isQuotaError"` o `"usedFallback"` en el response.

**Causas frecuentes**:
- `GEMINI_API_KEY` vacía o inválida.
- Cuota del plan gratuito de Gemini agotada (15 RPM).
- `GEMINI_API_VERSION = "v1beta"` con modelo deprecado.

**Verificar quota**:
```
https://aistudio.google.com → API Keys → View quota
```

---

### ❓ La IA devuelve texto con markdown en lugar de JSON puro

**Causa**: Gemini a veces envuelve el JSON en bloques de código ` ```json ... ``` ` aunque el prompt pida "SOLO JSON válido".

**Solución implementada en el código**:
```ts
// Limpiar markdown antes de parsear
const cleaned = responseText
  .replace(/```json\n?/g, "")
  .replace(/```\n?/g, "")
  .trim();
const parsed = JSON.parse(cleaned);
```

Si sigue ocurriendo, agregar al prompt: `"Responde ÚNICAMENTE con el objeto JSON, sin ningún otro texto, sin bloques de código, sin explicaciones."`.

---

## Base de datos y Supabase

### ❓ Las queries devuelven datos de otros usuarios (RLS no está filtrando)

**Causa**: Las políticas RLS de la tabla no están activadas o hay un bug en la migración `002_rls_policies.sql`.

**Diagnóstico**:
```sql
-- En Supabase SQL Editor, verificar si RLS está habilitado:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- rowsecurity debe ser true para todas las tablas

-- Verificar políticas existentes:
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public';
```

**Solución**: Si RLS no está activado, ejecutar nuevamente `002_rls_policies.sql`.

---

### ❓ `profiles.preferences` devuelve campos con valores inesperados (null, tipo incorrecto)

**Causa**: El campo fue guardado con un nombre distinto al que se lee, o con tipo incorrecto.

**Diagnóstico**:
```sql
-- Ver el contenido real de preferences para un usuario
SELECT id, preferences FROM public.profiles WHERE id = 'USER_ID';
```

**Solución**: Identificar el campo problemático y hacer update directo:
```sql
UPDATE public.profiles
SET preferences = jsonb_set(
  preferences,
  '{quick_capture_default_priority}',
  '"P3"'
)
WHERE id = 'USER_ID';
```

**Prevención**: Implementar `zod` para validar `preferences` al leer.

---

### ❓ La migración SQL falla con error de función ya existente

**Causa**: Se intentó aplicar una migración que ya fue aplicada, o una función ya existe.

**Solución**:
```sql
-- Usar CREATE OR REPLACE para funciones
CREATE OR REPLACE FUNCTION ...

-- Usar IF NOT EXISTS para tablas
CREATE TABLE IF NOT EXISTS public.tabla ...

-- Usar DROP ... IF EXISTS para cleanup
DROP TRIGGER IF EXISTS trigger_name ON table_name;
```

**Regla**: Nunca editar migraciones ya aplicadas. Crear siempre `00N_descripcion.sql` nueva.

---

## Frontend y componentes

### ❓ El modal de quick capture aparece cortado o detrás del header en mobile

**Causa**: El header usa `backdrop-filter: blur()`, que crea un nuevo stacking context y contiene `position: fixed` de descendientes.

**Solución definitiva** (ya implementada):
```tsx
import { createPortal } from "react-dom";
// En el render del Header:
{showCapture && typeof document !== "undefined" && createPortal(
  <div className="fixed inset-0 z-50 ...">...</div>,
  document.body
)}
```

**Señal de este problema**: El modal funciona en desktop pero no en mobile, o se ve "detrás" del header.

---

### ❓ `hydration mismatch` en la consola del navegador

**Causas frecuentes**:
1. `typeof window !== "undefined"` check ausente en componentes que usan APIs del browser.
2. `createPortal` sin check de `typeof document !== "undefined"`.
3. Datos dependientes de la hora (ej: `new Date()`) usados en Server Component.

**Solución general**:
```tsx
// Para portales:
{mounted && typeof document !== "undefined" && createPortal(<Modal />, document.body)}

// Para componentes con estado de browser:
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

---

## Push Notifications

### ❓ Las push notifications no aparecen aunque el usuario las activó

**Diagnóstico en orden**:
1. Chrome DevTools → Application → Service Workers → verificar que `sw.js` está registrado.
2. Chrome DevTools → Application → Push Messaging → verificar suscripción activa.
3. Verificar que `VAPID_PUBLIC_KEY` en el frontend coincide con la del backend.
4. Verificar que la suscripción fue guardada correctamente en `profiles.preferences`.

**Verificar suscripción en DB**:
```sql
SELECT preferences->'push_subscription' as sub
FROM public.profiles
WHERE id = 'USER_ID';
-- Debe ser un objeto JSON con endpoint y keys, no null
```

**Nota importante**: El sistema actual guarda la suscripción pero el **envío activo** desde el servidor no está implementado. Las notificaciones solo llegan si hay un emisor externo.

---

## Checklist operativo ante problema desconocido

1. `npm run lint && npm run build` → ¿hay errores locales?
2. Revisar Variables de Entorno en Vercel Dashboard.
3. Revisar Vercel Function Logs para el endpoint afectado.
4. Revisar Supabase Dashboard → Logs → API Logs.
5. Buscar en este FAQ por síntoma.
6. Buscar en `docs/analysis/post_mortem.md` por incidente similar.
7. Documentar el nuevo problema aquí al resolverlo.

## Próximos pasos
1. Agregar cada nuevo problema resuelto a este FAQ.
2. Implementar Sentry para que los errores lleguen automáticamente sin depender de logs manuales.
3. Crear script de diagnóstico: `npm run diagnose` que verifique envs + conexión Supabase + API Gemini.
