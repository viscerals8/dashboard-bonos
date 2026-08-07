# Checklist antes de pasar a producción

Evaluación honesta a fecha 2026-07-22. El MVP funciona y demuestra bien el concepto (personalización por usuario, gráficos mutables, 18 paneles de datos). Esto es lo que falta antes de considerarlo una aplicación de producción real, ordenado por prioridad.

## 🔴 Bloqueante — sin esto no sirve con usuarios reales

- [ ] **Arreglar el login real.** `app/security.py::verify_password()` compara la contraseña en texto plano contra `USUARIOS.password`, pero 258 de 273 cuentas reales tienen esa columna hasheada (parece SHA256, 64 caracteres hex — hay que confirmar el algoritmo exacto, probablemente esté documentado en el sistema que originalmente generó esos hashes). Hoy **ningún usuario real puede iniciar sesión**. El comentario en el código ya lo admite: *"todavia no esta hasheado (migracion pendiente, ver plan del MVP)"*.
  - Una vez identificado el algoritmo, `verify_password` debe hashear el input y comparar, no comparar texto plano.
  - Considerar migrar a bcrypt (ya está en `requirements.txt`) con una tabla de migración gradual si el hash actual es débil.

## 🟠 Importante — antes de tener tráfico real o crecer los datos

- [ ] **Agregar índices** a la base restaurada (no tiene ninguno):
  - `INGRESO_BONO`: índice en `SOLICITANTE`, `ID_EMPRESA`, `id_zona`, `ESTADO`, y compuesto `(ID_EMPRESA, id_zona)`
  - `VALIDACION_BONO`: índice en `ID_BONO`, `USER_VALIDADOR1`, `USER_VALIDADOR2`, `ESTADO`
  - `USUARIOS`: índice único en `username` (es la clave de login); índice normal en `rut` (no puede ser único mientras haya duplicados reales)
- [ ] **Resolver duplicados en `USUARIOS.rut`.** Ya lo comprobamos en vivo (dos cuentas distintas con el mismo rut generan filas duplicadas en cualquier JOIN por rut). El código ya deduplica con `ROW_NUMBER()` donde se detectó, pero es un parche — lo correcto es limpiar el dato o agregar un identificador propio.
- [ ] **Restringir CORS** en `main.py` — hoy acepta cualquier puerto de `localhost`/`127.0.0.1`/`[::1]` (`allow_origin_regex`), perfecto para desarrollo, pero en producción debe ser una lista exacta del dominio real del frontend.
- [ ] **Mover la URL del backend a `environment.ts`** — hoy está hardcodeada (`http://127.0.0.1:8001`) en `auth.service.ts` y `dashboard.service.ts`. Usar `environment.apiUrl` con `environment.prod.ts` para el build de producción.
- [ ] **HTTPS** — todo corre hoy en HTTP plano.
- [ ] **`.env` de producción separado**, sin las 15 cuentas `@demo.cl` ni apuntando al servidor de pruebas `JUSTTIMEAPP\JUSTTIMEAPP`.

## 🟡 Recomendado — mejora la robustez pero no bloquea un lanzamiento inicial

- [ ] Rate limiting / bloqueo tras intentos fallidos en `/auth/login`
- [ ] Refresh token (hoy el JWT expira a las 8h sin renovación, el usuario tiene que volver a loguearse)
- [ ] Logging estructurado + monitoreo de errores (Sentry o similar)
- [ ] Tests automatizados (no existen hoy ni en backend ni en frontend, salvo el `dashboard.spec.ts` default de Angular CLI)
- [ ] Paginación en cualquier endpoint futuro que devuelva listas no agregadas (los actuales agregan con `GROUP BY`, así que los payloads son chicos — esto es una guía a futuro, no una falla actual)
- [ ] Confirmar por qué `ExcelBonos` existe en el backup nativo pero no en el export manual, y decidir si el backend debe usarla

## Ya está bien así (no tocar sin necesidad)

- El mecanismo de personalización por empresa/zona (`_run_scoped_query`) y por RUT propio (endpoints `/mi-*`) — es simple, correcto, y ya probado con 15 combinaciones distintas de scope.
- La estructura de componentes de Angular (standalone, `kpi-card` reutilizable) — flexible para agregar más paneles sin duplicar código de gráficos.
- Los 623 archivos de migración de `INGRESO_BONO` — ya resuelven el problema de tamaño y de corrupción por `\r`, no hace falta volver a tocarlos salvo que cambien los datos de origen.
