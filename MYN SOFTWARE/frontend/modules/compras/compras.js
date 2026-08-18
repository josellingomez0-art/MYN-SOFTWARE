(() => {
    "use strict";

    const estado = {
        productos: [],
        proveedores: [],
        carrito: [],
        compras: [],
        procesando: false
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

    const redondear = (valor) =>
        Math.round(
            (
                Number(valor) +
                Number.EPSILON
            ) * 100
        ) / 100;

    function mostrarMensaje(
        texto,
        tipo = "exito"
    ) {
        const contenedor =
            $("mensajeCompras");

        contenedor.textContent =
            texto;

        contenedor.className =
            `mensaje-compras visible ${tipo}`;

        clearTimeout(
            mostrarMensaje.temporizador
        );

        mostrarMensaje.temporizador =
            setTimeout(() => {
                contenedor.textContent =
                    "";

                contenedor.className =
                    "mensaje-compras";
            }, 5000);
    }

    async function inicializar() {
        enlazarEventos();

        await Promise.all([
            cargarProductos(),
            cargarProveedores()
        ]);

        pintarCarrito();
    }

    function enlazarEventos() {
        document
            .querySelectorAll(
                ".tabs-compras button[data-vista]"
            )
            .forEach((boton) => {
                boton.addEventListener(
                    "click",
                    () =>
                        cambiarVista(
                            boton.dataset.vista
                        )
                );
            });

        $("buscarProductoCompra")
            .addEventListener(
                "input",
                pintarProductosFiltrados
            );

        $("listaProductosCompra")
            .addEventListener(
                "click",
                manejarProducto
            );

        $("tablaCarritoCompra")
            .addEventListener(
                "input",
                modificarCarrito
            );

        $("tablaCarritoCompra")
            .addEventListener(
                "click",
                quitarDelCarrito
            );

        $("formaPagoCompra")
            .addEventListener(
                "change",
                cambiarFormaPago
            );

        $("btnRegistrarCompra")
            .addEventListener(
                "click",
                registrarCompra
            );

        $("btnFiltrarCompras")
            .addEventListener(
                "click",
                cargarHistorial
            );

        $("buscarCompra")
            .addEventListener(
                "keydown",
                (evento) => {
                    if (
                        evento.key === "Enter"
                    ) {
                        cargarHistorial();
                    }
                }
            );

        $("tablaHistorialCompras")
            .addEventListener(
                "click",
                manejarAccionHistorial
            );

        $("btnCerrarDetalleCompra")
            .addEventListener(
                "click",
                cerrarDetalle
            );

        $("btnCerrarAnulacionCompra")
            .addEventListener(
                "click",
                cerrarAnulacion
            );

        $("btnCancelarAnulacionCompra")
            .addEventListener(
                "click",
                cerrarAnulacion
            );

        $("formAnularCompra")
            .addEventListener(
                "submit",
                confirmarAnulacion
            );

        document.addEventListener(
            "keydown",
            (evento) => {
                if (
                    evento.key === "Escape"
                ) {
                    cerrarDetalle();
                    cerrarAnulacion();
                }
            }
        );
    }

    function cambiarVista(vista) {
        const esNueva =
            vista === "nueva";

        $("vistaNuevaCompra")
            .classList.toggle(
                "activa",
                esNueva
            );

        $("vistaHistorialCompras")
            .classList.toggle(
                "activa",
                !esNueva
            );

        $("tabNuevaCompra")
            .classList.toggle(
                "activo",
                esNueva
            );

        $("tabHistorialCompras")
            .classList.toggle(
                "activo",
                !esNueva
            );

        if (!esNueva) {
            cargarHistorial();
        }
    }

    async function cargarProductos() {
        try {
            const respuesta =
                await peticion(
                    "/productos"
                );

            estado.productos =
                (
                    Array.isArray(respuesta)
                        ? respuesta
                        : []
                ).filter(
                    (producto) =>
                        Boolean(producto.estado)
                );

            pintarProductosFiltrados();
        } catch (error) {
            console.error(error);

            $("listaProductosCompra")
                .innerHTML = `
                    <p class="fila-vacia error">
                        ${escapar(error.message)}
                    </p>
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
                    (proveedor) =>
                        Boolean(proveedor.estado)
                );

            const opciones =
                estado.proveedores.map(
                    (proveedor) => `
                        <option value="${proveedor.id}">
                            ${escapar(
                                proveedor.razon_social
                            )}
                            ${
                                proveedor.nit
                                    ? `· ${escapar(proveedor.nit)}`
                                    : ""
                            }
                        </option>
                    `
                ).join("");

            $("proveedorCompra")
                .innerHTML =
                    estado.proveedores.length
                        ? `
                            <option value="">
                                Selecciona un proveedor
                            </option>
                            ${opciones}
                          `
                        : `
                            <option value="">
                                No hay proveedores activos
                            </option>
                          `;

            $("filtroProveedorCompra")
                .innerHTML = `
                    <option value="">
                        Todos los proveedores
                    </option>
                    ${opciones}
                `;
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                "No se pudieron cargar los proveedores",
                "error"
            );
        }
    }

    function pintarProductosFiltrados() {
        const texto =
            $("buscarProductoCompra")
                .value
                .trim()
                .toLowerCase();

        const lista =
            estado.productos.filter(
                (producto) =>
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
                    )
            );

        pintarProductos(lista);
    }

    function pintarProductos(lista) {
        const contenedor =
            $("listaProductosCompra");

        if (!lista.length) {
            contenedor.innerHTML = `
                <p class="fila-vacia">
                    No hay productos para mostrar.
                </p>
            `;

            return;
        }

        contenedor.innerHTML =
            lista.map(
                (producto) => `
                    <button
                        type="button"
                        class="producto-compra"
                        data-id="${producto.id}"
                    >
                        <span>
                            <strong>
                                ${escapar(producto.nombre)}
                            </strong>

                            <small>
                                ${escapar(producto.codigo)}
                                ${
                                    producto.marca
                                        ? `· ${escapar(producto.marca)}`
                                        : ""
                                }
                            </small>
                        </span>

                        <span class="producto-costo">
                            ${moneda(producto.costo)}
                        </span>
                    </button>
                `
            ).join("");
    }

    function manejarProducto(evento) {
        const boton =
            evento.target.closest(
                ".producto-compra"
            );

        if (!boton) {
            return;
        }

        agregarProducto(
            Number(boton.dataset.id)
        );
    }

    function agregarProducto(idProducto) {
        const producto =
            estado.productos.find(
                (item) =>
                    Number(item.id) ===
                    idProducto
            );

        if (!producto) {
            return;
        }

        const existente =
            estado.carrito.find(
                (item) =>
                    item.id_producto ===
                    idProducto
            );

        if (existente) {
            existente.cantidad += 1;
        } else {
            estado.carrito.push({
                id_producto:
                    Number(producto.id),

                codigo:
                    producto.codigo,

                nombre:
                    producto.nombre,

                cantidad: 1,

                costo:
                    Number(producto.costo) ||
                    0,

                descuento: 0,

                iva_porcentaje:
                    Number(producto.iva) ||
                    0
            });
        }

        pintarCarrito();
    }

    function calcularItem(item) {
        const subtotal =
            redondear(
                item.cantidad *
                item.costo
            );

        const descuento =
            Math.min(
                redondear(item.descuento),
                subtotal
            );

        const base =
            redondear(
                subtotal - descuento
            );

        const iva =
            redondear(
                base *
                item.iva_porcentaje /
                100
            );

        return {
            subtotal,
            descuento,
            iva,
            total:
                redondear(
                    base + iva
                )
        };
    }

    function pintarCarrito() {
        const tabla =
            $("tablaCarritoCompra");

        if (!estado.carrito.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="fila-vacia"
                    >
                        Sin productos agregados.
                    </td>
                </tr>
            `;

            actualizarTotales();
            return;
        }

        tabla.innerHTML =
            estado.carrito.map(
                (item) => {
                    const calculo =
                        calcularItem(item);

                    return `
                        <tr data-id="${item.id_producto}">
                            <td>
                                <strong>
                                    ${escapar(item.nombre)}
                                </strong>

                                <small>
                                    ${escapar(item.codigo)}
                                </small>
                            </td>

                            <td>
                                <input
                                    class="entrada-carrito"
                                    data-campo="cantidad"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value="${item.cantidad}"
                                >
                            </td>

                            <td>
                                <input
                                    class="entrada-carrito"
                                    data-campo="costo"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value="${item.costo}"
                                >
                            </td>

                            <td>
                                <input
                                    class="entrada-carrito"
                                    data-campo="descuento"
                                    type="number"
                                    min="0"
                                    max="${calculo.subtotal}"
                                    step="0.01"
                                    value="${item.descuento}"
                                >
                            </td>

                            <td>
                                <input
                                    class="entrada-carrito"
                                    data-campo="iva_porcentaje"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value="${item.iva_porcentaje}"
                                >
                            </td>

                            <td>
                                <strong>
                                    ${moneda(calculo.total)}
                                </strong>
                            </td>

                            <td>
                                <button
                                    type="button"
                                    class="btn-quitar"
                                    data-accion="quitar"
                                    aria-label="Quitar producto"
                                >
                                    ×
                                </button>
                            </td>
                        </tr>
                    `;
                }
            ).join("");

        actualizarTotales();
    }

    function modificarCarrito(evento) {
        const input =
            evento.target.closest(
                ".entrada-carrito"
            );

        if (!input) {
            return;
        }

        const fila =
            input.closest("tr[data-id]");

        const item =
            estado.carrito.find(
                (producto) =>
                    producto.id_producto ===
                    Number(fila.dataset.id)
            );

        if (!item) {
            return;
        }

        const campo =
            input.dataset.campo;

        let valor =
            Number(input.value);

        if (
            campo === "cantidad"
        ) {
            valor =
                Number.isInteger(valor) &&
                valor >= 1
                    ? valor
                    : 1;
        } else {
            valor =
                Number.isFinite(valor) &&
                valor >= 0
                    ? valor
                    : 0;
        }

        if (
            campo === "iva_porcentaje"
        ) {
            valor =
                Math.min(valor, 100);
        }

        item[campo] = valor;

        pintarCarrito();
    }

    function quitarDelCarrito(evento) {
        const boton =
            evento.target.closest(
                "[data-accion='quitar']"
            );

        if (!boton) {
            return;
        }

        const fila =
            boton.closest("tr[data-id]");

        const idProducto =
            Number(fila.dataset.id);

        estado.carrito =
            estado.carrito.filter(
                (item) =>
                    item.id_producto !==
                    idProducto
            );

        pintarCarrito();
    }

    function actualizarTotales() {
        const totales =
            estado.carrito.reduce(
                (resultado, item) => {
                    const calculo =
                        calcularItem(item);

                    resultado.subtotal +=
                        calculo.subtotal;

                    resultado.descuento +=
                        calculo.descuento;

                    resultado.iva +=
                        calculo.iva;

                    resultado.total +=
                        calculo.total;

                    return resultado;
                },
                {
                    subtotal: 0,
                    descuento: 0,
                    iva: 0,
                    total: 0
                }
            );

        $("subtotalCompra").textContent =
            moneda(totales.subtotal);

        $("descuentoCompra").textContent =
            moneda(totales.descuento);

        $("ivaCompra").textContent =
            moneda(totales.iva);

        $("totalCompra").textContent =
            moneda(totales.total);
    }

    function cambiarFormaPago() {
        const esCredito =
            $("formaPagoCompra").value ===
            "CREDITO";

        $("campoVencimientoCompra")
            .hidden = !esCredito;

        if (!esCredito) {
            $("fechaVencimientoCompra")
                .value = "";
        }
    }

    async function registrarCompra() {
        if (estado.procesando) {
            return;
        }

        const idProveedor =
            Number(
                $("proveedorCompra").value
            );

        if (!idProveedor) {
            mostrarMensaje(
                "Selecciona un proveedor",
                "error"
            );

            return;
        }

        if (!estado.carrito.length) {
            mostrarMensaje(
                "Agrega al menos un producto",
                "error"
            );

            return;
        }

        const formaPago =
            $("formaPagoCompra").value;

        const fechaVencimiento =
            $("fechaVencimientoCompra")
                .value;

        if (
            formaPago === "CREDITO" &&
            !fechaVencimiento
        ) {
            mostrarMensaje(
                "Selecciona la fecha de vencimiento",
                "error"
            );

            return;
        }

        const confirmar =
            window.confirm(
                "¿Registrar y confirmar esta compra?"
            );

        if (!confirmar) {
            return;
        }

        estado.procesando = true;

        const boton =
            $("btnRegistrarCompra");

        boton.disabled = true;
        boton.textContent =
            "Registrando...";

        try {
            const respuesta =
                await peticion(
                    "/compras",
                    "POST",
                    {
                        id_proveedor:
                            idProveedor,

                        factura_proveedor:
                            $("facturaProveedor")
                                .value
                                .trim(),

                        forma_pago:
                            formaPago,

                        fecha_vencimiento:
                            formaPago ===
                                "CREDITO"
                                ? fechaVencimiento
                                : null,

                        observaciones:
                            $("observacionesCompra")
                                .value
                                .trim(),

                        productos:
                            estado.carrito.map(
                                (item) => ({
                                    id_producto:
                                        item.id_producto,

                                    cantidad:
                                        item.cantidad,

                                    costo:
                                        item.costo,

                                    descuento:
                                        item.descuento,

                                    iva_porcentaje:
                                        item.iva_porcentaje
                                })
                            )
                    }
                );

            limpiarCompra();

            await cargarProductos();

            mostrarMensaje(
                `${respuesta.mensaje}. Número: ${respuesta.compra.numero}`
            );
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                "No fue posible registrar la compra",
                "error"
            );
        } finally {
            estado.procesando = false;

            boton.disabled = false;
            boton.textContent =
                "Registrar compra";
        }
    }

    function limpiarCompra() {
        estado.carrito = [];

        $("facturaProveedor").value =
            "";

        $("formaPagoCompra").value =
            "CONTADO";

        $("fechaVencimientoCompra").value =
            "";

        $("observacionesCompra").value =
            "";

        $("campoVencimientoCompra").hidden =
            true;

        pintarCarrito();
    }

    async function cargarHistorial() {
        const parametros =
            new URLSearchParams();

        const buscar =
            $("buscarCompra")
                .value
                .trim();

        const proveedor =
            $("filtroProveedorCompra")
                .value;

        const estadoFiltro =
            $("filtroEstadoCompra")
                .value;

        const fechaDesde =
            $("fechaDesdeCompra")
                .value;

        const fechaHasta =
            $("fechaHastaCompra")
                .value;

        if (buscar) {
            parametros.set(
                "buscar",
                buscar
            );
        }

        if (proveedor) {
            parametros.set(
                "id_proveedor",
                proveedor
            );
        }

        parametros.set(
            "estado",
            estadoFiltro
        );

        if (fechaDesde) {
            parametros.set(
                "fecha_desde",
                fechaDesde
            );
        }

        if (fechaHasta) {
            parametros.set(
                "fecha_hasta",
                fechaHasta
            );
        }

        const tabla =
            $("tablaHistorialCompras");

        tabla.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="fila-vacia"
                >
                    Cargando compras...
                </td>
            </tr>
        `;

        try {
            const respuesta =
                await peticion(
                    `/compras?${parametros.toString()}`
                );

            estado.compras =
                Array.isArray(respuesta)
                    ? respuesta
                    : [];

            pintarHistorial();
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

    function pintarHistorial() {
        const tabla =
            $("tablaHistorialCompras");

        if (!estado.compras.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="fila-vacia"
                    >
                        No hay compras para mostrar.
                    </td>
                </tr>
            `;

            return;
        }

        tabla.innerHTML =
            estado.compras.map(
                (compra) => `
                    <tr>
                        <td>
                            <strong>
                                ${escapar(compra.numero)}
                            </strong>
                        </td>

                        <td>
                            ${new Date(
                                compra.fecha
                            ).toLocaleString("es-CO")}
                        </td>

                        <td>
                            ${escapar(compra.proveedor)}

                            ${
                                compra.proveedor_nit
                                    ? `
                                        <small>
                                            ${escapar(compra.proveedor_nit)}
                                        </small>
                                      `
                                    : ""
                            }
                        </td>

                        <td>
                            ${escapar(
                                compra.factura_proveedor ||
                                "—"
                            )}
                        </td>

                        <td>
                            ${escapar(compra.forma_pago)}

                            ${
                                compra.forma_pago === "CREDITO"
                                    ? `
                                        <small>
                                            Saldo:
                                            ${moneda(compra.saldo_pendiente)}
                                        </small>
                                      `
                                    : ""
                            }
                        </td>

                        <td>
                            ${Number(compra.productos)}
                            producto(s)

                            <small>
                                ${Number(compra.unidades)}
                                unidad(es)
                            </small>
                        </td>

                        <td>
                            <strong>
                                ${moneda(compra.total)}
                            </strong>
                        </td>

                        <td>
                            <span
                                class="estado-compra ${
                                    compra.estado === "ANULADA"
                                        ? "anulada"
                                        : "confirmada"
                                }"
                            >
                                ${escapar(compra.estado)}
                            </span>
                        </td>

                        <td class="acciones-compra">
                            <button
                                type="button"
                                class="btn-ver"
                                data-accion="ver"
                                data-id="${compra.id}"
                            >
                                Ver
                            </button>

                            ${
                                compra.estado !== "ANULADA"
                                    ? `
                                        <button
                                            type="button"
                                            class="btn-anular"
                                            data-accion="anular"
                                            data-id="${compra.id}"
                                        >
                                            Anular
                                        </button>
                                      `
                                    : ""
                            }
                        </td>
                    </tr>
                `
            ).join("");
    }

    async function manejarAccionHistorial(
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
            "ver"
        ) {
            await abrirDetalle(id);
        }

        if (
            boton.dataset.accion ===
            "anular"
        ) {
            abrirAnulacion(id);
        }
    }

    async function abrirDetalle(id) {
        const modal =
            $("modalDetalleCompra");

        modal.classList.add("activo");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        $("contenidoDetalleCompra")
            .innerHTML =
                "Cargando detalle...";

        try {
            const compra =
                await peticion(
                    `/compras/${id}`
                );

            $("tituloDetalleCompra")
                .textContent =
                    `Compra ${compra.numero}`;

            const detalle =
                compra.detalle.map(
                    (item) => `
                        <tr>
                            <td>
                                ${escapar(item.codigo)}
                            </td>

                            <td>
                                ${escapar(item.nombre)}
                            </td>

                            <td>
                                ${Number(item.cantidad)}
                            </td>

                            <td>
                                ${moneda(item.costo)}
                            </td>

                            <td>
                                ${moneda(item.descuento)}
                            </td>

                            <td>
                                ${Number(item.iva_porcentaje)}%
                            </td>

                            <td>
                                ${moneda(item.total)}
                            </td>
                        </tr>
                    `
                ).join("");

            $("contenidoDetalleCompra")
                .innerHTML = `
                    <div class="datos-detalle-compra">
                        <p>
                            <b>Proveedor:</b>
                            ${escapar(compra.proveedor)}
                        </p>

                        <p>
                            <b>Factura proveedor:</b>
                            ${escapar(
                                compra.factura_proveedor ||
                                "—"
                            )}
                        </p>

                        <p>
                            <b>Fecha:</b>
                            ${new Date(
                                compra.fecha
                            ).toLocaleString("es-CO")}
                        </p>

                        <p>
                            <b>Usuario:</b>
                            ${escapar(compra.usuario)}
                        </p>

                        <p>
                            <b>Forma de pago:</b>
                            ${escapar(compra.forma_pago)}
                        </p>

                        <p>
                            <b>Estado:</b>
                            ${escapar(compra.estado)}
                        </p>
                    </div>

                    <div class="tabla-detalle-modal">
                        <table>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Producto</th>
                                    <th>Cant.</th>
                                    <th>Costo</th>
                                    <th>Desc.</th>
                                    <th>IVA</th>
                                    <th>Total</th>
                                </tr>
                            </thead>

                            <tbody>
                                ${detalle}
                            </tbody>
                        </table>
                    </div>

                    <div class="resumen-detalle-compra">
                        <p>
                            Subtotal:
                            <b>${moneda(compra.subtotal)}</b>
                        </p>

                        <p>
                            Descuento:
                            <b>${moneda(compra.descuento)}</b>
                        </p>

                        <p>
                            IVA:
                            <b>${moneda(compra.iva)}</b>
                        </p>

                        <p class="gran-total">
                            Total:
                            <b>${moneda(compra.total)}</b>
                        </p>
                    </div>

                    ${
                        compra.observaciones
                            ? `
                                <p>
                                    <b>Observaciones:</b>
                                    ${escapar(compra.observaciones)}
                                </p>
                              `
                            : ""
                    }
                `;
        } catch (error) {
            console.error(error);

            $("contenidoDetalleCompra")
                .innerHTML = `
                    <p class="fila-vacia error">
                        ${escapar(error.message)}
                    </p>
                `;
        }
    }

    function cerrarDetalle() {
        const modal =
            $("modalDetalleCompra");

        modal.classList.remove("activo");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    function abrirAnulacion(id) {
        const compra =
            estado.compras.find(
                (item) =>
                    Number(item.id) === id
            );

        if (!compra) {
            return;
        }

        $("idCompraAnular").value =
            id;

        $("textoCompraAnular")
            .textContent =
                `Se anulará ${compra.numero} por ${moneda(compra.total)}. El inventario será revertido.`;

        $("motivoAnulacionCompra")
            .value = "";

        const modal =
            $("modalAnularCompra");

        modal.classList.add("activo");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        $("motivoAnulacionCompra")
            .focus();
    }

    function cerrarAnulacion() {
        if (estado.procesando) {
            return;
        }

        const modal =
            $("modalAnularCompra");

        modal.classList.remove("activo");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    async function confirmarAnulacion(
        evento
    ) {
        evento.preventDefault();

        if (estado.procesando) {
            return;
        }

        const id =
            Number(
                $("idCompraAnular").value
            );

        const motivo =
            $("motivoAnulacionCompra")
                .value
                .trim();

        if (motivo.length < 5) {
            mostrarMensaje(
                "Escribe un motivo de al menos 5 caracteres",
                "error"
            );

            return;
        }

        const confirmar =
            window.confirm(
                "¿Confirmas la anulación? Esta operación devolverá el inventario."
            );

        if (!confirmar) {
            return;
        }

        estado.procesando = true;

        const boton =
            $("btnConfirmarAnulacionCompra");

        boton.disabled = true;
        boton.textContent =
            "Anulando...";

        try {
            const respuesta =
                await peticion(
                    `/compras/${id}/anular`,
                    "PUT",
                    {
                        motivo
                    }
                );

            estado.procesando = false;
            cerrarAnulacion();

            await Promise.all([
                cargarHistorial(),
                cargarProductos()
            ]);

            mostrarMensaje(
                respuesta.mensaje
            );
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                "No fue posible anular la compra",
                "error"
            );
        } finally {
            estado.procesando = false;

            boton.disabled = false;
            boton.textContent =
                "Anular compra";
        }
    }

    inicializar();
})();