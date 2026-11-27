# Scripts de base de datos

TypeORM se ejecuta con `synchronize: false` y el proyecto no usa migraciones.
Los cambios de esquema se aplican manualmente con scripts versionados.

## Clientes conflictivos (RF32)

Aplica los tipos ENUM, las columnas nuevas de `cliente_conflictivo`, la
columna `reclamo.origen`, la tabla de criterios configurables y el historial
de resoluciones.

```powershell
$env:PGPASSWORD = '<password>'
psql -h localhost -p 5432 -U postgres -d arreglalo_ya_db `
     -f backend/database/2026-11-clientes-conflictivos.sql
```

El script es idempotente y no debe ejecutarse sobre una base remota o de
producción sin autorización.
