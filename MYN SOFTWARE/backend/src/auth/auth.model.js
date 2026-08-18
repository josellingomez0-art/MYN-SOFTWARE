const pool = require("../config/database");

async function buscarPorCorreo(correo) {

    const [rows] = await pool.query(
        `
        SELECT u.*, r.nombre AS rol_nombre
        FROM usuarios u
        INNER JOIN roles r ON u.id_rol = r.id
        WHERE u.correo = ?
        LIMIT 1
        `,
        [correo]
    );

    return rows[0];

}

module.exports = {
    buscarPorCorreo
};