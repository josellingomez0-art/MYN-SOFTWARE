const express = require("express");

const router = express.Router();

const cajaController = require("../controllers/caja.controller");
const { verificarPermiso } = require("../middleware/auth.middleware");

router.get("/", verificarPermiso("caja.operar"), cajaController.listarCajas);
router.get("/turno-activo", verificarPermiso("caja.operar"), cajaController.turnoActivo);
router.get("/historial", verificarPermiso("caja.cerrar"), cajaController.historialTurnos);
router.post("/abrir", verificarPermiso("caja.operar"), cajaController.abrirTurno);
router.get("/:idTurno/resumen", verificarPermiso("caja.operar"), cajaController.resumenTurno);
router.post("/:idTurno/movimiento", verificarPermiso("caja.operar"), cajaController.registrarMovimiento);
router.put("/:idTurno/cerrar", verificarPermiso("caja.cerrar"), cajaController.cerrarTurno);

module.exports = router;
