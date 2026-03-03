# Husky + lint-staged — Setup de Gates Pre-commit

## Instalación
```bash
npm install --save-dev husky lint-staged
npx husky init
```

## Configurar hook pre-commit
```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx lint-staged
```

## Configurar lint-staged en `package.json`
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```

## Activar en CI (evitar que Husky falle en Vercel)
```json
{
  "scripts": {
    "prepare": "husky || true"
  }
}
```

El `|| true` previene error si `husky` no está instalado en el entorno de Vercel.

## Resultado
- Cada `git commit` ejecuta ESLint + Prettier automáticamente sobre archivos staged.
- Commit bloqueado si hay errores de lint.
- Formato consistente sin dependencia de configuración del IDE.
