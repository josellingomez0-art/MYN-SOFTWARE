const reportesModel = require(
    "../models/reportes.model"
);

function fechaValida(valor) {
    return /^\d{4}-\d{2}-\d{2}$/.test(
        String(valor || "")
    );
}

function crearFechaLocal(
    valor
) {
    const [anio, mes, dia] =
        valor.split("-").map(Number);

    return new Date(
        anio,
        mes - 1,
        dia
    );
}

async function obtenerReporte(
    req,
    res
) {
    try {
        const hoy =
            new Date();

        const primerDia =
            new Date(
                hoy.getFullYear(),
                hoy.getMonth(),
                1
            );

        const fechaLocal =
            (fecha) => {
                const anio =
                    fecha.getFullYear();

                const mes =
                    String(
                        fecha.getMonth() + 1
                    ).padStart(2, "0");

                const dia =
                    String(
                        fecha.getDate()
                    ).padStart(2, "0");

                return `${anio}-${mes}-${dia}`;
            };

        const fechaDesde =
            req.query.fecha_desde ||
            fechaLocal(primerDia);

        const fechaHasta =
            req.query.fecha_hasta ||
            fechaLocal(hoy);

        if (
            !fechaValida(fechaDesde) ||
            !fechaValida(fechaHasta)
        ) {
            return res
                .status(400)
                .json({
                    mensaje:
                        "Las fechas enviadas no son válidas"
                });
        }

        const desde =
            crearFechaLocal(fechaDesde);

        const hasta =
            crearFechaLocal(fechaHasta);

        if (desde > hasta) {
            return res
                .status(400)
                .json({
                    mensaje:
                        "La fecha inicial no puede ser posterior a la fecha final"
                });
        }

        const diferenciaDias =
            Math.ceil(
                (
                    hasta.getTime() -
                    desde.getTime()
                ) /
                86400000
            );

        if (diferenciaDias > 730) {
            return res
                .status(400)
                .json({
                    mensaje:
                        "El periodo máximo permitido es de 730 días"
                });
        }

        const reporte =
            await reportesModel
                .obtenerReporteCompleto(
                    fechaDesde,
                    fechaHasta
                );

        return res.json(reporte);
    } catch (error) {
        console.error(error);

        return res
            .status(500)
            .json({
                mensaje:
                    "Error al generar el reporte"
            });
    }
}

module.exports = {
    obtenerReporte
};