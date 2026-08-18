(() => {
    "use strict";

    const estado = {
        productos: [],
        clientes: [],
        metodosPago: [],
        carrito: [],
        ventas: [],
        turnoActivo: null,
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
            $("mensajeVentas");

        contenedor.textContent =
            texto;

        contenedor.className =
            `mensaje-ventas visible ${tipo}`;

        clearTimeout(
            mostrarMensaje.temporizador
        );

        mostrarMensaje.temporizador =
            setTimeout(() => {
                contenedor.textContent =
                    "";

                contenedor.className =
                    "mensaje-ventas";
            }, 5000);
    }

    async function inicializar() {
        enlazarEventos();

        await Promise.all([
            cargarProductos(),
            cargarClientes(),
            cargarMetodosPago(),
            verificarCaja()
        ]);

        pintarCarrito();
    }

    function enlazarEventos() {
        document
            .querySelectorAll(
                ".tabs-ventas button[data-vista]"
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

        $("buscarProductoVenta")
            .addEventListener(
                "input",
                pintarProductosFiltrados
            );

        $("listaProductosVenta")
            .addEventListener(
                "click",
                manejarProducto
            );

        $("tablaCarritoVenta")
            .addEventListener(
                "input",
                modificarCarrito
            );

        $("tablaCarritoVenta")
            .addEventListener(
                "click",
                quitarProducto
            );

        $("metodoPagoVenta")
            .addEventListener(
                "change",
                cambiarMetodoPago
            );

        $("efectivoRecibidoVenta")
            .addEventListener(
                "input",
                calcularCambio
            );

        $("btnRegistrarVenta")
            .addEventListener(
                "click",
                registrarVenta
            );

        $("btnIrCaja")
            .addEventListener(
                "click",
                () => abrirModulo("caja")
            );

        $("btnFiltrarVentas")
            .addEventListener(
                "click",
                cargarHistorial
            );

        $("buscarVenta")
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

        $("tablaHistorialVentas")
            .addEventListener(
                "click",
                manejarAccionHistorial
            );

        $("btnCerrarDetalleVenta")
            .addEventListener(
                "click",
                cerrarDetalle
            );

        $("btnCerrarAnulacionVenta")
            .addEventListener(
                "click",
                cerrarAnulacion
            );

        $("btnCancelarAnulacionVenta")
            .addEventListener(
                "click",
                cerrarAnulacion
            );

        $("formAnularVenta")
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

        $("vistaNuevaVenta")
            .classList.toggle(
                "activa",
                esNueva
            );

        $("vistaHistorialVentas")
            .classList.toggle(
                "activa",
                !esNueva
            );

        $("tabNuevaVenta")
            .classList.toggle(
                "activo",
                esNueva
            );

        $("tabHistorialVentas")
            .classList.toggle(
                "activo",
                !esNueva
            );

        if (!esNueva) {
            cargarHistorial();
        }
    }

    async function verificarCaja() {
        const indicador =
            $("estadoCajaVenta");

        try {
            const respuesta =
                await peticion(
                    "/caja/turno-activo"
                );

            estado.turnoActivo =
                respuesta &&
                respuesta.id
                    ? respuesta
                    : null;

            if (estado.turnoActivo) {
                indicador.className =
                    "estado-caja-venta abierta";

                indicador.textContent =
                    `Caja abierta · ${estado.turnoActivo.caja || "Caja"}`;

                $("avisoCajaVenta").hidden =
                    true;

                $("btnRegistrarVenta")
                    .disabled =
                    estado.carrito.length ===
                    0;
            } else {
                marcarCajaCerrada();
            }
        } catch (error) {
            console.error(error);

            estado.turnoActivo =
                null;

            marcarCajaCerrada();
        }
    }

    function marcarCajaCerrada() {
        const indicador =
            $("estadoCajaVenta");

        indicador.className =
            "estado-caja-venta cerrada";

        indicador.textContent =
            "Caja cerrada";

        $("avisoCajaVenta").hidden =
            false;

        $("btnRegistrarVenta")
            .disabled = true;
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
                        Boolean(
                            producto.estado
                        )
                );

            pintarProductosFiltrados();
        } catch (error) {
            console.error(error);

            $("listaProductosVenta")
                .innerHTML = `
                    <p class="fila-vacia error">
                        ${escapar(error.message)}
                    </p>
                `;
        }
    }

    async function cargarClientes() {
        try {
            const respuesta =
                await peticion(
                    "/clientes"
                );

            estado.clientes =
                (
                    Array.isArray(respuesta)
                        ? respuesta
                        : []
                ).filter(
                    (cliente) =>
                        Boolean(cliente.estado)
                );

            const opciones =
                estado.clientes.map(
                    (cliente) => `
                        <option value="${cliente.id}">
                            ${escapar(cliente.nombres)}
                            ${escapar(cliente.apellidos || "")}
                            ${
                                cliente.documento
                                    ? `· ${escapar(cliente.documento)}`
                                    : ""
                            }
                        </option>
                    `
                ).join("");

            $("clienteVenta")
                .innerHTML = `
                    <option value="">
                        Cliente general
                    </option>
                    ${opciones}
                `;

            $("filtroClienteVenta")
                .innerHTML = `
                    <option value="">
                        Todos los clientes
                    </option>
                    ${opciones}
                `;
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                "No se pudieron cargar los clientes",
                "error"
            );
        }
    }

    async function cargarMetodosPago() {
        try {
            const respuesta =
                await peticion(
                    "/metodos-pago"
                );

            estado.metodosPago =
                (
                    Array.isArray(respuesta)
                        ? respuesta
                        : []
                ).filter(
                    (metodo) =>
                        Boolean(metodo.estado)
                );

            $("metodoPagoVenta")
                .innerHTML =
                    estado.metodosPago.length
                        ? `
                            <option value="">
                                Selecciona un método
                            </option>

                            ${estado.metodosPago
                                .map(
                                    (metodo) => `
                                        <option value="${metodo.id}">
                                            ${escapar(metodo.nombre)}
                                        </option>
                                    `
                                )
                                .join("")}
                          `
                        : `
                            <option value="">
                                No hay métodos disponibles
                            </option>
                          `;
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                "No se pudieron cargar los métodos de pago",
                "error"
            );
        }
    }

    function pintarProductosFiltrados() {
        const texto =
            $("buscarProductoVenta")
                .value
                .trim()
                .toLowerCase();

        const productos =
            estado.productos.filter(
                (producto) => {
                    const disponible =
                        Number(
                            producto.stock_disponible ??
                            producto.stock_actual
                        );

                    const coincide =
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

                    return (
                        coincide &&
                        disponible > 0
                    );
                }
            );

        pintarProductos(productos);
    }

    function pintarProductos(lista) {
        const contenedor =
            $("listaProductosVenta");

        if (!lista.length) {
            contenedor.innerHTML = `
                <p class="fila-vacia">
                    No hay productos disponibles.
                </p>
            `;

            return;
        }

        contenedor.innerHTML =
            lista.map(
                (producto) => {
                    const stock =
                        Number(
                            producto.stock_disponible ??
                            producto.stock_actual
                        );

                    return `
                        <button
                            type="button"
                            class="producto-venta"
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

                                    · Stock: ${stock}
                                </small>
                            </span>

                            <span class="producto-precio">
                                ${moneda(producto.precio)}
                            </span>
                        </button>
                    `;
                }
            ).join("");
    }

    function manejarProducto(evento) {
        const boton =
            evento.target.closest(
                ".producto-venta"
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

        const stockDisponible =
            Number(
                producto.stock_disponible ??
                producto.stock_actual
            );

        if (
            stockDisponible <= 0
        ) {
            mostrarMensaje(
                "El producto no tiene stock disponible",
                "error"
            );

            return;
        }

        const existente =
            estado.carrito.find(
                (item) =>
                    item.id_producto ===
                    idProducto
            );

        if (existente) {
            if (
                existente.cantidad + 1 >
                stockDisponible
            ) {
                mostrarMensaje(
                    "No hay más stock disponible",
                    "error"
                );

                return;
            }

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

                stock_maximo:
                    stockDisponible,

                precio:
                    Number(producto.precio) ||
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
                item.precio
            );

        const descuento =
            Math.min(
                redondear(
                    item.descuento
                ),
                subtotal
            );

        const base =
            redondear(
                subtotal -
                descuento
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

    function obtenerTotales() {
        return estado.carrito.reduce(
            (totales, item) => {
                const calculo =
                    calcularItem(item);

                totales.subtotal +=
                    calculo.subtotal;

                totales.descuento +=
                    calculo.descuento;

                totales.iva +=
                    calculo.iva;

                totales.total +=
                    calculo.total;

                return totales;
            },
            {
                subtotal: 0,
                descuento: 0,
                iva: 0,
                total: 0
            }
        );
    }

    function pintarCarrito() {
        const tabla =
            $("tablaCarritoVenta");

        if (!estado.carrito.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="fila-vacia"
                    >
                        Carrito vacío.
                    </td>
                </tr>
            `;

            actualizarTotales();

            $("btnRegistrarVenta")
                .disabled = true;

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
                                    · Stock:
                                    ${item.stock_maximo}
                                </small>
                            </td>

                            <td>
                                <input
                                    class="entrada-carrito"
                                    data-campo="cantidad"
                                    type="number"
                                    min="1"
                                    max="${item.stock_maximo}"
                                    step="1"
                                    value="${item.cantidad}"
                                >
                            </td>

                            <td>
                                <input
                                    class="entrada-carrito"
                                    data-campo="precio"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value="${item.precio}"
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

        $("btnRegistrarVenta")
            .disabled =
                !estado.turnoActivo;
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
            input.closest(
                "tr[data-id]"
            );

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
                Number.isInteger(valor)
                    ? valor
                    : 1;

            valor =
                Math.max(
                    1,
                    Math.min(
                        valor,
                        item.stock_maximo
                    )
                );
        } else {
            valor =
                Number.isFinite(valor) &&
                valor >= 0
                    ? valor
                    : 0;
        }

        if (
            campo ===
            "iva_porcentaje"
        ) {
            valor =
                Math.min(
                    valor,
                    100
                );
        }

        item[campo] = valor;

        pintarCarrito();
    }

    function quitarProducto(evento) {
        const boton =
            evento.target.closest(
                "[data-accion='quitar']"
            );

        if (!boton) {
            return;
        }

        const fila =
            boton.closest(
                "tr[data-id]"
            );

        const idProducto =
            Number(
                fila.dataset.id
            );

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
            obtenerTotales();

        $("subtotalVenta")
            .textContent =
            moneda(totales.subtotal);

        $("descuentoVenta")
            .textContent =
            moneda(totales.descuento);

        $("ivaVenta")
            .textContent =
            moneda(totales.iva);

        $("totalVenta")
            .textContent =
            moneda(totales.total);

        calcularCambio();
    }

    function metodoSeleccionado() {
        const id =
            Number(
                $("metodoPagoVenta")
                    .value
            );

        return estado.metodosPago.find(
            (metodo) =>
                Number(metodo.id) === id
        );
    }

    function cambiarMetodoPago() {
        const metodo =
            metodoSeleccionado();

        const esEfectivo =
            metodo &&
            String(
                metodo.nombre || ""
            )
                .toLowerCase()
                .includes("efectivo");

        $("campoEfectivoVenta")
            .hidden = !esEfectivo;

        if (!esEfectivo) {
            $("efectivoRecibidoVenta")
                .value = "0";

            $("cambioVenta")
                .textContent =
                moneda(0);
        } else {
            const totales =
                obtenerTotales();

            $("efectivoRecibidoVenta")
                .value =
                totales.total || 0;

            calcularCambio();
        }
    }

    function calcularCambio() {
        const metodo =
            metodoSeleccionado();

        const esEfectivo =
            metodo &&
            String(
                metodo.nombre || ""
            )
                .toLowerCase()
                .includes("efectivo");

        if (!esEfectivo) {
            $("cambioVenta")
                .textContent =
                moneda(0);

            return;
        }

        const totales =
            obtenerTotales();

        const recibido =
            Number(
                $("efectivoRecibidoVenta")
                    .value
            ) || 0;

        $("cambioVenta")
            .textContent =
            moneda(
                Math.max(
                    0,
                    recibido -
                    totales.total
                )
            );
    }

    async function registrarVenta() {
        if (estado.procesando) {
            return;
        }

        if (!estado.turnoActivo) {
            mostrarMensaje(
                "Abre un turno de caja antes de vender",
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

        const idMetodoPago =
            Number(
                $("metodoPagoVenta")
                    .value
            );

        if (!idMetodoPago) {
            mostrarMensaje(
                "Selecciona un método de pago",
                "error"
            );

            return;
        }

        const metodo =
            metodoSeleccionado();

        const esEfectivo =
            metodo &&
            String(
                metodo.nombre || ""
            )
                .toLowerCase()
                .includes("efectivo");

        const totales =
            obtenerTotales();

        const efectivoRecibido =
            esEfectivo
                ? Number(
                      $("efectivoRecibidoVenta")
                          .value
                  )
                : null;

        if (
            esEfectivo &&
            (
                !Number.isFinite(
                    efectivoRecibido
                ) ||
                efectivoRecibido <
                    totales.total
            )
        ) {
            mostrarMensaje(
                "El efectivo recibido es menor que el total",
                "error"
            );

            return;
        }

        const confirmar =
            window.confirm(
                `¿Registrar la venta por ${moneda(totales.total)}?`
            );

        if (!confirmar) {
            return;
        }

        estado.procesando = true;

        const boton =
            $("btnRegistrarVenta");

        boton.disabled = true;

        boton.textContent =
            "Procesando...";

        try {
            const respuesta =
                await peticion(
                    "/ventas",
                    "POST",
                    {
                        id_cliente:
                            $("clienteVenta")
                                .value
                                ? Number(
                                      $("clienteVenta")
                                          .value
                                  )
                                : null,

                        id_metodo_pago:
                            idMetodoPago,

                        observaciones:
                            $("observacionesVenta")
                                .value
                                .trim(),

                        efectivo_recibido:
                            efectivoRecibido,

                        productos:
                            estado.carrito.map(
                                (item) => ({
                                    id_producto:
                                        item.id_producto,

                                    cantidad:
                                        item.cantidad,

                                    precio:
                                        item.precio,

                                    descuento:
                                        item.descuento,

                                    iva_porcentaje:
                                        item.iva_porcentaje
                                })
                            )
                    }
                );

            const venta =
                respuesta.venta;

            limpiarVenta();

            await Promise.all([
                cargarProductos(),
                verificarCaja()
            ]);

            mostrarMensaje(
                `${respuesta.mensaje}. Factura: ${venta.numero}. Total: ${moneda(venta.total)}`
            );
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                "No fue posible registrar la venta",
                "error"
            );
        } finally {
            estado.procesando = false;

            boton.textContent =
                "Registrar venta";

            boton.disabled =
                !estado.turnoActivo ||
                !estado.carrito.length;
        }
    }

    function limpiarVenta() {
        estado.carrito = [];

        $("clienteVenta").value =
            "";

        $("metodoPagoVenta").value =
            "";

        $("observacionesVenta").value =
            "";

        $("efectivoRecibidoVenta").value =
            "0";

        $("campoEfectivoVenta").hidden =
            true;

        pintarCarrito();
    }

    async function cargarHistorial() {
        const parametros =
            new URLSearchParams();

        const buscar =
            $("buscarVenta")
                .value
                .trim();

        const cliente =
            $("filtroClienteVenta")
                .value;

        const estadoFiltro =
            $("filtroEstadoVenta")
                .value;

        const fechaDesde =
            $("fechaDesdeVenta")
                .value;

        const fechaHasta =
            $("fechaHastaVenta")
                .value;

        if (buscar) {
            parametros.set(
                "buscar",
                buscar
            );
        }

        if (cliente) {
            parametros.set(
                "id_cliente",
                cliente
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
            $("tablaHistorialVentas");

        tabla.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="fila-vacia"
                >
                    Cargando ventas...
                </td>
            </tr>
        `;

        try {
            const respuesta =
                await peticion(
                    `/ventas?${parametros.toString()}`
                );

            estado.ventas =
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
            $("tablaHistorialVentas");

        if (!estado.ventas.length) {
            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="fila-vacia"
                    >
                        No hay ventas para mostrar.
                    </td>
                </tr>
            `;

            return;
        }

        const puedeAnular =
            tienePermiso(
                "ventas.anular"
            );

        tabla.innerHTML =
            estado.ventas.map(
                (venta) => `
                    <tr>
                        <td>
                            <strong>
                                ${escapar(venta.numero)}
                            </strong>
                        </td>

                        <td>
                            ${new Date(
                                venta.fecha
                            ).toLocaleString("es-CO")}
                        </td>

                        <td>
                            ${escapar(venta.cliente)}

                            ${
                                venta.cliente_documento
                                    ? `
                                        <small>
                                            ${escapar(venta.cliente_documento)}
                                        </small>
                                      `
                                    : ""
                            }
                        </td>

                        <td>
                            ${escapar(venta.vendedor)}
                        </td>

                        <td>
                            ${escapar(venta.caja)}
                        </td>

                        <td>
                            ${escapar(venta.metodo_pago)}
                        </td>

                        <td>
                            <strong>
                                ${moneda(venta.total)}
                            </strong>
                        </td>

                        <td>
                            <span
                                class="estado-venta ${
                                    venta.estado === "ANULADA"
                                        ? "anulada"
                                        : "completada"
                                }"
                            >
                                ${escapar(venta.estado)}
                            </span>
                        </td>

                        <td class="acciones-venta">
                            <button
                                type="button"
                                class="btn-ver"
                                data-accion="ver"
                                data-id="${venta.id}"
                            >
                                Ver
                            </button>

                            ${
                                puedeAnular &&
                                venta.estado !== "ANULADA"
                                    ? `
                                        <button
                                            type="button"
                                            class="btn-anular"
                                            data-accion="anular"
                                            data-id="${venta.id}"
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
            Number(
                boton.dataset.id
            );

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
            $("modalDetalleVenta");

        modal.classList.add("activo");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        $("contenidoDetalleVenta")
            .innerHTML =
            "Cargando detalle...";

        try {
            const venta =
                await peticion(
                    `/ventas/${id}`
                );

            $("tituloDetalleVenta")
                .textContent =
                `Venta ${venta.numero}`;

            const detalle =
                venta.detalle.map(
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
                                ${moneda(item.precio)}
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

            $("contenidoDetalleVenta")
                .innerHTML = `
                    <div class="datos-detalle-venta">
                        <p>
                            <b>Cliente:</b>
                            ${escapar(venta.cliente)}
                        </p>

                        <p>
                            <b>Fecha:</b>
                            ${new Date(
                                venta.fecha
                            ).toLocaleString("es-CO")}
                        </p>

                        <p>
                            <b>Vendedor:</b>
                            ${escapar(venta.vendedor)}
                        </p>

                        <p>
                            <b>Caja:</b>
                            ${escapar(venta.caja)}
                        </p>

                        <p>
                            <b>Método:</b>
                            ${escapar(venta.metodo_pago)}
                        </p>

                        <p>
                            <b>Estado:</b>
                            ${escapar(venta.estado)}
                        </p>
                    </div>

                    <div class="tabla-detalle-modal">
                        <table>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Producto</th>
                                    <th>Cant.</th>
                                    <th>Precio</th>
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

                    <div class="resumen-detalle-venta">
                        <p>
                            Subtotal:
                            <b>${moneda(venta.subtotal)}</b>
                        </p>

                        <p>
                            Descuento:
                            <b>${moneda(venta.descuento)}</b>
                        </p>

                        <p>
                            IVA:
                            <b>${moneda(venta.iva)}</b>
                        </p>

                        <p class="gran-total">
                            Total:
                            <b>${moneda(venta.total)}</b>
                        </p>

                        ${
                            venta.efectivo_recibido !== null
                                ? `
                                    <p>
                                        Efectivo:
                                        <b>${moneda(venta.efectivo_recibido)}</b>
                                    </p>

                                    <p>
                                        Cambio:
                                        <b>${moneda(venta.cambio)}</b>
                                    </p>
                                  `
                                : ""
                        }
                    </div>

                    ${
                        venta.observaciones
                            ? `
                                <p>
                                    <b>Observaciones:</b>
                                    ${escapar(venta.observaciones)}
                                </p>
                              `
                            : ""
                    }

                    ${
                        venta.estado === "ANULADA"
                            ? `
                                <div class="aviso-anulacion">
                                    <b>Venta anulada</b>

                                    <p>
                                        ${
                                            escapar(
                                                venta.motivo_anulacion ||
                                                "Sin motivo"
                                            )
                                        }
                                    </p>
                                </div>
                              `
                            : ""
                    }
                `;
        } catch (error) {
            console.error(error);

            $("contenidoDetalleVenta")
                .innerHTML = `
                    <p class="fila-vacia error">
                        ${escapar(error.message)}
                    </p>
                `;
        }
    }

    function cerrarDetalle() {
        const modal =
            $("modalDetalleVenta");

        modal.classList.remove("activo");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    function abrirAnulacion(id) {
        const venta =
            estado.ventas.find(
                (item) =>
                    Number(item.id) === id
            );

        if (!venta) {
            return;
        }

        $("idVentaAnular").value =
            id;

        $("textoVentaAnular")
            .textContent =
            `Se anulará ${venta.numero} por ${moneda(venta.total)} y se devolverá el stock.`;

        $("motivoAnulacionVenta")
            .value = "";

        const modal =
            $("modalAnularVenta");

        modal.classList.add("activo");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        $("motivoAnulacionVenta")
            .focus();
    }

    function cerrarAnulacion() {
        if (estado.procesando) {
            return;
        }

        const modal =
            $("modalAnularVenta");

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
                $("idVentaAnular").value
            );

        const motivo =
            $("motivoAnulacionVenta")
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
                "¿Confirmas la anulación? El stock será repuesto."
            );

        if (!confirmar) {
            return;
        }

        estado.procesando = true;

        const boton =
            $("btnConfirmarAnulacionVenta");

        boton.disabled = true;

        boton.textContent =
            "Anulando...";

        try {
            const respuesta =
                await peticion(
                    `/ventas/${id}/anular`,
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
                "No fue posible anular la venta",
                "error"
            );
        } finally {
            estado.procesando = false;

            boton.disabled = false;

            boton.textContent =
                "Anular venta";
        }
    }

    inicializar();
})();