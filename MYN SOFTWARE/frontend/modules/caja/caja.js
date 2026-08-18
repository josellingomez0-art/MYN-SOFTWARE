/*=========================================
        MYN SOFTWARE
        CAJA
=========================================*/

var turnoCajaActual = null;

var bloqueAbrir = document.getElementById("bloqueAbrirTurno");
var bloqueAbierto = document.getElementById("bloqueTurnoAbierto");
var mensajeCaja = document.getElementById("mensajeCaja");

inicializarCaja();

async function inicializarCaja() {
    try {
        turnoCajaActual = await peticion("/caja/turno-activo");

        if (turnoCajaActual && turnoCajaActual.id) {
            mostrarTurnoAbierto();
            return;
        }

        turnoCajaActual = null;

        await cargarCajasDisponibles();

        bloqueAbrir.style.display = "block";
        bloqueAbierto.style.display = "none";
    } catch (error) {
        console.error(error);

        turnoCajaActual = null;

        bloqueAbrir.style.display = "block";
        bloqueAbierto.style.display = "none";

        mostrarMensaje(
            error.message ||
            "No se pudo consultar el estado de la caja."
        );
    }
}

async function cargarCajasDisponibles() {
    try {
        const cajas = await peticion("/caja");
        const select = document.getElementById("selCaja");

        if (!select) {
            return;
        }

        if (!Array.isArray(cajas) || cajas.length === 0) {
            select.innerHTML =
                '<option value="">No hay cajas disponibles</option>';

            return;
        }

        select.innerHTML = cajas
            .map(
                (caja) =>
                    `<option value="${caja.id}">${caja.nombre}</option>`
            )
            .join("");
    } catch (error) {
        console.error(error);

        mostrarMensaje(
            error.message ||
            "No se pudieron cargar las cajas disponibles."
        );
    }
}

function mostrarTurnoAbierto() {
    if (!turnoCajaActual || !turnoCajaActual.id) {
        return;
    }

    bloqueAbrir.style.display = "none";
    bloqueAbierto.style.display = "block";

    document.getElementById("infoCaja").textContent =
        turnoCajaActual.caja || "-";

    document.getElementById("infoUsuario").textContent =
        sessionStorage.getItem("usuario") || "-";

    document.getElementById("infoFecha").textContent =
        turnoCajaActual.fecha_apertura
            ? new Date(
                  turnoCajaActual.fecha_apertura
              ).toLocaleString("es-CO")
            : "-";

    document.getElementById("infoMontoInicial").textContent =
        formatoMonedaCaja(turnoCajaActual.monto_inicial);

    cargarResumenTurno();
}

function formatoMonedaCaja(valor) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(Number(valor) || 0);
}

var formAbrirTurno =
    document.getElementById("formAbrirTurno");

if (formAbrirTurno) {
    formAbrirTurno.addEventListener(
        "submit",
        async (evento) => {
            evento.preventDefault();

            const idCaja =
                document.getElementById("selCaja").value;

            const montoInicial = Number(
                document.getElementById("montoInicial").value
            );

            if (!idCaja) {
                mostrarMensaje("Seleccione una caja.");
                return;
            }

            if (
                Number.isNaN(montoInicial) ||
                montoInicial < 0
            ) {
                mostrarMensaje(
                    "Ingrese un monto inicial válido."
                );

                return;
            }

            try {
                await peticion(
                    "/caja/abrir",
                    "POST",
                    {
                        id_caja: Number(idCaja),
                        monto_inicial: montoInicial
                    }
                );

                await inicializarCaja();

                mostrarMensaje(
                    "Turno de caja abierto correctamente."
                );
            } catch (error) {
                console.error(error);

                mostrarMensaje(
                    error.message ||
                    "No se pudo abrir la caja."
                );
            }
        }
    );
}

var formMovimiento =
    document.getElementById("formMovimiento");

if (formMovimiento) {
    formMovimiento.addEventListener(
        "submit",
        async (evento) => {
            evento.preventDefault();

            if (
                !turnoCajaActual ||
                !turnoCajaActual.id
            ) {
                mostrarMensaje(
                    "No hay un turno de caja abierto."
                );

                return;
            }

            const valor = Number(
                document.getElementById("movValor").value
            );

            if (
                Number.isNaN(valor) ||
                valor <= 0
            ) {
                mostrarMensaje(
                    "Ingrese un valor mayor que cero."
                );

                return;
            }

            const datos = {
                tipo:
                    document.getElementById("movTipo").value,

                concepto:
                    document
                        .getElementById("movConcepto")
                        .value.trim(),

                valor
            };

            try {
                await peticion(
                    `/caja/${turnoCajaActual.id}/movimiento`,
                    "POST",
                    datos
                );

                formMovimiento.reset();

                await cargarResumenTurno();

                mostrarMensaje(
                    "Movimiento registrado."
                );
            } catch (error) {
                console.error(error);

                mostrarMensaje(
                    error.message ||
                    "No se pudo registrar el movimiento."
                );
            }
        }
    );
}

var formCerrarTurno =
    document.getElementById("formCerrarTurno");

if (formCerrarTurno) {
    formCerrarTurno.addEventListener(
        "submit",
        async (evento) => {
            evento.preventDefault();

            if (
                !turnoCajaActual ||
                !turnoCajaActual.id
            ) {
                mostrarMensaje(
                    "No hay un turno de caja abierto."
                );

                return;
            }

            const montoFinalReal = Number(
                document.getElementById(
                    "montoFinalReal"
                ).value
            );

            if (
                Number.isNaN(montoFinalReal) ||
                montoFinalReal < 0
            ) {
                mostrarMensaje(
                    "Ingrese un monto final válido."
                );

                return;
            }

            const confirmar = confirm(
                "¿Cerrar el turno de caja? Esta acción no se puede deshacer."
            );

            if (!confirmar) {
                return;
            }

            try {
                const respuesta = await peticion(
                    `/caja/${turnoCajaActual.id}/cerrar`,
                    "PUT",
                    {
                        monto_final_real:
                            montoFinalReal
                    }
                );

                const diferencia = Number(
                    respuesta.resultado.diferencia
                );

                let textoDiferencia =
                    "La caja cuadró exactamente.";

                if (diferencia > 0) {
                    textoDiferencia =
                        `Sobraron ${formatoMonedaCaja(
                            diferencia
                        )}.`;
                }

                if (diferencia < 0) {
                    textoDiferencia =
                        `Faltaron ${formatoMonedaCaja(
                            Math.abs(diferencia)
                        )}.`;
                }

                alert(
                    `Turno cerrado.\n${textoDiferencia}`
                );

                turnoCajaActual = null;

                await inicializarCaja();
            } catch (error) {
                console.error(error);

                mostrarMensaje(
                    error.message ||
                    "No se pudo cerrar el turno."
                );
            }
        }
    );
}

async function cargarResumenTurno() {
    const contenedor =
        document.getElementById("resumenTurno");

    if (!contenedor) {
        return;
    }

    if (
        !turnoCajaActual ||
        !turnoCajaActual.id
    ) {
        contenedor.innerHTML =
            '<p class="mensaje-vacio">No hay un turno abierto.</p>';

        return;
    }

    try {
        const resumen = await peticion(
            `/caja/${turnoCajaActual.id}/resumen`
        );

        const ventasPorMetodo =
            Array.isArray(resumen.ventasPorMetodo)
                ? resumen.ventasPorMetodo
                : [];

        const movimientos =
            Array.isArray(resumen.movimientos)
                ? resumen.movimientos
                : [];

        const filasMetodos =
            ventasPorMetodo.length === 0
                ? `
                    <tr>
                        <td colspan="3" class="mensaje-vacio">
                            Sin ventas en este turno
                        </td>
                    </tr>
                `
                : ventasPorMetodo
                      .map(
                          (fila) => `
                            <tr>
                                <td>
                                    ${fila.metodo_pago || "Sin método"}
                                </td>
                                <td>${fila.cantidad}</td>
                                <td>
                                    ${formatoMonedaCaja(fila.total)}
                                </td>
                            </tr>
                        `
                      )
                      .join("");

        const filasMovimientos =
            movimientos.length === 0
                ? `
                    <tr>
                        <td colspan="4" class="mensaje-vacio">
                            Sin movimientos manuales
                        </td>
                    </tr>
                `
                : movimientos
                      .map(
                          (movimiento) => `
                            <tr>
                                <td>
                                    ${new Date(
                                        movimiento.fecha
                                    ).toLocaleString("es-CO")}
                                </td>
                                <td>${movimiento.tipo}</td>
                                <td>
                                    ${movimiento.concepto || "-"}
                                </td>
                                <td>
                                    ${formatoMonedaCaja(
                                        movimiento.valor
                                    )}
                                </td>
                            </tr>
                        `
                      )
                      .join("");

        contenedor.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Método de pago</th>
                        <th>Ventas</th>
                        <th>Total</th>
                    </tr>
                </thead>

                <tbody>
                    ${filasMetodos}
                </tbody>
            </table>

            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Concepto</th>
                        <th>Valor</th>
                    </tr>
                </thead>

                <tbody>
                    ${filasMovimientos}
                </tbody>
            </table>

            <p>
                <b>
                    Total esperado en caja ahora mismo:
                    ${formatoMonedaCaja(
                        resumen.totales.montoFinalSistema
                    )}
                </b>
            </p>
        `;
    } catch (error) {
        console.error(error);

        contenedor.innerHTML = `
            <p class="mensaje-vacio">
                ${
                    error.message ||
                    "Error al cargar el resumen del turno."
                }
            </p>
        `;
    }
}

function mostrarMensaje(texto) {
    if (!mensajeCaja) {
        return;
    }

    mensajeCaja.textContent = texto;

    setTimeout(() => {
        mensajeCaja.textContent = "";
    }, 4000);
}