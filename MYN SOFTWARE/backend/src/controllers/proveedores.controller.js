const proveedoresModel = require(
    "../models/proveedores.model"
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

function correoValido(correo) {
    if (!correo) {
        return true;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        correo
    );
}

function normalizarProveedor(body) {
    const razonSocial =
        texto(
            body.razon_social,
            150
        );

    const correo =
        texto(
            body.correo,
            150
        ).toLowerCase();

    if (!razonSocial) {
        const error = new Error(
            "La razón social es obligatoria"
        );

        error.status = 400;

        throw error;
    }

    if (!correoValido(correo)) {
        const error = new Error(
            "El correo electrónico no es válido"
        );

        error.status = 400;

        throw error;
    }

    return {
        nit:
            texto(
                body.nit,
                30
            ).toUpperCase() || null,

        razon_social:
            razonSocial,

        contacto:
            texto(
                body.contacto,
                120
            ) || null,

        telefono:
            texto(
                body.telefono,
                30
            ) || null,

        correo:
            correo || null,

        direccion:
            texto(
                body.direccion,
                200
            ) || null,

        ciudad:
            texto(
                body.ciudad,
                100
            ) || null,

        estado:
            body.estado === undefined
                ? true
                : Boolean(body.estado)
    };
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

async function listarProveedores(
    req,
    res
) {
    try {
        const estadosPermitidos = [
            "todos",
            "activos",
            "inactivos"
        ];

        const estado =
            estadosPermitidos.includes(
                req.query.estado
            )
                ? req.query.estado
                : "todos";

        const proveedores =
            await proveedoresModel
                .obtenerProveedores({
                    buscar:
                        texto(
                            req.query.buscar,
                            100
                        ),

                    estado
                });

        return res.json(proveedores);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al listar proveedores"
        );
    }
}

async function obtenerEstadisticas(
    req,
    res
) {
    try {
        const estadisticas =
            await proveedoresModel
                .obtenerEstadisticas();

        return res.json(estadisticas);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar estadísticas"
        );
    }
}

async function obtenerProveedor(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "El proveedor"
            );

        const proveedor =
            await proveedoresModel
                .obtenerProveedorPorId(id);

        if (!proveedor) {
            return res
                .status(404)
                .json({
                    mensaje:
                        "Proveedor no encontrado"
                });
        }

        return res.json(proveedor);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar proveedor"
        );
    }
}

async function obtenerHistorial(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "El proveedor"
            );

        const historial =
            await proveedoresModel
                .obtenerHistorialProveedor(id);

        return res.json(historial);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar historial del proveedor"
        );
    }
}

async function crearProveedor(
    req,
    res
) {
    try {
        const proveedor =
            await proveedoresModel
                .crearProveedor(
                    normalizarProveedor(
                        req.body
                    )
                );

        return res
            .status(201)
            .json({
                mensaje:
                    "Proveedor creado correctamente",

                proveedor
            });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al crear proveedor"
        );
    }
}

async function actualizarProveedor(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "El proveedor"
            );

        const proveedor =
            await proveedoresModel
                .actualizarProveedor(
                    id,
                    normalizarProveedor(
                        req.body
                    )
                );

        return res.json({
            mensaje:
                "Proveedor actualizado correctamente",

            proveedor
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al actualizar proveedor"
        );
    }
}

async function cambiarEstado(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "El proveedor"
            );

        const estado =
            Boolean(
                req.body.estado
            );

        const actualizado =
            await proveedoresModel
                .cambiarEstadoProveedor(
                    id,
                    estado
                );

        if (!actualizado) {
            return res
                .status(404)
                .json({
                    mensaje:
                        "Proveedor no encontrado"
                });
        }

        return res.json({
            mensaje:
                estado
                    ? "Proveedor activado correctamente"
                    : "Proveedor desactivado correctamente"
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al cambiar el estado del proveedor"
        );
    }
}

module.exports = {
    listarProveedores,
    obtenerEstadisticas,
    obtenerProveedor,
    obtenerHistorial,
    crearProveedor,
    actualizarProveedor,
    cambiarEstado
};