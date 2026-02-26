# ERP de Vida — Personal Life Operating System

> **Sistema ERP personal full-stack construido con Next.js 15 + Supabase + Google Gemini**, diseñado para un único usuario que quiere gestionar tareas, hábitos, métricas, finanzas, relaciones y conocimiento desde una sola interfaz con inteligencia artificial integrada.

[![Next.js](https://img.shields.io/badge/Next.js-15.1.3-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-2.48.1-green?logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)

---

## 🧬 Product DNA — Funcionalidades Clave

| Módulo | Descripción |
|---|---|
| 🗂️ **Dashboard** | Vista unificada: KPIs del día, tareas prioritarias, hábitos, insight IA y trend chart 7 días |
| ✅ **Tasks** | CRUD completo con prioridad (P1–P4), estado, área, proyecto, fecha límite y filtros |
| 📁 **Projects + Areas** | Jerarquía de contexto: Áreas → Proyectos → Tareas con % de completado automático |
| 🔥 **Habits** | Racha diaria, heatmap de 28 días con Recharts, toggle de completado por día |
| 📊 **Metrics** | Registro diario de mood, peso, sueño, energía y calorías; gráficas de tendencia |
| 💰 **Finances** | Ingresos/gastos con categorías; integración opcional con Shopify webhook |
| 🧠 **Brain** | Base de conocimiento: snippets, notas y recursos con tags y búsqueda |
| 🤖 **AI Chat** | Chat en tiempo real con Google Gemini 1.5 Flash; guarda insights en DB automáticamente |
| ⚡ **Quick Capture** | Captura en lenguaje natural → Gemini clasifica y guarda en la tabla correcta (tarea/métrica/gasto/nota) |
| 👥 **CRM** | Contactos, interacciones y seguimiento de relaciones personales/profesionales |
| 🌿 **Skills** | Árbol de habilidades con niveles y categorías |
| 🔔 **Notificaciones** | Panel en header con contador, marcar leídas, tiempo relativo |
| 🔗 **Shopify Webhook** | Receptor HMAC-verificado para ingesta de datos de ventas en finanzas |

### 🎨 Sistema Visual

- **Framework CSS:** Tailwind CSS 3.4.17 con clase personalizada `glass` (backdrop-blur)
- **Paleta:** Dark theme con CSS variables (`--sidebar`, `--primary`, `--accent`, `--border`)
- **Iconografía:** Lucide React 0.469.0
- **Animaciones:** Framer Motion 11.15.0 + `tailwindcss-animate`
- **Gráficos:** Recharts 2.15.0 + D3 7.9.0
- **Tipografía:** Inter (vía `next/font`)

---

## 🛠️ Ficha Técnica — Stack Tecnológico

| Capa | Tecnología | Versión | Rol |
|---|---|---|---|
| **Core** | Next.js (App Router) | `^15.1.3` | Framework full-stack, rutas, SSR |
| **Lenguaje** | TypeScript | `^5.0` | Type safety en cliente y servidor |
| **UI Runtime** | React | `^19.0.0` | Server + Client Components |
| **Base de datos** | Supabase (PostgreSQL) | `^2.48.1` | DB relacional + Auth + RLS |
| **Auth SSR** | @supabase/ssr | `^0.5.2` | Cookies-based session en App Router |
| **IA Generativa** | Google Generative AI | `^0.21.0` | Gemini 1.5 Flash (API v1) |
| **Estado global** | Zustand | `^5.0.3` | Estado del cliente ligero |
| **Data fetching** | TanStack Query | `^5.62.7` | Cache, refetch y estado async |
| **Offline/Cache** | Dexie (IndexedDB) | `^4.0.9` | Persistencia local offline-first |
| **Estilos** | Tailwind CSS | `^3.4.17` | Utility-first CSS |
| **Componentes** | Radix UI | `^1.x–2.x` | Primitivos accesibles headless |
| **Gráficos** | Recharts | `^2.15.0` | Charts declarativos con SVG |
| **Gráficos (avanzado)** | D3 | `^7.9.0` | Heatmaps y visualizaciones custom |
| **Animaciones** | Framer Motion | `^11.15.0` | Transiciones de UI |
| **Fechas** | date-fns | `^4.1.0` | Manipulación de fechas |
| **Deploy** | Vercel | — | Edge Network, CI/CD automático desde GitHub |

---

## 🚀 Protocolo de Despliegue

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

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase — obtenlos en: https://supabase.com/dashboard/project/<id>/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# Google Gemini AI — obtenlo en: https://aistudio.google.com/apikey
GEMINI_API_KEY=tu-gemini-api-key

# Shopify Webhook (opcional) — genera un secreto aleatorio
SHOPIFY_WEBHOOK_SECRET=tu-secreto-webhook
```

### 4. Setup de Supabase

#### 4.1 Crear el proyecto
1. Ve a [supabase.com](https://supabase.com) → **New Project**
2. Guarda la URL y la `anon key` para el `.env.local`

#### 4.2 Ejecutar las migraciones (en orden)
Ve a **SQL Editor** en el dashboard de Supabase y ejecuta cada archivo en orden:

```
supabase/migrations/001_initial_schema.sql   → Tablas y relaciones
supabase/migrations/002_rls_policies.sql     → Row Level Security
supabase/migrations/003_triggers.sql         → Triggers automáticos
supabase/migrations/004_seed_data.sql        → Función seed_user_defaults()
supabase/migrations/005_security_fixes.sql   → Fix search_path en funciones
```

#### 4.3 Configurar Google OAuth
1. Ve a **Authentication → Providers → Google** en Supabase
2. Actívalo e ingresa tu Client ID y Secret de [Google Cloud Console](https://console.cloud.google.com)
3. En Google Cloud Console, agrega como **Authorized redirect URI**:
   ```
   https://<tu-proyecto>.supabase.co/auth/v1/callback
   ```

#### 4.4 Configurar URL de redirección
En Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://tu-dominio.vercel.app`
- **Redirect URLs:** `https://tu-dominio.vercel.app/callback`, `http://localhost:3000/callback`

### 5. Setup de Google Gemini AI
1. Ve a [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Crea una API Key (nivel gratuito disponible)
3. Agrégala como `GEMINI_API_KEY` en tu `.env.local` y en Vercel

### 6. Levantar en desarrollo

```bash
npm run dev
```

App disponible en: `http://localhost:3000`

### 7. Deploy en Vercel
1. Importa el repositorio en [vercel.com](https://vercel.com)
2. Agrega las 4 variables de entorno en **Settings → Environment Variables**
3. Vercel detecta Next.js automáticamente — clic en **Deploy**

---

## 🗂️ Mapa de Arquitectura de Archivos

```
ERP_V1per_Bite/
│
├── src/
│   ├── app/                          # Next.js App Router — todas las rutas
│   │   ├── (app)/                    # Rutas protegidas (requieren auth)
│   │   │   ├── layout.tsx            # AppShell wrapper + seed de datos iniciales
│   │   │   ├── dashboard/            # Vista principal con KPIs y trend chart
│   │   │   ├── tasks/                # Gestión de tareas con filtros y CRUD
│   │   │   ├── projects/             # Proyectos con % de completado
│   │   │   ├── areas/                # Áreas de vida (contexto jerárquico)
│   │   │   ├── habits/               # Hábitos + heatmap 28 días
│   │   │   ├── metrics/              # Métricas diarias de salud
│   │   │   ├── finances/             # Ingresos y gastos
│   │   │   ├── brain/                # Base de conocimiento (notas, snippets)
│   │   │   ├── nlp/                  # Chat IA con Google Gemini
│   │   │   ├── crm/                  # CRM personal de contactos
│   │   │   ├── skills/               # Árbol de habilidades
│   │   │   └── settings/             # Configuración de cuenta
│   │   │
│   │   ├── (auth)/                   # Rutas públicas de autenticación
│   │   │   ├── login/                # Página de login (Google OAuth + Magic Link)
│   │   │   └── callback/             # Handler del redirect de Supabase Auth
│   │   │
│   │   ├── api/                      # API Routes (Route Handlers)
│   │   │   ├── ai/
│   │   │   │   ├── chat/             # POST /api/ai/chat — Gemini conversacional
│   │   │   │   └── quick-capture/    # POST /api/ai/quick-capture — clasificación NLP
│   │   │   └── webhooks/
│   │   │       └── shopify/          # POST /api/webhooks/shopify — HMAC verification
│   │   │
│   │   ├── layout.tsx                # Root layout — fuentes, metadata, providers
│   │   └── page.tsx                  # Redirect a /dashboard si auth, /login si no
│   │
│   ├── components/
│   │   └── layout/
│   │       ├── AppShell.tsx          # Client wrapper — gestiona estado mobile sidebar
│   │       ├── Sidebar.tsx           # Navegación: desktop colapsable + mobile drawer
│   │       └── Header.tsx            # Header: notificaciones, captura rápida, sign out
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Supabase client para Client Components
│   │   │   ├── server.ts             # Supabase client para Server Components
│   │   │   └── types.ts              # Tipos generados del schema de DB
│   │   └── utils.ts                  # cn() — merge de clases Tailwind
│   │
│   └── middleware.ts                 # Auth guard: redirige /login si no hay sesión
│
├── supabase/
│   └── migrations/                   # SQL migrations en orden
│       ├── 001_initial_schema.sql    # 15+ tablas: tasks, habits, finances, etc.
│       ├── 002_rls_policies.sql      # RLS: usuario solo accede a sus datos
│       ├── 003_triggers.sql          # Triggers: updated_at, completado, notificaciones
│       ├── 004_seed_data.sql         # seed_user_defaults() — datos iniciales al login
│       └── 005_security_fixes.sql   # Fix search_path en funciones SECURITY DEFINER
│
├── public/                           # Assets estáticos
├── .env.local                        # Variables de entorno locales (NO commitear)
├── .env.example                      # Plantilla de variables de entorno
├── next.config.ts                    # Headers HTTP (CSP, HSTS, X-Frame-Options)
├── tailwind.config.ts                # Tema custom (colores, sidebar, glass)
└── middleware.ts                     # Auth middleware (excluye /api y assets)
```

---

## 🔐 Lógica de Dominio y Seguridad

### Matriz de Roles

| Acción | Usuario autenticado | Visitante no autenticado |
|---|---|---|
| Ver/editar sus datos | ✅ (RLS by `user_id`) | ❌ Redirect a `/login` |
| Ver datos de otros usuarios | ❌ (RLS bloquea) | ❌ |
| Llamar a `/api/ai/*` | ✅ (verifica sesión server-side) | ❌ 401 Unauthorized |
| Recibir webhook Shopify | N/A (verificación HMAC) | ✅ si HMAC válido |

### Row Level Security (RLS)
Todas las tablas tienen RLS habilitado. La política base es:
```sql
USING (auth.uid() = user_id)
```
Ninguna query desde el cliente puede acceder a datos de otro usuario, independientemente del código frontend.

### Headers de Seguridad HTTP
Configurados en `next.config.ts`:
- `Content-Security-Policy` — previene XSS
- `Strict-Transport-Security` — fuerza HTTPS
- `X-Frame-Options: DENY` — previene clickjacking
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## ⚙️ Comportamiento del Sistema — Flujos Críticos

### Flujo de Autenticación

```
Usuario → /login → Clic "Continuar con Google"
  → Supabase OAuth → Google consent
  → Redirect a /callback
  → supabase.auth.exchangeCodeForSession()
  → Redirect a /dashboard
  → AppLayout (Server Component):
      1. Verifica sesión (getUser())
      2. Upsert en tabla profiles
      3. Cuenta áreas del usuario
      4. Si count === 0 → seed_user_defaults() (datos iniciales)
```

### Flujo de Quick Capture con IA

```
Usuario escribe texto → "Procesar con IA"
  → POST /api/ai/quick-capture
  → Verifica sesión → Envía a Gemini con prompt de clasificación
  → Gemini retorna JSON: { type, data }
  → Guarda en tabla según tipo:
      "task"    → INSERT tasks
      "metric"  → UPSERT daily_metrics (hoy)
      "finance" → INSERT finances
      "note"    → INSERT brain_notes
  → Header muestra: "✓ Tarea creada" | "✓ Métrica guardada" | etc.

Fallback (sin API key): guarda siempre en brain_notes
```

### Sincronización Offline → Online
Dexie (IndexedDB) se usa como capa de persistencia local. El flujo:
```
Sin conexión → Operaciones se escriben en IndexedDB local
Con conexión → TanStack Query refetch automático
             → Datos de Supabase sincronizan y sobreescriben cache
```

### Seed de Datos Iniciales
Al primer login, `seed_user_defaults()` inserta automáticamente:
- **Áreas:** Trabajo, Personal, Salud, Aprendizaje
- **Hábitos:** Ejercicio, Meditación, Lectura
- **Categorías de finanzas:** Alimentación, Transporte, Salud, Entretenimiento

---

## 📡 Webhook de Shopify (Opcional)

El endpoint `POST /api/webhooks/shopify` recibe eventos de órdenes de Shopify:

1. Verifica la firma HMAC con `SHOPIFY_WEBHOOK_SECRET`
2. Registra el evento en `webhook_logs`
3. Si es `orders/paid` → crea una entrada de ingreso en `finances`

Para activarlo en Shopify Admin:
- URL: `https://tu-dominio.vercel.app/api/webhooks/shopify`
- Secret: el valor de `SHOPIFY_WEBHOOK_SECRET`
- Eventos: `orders/paid`, `orders/cancelled`

---

## 📋 Variables de Entorno — Referencia Completa

| Variable | Requerida | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clave pública de Supabase |
| `GEMINI_API_KEY` | ✅ para IA | Clave de Google AI Studio |
| `SHOPIFY_WEBHOOK_SECRET` | ⚠️ opcional | Secreto HMAC para webhook de Shopify |

---

*Built by [@EngelRomeroViperB](https://github.com/EngelRomeroViperB)*
