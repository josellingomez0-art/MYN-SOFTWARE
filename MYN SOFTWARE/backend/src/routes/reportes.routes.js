const express = require("express");

const router =
    express.Router();

const reportesController = require(
    "../controllers/reportes.controller"
);

const {
    verificarPermiso
} = require(
    "../middleware/auth.middleware"
);

router.get(
    "/",
    verificarPermiso("reportes.ver"),
    reportesController.obtenerReporte
);

module.exports = router;