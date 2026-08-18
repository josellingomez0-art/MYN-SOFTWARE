const pool = require("../config/database");

async function obtenerMetodosPago() {

    const [rows] = await pool.query(
        "SELECT * FROM metodos_pago WHERE estado = TRUE ORDER BY nombre"
    );

    return rows;

}

module.exports = {
    obtenerMetodosPago
};
