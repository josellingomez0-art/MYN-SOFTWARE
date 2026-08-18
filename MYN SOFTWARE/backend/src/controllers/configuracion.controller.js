const configuracionModel = require(
    "../models/configuracion.model"
);

function texto(
    valor,
    maximo = 255
) {
    return String(valor ?? "")
        .trim()
        .slice(0, maximo);
}

function numero(
    valor,
    nombre,
    minimo,
    maximo
) {
    const convertido =
        Number(valor);

    if (
        !Number.isFinite(convertido) ||
        convertido < minimo ||
        convertido > maximo
    ) {
        const error = new Error(
            `${nombre} debe estar entre ${minimo} y ${maximo}`
        );

        error.status = 400;

        throw error;
    }

    return convertido;
}

function normalizarConfiguracion(
    body
) {
    const monedasPermitidas = [
        "COP",
        "USD",
        "EUR"
    ];

    const moneda =
        texto(
            body.moneda,
            10
        ).toUpperCase();

    const simbolo =
        texto(
            body.simbolo,
            10
        );

    if (
        !monedasPermitidas.includes(
            moneda
        )
    ) {
        const error = new Error(
            "La moneda seleccionada no es válida"
        );

        error.status = 400;

        throw error;
    }

    if (!simbolo) {
        const error = new Error(
            "El símbolo monetario es obligatorio"
        );

        error.status = 400;

        throw error;
    }

    return {
        iva:
            numero(
                body.iva,
                "El IVA",
                0,
                100
            ),

        moneda,

        simbolo,

        impresora:
            texto(
                body.impresora,
                150
            ) || null
    };
}

function responderError(
    res,
    error,
    mensajeGeneral
) {
    console.error(error);

    const status =
        error.status || 500;

    return res
        .status(status)
        .json({
            mensaje:
                status === 500
                    ? mensajeGeneral
                    : error.message
        });
}

/*
|--------------------------------------------------------------------------
| Obtener configuración
|--------------------------------------------------------------------------
*/

async function obtenerConfiguracion(
    req,
    res
) {
    try {
        const configuracion =
            await configuracionModel
                .obtenerConfiguracion();

        return res.json(
            configuracion || {
                iva: 19,
                moneda: "COP",
                simbolo: "$",
                impresora: null
            }
        );
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al obtener la configuración"
        );
    }
}

/*
|--------------------------------------------------------------------------
| Guardar configuración
|--------------------------------------------------------------------------
*/

async function guardarConfiguracion(
    req,
    res
) {
    try {
        const configuracion =
            await configuracionModel
                .guardarConfiguracion(
                    normalizarConfiguracion(
                        req.body
                    )
                );

        return res.json({
            mensaje:
                "Configuración guardada correctamente",

            configuracion
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "Error al guardar la configuración"
        );
    }
}

module.exports = {
    obtenerConfiguracion,
    guardarConfiguracion
};