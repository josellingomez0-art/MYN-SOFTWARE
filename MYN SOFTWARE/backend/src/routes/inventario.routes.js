const express = require("express");

const router = express.Router();

const inventarioController = require(
    "../controllers/inventario.controller"
);

const {
    verificarPermiso
} = require(
    "../middleware/auth.middleware"
);

router.get(
    "/",
    verificarPermiso("inventario.ver"),
    inventarioController.listarInventario
);

router.get(
    "/historial",
    verificarPermiso("inventario.ver"),
    inventarioController.listarHistorial
);

router.get(
    "/:idProducto",
    verificarPermiso("inventario.ver"),
    inventarioController.obtenerInventarioProducto
);

router.put(
    "/:idProducto/ajuste",
    verificarPermiso("inventario.ajustar"),
    inventarioController.ajustarStock
);

module.exports = router;