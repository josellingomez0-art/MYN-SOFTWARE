const pool = require("../config/database");

async function obtenerCajas() {

    const [rows] = await pool.query(
        "SELECT * FROM cajas WHERE estado = TRUE ORDER BY nombre"
    );

    return rows;

}

async function obtenerTurnoActivo(idUsuario) {

    const [rows] = await pool.query(
        `
        SELECT t.*, c.nombre AS caja
        FROM turnos_caja t
        INNER JOIN cajas c ON t.id_caja = c.id
        WHERE t.id_usuario_apertura = ? AND t.estado = 'ABIERTA'
        LIMIT 1
        `,
        [idUsuario]
    );

    return rows[0] || null;

}

async function abrirTurno({ id_caja, id_usuario, monto_inicial }) {

    const turnoExistente = await obtenerTurnoActivo(id_usuario);

    if (turnoExistente) {
        throw new Error("Ya tienes un turno de caja abierto");
    }

    const [turnoEnCaja] = await pool.query(
        "SELECT id FROM turnos_caja WHERE id_caja=? AND estado='ABIERTA' LIMIT 1",
        [id_caja]
    );

    if (turnoEnCaja.length > 0) {
        throw new Error("Esa caja ya está siendo usada por otro turno abierto");
    }

    const [resultado] = await pool.query(
        `
        INSERT INTO turnos_caja (id_caja, id_usuario_apertura, monto_inicial)
        VALUES (?, ?, ?)
        `,
        [id_caja, id_usuario, monto_inicial || 0]
    );

    return { idTurno: resultado.insertId };

}

async function registrarMovimiento({ id_turno, id_usuario, tipo, concepto, valor }) {

    const [turnoRows] = await pool.query(
        "SELECT id_caja, estado FROM turnos_caja WHERE id=?",
        [id_turno]
    );

    if (turnoRows.length === 0) {
        throw new Error("El turno de caja no existe");
    }

    if (turnoRows[0].estado !== "ABIERTA") {
        throw new Error("El turno de caja ya está cerrado");
    }

    const [resultado] = await pool.query(
        `
        INSERT INTO movimientos_caja (id_caja, id_turno, id_usuario, tipo, concepto, valor)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [turnoRows[0].id_caja, id_turno, id_usuario, tipo, concepto || null, valor]
    );

    return { idMovimiento: resultado.insertId };

}

async function obtenerResumenTurno(idTurno) {

    const [[turno]] = await pool.query(
        `
        SELECT t.*, c.nombre AS caja
        FROM turnos_caja t
        INNER JOIN cajas c ON t.id_caja = c.id
        WHERE t.id = ?
        `,
        [idTurno]
    );

    if (!turno) {
        return null;
    }

    const [ventasPorMetodo] = await pool.query(
        `
        SELECT mp.nombre AS metodo_pago, COUNT(v.id) AS cantidad, COALESCE(SUM(v.total),0) AS total
        FROM ventas v
        LEFT JOIN metodos_pago mp ON v.id_metodo_pago = mp.id
        WHERE v.id_turno = ? AND v.estado <> 'ANULADA'
        GROUP BY mp.nombre
        `,
        [idTurno]
    );

    const [movimientos] = await pool.query(
        "SELECT * FROM movimientos_caja WHERE id_turno = ? ORDER BY fecha",
        [idTurno]
    );

    const totalVentas = ventasPorMetodo.reduce((acc, fila) => acc + Number(fila.total), 0);
    const totalIngresos = movimientos.filter(m => m.tipo === "INGRESO").reduce((acc, m) => acc + Number(m.valor), 0);
    const totalEgresos = movimientos.filter(m => m.tipo === "EGRESO").reduce((acc, m) => acc + Number(m.valor), 0);

    const totalEfectivoVentas = Number(
        (ventasPorMetodo.find(f => f.metodo_pago === "Efectivo") || { total: 0 }).total
    );

    const montoFinalSistema =
        Number(turno.monto_inicial) + totalEfectivoVentas + totalIngresos - totalEgresos;

    return {
        turno,
        ventasPorMetodo,
        movimientos,
        totales: {
            totalVentas,
            totalIngresos,
            totalEgresos,
            montoFinalSistema
        }
    };

}

async function cerrarTurno(idTurno, { monto_final_real, id_usuario_cierre }) {

    const resumen = await obtenerResumenTurno(idTurno);

    if (!resumen) {
        throw new Error("El turno de caja no existe");
    }

    if (resumen.turno.estado !== "ABIERTA") {
        throw new Error("Este turno ya está cerrado");
    }

    const montoFinalSistema = resumen.totales.montoFinalSistema;
    const diferencia = Number(monto_final_real) - montoFinalSistema;

    await pool.query(
        `
        UPDATE turnos_caja
        SET estado='CERRADA',
            id_usuario_cierre=?,
            monto_final_sistema=?,
            monto_final_real=?,
            diferencia=?,
            fecha_cierre=NOW()
        WHERE id=?
        `,
        [id_usuario_cierre, montoFinalSistema, monto_final_real, diferencia, idTurno]
    );

    return {
        montoFinalSistema,
        montoFinalReal: Number(monto_final_real),
        diferencia
    };

}

async function obtenerHistorialTurnos() {

    const [rows] = await pool.query(
        `
        SELECT
            t.id,
            c.nombre AS caja,
            CONCAT(ua.nombres, ' ', ua.apellidos) AS abierto_por,
            CONCAT(uc.nombres, ' ', uc.apellidos) AS cerrado_por,
            t.monto_inicial,
            t.monto_final_sistema,
            t.monto_final_real,
            t.diferencia,
            t.fecha_apertura,
            t.fecha_cierre,
            t.estado
        FROM turnos_caja t
        INNER JOIN cajas c ON t.id_caja = c.id
        INNER JOIN usuarios ua ON t.id_usuario_apertura = ua.id
        LEFT JOIN usuarios uc ON t.id_usuario_cierre = uc.id
        ORDER BY t.fecha_apertura DESC
        LIMIT 100
        `
    );

    return rows;

}

module.exports = {
    obtenerCajas,
    obtenerTurnoActivo,
    abrirTurno,
    registrarMovimiento,
    obtenerResumenTurno,
    cerrarTurno,
    obtenerHistorialTurnos
};
