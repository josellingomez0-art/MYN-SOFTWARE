const pool = require("../config/database");

function crearError(
    mensaje,
    status = 400
) {
    const error = new Error(mensaje);
    error.status = status;

    return error;
}

async function obtenerCatalogoPermisos() {
    const [rows] = await pool.query(
        `
        SELECT
            id,
            nombre,
            descripcion,
            estado
        FROM permisos
        WHERE estado = TRUE
        ORDER BY nombre
        `
    );

    return rows;
}

async function obtenerPermisosDeRol(
    idRol,
    conexion = pool
) {
    const [rows] = await conexion.query(
        `
        SELECT
            p.id,
            p.nombre,
            p.descripcion,
            p.estado
        FROM rol_permiso rp

        INNER JOIN permisos p
            ON p.id = rp.id_permiso

        WHERE rp.id_rol = ?
          AND p.estado = TRUE

        ORDER BY p.nombre
        `,
        [idRol]
    );

    return rows;
}

async function obtenerNombresPermisosDeRol(
    idRol
) {
    const permisos =
        await obtenerPermisosDeRol(
            idRol
        );

    return permisos.map(
        (permiso) =>
            permiso.nombre
    );
}

async function obtenerRol(
    idRol,
    conexion = pool
) {
    const [rows] = await conexion.query(
        `
        SELECT
            id,
            nombre,
            estado
        FROM roles
        WHERE id = ?
        LIMIT 1
        `,
        [idRol]
    );

    return rows[0] || null;
}

async function permisosExisten(
    idsPermisos,
    conexion
) {
    if (!idsPermisos.length) {
        return true;
    }

    const [rows] = await conexion.query(
        `
        SELECT COUNT(*) AS cantidad
        FROM permisos
        WHERE id IN (?)
          AND estado = TRUE
        `,
        [idsPermisos]
    );

    return Number(
        rows[0].cantidad
    ) === idsPermisos.length;
}

function esRolAdministrador(
    nombre
) {
    return [
        "administrador",
        "admin"
    ].includes(
        String(nombre || "")
            .trim()
            .toLowerCase()
    );
}

async function reemplazarPermisosDeRol(
    idRol,
    idsPermisos
) {
    const conexion =
        await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const rol =
            await obtenerRol(
                idRol,
                conexion
            );

        if (!rol) {
            throw crearError(
                "Rol no encontrado",
                404
            );
        }

        const idsNormalizados =
            [
                ...new Set(
                    idsPermisos.map(
                        (id) => Number(id)
                    )
                )
            ];

        if (
            idsNormalizados.some(
                (id) =>
                    !Number.isInteger(id) ||
                    id < 1
            )
        ) {
            throw crearError(
                "La lista de permisos contiene valores inválidos"
            );
        }

        if (
            !await permisosExisten(
                idsNormalizados,
                conexion
            )
        ) {
            throw crearError(
                "Uno o más permisos no existen o están inactivos"
            );
        }

        if (
            esRolAdministrador(
                rol.nombre
            )
        ) {
            const [permisosCriticos] =
                await conexion.query(
                    `
                    SELECT id
                    FROM permisos
                    WHERE nombre IN (
                        'roles.gestionar',
                        'usuarios.ver',
                        'usuarios.gestionar'
                    )
                    AND estado = TRUE
                    `
                );

            const faltantes =
                permisosCriticos.filter(
                    (permiso) =>
                        !idsNormalizados.includes(
                            Number(permiso.id)
                        )
                );

            if (faltantes.length) {
                throw crearError(
                    "No puedes quitar permisos críticos al rol Administrador"
                );
            }
        }

        await conexion.query(
            `
            DELETE FROM rol_permiso
            WHERE id_rol = ?
            `,
            [idRol]
        );

        if (idsNormalizados.length) {
            const valores =
                idsNormalizados.map(
                    (idPermiso) => [
                        idRol,
                        idPermiso
                    ]
                );

            await conexion.query(
                `
                INSERT INTO rol_permiso (
                    id_rol,
                    id_permiso
                )
                VALUES ?
                `,
                [valores]
            );
        }

        await conexion.commit();

        return await obtenerPermisosDeRol(
            idRol
        );
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
}

module.exports = {
    obtenerCatalogoPermisos,
    obtenerPermisosDeRol,
    obtenerNombresPermisosDeRol,
    reemplazarPermisosDeRol
};