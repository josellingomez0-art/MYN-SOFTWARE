const pool = require("../config/database");

function crearError(
    mensaje,
    status = 400
) {
    const error = new Error(mensaje);
    error.status = status;

    return error;
}

async function obtenerRoles({
    buscar = "",
    estado = "todos"
} = {}) {
    const filtros = [];
    const valores = [];

    if (buscar) {
        const termino = `%${buscar}%`;

        filtros.push(`
            (
                r.nombre LIKE ?
                OR r.descripcion LIKE ?
            )
        `);

        valores.push(
            termino,
            termino
        );
    }

    if (estado === "activos") {
        filtros.push(
            "r.estado = TRUE"
        );
    }

    if (estado === "inactivos") {
        filtros.push(
            "r.estado = FALSE"
        );
    }

    const where = filtros.length
        ? `WHERE ${filtros.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
        `
        SELECT
            r.id,
            r.nombre,
            r.descripcion,
            r.estado,

            COUNT(
                DISTINCT u.id
            ) AS cantidad_empleados,

            SUM(
                CASE
                    WHEN u.estado = TRUE
                        THEN 1
                    ELSE 0
                END
            ) AS empleados_activos,

            COUNT(
                DISTINCT rp.id_permiso
            ) AS cantidad_permisos

        FROM roles r

        LEFT JOIN usuarios u
            ON u.id_rol = r.id

        LEFT JOIN rol_permiso rp
            ON rp.id_rol = r.id

        ${where}

        GROUP BY
            r.id,
            r.nombre,
            r.descripcion,
            r.estado

        ORDER BY
            r.nombre,
            r.id
        `,
        valores
    );

    return rows;
}

async function obtenerRolPorId(
    id,
    conexion = pool
) {
    const [rows] = await conexion.query(
        `
        SELECT
            r.id,
            r.nombre,
            r.descripcion,
            r.estado,

            COUNT(
                DISTINCT u.id
            ) AS cantidad_empleados,

            SUM(
                CASE
                    WHEN u.estado = TRUE
                        THEN 1
                    ELSE 0
                END
            ) AS empleados_activos,

            COUNT(
                DISTINCT rp.id_permiso
            ) AS cantidad_permisos

        FROM roles r

        LEFT JOIN usuarios u
            ON u.id_rol = r.id

        LEFT JOIN rol_permiso rp
            ON rp.id_rol = r.id

        WHERE r.id = ?

        GROUP BY
            r.id,
            r.nombre,
            r.descripcion,
            r.estado

        LIMIT 1
        `,
        [id]
    );

    return rows[0] || null;
}

async function existeNombre(
    nombre,
    excluirId = null,
    conexion = pool
) {
    let sql = `
        SELECT id
        FROM roles
        WHERE LOWER(nombre) = LOWER(?)
    `;

    const valores = [nombre];

    if (excluirId) {
        sql += " AND id <> ?";
        valores.push(excluirId);
    }

    sql += " LIMIT 1";

    const [rows] = await conexion.query(
        sql,
        valores
    );

    return rows.length > 0;
}

function esNombreAdministrador(
    nombre
) {
    const normalizado =
        String(nombre || "")
            .trim()
            .toLowerCase();

    return [
        "administrador",
        "admin"
    ].includes(normalizado);
}

async function crearRol(datos) {
    if (
        await existeNombre(
            datos.nombre
        )
    ) {
        throw crearError(
            "Ya existe un rol con ese nombre",
            409
        );
    }

    const [resultado] = await pool.query(
        `
        INSERT INTO roles (
            nombre,
            descripcion,
            estado
        )
        VALUES (?, ?, TRUE)
        `,
        [
            datos.nombre,
            datos.descripcion
        ]
    );

    return await obtenerRolPorId(
        resultado.insertId
    );
}

async function actualizarRol(
    id,
    datos
) {
    const rol =
        await obtenerRolPorId(id);

    if (!rol) {
        throw crearError(
            "Rol no encontrado",
            404
        );
    }

    if (
        await existeNombre(
            datos.nombre,
            id
        )
    ) {
        throw crearError(
            "Ya existe otro rol con ese nombre",
            409
        );
    }

    if (
        esNombreAdministrador(
            rol.nombre
        ) &&
        !esNombreAdministrador(
            datos.nombre
        )
    ) {
        throw crearError(
            "El rol Administrador no puede cambiar de nombre"
        );
    }

    if (
        esNombreAdministrador(
            rol.nombre
        ) &&
        !datos.estado
    ) {
        throw crearError(
            "El rol Administrador no puede desactivarse"
        );
    }

    await pool.query(
        `
        UPDATE roles
        SET
            nombre = ?,
            descripcion = ?,
            estado = ?
        WHERE id = ?
        `,
        [
            datos.nombre,
            datos.descripcion,
            datos.estado,
            id
        ]
    );

    return await obtenerRolPorId(id);
}

async function cambiarEstadoRol(
    id,
    estado
) {
    const rol =
        await obtenerRolPorId(id);

    if (!rol) {
        throw crearError(
            "Rol no encontrado",
            404
        );
    }

    if (
        esNombreAdministrador(
            rol.nombre
        ) &&
        !estado
    ) {
        throw crearError(
            "El rol Administrador no puede desactivarse"
        );
    }

    if (
        !estado &&
        Number(rol.empleados_activos) > 0
    ) {
        throw crearError(
            "No puedes desactivar un rol que tiene empleados activos"
        );
    }

    await pool.query(
        `
        UPDATE roles
        SET estado = ?
        WHERE id = ?
        `,
        [
            estado,
            id
        ]
    );

    return await obtenerRolPorId(id);
}

async function obtenerEstadisticas() {
    const [rows] = await pool.query(
        `
        SELECT
            COUNT(*) AS total_roles,

            SUM(
                CASE
                    WHEN estado = TRUE
                        THEN 1
                    ELSE 0
                END
            ) AS roles_activos,

            SUM(
                CASE
                    WHEN estado = FALSE
                        THEN 1
                    ELSE 0
                END
            ) AS roles_inactivos,

            (
                SELECT COUNT(*)
                FROM permisos
                WHERE estado = TRUE
            ) AS permisos_activos

        FROM roles
        `
    );

    return rows[0];
}

module.exports = {
    obtenerRoles,
    obtenerRolPorId,
    crearRol,
    actualizarRol,
    cambiarEstadoRol,
    obtenerEstadisticas,
    esNombreAdministrador
};