const express = require("express");

const router = express.Router();

const empresaController = require("../controllers/empresa.controller");
const { verificarPermiso } = require("../middleware/auth.middleware");

router.get("/", empresaController.obtenerEmpresa);
router.put("/", verificarPermiso("configuracion.editar"), empresaController.guardarEmpresa);

module.exports = router;
