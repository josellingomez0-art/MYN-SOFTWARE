const pool = require("../config/database");

function crearError(
    mensaje,
    status = 400
) {
    const error = new Error(mensaje);

    error.status = status;

    return error;
}

async function obtenerProveedores({
    buscar = "",
    estado = "todos"
} = {}) {
    const filtros = [];
    const valores = [];

    if (buscar) {
        const termino = `%${buscar}%`;

        filtros.push(`
            (
                pr.nit LIKE ?
                OR pr.razon_social LIKE ?
                OR pr.contacto LIKE ?
                OR pr.telefono LIKE ?
                OR pr.correo LIKE ?
                OR pr.ciudad LIKE ?
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
            "pr.estado = TRUE"
        );
    }

    if (estado === "inactivos") {
        filtros.push(
            "pr.estado = FALSE"
        );
    }

    const where = filtros.length
        ? `WHERE ${filtros.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
        `
        SELECT
            pr.id,
            pr.nit,
            pr.razon_social,
            pr.contacto,
            pr.telefono,
            pr.correo,
            pr.direccion,
            pr.ciudad,
            pr.estado,

            COUNT(
                DISTINCT p.id
            ) AS cantidad_productos,

            COUNT(
                DISTINCT c.id
            ) AS cantidad_compras,

            COALESCE(
                SUM(
                    CASE
                        WHEN c.estado <> 'ANULADA'
                            THEN c.total
                        ELSE 0
                    END
                ),
                0
            ) AS total_comprado,

            MAX(
                CASE
                    WHEN c.estado <> 'ANULADA'
                        THEN c.fecha
                    ELSE NULL
                END
            ) AS ultima_compra

        FROM proveedores pr

        LEFT JOIN productos p
            ON p.id_proveedor = pr.id

        LEFT JOIN compras c
            ON c.id_proveedor = pr.id

        ${where}

        GROUP BY
            pr.id,
            pr.nit,
            pr.razon_social,
            pr.contacto,
            pr.telefono,
            pr.correo,
            pr.direccion,
            pr.ciudad,
            pr.estado

        ORDER BY
            pr.razon_social,
            pr.id
        `,
        valores
    );

    return rows;
}

async function obtenerProveedorPorId(
    id,
    conexion = pool
) {
    const [rows] = await conexion.query(
        `
        SELECT
            pr.id,
            pr.nit,
            pr.razon_social,
            pr.contacto,
            pr.telefono,
            pr.correo,
            pr.direccion,
            pr.ciudad,
            pr.estado,

            COUNT(
                DISTINCT p.id
            ) AS cantidad_productos,

            COUNT(
                DISTINCT c.id
            ) AS cantidad_compras,

            COALESCE(
                SUM(
                    CASE
                        WHEN c.estado <> 'ANULADA'
                            THEN c.total
                        ELSE 0
                    END
                ),
                0
            ) AS total_comprado,

            MAX(
                CASE
                    WHEN c.estado <> 'ANULADA'
                        THEN c.fecha
                    ELSE NULL
                END
            ) AS ultima_compra

        FROM proveedores pr

        LEFT JOIN productos p
            ON p.id_proveedor = pr.id

        LEFT JOIN compras c
            ON c.id_proveedor = pr.id

        WHERE pr.id = ?

        GROUP BY
            pr.id,
            pr.nit,
            pr.razon_social,
            pr.contacto,
            pr.telefono,
            pr.correo,
            pr.direccion,
            pr.ciudad,
            pr.estado

        LIMIT 1
        `,
        [id]
    );

    return rows[0] || null;
}

async function existeNit(
    nit,
    excluirId = null,
    conexion = pool
) {
    if (!nit) {
        return false;
    }

    let sql = `
        SELECT id
        FROM proveedores
        WHERE nit = ?
    `;

    const valores = [nit];

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

async function crearProveedor(datos) {
    if (
        await existeNit(
            datos.nit
        )
    ) {
        throw crearError(
            "Ya existe un proveedor con ese NIT",
            409
        );
    }

    const [resultado] = await pool.query(
        `
        INSERT INTO proveedores (
            nit,
            razon_social,
            contacto,
            telefono,
            correo,
            direccion,
            ciudad,
            estado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
        `,
        [
            datos.nit,
            datos.razon_social,
            datos.contacto,
            datos.telefono,
            datos.correo,
            datos.direccion,
            datos.ciudad
        ]
    );

    return await obtenerProveedorPorId(
        resultado.insertId
    );
}

async function actualizarProveedor(
    id,
    datos
) {
    const proveedor =
        await obtenerProveedorPorId(id);

    if (!proveedor) {
        throw crearError(
            "Proveedor no encontrado",
            404
        );
    }

    if (
        await existeNit(
            datos.nit,
            id
        )
    ) {
        throw crearError(
            "Ya existe otro proveedor con ese NIT",
            409
        );
    }

    await pool.query(
        `
        UPDATE proveedores
        SET
            nit = ?,
            razon_social = ?,
            contacto = ?,
            telefono = ?,
            correo = ?,
            direccion = ?,
            ciudad = ?,
            estado = ?
        WHERE id = ?
        `,
        [
            datos.nit,
            datos.razon_social,
            datos.contacto,
            datos.telefono,
            datos.correo,
            datos.direccion,
            datos.ciudad,
            datos.estado,
            id
        ]
    );

    return await obtenerProveedorPorId(id);
}

async function cambiarEstadoProveedor(
    id,
    estado
) {
    const [resultado] = await pool.query(
        `
        UPDATE proveedores
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

async function obtenerHistorialProveedor(
    idProveedor
) {
    const proveedor =
        await obtenerProveedorPorId(
            idProveedor
        );

    if (!proveedor) {
        throw crearError(
            "Proveedor no encontrado",
            404
        );
    }

    const [compras] = await pool.query(
        `
        SELECT
            c.id,
            c.numero,
            c.factura_proveedor,
            c.fecha,
            c.subtotal,
            c.descuento,
            c.iva,
            c.total,
            c.forma_pago,
            c.fecha_vencimiento,
            c.saldo_pendiente,
            c.estado,

            CONCAT(
                u.nombres,
                ' ',
                u.apellidos
            ) AS usuario,

            COUNT(dc.id) AS productos,

            COALESCE(
                SUM(dc.cantidad),
                0
            ) AS unidades

        FROM compras c

        INNER JOIN usuarios u
            ON u.id = c.id_usuario

        LEFT JOIN detalle_compras dc
            ON dc.id_compra = c.id

        WHERE c.id_proveedor = ?

        GROUP BY
            c.id,
            c.numero,
            c.factura_proveedor,
            c.fecha,
            c.subtotal,
            c.descuento,
            c.iva,
            c.total,
            c.forma_pago,
            c.fecha_vencimiento,
            c.saldo_pendiente,
            c.estado,
            u.nombres,
            u.apellidos

        ORDER BY
            c.fecha DESC,
            c.id DESC
        `,
        [idProveedor]
    );

    const [productos] = await pool.query(
        `
        SELECT
            p.id,
            p.codigo,
            p.nombre,
            p.marca,
            p.costo,
            p.precio,
            p.estado,

            COALESCE(
                i.stock_actual,
                0
            ) AS stock_actual

        FROM productos p

        LEFT JOIN inventario i
            ON i.id_producto = p.id

        WHERE p.id_proveedor = ?

        ORDER BY p.nombre
        `,
        [idProveedor]
    );

    return {
        proveedor,
        compras,
        productos
    };
}

async function obtenerEstadisticas() {
    const [rows] = await pool.query(
        `
        SELECT
            COUNT(*) AS total_proveedores,

            SUM(
                CASE
                    WHEN estado = TRUE
                        THEN 1
                    ELSE 0
                END
            ) AS proveedores_activos,

            SUM(
                CASE
                    WHEN estado = FALSE
                        THEN 1
                    ELSE 0
                END
            ) AS proveedores_inactivos,

            (
                SELECT
                    COALESCE(
                        SUM(c.total),
                        0
                    )
                FROM compras c
                WHERE c.estado <> 'ANULADA'
            ) AS total_compras
        FROM proveedores
        `
    );

    return rows[0];
}

module.exports = {
    obtenerProveedores,
    obtenerProveedorPorId,
    crearProveedor,
    actualizarProveedor,
    cambiarEstadoProveedor,
    obtenerHistorialProveedor,
    obtenerEstadisticas
};