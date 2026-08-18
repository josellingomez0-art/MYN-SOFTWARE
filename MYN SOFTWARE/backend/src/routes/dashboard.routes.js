const express = require("express");

const router = express.Router();

const dashboardController = require("../controllers/dashboard.controller");
const { verificarPermiso } = require("../middleware/auth.middleware");

router.get("/", verificarPermiso("dashboard.ver"), dashboardController.obtenerDashboard);

module.exports = router;
