import os

# Valores dummy para poder importar app.database/app.security sin un .env real.
# La conexion real a SQL Server nunca se abre en estos tests (se mockea).
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("JWT_SECRET", "test-secret-solo-para-tests-no-usar-en-produccion")
