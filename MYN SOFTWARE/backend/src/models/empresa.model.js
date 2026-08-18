const pool = require("../config/database");

async function obtenerEmpresa() {

    const [rows] = await pool.query(
        "SELECT * FROM empresa ORDER BY id LIMIT 1"
    );

    return rows[0] || null;

}

async function guardarEmpresa(datos) {

    const {
        nit,
        nombre,
        propietario,
        direccion,
        telefono,
        correo,
        ciudad,
        logo
    } = datos;

    const existente = await obtenerEmpresa();

    if (!existente) {

        const [resultado] = await pool.query(
            `
            INSERT INTO empresa
            (nit, nombre, propietario, direccion, telefono, correo, ciudad, logo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [nit, nombre, propietario, direccion, telefono, correo, ciudad, logo || null]
        );

        return { id: resultado.insertId };

    }

    await pool.query(
        `
        UPDATE empresa
        SET nit=?, nombre=?, propietario=?, direccion=?, telefono=?, correo=?, ciudad=?, logo=?
        WHERE id=?
        `,
        [nit, nombre, propietario, direccion, telefono, correo, ciudad, logo || existente.logo, existente.id]
    );

    return { id: existente.id };

}

module.exports = {
    obtenerEmpresa,
    guardarEmpresa
};
