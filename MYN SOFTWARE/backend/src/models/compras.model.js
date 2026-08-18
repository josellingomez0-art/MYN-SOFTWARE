const pool = require("../config/database");

function crearError(
    mensaje,
    status = 400
) {
    const error = new Error(mensaje);
    error.status = status;

    return error;
}

function redondear(valor) {
    return Math.round(
        (Number(valor) + Number.EPSILON) * 100
    ) / 100;
}

async function obtenerCompraPorId(
    id,
    conexion = pool
) {
    const [compras] = await conexion.query(
        `
        SELECT
            c.id,
            c.numero,
            c.factura_proveedor,
            c.id_proveedor,
            c.id_usuario,
            c.fecha,
            c.subtotal,
            c.descuento,
            c.iva,
            c.total,
            c.forma_pago,
            c.fecha_vencimiento,
            c.saldo_pendiente,
            c.observaciones,
            c.estado,
            c.id_usuario_anulacion,
            c.fecha_anulacion,
            c.created_at,

            pr.nit AS proveedor_nit,
            pr.razon_social AS proveedor,
            pr.telefono AS proveedor_telefono,
            pr.correo AS proveedor_correo,

            CONCAT(
                u.nombres,
                ' ',
                u.apellidos
            ) AS usuario,

            CONCAT(
                ua.nombres,
                ' ',
                ua.apellidos
            ) AS usuario_anulacion

        FROM compras c

        INNER JOIN proveedores pr
            ON pr.id = c.id_proveedor

        INNER JOIN usuarios u
            ON u.id = c.id_usuario

        LEFT JOIN usuarios ua
            ON ua.id = c.id_usuario_anulacion

        WHERE c.id = ?

        LIMIT 1
        `,
        [id]
    );

    if (!compras.length) {
        return null;
    }

    const [detalle] = await conexion.query(
        `
        SELECT
            dc.id,
            dc.id_producto,
            dc.cantidad,
            dc.costo,
            dc.subtotal,
            dc.descuento,
            dc.iva_porcentaje,
            dc.iva,
            dc.total,

            p.codigo,
            p.nombre,
            p.marca,
            p.unidad_medida

        FROM detalle_compras dc

        INNER JOIN productos p
            ON p.id = dc.id_producto

        WHERE dc.id_compra = ?

        ORDER BY dc.id
        `,
        [id]
    );

    return {
        ...compras[0],
        detalle
    };
}

async function registrarCompra(datos) {
    const conexion =
        await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const [proveedores] =
            await conexion.query(
                `
                SELECT
                    id,
                    razon_social
                FROM proveedores
                WHERE id = ?
                  AND estado = TRUE
                LIMIT 1
                `,
                [datos.id_proveedor]
            );

        if (!proveedores.length) {
            throw crearError(
                "El proveedor no existe o está inactivo"
            );
        }

        const productosUnicos =
            new Set(
                datos.productos.map(
                    (item) =>
                        Number(item.id_producto)
                )
            );

        if (
            productosUnicos.size !==
            datos.productos.length
        ) {
            throw crearError(
                "La compra contiene productos repetidos"
            );
        }

        const detalleCalculado = [];

        let subtotalCompra = 0;
        let descuentoCompra = 0;
        let ivaCompra = 0;
        let totalCompra = 0;

        for (
            const item of datos.productos
        ) {
            const [productos] =
                await conexion.query(
                    `
                    SELECT
                        p.id,
                        p.codigo,
                        p.nombre,
                        p.estado,
                        p.iva,

                        i.stock_actual,
                        i.stock_reservado

                    FROM productos p

                    INNER JOIN inventario i
                        ON i.id_producto = p.id

                    WHERE p.id = ?

                    FOR UPDATE
                    `,
                    [item.id_producto]
                );

            if (!productos.length) {
                throw crearError(
                    `El producto ${item.id_producto} no existe o no tiene inventario`
                );
            }

            const producto =
                productos[0];

            if (!producto.estado) {
                throw crearError(
                    `El producto ${producto.nombre} está inactivo`
                );
            }

            const cantidad =
                Number(item.cantidad);

            const costo =
                redondear(item.costo);

            const descuento =
                redondear(
                    item.descuento || 0
                );

            const ivaPorcentaje =
                redondear(
                    item.iva_porcentaje ??
                    producto.iva ??
                    0
                );

            if (
                !Number.isInteger(cantidad) ||
                cantidad < 1
            ) {
                throw crearError(
                    `La cantidad de ${producto.nombre} no es válida`
                );
            }

            if (
                !Number.isFinite(costo) ||
                costo < 0
            ) {
                throw crearError(
                    `El costo de ${producto.nombre} no es válido`
                );
            }

            const subtotal =
                redondear(
                    cantidad * costo
                );

            if (
                descuento < 0 ||
                descuento > subtotal
            ) {
                throw crearError(
                    `El descuento de ${producto.nombre} no es válido`
                );
            }

            if (
                ivaPorcentaje < 0 ||
                ivaPorcentaje > 100
            ) {
                throw crearError(
                    `El IVA de ${producto.nombre} no es válido`
                );
            }

            const base =
                redondear(
                    subtotal - descuento
                );

            const iva =
                redondear(
                    base *
                    ivaPorcentaje /
                    100
                );

            const total =
                redondear(
                    base + iva
                );

            subtotalCompra =
                redondear(
                    subtotalCompra +
                    subtotal
                );

            descuentoCompra =
                redondear(
                    descuentoCompra +
                    descuento
                );

            ivaCompra =
                redondear(
                    ivaCompra +
                    iva
                );

            totalCompra =
                redondear(
                    totalCompra +
                    total
                );

            detalleCalculado.push({
                id_producto:
                    producto.id,

                nombre:
                    producto.nombre,

                cantidad,
                costo,
                subtotal,
                descuento,
                iva_porcentaje:
                    ivaPorcentaje,
                iva,
                total,

                stock_anterior:
                    Number(
                        producto.stock_actual
                    )
            });
        }

        const saldoPendiente =
            datos.forma_pago === "CREDITO"
                ? totalCompra
                : 0;

        const [resultadoCompra] =
            await conexion.query(
                `
                INSERT INTO compras (
                    numero,
                    factura_proveedor,
                    id_proveedor,
                    id_usuario,
                    subtotal,
                    descuento,
                    iva,
                    total,
                    forma_pago,
                    fecha_vencimiento,
                    saldo_pendiente,
                    observaciones,
                    estado
                )
                VALUES (
                    '',
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'CONFIRMADA'
                )
                `,
                [
                    datos.factura_proveedor ||
                        null,

                    datos.id_proveedor,
                    datos.id_usuario,

                    subtotalCompra,
                    descuentoCompra,
                    ivaCompra,
                    totalCompra,

                    datos.forma_pago,

                    datos.forma_pago ===
                        "CREDITO"
                        ? datos.fecha_vencimiento
                        : null,

                    saldoPendiente,

                    datos.observaciones ||
                        null
                ]
            );

        const idCompra =
            resultadoCompra.insertId;

        const numero =
            `COMP-${String(idCompra).padStart(
                6,
                "0"
            )}`;

        await conexion.query(
            `
            UPDATE compras
            SET numero = ?
            WHERE id = ?
            `,
            [
                numero,
                idCompra
            ]
        );

        for (
            const item of detalleCalculado
        ) {
            await conexion.query(
                `
                INSERT INTO detalle_compras (
                    id_compra,
                    id_producto,
                    cantidad,
                    costo,
                    subtotal,
                    descuento,
                    iva_porcentaje,
                    iva,
                    total
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
                `,
                [
                    idCompra,
                    item.id_producto,
                    item.cantidad,
                    item.costo,
                    item.subtotal,
                    item.descuento,
                    item.iva_porcentaje,
                    item.iva,
                    item.total
                ]
            );

            const stockNuevo =
                item.stock_anterior +
                item.cantidad;

            await conexion.query(
                `
                UPDATE inventario
                SET stock_actual = ?
                WHERE id_producto = ?
                `,
                [
                    stockNuevo,
                    item.id_producto
                ]
            );

            await conexion.query(
                `
                UPDATE productos
                SET costo = ?
                WHERE id = ?
                `,
                [
                    item.costo,
                    item.id_producto
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
                    origen,
                    referencia_id
                )
                SELECT
                    ?,
                    ?,
                    'ENTRADA',
                    ?,
                    ?,
                    ?,
                    ?,
                    i.ubicacion,
                    'COMPRA',
                    ?
                FROM inventario i
                WHERE i.id_producto = ?
                `,
                [
                    item.id_producto,
                    datos.id_usuario,
                    item.cantidad,
                    item.stock_anterior,
                    stockNuevo,
                    `Compra ${numero}`,
                    idCompra,
                    item.id_producto
                ]
            );
        }

        await conexion.commit();

        return await obtenerCompraPorId(
            idCompra
        );
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
}

async function obtenerCompras({
    buscar = "",
    estado = "todos",
    idProveedor = null,
    fechaDesde = null,
    fechaHasta = null
} = {}) {
    const filtros = [];
    const valores = [];

    if (buscar) {
        const termino =
            `%${buscar}%`;

        filtros.push(`
            (
                c.numero LIKE ?
                OR c.factura_proveedor LIKE ?
                OR pr.razon_social LIKE ?
                OR pr.nit LIKE ?
            )
        `);

        valores.push(
            termino,
            termino,
            termino,
            termino
        );
    }

    if (
        estado &&
        estado !== "todos"
    ) {
        filtros.push(
            "c.estado = ?"
        );

        valores.push(
            estado
        );
    }

    if (idProveedor) {
        filtros.push(
            "c.id_proveedor = ?"
        );

        valores.push(
            idProveedor
        );
    }

    if (fechaDesde) {
        filtros.push(
            "DATE(c.fecha) >= ?"
        );

        valores.push(
            fechaDesde
        );
    }

    if (fechaHasta) {
        filtros.push(
            "DATE(c.fecha) <= ?"
        );

        valores.push(
            fechaHasta
        );
    }

    const where = filtros.length
        ? `WHERE ${filtros.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
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
            c.fecha_anulacion,

            pr.id AS id_proveedor,
            pr.nit AS proveedor_nit,
            pr.razon_social AS proveedor,

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

        INNER JOIN proveedores pr
            ON pr.id = c.id_proveedor

        INNER JOIN usuarios u
            ON u.id = c.id_usuario

        LEFT JOIN detalle_compras dc
            ON dc.id_compra = c.id

        ${where}

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
            c.fecha_anulacion,
            pr.id,
            pr.nit,
            pr.razon_social,
            u.nombres,
            u.apellidos

        ORDER BY c.fecha DESC, c.id DESC
        `,
        valores
    );

    return rows;
}

async function anularCompra({
    idCompra,
    idUsuario,
    motivo
}) {
    const conexion =
        await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const [compras] =
            await conexion.query(
                `
                SELECT
                    id,
                    numero,
                    estado
                FROM compras
                WHERE id = ?
                FOR UPDATE
                `,
                [idCompra]
            );

        if (!compras.length) {
            throw crearError(
                "Compra no encontrada",
                404
            );
        }

        const compra =
            compras[0];

        if (
            compra.estado === "ANULADA"
        ) {
            throw crearError(
                "La compra ya se encuentra anulada"
            );
        }

        const [detalle] =
            await conexion.query(
                `
                SELECT
                    dc.id_producto,
                    dc.cantidad,
                    p.nombre,
                    i.stock_actual,
                    i.stock_reservado,
                    i.ubicacion

                FROM detalle_compras dc

                INNER JOIN productos p
                    ON p.id = dc.id_producto

                INNER JOIN inventario i
                    ON i.id_producto = dc.id_producto

                WHERE dc.id_compra = ?

                FOR UPDATE
                `,
                [idCompra]
            );

        for (
            const item of detalle
        ) {
            const stockAnterior =
                Number(item.stock_actual);

            const stockNuevo =
                stockAnterior -
                Number(item.cantidad);

            const stockReservado =
                Number(item.stock_reservado);

            if (stockNuevo < 0) {
                throw crearError(
                    `No se puede anular: el stock de ${item.nombre} es insuficiente`
                );
            }

            if (
                stockNuevo <
                stockReservado
            ) {
                throw crearError(
                    `No se puede anular: ${item.nombre} tiene unidades reservadas`
                );
            }

            await conexion.query(
                `
                UPDATE inventario
                SET stock_actual = ?
                WHERE id_producto = ?
                `,
                [
                    stockNuevo,
                    item.id_producto
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
                    origen,
                    referencia_id
                )
                VALUES (
                    ?,
                    ?,
                    'SALIDA',
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'ANULACION_COMPRA',
                    ?
                )
                `,
                [
                    item.id_producto,
                    idUsuario,
                    item.cantidad,
                    stockAnterior,
                    stockNuevo,
                    `${motivo}. Compra ${compra.numero}`,
                    item.ubicacion,
                    idCompra
                ]
            );
        }

        await conexion.query(
            `
            UPDATE compras
            SET
                estado = 'ANULADA',
                saldo_pendiente = 0,
                id_usuario_anulacion = ?,
                fecha_anulacion = NOW()
            WHERE id = ?
            `,
            [
                idUsuario,
                idCompra
            ]
        );

        await conexion.commit();

        return await obtenerCompraPorId(
            idCompra
        );
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
}

module.exports = {
    registrarCompra,
    obtenerCompras,
    obtenerCompraPorId,
    anularCompra
};