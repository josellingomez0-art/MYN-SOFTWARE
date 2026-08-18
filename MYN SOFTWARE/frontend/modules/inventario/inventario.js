(() => {
    "use strict";

    const estado = {
        inventario: [],
        guardando: false
    };

    const $ = (id) =>
        document.getElementById(id);

    const escapar = (valor) =>
        String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    function mostrarMensaje(
        texto,
        tipo = "exito"
    ) {
        const mensaje =
            $("mensajeInventario");

        mensaje.textContent = texto;

        mensaje.className =
            `mensaje-inventario visible ${tipo}`;

        clearTimeout(
            mostrarMensaje.temporizador
        );

        mostrarMensaje.temporizador =
            setTimeout(() => {
                mensaje.textContent = "";

                mensaje.className =
                    "mensaje-inventario";
            }, 4500);
    }

    async function inicializar() {
        enlazarEventos();
        await cargarInventario();
    }

    function enlazarEventos() {
        $("buscarInventario")
            .addEventListener(
                "input",
                pintarFiltrado
            );

        $("filtroStock")
            .addEventListener(
                "change",
                pintarFiltrado
            );

        $("tablaInventario")
            .addEventListener(
                "click",
                manejarTabla
            );

        $("btnVerHistorial")
            .addEventListener(
                "click",
                abrirHistorial
            );

        $("btnCerrarAjuste")
            .addEventListener(
                "click",
                cerrarAjuste
            );

        $("btnCancelarAjuste")
            .addEventListener(
                "click",
                cerrarAjuste
            );

        $("btnCerrarHistorial")
            .addEventListener(
                "click",
                cerrarHistorial
            );

        $("tipoMovimiento")
            .addEventListener(
                "change",
                actualizarAyudaCantidad
            );

        $("formAjusteInventario")
            .addEventListener(
                "submit",
                guardarAjuste
            );

        document.addEventListener(
            "keydown",
            manejarEscape
        );
    }

    function manejarEscape(evento) {
        if (evento.key !== "Escape") {
            return;
        }

        cerrarAjuste();
        cerrarHistorial();
    }

    async function cargarInventario() {
        try {
            const respuesta =
                await peticion(
                    "/inventario"
                );

            estado.inventario =
                Array.isArray(respuesta)
                    ? respuesta
                    : [];

            actualizarResumen();
            pintarFiltrado();
        } catch (error) {
            console.error(error);

            $("tablaInventario").innerHTML = `
                <tr>
                    <td
                        colspan="10"
                        class="fila-vacia error"
                    >
                        ${escapar(error.message)}
                    </td>
                </tr>
            `;
        }
    }

    function actualizarResumen() {
        const productos =
            estado.inventario.length;

        const unidades =
            estado.inventario.reduce(
                (total, item) =>
                    total +
                    Number(
                        item.stock_disponible
                    ),
                0
            );

        const bajos =
            estado.inventario.filter(
                (item) =>
                    item.estado_stock ===
                    "BAJO"
            ).length;

        const agotados =
            estado.inventario.filter(
                (item) =>
                    item.estado_stock ===
                    "AGOTADO"
            ).length;

        $("resumenProductos").textContent =
            productos;

        $("resumenUnidades").textContent =
            unidades;

        $("resumenBajo").textContent =
            bajos;

        $("resumenAgotados").textContent =
            agotados;
    }

    function pintarFiltrado() {
        const texto =
            $("buscarInventario")
                .value
                .trim()
                .toLowerCase();

        const filtro =
            $("filtroStock").value;

        const lista =
            estado.inventario.filter(
                (item) => {
                    const coincideTexto =
                        !texto ||
                        [
                            item.codigo,
                            item.nombre,
                            item.marca,
                            item.categoria
                        ].some(
                            (valor) =>
                                String(valor || "")
                                    .toLowerCase()
                                    .includes(texto)
                        );

                    const coincideEstado =
                        filtro === "todos" ||
                        (
                            filtro === "normal" &&
                            item.estado_stock ===
                                "NORMAL"
                        ) ||
                        (
                            filtro === "bajo" &&
                            item.estado_stock ===
                                "BAJO"
                        ) ||
                        (
                            filtro === "agotado" &&
                            item.estado_stock ===
                                "AGOTADO"
                        );

                    return (
                        coincideTexto &&
                        coincideEstado
                    );
                }
            );

        pintarInventario(lista);
    }

    function pintarInventario(lista) {
        const tabla =
            $("tablaInventario");

        if (!lista.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="10"
                        class="fila-vacia"
                    >
                        No hay productos para mostrar.
                    </td>
                </tr>
            `;

            return;
        }

        const puedeAjustar =
            tienePermiso(
                "inventario.ajustar"
            );

        tabla.innerHTML =
            lista.map((item) => `
                <tr>
                    <td>
                        <strong>
                            ${escapar(item.codigo)}
                        </strong>
                    </td>

                    <td>
                        ${escapar(item.nombre)}

                        ${
                            item.marca
                                ? `
                                    <small>
                                        ${escapar(item.marca)}
                                    </small>
                                  `
                                : ""
                        }
                    </td>

                    <td>
                        ${escapar(item.categoria)}
                    </td>

                    <td>
                        ${Number(item.stock_actual)}
                    </td>

                    <td>
                        ${Number(item.stock_reservado)}
                    </td>

                    <td>
                        <strong>
                            ${Number(item.stock_disponible)}
                        </strong>
                    </td>

                    <td>
                        ${Number(item.stock_minimo)}
                    </td>

                    <td>
                        ${escapar(item.ubicacion || "—")}
                    </td>

                    <td>
                        <span
                            class="estado-stock ${item.estado_stock.toLowerCase()}"
                        >
                            ${
                                item.estado_stock === "NORMAL"
                                    ? "Normal"
                                    : item.estado_stock === "BAJO"
                                        ? "Stock bajo"
                                        : "Agotado"
                            }
                        </span>
                    </td>

                    <td>
                        ${
                            puedeAjustar
                                ? `
                                    <button
                                        type="button"
                                        class="btn-ajustar"
                                        data-id="${item.id_producto}"
                                    >
                                        Ajustar
                                    </button>
                                  `
                                : "—"
                        }
                    </td>
                </tr>
            `).join("");
    }

    function manejarTabla(evento) {
        const boton =
            evento.target.closest(
                ".btn-ajustar"
            );

        if (!boton) {
            return;
        }

        abrirAjuste(
            Number(boton.dataset.id)
        );
    }

    function abrirAjuste(idProducto) {
        const item =
            estado.inventario.find(
                (producto) =>
                    Number(
                        producto.id_producto
                    ) === idProducto
            );

        if (!item) {
            mostrarMensaje(
                "No se encontró el producto",
                "error"
            );

            return;
        }

        $("idProductoInventario").value =
            idProducto;

        $("productoAjuste").innerHTML = `
            <strong>
                ${escapar(item.codigo)} -
                ${escapar(item.nombre)}
            </strong>

            <span>
                Stock actual:
                ${Number(item.stock_actual)}
                · Reservado:
                ${Number(item.stock_reservado)}
            </span>
        `;

        $("tipoMovimiento").value =
            "ENTRADA";

        $("cantidadMovimiento").value =
            "1";

        $("cantidadMovimiento").min =
            "1";

        $("motivoMovimiento").value =
            "";

        $("ubicacionMovimiento").value =
            item.ubicacion || "";

        actualizarAyudaCantidad();

        const modal =
            $("modalAjusteInventario");

        modal.classList.add("activo");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        $("cantidadMovimiento").focus();
    }

    function cerrarAjuste() {
        if (estado.guardando) {
            return;
        }

        const modal =
            $("modalAjusteInventario");

        modal.classList.remove("activo");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    function actualizarAyudaCantidad() {
        const tipo =
            $("tipoMovimiento").value;

        const input =
            $("cantidadMovimiento");

        const ayuda =
            $("ayudaCantidad");

        if (tipo === "ENTRADA") {
            input.min = "1";

            ayuda.textContent =
                "Cantidad que se agregará al stock.";
        } else if (tipo === "SALIDA") {
            input.min = "1";

            ayuda.textContent =
                "Cantidad que se retirará del stock.";
        } else {
            input.min = "0";

            ayuda.textContent =
                "Cantidad exacta que debe quedar en inventario.";
        }
    }

    async function guardarAjuste(evento) {
        evento.preventDefault();

        if (estado.guardando) {
            return;
        }

        const idProducto =
            Number(
                $("idProductoInventario").value
            );

        const tipo =
            $("tipoMovimiento").value;

        const cantidad =
            Number(
                $("cantidadMovimiento").value
            );

        const motivo =
            $("motivoMovimiento")
                .value
                .trim();

        const minimo =
            tipo === "AJUSTE"
                ? 0
                : 1;

        if (
            !Number.isInteger(cantidad) ||
            cantidad < minimo
        ) {
            mostrarMensaje(
                "La cantidad no es válida",
                "error"
            );

            return;
        }

        if (motivo.length < 5) {
            mostrarMensaje(
                "Escribe un motivo de al menos 5 caracteres",
                "error"
            );

            return;
        }

        estado.guardando = true;

        const boton =
            $("btnGuardarAjuste");

        boton.disabled = true;
        boton.textContent =
            "Guardando...";

        try {
            const respuesta =
                await peticion(
                    `/inventario/${idProducto}/ajuste`,
                    "PUT",
                    {
                        tipo,
                        cantidad,
                        motivo,
                        ubicacion:
                            $("ubicacionMovimiento")
                                .value
                                .trim()
                    }
                );

            estado.guardando = false;
            cerrarAjuste();

            await cargarInventario();

            mostrarMensaje(
                respuesta.mensaje ||
                "Inventario actualizado correctamente"
            );
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                "No fue posible ajustar el inventario",
                "error"
            );
        } finally {
            estado.guardando = false;

            boton.disabled = false;

            boton.textContent =
                "Guardar ajuste";
        }
    }

    async function abrirHistorial() {
        const modal =
            $("modalHistorialInventario");

        modal.classList.add("activo");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        const tabla =
            $("tablaHistorialInventario");

        tabla.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="fila-vacia"
                >
                    Cargando historial...
                </td>
            </tr>
        `;

        try {
            const historial =
                await peticion(
                    "/inventario/historial"
                );

            if (
                !Array.isArray(historial) ||
                !historial.length
            ) {
                tabla.innerHTML = `
                    <tr>
                        <td
                            colspan="8"
                            class="fila-vacia"
                        >
                            No existen movimientos registrados.
                        </td>
                    </tr>
                `;

                return;
            }

            tabla.innerHTML =
                historial.map(
                    (movimiento) => `
                        <tr>
                            <td>
                                ${new Date(
                                    movimiento.created_at
                                ).toLocaleString("es-CO")}
                            </td>

                            <td>
                                ${escapar(
                                    movimiento.codigo
                                )} -
                                ${escapar(
                                    movimiento.producto
                                )}
                            </td>

                            <td>
                                ${escapar(
                                    movimiento.tipo
                                )}
                            </td>

                            <td>
                                ${Number(
                                    movimiento.cantidad
                                )}
                            </td>

                            <td>
                                ${Number(
                                    movimiento.stock_anterior
                                )}
                            </td>

                            <td>
                                ${Number(
                                    movimiento.stock_nuevo
                                )}
                            </td>

                            <td>
                                ${escapar(
                                    movimiento.usuario
                                )}
                            </td>

                            <td>
                                ${escapar(
                                    movimiento.motivo
                                )}
                            </td>
                        </tr>
                    `
                ).join("");
        } catch (error) {
            console.error(error);

            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="fila-vacia error"
                    >
                        ${escapar(error.message)}
                    </td>
                </tr>
            `;
        }
    }

    function cerrarHistorial() {
        const modal =
            $("modalHistorialInventario");

        modal.classList.remove("activo");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    inicializar();
})();