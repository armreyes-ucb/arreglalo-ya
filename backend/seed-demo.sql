-- Seed para demostración en vivo (día de la defensa)
-- Ejecutar SOLO si se necesita promover usuarios existentes a roles de demo.
-- NO modifica la estructura de las 17 tablas existentes.

-- 1. Promover un usuario registrado a SUPERADMIN
-- Reemplazar 'email@demo.com' por el email real del usuario ya registrado.
/*
UPDATE usuario
SET rol = 'SUPERADMIN'
WHERE email = 'email@demo.com';
*/

-- 2. Promover un usuario registrado a SUPERVISOR
-- Reemplazar 'supervisor@demo.com' por el email real del usuario ya registrado.
/*
UPDATE usuario
SET rol = 'SUPERVISOR'
WHERE email = 'supervisor@demo.com';
*/

-- 3. (Opcional) Si se quiere crear un usuario SUPERADMIN desde cero
-- (requiere que exista el hash de contraseña correspondiente).
/*
INSERT INTO usuario (email, password_hash, nombre_completo, telefono, rol, creado_en, actualizado_en)
VALUES ('admin@demo.com', '$2b$10$hash_bcrypt_aqui', 'Admin Demo', '+59170000000', 'SUPERADMIN', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET rol = 'SUPERADMIN';
*/

-- 4. (Opcional) Crear un usuario SUPERVISOR desde cero
/*
INSERT INTO usuario (email, password_hash, nombre_completo, telefono, rol, creado_en, actualizado_en)
VALUES ('supervisor@demo.com', '$2b$10$hash_bcrypt_aqui', 'Supervisor Demo', '+59170000001', 'SUPERVISOR', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET rol = 'SUPERVISOR';
*/

-- Nota: Los hashes de contraseña deben generarse con bcrypt (costo 10).
-- Ejemplo en Node.js: require('bcrypt').hashSync('password123', 10)