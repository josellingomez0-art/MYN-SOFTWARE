const pool = require("../config/database");

async function obtenerInventario({
    buscar = "",
    estado = "todos"
} = {}) {
    const filtros = [];
    const valores = [];

    if (buscar) {
        const termino = `%${buscar}%`;

        filtros.push(`
            (
                p.codigo LIKE ?
                OR p.nombre LIKE ?
                OR p.marca LIKE ?
                OR c.nombre LIKE ?
            )
        `);

        valores.push(
            termino,
            termino,
            termino,
            termino
        );
    }

    if (estado === "normal") {
        filtros.push(`
            i.stock_actual > p.stock_minimo
        `);
    }

    if (estado === "bajo") {
        filtros.push(`
            i.stock_actual <= p.stock_minimo
            AND i.stock_actual > 0
        `);
    }

    if (estado === "agotado") {
        filtros.push(`
            i.stock_actual = 0
        `);
    }

    const where = filtros.length
        ? `WHERE ${filtros.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
        `
        SELECT
            i.id,
            i.id_producto,
            p.codigo,
            p.nombre,
            p.marca,
            p.unidad_medida,
            c.nombre AS categoria,

            i.stock_actual,
            i.stock_reservado,

            (
                i.stock_actual -
                i.stock_reservado
            ) AS stock_disponible,

            p.stock_minimo,
            i.ubicacion,
            i.updated_at,

            CASE
                WHEN i.stock_actual = 0
                    THEN 'AGOTADO'

                WHEN i.stock_actual <= p.stock_minimo
                    THEN 'BAJO'

                ELSE 'NORMAL'
            END AS estado_stock

        FROM inventario i

        INNER JOIN productos p
            ON p.id = i.id_producto

        INNER JOIN categorias c
            ON c.id = p.id_categoria

        ${where}

        ORDER BY
            CASE
                WHEN i.stock_actual = 0 THEN 1
                WHEN i.stock_actual <= p.stock_minimo THEN 2
                ELSE 3
            END,
            p.nombre
        `,
        valores
    );

    return rows;
}

async function obtenerInventarioPorProducto(
    idProducto,
    conexion = pool
) {
    const [rows] = await conexion.query(
        `
        SELECT
            i.id,
            i.id_producto,
            i.stock_actual,
            i.stock_reservado,
            i.ubicacion,
            i.updated_at,

            p.codigo,
            p.nombre,
            p.marca,
            p.unidad_medida,
            p.stock_minimo,
            p.estado,

            c.nombre AS categoria,

            (
                i.stock_actual -
                i.stock_reservado
            ) AS stock_disponible

        FROM inventario i

        INNER JOIN productos p
            ON p.id = i.id_producto

        INNER JOIN categorias c
            ON c.id = p.id_categoria

        WHERE i.id_producto = ?

        LIMIT 1
        `,
        [idProducto]
    );

    return rows[0] || null;
}

async function obtenerHistorial({
    idProducto = null,
    limite = 100
} = {}) {
    const filtros = [];
    const valores = [];

    if (idProducto) {
        filtros.push(`
            mi.id_producto = ?
        `);

        valores.push(idProducto);
    }

    const where = filtros.length
        ? `WHERE ${filtros.join(" AND ")}`
        : "";

    valores.push(limite);

    const [rows] = await pool.query(
        `
        SELECT
            mi.id,
            mi.id_producto,
            mi.id_usuario,
            mi.tipo,
            mi.cantidad,
            mi.stock_anterior,
            mi.stock_nuevo,
            mi.motivo,
            mi.ubicacion,
            mi.origen,
            mi.referencia_id,
            mi.created_at,

            p.codigo,
            p.nombre AS producto,

            CONCAT(
                u.nombres,
                ' ',
                u.apellidos
            ) AS usuario

        FROM movimientos_inventario mi

        INNER JOIN productos p
            ON p.id = mi.id_producto

        INNER JOIN usuarios u
            ON u.id = mi.id_usuario

        ${where}

        ORDER BY mi.created_at DESC

        LIMIT ?
        `,
        valores
    );

    return rows;
}

async function ajustarStock({
    idProducto,
    idUsuario,
    tipo,
    cantidad,
    motivo,
    ubicacion
}) {
    const conexion =
        await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const [productos] =
            await conexion.query(
                `
                SELECT
                    p.id,
                    p.codigo,
                    p.nombre,
                    p.estado,
                    i.stock_actual,
                    i.stock_reservado,
                    i.ubicacion
                FROM productos p

                INNER JOIN inventario i
                    ON i.id_producto = p.id

                WHERE p.id = ?

                FOR UPDATE
                `,
                [idProducto]
            );

        if (!productos.length) {
            const error = new Error(
                "El producto no tiene registro de inventario"
            );

            error.status = 404;
            throw error;
        }

        const producto = productos[0];

        if (!producto.estado) {
            const error = new Error(
                "No se puede ajustar un producto inactivo"
            );

            error.status = 400;
            throw error;
        }

        const stockAnterior =
            Number(producto.stock_actual);

        const stockReservado =
            Number(producto.stock_reservado);

        let stockNuevo;

        if (tipo === "ENTRADA") {
            stockNuevo =
                stockAnterior + cantidad;
        } else if (tipo === "SALIDA") {
            stockNuevo =
                stockAnterior - cantidad;
        } else if (tipo === "AJUSTE") {
            stockNuevo = cantidad;
        } else {
            const error = new Error(
                "Tipo de movimiento inválido"
            );

            error.status = 400;
            throw error;
        }

        if (stockNuevo < 0) {
            const error = new Error(
                "El stock no puede quedar en negativo"
            );

            error.status = 400;
            throw error;
        }

        if (stockNuevo < stockReservado) {
            const error = new Error(
                `El stock no puede quedar por debajo de las ${stockReservado} unidades reservadas`
            );

            error.status = 400;
            throw error;
        }

        const nuevaUbicacion =
            ubicacion ||
            producto.ubicacion ||
            null;

        await conexion.query(
            `
            UPDATE inventario
            SET
                stock_actual = ?,
                ubicacion = ?
            WHERE id_producto = ?
            `,
            [
                stockNuevo,
                nuevaUbicacion,
                idProducto
            ]
        );

        await conexion.query(
            `
            INSERT INTO movimientos_inventario (
                id_producto,
                id_usuario,
                tipo,
                cantidad,
                stock_anterior,
                stock_nuevo,
                motivo,
                ubicacion,
                origen
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AJUSTE_MANUAL')
            `,
            [
                idProducto,
                idUsuario,
                tipo,
                cantidad,
                stockAnterior,
                stockNuevo,
                motivo,
                nuevaUbicacion
            ]
        );

        await conexion.commit();

        return await obtenerInventarioPorProducto(
            idProducto
        );
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
}

module.exports = {
    obtenerInventario,
    obtenerInventarioPorProducto,
    obtenerHistorial,
    ajustarStock
};