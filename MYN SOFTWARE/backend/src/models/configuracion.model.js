const pool = require("../config/database");

/*
|--------------------------------------------------------------------------
| Consultar configuración
|--------------------------------------------------------------------------
*/

async function obtenerConfiguracion(
    conexion = pool
) {
    const [rows] =
        await conexion.query(
            `
            SELECT
                id,
                iva,
                moneda,
                simbolo,
                impresora
            FROM configuracion
            ORDER BY id
            LIMIT 1
            `
        );

    return rows[0] || null;
}

/*
|--------------------------------------------------------------------------
| Guardar configuración
|--------------------------------------------------------------------------
*/

async function guardarConfiguracion(
    datos
) {
    const conexion =
        await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const configuracionActual =
            await obtenerConfiguracion(
                conexion
            );

        if (!configuracionActual) {
            const [resultado] =
                await conexion.query(
                    `
                    INSERT INTO configuracion (
                        iva,
                        moneda,
                        simbolo,
                        impresora
                    )
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        datos.iva,
                        datos.moneda,
                        datos.simbolo,
                        datos.impresora
                    ]
                );

            await conexion.commit();

            return await obtenerConfiguracion();
        }

        await conexion.query(
            `
            UPDATE configuracion
            SET
                iva = ?,
                moneda = ?,
                simbolo = ?,
                impresora = ?
            WHERE id = ?
            `,
            [
                datos.iva,
                datos.moneda,
                datos.simbolo,
                datos.impresora,
                configuracionActual.id
            ]
        );

        await conexion.commit();

        return await obtenerConfiguracion();
    } catch (error) {
        await conexion.rollback();

        throw error;
    } finally {
        conexion.release();
    }
}

module.exports = {
    obtenerConfiguracion,
    guardarConfiguracion
};