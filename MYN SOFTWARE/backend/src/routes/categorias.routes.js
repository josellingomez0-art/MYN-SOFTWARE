const express = require("express");

const router = express.Router();

const categoriasController = require("../controllers/categorias.controller");
const { verificarPermiso } = require("../middleware/auth.middleware");

router.get("/", verificarPermiso("productos.ver"), categoriasController.listarCategorias);
router.get("/:id", verificarPermiso("productos.ver"), categoriasController.obtenerCategoria);
router.post("/", verificarPermiso("productos.gestionar"), categoriasController.crearCategoria);
router.put("/:id", verificarPermiso("productos.gestionar"), categoriasController.actualizarCategoria);
router.delete("/:id", verificarPermiso("productos.gestionar"), categoriasController.eliminarCategoria);

module.exports = router;
