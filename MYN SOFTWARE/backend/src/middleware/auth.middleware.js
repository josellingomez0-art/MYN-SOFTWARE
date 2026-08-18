const jwt = require("jsonwebtoken");
const pool = require("../config/database");

/**
 * Verifica que la petición traiga un token JWT válido en el header
 * Authorization: Bearer <token>
 * Si es válido, agrega los datos del usuario a req.usuario y continúa.
 * Si no, responde 401.
 */
function verificarToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({
            mensaje: "Token no proporcionado"
        });
    }

    const partes = authHeader.split(" ");

    if (partes.length !== 2 || partes[0] !== "Bearer") {
        return res.status(401).json({
            mensaje: "Formato de token inválido"
        });
    }

    const token = partes[1];

    try {

        const payload = jwt.verify(token, process.env.JWT_SECRET);

        req.usuario = payload; // { id, rol, correo }

        next();

    } catch (error) {

        return res.status(401).json({
            mensaje: "Token inválido o expirado"
        });

    }

}

/**
 * Middleware de autorización por rol.
 * Uso: verificarRol(1) donde 1 es el id_rol permitido, o varios ids.
 * Debe usarse siempre DESPUÉS de verificarToken.
 */
function verificarRol(...rolesPermitidos) {

    return (req, res, next) => {

        if (!req.usuario) {
            return res.status(401).json({
                mensaje: "No autenticado"
            });
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                mensaje: "No tiene permisos para realizar esta acción"
            });
        }

        next();

    };

}

/**
 * Middleware de autorización por permiso granular.
 * Consulta rol_permiso en cada petición (así un cambio de permisos
 * se aplica de inmediato, sin esperar a que expire el token).
 * Uso: verificarPermiso("productos.gestionar")
 * Debe usarse siempre DESPUÉS de verificarToken.
 */
function verificarPermiso(nombrePermiso) {

    return async (req, res, next) => {

        if (!req.usuario) {
            return res.status(401).json({
                mensaje: "No autenticado"
            });
        }

        try {

            const [rows] = await pool.query(
                `
                SELECT 1
                FROM rol_permiso rp
                INNER JOIN permisos p ON rp.id_permiso = p.id
                WHERE rp.id_rol = ? AND p.nombre = ? AND p.estado = TRUE
                LIMIT 1
                `,
                [req.usuario.rol, nombrePermiso]
            );

            if (rows.length === 0) {
                return res.status(403).json({
                    mensaje: "No tienes permiso para realizar esta acción"
                });
            }

            next();

        } catch (error) {

            console.error(error);

            res.status(500).json({
                mensaje: "Error al verificar permisos"
            });

        }

    };

}

module.exports = {
    verificarToken,
    verificarRol,
    verificarPermiso
};
