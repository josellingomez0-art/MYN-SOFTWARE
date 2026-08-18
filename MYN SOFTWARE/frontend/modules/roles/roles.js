(() => {
    "use strict";

    const estado = {
        roles: [],
        catalogo: [],
        idRolActual: null,
        permisosActuales: [],
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
        const contenedor =
            $("mensajeRoles");

        contenedor.textContent =
            texto;

        contenedor.className =
            `mensaje-roles visible ${tipo}`;

        clearTimeout(
            mostrarMensaje.temporizador
        );

        mostrarMensaje.temporizador =
            setTimeout(() => {
                contenedor.textContent = "";
                contenedor.className =
                    "mensaje-roles";
            }, 4500);
    }

    async function inicializar() {
        enlazarEventos();

        await Promise.all([
            cargarCatalogo(),
            cargarRoles(),
            cargarEstadisticas()
        ]);
    }

    function enlazarEventos() {
        $("btnNuevoRol")
            .addEventListener(
                "click",
                abrirNuevoRol
            );

        $("buscarRol")
            .addEventListener(
                "input",
                pintarRolesFiltrados
            );

        $("filtroEstadoRol")
            .addEventListener(
                "change",
                pintarRolesFiltrados
            );

        $("listaRoles")
            .addEventListener(
                "click",
                manejarListaRoles
            );

        $("matrizPermisos")
            .addEventListener(
                "change",
                actualizarPermisosLocales
            );

        $("btnGuardarPermisos")
            .addEventListener(
                "click",
                guardarPermisos
            );

        $("btnSeleccionarTodos")
            .addEventListener(
                "click",
                seleccionarTodos
            );

        $("btnLimpiarPermisos")
            .addEventListener(
                "click",
                limpiarPermisos
            );

        $("formRol")
            .addEventListener(
                "submit",
                guardarRol
            );

        $("btnCerrarRol")
            .addEventListener(
                "click",
                cerrarModalRol
            );

        $("btnCancelarRol")
            .addEventListener(
                "click",
                cerrarModalRol
            );

        document.addEventListener(
            "keydown",
            (evento) => {
                if (
                    evento.key === "Escape"
                ) {
                    cerrarModalRol();
                }
            }
        );
    }

    async function cargarRoles() {
        try {
            const respuesta =
                await peticion(
                    "/roles?estado=todos"
                );

            estado.roles =
                Array.isArray(respuesta)
                    ? respuesta
                    : [];

            pintarRolesFiltrados();

            if (
                estado.idRolActual &&
                !estado.roles.some(
                    (rol) =>
                        Number(rol.id) ===
                        Number(
                            estado.idRolActual
                        )
                )
            ) {
                limpiarSeleccion();
            }
        } catch (error) {
            console.error(error);

            $("listaRoles").innerHTML = `
                <p class="fila-vacia error">
                    ${escapar(error.message)}
                </p>
            `;
        }
    }

    async function cargarCatalogo() {
        try {
            const respuesta =
                await peticion(
                    "/permisos"
                );

            estado.catalogo =
                Array.isArray(respuesta)
                    ? respuesta
                    : [];
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No se pudo cargar el catálogo de permisos",
                "error"
            );
        }
    }

    async function cargarEstadisticas() {
        try {
            const datos =
                await peticion(
                    "/roles/estadisticas/resumen"
                );

            $("totalRoles").textContent =
                Number(datos.total_roles) ||
                0;

            $("rolesActivos").textContent =
                Number(datos.roles_activos) ||
                0;

            $("rolesInactivos").textContent =
                Number(datos.roles_inactivos) ||
                0;

            $("permisosActivos").textContent =
                Number(datos.permisos_activos) ||
                0;
        } catch (error) {
            console.error(error);
        }
    }

    function pintarRolesFiltrados() {
        const texto =
            $("buscarRol")
                .value
                .trim()
                .toLowerCase();

        const filtro =
            $("filtroEstadoRol").value;

        const lista =
            estado.roles.filter(
                (rol) => {
                    const coincideTexto =
                        !texto ||
                        [
                            rol.nombre,
                            rol.descripcion
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
                            Boolean(rol.estado)
                        ) ||
                        (
                            filtro === "inactivos" &&
                            !Boolean(rol.estado)
                        );

                    return (
                        coincideTexto &&
                        coincideEstado
                    );
                }
            );

        pintarRoles(lista);
    }

    function pintarRoles(lista) {
        const contenedor =
            $("listaRoles");

        if (!lista.length) {
            contenedor.innerHTML = `
                <p class="fila-vacia">
                    No hay roles para mostrar.
                </p>
            `;

            return;
        }

        contenedor.innerHTML =
            lista.map(
                (rol) => `
                    <article
                        class="tarjeta-rol ${
                            Number(rol.id) ===
                            Number(
                                estado.idRolActual
                            )
                                ? "seleccionado"
                                : ""
                        }"
                        data-id="${rol.id}"
                    >
                        <button
                            type="button"
                            class="rol-seleccionar"
                            data-accion="seleccionar"
                            data-id="${rol.id}"
                        >
                            <span>
                                <strong>
                                    ${escapar(rol.nombre)}
                                </strong>

                                <small>
                                    ${escapar(
                                        rol.descripcion ||
                                        "Sin descripción"
                                    )}
                                </small>
                            </span>

                            <span
                                class="estado-rol ${
                                    rol.estado
                                        ? "activo"
                                        : "inactivo"
                                }"
                            >
                                ${
                                    rol.estado
                                        ? "Activo"
                                        : "Inactivo"
                                }
                            </span>
                        </button>

                        <div class="datos-rol">
                            <span>
                                ${Number(
                                    rol.cantidad_empleados
                                ) || 0}
                                empleado(s)
                            </span>

                            <span>
                                ${Number(
                                    rol.cantidad_permisos
                                ) || 0}
                                permiso(s)
                            </span>
                        </div>

                        <div class="acciones-rol">
                            <button
                                type="button"
                                class="btn-editar"
                                data-accion="editar"
                                data-id="${rol.id}"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="${
                                    rol.estado
                                        ? "btn-desactivar"
                                        : "btn-activar"
                                }"
                                data-accion="estado"
                                data-id="${rol.id}"
                                data-estado="${
                                    rol.estado
                                        ? 0
                                        : 1
                                }"
                            >
                                ${
                                    rol.estado
                                        ? "Desactivar"
                                        : "Activar"
                                }
                            </button>
                        </div>
                    </article>
                `
            ).join("");
    }

    async function manejarListaRoles(
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
            Number(boton.dataset.id);

        if (
            boton.dataset.accion ===
            "seleccionar"
        ) {
            await seleccionarRol(id);
        }

        if (
            boton.dataset.accion ===
            "editar"
        ) {
            await abrirEdicionRol(id);
        }

        if (
            boton.dataset.accion ===
            "estado"
        ) {
            await cambiarEstadoRol(
                id,
                boton.dataset.estado === "1"
            );
        }
    }

    async function seleccionarRol(id) {
        estado.idRolActual = id;

        pintarRolesFiltrados();

        const rol =
            estado.roles.find(
                (item) =>
                    Number(item.id) === id
            );

        $("tituloPermisosRol")
            .textContent =
            rol?.nombre ||
            "Rol";

        $("descripcionPermisosRol")
            .textContent =
            rol?.descripcion ||
            "Configura los permisos asignados.";

        $("matrizPermisos").innerHTML =
            "Cargando permisos...";

        try {
            const permisos =
                await peticion(
                    `/permisos/rol/${id}`
                );

            estado.permisosActuales =
                permisos.map(
                    (permiso) =>
                        Number(permiso.id)
                );

            pintarMatrizPermisos();

            $("btnGuardarPermisos")
                .disabled = false;

            $("btnSeleccionarTodos")
                .disabled = false;

            $("btnLimpiarPermisos")
                .disabled = false;
        } catch (error) {
            console.error(error);

            $("matrizPermisos").innerHTML = `
                <p class="fila-vacia error">
                    ${escapar(error.message)}
                </p>
            `;
        }
    }

    function pintarMatrizPermisos() {
        const grupos = {};

        estado.catalogo.forEach(
            (permiso) => {
                const modulo =
                    permiso.nombre
                        .split(".")[0];

                if (!grupos[modulo]) {
                    grupos[modulo] = [];
                }

                grupos[modulo].push(
                    permiso
                );
            }
        );

        const modulos =
            Object.keys(grupos).sort();

        if (!modulos.length) {
            $("matrizPermisos").innerHTML = `
                <p class="fila-vacia">
                    No hay permisos activos.
                </p>
            `;

            return;
        }

        $("matrizPermisos").innerHTML =
            modulos.map(
                (modulo) => `
                    <section class="grupo-permisos">
                        <div class="grupo-permisos-titulo">
                            <h3>
                                ${escapar(modulo)}
                            </h3>

                            <button
                                type="button"
                                class="btn-modulo"
                                data-modulo="${escapar(modulo)}"
                            >
                                Alternar módulo
                            </button>
                        </div>

                        <div class="permisos-modulo">
                            ${grupos[modulo]
                                .map(
                                    (permiso) => `
                                        <label class="permiso-item">
                                            <input
                                                type="checkbox"
                                                class="chk-permiso"
                                                value="${permiso.id}"
                                                data-modulo="${escapar(modulo)}"
                                                ${
                                                    estado.permisosActuales
                                                        .includes(
                                                            Number(
                                                                permiso.id
                                                            )
                                                        )
                                                        ? "checked"
                                                        : ""
                                                }
                                            >

                                            <span>
                                                <strong>
                                                    ${escapar(
                                                        permiso.nombre
                                                    )}
                                                </strong>

                                                <small>
                                                    ${escapar(
                                                        permiso.descripcion ||
                                                        "Sin descripción"
                                                    )}
                                                </small>
                                            </span>
                                        </label>
                                    `
                                )
                                .join("")}
                        </div>
                    </section>
                `
            ).join("");

        document
            .querySelectorAll(
                ".btn-modulo"
            )
            .forEach((boton) => {
                boton.addEventListener(
                    "click",
                    () =>
                        alternarModulo(
                            boton.dataset.modulo
                        )
                );
            });
    }

    function actualizarPermisosLocales() {
        estado.permisosActuales =
            Array.from(
                document.querySelectorAll(
                    ".chk-permiso:checked"
                )
            ).map(
                (checkbox) =>
                    Number(checkbox.value)
            );
    }

    function alternarModulo(modulo) {
        const checks =
            Array.from(
                document.querySelectorAll(
                    `.chk-permiso[data-modulo="${CSS.escape(modulo)}"]`
                )
            );

        const todosMarcados =
            checks.every(
                (check) => check.checked
            );

        checks.forEach(
            (check) => {
                check.checked =
                    !todosMarcados;
            }
        );

        actualizarPermisosLocales();
    }

    function seleccionarTodos() {
        document
            .querySelectorAll(
                ".chk-permiso"
            )
            .forEach(
                (check) => {
                    check.checked = true;
                }
            );

        actualizarPermisosLocales();
    }

    function limpiarPermisos() {
        document
            .querySelectorAll(
                ".chk-permiso"
            )
            .forEach(
                (check) => {
                    check.checked = false;
                }
            );

        actualizarPermisosLocales();
    }

    async function guardarPermisos() {
        if (
            !estado.idRolActual ||
            estado.guardando
        ) {
            return;
        }

        actualizarPermisosLocales();

        if (
            !window.confirm(
                "¿Guardar los permisos seleccionados para este rol?"
            )
        ) {
            return;
        }

        estado.guardando = true;

        const boton =
            $("btnGuardarPermisos");

        boton.disabled = true;
        boton.textContent =
            "Guardando...";

        try {
            const respuesta =
                await peticion(
                    `/permisos/rol/${estado.idRolActual}`,
                    "PUT",
                    {
                        permisos:
                            estado.permisosActuales
                    }
                );

            await cargarRoles();

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
                "Guardar permisos";
        }
    }

    function limpiarFormularioRol() {
        $("formRol").reset();
        $("rolId").value = "";
        $("estadoRol").checked = true;
    }

    function abrirNuevoRol() {
        limpiarFormularioRol();

        $("tituloModalRol")
            .textContent =
            "Nuevo rol";

        $("campoEstadoRol").hidden =
            true;

        abrirModalRol();

        $("nombreRol").focus();
    }

    async function abrirEdicionRol(id) {
        try {
            const rol =
                await peticion(
                    `/roles/${id}`
                );

            limpiarFormularioRol();

            $("tituloModalRol")
                .textContent =
                "Editar rol";

            $("rolId").value =
                rol.id;

            $("nombreRol").value =
                rol.nombre || "";

            $("descripcionRol").value =
                rol.descripcion || "";

            $("estadoRol").checked =
                Boolean(rol.estado);

            $("campoEstadoRol").hidden =
                false;

            abrirModalRol();
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message,
                "error"
            );
        }
    }

    function abrirModalRol() {
        const modal =
            $("modalRol");

        modal.classList.add("activo");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );
    }

    function cerrarModalRol() {
        if (estado.guardando) {
            return;
        }

        const modal =
            $("modalRol");

        modal.classList.remove("activo");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    async function guardarRol(evento) {
        evento.preventDefault();

        if (estado.guardando) {
            return;
        }

        const id =
            $("rolId").value;

        const datos = {
            nombre:
                $("nombreRol")
                    .value
                    .trim(),

            descripcion:
                $("descripcionRol")
                    .value
                    .trim(),

            estado:
                id
                    ? $("estadoRol").checked
                    : true
        };

        if (datos.nombre.length < 3) {
            mostrarMensaje(
                "El nombre debe tener al menos 3 caracteres",
                "error"
            );

            return;
        }

        estado.guardando = true;

        const boton =
            $("btnGuardarRol");

        boton.disabled = true;
        boton.textContent =
            "Guardando...";

        try {
            const respuesta = id
                ? await peticion(
                      `/roles/${id}`,
                      "PUT",
                      datos
                  )
                : await peticion(
                      "/roles",
                      "POST",
                      datos
                  );

            estado.guardando = false;
            cerrarModalRol();

            await Promise.all([
                cargarRoles(),
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
                "Guardar rol";
        }
    }

    async function cambiarEstadoRol(
        id,
        nuevoEstado
    ) {
        const rol =
            estado.roles.find(
                (item) =>
                    Number(item.id) === id
            );

        const accion =
            nuevoEstado
                ? "activar"
                : "desactivar";

        if (
            !window.confirm(
                `¿Deseas ${accion} el rol ${rol?.nombre || ""}?`
            )
        ) {
            return;
        }

        try {
            const respuesta =
                await peticion(
                    `/roles/${id}/estado`,
                    "PATCH",
                    {
                        estado:
                            nuevoEstado
                    }
                );

            await Promise.all([
                cargarRoles(),
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

    function limpiarSeleccion() {
        estado.idRolActual = null;
        estado.permisosActuales = [];

        $("tituloPermisosRol")
            .textContent =
            "Selecciona un rol";

        $("descripcionPermisosRol")
            .textContent =
            "Elige un rol para configurar sus permisos.";

        $("matrizPermisos").innerHTML =
            "Selecciona un rol para ver sus permisos.";

        $("btnGuardarPermisos")
            .disabled = true;

        $("btnSeleccionarTodos")
            .disabled = true;

        $("btnLimpiarPermisos")
            .disabled = true;
    }

    inicializar();
})();