const permisosModel = require(
    "../models/permisos.model"
);

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

async function listarCatalogo(
    req,
    res
) {
    try {
        const permisos =
            await permisosModel
                .obtenerCatalogoPermisos();

        return res.json(permisos);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al listar los permisos"
        );
    }
}

async function misPermisos(
    req,
    res
) {
    try {
        const permisos =
            await permisosModel
                .obtenerNombresPermisosDeRol(
                    req.usuario.rol
                );

        return res.json(permisos);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al obtener tus permisos"
        );
    }
}

async function permisosDeRol(
    req,
    res
) {
    try {
        const idRol =
            entero(
                req.params.idRol,
                "El rol"
            );

        const permisos =
            await permisosModel
                .obtenerPermisosDeRol(
                    idRol
                );

        return res.json(permisos);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al obtener los permisos del rol"
        );
    }
}

async function actualizarPermisosDeRol(
    req,
    res
) {
    try {
        const idRol =
            entero(
                req.params.idRol,
                "El rol"
            );

        if (
            !Array.isArray(
                req.body.permisos
            )
        ) {
            return res
                .status(400)
                .json({
                    mensaje:
                        "Debes enviar una lista de permisos"
                });
        }

        const permisos =
            await permisosModel
                .reemplazarPermisosDeRol(
                    idRol,
                    req.body.permisos
                );

        return res.json({
            mensaje:
                "Permisos del rol actualizados correctamente",

            permisos
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al actualizar los permisos del rol"
        );
    }
}

module.exports = {
    listarCatalogo,
    misPermisos,
    permisosDeRol,
    actualizarPermisosDeRol
};