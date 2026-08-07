# Guía de estudio — Sistema de Bonos

Pensada para entender ESTE proyecto a fondo, no como curso genérico. Cada nivel apunta a archivos reales del repo y termina en un ejercicio que modificas y pruebas tú mismo contra la base de `JUSTTIMEAPP` (nunca contra producción). Ve en orden — cada nivel asume el anterior.

Antes de empezar: ten el backend y el frontend corriendo (ver `ARQUITECTURA.md`), y una cuenta de prueba a mano (`marcela.bustos@demo.cl` / `Demo2026!`).

---

## Nivel 1 — Leer un endpoint FastAPI simple

**Lee:** `dashboard-backend/app/auth.py` completo (43 líneas, es el más corto).

**Entender:**
- Qué es un `APIRouter` y por qué `main.py` hace `app.include_router(auth_router)`
- Qué hace un modelo Pydantic (`LoginRequest`, `LoginResponse`) — por qué FastAPI valida el JSON de entrada solo con declarar la clase
- Qué es `HTTPException` y cuándo se lanza

**Ejercicio:** agrega un endpoint nuevo `GET /auth/ping` que devuelva `{"status": "pong"}`, sin autenticación. Pruébalo con:
```bash
curl http://127.0.0.1:8001/auth/ping
```

---

## Nivel 2 — SQL dentro de Python (SQLAlchemy `text()`)

**Lee:** `dashboard-backend/app/dashboard.py`, funciones `embudo_aprobacion` y `por_zona` (son las más simples).

**Entender:**
- Por qué se usa `text("""...""")` en vez del ORM de SQLAlchemy (aquí se escribe SQL crudo a propósito, con placeholders `:nombre` para evitar inyección SQL)
- `conn.execute(query, params).mappings().all()` — qué forma de datos devuelve (lista de dicts)
- Repasa `BASE_DE_DATOS.md` para saber qué columnas existen en `INGRESO_BONO`

**Ejercicio:** escribe una consulta nueva que agrupe `INGRESO_BONO` por `CODIGO_INSTALACION`, sumando `MONTO`. Pruébala directo en SQL primero (`sqlcmd` o SSMS), luego pásala a un endpoint `GET /dashboard/por-instalacion` copiando el patrón de `por_zona`.

---

## Nivel 3 — Ventanas SQL (`ROW_NUMBER`, `PARTITION BY`)

**Lee:** `dashboard-backend/app/dashboard.py`, función `bonos_top` — es la consulta más compleja del proyecto.

**Entender:**
- Qué hace `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` — piensa en "para cada grupo, numera las filas ordenadas de mejor a peor"
- Por qué se necesita un CTE (`WITH BonosPagados AS (...)`) antes de poder filtrar por ese número de fila (`WHERE rn = 1`) — un alias creado en el `SELECT` no se puede usar en el mismo nivel de `WHERE`
- Compara con `mi_ranking` en el mismo archivo — misma técnica, pero sin partición (ranking global) y quedándote con el top 15 **más** tu propia fila aunque no estés en el top 15 (`WHERE puesto <= 15 OR SOLICITANTE = :rut`)

**Ejercicio:** en papel (o en SSMS), escribe una consulta que dé el ranking de zonas por monto total del último semestre, usando `ROW_NUMBER()`.

---

## Nivel 4 — JWT y autenticación

**Lee:** `dashboard-backend/app/security.py` completo (51 líneas).

**Entender:**
- Qué es un JWT: tres partes separadas por puntos (header.payload.signature), el payload es JSON codificado en base64 — **no está encriptado, solo firmado**. Pruébalo: copia cualquier token generado y pégalo en jwt.io, verás el payload legible
- Por qué `get_current_user` es una dependencia de FastAPI (`Depends(...)`) reutilizable en cada endpoint que necesita saber quién hizo la petición
- El problema real que existe hoy: `verify_password` compara texto plano — por qué eso es inseguro y por qué falla contra hashes reales (ver `CHECKLIST_PRODUCCION.md`)

**Ejercicio:** agrega un claim nuevo al token, por ejemplo `"nombre_completo"`, y crea un endpoint `GET /dashboard/quien-soy` que lo devuelva desde `current_user`, sin consultar la base de nuevo.

---

## Nivel 5 — El patrón de personalización (lo más importante de este proyecto)

**Lee:** `_run_scoped_query` y `_account_scope` en `dashboard.py` (arriba del todo), y compáralos con `_current_rut` + cualquier endpoint `mi-*`.

**Entender:**
- La idea central: **una sola consulta SQL, parametrizada por lo que trae el token** — no hay ningún `if perfil == X` en el código. Esto es lo que hace que 15 usuarios distintos vean 15 vistas distintas del mismo panel
- Diferencia entre las dos capas de scope: por empresa/zona (colectivo, "mi equipo") vs. por RUT propio (individual, "yo")
- Por qué `bindparam("empresas", expanding=True)` — permite pasar una lista variable de valores a un `IN (...)` de forma segura

**Ejercicio:** toma el endpoint `por_concepto` (no tiene scope por RUT) y conviértelo también en un endpoint personal `mis-conceptos` que muestre solo los conceptos de bono que TÚ has solicitado.

---

## Nivel 6 — Angular standalone + RxJS

**Lee:** `dashboard-bonos/src/app/services/dashboard.service.ts`, `dashboard-bonos/src/app/root.component.ts`, `dashboard-bonos/src/app/app.routes.ts`.

**Entender:**
- Qué es un componente standalone (`standalone: true`, `imports: [...]`) y por qué Angular 20 ya no necesita `NgModule`
- Qué es un `Observable` y por qué `.subscribe(data => ...)` es como un `then()` de una promesa pero puede emitir varias veces
- Cómo `auth.interceptor.ts` intercepta CADA petición HTTP saliente para agregar el header `Authorization` — nunca lo hacen los componentes manualmente
- Cómo `auth.guard.ts` bloquea el acceso a una ruta si no hay token

**Ejercicio:** crea una página nueva `mi-cuenta` con su propia ruta protegida, que solo muestre el nombre del usuario logueado (usa `AuthService.getNombreCompleto()`).

---

## Nivel 7 — El componente de gráficos (`kpi-card`)

**Lee:** `dashboard-bonos/src/app/components/kpi-card/kpi-card.ts` completo.

**Entender:**
- Por qué existe UN solo componente reutilizado en 16 paneles distintos, en vez de 16 componentes de gráfico separados — principio DRY aplicado a visualización de datos
- Cómo `rebuild()` arma una configuración distinta de ApexCharts según `currentType` (bar/line/area vs. donut/pie necesitan formas de datos distintas: `[{name, data}]` vs. array plano)
- El truco de `highlightIndex` — cómo pintar una sola barra distinta usando `distributed: true` y un array de colores por posición
- El truco del `resize` en `panel-general.ts` — por qué ApexCharts necesita ese empujón cuando vive dentro de una pestaña con `*ngIf`

**Ejercicio:** agrega un sexto tipo de gráfico (`radar` o `scatter` de ApexCharts) a `ChartKind` y haz que aparezca como opción en cualquier panel.

---

## Nivel 8 — Trazar un flujo completo, de punta a punta

Elige UN panel (sugerido: "Mi Ranking", es el más rico) y escribe tú mismo, en un documento aparte, la cadena completa:

1. Click en la pestaña → `panel-general.ts::seleccionar()`
2. `panel-general.html` cambia el `*ngIf` activo → se monta `<app-kpi-card>`
3. ¿Dónde se pidieron los datos? (pista: en `ngOnInit`, no en el click)
4. `dashboard.service.ts::getMiRanking()` → `HttpClient.get(...)`
5. `auth.interceptor.ts` agrega el Bearer token
6. Llega a `dashboard.py::mi_ranking` en el backend
7. `_current_rut()` extrae el rut del JWT decodificado
8. La consulta SQL con CTEs `Totales` → `Ranking` → `NombreUnico`
9. SQLAlchemy devuelve `mappings().all()` → FastAPI lo serializa a JSON
10. Angular lo recibe, `panel-general.ts` lo transforma (`.map()`, busca `es_actual`)
11. Se lo pasa a `kpi-card` vía `@Input()`
12. `kpi-card::rebuild()` arma la config de ApexCharts y la pinta

Si puedes explicar cada flecha de esa cadena sin mirar el código, entendiste la arquitectura completa.

---

## Nivel 9 — Pensar como en producción

**Lee:** `CHECKLIST_PRODUCCION.md` completo.

**Ejercicio (en papel, no hace falta implementarlo):** diseña el plan de migración para arreglar el hash de contraseñas sin dejar a los 258 usuarios reales sin acceso el mismo día. Pistas a considerar: ¿cómo migras gradualmente si no conoces el algoritmo original con certeza? ¿Qué pasa con las 15 cuentas de prueba en texto plano cuando actives la verificación real?

---

## Recursos externos (solo si te atoras en algo puntual)

- SQL Server window functions (`ROW_NUMBER`, `PARTITION BY`): documentación de Microsoft Learn, sección "OVER clause"
- FastAPI: el tutorial oficial cubre exactamente los patrones usados aquí (`Depends`, Pydantic, routers)
- Angular standalone components + signals: guía oficial de angular.dev (la versión nueva, no busques tutoriales de NgModules)
- RxJS: no necesitas la librería completa — con entender `Observable`, `subscribe`, y `pipe(filter(...))` (usado en `nav-bar.ts`) cubres el 90% de este proyecto
