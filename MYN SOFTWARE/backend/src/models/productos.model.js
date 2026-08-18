const pool = require("../config/database");

async function obtenerProductos({
    buscar = "",
    estado = "todos"
} = {}) {
    const filtros = [];
    const valores = [];

    if (buscar) {
        filtros.push(
            "(p.codigo LIKE ? OR p.nombre LIKE ? OR p.marca LIKE ?)"
        );

        const termino = `%${buscar}%`;

        valores.push(
            termino,
            termino,
            termino
        );
    }

    if (estado === "activos") {
        filtros.push(
            "p.estado = TRUE"
        );
    }

    if (estado === "inactivos") {
        filtros.push(
            "p.estado = FALSE"
        );
    }

    const where = filtros.length
        ? `WHERE ${filtros.join(" AND ")}`
        : "";

    const [rows] = await pool.query(
        `
        SELECT
            p.id,
            p.id_categoria,
            p.id_proveedor,
            p.codigo,
            p.nombre,
            p.descripcion,
            p.marca,
            p.unidad_medida,
            p.costo,
            p.precio,
            p.iva,
            p.stock_minimo,
            p.imagen,
            p.estado,
            p.created_at,
            p.updated_at,

            c.nombre AS categoria,

            pr.razon_social AS proveedor,

            COALESCE(
                i.stock_actual,
                0
            ) AS stock_actual,

            COALESCE(
                i.stock_reservado,
                0
            ) AS stock_reservado,

            COALESCE(
                i.stock_actual,
                0
            ) -
            COALESCE(
                i.stock_reservado,
                0
            ) AS stock_disponible

        FROM productos p

        INNER JOIN categorias c
            ON c.id = p.id_categoria

        LEFT JOIN proveedores pr
            ON pr.id = p.id_proveedor

        LEFT JOIN inventario i
            ON i.id_producto = p.id

        ${where}

        ORDER BY
            p.nombre,
            p.codigo
        `,
        valores
    );

    return rows;
}

async function obtenerProductoPorId(
    id,
    conexion = pool
) {
    const [rows] = await conexion.query(
        `
        SELECT
            p.*,

            c.nombre AS categoria,

            pr.razon_social AS proveedor,

            COALESCE(
                i.stock_actual,
                0
            ) AS stock_actual,

            COALESCE(
                i.stock_reservado,
                0
            ) AS stock_reservado

        FROM productos p

        INNER JOIN categorias c
            ON c.id = p.id_categoria

        LEFT JOIN proveedores pr
            ON pr.id = p.id_proveedor

        LEFT JOIN inventario i
            ON i.id_producto = p.id

        WHERE p.id = ?

        LIMIT 1
        `,
        [id]
    );

    return rows[0] || null;
}

async function existeCodigo(
    codigo,
    excluirId = null,
    conexion = pool
) {
    let sql = `
        SELECT id
        FROM productos
        WHERE codigo = ?
    `;

    const valores = [codigo];

    if (excluirId) {
        sql += " AND id <> ?";
        valores.push(excluirId);
    }

    sql += " LIMIT 1";

    const [rows] =
        await conexion.query(
            sql,
            valores
        );

    return rows.length > 0;
}

async function validarRelaciones(
    idCategoria,
    idProveedor,
    conexion = pool
) {
    const [categorias] =
        await conexion.query(
            `
            SELECT id
            FROM categorias
            WHERE id = ?
              AND estado = TRUE
            LIMIT 1
            `,
            [idCategoria]
        );

    if (!categorias.length) {
        const error = new Error(
            "La categoría seleccionada no existe o está inactiva"
        );

        error.status = 400;
        throw error;
    }

    if (idProveedor) {
        const [proveedores] =
            await conexion.query(
                `
                SELECT id
                FROM proveedores
                WHERE id = ?
                  AND estado = TRUE
                LIMIT 1
                `,
                [idProveedor]
            );

        if (!proveedores.length) {
            const error = new Error(
                "El proveedor seleccionado no existe o está inactivo"
            );

            error.status = 400;
            throw error;
        }
    }
}

async function crearProducto(datos) {
    const conexion =
        await pool.getConnection();

    try {
        await conexion.beginTransaction();

        await validarRelaciones(
            datos.id_categoria,
            datos.id_proveedor,
            conexion
        );

        const codigoExiste =
            await existeCodigo(
                datos.codigo,
                null,
                conexion
            );

        if (codigoExiste) {
            const error = new Error(
                "Ya existe un producto con ese código"
            );

            error.status = 409;
            throw error;
        }

        const [resultado] =
            await conexion.query(
                `
                INSERT INTO productos (
                    id_categoria,
                    id_proveedor,
                    codigo,
                    nombre,
                    descripcion,
                    marca,
                    unidad_medida,
                    costo,
                    precio,
                    iva,
                    stock_minimo,
                    imagen,
                    estado
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    TRUE
                )
                `,
                [
                    datos.id_categoria,
                    datos.id_proveedor || null,
                    datos.codigo,
                    datos.nombre,
                    datos.descripcion || null,
                    datos.marca || null,
                    datos.unidad_medida ||
                        "Unidad",
                    datos.costo,
                    datos.precio,
                    datos.iva,
                    datos.stock_minimo,
                    datos.imagen || null
                ]
            );

        await conexion.query(
            `
            INSERT INTO inventario (
                id_producto,
                stock_actual,
                stock_reservado
            )
            VALUES (?, ?, 0)
            `,
            [
                resultado.insertId,
                datos.stock_inicial
            ]
        );

        await conexion.commit();

        return await obtenerProductoPorId(
            resultado.insertId
        );
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
}

async function actualizarProducto(
    id,
    datos
) {
    const conexion =
        await pool.getConnection();

    try {
        await conexion.beginTransaction();

        const actual =
            await obtenerProductoPorId(
                id,
                conexion
            );

        if (!actual) {
            const error = new Error(
                "Producto no encontrado"
            );

            error.status = 404;
            throw error;
        }

        await validarRelaciones(
            datos.id_categoria,
            datos.id_proveedor,
            conexion
        );

        const codigoExiste =
            await existeCodigo(
                datos.codigo,
                id,
                conexion
            );

        if (codigoExiste) {
            const error = new Error(
                "Ya existe otro producto con ese código"
            );

            error.status = 409;
            throw error;
        }

        await conexion.query(
            `
            UPDATE productos
            SET
                id_categoria = ?,
                id_proveedor = ?,
                codigo = ?,
                nombre = ?,
                descripcion = ?,
                marca = ?,
                unidad_medida = ?,
                costo = ?,
                precio = ?,
                iva = ?,
                stock_minimo = ?,
                imagen = ?,
                estado = ?
            WHERE id = ?
            `,
            [
                datos.id_categoria,
                datos.id_proveedor || null,
                datos.codigo,
                datos.nombre,
                datos.descripcion || null,
                datos.marca || null,
                datos.unidad_medida ||
                    "Unidad",
                datos.costo,
                datos.precio,
                datos.iva,
                datos.stock_minimo,
                datos.imagen ||
                    actual.imagen ||
                    null,
                datos.estado,
                id
            ]
        );

        await conexion.commit();

        return await obtenerProductoPorId(
            id
        );
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        conexion.release();
    }
}

async function cambiarEstadoProducto(
    id,
    estado
) {
    const [resultado] =
        await pool.query(
            `
            UPDATE productos
            SET estado = ?
            WHERE id = ?
            `,
            [
                estado,
                id
            ]
        );

    return resultado.affectedRows > 0;
}

module.exports = {
    obtenerProductos,
    obtenerProductoPorId,
    crearProducto,
    actualizarProducto,
    cambiarEstadoProducto
};