const metodosPagoModel = require("../models/metodosPago.model");

async function listarMetodosPago(req, res) {

    try {

        const metodos = await metodosPagoModel.obtenerMetodosPago();
        res.json(metodos);

    } catch (error) {

        console.error(error);
        res.status(500).json({ mensaje: "Error al listar los métodos de pago" });

    }

}

module.exports = {
    listarMetodosPago
};
