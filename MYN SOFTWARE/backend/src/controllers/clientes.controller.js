const clientesModel = require(
    "../models/clientes.model"
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
    const convertido = Number(valor);

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

function normalizarCliente(body) {
    const tiposPermitidos = [
        "CC",
        "CE",
        "NIT",
        "TI",
        "PASAPORTE",
        "OTRO"
    ];

    const tipoDocumento =
        texto(
            body.tipo_documento,
            10
        ).toUpperCase();

    const nombres =
        texto(
            body.nombres,
            120
        );

    const correo =
        texto(
            body.correo,
            150
        ).toLowerCase();

    if (
        !tiposPermitidos.includes(
            tipoDocumento
        )
    ) {
        const error = new Error(
            "El tipo de documento no es válido"
        );

        error.status = 400;

        throw error;
    }

    if (!nombres) {
        const error = new Error(
            "El nombre o razón social es obligatorio"
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
        tipo_documento:
            tipoDocumento,

        documento:
            texto(
                body.documento,
                30
            ) || null,

        nombres,

        apellidos:
            texto(
                body.apellidos,
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

async function listarClientes(
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

        const clientes =
            await clientesModel
                .obtenerClientes({
                    buscar:
                        texto(
                            req.query.buscar,
                            100
                        ),

                    estado
                });

        return res.json(clientes);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al listar clientes"
        );
    }
}

async function obtenerEstadisticas(
    req,
    res
) {
    try {
        const estadisticas =
            await clientesModel
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

async function obtenerCliente(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "El cliente"
            );

        const cliente =
            await clientesModel
                .obtenerClientePorId(id);

        if (!cliente) {
            return res
                .status(404)
                .json({
                    mensaje:
                        "Cliente no encontrado"
                });
        }

        return res.json(cliente);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar cliente"
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
                "El cliente"
            );

        const historial =
            await clientesModel
                .obtenerHistorialCliente(id);

        return res.json(historial);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar historial del cliente"
        );
    }
}

async function crearCliente(
    req,
    res
) {
    try {
        const cliente =
            await clientesModel
                .crearCliente(
                    normalizarCliente(
                        req.body
                    )
                );

        return res
            .status(201)
            .json({
                mensaje:
                    "Cliente creado correctamente",

                cliente
            });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al crear cliente"
        );
    }
}

async function actualizarCliente(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "El cliente"
            );

        const cliente =
            await clientesModel
                .actualizarCliente(
                    id,
                    normalizarCliente(
                        req.body
                    )
                );

        return res.json({
            mensaje:
                "Cliente actualizado correctamente",

            cliente
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al actualizar cliente"
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
                "El cliente"
            );

        const estado =
            Boolean(
                req.body.estado
            );

        const actualizado =
            await clientesModel
                .cambiarEstadoCliente(
                    id,
                    estado
                );

        if (!actualizado) {
            return res
                .status(404)
                .json({
                    mensaje:
                        "Cliente no encontrado"
                });
        }

        return res.json({
            mensaje:
                estado
                    ? "Cliente activado correctamente"
                    : "Cliente desactivado correctamente"
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al cambiar estado del cliente"
        );
    }
}

module.exports = {
    listarClientes,
    obtenerEstadisticas,
    obtenerCliente,
    obtenerHistorial,
    crearCliente,
    actualizarCliente,
    cambiarEstado
};