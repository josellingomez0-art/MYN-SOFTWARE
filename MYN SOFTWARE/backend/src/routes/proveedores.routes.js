const express = require("express");

const router =
    express.Router();

const proveedoresController = require(
    "../controllers/proveedores.controller"
);

const {
    verificarPermiso
} = require(
    "../middleware/auth.middleware"
);

router.get(
    "/",
    verificarPermiso("proveedores.ver"),
    proveedoresController.listarProveedores
);

router.get(
    "/estadisticas/resumen",
    verificarPermiso("proveedores.ver"),
    proveedoresController.obtenerEstadisticas
);

router.get(
    "/:id/historial",
    verificarPermiso("proveedores.ver"),
    proveedoresController.obtenerHistorial
);

router.get(
    "/:id",
    verificarPermiso("proveedores.ver"),
    proveedoresController.obtenerProveedor
);

router.post(
    "/",
    verificarPermiso("proveedores.gestionar"),
    proveedoresController.crearProveedor
);

router.put(
    "/:id",
    verificarPermiso("proveedores.gestionar"),
    proveedoresController.actualizarProveedor
);

router.patch(
    "/:id/estado",
    verificarPermiso("proveedores.gestionar"),
    proveedoresController.cambiarEstado
);

module.exports = router;