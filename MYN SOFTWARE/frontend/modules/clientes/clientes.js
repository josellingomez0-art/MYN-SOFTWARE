(() => {
    "use strict";

    const estado = {
        clientes: [],
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

    const moneda = (valor) =>
        new Intl.NumberFormat(
            "es-CO",
            {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0
            }
        ).format(
            Number(valor) || 0
        );

    function mostrarMensaje(
        texto,
        tipo = "exito"
    ) {
        const contenedor =
            $("mensajeClientes");

        contenedor.textContent =
            texto;

        contenedor.className =
            `mensaje-clientes visible ${tipo}`;

        clearTimeout(
            mostrarMensaje.temporizador
        );

        mostrarMensaje.temporizador =
            setTimeout(() => {
                contenedor.textContent =
                    "";

                contenedor.className =
                    "mensaje-clientes";
            }, 4500);
    }

    async function inicializar() {
        enlazarEventos();

        const puedeGestionar =
            tienePermiso(
                "clientes.gestionar"
            );

        $("btnNuevoCliente").hidden =
            !puedeGestionar;

        await Promise.all([
            cargarClientes(),
            cargarEstadisticas()
        ]);
    }

    function enlazarEventos() {
        $("btnNuevoCliente")
            .addEventListener(
                "click",
                abrirNuevo
            );

        $("buscarCliente")
            .addEventListener(
                "input",
                pintarFiltrados
            );

        $("filtroEstadoCliente")
            .addEventListener(
                "change",
                pintarFiltrados
            );

        $("tablaClientes")
            .addEventListener(
                "click",
                manejarTabla
            );

        $("formCliente")
            .addEventListener(
                "submit",
                guardarCliente
            );

        $("btnCerrarCliente")
            .addEventListener(
                "click",
                cerrarFormulario
            );

        $("btnCancelarCliente")
            .addEventListener(
                "click",
                cerrarFormulario
            );

        $("btnCerrarHistorialCliente")
            .addEventListener(
                "click",
                cerrarHistorial
            );

        document.addEventListener(
            "keydown",
            (evento) => {
                if (
                    evento.key === "Escape"
                ) {
                    cerrarFormulario();
                    cerrarHistorial();
                }
            }
        );
    }

    async function cargarClientes() {
        const tabla =
            $("tablaClientes");

        tabla.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="fila-vacia"
                >
                    Cargando clientes...
                </td>
            </tr>
        `;

        try {
            const respuesta =
                await peticion(
                    "/clientes"
                );

            estado.clientes =
                Array.isArray(respuesta)
                    ? respuesta
                    : [];

            pintarFiltrados();
        } catch (error) {
            console.error(error);

            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="fila-vacia error"
                    >
                        ${escapar(error.message)}
                    </td>
                </tr>
            `;
        }
    }

    async function cargarEstadisticas() {
        try {
            const datos =
                await peticion(
                    "/clientes/estadisticas/resumen"
                );

            $("totalClientes").textContent =
                Number(
                    datos.total_clientes
                ) || 0;

            $("clientesActivos").textContent =
                Number(
                    datos.clientes_activos
                ) || 0;

            $("clientesInactivos").textContent =
                Number(
                    datos.clientes_inactivos
                ) || 0;

            $("totalCompradoClientes")
                .textContent =
                moneda(
                    datos.total_comprado_clientes
                );
        } catch (error) {
            console.error(error);
        }
    }

    function pintarFiltrados() {
        const texto =
            $("buscarCliente")
                .value
                .trim()
                .toLowerCase();

        const filtro =
            $("filtroEstadoCliente")
                .value;

        const lista =
            estado.clientes.filter(
                (cliente) => {
                    const coincideTexto =
                        !texto ||
                        [
                            cliente.documento,
                            cliente.nombres,
                            cliente.apellidos,
                            cliente.telefono,
                            cliente.correo,
                            cliente.ciudad
                        ].some(
                            (valor) =>
                                String(
                                    valor || ""
                                )
                                    .toLowerCase()
                                    .includes(texto)
                        );

                    const coincideEstado =
                        filtro === "todos" ||
                        (
                            filtro === "activos" &&
                            Boolean(
                                cliente.estado
                            )
                        ) ||
                        (
                            filtro === "inactivos" &&
                            !Boolean(
                                cliente.estado
                            )
                        );

                    return (
                        coincideTexto &&
                        coincideEstado
                    );
                }
            );

        pintarClientes(lista);
    }

    function pintarClientes(lista) {
        const tabla =
            $("tablaClientes");

        if (!lista.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="fila-vacia"
                    >
                        No hay clientes para mostrar.
                    </td>
                </tr>
            `;

            return;
        }

        const puedeGestionar =
            tienePermiso(
                "clientes.gestionar"
            );

        tabla.innerHTML =
            lista.map(
                (cliente) => `
                    <tr>
                        <td>
                            ${
                                cliente.documento
                                    ? `
                                        <strong>
                                            ${escapar(
                                                cliente.tipo_documento
                                            )}
                                            ${escapar(
                                                cliente.documento
                                            )}
                                        </strong>
                                      `
                                    : "—"
                            }
                        </td>

                        <td>
                            <strong>
                                ${escapar(
                                    cliente.nombre_completo
                                )}
                            </strong>
                        </td>

                        <td>
                            ${
                                cliente.telefono
                                    ? escapar(cliente.telefono)
                                    : "—"
                            }

                            ${
                                cliente.correo
                                    ? `
                                        <small>
                                            ${escapar(cliente.correo)}
                                        </small>
                                      `
                                    : ""
                            }
                        </td>

                        <td>
                            ${escapar(
                                cliente.ciudad || "—"
                            )}
                        </td>

                        <td>
                            ${Number(
                                cliente.cantidad_ventas
                            ) || 0}
                        </td>

                        <td>
                            <strong>
                                ${moneda(
                                    cliente.total_comprado
                                )}
                            </strong>
                        </td>

                        <td>
                            ${
                                cliente.ultima_compra
                                    ? new Date(
                                          cliente.ultima_compra
                                      ).toLocaleString(
                                          "es-CO"
                                      )
                                    : "Sin compras"
                            }
                        </td>

                        <td>
                            <span
                                class="estado-cliente ${
                                    cliente.estado
                                        ? "activo"
                                        : "inactivo"
                                }"
                            >
                                ${
                                    cliente.estado
                                        ? "Activo"
                                        : "Inactivo"
                                }
                            </span>
                        </td>

                        <td class="acciones-cliente">
                            <button
                                type="button"
                                class="btn-historial"
                                data-accion="historial"
                                data-id="${cliente.id}"
                            >
                                Historial
                            </button>

                            ${
                                puedeGestionar
                                    ? `
                                        <button
                                            type="button"
                                            class="btn-editar"
                                            data-accion="editar"
                                            data-id="${cliente.id}"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            class="${
                                                cliente.estado
                                                    ? "btn-desactivar"
                                                    : "btn-activar"
                                            }"
                                            data-accion="estado"
                                            data-id="${cliente.id}"
                                            data-estado="${
                                                cliente.estado
                                                    ? 0
                                                    : 1
                                            }"
                                        >
                                            ${
                                                cliente.estado
                                                    ? "Desactivar"
                                                    : "Activar"
                                            }
                                        </button>
                                      `
                                    : ""
                            }
                        </td>
                    </tr>
                `
            ).join("");
    }

    async function manejarTabla(
        evento
    ) {
        const boton =
            evento.target.closest(
                "button[data-accion]"
            );

        if (!boton) {
            return;
        }

        const id =
            Number(
                boton.dataset.id
            );

        if (
            boton.dataset.accion ===
            "editar"
        ) {
            await abrirEdicion(id);
        }

        if (
            boton.dataset.accion ===
            "estado"
        ) {
            await cambiarEstado(
                id,
                boton.dataset.estado === "1"
            );
        }

        if (
            boton.dataset.accion ===
            "historial"
        ) {
            await abrirHistorial(id);
        }
    }

    function limpiarFormulario() {
        $("formCliente").reset();

        $("clienteId").value =
            "";

        $("tipoDocumentoCliente").value =
            "CC";

        $("estadoCliente").checked =
            true;
    }

    function abrirNuevo() {
        limpiarFormulario();

        $("tituloModalCliente")
            .textContent =
            "Nuevo cliente";

        $("campoEstadoCliente").hidden =
            true;

        abrirFormulario();

        $("nombresCliente").focus();
    }

    async function abrirEdicion(id) {
        try {
            const cliente =
                await peticion(
                    `/clientes/${id}`
                );

            limpiarFormulario();

            $("tituloModalCliente")
                .textContent =
                "Editar cliente";

            $("clienteId").value =
                cliente.id;

            $("tipoDocumentoCliente").value =
                cliente.tipo_documento ||
                "CC";

            $("documentoCliente").value =
                cliente.documento || "";

            $("nombresCliente").value =
                cliente.nombres || "";

            $("apellidosCliente").value =
                cliente.apellidos || "";

            $("telefonoCliente").value =
                cliente.telefono || "";

            $("correoCliente").value =
                cliente.correo || "";

            $("ciudadCliente").value =
                cliente.ciudad || "";

            $("direccionCliente").value =
                cliente.direccion || "";

            $("estadoCliente").checked =
                Boolean(cliente.estado);

            $("campoEstadoCliente").hidden =
                false;

            abrirFormulario();
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message,
                "error"
            );
        }
    }

    function abrirFormulario() {
        const modal =
            $("modalCliente");

        modal.classList.add(
            "activo"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );
    }

    function cerrarFormulario() {
        if (estado.guardando) {
            return;
        }

        const modal =
            $("modalCliente");

        modal.classList.remove(
            "activo"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    function datosFormulario() {
        return {
            tipo_documento:
                $("tipoDocumentoCliente")
                    .value,

            documento:
                $("documentoCliente")
                    .value
                    .trim(),

            nombres:
                $("nombresCliente")
                    .value
                    .trim(),

            apellidos:
                $("apellidosCliente")
                    .value
                    .trim(),

            telefono:
                $("telefonoCliente")
                    .value
                    .trim(),

            correo:
                $("correoCliente")
                    .value
                    .trim(),

            ciudad:
                $("ciudadCliente")
                    .value
                    .trim(),

            direccion:
                $("direccionCliente")
                    .value
                    .trim(),

            estado:
                $("clienteId").value
                    ? $("estadoCliente")
                          .checked
                    : true
        };
    }

    function validar(datos) {
        if (!datos.nombres) {
            return (
                "El nombre o razón social es obligatorio."
            );
        }

        if (
            datos.correo &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(datos.correo)
        ) {
            return (
                "El correo electrónico no es válido."
            );
        }

        return null;
    }

    async function guardarCliente(
        evento
    ) {
        evento.preventDefault();

        if (estado.guardando) {
            return;
        }

        const id =
            $("clienteId").value;

        const datos =
            datosFormulario();

        const error =
            validar(datos);

        if (error) {
            mostrarMensaje(
                error,
                "error"
            );

            return;
        }

        estado.guardando = true;

        const boton =
            $("btnGuardarCliente");

        boton.disabled = true;
        boton.textContent =
            "Guardando...";

        try {
            const respuesta = id
                ? await peticion(
                      `/clientes/${id}`,
                      "PUT",
                      datos
                  )
                : await peticion(
                      "/clientes",
                      "POST",
                      datos
                  );

            estado.guardando = false;

            cerrarFormulario();

            await Promise.all([
                cargarClientes(),
                cargarEstadisticas()
            ]);

            mostrarMensaje(
                respuesta.mensaje
            );
        } catch (errorPeticion) {
            console.error(
                errorPeticion
            );

            mostrarMensaje(
                errorPeticion.message,
                "error"
            );
        } finally {
            estado.guardando = false;

            boton.disabled = false;

            boton.textContent =
                "Guardar cliente";
        }
    }

    async function cambiarEstado(
        id,
        nuevoEstado
    ) {
        const cliente =
            estado.clientes.find(
                (item) =>
                    Number(item.id) === id
            );

        const accion =
            nuevoEstado
                ? "activar"
                : "desactivar";

        if (
            !window.confirm(
                `¿Deseas ${accion} a ${cliente?.nombre_completo || "este cliente"}?`
            )
        ) {
            return;
        }

        try {
            const respuesta =
                await peticion(
                    `/clientes/${id}/estado`,
                    "PATCH",
                    {
                        estado:
                            nuevoEstado
                    }
                );

            await Promise.all([
                cargarClientes(),
                cargarEstadisticas()
            ]);

            mostrarMensaje(
                respuesta.mensaje
            );
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message,
                "error"
            );
        }
    }

    async function abrirHistorial(id) {
        const modal =
            $("modalHistorialCliente");

        modal.classList.add(
            "activo"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        $("tablaHistorialCliente")
            .innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="fila-vacia"
                    >
                        Cargando historial...
                    </td>
                </tr>
            `;

        try {
            const respuesta =
                await peticion(
                    `/clientes/${id}/historial`
                );

            const cliente =
                respuesta.cliente;

            $("tituloHistorialCliente")
                .textContent =
                cliente.nombre_completo;

            $("resumenHistorialCliente")
                .innerHTML = `
                    <div class="resumen-historial">
                        <p>
                            <b>Documento:</b>
                            ${escapar(
                                cliente.documento ||
                                "Sin documento"
                            )}
                        </p>

                        <p>
                            <b>Ventas:</b>
                            ${Number(
                                cliente.cantidad_ventas
                            )}
                        </p>

                        <p>
                            <b>Total comprado:</b>
                            ${moneda(
                                cliente.total_comprado
                            )}
                        </p>

                        <p>
                            <b>Última compra:</b>
                            ${
                                cliente.ultima_compra
                                    ? new Date(
                                          cliente.ultima_compra
                                      ).toLocaleString(
                                          "es-CO"
                                      )
                                    : "Sin compras"
                            }
                        </p>
                    </div>
                `;

            const ventas =
                Array.isArray(
                    respuesta.ventas
                )
                    ? respuesta.ventas
                    : [];

            if (!ventas.length) {
                $("tablaHistorialCliente")
                    .innerHTML = `
                        <tr>
                            <td
                                colspan="7"
                                class="fila-vacia"
                            >
                                El cliente no tiene ventas registradas.
                            </td>
                        </tr>
                    `;

                return;
            }

            $("tablaHistorialCliente")
                .innerHTML =
                ventas.map(
                    (venta) => `
                        <tr>
                            <td>
                                ${escapar(
                                    venta.numero
                                )}
                            </td>

                            <td>
                                ${new Date(
                                    venta.fecha
                                ).toLocaleString(
                                    "es-CO"
                                )}
                            </td>

                            <td>
                                ${escapar(
                                    venta.vendedor
                                )}
                            </td>

                            <td>
                                ${escapar(
                                    venta.metodo_pago
                                )}
                            </td>

                            <td>
                                ${Number(
                                    venta.productos
                                )}
                                producto(s)

                                <small>
                                    ${Number(
                                        venta.unidades
                                    )}
                                    unidad(es)
                                </small>
                            </td>

                            <td>
                                ${moneda(
                                    venta.total
                                )}
                            </td>

                            <td>
                                <span
                                    class="estado-cliente ${
                                        venta.estado ===
                                            "ANULADA"
                                            ? "inactivo"
                                            : "activo"
                                    }"
                                >
                                    ${escapar(
                                        venta.estado
                                    )}
                                </span>
                            </td>
                        </tr>
                    `
                ).join("");
        } catch (error) {
            console.error(error);

            $("tablaHistorialCliente")
                .innerHTML = `
                    <tr>
                        <td
                            colspan="7"
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
            $("modalHistorialCliente");

        modal.classList.remove(
            "activo"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    inicializar();
})();