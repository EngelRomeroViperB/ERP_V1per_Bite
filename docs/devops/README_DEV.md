# README DEV — Guía de Desarrollo y DevOps

## Resumen ejecutivo
Setup completo, variables de entorno, scripts, flujo de desarrollo, CI/CD y despliegue en Vercel para el proyecto ERP de Vida (Windsurf). Documento de referencia para onboarding de devs nuevos.

---

## Setup paso a paso

### Requisitos previos
- Node.js >= 20.x (recomendado 20.17.0+ LTS)
- npm >= 10.x
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Google AI Studio](https://aistudio.google.com) (para Gemini)
- Git configurado con acceso a `github.com/EngelRomeroViperB/ERP_V1per_Bite`

### 1. Clonar el repositorio
```bash
git clone https://github.com/EngelRomeroViperB/ERP_V1per_Bite.git
cd ERP_V1per_Bite
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env.local
# Editar .env.local con los valores reales
```

### 4. Ejecutar migraciones en Supabase
Ve a **Supabase Dashboard → SQL Editor** y ejecuta en este orden:
```
supabase/migrations/001_initial_schema.sql   → 15+ tablas y relaciones
supabase/migrations/002_rls_policies.sql     → Row Level Security
supabase/migrations/003_triggers.sql         → updated_at, auto-complete
supabase/migrations/004_seed_data.sql        → seed_user_defaults()
supabase/migrations/005_security_fixes.sql   → fix search_path en funciones
```

### 5. Configurar Google OAuth en Supabase
1. Dashboard → **Authentication → Providers → Google** → Activar.
2. Ingresar **Client ID** y **Client Secret** de [Google Cloud Console](https://console.cloud.google.com).
3. En Google Cloud Console → Credenciales → agregar Authorized redirect URI:
```
https://<tu-proyecto>.supabase.co/auth/v1/callback
```

### 6. Configurar Redirect URLs en Supabase
Dashboard → **Authentication → URL Configuration**:
```
Site URL:        https://tu-dominio.vercel.app
Redirect URLs:   https://tu-dominio.vercel.app/callback
                 http://localhost:3000/callback
```

### 7. Levantar en desarrollo
```bash
npm run dev
# App disponible en: http://localhost:3000
```

---

## Variables de entorno

### `.env.local` completo
```env
# Supabase (público — seguro para el cliente)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# Supabase (secreto — solo servidor)
SUPABASE_SERVICE_ROLE_KEY=

# Google Gemini IA
GEMINI_API_KEY=AIza...
# Opcional: override de modelo(s) en orden de prioridad
# GEMINI_MODELS=gemini-2.5-flash,gemini-2.0-flash

# Shopify Webhook (genera un string aleatorio seguro)
SHOPIFY_WEBHOOK_SECRET=

# Web Push VAPID (genera con: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:tu@email.com
```

### Matriz de variables por funcionalidad
| Variable | Requerida | Funcionalidad que bloquea si falta |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Sí | Todo — app no arranca |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Sí | Todo — app no arranca |
| `GEMINI_API_KEY` | ⚠️ Recomendada | IA chat y quick-capture (fallback local activo) |
| `SHOPIFY_WEBHOOK_SECRET` | ⚠️ Si usas Shopify | Webhook rechaza todos los eventos |
| `VAPID_PUBLIC_KEY` | ⚠️ Si usas push | Notificaciones push deshabilitadas |
| `VAPID_PRIVATE_KEY` | ⚠️ Si usas push | Notificaciones push deshabilitadas |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Operaciones admin | Operaciones privilegiadas de servidor |

---

## Scripts npm

```bash
npm run dev      # Servidor de desarrollo (http://localhost:3000)
npm run build    # Build de producción con type-check + lint
npm run start    # Serve del build local
npm run lint     # ESLint sobre todo src/
```

### Validación antes de push
```bash
npm run lint && npm run build
# Ambos deben salir con exit code 0
```

---

## Flujo de desarrollo

```
1. Crear branch: git checkout -b feature/nombre-feature
2. Implementar cambios
3. Validar: npm run lint && npm run build
4. Commit siguiendo convención: feat(scope): descripción
5. Push: git push origin feature/nombre-feature
6. PR → revisión → merge a master
7. Vercel despliega automáticamente si Git está conectado
```

---

## CI/CD

### Estado actual
⚠️ **No existe pipeline CI formal.** La calidad depende de ejecución manual de lint/build.

### Configuración recomendada (GitHub Actions)
Crear `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

---

## Despliegue en Vercel

### Configuración correcta del proyecto
1. Importar repositorio en [vercel.com](https://vercel.com).
2. **Root Directory**: dejar **vacío** (no usar `.` ni `./`).
3. **Framework Preset**: `Next.js` (auto-detectado si root directory está vacío).
4. **Build Command**: `npm run build`.
5. **Install Command**: `npm install`.
6. **Output Directory**: vacío.

### Variables de entorno en Vercel
Dashboard → **Settings → Environment Variables** → agregar todas las variables de `.env.example` para los ambientes `Production`, `Preview` y `Development`.

### Disparar redeploy sin cambios de código
```bash
git commit --allow-empty -m "chore: trigger vercel rebuild"
git push origin master
```

### Troubleshooting común
| Error | Causa | Solución |
|---|---|---|
| `No Next.js version detected` | Root Directory mal configurado | Dejarlo **vacío** en Vercel Project Settings |
| `404 NOT_FOUND` en dominio | Alias no asignado al deploy actual | Ir a Deployments → Redeploy → Promote to Production |
| Build falla en Vercel pero OK local | Env vars faltantes en Vercel | Verificar todas las variables en Settings |

---

## Docker
⚠️ No existe `Dockerfile` en el repositorio actual. El deploy está diseñado para Vercel serverless.

Si se requiere Docker en el futuro:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Riesgos y limitaciones
- Sin CI automático, los builds rotos pueden llegar a `master`.
- Vercel plan Hobby elimina deployments históricos (Deployment Retention).
- Sin staging dedicado — los previews de PR son el único ambiente intermedio.

## Checklist operativo
- [ ] `npm run lint && npm run build` antes de cada merge.
- [ ] Verificar envs en Vercel tras agregar variables nuevas.
- [ ] Confirmar Redirect URLs de Supabase al cambiar dominio.
- [ ] Probar el flujo de login/callback en cada ambiente.

## Próximos pasos
1. Implementar GitHub Actions CI con lint + build.
2. Configurar ambiente `staging` en Vercel con branch `develop`.
3. Crear smoke test post-deploy automatizado.
