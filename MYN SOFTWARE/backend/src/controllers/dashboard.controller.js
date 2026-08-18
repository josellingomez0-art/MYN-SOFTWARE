const dashboardModel = require("../models/dashboard.model");

async function obtenerDashboard(req, res) {

    try {

        const dashboard = await dashboardModel.obtenerDashboard();

        res.json(dashboard);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al obtener el dashboard"
        });

    }

}

module.exports = {
    obtenerDashboard
};