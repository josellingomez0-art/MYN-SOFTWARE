const ventasModel = require(
    "../models/ventas.model"
);

function texto(
    valor,
    maximo = 255
) {
    return String(valor ?? "")
        .trim()
        .slice(0, maximo);
}

function entero(
    valor,
    nombre,
    minimo = 1
) {
    const convertido =
        Number(valor);

    if (
        !Number.isInteger(convertido) ||
        convertido < minimo
    ) {
        const error = new Error(
            `${nombre} no es válido`
        );

        error.status = 400;

        throw error;
    }

    return convertido;
}

function decimal(
    valor,
    nombre,
    minimo = 0
) {
    const convertido =
        Number(valor);

    if (
        !Number.isFinite(convertido) ||
        convertido < minimo
    ) {
        const error = new Error(
            `${nombre} no es válido`
        );

        error.status = 400;

        throw error;
    }

    return convertido;
}

function fechaValida(valor) {
    return /^\d{4}-\d{2}-\d{2}$/.test(
        String(valor || "")
    );
}

function responderError(
    res,
    error,
    mensajeGeneral
) {
    console.error(error);

    const status =
        error.status || 500;

    return res
        .status(status)
        .json({
            mensaje:
                status === 500
                    ? mensajeGeneral
                    : error.message
        });
}

async function registrarVenta(
    req,
    res
) {
    try {
        const idUsuario =
            entero(
                req.usuario.id,
                "El usuario"
            );

        const idCliente =
            req.body.id_cliente
                ? entero(
                      req.body.id_cliente,
                      "El cliente"
                  )
                : null;

        const idMetodoPago =
            entero(
                req.body.id_metodo_pago,
                "El método de pago"
            );

        if (
            !Array.isArray(
                req.body.productos
            ) ||
            !req.body.productos.length
        ) {
            return res
                .status(400)
                .json({
                    mensaje:
                        "Agrega al menos un producto"
                });
        }

        const productos =
            req.body.productos.map(
                (item) => ({
                    id_producto:
                        entero(
                            item.id_producto,
                            "El producto"
                        ),

                    cantidad:
                        entero(
                            item.cantidad,
                            "La cantidad"
                        ),

                    precio:
                        decimal(
                            item.precio,
                            "El precio"
                        ),

                    descuento:
                        decimal(
                            item.descuento || 0,
                            "El descuento"
                        ),

                    iva_porcentaje:
                        decimal(
                            item.iva_porcentaje ??
                                0,
                            "El IVA"
                        )
                })
            );

        const efectivoRecibido =
            req.body.efectivo_recibido ===
                null ||
            req.body.efectivo_recibido ===
                undefined ||
            req.body.efectivo_recibido ===
                ""
                ? null
                : decimal(
                      req.body.efectivo_recibido,
                      "El efectivo recibido"
                  );

        const venta =
            await ventasModel.registrarVenta({
                id_cliente:
                    idCliente,

                id_usuario:
                    idUsuario,

                id_metodo_pago:
                    idMetodoPago,

                observaciones:
                    texto(
                        req.body.observaciones,
                        500
                    ) || null,

                efectivo_recibido:
                    efectivoRecibido,

                productos
            });

        return res
            .status(201)
            .json({
                mensaje:
                    "Venta registrada correctamente",

                venta
            });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al registrar la venta"
        );
    }
}

async function listarVentas(
    req,
    res
) {
    try {
        const estadosPermitidos = [
            "todos",
            "COMPLETADA",
            "ANULADA"
        ];

        const estado =
            estadosPermitidos.includes(
                req.query.estado
            )
                ? req.query.estado
                : "todos";

        const ventas =
            await ventasModel.obtenerVentas({
                buscar:
                    texto(
                        req.query.buscar,
                        100
                    ),

                estado,

                idCliente:
                    req.query.id_cliente
                        ? entero(
                              req.query.id_cliente,
                              "El cliente"
                          )
                        : null,

                idUsuario:
                    req.query.id_usuario
                        ? entero(
                              req.query.id_usuario,
                              "El usuario"
                          )
                        : null,

                fechaDesde:
                    req.query.fecha_desde &&
                    fechaValida(
                        req.query.fecha_desde
                    )
                        ? req.query.fecha_desde
                        : null,

                fechaHasta:
                    req.query.fecha_hasta &&
                    fechaValida(
                        req.query.fecha_hasta
                    )
                        ? req.query.fecha_hasta
                        : null
            });

        return res.json(ventas);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al listar las ventas"
        );
    }
}

async function obtenerVenta(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "La venta"
            );

        const venta =
            await ventasModel
                .obtenerVentaPorId(id);

        if (!venta) {
            return res
                .status(404)
                .json({
                    mensaje:
                        "Venta no encontrada"
                });
        }

        return res.json(venta);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar la venta"
        );
    }
}

async function anularVenta(
    req,
    res
) {
    try {
        const idVenta =
            entero(
                req.params.id,
                "La venta"
            );

        const idUsuario =
            entero(
                req.usuario.id,
                "El usuario"
            );

        const motivo =
            texto(
                req.body.motivo,
                250
            );

        if (
            motivo.length < 5
        ) {
            return res
                .status(400)
                .json({
                    mensaje:
                        "El motivo debe tener al menos 5 caracteres"
                });
        }

        const venta =
            await ventasModel.anularVenta({
                idVenta,
                idUsuario,
                motivo
            });

        return res.json({
            mensaje:
                "Venta anulada correctamente y stock repuesto",

            venta
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al anular la venta"
        );
    }
}

module.exports = {
    registrarVenta,
    listarVentas,
    obtenerVenta,
    anularVenta
};