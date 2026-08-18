const express = require("express");

const router =
    express.Router();

const ventasController = require(
    "../controllers/ventas.controller"
);

const {
    verificarPermiso
} = require(
    "../middleware/auth.middleware"
);

router.get(
    "/",
    verificarPermiso("ventas.ver"),
    ventasController.listarVentas
);

router.get(
    "/:id",
    verificarPermiso("ventas.ver"),
    ventasController.obtenerVenta
);

router.post(
    "/",
    verificarPermiso("ventas.crear"),
    ventasController.registrarVenta
);

router.put(
    "/:id/anular",
    verificarPermiso("ventas.anular"),
    ventasController.anularVenta
);

module.exports = router;