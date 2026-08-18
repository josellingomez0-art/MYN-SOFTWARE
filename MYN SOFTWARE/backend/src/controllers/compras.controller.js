const comprasModel = require(
    "../models/compras.model"
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
        error.status ||
        (
            error.code ===
            "ER_DUP_ENTRY"
                ? 409
                : 500
        );

    return res
        .status(status)
        .json({
            mensaje:
                status === 500
                    ? mensajeGeneral
                    : error.message
        });
}

async function registrarCompra(
    req,
    res
) {
    try {
        const idProveedor =
            entero(
                req.body.id_proveedor,
                "El proveedor"
            );

        const idUsuario =
            entero(
                req.usuario.id,
                "El usuario"
            );

        const formaPago =
            texto(
                req.body.forma_pago,
                20
            ).toUpperCase();

        if (
            ![
                "CONTADO",
                "CREDITO"
            ].includes(formaPago)
        ) {
            return res.status(400).json({
                mensaje:
                    "La forma de pago debe ser CONTADO o CREDITO"
            });
        }

        let fechaVencimiento = null;

        if (
            formaPago === "CREDITO"
        ) {
            if (
                !fechaValida(
                    req.body.fecha_vencimiento
                )
            ) {
                return res.status(400).json({
                    mensaje:
                        "La fecha de vencimiento es obligatoria para compras a crédito"
                });
            }

            fechaVencimiento =
                req.body.fecha_vencimiento;
        }

        if (
            !Array.isArray(
                req.body.productos
            ) ||
            !req.body.productos.length
        ) {
            return res.status(400).json({
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

                    costo:
                        decimal(
                            item.costo,
                            "El costo"
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

        const compra =
            await comprasModel.registrarCompra({
                id_proveedor:
                    idProveedor,

                id_usuario:
                    idUsuario,

                factura_proveedor:
                    texto(
                        req.body.factura_proveedor,
                        60
                    ) || null,

                forma_pago:
                    formaPago,

                fecha_vencimiento:
                    fechaVencimiento,

                observaciones:
                    texto(
                        req.body.observaciones,
                        500
                    ) || null,

                productos
            });

        return res
            .status(201)
            .json({
                mensaje:
                    "Compra registrada correctamente",

                compra
            });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al registrar la compra"
        );
    }
}

async function listarCompras(
    req,
    res
) {
    try {
        const estadosPermitidos = [
            "todos",
            "CONFIRMADA",
            "ANULADA"
        ];

        const estado =
            estadosPermitidos.includes(
                req.query.estado
            )
                ? req.query.estado
                : "todos";

        const idProveedor =
            req.query.id_proveedor
                ? entero(
                      req.query.id_proveedor,
                      "El proveedor"
                  )
                : null;

        const fechaDesde =
            req.query.fecha_desde &&
            fechaValida(
                req.query.fecha_desde
            )
                ? req.query.fecha_desde
                : null;

        const fechaHasta =
            req.query.fecha_hasta &&
            fechaValida(
                req.query.fecha_hasta
            )
                ? req.query.fecha_hasta
                : null;

        const compras =
            await comprasModel.obtenerCompras({
                buscar:
                    texto(
                        req.query.buscar,
                        100
                    ),

                estado,
                idProveedor,
                fechaDesde,
                fechaHasta
            });

        return res.json(compras);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al listar las compras"
        );
    }
}

async function obtenerCompra(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "La compra"
            );

        const compra =
            await comprasModel
                .obtenerCompraPorId(id);

        if (!compra) {
            return res
                .status(404)
                .json({
                    mensaje:
                        "Compra no encontrada"
                });
        }

        return res.json(compra);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar la compra"
        );
    }
}

async function anularCompra(
    req,
    res
) {
    try {
        const idCompra =
            entero(
                req.params.id,
                "La compra"
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

        if (motivo.length < 5) {
            return res
                .status(400)
                .json({
                    mensaje:
                        "El motivo de anulación debe tener al menos 5 caracteres"
                });
        }

        const compra =
            await comprasModel.anularCompra({
                idCompra,
                idUsuario,
                motivo
            });

        return res.json({
            mensaje:
                "Compra anulada correctamente",

            compra
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al anular la compra"
        );
    }
}

module.exports = {
    registrarCompra,
    listarCompras,
    obtenerCompra,
    anularCompra
};