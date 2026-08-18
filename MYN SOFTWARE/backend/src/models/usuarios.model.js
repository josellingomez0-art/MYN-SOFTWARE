const pool = require("../config/database");

function crearError(
    mensaje,
    status = 400
) {
    const error = new Error(mensaje);
    error.status = status;

    return error;
}

async function obtenerUsuarios({
    buscar = "",
    estado = "todos",
    idRol = null
} = {}) {
    const filtros = [];
    const valores = [];

    if (buscar) {
        const termino = `%${buscar}%`;

        filtros.push(`
            (
                u.documento LIKE ?
                OR u.nombres LIKE ?
                OR u.apellidos LIKE ?
                OR u.telefono LIKE ?
                OR u.correo LIKE ?
                OR r.nombre LIKE ?
            )
        `);

        valores.push(
            termino,
            termino,
            termino,
            termino,
            termino,
            termino
        );
    }

    if (estado === "activos") {
        filtros.push("u.estado = TRUE");
    }

    if (estado === "inactivos") {
        filtros.push("u.estado = FALSE");
    }

    if (idRol) {
        filtros.push("u.id_rol = ?");
        valores.push(idRol);
    }

    const where = filtros.length
        ? `WHERE ${filtros.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
        `
        SELECT
            u.id,
            u.id_rol,
            u.nombres,
            u.apellidos,
            u.documento,
            u.telefono,
            u.correo,
            u.estado,
            u.ultimo_acceso,
            u.created_at,

            r.nombre AS rol,

            CONCAT(
                u.nombres,
                ' ',
                u.apellidos
            ) AS nombre_completo,

            (
                SELECT COUNT(*)
                FROM ventas v
                WHERE v.id_usuario = u.id
            ) AS cantidad_ventas,

            (
                SELECT COALESCE(
                    SUM(
                        CASE
                            WHEN v.estado <> 'ANULADA'
                                THEN v.total
                            ELSE 0
                        END
                    ),
                    0
                )
                FROM ventas v
                WHERE v.id_usuario = u.id
            ) AS total_vendido,

            (
                SELECT COUNT(*)
                FROM compras c
                WHERE c.id_usuario = u.id
            ) AS cantidad_compras

        FROM usuarios u

        INNER JOIN roles r
            ON r.id = u.id_rol

        ${where}

        ORDER BY
            u.nombres,
            u.apellidos,
            u.id
        `,
        valores
    );

    return rows;
}

async function obtenerUsuarioPorId(
    id,
    conexion = pool
) {
    const [rows] = await conexion.query(
        `
        SELECT
            u.id,
            u.id_rol,
            u.nombres,
            u.apellidos,
            u.documento,
            u.telefono,
            u.correo,
            u.estado,
            u.ultimo_acceso,
            u.created_at,

            r.nombre AS rol,

            CONCAT(
                u.nombres,
                ' ',
                u.apellidos
            ) AS nombre_completo,

            (
                SELECT COUNT(*)
                FROM ventas v
                WHERE v.id_usuario = u.id
            ) AS cantidad_ventas,

            (
                SELECT COALESCE(
                    SUM(
                        CASE
                            WHEN v.estado <> 'ANULADA'
                                THEN v.total
                            ELSE 0
                        END
                    ),
                    0
                )
                FROM ventas v
                WHERE v.id_usuario = u.id
            ) AS total_vendido,

            (
                SELECT COUNT(*)
                FROM compras c
                WHERE c.id_usuario = u.id
            ) AS cantidad_compras

        FROM usuarios u

        INNER JOIN roles r
            ON r.id = u.id_rol

        WHERE u.id = ?

        LIMIT 1
        `,
        [id]
    );

    return rows[0] || null;
}

async function existeDocumento(
    documento,
    excluirId = null,
    conexion = pool
) {
    if (!documento) {
        return false;
    }

    let sql = `
        SELECT id
        FROM usuarios
        WHERE documento = ?
    `;

    const valores = [documento];

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

async function existeCorreo(
    correo,
    excluirId = null,
    conexion = pool
) {
    let sql = `
        SELECT id
        FROM usuarios
        WHERE correo = ?
    `;

    const valores = [correo];

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

async function rolExiste(
    idRol,
    conexion = pool
) {
    const [rows] = await conexion.query(
        `
        SELECT id
        FROM roles
        WHERE id = ?
        LIMIT 1
        `,
        [idRol]
    );

    return rows.length > 0;
}

async function esRolAdministrador(
    idRol,
    conexion = pool
) {
    const [rows] = await conexion.query(
        `
        SELECT id
        FROM roles
        WHERE id = ?
          AND LOWER(nombre) IN (
              'administrador',
              'admin'
          )
        LIMIT 1
        `,
        [idRol]
    );

    return rows.length > 0;
}

async function contarAdministradoresActivos(
    conexion = pool
) {
    const [rows] = await conexion.query(
        `
        SELECT COUNT(*) AS cantidad
        FROM usuarios u

        INNER JOIN roles r
            ON r.id = u.id_rol

        WHERE u.estado = TRUE
          AND LOWER(r.nombre) IN (
              'administrador',
              'admin'
          )
        `
    );

    return Number(
        rows[0].cantidad
    );
}

async function crearUsuario(datos) {
    const conexion =
        await pool.getConnection();

    try {
        await conexion.beginTransaction();

        if (
            !await rolExiste(
                datos.id_rol,
                conexion
            )
        ) {
            throw crearError(
                "El rol seleccionado no existe"
            );
        }

        if (
            await existeDocumento(
                datos.documento,
                null,
                conexion
            )
        ) {
            throw crearError(
                "Ya existe un empleado con ese documento",
                409
            );
        }

        if (
            await existeCorreo(
                datos.correo,
                null,
                conexion
            )
        ) {
            throw crearError(
                "Ya existe un empleado con ese correo",
                409
            );
        }

        const [resultado] =
            await conexion.query(
                `
                INSERT INTO usuarios (
                    id_rol,
                    nombres,
                    apellidos,
                    documento,
                    telefono,
                    correo,
                    password,
                    estado
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
                `,
                [
                    datos.id_rol,
                    datos.nombres,
                    datos.apellidos,
                    datos.documento,
                    datos.telefono,
                    datos.correo,
                    datos.password
                ]
            );

        await conexion.commit();

        return await obtenerUsuarioPorId(
            resultado.insertId
        );
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
}

async function actualizarUsuario(
    id,
    datos,
    idUsuarioActual
) {
    const conexion =
        await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const usuario =
            await obtenerUsuarioPorId(
                id,
                conexion
            );

        if (!usuario) {
            throw crearError(
                "Empleado no encontrado",
                404
            );
        }

        if (
            !await rolExiste(
                datos.id_rol,
                conexion
            )
        ) {
            throw crearError(
                "El rol seleccionado no existe"
            );
        }

        if (
            await existeDocumento(
                datos.documento,
                id,
                conexion
            )
        ) {
            throw crearError(
                "Ya existe otro empleado con ese documento",
                409
            );
        }

        if (
            await existeCorreo(
                datos.correo,
                id,
                conexion
            )
        ) {
            throw crearError(
                "Ya existe otro empleado con ese correo",
                409
            );
        }

        const eraAdministrador =
            await esRolAdministrador(
                usuario.id_rol,
                conexion
            );

        const seraAdministrador =
            await esRolAdministrador(
                datos.id_rol,
                conexion
            );

        if (
            eraAdministrador &&
            !seraAdministrador
        ) {
            const cantidad =
                await contarAdministradoresActivos(
                    conexion
                );

            if (
                usuario.estado &&
                cantidad <= 1
            ) {
                throw crearError(
                    "No puedes retirar el rol al último administrador activo"
                );
            }
        }

        if (
            Number(id) ===
                Number(idUsuarioActual) &&
            !datos.estado
        ) {
            throw crearError(
                "No puedes desactivar tu propia cuenta"
            );
        }

        await conexion.query(
            `
            UPDATE usuarios
            SET
                id_rol = ?,
                nombres = ?,
                apellidos = ?,
                documento = ?,
                telefono = ?,
                correo = ?,
                estado = ?
            WHERE id = ?
            `,
            [
                datos.id_rol,
                datos.nombres,
                datos.apellidos,
                datos.documento,
                datos.telefono,
                datos.correo,
                datos.estado,
                id
            ]
        );

        await conexion.commit();

        return await obtenerUsuarioPorId(id);
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
}

async function cambiarEstadoUsuario({
    id,
    estado,
    idUsuarioActual
}) {
    const conexion =
        await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const usuario =
            await obtenerUsuarioPorId(
                id,
                conexion
            );

        if (!usuario) {
            throw crearError(
                "Empleado no encontrado",
                404
            );
        }

        if (
            Number(id) ===
                Number(idUsuarioActual) &&
            !estado
        ) {
            throw crearError(
                "No puedes desactivar tu propia cuenta"
            );
        }

        if (
            usuario.estado &&
            !estado &&
            await esRolAdministrador(
                usuario.id_rol,
                conexion
            )
        ) {
            const cantidad =
                await contarAdministradoresActivos(
                    conexion
                );

            if (cantidad <= 1) {
                throw crearError(
                    "No puedes desactivar al último administrador activo"
                );
            }
        }

        await conexion.query(
            `
            UPDATE usuarios
            SET estado = ?
            WHERE id = ?
            `,
            [
                estado,
                id
            ]
        );

        await conexion.commit();

        return await obtenerUsuarioPorId(id);
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
}

async function cambiarPassword(
    id,
    password
) {
    const usuario =
        await obtenerUsuarioPorId(id);

    if (!usuario) {
        throw crearError(
            "Empleado no encontrado",
            404
        );
    }

    await pool.query(
        `
        UPDATE usuarios
        SET password = ?
        WHERE id = ?
        `,
        [
            password,
            id
        ]
    );

    return true;
}

async function obtenerActividadUsuario(
    idUsuario
) {
    const usuario =
        await obtenerUsuarioPorId(
            idUsuario
        );

    if (!usuario) {
        throw crearError(
            "Empleado no encontrado",
            404
        );
    }

    const [ventas] = await pool.query(
        `
        SELECT
            v.id,
            v.numero,
            v.fecha,
            v.total,
            v.estado,

            CONCAT(
                COALESCE(c.nombres, ''),
                ' ',
                COALESCE(c.apellidos, '')
            ) AS cliente,

            mp.nombre AS metodo_pago

        FROM ventas v

        LEFT JOIN clientes c
            ON c.id = v.id_cliente

        INNER JOIN metodos_pago mp
            ON mp.id = v.id_metodo_pago

        WHERE v.id_usuario = ?

        ORDER BY
            v.fecha DESC,
            v.id DESC

        LIMIT 100
        `,
        [idUsuario]
    );

    const [compras] = await pool.query(
        `
        SELECT
            c.id,
            c.numero,
            c.fecha,
            c.total,
            c.estado,

            pr.razon_social AS proveedor,

            c.forma_pago

        FROM compras c

        INNER JOIN proveedores pr
            ON pr.id = c.id_proveedor

        WHERE c.id_usuario = ?

        ORDER BY
            c.fecha DESC,
            c.id DESC

        LIMIT 100
        `,
        [idUsuario]
    );

    return {
        usuario,
        ventas,
        compras
    };
}

async function obtenerEstadisticas() {
    const [rows] = await pool.query(
        `
        SELECT
            COUNT(*) AS total_empleados,

            SUM(
                CASE
                    WHEN estado = TRUE
                        THEN 1
                    ELSE 0
                END
            ) AS empleados_activos,

            SUM(
                CASE
                    WHEN estado = FALSE
                        THEN 1
                    ELSE 0
                END
            ) AS empleados_inactivos,

            COUNT(
                DISTINCT id_rol
            ) AS roles_asignados

        FROM usuarios
        `
    );

    return rows[0];
}

module.exports = {
    obtenerUsuarios,
    obtenerUsuarioPorId,
    crearUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario,
    cambiarPassword,
    obtenerActividadUsuario,
    obtenerEstadisticas
};