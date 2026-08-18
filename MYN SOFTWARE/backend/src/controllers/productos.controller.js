const productosModel = require("../models/productos.model");

function texto(valor, maximo = 255) {
    return String(valor ?? "").trim().slice(0, maximo);
}

function numero(
    valor,
    nombre,
    {
        minimo = 0,
        maximo = Number.MAX_SAFE_INTEGER,
        entero = false
    } = {}
) {
    const convertido = Number(valor);

    if (
        !Number.isFinite(convertido) ||
        convertido < minimo ||
        convertido > maximo ||
        (entero && !Number.isInteger(convertido))
    ) {
        const error = new Error(`${nombre} no es válido`);
        error.status = 400;
        throw error;
    }

    return convertido;
}

function normalizarProducto(body, esActualizacion = false) {
    const codigo = texto(body.codigo, 50).toUpperCase();
    const nombre = texto(body.nombre, 150);

    if (!codigo) {
        const error = new Error("El código es obligatorio");
        error.status = 400;
        throw error;
    }

    if (!nombre) {
        const error = new Error("El nombre es obligatorio");
        error.status = 400;
        throw error;
    }

    const costo = numero(
        body.costo,
        "El costo",
        { minimo: 0 }
    );

    const precio = numero(
        body.precio,
        "El precio",
        { minimo: 0 }
    );

    if (precio < costo) {
        const error = new Error(
            "El precio de venta no puede ser menor que el costo"
        );

        error.status = 400;
        throw error;
    }

    return {
        id_categoria: numero(
            body.id_categoria,
            "La categoría",
            {
                minimo: 1,
                entero: true
            }
        ),

        id_proveedor: body.id_proveedor
            ? numero(
                  body.id_proveedor,
                  "El proveedor",
                  {
                      minimo: 1,
                      entero: true
                  }
              )
            : null,

        codigo,
        nombre,

        descripcion: texto(
            body.descripcion,
            5000
        ),

        marca: texto(
            body.marca,
            100
        ),

        unidad_medida: texto(
            body.unidad_medida || "Unidad",
            30
        ),

        costo,
        precio,

        iva: numero(
            body.iva ?? 19,
            "El IVA",
            {
                minimo: 0,
                maximo: 100
            }
        ),

        stock_minimo: numero(
            body.stock_minimo ?? 5,
            "El stock mínimo",
            {
                minimo: 0,
                entero: true
            }
        ),

        stock_inicial: esActualizacion
            ? undefined
            : numero(
                  body.stock_inicial ?? 0,
                  "El stock inicial",
                  {
                      minimo: 0,
                      entero: true
                  }
              ),

        imagen:
            texto(
                body.imagen,
                255
            ) || null,

        estado: esActualizacion
            ? Boolean(body.estado)
            : true
    };
}

function responderError(
    res,
    error,
    mensajeGeneral
) {
    console.error(error);

    const estado =
        error.status ||
        (
            error.code === "ER_DUP_ENTRY"
                ? 409
                : 500
        );

    return res.status(estado).json({
        mensaje:
            estado === 500
                ? mensajeGeneral
                : error.message
    });
}

async function listarProductos(req, res) {
    try {
        const estadoPermitido = [
            "todos",
            "activos",
            "inactivos"
        ].includes(req.query.estado)
            ? req.query.estado
            : "todos";

        const productos =
            await productosModel.obtenerProductos({
                buscar: texto(
                    req.query.buscar,
                    100
                ),

                estado: estadoPermitido
            });

        return res.json(productos);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al listar productos"
        );
    }
}

async function obtenerProducto(req, res) {
    try {
        const id = numero(
            req.params.id,
            "El producto",
            {
                minimo: 1,
                entero: true
            }
        );

        const producto =
            await productosModel.obtenerProductoPorId(
                id
            );

        if (!producto) {
            return res.status(404).json({
                mensaje: "Producto no encontrado"
            });
        }

        return res.json(producto);
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al consultar producto"
        );
    }
}

async function crearProducto(req, res) {
    try {
        const producto =
            await productosModel.crearProducto(
                normalizarProducto(req.body)
            );

        return res.status(201).json({
            mensaje:
                "Producto creado correctamente",

            producto
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al crear producto"
        );
    }
}

async function actualizarProducto(req, res) {
    try {
        const id = numero(
            req.params.id,
            "El producto",
            {
                minimo: 1,
                entero: true
            }
        );

        const producto =
            await productosModel.actualizarProducto(
                id,
                normalizarProducto(
                    req.body,
                    true
                )
            );

        return res.json({
            mensaje:
                "Producto actualizado correctamente",

            producto
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al actualizar producto"
        );
    }
}

async function cambiarEstadoProducto(req, res) {
    try {
        const id = numero(
            req.params.id,
            "El producto",
            {
                minimo: 1,
                entero: true
            }
        );

        const estado = Boolean(
            req.body.estado
        );

        const actualizado =
            await productosModel.cambiarEstadoProducto(
                id,
                estado
            );

        if (!actualizado) {
            return res.status(404).json({
                mensaje:
                    "Producto no encontrado"
            });
        }

        return res.json({
            mensaje: estado
                ? "Producto activado correctamente"
                : "Producto desactivado correctamente"
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al cambiar el estado del producto"
        );
    }
}

module.exports = {
    listarProductos,
    obtenerProducto,
    crearProducto,
    actualizarProducto,
    cambiarEstadoProducto
};