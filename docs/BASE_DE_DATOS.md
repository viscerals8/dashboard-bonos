# Base de Datos — Sistema_Bonos

**Servidor:** `JUSTTIMEAPP\JUSTTIMEAPP` — SQL Server 2022 Standard Edition, Windows Server 2022
**Base:** `Sistema_Bonos`
**Origen:** restaurada desde backup nativo `bonos.back` (288 MB, generado en un servidor SQL 2022). Existe también un export en texto plano (`dashboard-backend/migrations/Sistema_Bonos_export.sql`, 285 MB) usado como plan B cuando el `.back` no pudo restaurarse en un servidor con SQL Server 2012 (incompatibilidad de versión — los backups nativos solo restauran hacia versiones iguales o más nuevas).

⚠️ **La base no tiene PRIMARY KEY, FOREIGN KEY ni índices en ninguna tabla.** El export dice explícitamente: *"sin indices/PK/FK, solo para clonar en otro servidor"*. Todas las relaciones de abajo son lógicas (por convención de datos), no estan garantizadas por el motor.

## Tablas y volumen (medido en la restauración)

| Tabla | Filas | Rol |
|---|---|---|
| `INGRESO_BONO` | 29,034 | Tabla principal — cada bono solicitado |
| `VALIDACION_BONO` | 28,674 | Estado de validación de cada bono (1:1 con INGRESO_BONO por `ID_BONO`) |
| `HISTORICO_JUSTTIME` | 14,241 | Histórico de bonos (misma forma que INGRESO_BONO + `VALIDADOR1/2`) |
| `PERSONAS_CARGA` | 7,507 | Carga de personal |
| `USUARIOS` | 273 | Cuentas de login + scope de acceso |
| `ZONAS` | 9 | Catálogo de zonas geográficas |
| `PERFIL_DASHBOARD` | 8→4 | Qué dashboard ve cada perfil (FK real hacia `DASHBOARDS.id`) |
| `EMPRESAS` | 6 | Catálogo de empresas del grupo Eulen |
| `OPCIONES_ESTADO` | 4 | Catálogo de estados: 0=RECHAZADO, 1=VALIDADO, 2=PENDIENTE, 3=TERMINADO |
| `DASHBOARDS` | 2→3 | Catálogo de dashboards disponibles (uno lo agregamos: `panel-general`) |
| `PASS_CORREO` | 1 | Password de envío de correo — **en texto plano** |
| `PERSONAS` | 0 | Vacía |
| `ExcelBonos` | ? | Solo existe en el `.back` nativo, no estaba en el export manual — casi idéntica a `INGRESO_BONO` con columnas extra (`Nombre Solicitante`, `Nombre_Zona`, `Estado Ticket`). No se usa hoy en el backend. |

## Columnas clave

### `USUARIOS`
```
username        varchar(MAX)   -- login, es un email
password        varchar(MAX)   -- HASH sha256-like (64 chars) en 258 filas, vacio en 15
nombre_completo varchar(MAX)
rut             varchar(30)    -- ⚠️ NO es siempre un RUT chileno formateado. Mezcla:
                                --   - RUTs reales: "15923547-5"
                                --   - códigos internos cortos: "104", "67", "211"
                                --   - PUEDE REPETIRSE entre distintas filas (no es unico)
perfil          int            -- rol (valores vistos: 0, 1, 2, 4)
zonas           varchar(MAX)   -- CSV de ID_ZONA, ej "4,10". Vacio = sin restriccion (ve todas)
empresas        varchar(50)    -- CSV de ID_EMPRESA, ej "1,2". Vacio = sin restriccion
ESTADO          int            -- 1=activo (222 filas), 0=inactivo (51 filas)
SUPERBONO       int            -- flag, mayoria 0
```

### `INGRESO_BONO` (la tabla central)
```
ID_BONO             int          -- NOT NULL, sin PK real
FECHA_CREACION      date
SOLICITANTE         varchar(MAX) -- ⚠️ NO es un nombre, es el "rut" de USUARIOS (mismo quirk de arriba)
RUT                 varchar(30)  -- este SÍ es el RUT del BENEFICIARIO del bono (persona que lo recibe)
NOMBRE_COMPLETO     varchar(MAX) -- nombre del beneficiario
CODIGO_INSTALACION  varchar(50)
INSTALACION         varchar(MAX)
CONTRATO            varchar(MAX)
SERVICIO            varchar(MAX)
CONCEPTO_BONO       varchar(MAX) -- tipo de bono (ej "Bono Cliente Facturable")
MONTO               int
FECHA_DESDE/HASTA   date
JUSTIFICACION_BONO  varchar(MAX)
ANEXO1/2/3          varchar(MAX) -- nombres de archivo adjuntos
ESTADO              int          -- FK logica a OPCIONES_ESTADO.ID
DIRECTO_INDIRECTO   varchar(MAX)
id_zona             int          -- FK logica a ZONAS.ID_ZONA
ID_EMPRESA          int          -- FK logica a EMPRESAS.ID_EMPRESA
ANEXO_FIRMADO       varchar(MAX)
FECHA_CIERRE        date         -- fecha en que quedo TERMINADO
SUPERBONO           int
DIAS                varchar(MAX)
ID_DOC_TALANA       varchar(MAX) -- si no es NULL, el bono entro al flujo de firma Talana
FIRMADO_TALANA      int          -- 1=firmado, 0=pendiente
FECHA_FIRMA_TALANA  varchar(50)
LOG_TALANA          varchar(MAX) -- ⚠️ texto libre acumulado, puede pesar decenas de KB por fila,
                                  --    y contiene retornos de carro sueltos (\r) sin \n —
                                  --    ver nota de "Migraciones" mas abajo
```

### `VALIDACION_BONO` (1:1 logico con INGRESO_BONO por ID_BONO)
```
ID_BONO           int
VALIDADOR1        int          -- 0/1, aprobo o no el primer validador
USER_VALIDADOR1   varchar(MAX) -- el "rut" (USUARIOS.rut) de quien valido en el paso 1
VALIDADOR2        int          -- 0/1, aprobo o no el segundo validador
USER_VALIDADOR2   varchar(MAX) -- el "rut" de quien valido en el paso 2
ESTADO            int          -- FK logica a OPCIONES_ESTADO.ID (estado final del bono)
MOTIVO_RECHAZO    varchar(MAX) -- solo si ESTADO=0
```

### Catálogos pequeños
- `EMPRESAS`: ID_EMPRESA, NOMBRE_EMPRESA, BD, RUT, NOMBRE_DYNAMICS (6 filas: Eulen Seguridad, Eulen Chile, Grupo Eulen Chile, Instituto Eulen Capacitación, Eulen Sociosanitarios, Empresa Serv. Transitorios)
- `ZONAS`: ID_ZONA, NOMBRE_ZONA, monto_asignado, DIRECCION, CIUDAD (9 filas: ZONA I a VI, ZONA RM, CENTRAL, ZONA MAGALLANES)
- `OPCIONES_ESTADO`: ID, ESTADO (0=RECHAZADO, 1=VALIDADO, 2=PENDIENTE, 3=TERMINADO)
- `DASHBOARDS` / `PERFIL_DASHBOARD`: catálogo de tarjetas de dashboard por perfil — **esta sí tiene una FK real** (se comprobó al intentar insertar sin `IDENTITY_INSERT` y al borrar con conflicto de FK)

## El quirk del "RUT" (importante para cualquier query nueva)

`USUARIOS.rut`, `INGRESO_BONO.SOLICITANTE`, `VALIDACION_BONO.USER_VALIDADOR1/2` **comparten el mismo espacio de valores**, pero ese valor **no siempre es un RUT chileno real**. Es una mezcla histórica de:
1. RUTs reales con formato `12345678-9`
2. Códigos internos cortos tipo `"104"`, `"67"`, `"211"` (probablemente IDs de un sistema anterior)

Al cruzar por esta columna (como ya hacía el código original en `bonos-top` y `ranking-validadores`, y como hacen ahora los 7 endpoints de "Mi Info"), **puede haber más de una fila de `USUARIOS` con el mismo `rut`** — hay que deduplicar con `ROW_NUMBER() OVER (PARTITION BY rut ORDER BY username)` al hacer JOIN, si no se pueden duplicar filas en el resultado (patrón ya aplicado en `dashboard.py`: CTE `NombreUnico`).

## Migraciones (`dashboard-backend/migrations/`)

- `Sistema_Bonos_export.sql` — export completo en texto plano (285 MB), fuente original
- `export_chunks/00_ORDEN_DE_EJECUCION.txt` — orden exacto para ejecutar todo
- `export_chunks/01_schema_y_tablas_chicas.sql` — `CREATE DATABASE` (si no existe) + todos los `CREATE TABLE` + tablas chicas con datos
- `export_chunks/02_PERSONAS_CARGA.sql`, `03_VALIDACION_BONO.sql`, `04_HISTORICO_JUSTTIME.sql` — un archivo por tabla
- `export_chunks/05_INGRESO_BONO_part001.sql` … `part623.sql` — **623 archivos**, cada uno un `INSERT` completo y autocontenido (~400 KB c/u, hasta 2.3 MB en filas con `LOG_TALANA` gigante)

⚠️ Por qué son 623 y no menos: `LOG_TALANA` acumula texto de reintentos de firma con **retornos de carro (`\r`) sueltos sin `\n`** — cualquier división por líneas corta las filas a la mitad. `split_ingreso_bono.js` (en la misma carpeta) hace la división correcta: escanea caracter por caracter respetando comillas y paréntesis, nunca por líneas.

Para reconstruir la base desde cero: ejecutar los archivos de `export_chunks/` en el orden de `00_ORDEN_DE_EJECUCION.txt`, en un servidor SQL Server (cualquier versión moderna, no depende de version como el `.bak`).
