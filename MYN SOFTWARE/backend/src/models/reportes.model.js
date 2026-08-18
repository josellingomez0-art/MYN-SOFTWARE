const pool = require("../config/database");

function fechaInicial(fecha) {
    return `${fecha} 00:00:00`;
}

function fechaFinal(fecha) {
    return `${fecha} 23:59:59`;
}

/*
|--------------------------------------------------------------------------
| Resumen general
|--------------------------------------------------------------------------
*/

async function obtenerResumen(
    fechaDesde,
    fechaHasta
) {
    const desde =
        fechaInicial(fechaDesde);

    const hasta =
        fechaFinal(fechaHasta);

    const [[ventas]] =
        await pool.query(
            `
            SELECT
                COUNT(*) AS cantidad_ventas,

                COALESCE(
                    SUM(v.subtotal),
                    0
                ) AS subtotal_ventas,

                COALESCE(
                    SUM(v.descuento),
                    0
                ) AS descuentos_ventas,

                COALESCE(
                    SUM(v.iva),
                    0
                ) AS iva_ventas,

                COALESCE(
                    SUM(v.total),
                    0
                ) AS total_ventas

            FROM ventas v

            WHERE v.estado <> 'ANULADA'
              AND v.fecha BETWEEN ? AND ?
            `,
            [
                desde,
                hasta
            ]
        );

    const [[compras]] =
        await pool.query(
            `
            SELECT
                COUNT(*) AS cantidad_compras,

                COALESCE(
                    SUM(c.subtotal),
                    0
                ) AS subtotal_compras,

                COALESCE(
                    SUM(c.descuento),
                    0
                ) AS descuentos_compras,

                COALESCE(
                    SUM(c.iva),
                    0
                ) AS iva_compras,

                COALESCE(
                    SUM(c.total),
                    0
                ) AS total_compras

            FROM compras c

            WHERE c.estado <> 'ANULADA'
              AND c.fecha BETWEEN ? AND ?
            `,
            [
                desde,
                hasta
            ]
        );

    const [[utilidad]] =
        await pool.query(
            `
            SELECT
                COALESCE(
                    SUM(
                        (
                            COALESCE(dv.subtotal, 0) -
                            COALESCE(dv.descuento, 0)
                        )
                        -
                        (
                            dv.cantidad *
                            COALESCE(p.costo, 0)
                        )
                    ),
                    0
                ) AS utilidad_bruta,

                COALESCE(
                    SUM(
                        dv.cantidad *
                        COALESCE(p.costo, 0)
                    ),
                    0
                ) AS costo_estimado_vendido

            FROM detalle_ventas dv

            INNER JOIN ventas v
                ON v.id = dv.id_venta

            INNER JOIN productos p
                ON p.id = dv.id_producto

            WHERE v.estado <> 'ANULADA'
              AND v.fecha BETWEEN ? AND ?
            `,
            [
                desde,
                hasta
            ]
        );

    const [[inventario]] =
        await pool.query(
            `
            SELECT
                COUNT(*) AS productos_inventariados,

                COALESCE(
                    SUM(
                        CASE
                            WHEN i.stock_actual <=
                                 COALESCE(
                                     p.stock_minimo,
                                     0
                                 )
                                THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS productos_stock_bajo,

                COALESCE(
                    SUM(
                        i.stock_actual *
                        COALESCE(p.costo, 0)
                    ),
                    0
                ) AS valor_inventario_costo,

                COALESCE(
                    SUM(
                        i.stock_actual *
                        COALESCE(p.precio, 0)
                    ),
                    0
                ) AS valor_inventario_venta

            FROM inventario i

            INNER JOIN productos p
                ON p.id = i.id_producto

            WHERE p.estado = TRUE
            `
        );

    const totalVentas =
        Number(
            ventas.total_ventas
        ) || 0;

    const utilidadBruta =
        Number(
            utilidad.utilidad_bruta
        ) || 0;

    const margenBruto =
        totalVentas > 0
            ? (
                utilidadBruta /
                totalVentas
            ) * 100
            : 0;

    return {
        ...ventas,
        ...compras,
        ...utilidad,
        ...inventario,
        margen_bruto:
            margenBruto
    };
}

/*
|--------------------------------------------------------------------------
| Ventas agrupadas por día
|--------------------------------------------------------------------------
*/

async function obtenerVentasPorDia(
    fechaDesde,
    fechaHasta
) {
    const [rows] =
        await pool.query(
            `
            SELECT
                DATE(v.fecha) AS fecha,
                COUNT(*) AS cantidad,

                COALESCE(
                    SUM(v.total),
                    0
                ) AS total

            FROM ventas v

            WHERE v.estado <> 'ANULADA'
              AND v.fecha BETWEEN ? AND ?

            GROUP BY
                DATE(v.fecha)

            ORDER BY
                DATE(v.fecha)
            `,
            [
                fechaInicial(
                    fechaDesde
                ),

                fechaFinal(
                    fechaHasta
                )
            ]
        );

    return rows;
}

/*
|--------------------------------------------------------------------------
| Compras agrupadas por día
|--------------------------------------------------------------------------
*/

async function obtenerComprasPorDia(
    fechaDesde,
    fechaHasta
) {
    const [rows] =
        await pool.query(
            `
            SELECT
                DATE(c.fecha) AS fecha,
                COUNT(*) AS cantidad,

                COALESCE(
                    SUM(c.total),
                    0
                ) AS total

            FROM compras c

            WHERE c.estado <> 'ANULADA'
              AND c.fecha BETWEEN ? AND ?

            GROUP BY
                DATE(c.fecha)

            ORDER BY
                DATE(c.fecha)
            `,
            [
                fechaInicial(
                    fechaDesde
                ),

                fechaFinal(
                    fechaHasta
                )
            ]
        );

    return rows;
}

/*
|--------------------------------------------------------------------------
| Productos más vendidos
|--------------------------------------------------------------------------
*/

async function obtenerProductosMasVendidos(
    fechaDesde,
    fechaHasta,
    limite = 10
) {
    const [rows] =
        await pool.query(
            `
            SELECT
                p.id,
                p.codigo,
                p.nombre,
                p.marca,

                COALESCE(
                    SUM(dv.cantidad),
                    0
                ) AS unidades_vendidas,

                COALESCE(
                    SUM(
                        COALESCE(
                            dv.subtotal,
                            0
                        )
                        -
                        COALESCE(
                            dv.descuento,
                            0
                        )
                    ),
                    0
                ) AS venta_neta,

                COALESCE(
                    SUM(
                        (
                            COALESCE(
                                dv.subtotal,
                                0
                            )
                            -
                            COALESCE(
                                dv.descuento,
                                0
                            )
                        )
                        -
                        (
                            dv.cantidad *
                            COALESCE(
                                p.costo,
                                0
                            )
                        )
                    ),
                    0
                ) AS utilidad_estimada

            FROM detalle_ventas dv

            INNER JOIN ventas v
                ON v.id = dv.id_venta

            INNER JOIN productos p
                ON p.id = dv.id_producto

            WHERE v.estado <> 'ANULADA'
              AND v.fecha BETWEEN ? AND ?

            GROUP BY
                p.id,
                p.codigo,
                p.nombre,
                p.marca

            ORDER BY
                unidades_vendidas DESC,
                venta_neta DESC

            LIMIT ?
            `,
            [
                fechaInicial(
                    fechaDesde
                ),

                fechaFinal(
                    fechaHasta
                ),

                Number(limite)
            ]
        );

    return rows;
}

/*
|--------------------------------------------------------------------------
| Ventas por método de pago
|--------------------------------------------------------------------------
*/

async function obtenerVentasPorMetodoPago(
    fechaDesde,
    fechaHasta
) {
    const [rows] =
        await pool.query(
            `
            SELECT
                mp.id,
                mp.nombre,

                COUNT(
                    v.id
                ) AS cantidad_ventas,

                COALESCE(
                    SUM(v.total),
                    0
                ) AS total

            FROM metodos_pago mp

            INNER JOIN ventas v
                ON v.id_metodo_pago = mp.id

            WHERE v.estado <> 'ANULADA'
              AND v.fecha BETWEEN ? AND ?

            GROUP BY
                mp.id,
                mp.nombre

            ORDER BY
                total DESC
            `,
            [
                fechaInicial(
                    fechaDesde
                ),

                fechaFinal(
                    fechaHasta
                )
            ]
        );

    return rows;
}

/*
|--------------------------------------------------------------------------
| Ventas por empleado
|--------------------------------------------------------------------------
*/

async function obtenerVentasPorEmpleado(
    fechaDesde,
    fechaHasta,
    limite = 10
) {
    const [rows] =
        await pool.query(
            `
            SELECT
                u.id,

                CONCAT(
                    u.nombres,
                    ' ',
                    u.apellidos
                ) AS empleado,

                r.nombre AS rol,

                COUNT(
                    v.id
                ) AS cantidad_ventas,

                COALESCE(
                    SUM(v.total),
                    0
                ) AS total_vendido

            FROM usuarios u

            INNER JOIN roles r
                ON r.id = u.id_rol

            INNER JOIN ventas v
                ON v.id_usuario = u.id

            WHERE v.estado <> 'ANULADA'
              AND v.fecha BETWEEN ? AND ?

            GROUP BY
                u.id,
                u.nombres,
                u.apellidos,
                r.nombre

            ORDER BY
                total_vendido DESC

            LIMIT ?
            `,
            [
                fechaInicial(
                    fechaDesde
                ),

                fechaFinal(
                    fechaHasta
                ),

                Number(limite)
            ]
        );

    return rows;
}

/*
|--------------------------------------------------------------------------
| Clientes principales
|--------------------------------------------------------------------------
*/

async function obtenerClientesPrincipales(
    fechaDesde,
    fechaHasta,
    limite = 10
) {
    const [rows] =
        await pool.query(
            `
            SELECT
                c.id,
                c.documento,

                CONCAT(
                    c.nombres,

                    CASE
                        WHEN c.apellidos IS NULL
                          OR TRIM(c.apellidos) = ''
                            THEN ''
                        ELSE CONCAT(
                            ' ',
                            c.apellidos
                        )
                    END
                ) AS cliente,

                COUNT(
                    v.id
                ) AS cantidad_ventas,

                COALESCE(
                    SUM(v.total),
                    0
                ) AS total_comprado,

                MAX(
                    v.fecha
                ) AS ultima_compra

            FROM clientes c

            INNER JOIN ventas v
                ON v.id_cliente = c.id

            WHERE v.estado <> 'ANULADA'
              AND v.fecha BETWEEN ? AND ?

            GROUP BY
                c.id,
                c.documento,
                c.nombres,
                c.apellidos

            ORDER BY
                total_comprado DESC

            LIMIT ?
            `,
            [
                fechaInicial(
                    fechaDesde
                ),

                fechaFinal(
                    fechaHasta
                ),

                Number(limite)
            ]
        );

    return rows;
}

/*
|--------------------------------------------------------------------------
| Proveedores principales
|--------------------------------------------------------------------------
*/

async function obtenerProveedoresPrincipales(
    fechaDesde,
    fechaHasta,
    limite = 10
) {
    const [rows] =
        await pool.query(
            `
            SELECT
                pr.id,
                pr.nit,
                pr.razon_social,

                COUNT(
                    c.id
                ) AS cantidad_compras,

                COALESCE(
                    SUM(c.total),
                    0
                ) AS total_comprado,

                MAX(
                    c.fecha
                ) AS ultima_compra

            FROM proveedores pr

            INNER JOIN compras c
                ON c.id_proveedor = pr.id

            WHERE c.estado <> 'ANULADA'
              AND c.fecha BETWEEN ? AND ?

            GROUP BY
                pr.id,
                pr.nit,
                pr.razon_social

            ORDER BY
                total_comprado DESC

            LIMIT ?
            `,
            [
                fechaInicial(
                    fechaDesde
                ),

                fechaFinal(
                    fechaHasta
                ),

                Number(limite)
            ]
        );

    return rows;
}

/*
|--------------------------------------------------------------------------
| Productos con stock bajo
|--------------------------------------------------------------------------
*/

async function obtenerStockBajo(
    limite = 50
) {
    const [rows] =
        await pool.query(
            `
            SELECT
                p.id,
                p.codigo,
                p.nombre,
                p.marca,

                i.stock_actual,

                COALESCE(
                    p.stock_minimo,
                    0
                ) AS stock_minimo,

                COALESCE(
                    i.stock_reservado,
                    0
                ) AS stock_reservado,

                (
                    i.stock_actual
                    -
                    COALESCE(
                        i.stock_reservado,
                        0
                    )
                ) AS stock_disponible,

                COALESCE(
                    p.costo,
                    0
                ) AS costo,

                COALESCE(
                    p.precio,
                    0
                ) AS precio,

                pr.razon_social
                    AS proveedor,

                i.ubicacion

            FROM inventario i

            INNER JOIN productos p
                ON p.id = i.id_producto

            LEFT JOIN proveedores pr
                ON pr.id = p.id_proveedor

            WHERE p.estado = TRUE
              AND i.stock_actual <=
                  COALESCE(
                      p.stock_minimo,
                      0
                  )

            ORDER BY
                stock_disponible ASC,
                p.nombre

            LIMIT ?
            `,
            [
                Number(limite)
            ]
        );

    return rows;
}

/*
|--------------------------------------------------------------------------
| Últimas ventas
|--------------------------------------------------------------------------
*/

async function obtenerUltimasVentas(
    fechaDesde,
    fechaHasta,
    limite = 20
) {
    const [rows] =
        await pool.query(
            `
            SELECT
                v.id,
                v.numero,
                v.fecha,
                v.total,
                v.estado,

                CONCAT(
                    COALESCE(
                        c.nombres,
                        ''
                    ),
                    ' ',
                    COALESCE(
                        c.apellidos,
                        ''
                    )
                ) AS cliente,

                CONCAT(
                    u.nombres,
                    ' ',
                    u.apellidos
                ) AS vendedor,

                COALESCE(
                    mp.nombre,
                    'Sin método'
                ) AS metodo_pago

            FROM ventas v

            LEFT JOIN clientes c
                ON c.id = v.id_cliente

            INNER JOIN usuarios u
                ON u.id = v.id_usuario

            LEFT JOIN metodos_pago mp
                ON mp.id =
                   v.id_metodo_pago

            WHERE v.fecha
                  BETWEEN ? AND ?

            ORDER BY
                v.fecha DESC,
                v.id DESC

            LIMIT ?
            `,
            [
                fechaInicial(
                    fechaDesde
                ),

                fechaFinal(
                    fechaHasta
                ),

                Number(limite)
            ]
        );

    return rows.map(
        (venta) => ({
            ...venta,

            numero:
                venta.numero ||
                `FV-${String(
                    venta.id
                ).padStart(
                    6,
                    "0"
                )}`,

            cliente:
                venta.cliente &&
                venta.cliente.trim()
                    ? venta.cliente.trim()
                    : "Cliente general"
        })
    );
}

/*
|--------------------------------------------------------------------------
| Reporte completo
|--------------------------------------------------------------------------
*/

async function obtenerReporteCompleto(
    fechaDesde,
    fechaHasta
) {
    const [
        resumen,
        ventasPorDia,
        comprasPorDia,
        productosMasVendidos,
        metodosPago,
        empleados,
        clientes,
        proveedores,
        stockBajo,
        ultimasVentas
    ] = await Promise.all([
        obtenerResumen(
            fechaDesde,
            fechaHasta
        ),

        obtenerVentasPorDia(
            fechaDesde,
            fechaHasta
        ),

        obtenerComprasPorDia(
            fechaDesde,
            fechaHasta
        ),

        obtenerProductosMasVendidos(
            fechaDesde,
            fechaHasta
        ),

        obtenerVentasPorMetodoPago(
            fechaDesde,
            fechaHasta
        ),

        obtenerVentasPorEmpleado(
            fechaDesde,
            fechaHasta
        ),

        obtenerClientesPrincipales(
            fechaDesde,
            fechaHasta
        ),

        obtenerProveedoresPrincipales(
            fechaDesde,
            fechaHasta
        ),

        obtenerStockBajo(),

        obtenerUltimasVentas(
            fechaDesde,
            fechaHasta
        )
    ]);

    return {
        periodo: {
            fecha_desde:
                fechaDesde,

            fecha_hasta:
                fechaHasta
        },

        resumen,

        ventas_por_dia:
            ventasPorDia,

        compras_por_dia:
            comprasPorDia,

        productos_mas_vendidos:
            productosMasVendidos,

        ventas_por_metodo_pago:
            metodosPago,

        ventas_por_empleado:
            empleados,

        clientes_principales:
            clientes,

        proveedores_principales:
            proveedores,

        stock_bajo:
            stockBajo,

        ultimas_ventas:
            ultimasVentas
    };
}

module.exports = {
    obtenerReporteCompleto
};