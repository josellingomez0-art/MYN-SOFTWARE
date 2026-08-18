const express = require("express");

const router =
    express.Router();

const clientesController = require(
    "../controllers/clientes.controller"
);

const {
    verificarPermiso
} = require(
    "../middleware/auth.middleware"
);

router.get(
    "/",
    verificarPermiso("clientes.ver"),
    clientesController.listarClientes
);

router.get(
    "/estadisticas/resumen",
    verificarPermiso("clientes.ver"),
    clientesController.obtenerEstadisticas
);

router.get(
    "/:id/historial",
    verificarPermiso("clientes.ver"),
    clientesController.obtenerHistorial
);

router.get(
    "/:id",
    verificarPermiso("clientes.ver"),
    clientesController.obtenerCliente
);

router.post(
    "/",
    verificarPermiso("clientes.gestionar"),
    clientesController.crearCliente
);

router.put(
    "/:id",
    verificarPermiso("clientes.gestionar"),
    clientesController.actualizarCliente
);

router.patch(
    "/:id/estado",
    verificarPermiso("clientes.gestionar"),
    clientesController.cambiarEstado
);

module.exports = router;