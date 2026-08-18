const express = require("express");

const router =
    express.Router();

const rolesController = require(
    "../controllers/roles.controller"
);

const {
    verificarPermiso
} = require(
    "../middleware/auth.middleware"
);

router.get(
    "/",
    verificarPermiso("usuarios.ver"),
    rolesController.listarRoles
);

router.get(
    "/estadisticas/resumen",
    verificarPermiso("roles.gestionar"),
    rolesController.obtenerEstadisticas
);

router.get(
    "/:id",
    verificarPermiso("roles.gestionar"),
    rolesController.obtenerRol
);

router.post(
    "/",
    verificarPermiso("roles.gestionar"),
    rolesController.crearRol
);

router.put(
    "/:id",
    verificarPermiso("roles.gestionar"),
    rolesController.actualizarRol
);

router.patch(
    "/:id/estado",
    verificarPermiso("roles.gestionar"),
    rolesController.cambiarEstado
);

module.exports = router;