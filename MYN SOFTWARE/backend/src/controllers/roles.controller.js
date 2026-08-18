const rolesModel = require(
    "../models/roles.model"
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

function normalizarRol(body) {
    const nombre =
        texto(
            body.nombre,
            80
        );

    if (nombre.length < 3) {
        const error = new Error(
            "El nombre del rol debe tener al menos 3 caracteres"
        );

        error.status = 400;
        throw error;
    }

    return {
        nombre,

        descripcion:
            texto(
                body.descripcion,
                250
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

async function listarRoles(
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

        const roles =
            await rolesModel.obtenerRoles({
                buscar:
                    texto(
                        req.query.buscar,
                        100
                    ),

                estado
            });

        return res.json(roles);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al listar los roles"
        );
    }
}

async function obtenerEstadisticas(
    req,
    res
) {
    try {
        const datos =
            await rolesModel
                .obtenerEstadisticas();

        return res.json(datos);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar estadísticas"
        );
    }
}

async function obtenerRol(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "El rol"
            );

        const rol =
            await rolesModel
                .obtenerRolPorId(id);

        if (!rol) {
            return res
                .status(404)
                .json({
                    mensaje:
                        "Rol no encontrado"
                });
        }

        return res.json(rol);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar el rol"
        );
    }
}

async function crearRol(
    req,
    res
) {
    try {
        const rol =
            await rolesModel.crearRol(
                normalizarRol(
                    req.body
                )
            );

        return res
            .status(201)
            .json({
                mensaje:
                    "Rol creado correctamente",

                rol
            });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al crear el rol"
        );
    }
}

async function actualizarRol(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "El rol"
            );

        const rol =
            await rolesModel.actualizarRol(
                id,
                normalizarRol(
                    req.body
                )
            );

        return res.json({
            mensaje:
                "Rol actualizado correctamente",

            rol
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al actualizar el rol"
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
                "El rol"
            );

        const estado =
            Boolean(
                req.body.estado
            );

        const rol =
            await rolesModel
                .cambiarEstadoRol(
                    id,
                    estado
                );

        return res.json({
            mensaje:
                estado
                    ? "Rol activado correctamente"
                    : "Rol desactivado correctamente",

            rol
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al cambiar el estado del rol"
        );
    }
}

module.exports = {
    listarRoles,
    obtenerEstadisticas,
    obtenerRol,
    crearRol,
    actualizarRol,
    cambiarEstado
};