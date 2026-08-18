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
        (
            Number(valor) +
            Number.EPSILON
        ) * 100
    ) / 100;
}

async function obtenerVentaPorId(
    idVenta,
    conexion = pool
) {
    const [ventas] =
        await conexion.query(
            `
            SELECT
                v.id,
                v.numero,
                v.id_cliente,
                v.id_usuario,
                v.id_metodo_pago,
                v.id_turno,
                v.fecha,
                v.subtotal,
                v.iva,
                v.descuento,
                v.total,
                v.observaciones,
                v.efectivo_recibido,
                v.cambio,
                v.estado,
                v.id_usuario_anula,
                v.fecha_anulacion,
                v.motivo_anulacion,

                CONCAT(
                    COALESCE(c.nombres, ''),
                    ' ',
                    COALESCE(c.apellidos, '')
                ) AS cliente,

                c.documento AS cliente_documento,
                c.telefono AS cliente_telefono,
                c.correo AS cliente_correo,

                CONCAT(
                    u.nombres,
                    ' ',
                    u.apellidos
                ) AS vendedor,

                mp.nombre AS metodo_pago,

                ca.nombre AS caja,

                CONCAT(
                    ua.nombres,
                    ' ',
                    ua.apellidos
                ) AS usuario_anulacion

            FROM ventas v

            LEFT JOIN clientes c
                ON c.id = v.id_cliente

            INNER JOIN usuarios u
                ON u.id = v.id_usuario

            INNER JOIN metodos_pago mp
                ON mp.id = v.id_metodo_pago

            INNER JOIN turnos_caja t
                ON t.id = v.id_turno

            INNER JOIN cajas ca
                ON ca.id = t.id_caja

            LEFT JOIN usuarios ua
                ON ua.id = v.id_usuario_anula

            WHERE v.id = ?

            LIMIT 1
            `,
            [idVenta]
        );

    if (!ventas.length) {
        return null;
    }

    const [detalle] =
        await conexion.query(
            `
            SELECT
                dv.id,
                dv.id_producto,
                dv.cantidad,
                dv.precio,
                dv.descuento,
                dv.iva_porcentaje,
                dv.iva,
                dv.subtotal,
                dv.total,

                p.codigo,
                p.nombre,
                p.marca,
                p.unidad_medida

            FROM detalle_ventas dv

            INNER JOIN productos p
                ON p.id = dv.id_producto

            WHERE dv.id_venta = ?

            ORDER BY dv.id
            `,
            [idVenta]
        );

    return {
        ...ventas[0],
        cliente:
            ventas[0].cliente &&
            ventas[0].cliente.trim()
                ? ventas[0].cliente.trim()
                : "Cliente general",

        detalle
    };
}

async function registrarVenta(datos) {
    const conexion =
        await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const [turnos] =
            await conexion.query(
                `
                SELECT
                    t.id,
                    t.id_caja,
                    t.estado
                FROM turnos_caja t
                WHERE t.id_usuario_apertura = ?
                  AND t.estado = 'ABIERTA'
                LIMIT 1
                FOR UPDATE
                `,
                [datos.id_usuario]
            );

        if (!turnos.length) {
            throw crearError(
                "No tienes una caja abierta. Abre un turno antes de vender."
            );
        }

        const idTurno =
            Number(turnos[0].id);

        if (datos.id_cliente) {
            const [clientes] =
                await conexion.query(
                    `
                    SELECT id
                    FROM clientes
                    WHERE id = ?
                      AND estado = TRUE
                    LIMIT 1
                    `,
                    [datos.id_cliente]
                );

            if (!clientes.length) {
                throw crearError(
                    "El cliente no existe o está inactivo"
                );
            }
        }

        const [metodosPago] =
            await conexion.query(
                `
                SELECT
                    id,
                    nombre,
                    estado
                FROM metodos_pago
                WHERE id = ?
                  AND estado = TRUE
                LIMIT 1
                `,
                [datos.id_metodo_pago]
            );

        if (!metodosPago.length) {
            throw crearError(
                "El método de pago no existe o está inactivo"
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
                "La venta contiene productos repetidos"
            );
        }

        const detalleCalculado = [];

        let subtotalVenta = 0;
        let descuentoVenta = 0;
        let ivaVenta = 0;
        let totalVenta = 0;

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
                        p.precio,
                        p.iva,

                        i.stock_actual,
                        i.stock_reservado,
                        i.ubicacion

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

            const precio =
                redondear(
                    item.precio ??
                    producto.precio
                );

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
                !Number.isFinite(precio) ||
                precio < 0
            ) {
                throw crearError(
                    `El precio de ${producto.nombre} no es válido`
                );
            }

            const stockActual =
                Number(
                    producto.stock_actual
                );

            const stockReservado =
                Number(
                    producto.stock_reservado
                );

            const stockDisponible =
                stockActual -
                stockReservado;

            if (
                stockDisponible <
                cantidad
            ) {
                throw crearError(
                    `Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}`
                );
            }

            const subtotal =
                redondear(
                    cantidad * precio
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
                    subtotal -
                    descuento
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

            subtotalVenta =
                redondear(
                    subtotalVenta +
                    subtotal
                );

            descuentoVenta =
                redondear(
                    descuentoVenta +
                    descuento
                );

            ivaVenta =
                redondear(
                    ivaVenta +
                    iva
                );

            totalVenta =
                redondear(
                    totalVenta +
                    total
                );

            detalleCalculado.push({
                id_producto:
                    producto.id,

                nombre:
                    producto.nombre,

                cantidad,
                precio,
                descuento,
                iva_porcentaje:
                    ivaPorcentaje,
                iva,
                subtotal,
                total,

                stock_anterior:
                    stockActual,

                ubicacion:
                    producto.ubicacion
            });
        }

        const efectivoRecibido =
            datos.efectivo_recibido !==
                null &&
            datos.efectivo_recibido !==
                undefined
                ? redondear(
                      datos.efectivo_recibido
                  )
                : null;

        let cambio = 0;

        const nombreMetodo =
            String(
                metodosPago[0].nombre ||
                ""
            ).toLowerCase();

        const esEfectivo =
            nombreMetodo.includes(
                "efectivo"
            );

        if (esEfectivo) {
            if (
                efectivoRecibido ===
                    null ||
                efectivoRecibido <
                    totalVenta
            ) {
                throw crearError(
                    "El efectivo recibido debe ser igual o mayor al total"
                );
            }

            cambio =
                redondear(
                    efectivoRecibido -
                    totalVenta
                );
        }

        const [resultadoVenta] =
            await conexion.query(
                `
                INSERT INTO ventas (
                    numero,
                    id_cliente,
                    id_usuario,
                    id_metodo_pago,
                    id_turno,
                    subtotal,
                    iva,
                    descuento,
                    total,
                    observaciones,
                    efectivo_recibido,
                    cambio,
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
                    'COMPLETADA'
                )
                `,
                [
                    datos.id_cliente ||
                        null,

                    datos.id_usuario,
                    datos.id_metodo_pago,
                    idTurno,

                    subtotalVenta,
                    ivaVenta,
                    descuentoVenta,
                    totalVenta,

                    datos.observaciones ||
                        null,

                    efectivoRecibido,
                    cambio
                ]
            );

        const idVenta =
            resultadoVenta.insertId;

        const numero =
            `FV-${String(idVenta).padStart(
                6,
                "0"
            )}`;

        await conexion.query(
            `
            UPDATE ventas
            SET numero = ?
            WHERE id = ?
            `,
            [
                numero,
                idVenta
            ]
        );

        for (
            const item of detalleCalculado
        ) {
            await conexion.query(
                `
                INSERT INTO detalle_ventas (
                    id_venta,
                    id_producto,
                    cantidad,
                    precio,
                    descuento,
                    iva_porcentaje,
                    iva,
                    subtotal,
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
                    idVenta,
                    item.id_producto,
                    item.cantidad,
                    item.precio,
                    item.descuento,
                    item.iva_porcentaje,
                    item.iva,
                    item.subtotal,
                    item.total
                ]
            );

            const stockNuevo =
                item.stock_anterior -
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
                    'VENTA',
                    ?
                )
                `,
                [
                    item.id_producto,
                    datos.id_usuario,
                    item.cantidad,
                    item.stock_anterior,
                    stockNuevo,
                    `Venta ${numero}`,
                    item.ubicacion,
                    idVenta
                ]
            );
        }

        await conexion.commit();

        return await obtenerVentaPorId(
            idVenta
        );
    } catch (error) {
        await conexion.rollback();

        throw error;
    } finally {
        conexion.release();
    }
}

async function obtenerVentas({
    buscar = "",
    estado = "todos",
    idCliente = null,
    idUsuario = null,
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
                v.numero LIKE ?
                OR c.documento LIKE ?
                OR c.nombres LIKE ?
                OR c.apellidos LIKE ?
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
            "v.estado = ?"
        );

        valores.push(
            estado
        );
    }

    if (idCliente) {
        filtros.push(
            "v.id_cliente = ?"
        );

        valores.push(
            idCliente
        );
    }

    if (idUsuario) {
        filtros.push(
            "v.id_usuario = ?"
        );

        valores.push(
            idUsuario
        );
    }

    if (fechaDesde) {
        filtros.push(
            "DATE(v.fecha) >= ?"
        );

        valores.push(
            fechaDesde
        );
    }

    if (fechaHasta) {
        filtros.push(
            "DATE(v.fecha) <= ?"
        );

        valores.push(
            fechaHasta
        );
    }

    const where = filtros.length
        ? `WHERE ${filtros.join(" AND ")}`
        : "";

    const [rows] =
        await pool.query(
            `
            SELECT
                v.id,
                v.numero,
                v.fecha,
                v.subtotal,
                v.iva,
                v.descuento,
                v.total,
                v.efectivo_recibido,
                v.cambio,
                v.estado,

                v.id_cliente,
                v.id_usuario,
                v.id_metodo_pago,

                CONCAT(
                    COALESCE(c.nombres, ''),
                    ' ',
                    COALESCE(c.apellidos, '')
                ) AS cliente,

                c.documento AS cliente_documento,

                CONCAT(
                    u.nombres,
                    ' ',
                    u.apellidos
                ) AS vendedor,

                mp.nombre AS metodo_pago,

                ca.nombre AS caja,

                COUNT(dv.id) AS productos,

                COALESCE(
                    SUM(dv.cantidad),
                    0
                ) AS unidades

            FROM ventas v

            LEFT JOIN clientes c
                ON c.id = v.id_cliente

            INNER JOIN usuarios u
                ON u.id = v.id_usuario

            INNER JOIN metodos_pago mp
                ON mp.id = v.id_metodo_pago

            INNER JOIN turnos_caja t
                ON t.id = v.id_turno

            INNER JOIN cajas ca
                ON ca.id = t.id_caja

            LEFT JOIN detalle_ventas dv
                ON dv.id_venta = v.id

            ${where}

            GROUP BY
                v.id,
                v.numero,
                v.fecha,
                v.subtotal,
                v.iva,
                v.descuento,
                v.total,
                v.efectivo_recibido,
                v.cambio,
                v.estado,
                v.id_cliente,
                v.id_usuario,
                v.id_metodo_pago,
                c.nombres,
                c.apellidos,
                c.documento,
                u.nombres,
                u.apellidos,
                mp.nombre,
                ca.nombre

            ORDER BY
                v.fecha DESC,
                v.id DESC
            `,
            valores
        );

    return rows.map(
        (venta) => ({
            ...venta,

            cliente:
                venta.cliente &&
                venta.cliente.trim()
                    ? venta.cliente.trim()
                    : "Cliente general"
        })
    );
}

async function anularVenta({
    idVenta,
    idUsuario,
    motivo
}) {
    const conexion =
        await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const [ventas] =
            await conexion.query(
                `
                SELECT
                    id,
                    numero,
                    estado
                FROM ventas
                WHERE id = ?
                FOR UPDATE
                `,
                [idVenta]
            );

        if (!ventas.length) {
            throw crearError(
                "Venta no encontrada",
                404
            );
        }

        const venta =
            ventas[0];

        if (
            venta.estado ===
            "ANULADA"
        ) {
            throw crearError(
                "La venta ya se encuentra anulada"
            );
        }

        const [detalle] =
            await conexion.query(
                `
                SELECT
                    dv.id_producto,
                    dv.cantidad,

                    p.nombre,

                    i.stock_actual,
                    i.ubicacion

                FROM detalle_ventas dv

                INNER JOIN productos p
                    ON p.id = dv.id_producto

                INNER JOIN inventario i
                    ON i.id_producto =
                       dv.id_producto

                WHERE dv.id_venta = ?

                FOR UPDATE
                `,
                [idVenta]
            );

        for (
            const item of detalle
        ) {
            const stockAnterior =
                Number(
                    item.stock_actual
                );

            const stockNuevo =
                stockAnterior +
                Number(item.cantidad);

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
                    'ENTRADA',
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'ANULACION_VENTA',
                    ?
                )
                `,
                [
                    item.id_producto,
                    idUsuario,
                    item.cantidad,
                    stockAnterior,
                    stockNuevo,
                    `${motivo}. Venta ${venta.numero}`,
                    item.ubicacion,
                    idVenta
                ]
            );
        }

        await conexion.query(
            `
            UPDATE ventas
            SET
                estado = 'ANULADA',
                id_usuario_anula = ?,
                fecha_anulacion = NOW(),
                motivo_anulacion = ?
            WHERE id = ?
            `,
            [
                idUsuario,
                motivo,
                idVenta
            ]
        );

        await conexion.commit();

        return await obtenerVentaPorId(
            idVenta
        );
    } catch (error) {
        await conexion.rollback();

        throw error;
    } finally {
        conexion.release();
    }
}

module.exports = {
    registrarVenta,
    obtenerVentas,
    obtenerVentaPorId,
    anularVenta
};