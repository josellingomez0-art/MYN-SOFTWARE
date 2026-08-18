const express = require("express");

const router =
    express.Router();

const configuracionController = require(
    "../controllers/configuracion.controller"
);

const {
    verificarPermiso
} = require(
    "../middleware/auth.middleware"
);

/*
|--------------------------------------------------------------------------
| Consultar configuración
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    configuracionController
        .obtenerConfiguracion
);

/*
|--------------------------------------------------------------------------
| Actualizar configuración
|--------------------------------------------------------------------------
*/

router.put(
    "/",
    verificarPermiso(
        "configuracion.editar"
    ),
    configuracionController
        .guardarConfiguracion
);

module.exports = router;