# Dashboard de Bonos

Dashboard interno para visualizar y validar bonos de personal, con vistas distintas según el perfil de cada usuario (RRHH/administración vs. empleado consultando su propia información).

## Qué problema resuelve

En un sistema de bonos con distintos perfiles (administración general, jefaturas por zona/empresa, y el propio empleado), cada uno necesita ver un recorte distinto de la misma información: administración quiere el panorama completo, una jefatura solo su empresa/zona, y un empleado solo sus propios bonos, validaciones y ranking. Sin esto, esa información vive dispersa en reportes manuales o consultas SQL ad hoc.

## Cómo lo resuelve

- **Un solo JWT parametriza todo.** Al loguearse, el token incluye `perfil`, `empresas`, `zonas` y `rut` del usuario. No hay lógica condicional por usuario en el backend: es la misma consulta SQL para todos, filtrada según lo que trae el token (`_run_scoped_query` en `dashboard.py`).
- **Catálogo de dashboards por perfil.** `GET /dashboards` devuelve solo los paneles que ese perfil puede ver, cruzando las tablas `DASHBOARDS` y `PERFIL_DASHBOARD`.
- **Dos niveles de personalización:** por empresa/zona (paneles "General") y por RUT propio (paneles "Mi Info": mis bonos, mis validaciones, mi ranking, mi evolución, mis rechazos, mi tiempo de aprobación).
- **Gráficos mutables en vivo.** Un componente único (`kpi-card`) reutilizado en los 16 paneles con datos, donde el usuario puede cambiar el tipo de gráfico (barra/línea/área/dona/torta) sin recargar la vista.

## Estado del proyecto

Evaluación honesta a la fecha. No es un producto terminado — es un MVP funcional que demuestra el concepto completo, con pendientes conocidos antes de usarlo con datos reales en producción.

| Módulo | Estado | Notas |
|---|---|---|
| Catálogo de dashboards por perfil | ✅ Completo | `GET /dashboards` filtra correctamente por perfil |
| Panel General (11 paneles, scope empresa/zona) | ✅ Completo | Probado con 15 combinaciones distintas de scope |
| Mi Info (7 paneles personales por RUT) | ✅ Completo | |
| Gráficos interactivos reutilizables | ✅ Completo | Mutables en vivo, componente único (`kpi-card`) |
| Autenticación (login + JWT) | 🟡 En progreso | `verify_password` ahora usa `passlib` (bcrypt real + fallback a texto plano para cuentas demo), en vez de comparar todo como texto plano. Las cuentas demo funcionan igual que antes. Las 258 cuentas reales con hash tipo SHA256 **siguen sin poder loguearse**: el algoritmo exacto no está confirmado, y el código deja eso documentado en vez de adivinarlo (ver `docs/CHECKLIST_PRODUCCION.md`) |
| Config de entornos en el frontend | ✅ Completo | La URL del backend ahora vive en `src/environments/environment.ts` / `environment.prod.ts`, con `fileReplacements` configurado en `angular.json` para el build de producción |
| Seguridad para producción (CORS restringido, HTTPS, `.env` separado) | ⛔ Pendiente | Hoy todo corre en HTTP plano, en modo desarrollo |
| Índices en la base de datos | ⛔ Pendiente | La base restaurada no tiene ningún índice |
| Tests automatizados | ⛔ Pendiente | No existen en backend ni frontend (salvo el boilerplate por defecto de Angular CLI) |
| CI/CD | ⛔ Pendiente | No configurado |

## Stack técnico

**Backend** (`dashboard-backend/`)
- Python 3.13, FastAPI, Uvicorn
- SQLAlchemy + pyodbc (SQL Server, `ODBC Driver 17`)
- Autenticación con JWT (PyJWT, HS256)

**Frontend** (`dashboard-bonos/`)
- Angular 20 (standalone components)
- ApexCharts / ng-apexcharts para los gráficos
- Tailwind CSS

**Base de datos**
- SQL Server (esquema `Sistema_Bonos`)

## Cómo correrlo localmente

Necesitás una instancia de SQL Server accesible con el esquema `Sistema_Bonos` (tablas `USUARIOS`, `DASHBOARDS`, `PERFIL_DASHBOARD`, `INGRESO_BONO`, `VALIDACION_BONO`, etc. — ver `docs/BASE_DE_DATOS.md`). Los dumps de datos reales no se incluyen en este repositorio.

### Backend

```bash
cd dashboard-backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

copy .env.example .env         # completar con tus propios valores:
                                # DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, JWT_SECRET

uvicorn app.main:app --reload --port 8001
```

### Frontend

```bash
cd dashboard-bonos
npm install
npm start                      # ng serve, sirve en http://localhost:4200
```

El frontend espera el backend en `http://127.0.0.1:8001` (hardcodeado hoy, ver tabla de estado).

## Documentación adicional

Ver `docs/` para arquitectura a fondo (`ARQUITECTURA.md`), esquema de base de datos (`BASE_DE_DATOS.md`) y checklist detallado de pendientes antes de producción (`CHECKLIST_PRODUCCION.md`).
