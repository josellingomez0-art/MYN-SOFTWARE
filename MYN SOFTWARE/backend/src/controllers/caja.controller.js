const cajaModel = require("../models/caja.model");

async function listarCajas(req, res) {

    try {

        const cajas = await cajaModel.obtenerCajas();
        res.json(cajas);

    } catch (error) {

        console.error(error);
        res.status(500).json({ mensaje: "Error al listar las cajas" });

    }

}

async function turnoActivo(req, res) {

    try {

        const turno = await cajaModel.obtenerTurnoActivo(req.usuario.id);
        res.json(turno || null);

    } catch (error) {

        console.error(error);
        res.status(500).json({ mensaje: "Error al consultar el turno activo" });

    }

}

async function abrirTurno(req, res) {

    try {

        const resultado = await cajaModel.abrirTurno({
            id_caja: req.body.id_caja,
            id_usuario: req.usuario.id,
            monto_inicial: req.body.monto_inicial
        });

        res.status(201).json({
            mensaje: "Turno de caja abierto",
            resultado
        });

    } catch (error) {

        console.error(error);
        res.status(400).json({ mensaje: error.message || "Error al abrir el turno de caja" });

    }

}

async function registrarMovimiento(req, res) {

    try {

        const resultado = await cajaModel.registrarMovimiento({
            id_turno: req.params.idTurno,
            id_usuario: req.usuario.id,
            tipo: req.body.tipo,
            concepto: req.body.concepto,
            valor: req.body.valor
        });

        res.status(201).json({
            mensaje: "Movimiento registrado",
            resultado
        });

    } catch (error) {

        console.error(error);
        res.status(400).json({ mensaje: error.message || "Error al registrar el movimiento" });

    }

}

async function resumenTurno(req, res) {

    try {

        const resumen = await cajaModel.obtenerResumenTurno(req.params.idTurno);

        if (!resumen) {
            return res.status(404).json({ mensaje: "El turno no existe" });
        }

        res.json(resumen);

    } catch (error) {

        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener el resumen del turno" });

    }

}

async function cerrarTurno(req, res) {

    try {

        const resultado = await cajaModel.cerrarTurno(req.params.idTurno, {
            monto_final_real: req.body.monto_final_real,
            id_usuario_cierre: req.usuario.id
        });

        res.json({
            mensaje: "Turno de caja cerrado",
            resultado
        });

    } catch (error) {

        console.error(error);
        res.status(400).json({ mensaje: error.message || "Error al cerrar el turno de caja" });

    }

}

async function historialTurnos(req, res) {

    try {

        const historial = await cajaModel.obtenerHistorialTurnos();
        res.json(historial);

    } catch (error) {

        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener el historial de turnos" });

    }

}

module.exports = {
    listarCajas,
    turnoActivo,
    abrirTurno,
    registrarMovimiento,
    resumenTurno,
    cerrarTurno,
    historialTurnos
};
