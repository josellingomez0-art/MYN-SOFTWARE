const express = require("express");

const router = express.Router();

const productosController = require(
    "../controllers/productos.controller"
);

const {
    verificarPermiso
} = require(
    "../middleware/auth.middleware"
);

/*
|--------------------------------------------------------------------------
| Consultar productos
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    verificarPermiso("productos.ver"),
    productosController.listarProductos
);

/*
|--------------------------------------------------------------------------
| Consultar un producto
|--------------------------------------------------------------------------
*/

router.get(
    "/:id",
    verificarPermiso("productos.ver"),
    productosController.obtenerProducto
);

/*
|--------------------------------------------------------------------------
| Crear producto
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    verificarPermiso("productos.gestionar"),
    productosController.crearProducto
);

/*
|--------------------------------------------------------------------------
| Actualizar producto
|--------------------------------------------------------------------------
*/

router.put(
    "/:id",
    verificarPermiso("productos.gestionar"),
    productosController.actualizarProducto
);

/*
|--------------------------------------------------------------------------
| Activar o desactivar producto
|--------------------------------------------------------------------------
*/

router.patch(
    "/:id/estado",
    verificarPermiso("productos.gestionar"),
    productosController.cambiarEstadoProducto
);

module.exports = router;