IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DASHBOARDS')
BEGIN
    CREATE TABLE DASHBOARDS (
        id INT IDENTITY PRIMARY KEY,
        clave VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        descripcion VARCHAR(255) NULL,
        icono VARCHAR(50) NULL
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PERFIL_DASHBOARD')
BEGIN
    CREATE TABLE PERFIL_DASHBOARD (
        perfil INT NOT NULL,
        id_dashboard INT NOT NULL REFERENCES DASHBOARDS(id),
        PRIMARY KEY (perfil, id_dashboard)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM DASHBOARDS WHERE clave = 'top-bonos')
BEGIN
    INSERT INTO DASHBOARDS (clave, nombre, descripcion, icono) VALUES
        ('top-bonos', 'Top 10 Bonos', 'Ranking de bonos pagados por trabajador', 'trophy');
END
GO

IF NOT EXISTS (SELECT 1 FROM DASHBOARDS WHERE clave = 'embudo-aprobacion')
BEGIN
    INSERT INTO DASHBOARDS (clave, nombre, descripcion, icono) VALUES
        ('embudo-aprobacion', 'Embudo de Aprobacion', 'Estado de solicitudes: pendiente, validado, rechazado, terminado', 'funnel');
END
GO

-- Asuncion inicial (a validar/ajustar): todos los perfiles ven ambos dashboards por ahora.
INSERT INTO PERFIL_DASHBOARD (perfil, id_dashboard)
SELECT p.perfil, d.id
FROM (VALUES (0),(1),(2),(4)) AS p(perfil)
CROSS JOIN DASHBOARDS d
WHERE NOT EXISTS (
    SELECT 1 FROM PERFIL_DASHBOARD pd WHERE pd.perfil = p.perfil AND pd.id_dashboard = d.id
);
GO
