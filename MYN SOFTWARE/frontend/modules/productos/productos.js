(() => {
    "use strict";

    const estado = {
        productos: [],
        categorias: [],
        proveedores: [],
        guardando: false
    };

    const $ = (id) =>
        document.getElementById(id);

    const tabla =
        $("tablaProductos");

    const modal =
        $("modalOverlay");

    const formulario =
        $("formProducto");

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

    function mensaje(
        texto,
        tipo = "exito"
    ) {
        const contenedor =
            $("mensajeProductos");

        contenedor.textContent =
            texto;

        contenedor.className =
            `mensaje visible ${tipo}`;

        window.clearTimeout(
            mensaje.temporizador
        );

        mensaje.temporizador =
            window.setTimeout(
                () => {
                    contenedor.textContent =
                        "";

                    contenedor.className =
                        "mensaje";
                },
                4500
            );
    }

    async function inicializar() {
        const puedeGestionar =
            tienePermiso(
                "productos.gestionar"
            );

        $("btnNuevo").hidden =
            !puedeGestionar;

        enlazarEventos();

        await Promise.all([
            cargarCategorias(),
            cargarProveedores()
        ]);

        await cargarProductos();
    }

    function enlazarEventos() {
        $("btnNuevo").addEventListener(
            "click",
            abrirNuevo
        );

        $("btnCerrarModal").addEventListener(
            "click",
            cerrarModal
        );

        $("btnCancelar").addEventListener(
            "click",
            cerrarModal
        );

        $("buscar").addEventListener(
            "input",
            pintarFiltrados
        );

        $("filtroEstado").addEventListener(
            "change",
            pintarFiltrados
        );

        formulario.addEventListener(
            "submit",
            guardarProducto
        );

        tabla.addEventListener(
            "click",
            manejarAccionTabla
        );

        modal.addEventListener(
            "click",
            (evento) => {
                if (
                    evento.target === modal
                ) {
                    cerrarModal();
                }
            }
        );

        document.addEventListener(
            "keydown",
            manejarEscape,
            {
                once: false
            }
        );
    }

    function manejarEscape(evento) {
        if (
            evento.key === "Escape" &&
            modal.classList.contains(
                "activo"
            )
        ) {
            cerrarModal();
        }
    }

    async function cargarProductos() {
        tabla.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="mensaje-vacio"
                >
                    Cargando productos...
                </td>
            </tr>
        `;

        try {
            const respuesta =
                await peticion(
                    "/productos"
                );

            estado.productos =
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
                        class="mensaje-vacio error"
                    >
                        ${escapar(error.message)}
                    </td>
                </tr>
            `;
        }
    }

    async function cargarCategorias() {
        try {
            const respuesta =
                await peticion(
                    "/categorias"
                );

            estado.categorias =
                (
                    Array.isArray(respuesta)
                        ? respuesta
                        : []
                ).filter(
                    (item) => item.estado
                );

            $("id_categoria").innerHTML =
                estado.categorias.length
                    ? estado.categorias
                          .map(
                              (item) => `
                                <option value="${item.id}">
                                    ${escapar(item.nombre)}
                                </option>
                              `
                          )
                          .join("")
                    : `
                        <option value="">
                            No hay categorías activas
                        </option>
                      `;
        } catch (error) {
            console.error(error);

            $("id_categoria").innerHTML = `
                <option value="">
                    Error al cargar categorías
                </option>
            `;
        }
    }

    async function cargarProveedores() {
        try {
            const respuesta =
                await peticion(
                    "/proveedores"
                );

            estado.proveedores =
                (
                    Array.isArray(respuesta)
                        ? respuesta
                        : []
                ).filter(
                    (item) => item.estado
                );

            $("id_proveedor").innerHTML =
                `
                    <option value="">
                        Sin proveedor
                    </option>
                ` +
                estado.proveedores
                    .map(
                        (item) => `
                            <option value="${item.id}">
                                ${escapar(
                                    item.razon_social
                                )}
                            </option>
                        `
                    )
                    .join("");
        } catch (error) {
            console.error(error);

            $("id_proveedor").innerHTML = `
                <option value="">
                    Sin proveedor
                </option>
            `;
        }
    }

    function pintarFiltrados() {
        const texto =
            $("buscar")
                .value
                .trim()
                .toLowerCase();

        const filtro =
            $("filtroEstado").value;

        const lista =
            estado.productos.filter(
                (producto) => {
                    const coincideTexto =
                        !texto ||
                        [
                            producto.codigo,
                            producto.nombre,
                            producto.marca
                        ].some(
                            (campo) =>
                                String(
                                    campo || ""
                                )
                                    .toLowerCase()
                                    .includes(texto)
                        );

                    const coincideEstado =
                        filtro === "todos" ||
                        (
                            filtro === "activos" &&
                            Boolean(
                                producto.estado
                            )
                        ) ||
                        (
                            filtro ===
                                "inactivos" &&
                            !Boolean(
                                producto.estado
                            )
                        );

                    return (
                        coincideTexto &&
                        coincideEstado
                    );
                }
            );

        pintarProductos(lista);
    }

    function pintarProductos(lista) {
        if (!lista.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="mensaje-vacio"
                    >
                        No hay productos que
                        coincidan con el filtro.
                    </td>
                </tr>
            `;

            return;
        }

        const puedeGestionar =
            tienePermiso(
                "productos.gestionar"
            );

        tabla.innerHTML =
            lista
                .map(
                    (p) => `
                        <tr>
                            <td>
                                <strong>
                                    ${escapar(p.codigo)}
                                </strong>
                            </td>

                            <td>
                                ${escapar(p.nombre)}

                                ${
                                    p.marca
                                        ? `
                                            <small class="detalle">
                                                ${escapar(p.marca)}
                                            </small>
                                          `
                                        : ""
                                }
                            </td>

                            <td>
                                ${escapar(p.categoria)}
                            </td>

                            <td>
                                ${escapar(
                                    p.proveedor || "—"
                                )}
                            </td>

                            <td>
                                ${moneda(p.costo)}
                            </td>

                            <td>
                                ${moneda(p.precio)}
                            </td>

                            <td
                                class="${
                                    Number(
                                        p.stock_actual
                                    ) <=
                                    Number(
                                        p.stock_minimo
                                    )
                                        ? "stock-bajo"
                                        : ""
                                }"
                            >
                                ${
                                    Number(
                                        p.stock_actual
                                    ) || 0
                                }
                            </td>

                            <td>
                                <span
                                    class="badge ${
                                        p.estado
                                            ? "activo"
                                            : "inactivo"
                                    }"
                                >
                                    ${
                                        p.estado
                                            ? "Activo"
                                            : "Inactivo"
                                    }
                                </span>
                            </td>

                            <td class="acciones">
                                ${
                                    puedeGestionar
                                        ? `
                                            <button
                                                type="button"
                                                class="btn-editar"
                                                data-accion="editar"
                                                data-id="${p.id}"
                                            >
                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                class="${
                                                    p.estado
                                                        ? "btn-desactivar"
                                                        : "btn-activar"
                                                }"
                                                data-accion="estado"
                                                data-id="${p.id}"
                                                data-estado="${
                                                    p.estado
                                                        ? 0
                                                        : 1
                                                }"
                                            >
                                                ${
                                                    p.estado
                                                        ? "Desactivar"
                                                        : "Activar"
                                                }
                                            </button>
                                          `
                                        : "—"
                                }
                            </td>
                        </tr>
                    `
                )
                .join("");
    }

    async function manejarAccionTabla(
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
    }

    function limpiarFormulario() {
        formulario.reset();

        $("productoId").value = "";
        $("iva").value = "19";
        $("stock_minimo").value = "5";
        $("stock_inicial").value = "0";

        $("unidad_medida").value =
            "Unidad";

        $("estado").checked = true;
    }

    function abrirNuevo() {
        limpiarFormulario();

        $("tituloModal").textContent =
            "Nuevo producto";

        $("campoStockInicial").hidden =
            false;

        $("campoEstado").hidden =
            true;

        abrirModal();

        $("codigo").focus();
    }

    async function abrirEdicion(id) {
        try {
            const producto =
                await peticion(
                    `/productos/${id}`
                );

            limpiarFormulario();

            $("tituloModal").textContent =
                "Editar producto";

            $("productoId").value =
                producto.id;

            $("codigo").value =
                producto.codigo || "";

            $("nombre").value =
                producto.nombre || "";

            $("id_categoria").value =
                producto.id_categoria || "";

            $("id_proveedor").value =
                producto.id_proveedor || "";

            $("costo").value =
                producto.costo ?? 0;

            $("precio").value =
                producto.precio ?? 0;

            $("iva").value =
                producto.iva ?? 19;

            $("marca").value =
                producto.marca || "";

            $("unidad_medida").value =
                producto.unidad_medida ||
                "Unidad";

            $("stock_minimo").value =
                producto.stock_minimo ?? 5;

            $("imagen").value =
                producto.imagen || "";

            $("descripcion").value =
                producto.descripcion || "";

            $("estado").checked =
                Boolean(
                    producto.estado
                );

            $("campoStockInicial").hidden =
                true;

            $("campoEstado").hidden =
                false;

            abrirModal();

            $("codigo").focus();
        } catch (error) {
            console.error(error);

            mensaje(
                error.message ||
                "No fue posible cargar el producto",
                "error"
            );
        }
    }

    function abrirModal() {
        modal.classList.add(
            "activo"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );
    }

    function cerrarModal() {
        if (estado.guardando) {
            return;
        }

        modal.classList.remove(
            "activo"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    function datosFormulario() {
        const id =
            $("productoId").value;

        return {
            codigo:
                $("codigo")
                    .value
                    .trim(),

            nombre:
                $("nombre")
                    .value
                    .trim(),

            id_categoria:
                Number(
                    $("id_categoria").value
                ),

            id_proveedor:
                $("id_proveedor").value
                    ? Number(
                          $("id_proveedor").value
                      )
                    : null,

            costo:
                Number(
                    $("costo").value
                ),

            precio:
                Number(
                    $("precio").value
                ),

            iva:
                Number(
                    $("iva").value
                ),

            marca:
                $("marca")
                    .value
                    .trim(),

            unidad_medida:
                $("unidad_medida")
                    .value
                    .trim(),

            stock_minimo:
                Number(
                    $("stock_minimo").value
                ),

            stock_inicial:
                id
                    ? undefined
                    : Number(
                          $("stock_inicial").value
                      ),

            imagen:
                $("imagen")
                    .value
                    .trim(),

            descripcion:
                $("descripcion")
                    .value
                    .trim(),

            estado:
                id
                    ? $("estado").checked
                    : true
        };
    }

    function validar(datos) {
        if (
            !datos.codigo ||
            !datos.nombre
        ) {
            return (
                "Código y nombre son obligatorios."
            );
        }

        if (!datos.id_categoria) {
            return (
                "Selecciona una categoría válida."
            );
        }

        if (
            !Number.isFinite(
                datos.costo
            ) ||
            datos.costo < 0
        ) {
            return (
                "El costo no es válido."
            );
        }

        if (
            !Number.isFinite(
                datos.precio
            ) ||
            datos.precio <
                datos.costo
        ) {
            return (
                "El precio debe ser igual o mayor al costo."
            );
        }

        if (
            !Number.isFinite(
                datos.iva
            ) ||
            datos.iva < 0 ||
            datos.iva > 100
        ) {
            return (
                "El IVA debe estar entre 0 y 100."
            );
        }

        if (
            !Number.isInteger(
                datos.stock_minimo
            ) ||
            datos.stock_minimo < 0
        ) {
            return (
                "El stock mínimo debe ser un entero positivo."
            );
        }

        if (
            datos.stock_inicial !==
                undefined &&
            (
                !Number.isInteger(
                    datos.stock_inicial
                ) ||
                datos.stock_inicial < 0
            )
        ) {
            return (
                "El stock inicial debe ser un entero positivo."
            );
        }

        return null;
    }

    async function guardarProducto(
        evento
    ) {
        evento.preventDefault();

        if (estado.guardando) {
            return;
        }

        const id =
            $("productoId").value;

        const datos =
            datosFormulario();

        const errorValidacion =
            validar(datos);

        if (errorValidacion) {
            mensaje(
                errorValidacion,
                "error"
            );

            return;
        }

        estado.guardando = true;

        const boton =
            $("btnGuardar");

        boton.disabled = true;
        boton.textContent =
            "Guardando...";

        try {
            const respuesta = id
                ? await peticion(
                      `/productos/${id}`,
                      "PUT",
                      datos
                  )
                : await peticion(
                      "/productos",
                      "POST",
                      datos
                  );

            cerrarModal();

            await cargarProductos();

            mensaje(
                respuesta.mensaje ||
                "Producto guardado correctamente"
            );
        } catch (error) {
            console.error(error);

            mensaje(
                error.message ||
                "No fue posible guardar el producto",
                "error"
            );
        } finally {
            estado.guardando = false;

            boton.disabled = false;

            boton.textContent =
                "Guardar producto";
        }
    }

    async function cambiarEstado(
        id,
        nuevoEstado
    ) {
        const producto =
            estado.productos.find(
                (item) =>
                    Number(item.id) === id
            );

        const accion =
            nuevoEstado
                ? "activar"
                : "desactivar";

        const confirmar =
            window.confirm(
                `¿Deseas ${accion} “${
                    producto?.nombre ||
                    "este producto"
                }”?`
            );

        if (!confirmar) {
            return;
        }

        try {
            const respuesta =
                await peticion(
                    `/productos/${id}/estado`,
                    "PATCH",
                    {
                        estado:
                            nuevoEstado
                    }
                );

            await cargarProductos();

            mensaje(
                respuesta.mensaje
            );
        } catch (error) {
            console.error(error);

            mensaje(
                error.message ||
                `No fue posible ${accion} el producto`,
                "error"
            );
        }
    }

    inicializar();
})();