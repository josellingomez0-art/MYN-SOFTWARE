/*============================================================
    MYN SOFTWARE
    Script único: crea el primer usuario Administrador.
    Uso (desde la carpeta backend/, con la BD ya creada y el
    archivo .env configurado):

        node scripts/crear_admin.js

    Puedes cambiar los datos de abajo antes de ejecutarlo, o
    pasar el correo y la contraseña por variables de entorno:

        ADMIN_CORREO=otro@correo.com ADMIN_PASSWORD=otraClave node scripts/crear_admin.js
=============================================================*/

require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("../src/config/database");

const CORREO = process.env.ADMIN_CORREO || "administrador@mynsoftware.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const NOMBRES = "Administrador";
const APELLIDOS = "General";

async function crearAdmin() {

    try {

        const [rolesAdmin] = await pool.query(
            "SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1"
        );

        if (rolesAdmin.length === 0) {
            console.error(
                "No existe el rol 'Administrador'. Ejecuta primero 02_datos_iniciales.sql."
            );
            process.exit(1);
        }

        const idRol = rolesAdmin[0].id;

        const [existentes] = await pool.query(
            "SELECT id FROM usuarios WHERE correo = ?",
            [CORREO]
        );

        if (existentes.length > 0) {
            console.log(`Ya existe un usuario con el correo ${CORREO}. No se creó ninguno nuevo.`);
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash(PASSWORD, 10);

        await pool.query(
            `
            INSERT INTO usuarios (id_rol, nombres, apellidos, correo, password, estado)
            VALUES (?, ?, ?, ?, ?, TRUE)
            `,
            [idRol, NOMBRES, APELLIDOS, CORREO, passwordHash]
        );

        console.log("Usuario administrador creado correctamente:");
        console.log(`  Correo:     ${CORREO}`);
        console.log(`  Contraseña: ${PASSWORD}`);
        console.log("Inicia sesión y cambia la contraseña desde el sistema.");

        process.exit(0);

    } catch (error) {

        console.error("Error creando el usuario administrador:", error);
        process.exit(1);

    }

}

crearAdmin();
