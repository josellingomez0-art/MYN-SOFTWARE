const inventarioModel = require(
    "../models/inventario.model"
);

function numeroEntero(
    valor,
    nombre,
    minimo = 0
) {
    const numero = Number(valor);

    if (
        !Number.isInteger(numero) ||
        numero < minimo
    ) {
        const error = new Error(
            `${nombre} no es válido`
        );

        error.status = 400;
        throw error;
    }

    return numero;
}

function texto(
    valor,
    maximo = 255
) {
    return String(valor ?? "")
        .trim()
        .slice(0, maximo);
}

function responderError(
    res,
    error,
    mensajeGeneral
) {
    console.error(error);

    return res
        .status(error.status || 500)
        .json({
            mensaje:
                error.status
                    ? error.message
                    : mensajeGeneral
        });
}

async function listarInventario(
    req,
    res
) {
    try {
        const estadosPermitidos = [
            "todos",
            "normal",
            "bajo",
            "agotado"
        ];

        const estado =
            estadosPermitidos.includes(
                req.query.estado
            )
                ? req.query.estado
                : "todos";

        const inventario =
            await inventarioModel.obtenerInventario({
                buscar: texto(
                    req.query.buscar,
                    100
                ),
                estado
            });

        return res.json(inventario);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al listar el inventario"
        );
    }
}

async function obtenerInventarioProducto(
    req,
    res
) {
    try {
        const idProducto =
            numeroEntero(
                req.params.idProducto,
                "El producto",
                1
            );

        const inventario =
            await inventarioModel
                .obtenerInventarioPorProducto(
                    idProducto
                );

        if (!inventario) {
            return res.status(404).json({
                mensaje:
                    "El producto no tiene registro de inventario"
            });
        }

        return res.json(inventario);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar el inventario"
        );
    }
}

async function listarHistorial(
    req,
    res
) {
    try {
        const idProducto =
            req.query.id_producto
                ? numeroEntero(
                      req.query.id_producto,
                      "El producto",
                      1
                  )
                : null;

        const limite =
            req.query.limite
                ? Math.min(
                      numeroEntero(
                          req.query.limite,
                          "El límite",
                          1
                      ),
                      500
                  )
                : 100;

        const historial =
            await inventarioModel.obtenerHistorial({
                idProducto,
                limite
            });

        return res.json(historial);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar el historial"
        );
    }
}

async function ajustarStock(
    req,
    res
) {
    try {
        const idProducto =
            numeroEntero(
                req.params.idProducto,
                "El producto",
                1
            );

        const tipo =
            texto(
                req.body.tipo,
                20
            ).toUpperCase();

        if (
            ![
                "ENTRADA",
                "SALIDA",
                "AJUSTE"
            ].includes(tipo)
        ) {
            return res.status(400).json({
                mensaje:
                    "El tipo debe ser ENTRADA, SALIDA o AJUSTE"
            });
        }

        const cantidad =
            numeroEntero(
                req.body.cantidad,
                "La cantidad",
                tipo === "AJUSTE" ? 0 : 1
            );

        const motivo =
            texto(
                req.body.motivo,
                250
            );

        if (motivo.length < 5) {
            return res.status(400).json({
                mensaje:
                    "El motivo debe tener al menos 5 caracteres"
            });
        }

        const idUsuario =
            numeroEntero(
                req.usuario.id,
                "El usuario",
                1
            );

        const resultado =
            await inventarioModel.ajustarStock({
                idProducto,
                idUsuario,
                tipo,
                cantidad,
                motivo,
                ubicacion:
                    texto(
                        req.body.ubicacion,
                        120
                    ) || null
            });

        return res.json({
            mensaje:
                "Inventario actualizado correctamente",
            inventario: resultado
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al ajustar el inventario"
        );
    }
}

module.exports = {
    listarInventario,
    obtenerInventarioProducto,
    listarHistorial,
    ajustarStock
};