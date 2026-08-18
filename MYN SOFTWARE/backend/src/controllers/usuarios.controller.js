const bcrypt = require("bcryptjs");

const usuariosModel = require(
    "../models/usuarios.model"
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

function correoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        correo
    );
}

function passwordValido(password) {
    return (
        typeof password === "string" &&
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password)
    );
}

function normalizarUsuario(body) {
    const nombres =
        texto(
            body.nombres,
            120
        );

    const apellidos =
        texto(
            body.apellidos,
            120
        );

    const correo =
        texto(
            body.correo,
            150
        ).toLowerCase();

    if (!nombres) {
        const error = new Error(
            "Los nombres son obligatorios"
        );

        error.status = 400;
        throw error;
    }

    if (!apellidos) {
        const error = new Error(
            "Los apellidos son obligatorios"
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
        id_rol:
            entero(
                body.id_rol,
                "El rol"
            ),

        nombres,
        apellidos,

        documento:
            texto(
                body.documento,
                30
            ) || null,

        telefono:
            texto(
                body.telefono,
                30
            ) || null,

        correo,

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

async function listarUsuarios(
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

        const usuarios =
            await usuariosModel
                .obtenerUsuarios({
                    buscar:
                        texto(
                            req.query.buscar,
                            100
                        ),

                    estado,

                    idRol:
                        req.query.id_rol
                            ? entero(
                                  req.query.id_rol,
                                  "El rol"
                              )
                            : null
                });

        return res.json(usuarios);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al listar empleados"
        );
    }
}

async function obtenerEstadisticas(
    req,
    res
) {
    try {
        const datos =
            await usuariosModel
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

async function obtenerUsuario(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "El empleado"
            );

        const usuario =
            await usuariosModel
                .obtenerUsuarioPorId(id);

        if (!usuario) {
            return res
                .status(404)
                .json({
                    mensaje:
                        "Empleado no encontrado"
                });
        }

        return res.json(usuario);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar empleado"
        );
    }
}

async function obtenerActividad(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "El empleado"
            );

        const actividad =
            await usuariosModel
                .obtenerActividadUsuario(id);

        return res.json(actividad);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar actividad"
        );
    }
}

async function crearUsuario(
    req,
    res
) {
    try {
        const datos =
            normalizarUsuario(
                req.body
            );

        const password =
            String(
                req.body.password || ""
            );

        if (!passwordValido(password)) {
            return res
                .status(400)
                .json({
                    mensaje:
                        "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número"
                });
        }

        datos.password =
            await bcrypt.hash(
                password,
                12
            );

        const usuario =
            await usuariosModel
                .crearUsuario(datos);

        return res
            .status(201)
            .json({
                mensaje:
                    "Empleado creado correctamente",

                usuario
            });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al crear empleado"
        );
    }
}

async function actualizarUsuario(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "El empleado"
            );

        const idUsuarioActual =
            entero(
                req.usuario.id,
                "El usuario autenticado"
            );

        const usuario =
            await usuariosModel
                .actualizarUsuario(
                    id,
                    normalizarUsuario(
                        req.body
                    ),
                    idUsuarioActual
                );

        return res.json({
            mensaje:
                "Empleado actualizado correctamente",

            usuario
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al actualizar empleado"
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
                "El empleado"
            );

        const idUsuarioActual =
            entero(
                req.usuario.id,
                "El usuario autenticado"
            );

        const estado =
            Boolean(
                req.body.estado
            );

        const usuario =
            await usuariosModel
                .cambiarEstadoUsuario({
                    id,
                    estado,
                    idUsuarioActual
                });

        return res.json({
            mensaje:
                estado
                    ? "Empleado activado correctamente"
                    : "Empleado desactivado correctamente",

            usuario
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al cambiar estado del empleado"
        );
    }
}

async function cambiarPassword(
    req,
    res
) {
    try {
        const id =
            entero(
                req.params.id,
                "El empleado"
            );

        const password =
            String(
                req.body.password || ""
            );

        const confirmacion =
            String(
                req.body.confirmacion || ""
            );

        if (password !== confirmacion) {
            return res
                .status(400)
                .json({
                    mensaje:
                        "Las contraseñas no coinciden"
                });
        }

        if (!passwordValido(password)) {
            return res
                .status(400)
                .json({
                    mensaje:
                        "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número"
                });
        }

        const hash =
            await bcrypt.hash(
                password,
                12
            );

        await usuariosModel
            .cambiarPassword(
                id,
                hash
            );

        return res.json({
            mensaje:
                "Contraseña actualizada correctamente"
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al cambiar la contraseña"
        );
    }
}

module.exports = {
    listarUsuarios,
    obtenerEstadisticas,
    obtenerUsuario,
    obtenerActividad,
    crearUsuario,
    actualizarUsuario,
    cambiarEstado,
    cambiarPassword
};