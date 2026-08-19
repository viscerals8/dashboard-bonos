import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

_db_port = os.environ.get("DB_PORT")
_host = f"{os.environ['DB_HOST']},{_db_port}" if _db_port else os.environ["DB_HOST"]

DATABASE_URL = (
    f"mssql+pyodbc://{os.environ['DB_USER']}:{os.environ['DB_PASSWORD']}"
    f"@{_host}/{os.environ['DB_NAME']}"
    "?driver=ODBC+Driver+17+for+SQL+Server"
    "&Encrypt=yes&TrustServerCertificate=yes"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)
