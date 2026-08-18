const empresaModel = require("../models/empresa.model");

async function obtenerEmpresa(req, res) {

    try {

        const empresa = await empresaModel.obtenerEmpresa();

        res.json(empresa || {});

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al obtener los datos de la empresa"
        });

    }

}

async function guardarEmpresa(req, res) {

    try {

        const resultado = await empresaModel.guardarEmpresa(req.body);

        res.json({
            mensaje: "Datos de la empresa guardados correctamente",
            resultado
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al guardar los datos de la empresa"
        });

    }

}

module.exports = {
    obtenerEmpresa,
    guardarEmpresa
};
