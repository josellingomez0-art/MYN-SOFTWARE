(() => {
    "use strict";

    const estado = {
        proveedores: [],
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
            $("mensajeProveedores");

        contenedor.textContent =
            texto;

        contenedor.className =
            `mensaje-proveedores visible ${tipo}`;

        clearTimeout(
            mostrarMensaje.temporizador
        );

        mostrarMensaje.temporizador =
            setTimeout(() => {
                contenedor.textContent =
                    "";

                contenedor.className =
                    "mensaje-proveedores";
            }, 4500);
    }

    async function inicializar() {
        enlazarEventos();

        const puedeGestionar =
            tienePermiso(
                "proveedores.gestionar"
            );

        $("btnNuevoProveedor").hidden =
            !puedeGestionar;

        await Promise.all([
            cargarProveedores(),
            cargarEstadisticas()
        ]);
    }

    function enlazarEventos() {
        $("btnNuevoProveedor")
            .addEventListener(
                "click",
                abrirNuevo
            );

        $("buscarProveedor")
            .addEventListener(
                "input",
                pintarFiltrados
            );

        $("filtroEstadoProveedor")
            .addEventListener(
                "change",
                pintarFiltrados
            );

        $("tablaProveedores")
            .addEventListener(
                "click",
                manejarTabla
            );

        $("formProveedor")
            .addEventListener(
                "submit",
                guardarProveedor
            );

        $("btnCerrarProveedor")
            .addEventListener(
                "click",
                cerrarFormulario
            );

        $("btnCancelarProveedor")
            .addEventListener(
                "click",
                cerrarFormulario
            );

        $("btnCerrarHistorialProveedor")
            .addEventListener(
                "click",
                cerrarHistorial
            );

        $("tabComprasProveedor")
            .addEventListener(
                "click",
                () =>
                    cambiarVistaHistorial(
                        "compras"
                    )
            );

        $("tabProductosProveedor")
            .addEventListener(
                "click",
                () =>
                    cambiarVistaHistorial(
                        "productos"
                    )
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

    async function cargarProveedores() {
        const tabla =
            $("tablaProveedores");

        tabla.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="fila-vacia"
                >
                    Cargando proveedores...
                </td>
            </tr>
        `;

        try {
            const respuesta =
                await peticion(
                    "/proveedores"
                );

            estado.proveedores =
                Array.isArray(respuesta)
                    ? respuesta
                    : [];

            pintarFiltrados();
        } catch (error) {
            console.error(error);

            tabla.innerHTML = `
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

    async function cargarEstadisticas() {
        try {
            const datos =
                await peticion(
                    "/proveedores/estadisticas/resumen"
                );

            $("totalProveedores").textContent =
                Number(
                    datos.total_proveedores
                ) || 0;

            $("proveedoresActivos").textContent =
                Number(
                    datos.proveedores_activos
                ) || 0;

            $("proveedoresInactivos").textContent =
                Number(
                    datos.proveedores_inactivos
                ) || 0;

            $("totalComprasProveedores")
                .textContent =
                moneda(
                    datos.total_compras
                );
        } catch (error) {
            console.error(error);
        }
    }

    function pintarFiltrados() {
        const texto =
            $("buscarProveedor")
                .value
                .trim()
                .toLowerCase();

        const filtro =
            $("filtroEstadoProveedor")
                .value;

        const lista =
            estado.proveedores.filter(
                (proveedor) => {
                    const coincideTexto =
                        !texto ||
                        [
                            proveedor.nit,
                            proveedor.razon_social,
                            proveedor.contacto,
                            proveedor.telefono,
                            proveedor.correo,
                            proveedor.ciudad
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
                                proveedor.estado
                            )
                        ) ||
                        (
                            filtro === "inactivos" &&
                            !Boolean(
                                proveedor.estado
                            )
                        );

                    return (
                        coincideTexto &&
                        coincideEstado
                    );
                }
            );

        pintarProveedores(lista);
    }

    function pintarProveedores(lista) {
        const tabla =
            $("tablaProveedores");

        if (!lista.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="10"
                        class="fila-vacia"
                    >
                        No hay proveedores para mostrar.
                    </td>
                </tr>
            `;

            return;
        }

        const puedeGestionar =
            tienePermiso(
                "proveedores.gestionar"
            );

        tabla.innerHTML =
            lista.map(
                (proveedor) => `
                    <tr>
                        <td>
                            <strong>
                                ${escapar(
                                    proveedor.nit ||
                                    "—"
                                )}
                            </strong>
                        </td>

                        <td>
                            <strong>
                                ${escapar(
                                    proveedor.razon_social
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapar(
                                proveedor.contacto ||
                                "—"
                            )}

                            ${
                                proveedor.telefono
                                    ? `
                                        <small>
                                            ${escapar(
                                                proveedor.telefono
                                            )}
                                        </small>
                                      `
                                    : ""
                            }

                            ${
                                proveedor.correo
                                    ? `
                                        <small>
                                            ${escapar(
                                                proveedor.correo
                                            )}
                                        </small>
                                      `
                                    : ""
                            }
                        </td>

                        <td>
                            ${escapar(
                                proveedor.ciudad ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${Number(
                                proveedor.cantidad_productos
                            ) || 0}
                        </td>

                        <td>
                            ${Number(
                                proveedor.cantidad_compras
                            ) || 0}
                        </td>

                        <td>
                            <strong>
                                ${moneda(
                                    proveedor.total_comprado
                                )}
                            </strong>
                        </td>

                        <td>
                            ${
                                proveedor.ultima_compra
                                    ? new Date(
                                          proveedor.ultima_compra
                                      ).toLocaleString(
                                          "es-CO"
                                      )
                                    : "Sin compras"
                            }
                        </td>

                        <td>
                            <span
                                class="estado-proveedor ${
                                    proveedor.estado
                                        ? "activo"
                                        : "inactivo"
                                }"
                            >
                                ${
                                    proveedor.estado
                                        ? "Activo"
                                        : "Inactivo"
                                }
                            </span>
                        </td>

                        <td class="acciones-proveedor">
                            <button
                                type="button"
                                class="btn-historial"
                                data-accion="historial"
                                data-id="${proveedor.id}"
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
                                            data-id="${proveedor.id}"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            class="${
                                                proveedor.estado
                                                    ? "btn-desactivar"
                                                    : "btn-activar"
                                            }"
                                            data-accion="estado"
                                            data-id="${proveedor.id}"
                                            data-estado="${
                                                proveedor.estado
                                                    ? 0
                                                    : 1
                                            }"
                                        >
                                            ${
                                                proveedor.estado
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
        $("formProveedor").reset();

        $("proveedorId").value =
            "";

        $("estadoProveedor").checked =
            true;
    }

    function abrirNuevo() {
        limpiarFormulario();

        $("tituloModalProveedor")
            .textContent =
            "Nuevo proveedor";

        $("campoEstadoProveedor").hidden =
            true;

        abrirFormulario();

        $("razonSocialProveedor")
            .focus();
    }

    async function abrirEdicion(id) {
        try {
            const proveedor =
                await peticion(
                    `/proveedores/${id}`
                );

            limpiarFormulario();

            $("tituloModalProveedor")
                .textContent =
                "Editar proveedor";

            $("proveedorId").value =
                proveedor.id;

            $("nitProveedor").value =
                proveedor.nit || "";

            $("razonSocialProveedor").value =
                proveedor.razon_social || "";

            $("contactoProveedor").value =
                proveedor.contacto || "";

            $("telefonoProveedor").value =
                proveedor.telefono || "";

            $("correoProveedor").value =
                proveedor.correo || "";

            $("ciudadProveedor").value =
                proveedor.ciudad || "";

            $("direccionProveedor").value =
                proveedor.direccion || "";

            $("estadoProveedor").checked =
                Boolean(
                    proveedor.estado
                );

            $("campoEstadoProveedor").hidden =
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
            $("modalProveedor");

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
            $("modalProveedor");

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
            nit:
                $("nitProveedor")
                    .value
                    .trim(),

            razon_social:
                $("razonSocialProveedor")
                    .value
                    .trim(),

            contacto:
                $("contactoProveedor")
                    .value
                    .trim(),

            telefono:
                $("telefonoProveedor")
                    .value
                    .trim(),

            correo:
                $("correoProveedor")
                    .value
                    .trim(),

            ciudad:
                $("ciudadProveedor")
                    .value
                    .trim(),

            direccion:
                $("direccionProveedor")
                    .value
                    .trim(),

            estado:
                $("proveedorId").value
                    ? $("estadoProveedor")
                          .checked
                    : true
        };
    }

    function validar(datos) {
        if (!datos.razon_social) {
            return (
                "La razón social es obligatoria."
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

    async function guardarProveedor(
        evento
    ) {
        evento.preventDefault();

        if (estado.guardando) {
            return;
        }

        const id =
            $("proveedorId").value;

        const datos =
            datosFormulario();

        const errorValidacion =
            validar(datos);

        if (errorValidacion) {
            mostrarMensaje(
                errorValidacion,
                "error"
            );

            return;
        }

        estado.guardando = true;

        const boton =
            $("btnGuardarProveedor");

        boton.disabled = true;

        boton.textContent =
            "Guardando...";

        try {
            const respuesta = id
                ? await peticion(
                      `/proveedores/${id}`,
                      "PUT",
                      datos
                  )
                : await peticion(
                      "/proveedores",
                      "POST",
                      datos
                  );

            estado.guardando = false;

            cerrarFormulario();

            await Promise.all([
                cargarProveedores(),
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
        } finally {
            estado.guardando = false;

            boton.disabled = false;

            boton.textContent =
                "Guardar proveedor";
        }
    }

    async function cambiarEstado(
        id,
        nuevoEstado
    ) {
        const proveedor =
            estado.proveedores.find(
                (item) =>
                    Number(item.id) === id
            );

        const accion =
            nuevoEstado
                ? "activar"
                : "desactivar";

        if (
            !window.confirm(
                `¿Deseas ${accion} a ${proveedor?.razon_social || "este proveedor"}?`
            )
        ) {
            return;
        }

        try {
            const respuesta =
                await peticion(
                    `/proveedores/${id}/estado`,
                    "PATCH",
                    {
                        estado:
                            nuevoEstado
                    }
                );

            await Promise.all([
                cargarProveedores(),
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
            $("modalHistorialProveedor");

        modal.classList.add(
            "activo"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        cambiarVistaHistorial(
            "compras"
        );

        $("tablaComprasProveedor")
            .innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="fila-vacia"
                    >
                        Cargando compras...
                    </td>
                </tr>
            `;

        $("tablaProductosProveedor")
            .innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="fila-vacia"
                    >
                        Cargando productos...
                    </td>
                </tr>
            `;

        try {
            const respuesta =
                await peticion(
                    `/proveedores/${id}/historial`
                );

            const proveedor =
                respuesta.proveedor;

            $("tituloHistorialProveedor")
                .textContent =
                proveedor.razon_social;

            $("resumenHistorialProveedor")
                .innerHTML = `
                    <div class="resumen-historial">
                        <p>
                            <b>NIT:</b>
                            ${escapar(
                                proveedor.nit ||
                                "Sin NIT"
                            )}
                        </p>

                        <p>
                            <b>Productos:</b>
                            ${Number(
                                proveedor.cantidad_productos
                            )}
                        </p>

                        <p>
                            <b>Compras:</b>
                            ${Number(
                                proveedor.cantidad_compras
                            )}
                        </p>

                        <p>
                            <b>Total comprado:</b>
                            ${moneda(
                                proveedor.total_comprado
                            )}
                        </p>

                        <p>
                            <b>Última compra:</b>
                            ${
                                proveedor.ultima_compra
                                    ? new Date(
                                          proveedor.ultima_compra
                                      ).toLocaleString(
                                          "es-CO"
                                      )
                                    : "Sin compras"
                            }
                        </p>
                    </div>
                `;

            pintarCompras(
                respuesta.compras
            );

            pintarProductos(
                respuesta.productos
            );
        } catch (error) {
            console.error(error);

            $("tablaComprasProveedor")
                .innerHTML = `
                    <tr>
                        <td
                            colspan="8"
                            class="fila-vacia error"
                        >
                            ${escapar(error.message)}
                        </td>
                    </tr>
                `;

            $("tablaProductosProveedor")
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

    function pintarCompras(compras) {
        const lista =
            Array.isArray(compras)
                ? compras
                : [];

        const tabla =
            $("tablaComprasProveedor");

        if (!lista.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="fila-vacia"
                    >
                        El proveedor no tiene compras registradas.
                    </td>
                </tr>
            `;

            return;
        }

        tabla.innerHTML =
            lista.map(
                (compra) => `
                    <tr>
                        <td>
                            ${escapar(
                                compra.numero
                            )}
                        </td>

                        <td>
                            ${new Date(
                                compra.fecha
                            ).toLocaleString(
                                "es-CO"
                            )}
                        </td>

                        <td>
                            ${escapar(
                                compra.factura_proveedor ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapar(
                                compra.usuario
                            )}
                        </td>

                        <td>
                            ${escapar(
                                compra.forma_pago
                            )}
                        </td>

                        <td>
                            ${Number(
                                compra.productos
                            )}
                            producto(s)

                            <small>
                                ${Number(
                                    compra.unidades
                                )}
                                unidad(es)
                            </small>
                        </td>

                        <td>
                            ${moneda(
                                compra.total
                            )}
                        </td>

                        <td>
                            <span
                                class="estado-proveedor ${
                                    compra.estado ===
                                        "ANULADA"
                                        ? "inactivo"
                                        : "activo"
                                }"
                            >
                                ${escapar(
                                    compra.estado
                                )}
                            </span>
                        </td>
                    </tr>
                `
            ).join("");
    }

    function pintarProductos(productos) {
        const lista =
            Array.isArray(productos)
                ? productos
                : [];

        const tabla =
            $("tablaProductosProveedor");

        if (!lista.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="fila-vacia"
                    >
                        El proveedor no tiene productos relacionados.
                    </td>
                </tr>
            `;

            return;
        }

        tabla.innerHTML =
            lista.map(
                (producto) => `
                    <tr>
                        <td>
                            ${escapar(
                                producto.codigo
                            )}
                        </td>

                        <td>
                            ${escapar(
                                producto.nombre
                            )}
                        </td>

                        <td>
                            ${escapar(
                                producto.marca ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${moneda(
                                producto.costo
                            )}
                        </td>

                        <td>
                            ${moneda(
                                producto.precio
                            )}
                        </td>

                        <td>
                            ${Number(
                                producto.stock_actual
                            )}
                        </td>

                        <td>
                            <span
                                class="estado-proveedor ${
                                    producto.estado
                                        ? "activo"
                                        : "inactivo"
                                }"
                            >
                                ${
                                    producto.estado
                                        ? "Activo"
                                        : "Inactivo"
                                }
                            </span>
                        </td>
                    </tr>
                `
            ).join("");
    }

    function cambiarVistaHistorial(
        vista
    ) {
        const compras =
            vista === "compras";

        $("vistaComprasProveedor")
            .classList.toggle(
                "activa",
                compras
            );

        $("vistaProductosProveedor")
            .classList.toggle(
                "activa",
                !compras
            );

        $("tabComprasProveedor")
            .classList.toggle(
                "activo",
                compras
            );

        $("tabProductosProveedor")
            .classList.toggle(
                "activo",
                !compras
            );
    }

    function cerrarHistorial() {
        const modal =
            $("modalHistorialProveedor");

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