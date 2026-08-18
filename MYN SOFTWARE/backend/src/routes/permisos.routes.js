const express = require("express");

const router =
    express.Router();

const permisosController = require(
    "../controllers/permisos.controller"
);

const {
    verificarPermiso
} = require(
    "../middleware/auth.middleware"
);

router.get(
    "/mios",
    permisosController.misPermisos
);

router.get(
    "/",
    verificarPermiso("roles.gestionar"),
    permisosController.listarCatalogo
);

router.get(
    "/rol/:idRol",
    verificarPermiso("roles.gestionar"),
    permisosController.permisosDeRol
);

router.put(
    "/rol/:idRol",
    verificarPermiso("roles.gestionar"),
    permisosController.actualizarPermisosDeRol
);

module.exports = router;