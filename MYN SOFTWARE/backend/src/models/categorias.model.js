const pool = require("../config/database");

async function obtenerCategorias() {

    const [rows] = await pool.query(`
        SELECT *
        FROM categorias
        ORDER BY nombre;
    `);

    return rows;
}

async function obtenerCategoriaPorId(id) {

    const [rows] = await pool.query(
        `SELECT * FROM categorias WHERE id = ?`,
        [id]
    );

    return rows[0];
}

async function crearCategoria(datos) {

    const {
        nombre,
        descripcion
    } = datos;

    const [resultado] = await pool.query(
        `
        INSERT INTO categorias
        (
            nombre,
            descripcion
        )
        VALUES
        (?, ?)
        `,
        [
            nombre,
            descripcion
        ]
    );

    return resultado;
}

async function actualizarCategoria(id, datos) {

    const {
        nombre,
        descripcion,
        estado
    } = datos;

    const [resultado] = await pool.query(
        `
        UPDATE categorias
        SET
            nombre=?,
            descripcion=?,
            estado=?
        WHERE id=?
        `,
        [
            nombre,
            descripcion,
            estado,
            id
        ]
    );

    return resultado;
}

async function eliminarCategoria(id) {

    const [resultado] = await pool.query(
        "DELETE FROM categorias WHERE id=?",
        [id]
    );

    return resultado;
}

module.exports = {

    obtenerCategorias,
    obtenerCategoriaPorId,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria

};