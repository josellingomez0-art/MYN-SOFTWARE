const express = require("express");

const router = express.Router();

const metodosPagoController = require("../controllers/metodosPago.controller");

router.get("/", metodosPagoController.listarMetodosPago);

module.exports = router;
