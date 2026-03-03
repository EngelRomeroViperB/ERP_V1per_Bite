# Boilerplate — Estructura Base del Proyecto

## Descripción
Esta carpeta contiene la estructura base del proyecto sin lógica de negocio, configuración de herramientas de calidad de código, y archivos de referencia para inicializar un proyecto nuevo con el mismo stack.

## Estructura base recomendada

```
proyecto-nuevo/
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   ├── (app)/
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   └── health/
│   │   │       └── route.ts
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   └── layout/
│   │       ├── AppShell.tsx
│   │       ├── Sidebar.tsx
│   │       └── Header.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   └── utils.ts
│   ├── middleware.ts
│   └── tests/
│       └── setup.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## Herramientas de calidad configuradas

Ver archivos en esta carpeta:
- `eslintrc.json` — reglas ESLint recomendadas
- `prettierrc.json` — formato de código consistente
- `husky-setup.md` — instrucciones para Husky + lint-staged
- `github-actions-ci.yml` — pipeline CI de referencia
