const express = require("express");

const router =
    express.Router();

const comprasController = require(
    "../controllers/compras.controller"
);

const {
    verificarPermiso
} = require(
    "../middleware/auth.middleware"
);

router.get(
    "/",
    verificarPermiso("compras.ver"),
    comprasController.listarCompras
);

router.get(
    "/:id",
    verificarPermiso("compras.ver"),
    comprasController.obtenerCompra
);

router.post(
    "/",
    verificarPermiso("compras.crear"),
    comprasController.registrarCompra
);

router.put(
    "/:id/anular",
    verificarPermiso("compras.crear"),
    comprasController.anularCompra
);

module.exports = router;