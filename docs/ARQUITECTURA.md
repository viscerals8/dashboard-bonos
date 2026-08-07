# Arquitectura — Sistema de Bonos

## Stack

**Backend** (`dashboard-backend/`)
- Python 3.13, FastAPI 0.125.0, Uvicorn 0.38.0
- SQLAlchemy 2.0.45 + pyodbc 5.3.0 (driver `ODBC Driver 17 for SQL Server`)
- Auth: PyJWT 2.13.0 (HS256), passlib/bcrypt instalados pero **no usados aún**
- Config vía `.env` (python-dotenv)

**Frontend** (`dashboard-bonos/`)
- Angular 20 (standalone components, sin NgModules)
- ng-apexcharts 2.0.4 / apexcharts 5.3.6 para todos los gráficos
- Tailwind (clases utilitarias) para estilos, tema oscuro fijo
- RxJS 7.8, TypeScript 5.8

**Base de datos**
- SQL Server 2022 (Standard Edition), instancia `JUSTTIMEAPP\JUSTTIMEAPP`
- Base: `Sistema_Bonos`
- Ver `BASE_DE_DATOS.md` para el detalle completo

## Estructura de carpetas

```
dashboard/
├── dashboard-backend/
│   ├── app/
│   │   ├── main.py        # FastAPI app, CORS, routers
│   │   ├── database.py    # SQLAlchemy engine (lee .env)
│   │   ├── security.py    # JWT (create_access_token, get_current_user), verify_password
│   │   ├── auth.py        # POST /auth/login
│   │   ├── catalog.py     # GET /dashboards (catálogo por perfil)
│   │   └── dashboard.py   # Todos los endpoints de datos (/dashboard/*)
│   ├── migrations/        # Export SQL + chunks (ver mas abajo)
│   └── .env                # DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, JWT_SECRET
└── dashboard-bonos/
    └── src/app/
        ├── root.component.ts          # <app-nav-bar> + <router-outlet>
        ├── app.routes.ts              # login, dashboards, dashboard/*
        ├── guards/auth.guard.ts       # protege rutas autenticadas
        ├── interceptors/auth.interceptor.ts  # agrega Bearer token a cada request
        ├── services/
        │   ├── auth.service.ts        # login/logout, guarda token + nombre en localStorage
        │   └── dashboard.service.ts    # un método por endpoint de /dashboard/*
        ├── components/
        │   ├── nav-bar/                # barra superior fija (post-login)
        │   └── kpi-card/                # gráfico ApexCharts reutilizable y mutable
        └── pages/
            ├── login/
            ├── catalogo/                # tarjetas de dashboards según perfil
            ├── dashboard/                # Top 10 Bonos (standalone, tambien embebido)
            ├── embudo-aprobacion/        # Embudo (standalone, tambien embebido)
            └── panel-general/           # HUB: 11 paneles "General" + 7 paneles "Mi Info"
```

## Flujo de autenticación

1. `POST /auth/login` con `{username, password}` → `auth.py`
2. Busca en `USUARIOS` por `username`, compara password con `verify_password()`
   ⚠️ **hoy es comparación de texto plano** — ver `CHECKLIST_PRODUCCION.md`
3. Si OK, `create_access_token()` arma un JWT con:
   ```json
   { "sub": "username", "perfil": 0, "empresas": [1,2], "zonas": [4], "rut": "104", "exp": ... }
   ```
4. Frontend guarda `access_token` y `nombre_completo` en `localStorage` (`auth.service.ts`)
5. `auth.interceptor.ts` agrega `Authorization: Bearer <token>` a toda petición HTTP saliente
6. Backend: cada endpoint usa `Depends(get_current_user)` → decodifica el JWT y expone `perfil`/`empresas`/`zonas`/`rut` como `current_user: dict`

## Mecanismo de personalización (el corazón del sistema)

Dos capas independientes, ambas ya construidas:

**1. Qué dashboards ve cada perfil** (nivel "tarjeta"):
`DASHBOARDS` ⟷ `PERFIL_DASHBOARD` — `GET /dashboards` filtra por `perfil` del token.
Hoy solo existe un dashboard activo: `panel-general` (se sacaron `top-bonos` y `embudo-aprobacion` del catálogo por quedar redundantes dentro de Panel General).

**2. Qué datos ve cada usuario dentro de un mismo panel** (nivel "fila"):
- **Por empresa/zona** — helper `_run_scoped_query()` en `dashboard.py`. Si el token trae `empresas`/`zonas`, agrega `WHERE ID_EMPRESA IN (...) AND id_zona IN (...)` a la consulta. Si vienen vacíos, no filtra (ve todo). Usado por los 11 paneles de "General".
- **Por RUT propio** — los 7 endpoints de "Mi Info" (`mi-perfil`, `mis-bonos-solicitados`, `mis-validaciones`, `mi-ranking`, `mi-evolucion`, `mis-rechazos`, `mi-tiempo-aprobacion`) filtran directamente por `current_user["rut"]`, cruzando contra `INGRESO_BONO.SOLICITANTE` y `VALIDACION_BONO.USER_VALIDADOR1/2`.

Dos usuarios distintos pegándole al mismo endpoint reciben **la misma consulta, con datos completamente distintos** — no hay lógica condicional por usuario en el código, todo es el mismo SQL parametrizado.

## Componente de gráficos (`kpi-card`)

Un solo componente reutilizado en los 16 paneles con datos (los 11 de "General" + 6 de "Mi Info" con gráfico, más la ficha de "Mi Perfil" sin gráfico):
- Recibe `categories` + `series` (+ opcional `secondarySeries` para alternar Monto/Cantidad)
- `types: ChartKind[]` define qué botones de tipo de gráfico mostrar (bar/line/area/donut/pie) — el usuario puede mutar el gráfico en vivo
- `highlightIndex` pinta una barra específica en un color distinto (usado en "Mi Ranking" para destacar "tú" entre los demás)
- Truco de layout: como el gráfico vive dentro de una pestaña con `*ngIf`, ApexCharts a veces mide el contenedor en 0px antes de que el layout se estabilice. Se soluciona disparando `window.dispatchEvent(new Event('resize'))` con un `setTimeout` corto cada vez que se cambia de pestaña (`panel-general.ts`).

## Navegación

`root.component.ts` monta `<app-nav-bar>` (fijo, oculto en `/login`) sobre el `<router-outlet>`. El nav tiene: volver al catálogo, nombre del usuario logueado, cerrar sesión.
