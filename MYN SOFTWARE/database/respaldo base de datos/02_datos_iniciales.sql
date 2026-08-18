/*============================================================
    MYN SOFTWARE
    Datos iniciales complementarios
    Ejecutar DESPUÉS de 01_crear_bd.sql
    (roles, métodos de pago, caja principal, configuración y
    empresa ya se siembran dentro de 01_crear_bd.sql; aquí solo
    va lo que falta)
=============================================================*/

USE mynsoftware;

-- Categoría de ejemplo para poder crear productos de inmediato
INSERT INTO categorias (nombre, descripcion) VALUES
('General', 'Categoría por defecto');

-- NOTA: la tabla "usuarios" NO se siembra aquí porque la contraseña debe
-- quedar guardada como hash de bcrypt, no como texto plano.
-- Para crear el primer usuario administrador, ejecuta una sola vez,
-- desde la carpeta backend/ y con la base de datos ya creada:
--
--     node scripts/crear_admin.js
--
-- Esto crea el usuario administrador@mynsoftware.com / admin123
-- (cambia la contraseña desde el sistema después del primer ingreso).
