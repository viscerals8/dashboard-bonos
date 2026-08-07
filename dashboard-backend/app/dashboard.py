from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import bindparam, text
from app.database import engine
from app.security import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"]
)


def _account_scope(current_user: dict) -> tuple[list[int], list[int]]:
    return current_user.get("empresas") or [], current_user.get("zonas") or []


def _current_rut(current_user: dict) -> str:
    rut = current_user.get("rut")
    if not rut:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tu usuario no tiene un RUT asociado",
        )
    return rut


def _run_scoped_query(sql_template: str, empresa_col: str, zona_col: str, current_user: dict):
    empresas, zonas = _account_scope(current_user)

    conditions = []
    if empresas:
        conditions.append(f"{empresa_col} IN :empresas")
    if zonas:
        conditions.append(f"{zona_col} IN :zonas")
    extra_where = (" AND " + " AND ".join(conditions)) if conditions else ""

    query = text(sql_template.format(extra_where=extra_where))
    bind_list = []
    if empresas:
        bind_list.append(bindparam("empresas", expanding=True))
    if zonas:
        bind_list.append(bindparam("zonas", expanding=True))
    if bind_list:
        query = query.bindparams(*bind_list)

    params = {}
    if empresas:
        params["empresas"] = empresas
    if zonas:
        params["zonas"] = zonas

    with engine.connect() as conn:
        return conn.execute(query, params).mappings().all()


@router.get("/test")
def test_dashboard():
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT 1 AS ok")
        ).mappings().first()

    return result


@router.get("/bonos-top")
def bonos_top(current_user: dict = Depends(get_current_user)):
    sql_template = """
        WITH BonosPagados AS (
            SELECT
                ib.SOLICITANTE,
                ib.id_zona,
                ib.ID_EMPRESA,
                YEAR(ib.FECHA_CIERRE) AS anio,
                MONTH(ib.FECHA_CIERRE) AS mes,
                CASE
                    WHEN MONTH(ib.FECHA_CIERRE) BETWEEN 1 AND 6 THEN 1
                    ELSE 2
                END AS semestre,
                COUNT(*) AS total_bonos,
                SUM(ib.MONTO) AS total_monto
            FROM INGRESO_BONO ib
            WHERE ib.ESTADO = 3
              AND ib.FECHA_CIERRE IS NOT NULL
            GROUP BY
                ib.SOLICITANTE,
                ib.id_zona,
                ib.ID_EMPRESA,
                YEAR(ib.FECHA_CIERRE),
                MONTH(ib.FECHA_CIERRE)
        ),
        Ranking AS (
            SELECT *,
                   ROW_NUMBER() OVER (
                       PARTITION BY id_zona, ID_EMPRESA, anio, mes
                       ORDER BY total_monto DESC
                   ) AS rn
            FROM BonosPagados
        ),
        NombreUnico AS (
            SELECT rut, nombre_completo,
                   ROW_NUMBER() OVER (PARTITION BY rut ORDER BY username) AS rn
            FROM USUARIOS
        )
        SELECT
            r.anio,
            r.mes,
            r.semestre,
            z.NOMBRE_ZONA,
            e.NOMBRE_EMPRESA,
            u.nombre_completo AS trabajador,
            r.total_bonos,
            r.total_monto
        FROM Ranking r
        JOIN NombreUnico u ON u.rut = r.SOLICITANTE AND u.rn = 1
        JOIN ZONAS z ON z.ID_ZONA = r.id_zona
        JOIN EMPRESAS e ON e.ID_EMPRESA = r.ID_EMPRESA
        WHERE r.rn = 1{extra_where}
        ORDER BY
            r.anio,
            r.mes,
            z.NOMBRE_ZONA,
            e.NOMBRE_EMPRESA
    """

    return _run_scoped_query(sql_template, "r.ID_EMPRESA", "r.id_zona", current_user)


@router.get("/embudo-aprobacion")
def embudo_aprobacion(current_user: dict = Depends(get_current_user)):
    sql_template = """
        SELECT
            oe.ID AS estado_id,
            oe.ESTADO AS estado_nombre,
            COUNT(*) AS total_bonos,
            SUM(ib.MONTO) AS total_monto
        FROM INGRESO_BONO ib
        JOIN OPCIONES_ESTADO oe ON oe.ID = ib.ESTADO
        WHERE 1 = 1{extra_where}
        GROUP BY oe.ID, oe.ESTADO
        ORDER BY oe.ID
    """

    return _run_scoped_query(sql_template, "ib.ID_EMPRESA", "ib.id_zona", current_user)


@router.get("/monto-mensual")
def monto_mensual(current_user: dict = Depends(get_current_user)):
    sql_template = """
        SELECT
            YEAR(ib.FECHA_CIERRE) AS anio,
            MONTH(ib.FECHA_CIERRE) AS mes,
            COUNT(*) AS total_bonos,
            SUM(ib.MONTO) AS total_monto
        FROM INGRESO_BONO ib
        WHERE ib.FECHA_CIERRE IS NOT NULL{extra_where}
        GROUP BY YEAR(ib.FECHA_CIERRE), MONTH(ib.FECHA_CIERRE)
        ORDER BY anio, mes
    """

    return _run_scoped_query(sql_template, "ib.ID_EMPRESA", "ib.id_zona", current_user)


@router.get("/por-zona")
def por_zona(current_user: dict = Depends(get_current_user)):
    sql_template = """
        SELECT
            z.NOMBRE_ZONA,
            COUNT(*) AS total_bonos,
            SUM(ib.MONTO) AS total_monto
        FROM INGRESO_BONO ib
        JOIN ZONAS z ON z.ID_ZONA = ib.id_zona
        WHERE 1 = 1{extra_where}
        GROUP BY z.NOMBRE_ZONA
        ORDER BY total_monto DESC
    """

    return _run_scoped_query(sql_template, "ib.ID_EMPRESA", "ib.id_zona", current_user)


@router.get("/por-empresa")
def por_empresa(current_user: dict = Depends(get_current_user)):
    sql_template = """
        SELECT
            e.NOMBRE_EMPRESA,
            COUNT(*) AS total_bonos,
            SUM(ib.MONTO) AS total_monto
        FROM INGRESO_BONO ib
        JOIN EMPRESAS e ON e.ID_EMPRESA = ib.ID_EMPRESA
        WHERE 1 = 1{extra_where}
        GROUP BY e.NOMBRE_EMPRESA
        ORDER BY total_monto DESC
    """

    return _run_scoped_query(sql_template, "ib.ID_EMPRESA", "ib.id_zona", current_user)


@router.get("/por-concepto")
def por_concepto(current_user: dict = Depends(get_current_user)):
    sql_template = """
        SELECT
            ib.CONCEPTO_BONO AS concepto,
            COUNT(*) AS total_bonos,
            SUM(ib.MONTO) AS total_monto
        FROM INGRESO_BONO ib
        WHERE ib.CONCEPTO_BONO IS NOT NULL{extra_where}
        GROUP BY ib.CONCEPTO_BONO
        ORDER BY total_monto DESC
    """

    return _run_scoped_query(sql_template, "ib.ID_EMPRESA", "ib.id_zona", current_user)


@router.get("/superbono")
def superbono(current_user: dict = Depends(get_current_user)):
    sql_template = """
        SELECT
            CASE WHEN ib.SUPERBONO = 1 THEN 'Superbono' ELSE 'Normal' END AS tipo,
            COUNT(*) AS total_bonos,
            SUM(ib.MONTO) AS total_monto
        FROM INGRESO_BONO ib
        WHERE 1 = 1{extra_where}
        GROUP BY CASE WHEN ib.SUPERBONO = 1 THEN 'Superbono' ELSE 'Normal' END
    """

    return _run_scoped_query(sql_template, "ib.ID_EMPRESA", "ib.id_zona", current_user)


@router.get("/tiempo-aprobacion")
def tiempo_aprobacion(current_user: dict = Depends(get_current_user)):
    sql_template = """
        SELECT
            YEAR(ib.FECHA_CIERRE) AS anio,
            MONTH(ib.FECHA_CIERRE) AS mes,
            AVG(CAST(DATEDIFF(day, ib.FECHA_CREACION, ib.FECHA_CIERRE) AS float)) AS promedio_dias,
            COUNT(*) AS total_bonos
        FROM INGRESO_BONO ib
        WHERE ib.FECHA_CIERRE IS NOT NULL
          AND ib.FECHA_CREACION IS NOT NULL{extra_where}
        GROUP BY YEAR(ib.FECHA_CIERRE), MONTH(ib.FECHA_CIERRE)
        ORDER BY anio, mes
    """

    return _run_scoped_query(sql_template, "ib.ID_EMPRESA", "ib.id_zona", current_user)


@router.get("/motivos-rechazo")
def motivos_rechazo(current_user: dict = Depends(get_current_user)):
    sql_template = """
        SELECT
            ISNULL(NULLIF(LTRIM(RTRIM(vb.MOTIVO_RECHAZO)), ''), 'Sin especificar') AS motivo,
            COUNT(*) AS total_bonos
        FROM VALIDACION_BONO vb
        JOIN INGRESO_BONO ib ON ib.ID_BONO = vb.ID_BONO
        WHERE vb.ESTADO = 0{extra_where}
        GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(vb.MOTIVO_RECHAZO)), ''), 'Sin especificar')
        ORDER BY total_bonos DESC
    """

    return _run_scoped_query(sql_template, "ib.ID_EMPRESA", "ib.id_zona", current_user)


@router.get("/firma-talana")
def firma_talana(current_user: dict = Depends(get_current_user)):
    sql_template = """
        SELECT
            CASE WHEN ib.FIRMADO_TALANA = 1 THEN 'Firmado' ELSE 'Pendiente' END AS estado_firma,
            COUNT(*) AS total_bonos
        FROM INGRESO_BONO ib
        WHERE ib.ID_DOC_TALANA IS NOT NULL{extra_where}
        GROUP BY CASE WHEN ib.FIRMADO_TALANA = 1 THEN 'Firmado' ELSE 'Pendiente' END
    """

    return _run_scoped_query(sql_template, "ib.ID_EMPRESA", "ib.id_zona", current_user)


@router.get("/ranking-validadores")
def ranking_validadores(current_user: dict = Depends(get_current_user)):
    sql_template = """
        WITH Validaciones AS (
            SELECT vb.USER_VALIDADOR1 AS validador, ib.ID_EMPRESA, ib.id_zona
            FROM VALIDACION_BONO vb
            JOIN INGRESO_BONO ib ON ib.ID_BONO = vb.ID_BONO
            WHERE vb.USER_VALIDADOR1 IS NOT NULL
            UNION ALL
            SELECT vb.USER_VALIDADOR2 AS validador, ib.ID_EMPRESA, ib.id_zona
            FROM VALIDACION_BONO vb
            JOIN INGRESO_BONO ib ON ib.ID_BONO = vb.ID_BONO
            WHERE vb.USER_VALIDADOR2 IS NOT NULL
        ),
        NombreUnico AS (
            SELECT rut, nombre_completo,
                   ROW_NUMBER() OVER (PARTITION BY rut ORDER BY username) AS rn
            FROM USUARIOS
        )
        SELECT
            ISNULL(u.nombre_completo, v.validador) AS validador,
            COUNT(*) AS total_validaciones
        FROM Validaciones v
        LEFT JOIN NombreUnico u ON u.rut = v.validador AND u.rn = 1
        WHERE 1 = 1{extra_where}
        GROUP BY ISNULL(u.nombre_completo, v.validador)
        ORDER BY total_validaciones DESC
    """

    return _run_scoped_query(sql_template, "v.ID_EMPRESA", "v.id_zona", current_user)


@router.get("/mi-perfil")
def mi_perfil(current_user: dict = Depends(get_current_user)):
    query = text("""
        SELECT
            u.nombre_completo,
            u.rut,
            u.perfil,
            u.empresas,
            u.zonas,
            (SELECT STRING_AGG(e.NOMBRE_EMPRESA, ', ')
             FROM EMPRESAS e
             WHERE ',' + u.empresas + ',' LIKE '%,' + CAST(e.ID_EMPRESA AS varchar) + ',%') AS nombres_empresas,
            (SELECT STRING_AGG(z.NOMBRE_ZONA, ', ')
             FROM ZONAS z
             WHERE ',' + u.zonas + ',' LIKE '%,' + CAST(z.ID_ZONA AS varchar) + ',%') AS nombres_zonas
        FROM USUARIOS u
        WHERE u.username = :username
    """)

    with engine.connect() as conn:
        return conn.execute(query, {"username": current_user["sub"]}).mappings().first()


@router.get("/mis-bonos-solicitados")
def mis_bonos_solicitados(current_user: dict = Depends(get_current_user)):
    rut = _current_rut(current_user)
    query = text("""
        SELECT
            oe.ID AS estado_id,
            oe.ESTADO AS estado_nombre,
            COUNT(*) AS total_bonos,
            SUM(ib.MONTO) AS total_monto
        FROM INGRESO_BONO ib
        JOIN OPCIONES_ESTADO oe ON oe.ID = ib.ESTADO
        WHERE ib.SOLICITANTE = :rut
        GROUP BY oe.ID, oe.ESTADO
        ORDER BY oe.ID
    """)

    with engine.connect() as conn:
        return conn.execute(query, {"rut": rut}).mappings().all()


@router.get("/mis-validaciones")
def mis_validaciones(current_user: dict = Depends(get_current_user)):
    rut = _current_rut(current_user)
    query = text("""
        SELECT
            oe.ID AS estado_id,
            oe.ESTADO AS estado_nombre,
            COUNT(*) AS total_bonos
        FROM VALIDACION_BONO vb
        JOIN OPCIONES_ESTADO oe ON oe.ID = vb.ESTADO
        WHERE vb.USER_VALIDADOR1 = :rut OR vb.USER_VALIDADOR2 = :rut
        GROUP BY oe.ID, oe.ESTADO
        ORDER BY oe.ID
    """)

    with engine.connect() as conn:
        return conn.execute(query, {"rut": rut}).mappings().all()


@router.get("/mi-ranking")
def mi_ranking(current_user: dict = Depends(get_current_user)):
    rut = _current_rut(current_user)
    query = text("""
        WITH Totales AS (
            SELECT
                ib.SOLICITANTE,
                COUNT(*) AS total_bonos,
                SUM(ib.MONTO) AS total_monto
            FROM INGRESO_BONO ib
            WHERE ib.ESTADO = 3 AND ib.FECHA_CIERRE IS NOT NULL
            GROUP BY ib.SOLICITANTE
        ),
        Ranking AS (
            SELECT *, ROW_NUMBER() OVER (ORDER BY total_monto DESC) AS puesto
            FROM Totales
        ),
        NombreUnico AS (
            SELECT rut, nombre_completo,
                   ROW_NUMBER() OVER (PARTITION BY rut ORDER BY username) AS rn
            FROM USUARIOS
        )
        SELECT
            r.puesto,
            ISNULL(u.nombre_completo, r.SOLICITANTE) AS trabajador,
            r.total_bonos,
            r.total_monto,
            CASE WHEN r.SOLICITANTE = :rut THEN 1 ELSE 0 END AS es_actual
        FROM Ranking r
        LEFT JOIN NombreUnico u ON u.rut = r.SOLICITANTE AND u.rn = 1
        WHERE r.puesto <= 15 OR r.SOLICITANTE = :rut
        ORDER BY r.puesto
    """)

    with engine.connect() as conn:
        return conn.execute(query, {"rut": rut}).mappings().all()


@router.get("/mi-evolucion")
def mi_evolucion(current_user: dict = Depends(get_current_user)):
    rut = _current_rut(current_user)
    query = text("""
        SELECT
            YEAR(ib.FECHA_CIERRE) AS anio,
            MONTH(ib.FECHA_CIERRE) AS mes,
            COUNT(*) AS total_bonos,
            SUM(ib.MONTO) AS total_monto
        FROM INGRESO_BONO ib
        WHERE ib.SOLICITANTE = :rut AND ib.FECHA_CIERRE IS NOT NULL
        GROUP BY YEAR(ib.FECHA_CIERRE), MONTH(ib.FECHA_CIERRE)
        ORDER BY anio, mes
    """)

    with engine.connect() as conn:
        return conn.execute(query, {"rut": rut}).mappings().all()


@router.get("/mis-rechazos")
def mis_rechazos(current_user: dict = Depends(get_current_user)):
    rut = _current_rut(current_user)
    query = text("""
        SELECT
            ISNULL(NULLIF(LTRIM(RTRIM(vb.MOTIVO_RECHAZO)), ''), 'Sin especificar') AS motivo,
            COUNT(*) AS total_bonos
        FROM VALIDACION_BONO vb
        JOIN INGRESO_BONO ib ON ib.ID_BONO = vb.ID_BONO
        WHERE vb.ESTADO = 0 AND ib.SOLICITANTE = :rut
        GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(vb.MOTIVO_RECHAZO)), ''), 'Sin especificar')
        ORDER BY total_bonos DESC
    """)

    with engine.connect() as conn:
        return conn.execute(query, {"rut": rut}).mappings().all()


@router.get("/mi-tiempo-aprobacion")
def mi_tiempo_aprobacion(current_user: dict = Depends(get_current_user)):
    rut = _current_rut(current_user)
    query = text("""
        SELECT
            YEAR(ib.FECHA_CIERRE) AS anio,
            MONTH(ib.FECHA_CIERRE) AS mes,
            AVG(CAST(DATEDIFF(day, ib.FECHA_CREACION, ib.FECHA_CIERRE) AS float)) AS promedio_dias,
            COUNT(*) AS total_bonos
        FROM VALIDACION_BONO vb
        JOIN INGRESO_BONO ib ON ib.ID_BONO = vb.ID_BONO
        WHERE (vb.USER_VALIDADOR1 = :rut OR vb.USER_VALIDADOR2 = :rut)
          AND ib.FECHA_CIERRE IS NOT NULL AND ib.FECHA_CREACION IS NOT NULL
        GROUP BY YEAR(ib.FECHA_CIERRE), MONTH(ib.FECHA_CIERRE)
        ORDER BY anio, mes
    """)

    with engine.connect() as conn:
        return conn.execute(query, {"rut": rut}).mappings().all()
