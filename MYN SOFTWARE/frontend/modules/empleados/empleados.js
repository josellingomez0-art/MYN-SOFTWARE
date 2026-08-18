(() => {
    "use strict";

    const estado = {
        empleados: [],
        roles: [],
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
            $("mensajeEmpleados");

        contenedor.textContent =
            texto;

        contenedor.className =
            `mensaje-empleados visible ${tipo}`;

        clearTimeout(
            mostrarMensaje.temporizador
        );

        mostrarMensaje.temporizador =
            setTimeout(() => {
                contenedor.textContent = "";
                contenedor.className =
                    "mensaje-empleados";
            }, 4500);
    }

    async function inicializar() {
        enlazarEventos();

        const puedeGestionar =
            tienePermiso(
                "usuarios.gestionar"
            );

        $("btnNuevoEmpleado").hidden =
            !puedeGestionar;

        await cargarRoles();

        await Promise.all([
            cargarEmpleados(),
            cargarEstadisticas()
        ]);
    }

    function enlazarEventos() {
        $("btnNuevoEmpleado")
            .addEventListener(
                "click",
                abrirNuevo
            );

        $("buscarEmpleado")
            .addEventListener(
                "input",
                pintarFiltrados
            );

        $("filtroRolEmpleado")
            .addEventListener(
                "change",
                pintarFiltrados
            );

        $("filtroEstadoEmpleado")
            .addEventListener(
                "change",
                pintarFiltrados
            );

        $("tablaEmpleados")
            .addEventListener(
                "click",
                manejarTabla
            );

        $("formEmpleado")
            .addEventListener(
                "submit",
                guardarEmpleado
            );

        $("btnCerrarEmpleado")
            .addEventListener(
                "click",
                cerrarFormulario
            );

        $("btnCancelarEmpleado")
            .addEventListener(
                "click",
                cerrarFormulario
            );

        $("formPasswordEmpleado")
            .addEventListener(
                "submit",
                guardarPassword
            );

        $("btnCerrarPasswordEmpleado")
            .addEventListener(
                "click",
                cerrarPassword
            );

        $("btnCancelarPasswordEmpleado")
            .addEventListener(
                "click",
                cerrarPassword
            );

        $("btnCerrarActividadEmpleado")
            .addEventListener(
                "click",
                cerrarActividad
            );

        $("tabVentasEmpleado")
            .addEventListener(
                "click",
                () =>
                    cambiarVistaActividad(
                        "ventas"
                    )
            );

        $("tabComprasEmpleado")
            .addEventListener(
                "click",
                () =>
                    cambiarVistaActividad(
                        "compras"
                    )
            );

        document.addEventListener(
            "keydown",
            (evento) => {
                if (
                    evento.key === "Escape"
                ) {
                    cerrarFormulario();
                    cerrarPassword();
                    cerrarActividad();
                }
            }
        );
    }

    async function cargarRoles() {
        try {
            const respuesta =
                await peticion(
                    "/roles"
                );

            estado.roles =
                Array.isArray(respuesta)
                    ? respuesta
                    : [];

            const opciones =
                estado.roles.map(
                    (rol) => `
                        <option value="${rol.id}">
                            ${escapar(rol.nombre)}
                        </option>
                    `
                ).join("");

            $("rolEmpleado").innerHTML =
                opciones;

            $("filtroRolEmpleado")
                .innerHTML = `
                    <option value="">
                        Todos los roles
                    </option>
                    ${opciones}
                `;
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No se pudieron cargar los roles",
                "error"
            );
        }
    }

    async function cargarEmpleados() {
        const tabla =
            $("tablaEmpleados");

        tabla.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="fila-vacia"
                >
                    Cargando empleados...
                </td>
            </tr>
        `;

        try {
            const respuesta =
                await peticion(
                    "/usuarios"
                );

            estado.empleados =
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
                    "/usuarios/estadisticas/resumen"
                );

            $("totalEmpleados").textContent =
                Number(
                    datos.total_empleados
                ) || 0;

            $("empleadosActivos").textContent =
                Number(
                    datos.empleados_activos
                ) || 0;

            $("empleadosInactivos").textContent =
                Number(
                    datos.empleados_inactivos
                ) || 0;

            $("rolesAsignados").textContent =
                Number(
                    datos.roles_asignados
                ) || 0;
        } catch (error) {
            console.error(error);
        }
    }

    function pintarFiltrados() {
        const texto =
            $("buscarEmpleado")
                .value
                .trim()
                .toLowerCase();

        const idRol =
            $("filtroRolEmpleado").value;

        const filtroEstado =
            $("filtroEstadoEmpleado").value;

        const lista =
            estado.empleados.filter(
                (empleado) => {
                    const coincideTexto =
                        !texto ||
                        [
                            empleado.documento,
                            empleado.nombres,
                            empleado.apellidos,
                            empleado.telefono,
                            empleado.correo,
                            empleado.rol
                        ].some(
                            (valor) =>
                                String(
                                    valor || ""
                                )
                                    .toLowerCase()
                                    .includes(texto)
                        );

                    const coincideRol =
                        !idRol ||
                        Number(
                            empleado.id_rol
                        ) === Number(idRol);

                    const coincideEstado =
                        filtroEstado ===
                            "todos" ||
                        (
                            filtroEstado ===
                                "activos" &&
                            Boolean(
                                empleado.estado
                            )
                        ) ||
                        (
                            filtroEstado ===
                                "inactivos" &&
                            !Boolean(
                                empleado.estado
                            )
                        );

                    return (
                        coincideTexto &&
                        coincideRol &&
                        coincideEstado
                    );
                }
            );

        pintarEmpleados(lista);
    }

    function pintarEmpleados(lista) {
        const tabla =
            $("tablaEmpleados");

        if (!lista.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="10"
                        class="fila-vacia"
                    >
                        No hay empleados para mostrar.
                    </td>
                </tr>
            `;

            return;
        }

        const puedeGestionar =
            tienePermiso(
                "usuarios.gestionar"
            );

        tabla.innerHTML =
            lista.map(
                (empleado) => `
                    <tr>
                        <td>
                            ${escapar(
                                empleado.documento ||
                                "—"
                            )}
                        </td>

                        <td>
                            <strong>
                                ${escapar(
                                    empleado.nombre_completo
                                )}
                            </strong>
                        </td>

                        <td>
                            <span class="rol-empleado">
                                ${escapar(empleado.rol)}
                            </span>
                        </td>

                        <td>
                            ${escapar(
                                empleado.telefono ||
                                "—"
                            )}

                            <small>
                                ${escapar(
                                    empleado.correo
                                )}
                            </small>
                        </td>

                        <td>
                            ${Number(
                                empleado.cantidad_ventas
                            ) || 0}
                        </td>

                        <td>
                            <strong>
                                ${moneda(
                                    empleado.total_vendido
                                )}
                            </strong>
                        </td>

                        <td>
                            ${Number(
                                empleado.cantidad_compras
                            ) || 0}
                        </td>

                        <td>
                            ${
                                empleado.ultimo_acceso
                                    ? new Date(
                                          empleado.ultimo_acceso
                                      ).toLocaleString(
                                          "es-CO"
                                      )
                                    : "Sin registro"
                            }
                        </td>

                        <td>
                            <span
                                class="estado-empleado ${
                                    empleado.estado
                                        ? "activo"
                                        : "inactivo"
                                }"
                            >
                                ${
                                    empleado.estado
                                        ? "Activo"
                                        : "Inactivo"
                                }
                            </span>
                        </td>

                        <td class="acciones-empleado">
                            <button
                                type="button"
                                class="btn-actividad"
                                data-accion="actividad"
                                data-id="${empleado.id}"
                            >
                                Actividad
                            </button>

                            ${
                                puedeGestionar
                                    ? `
                                        <button
                                            type="button"
                                            class="btn-editar"
                                            data-accion="editar"
                                            data-id="${empleado.id}"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            class="btn-password"
                                            data-accion="password"
                                            data-id="${empleado.id}"
                                        >
                                            Contraseña
                                        </button>

                                        <button
                                            type="button"
                                            class="${
                                                empleado.estado
                                                    ? "btn-desactivar"
                                                    : "btn-activar"
                                            }"
                                            data-accion="estado"
                                            data-id="${empleado.id}"
                                            data-estado="${
                                                empleado.estado
                                                    ? 0
                                                    : 1
                                            }"
                                        >
                                            ${
                                                empleado.estado
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

    async function manejarTabla(evento) {
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
            "password"
        ) {
            abrirPassword(id);
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
            "actividad"
        ) {
            await abrirActividad(id);
        }
    }

    function limpiarFormulario() {
        $("formEmpleado").reset();

        $("empleadoId").value = "";
        $("estadoEmpleado").checked = true;
    }

    function abrirNuevo() {
        limpiarFormulario();

        $("tituloModalEmpleado")
            .textContent =
            "Nuevo empleado";

        $("campoPasswordEmpleado").hidden =
            false;

        $("campoEstadoEmpleado").hidden =
            true;

        abrirFormulario();

        $("nombresEmpleado").focus();
    }

    async function abrirEdicion(id) {
        try {
            const empleado =
                await peticion(
                    `/usuarios/${id}`
                );

            limpiarFormulario();

            $("tituloModalEmpleado")
                .textContent =
                "Editar empleado";

            $("empleadoId").value =
                empleado.id;

            $("nombresEmpleado").value =
                empleado.nombres || "";

            $("apellidosEmpleado").value =
                empleado.apellidos || "";

            $("documentoEmpleado").value =
                empleado.documento || "";

            $("rolEmpleado").value =
                empleado.id_rol;

            $("telefonoEmpleado").value =
                empleado.telefono || "";

            $("correoEmpleado").value =
                empleado.correo || "";

            $("passwordEmpleado").value =
                "";

            $("estadoEmpleado").checked =
                Boolean(
                    empleado.estado
                );

            $("campoPasswordEmpleado").hidden =
                true;

            $("campoEstadoEmpleado").hidden =
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
            $("modalEmpleado");

        modal.classList.add("activo");

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
            $("modalEmpleado");

        modal.classList.remove("activo");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    function datosFormulario() {
        return {
            nombres:
                $("nombresEmpleado")
                    .value
                    .trim(),

            apellidos:
                $("apellidosEmpleado")
                    .value
                    .trim(),

            documento:
                $("documentoEmpleado")
                    .value
                    .trim(),

            id_rol:
                Number(
                    $("rolEmpleado").value
                ),

            telefono:
                $("telefonoEmpleado")
                    .value
                    .trim(),

            correo:
                $("correoEmpleado")
                    .value
                    .trim(),

            estado:
                $("empleadoId").value
                    ? $("estadoEmpleado")
                          .checked
                    : true,

            password:
                $("passwordEmpleado").value
        };
    }

    function passwordValido(password) {
        return (
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /\d/.test(password)
        );
    }

    function validar(datos, esNuevo) {
        if (
            !datos.nombres ||
            !datos.apellidos
        ) {
            return (
                "Los nombres y apellidos son obligatorios."
            );
        }

        if (!datos.id_rol) {
            return (
                "Selecciona un rol."
            );
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(datos.correo)
        ) {
            return (
                "El correo electrónico no es válido."
            );
        }

        if (
            esNuevo &&
            !passwordValido(
                datos.password
            )
        ) {
            return (
                "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número."
            );
        }

        return null;
    }

    async function guardarEmpleado(
        evento
    ) {
        evento.preventDefault();

        if (estado.guardando) {
            return;
        }

        const id =
            $("empleadoId").value;

        const datos =
            datosFormulario();

        const errorValidacion =
            validar(
                datos,
                !id
            );

        if (errorValidacion) {
            mostrarMensaje(
                errorValidacion,
                "error"
            );

            return;
        }

        estado.guardando = true;

        const boton =
            $("btnGuardarEmpleado");

        boton.disabled = true;
        boton.textContent =
            "Guardando...";

        try {
            const respuesta = id
                ? await peticion(
                      `/usuarios/${id}`,
                      "PUT",
                      datos
                  )
                : await peticion(
                      "/usuarios",
                      "POST",
                      datos
                  );

            estado.guardando = false;

            cerrarFormulario();

            await Promise.all([
                cargarEmpleados(),
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
                "Guardar empleado";
        }
    }

    function abrirPassword(id) {
        const empleado =
            estado.empleados.find(
                (item) =>
                    Number(item.id) === id
            );

        if (!empleado) {
            return;
        }

        $("idPasswordEmpleado").value =
            id;

        $("nombrePasswordEmpleado")
            .textContent =
            empleado.nombre_completo;

        $("nuevaPasswordEmpleado").value =
            "";

        $("confirmarPasswordEmpleado").value =
            "";

        const modal =
            $("modalPasswordEmpleado");

        modal.classList.add("activo");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        $("nuevaPasswordEmpleado").focus();
    }

    function cerrarPassword() {
        if (estado.guardando) {
            return;
        }

        const modal =
            $("modalPasswordEmpleado");

        modal.classList.remove("activo");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    async function guardarPassword(
        evento
    ) {
        evento.preventDefault();

        if (estado.guardando) {
            return;
        }

        const id =
            Number(
                $("idPasswordEmpleado").value
            );

        const password =
            $("nuevaPasswordEmpleado").value;

        const confirmacion =
            $("confirmarPasswordEmpleado").value;

        if (
            password !== confirmacion
        ) {
            mostrarMensaje(
                "Las contraseñas no coinciden",
                "error"
            );

            return;
        }

        if (!passwordValido(password)) {
            mostrarMensaje(
                "La contraseña no cumple los requisitos",
                "error"
            );

            return;
        }

        estado.guardando = true;

        const boton =
            $("btnGuardarPasswordEmpleado");

        boton.disabled = true;
        boton.textContent =
            "Actualizando...";

        try {
            const respuesta =
                await peticion(
                    `/usuarios/${id}/password`,
                    "PATCH",
                    {
                        password,
                        confirmacion
                    }
                );

            estado.guardando = false;
            cerrarPassword();

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
                "Actualizar contraseña";
        }
    }

    async function cambiarEstado(
        id,
        nuevoEstado
    ) {
        const empleado =
            estado.empleados.find(
                (item) =>
                    Number(item.id) === id
            );

        const accion =
            nuevoEstado
                ? "activar"
                : "desactivar";

        if (
            !window.confirm(
                `¿Deseas ${accion} a ${empleado?.nombre_completo || "este empleado"}?`
            )
        ) {
            return;
        }

        try {
            const respuesta =
                await peticion(
                    `/usuarios/${id}/estado`,
                    "PATCH",
                    {
                        estado:
                            nuevoEstado
                    }
                );

            await Promise.all([
                cargarEmpleados(),
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

    async function abrirActividad(id) {
        const modal =
            $("modalActividadEmpleado");

        modal.classList.add("activo");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        cambiarVistaActividad(
            "ventas"
        );

        try {
            const respuesta =
                await peticion(
                    `/usuarios/${id}/actividad`
                );

            const usuario =
                respuesta.usuario;

            $("tituloActividadEmpleado")
                .textContent =
                usuario.nombre_completo;

            $("resumenActividadEmpleado")
                .innerHTML = `
                    <div class="resumen-actividad">
                        <p>
                            <b>Rol:</b>
                            ${escapar(usuario.rol)}
                        </p>

                        <p>
                            <b>Ventas:</b>
                            ${Number(
                                usuario.cantidad_ventas
                            )}
                        </p>

                        <p>
                            <b>Total vendido:</b>
                            ${moneda(
                                usuario.total_vendido
                            )}
                        </p>

                        <p>
                            <b>Compras:</b>
                            ${Number(
                                usuario.cantidad_compras
                            )}
                        </p>
                    </div>
                `;

            pintarVentas(
                respuesta.ventas
            );

            pintarCompras(
                respuesta.compras
            );
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message,
                "error"
            );
        }
    }

    function pintarVentas(ventas) {
        const lista =
            Array.isArray(ventas)
                ? ventas
                : [];

        const tabla =
            $("tablaVentasEmpleado");

        if (!lista.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="fila-vacia"
                    >
                        No hay ventas registradas.
                    </td>
                </tr>
            `;

            return;
        }

        tabla.innerHTML =
            lista.map(
                (venta) => `
                    <tr>
                        <td>
                            ${escapar(venta.numero)}
                        </td>

                        <td>
                            ${new Date(
                                venta.fecha
                            ).toLocaleString("es-CO")}
                        </td>

                        <td>
                            ${escapar(
                                venta.cliente?.trim() ||
                                "Cliente general"
                            )}
                        </td>

                        <td>
                            ${escapar(
                                venta.metodo_pago
                            )}
                        </td>

                        <td>
                            ${moneda(venta.total)}
                        </td>

                        <td>
                            <span
                                class="estado-empleado ${
                                    venta.estado ===
                                        "ANULADA"
                                        ? "inactivo"
                                        : "activo"
                                }"
                            >
                                ${escapar(venta.estado)}
                            </span>
                        </td>
                    </tr>
                `
            ).join("");
    }

    function pintarCompras(compras) {
        const lista =
            Array.isArray(compras)
                ? compras
                : [];

        const tabla =
            $("tablaComprasEmpleado");

        if (!lista.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="fila-vacia"
                    >
                        No hay compras registradas.
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
                            ${escapar(compra.numero)}
                        </td>

                        <td>
                            ${new Date(
                                compra.fecha
                            ).toLocaleString("es-CO")}
                        </td>

                        <td>
                            ${escapar(
                                compra.proveedor
                            )}
                        </td>

                        <td>
                            ${escapar(
                                compra.forma_pago
                            )}
                        </td>

                        <td>
                            ${moneda(compra.total)}
                        </td>

                        <td>
                            <span
                                class="estado-empleado ${
                                    compra.estado ===
                                        "ANULADA"
                                        ? "inactivo"
                                        : "activo"
                                }"
                            >
                                ${escapar(compra.estado)}
                            </span>
                        </td>
                    </tr>
                `
            ).join("");
    }

    function cambiarVistaActividad(
        vista
    ) {
        const esVentas =
            vista === "ventas";

        $("vistaVentasEmpleado")
            .classList.toggle(
                "activa",
                esVentas
            );

        $("vistaComprasEmpleado")
            .classList.toggle(
                "activa",
                !esVentas
            );

        $("tabVentasEmpleado")
            .classList.toggle(
                "activo",
                esVentas
            );

        $("tabComprasEmpleado")
            .classList.toggle(
                "activo",
                !esVentas
            );
    }

    function cerrarActividad() {
        const modal =
            $("modalActividadEmpleado");

        modal.classList.remove("activo");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    inicializar();
})();