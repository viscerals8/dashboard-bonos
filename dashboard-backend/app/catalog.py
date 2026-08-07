from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.database import engine
from app.security import get_current_user

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


@router.get("")
def get_dashboards(current_user: dict = Depends(get_current_user)):
    query = text("""
        SELECT d.clave, d.nombre, d.descripcion, d.icono
        FROM PERFIL_DASHBOARD pd
        JOIN DASHBOARDS d ON d.id = pd.id_dashboard
        WHERE pd.perfil = :perfil
        ORDER BY d.nombre
    """)

    with engine.connect() as conn:
        result = conn.execute(query, {"perfil": current_user["perfil"]}).mappings().all()

    return result
