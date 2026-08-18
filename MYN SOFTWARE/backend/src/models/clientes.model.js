const pool = require("../config/database");

function crearError(
    mensaje,
    status = 400
) {
    const error = new Error(mensaje);

    error.status = status;

    return error;
}

async function obtenerClientes({
    buscar = "",
    estado = "todos"
} = {}) {
    const filtros = [];
    const valores = [];

    if (buscar) {
        const termino = `%${buscar}%`;

        filtros.push(`
            (
                c.documento LIKE ?
                OR c.nombres LIKE ?
                OR c.apellidos LIKE ?
                OR c.telefono LIKE ?
                OR c.correo LIKE ?
                OR c.ciudad LIKE ?
            )
        `);

        valores.push(
            termino,
            termino,
            termino,
            termino,
            termino,
            termino
        );
    }

    if (estado === "activos") {
        filtros.push(
            "c.estado = TRUE"
        );
    }

    if (estado === "inactivos") {
        filtros.push(
            "c.estado = FALSE"
        );
    }

    const where = filtros.length
        ? `WHERE ${filtros.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
        `
        SELECT
            c.id,
            c.tipo_documento,
            c.documento,
            c.nombres,
            c.apellidos,
            c.telefono,
            c.correo,
            c.direccion,
            c.ciudad,
            c.estado,
            c.created_at,

            CONCAT(
                c.nombres,
                CASE
                    WHEN c.apellidos IS NULL
                      OR TRIM(c.apellidos) = ''
                        THEN ''
                    ELSE CONCAT(' ', c.apellidos)
                END
            ) AS nombre_completo,

            COUNT(v.id) AS cantidad_ventas,

            COALESCE(
                SUM(
                    CASE
                        WHEN v.estado <> 'ANULADA'
                            THEN v.total
                        ELSE 0
                    END
                ),
                0
            ) AS total_comprado,

            MAX(
                CASE
                    WHEN v.estado <> 'ANULADA'
                        THEN v.fecha
                    ELSE NULL
                END
            ) AS ultima_compra

        FROM clientes c

        LEFT JOIN ventas v
            ON v.id_cliente = c.id

        ${where}

        GROUP BY
            c.id,
            c.tipo_documento,
            c.documento,
            c.nombres,
            c.apellidos,
            c.telefono,
            c.correo,
            c.direccion,
            c.ciudad,
            c.estado,
            c.created_at

        ORDER BY
            c.nombres,
            c.apellidos,
            c.id
        `,
        valores
    );

    return rows;
}

async function obtenerClientePorId(
    id,
    conexion = pool
) {
    const [rows] = await conexion.query(
        `
        SELECT
            c.id,
            c.tipo_documento,
            c.documento,
            c.nombres,
            c.apellidos,
            c.telefono,
            c.correo,
            c.direccion,
            c.ciudad,
            c.estado,
            c.created_at,

            CONCAT(
                c.nombres,
                CASE
                    WHEN c.apellidos IS NULL
                      OR TRIM(c.apellidos) = ''
                        THEN ''
                    ELSE CONCAT(' ', c.apellidos)
                END
            ) AS nombre_completo,

            COUNT(v.id) AS cantidad_ventas,

            COALESCE(
                SUM(
                    CASE
                        WHEN v.estado <> 'ANULADA'
                            THEN v.total
                        ELSE 0
                    END
                ),
                0
            ) AS total_comprado,

            MAX(
                CASE
                    WHEN v.estado <> 'ANULADA'
                        THEN v.fecha
                    ELSE NULL
                END
            ) AS ultima_compra

        FROM clientes c

        LEFT JOIN ventas v
            ON v.id_cliente = c.id

        WHERE c.id = ?

        GROUP BY
            c.id,
            c.tipo_documento,
            c.documento,
            c.nombres,
            c.apellidos,
            c.telefono,
            c.correo,
            c.direccion,
            c.ciudad,
            c.estado,
            c.created_at

        LIMIT 1
        `,
        [id]
    );

    return rows[0] || null;
}

async function existeDocumento(
    documento,
    excluirId = null,
    conexion = pool
) {
    if (!documento) {
        return false;
    }

    let sql = `
        SELECT id
        FROM clientes
        WHERE documento = ?
    `;

    const valores = [documento];

    if (excluirId) {
        sql += " AND id <> ?";

        valores.push(excluirId);
    }

    sql += " LIMIT 1";

    const [rows] =
        await conexion.query(
            sql,
            valores
        );

    return rows.length > 0;
}

async function crearCliente(datos) {
    if (
        await existeDocumento(
            datos.documento
        )
    ) {
        throw crearError(
            "Ya existe un cliente con ese documento",
            409
        );
    }

    const [resultado] = await pool.query(
        `
        INSERT INTO clientes (
            tipo_documento,
            documento,
            nombres,
            apellidos,
            telefono,
            correo,
            direccion,
            ciudad,
            estado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `,
        [
            datos.tipo_documento,
            datos.documento,
            datos.nombres,
            datos.apellidos,
            datos.telefono,
            datos.correo,
            datos.direccion,
            datos.ciudad
        ]
    );

    return await obtenerClientePorId(
        resultado.insertId
    );
}

async function actualizarCliente(
    id,
    datos
) {
    const actual =
        await obtenerClientePorId(id);

    if (!actual) {
        throw crearError(
            "Cliente no encontrado",
            404
        );
    }

    if (
        await existeDocumento(
            datos.documento,
            id
        )
    ) {
        throw crearError(
            "Ya existe otro cliente con ese documento",
            409
        );
    }

    await pool.query(
        `
        UPDATE clientes
        SET
            tipo_documento = ?,
            documento = ?,
            nombres = ?,
            apellidos = ?,
            telefono = ?,
            correo = ?,
            direccion = ?,
            ciudad = ?,
            estado = ?
        WHERE id = ?
        `,
        [
            datos.tipo_documento,
            datos.documento,
            datos.nombres,
            datos.apellidos,
            datos.telefono,
            datos.correo,
            datos.direccion,
            datos.ciudad,
            datos.estado,
            id
        ]
    );

    return await obtenerClientePorId(id);
}

async function cambiarEstadoCliente(
    id,
    estado
) {
    const [resultado] = await pool.query(
        `
        UPDATE clientes
        SET estado = ?
        WHERE id = ?
        `,
        [
            estado,
            id
        ]
    );

    return resultado.affectedRows > 0;
}

async function obtenerHistorialCliente(
    idCliente
) {
    const cliente =
        await obtenerClientePorId(
            idCliente
        );

    if (!cliente) {
        throw crearError(
            "Cliente no encontrado",
            404
        );
    }

    const [ventas] = await pool.query(
        `
        SELECT
            v.id,
            v.numero,
            v.fecha,
            v.subtotal,
            v.iva,
            v.descuento,
            v.total,
            v.estado,

            mp.nombre AS metodo_pago,

            CONCAT(
                u.nombres,
                ' ',
                u.apellidos
            ) AS vendedor,

            COUNT(dv.id) AS productos,

            COALESCE(
                SUM(dv.cantidad),
                0
            ) AS unidades

        FROM ventas v

        INNER JOIN usuarios u
            ON u.id = v.id_usuario

        INNER JOIN metodos_pago mp
            ON mp.id = v.id_metodo_pago

        LEFT JOIN detalle_ventas dv
            ON dv.id_venta = v.id

        WHERE v.id_cliente = ?

        GROUP BY
            v.id,
            v.numero,
            v.fecha,
            v.subtotal,
            v.iva,
            v.descuento,
            v.total,
            v.estado,
            mp.nombre,
            u.nombres,
            u.apellidos

        ORDER BY
            v.fecha DESC,
            v.id DESC
        `,
        [idCliente]
    );

    return {
        cliente,
        ventas
    };
}

async function obtenerEstadisticas() {
    const [rows] = await pool.query(
        `
        SELECT
            COUNT(*) AS total_clientes,

            SUM(
                CASE
                    WHEN estado = TRUE
                        THEN 1
                    ELSE 0
                END
            ) AS clientes_activos,

            SUM(
                CASE
                    WHEN estado = FALSE
                        THEN 1
                    ELSE 0
                END
            ) AS clientes_inactivos,

            (
                SELECT
                    COALESCE(
                        SUM(v.total),
                        0
                    )
                FROM ventas v
                WHERE v.id_cliente IS NOT NULL
                  AND v.estado <> 'ANULADA'
            ) AS total_comprado_clientes
        FROM clientes
        `
    );

    return rows[0];
}

module.exports = {
    obtenerClientes,
    obtenerClientePorId,
    crearCliente,
    actualizarCliente,
    cambiarEstadoCliente,
    obtenerHistorialCliente,
    obtenerEstadisticas
};