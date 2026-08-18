const express = require("express");

const router =
    express.Router();

const usuariosController = require(
    "../controllers/usuarios.controller"
);

const {
    verificarPermiso
} = require(
    "../middleware/auth.middleware"
);

router.get(
    "/",
    verificarPermiso("usuarios.ver"),
    usuariosController.listarUsuarios
);

router.get(
    "/estadisticas/resumen",
    verificarPermiso("usuarios.ver"),
    usuariosController.obtenerEstadisticas
);

router.get(
    "/:id/actividad",
    verificarPermiso("usuarios.ver"),
    usuariosController.obtenerActividad
);

router.get(
    "/:id",
    verificarPermiso("usuarios.ver"),
    usuariosController.obtenerUsuario
);

router.post(
    "/",
    verificarPermiso("usuarios.gestionar"),
    usuariosController.crearUsuario
);

router.put(
    "/:id",
    verificarPermiso("usuarios.gestionar"),
    usuariosController.actualizarUsuario
);

router.patch(
    "/:id/estado",
    verificarPermiso("usuarios.gestionar"),
    usuariosController.cambiarEstado
);

router.patch(
    "/:id/password",
    verificarPermiso("usuarios.gestionar"),
    usuariosController.cambiarPassword
);

module.exports = router;