(() => {
    "use strict";

    const estado = {
        reporte: null,
        cargando: false
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

    const numero = (valor) =>
        new Intl.NumberFormat(
            "es-CO"
        ).format(
            Number(valor) || 0
        );

    function fechaInput(fecha) {
        const anio =
            fecha.getFullYear();

        const mes =
            String(
                fecha.getMonth() + 1
            ).padStart(2, "0");

        const dia =
            String(
                fecha.getDate()
            ).padStart(2, "0");

        return `${anio}-${mes}-${dia}`;
    }

    function mostrarMensaje(
        texto,
        tipo = "exito"
    ) {
        const contenedor =
            $("mensajeReportes");

        contenedor.textContent =
            texto;

        contenedor.className =
            `mensaje-reportes visible ${tipo}`;

        clearTimeout(
            mostrarMensaje.temporizador
        );

        mostrarMensaje.temporizador =
            setTimeout(() => {
                contenedor.textContent = "";

                contenedor.className =
                    "mensaje-reportes";
            }, 4500);
    }

    async function inicializar() {
        enlazarEventos();

        establecerPeriodo("mes");

        await generarReporte();
    }

    function enlazarEventos() {
        $("periodoReporte")
            .addEventListener(
                "change",
                () => {
                    establecerPeriodo(
                        $("periodoReporte").value
                    );
                }
            );

        $("fechaDesdeReporte")
            .addEventListener(
                "change",
                marcarPersonalizado
            );

        $("fechaHastaReporte")
            .addEventListener(
                "change",
                marcarPersonalizado
            );

        $("btnGenerarReporte")
            .addEventListener(
                "click",
                generarReporte
            );

        $("btnExportarReporte")
            .addEventListener(
                "click",
                exportarCSV
            );

        $("btnImprimirReporte")
            .addEventListener(
                "click",
                () => window.print()
            );

        document
            .querySelectorAll(
                ".tabs-reportes button[data-reporte]"
            )
            .forEach((boton) => {
                boton.addEventListener(
                    "click",
                    () =>
                        cambiarVista(
                            boton.dataset.reporte
                        )
                );
            });

        window.addEventListener(
            "resize",
            () => {
                if (
                    estado.reporte
                ) {
                    pintarGraficoVentasCompras(
                        estado.reporte
                    );
                }
            }
        );
    }

    function marcarPersonalizado() {
        $("periodoReporte").value =
            "personalizado";
    }

    function establecerPeriodo(
        periodo
    ) {
        const hoy = new Date();

        let desde =
            new Date(
                hoy.getFullYear(),
                hoy.getMonth(),
                hoy.getDate()
            );

        const hasta =
            new Date(
                hoy.getFullYear(),
                hoy.getMonth(),
                hoy.getDate()
            );

        if (periodo === "semana") {
            const diaSemana =
                hoy.getDay() || 7;

            desde.setDate(
                hoy.getDate() -
                diaSemana +
                1
            );
        }

        if (periodo === "mes") {
            desde =
                new Date(
                    hoy.getFullYear(),
                    hoy.getMonth(),
                    1
                );
        }

        if (periodo === "anio") {
            desde =
                new Date(
                    hoy.getFullYear(),
                    0,
                    1
                );
        }

        if (
            periodo !==
            "personalizado"
        ) {
            $("fechaDesdeReporte").value =
                fechaInput(desde);

            $("fechaHastaReporte").value =
                fechaInput(hasta);
        }
    }

    async function generarReporte() {
        if (estado.cargando) {
            return;
        }

        const fechaDesde =
            $("fechaDesdeReporte").value;

        const fechaHasta =
            $("fechaHastaReporte").value;

        if (
            !fechaDesde ||
            !fechaHasta
        ) {
            mostrarMensaje(
                "Selecciona las dos fechas",
                "error"
            );

            return;
        }

        if (
            fechaDesde >
            fechaHasta
        ) {
            mostrarMensaje(
                "La fecha inicial no puede ser posterior a la final",
                "error"
            );

            return;
        }

        estado.cargando = true;

        const boton =
            $("btnGenerarReporte");

        boton.disabled = true;
        boton.textContent =
            "Generando...";

        try {
            const parametros =
                new URLSearchParams({
                    fecha_desde:
                        fechaDesde,

                    fecha_hasta:
                        fechaHasta
                });

            estado.reporte =
                await peticion(
                    `/reportes?${parametros.toString()}`
                );

            pintarReporte(
                estado.reporte
            );

            mostrarMensaje(
                "Reporte actualizado correctamente"
            );
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                "No fue posible generar el reporte",
                "error"
            );
        } finally {
            estado.cargando = false;

            boton.disabled = false;
            boton.textContent =
                "Generar reporte";
        }
    }

    function pintarReporte(reporte) {
        pintarResumen(
            reporte.resumen
        );

        pintarGraficoVentasCompras(
            reporte
        );

        pintarMetodosPago(
            reporte.ventas_por_metodo_pago
        );

        pintarProductos(
            reporte.productos_mas_vendidos
        );

        pintarEmpleados(
            reporte.ventas_por_empleado
        );

        pintarClientes(
            reporte.clientes_principales
        );

        pintarProveedores(
            reporte.proveedores_principales
        );

        pintarStock(
            reporte.stock_bajo
        );

        pintarVentas(
            reporte.ultimas_ventas
        );
    }

    function pintarResumen(datos) {
        $("reporteTotalVentas")
            .textContent =
            moneda(
                datos.total_ventas
            );

        $("reporteCantidadVentas")
            .textContent =
            `${numero(
                datos.cantidad_ventas
            )} venta(s)`;

        $("reporteTotalCompras")
            .textContent =
            moneda(
                datos.total_compras
            );

        $("reporteCantidadCompras")
            .textContent =
            `${numero(
                datos.cantidad_compras
            )} compra(s)`;

        $("reporteUtilidad")
            .textContent =
            moneda(
                datos.utilidad_bruta
            );

        $("reporteMargen")
            .textContent =
            `Margen ${Number(
                datos.margen_bruto
            ).toFixed(2)}%`;

        $("reporteValorInventario")
            .textContent =
            moneda(
                datos.valor_inventario_costo
            );

        $("reporteStockBajo")
            .textContent =
            `${numero(
                datos.productos_stock_bajo
            )} producto(s) con stock bajo`;
    }

    function combinarSeries(
        ventas,
        compras
    ) {
        const mapa = new Map();

        ventas.forEach(
            (item) => {
                const clave =
                    String(item.fecha)
                        .slice(0, 10);

                mapa.set(
                    clave,
                    {
                        fecha: clave,
                        ventas:
                            Number(item.total) ||
                            0,
                        compras: 0
                    }
                );
            }
        );

        compras.forEach(
            (item) => {
                const clave =
                    String(item.fecha)
                        .slice(0, 10);

                const actual =
                    mapa.get(clave) || {
                        fecha: clave,
                        ventas: 0,
                        compras: 0
                    };

                actual.compras =
                    Number(item.total) ||
                    0;

                mapa.set(
                    clave,
                    actual
                );
            }
        );

        return Array.from(
            mapa.values()
        ).sort(
            (a, b) =>
                a.fecha.localeCompare(
                    b.fecha
                )
        );
    }

    function pintarGraficoVentasCompras(
        reporte
    ) {
        const canvas =
            $("graficoVentasCompras");

        const contenedor =
            canvas.parentElement;

        const ancho =
            Math.max(
                contenedor.clientWidth,
                320
            );

        const alto = 320;

        const escala =
            window.devicePixelRatio ||
            1;

        canvas.width =
            ancho * escala;

        canvas.height =
            alto * escala;

        canvas.style.width =
            `${ancho}px`;

        canvas.style.height =
            `${alto}px`;

        const ctx =
            canvas.getContext("2d");

        ctx.scale(
            escala,
            escala
        );

        ctx.clearRect(
            0,
            0,
            ancho,
            alto
        );

        const datos =
            combinarSeries(
                reporte.ventas_por_dia,
                reporte.compras_por_dia
            );

        if (!datos.length) {
            ctx.font =
                "15px Arial";

            ctx.textAlign =
                "center";

            ctx.fillText(
                "Sin movimientos para el periodo",
                ancho / 2,
                alto / 2
            );

            return;
        }

        const margen = {
            superior: 25,
            derecho: 18,
            inferior: 55,
            izquierdo: 65
        };

        const anchoGrafico =
            ancho -
            margen.izquierdo -
            margen.derecho;

        const altoGrafico =
            alto -
            margen.superior -
            margen.inferior;

        const maximo =
            Math.max(
                ...datos.flatMap(
                    (item) => [
                        item.ventas,
                        item.compras
                    ]
                ),
                1
            );

        ctx.strokeStyle =
            "#dfe5e1";

        ctx.fillStyle =
            "#666";

        ctx.font =
            "11px Arial";

        ctx.textAlign =
            "right";

        for (
            let linea = 0;
            linea <= 4;
            linea += 1
        ) {
            const y =
                margen.superior +
                altoGrafico *
                linea /
                4;

            ctx.beginPath();

            ctx.moveTo(
                margen.izquierdo,
                y
            );

            ctx.lineTo(
                margen.izquierdo +
                anchoGrafico,
                y
            );

            ctx.stroke();

            const valor =
                maximo *
                (
                    1 -
                    linea / 4
                );

            ctx.fillText(
                abreviarNumero(valor),
                margen.izquierdo - 8,
                y + 4
            );
        }

        const anchoGrupo =
            anchoGrafico /
            datos.length;

        const anchoBarra =
            Math.max(
                3,
                Math.min(
                    18,
                    anchoGrupo * 0.32
                )
            );

        datos.forEach(
            (item, indice) => {
                const centro =
                    margen.izquierdo +
                    anchoGrupo *
                    indice +
                    anchoGrupo /
                    2;

                const alturaVentas =
                    item.ventas /
                    maximo *
                    altoGrafico;

                const alturaCompras =
                    item.compras /
                    maximo *
                    altoGrafico;

                ctx.fillStyle =
                    "#079c2c";

                ctx.fillRect(
                    centro -
                    anchoBarra -
                    2,
                    margen.superior +
                    altoGrafico -
                    alturaVentas,
                    anchoBarra,
                    alturaVentas
                );

                ctx.fillStyle =
                    "#1976d2";

                ctx.fillRect(
                    centro + 2,
                    margen.superior +
                    altoGrafico -
                    alturaCompras,
                    anchoBarra,
                    alturaCompras
                );

                const mostrarEtiqueta =
                    datos.length <= 12 ||
                    indice %
                    Math.ceil(
                        datos.length / 10
                    ) === 0;

                if (mostrarEtiqueta) {
                    ctx.save();

                    ctx.translate(
                        centro,
                        alto -
                        margen.inferior +
                        13
                    );

                    ctx.rotate(
                        -Math.PI / 5
                    );

                    ctx.fillStyle =
                        "#555";

                    ctx.textAlign =
                        "right";

                    ctx.fillText(
                        item.fecha.slice(5),
                        0,
                        0
                    );

                    ctx.restore();
                }
            }
        );

        ctx.fillStyle =
            "#079c2c";

        ctx.fillRect(
            margen.izquierdo,
            alto - 18,
            12,
            12
        );

        ctx.fillStyle =
            "#444";

        ctx.textAlign =
            "left";

        ctx.fillText(
            "Ventas",
            margen.izquierdo + 18,
            alto - 8
        );

        ctx.fillStyle =
            "#1976d2";

        ctx.fillRect(
            margen.izquierdo + 85,
            alto - 18,
            12,
            12
        );

        ctx.fillStyle =
            "#444";

        ctx.fillText(
            "Compras",
            margen.izquierdo + 103,
            alto - 8
        );
    }

    function abreviarNumero(valor) {
        if (valor >= 1000000) {
            return `${(
                valor /
                1000000
            ).toFixed(1)}M`;
        }

        if (valor >= 1000) {
            return `${(
                valor /
                1000
            ).toFixed(0)}K`;
        }

        return String(
            Math.round(valor)
        );
    }

    function pintarMetodosPago(lista) {
        const contenedor =
            $("graficoMetodosPago");

        if (!lista.length) {
            contenedor.innerHTML = `
                <p class="fila-vacia">
                    Sin ventas en el periodo.
                </p>
            `;

            return;
        }

        const maximo =
            Math.max(
                ...lista.map(
                    (item) =>
                        Number(item.total)
                ),
                1
            );

        contenedor.innerHTML =
            lista.map(
                (item) => {
                    const porcentaje =
                        Number(item.total) /
                        maximo *
                        100;

                    return `
                        <div class="barra-reporte">
                            <div class="barra-reporte-datos">
                                <span>
                                    ${escapar(item.nombre)}
                                </span>

                                <strong>
                                    ${moneda(item.total)}
                                </strong>
                            </div>

                            <div class="barra-reporte-fondo">
                                <div
                                    class="barra-reporte-valor"
                                    style="width:${porcentaje}%"
                                ></div>
                            </div>

                            <small>
                                ${numero(item.cantidad_ventas)}
                                venta(s)
                            </small>
                        </div>
                    `;
                }
            ).join("");
    }

    function filaVacia(
        columnas,
        mensaje
    ) {
        return `
            <tr>
                <td
                    colspan="${columnas}"
                    class="fila-vacia"
                >
                    ${escapar(mensaje)}
                </td>
            </tr>
        `;
    }

    function pintarProductos(lista) {
        $("tablaReporteProductos")
            .innerHTML =
            lista.length
                ? lista.map(
                    (item) => `
                        <tr>
                            <td>
                                ${escapar(item.codigo)}
                            </td>

                            <td>
                                ${escapar(item.nombre)}
                            </td>

                            <td>
                                ${escapar(item.marca || "—")}
                            </td>

                            <td>
                                ${numero(item.unidades_vendidas)}
                            </td>

                            <td>
                                ${moneda(item.venta_neta)}
                            </td>

                            <td>
                                ${moneda(item.utilidad_estimada)}
                            </td>
                        </tr>
                    `
                ).join("")
                : filaVacia(
                    6,
                    "No hay productos vendidos"
                );
    }

    function pintarEmpleados(lista) {
        $("tablaReporteEmpleados")
            .innerHTML =
            lista.length
                ? lista.map(
                    (item) => `
                        <tr>
                            <td>
                                ${escapar(item.empleado)}
                            </td>

                            <td>
                                ${escapar(item.rol)}
                            </td>

                            <td>
                                ${numero(item.cantidad_ventas)}
                            </td>

                            <td>
                                ${moneda(item.total_vendido)}
                            </td>
                        </tr>
                    `
                ).join("")
                : filaVacia(
                    4,
                    "No hay ventas por empleado"
                );
    }

    function pintarClientes(lista) {
        $("tablaReporteClientes")
            .innerHTML =
            lista.length
                ? lista.map(
                    (item) => `
                        <tr>
                            <td>
                                ${escapar(item.documento || "—")}
                            </td>

                            <td>
                                ${escapar(item.cliente)}
                            </td>

                            <td>
                                ${numero(item.cantidad_ventas)}
                            </td>

                            <td>
                                ${moneda(item.total_comprado)}
                            </td>

                            <td>
                                ${new Date(
                                    item.ultima_compra
                                ).toLocaleString("es-CO")}
                            </td>
                        </tr>
                    `
                ).join("")
                : filaVacia(
                    5,
                    "No hay clientes para mostrar"
                );
    }

    function pintarProveedores(lista) {
        $("tablaReporteProveedores")
            .innerHTML =
            lista.length
                ? lista.map(
                    (item) => `
                        <tr>
                            <td>
                                ${escapar(item.nit || "—")}
                            </td>

                            <td>
                                ${escapar(item.razon_social)}
                            </td>

                            <td>
                                ${numero(item.cantidad_compras)}
                            </td>

                            <td>
                                ${moneda(item.total_comprado)}
                            </td>

                            <td>
                                ${new Date(
                                    item.ultima_compra
                                ).toLocaleString("es-CO")}
                            </td>
                        </tr>
                    `
                ).join("")
                : filaVacia(
                    5,
                    "No hay proveedores para mostrar"
                );
    }

    function pintarStock(lista) {
        $("tablaReporteStock")
            .innerHTML =
            lista.length
                ? lista.map(
                    (item) => `
                        <tr>
                            <td>
                                ${escapar(item.codigo)}
                            </td>

                            <td>
                                ${escapar(item.nombre)}
                            </td>

                            <td>
                                ${escapar(
                                    item.proveedor ||
                                    "Sin proveedor"
                                )}
                            </td>

                            <td>
                                ${numero(item.stock_actual)}
                            </td>

                            <td>
                                ${numero(item.stock_reservado)}
                            </td>

                            <td>
                                ${numero(item.stock_disponible)}
                            </td>

                            <td>
                                ${numero(item.stock_minimo)}
                            </td>
                        </tr>
                    `
                ).join("")
                : filaVacia(
                    7,
                    "No hay productos con stock bajo"
                );
    }

    function pintarVentas(lista) {
        $("tablaReporteVentas")
            .innerHTML =
            lista.length
                ? lista.map(
                    (item) => `
                        <tr>
                            <td>
                                ${escapar(item.numero)}
                            </td>

                            <td>
                                ${new Date(
                                    item.fecha
                                ).toLocaleString("es-CO")}
                            </td>

                            <td>
                                ${escapar(item.cliente)}
                            </td>

                            <td>
                                ${escapar(item.vendedor)}
                            </td>

                            <td>
                                ${escapar(item.metodo_pago)}
                            </td>

                            <td>
                                ${moneda(item.total)}
                            </td>

                            <td>
                                <span
                                    class="estado-reporte ${
                                        item.estado ===
                                            "ANULADA"
                                            ? "anulado"
                                            : "valido"
                                    }"
                                >
                                    ${escapar(item.estado)}
                                </span>
                            </td>
                        </tr>
                    `
                ).join("")
                : filaVacia(
                    7,
                    "No hay ventas para mostrar"
                );
    }

    function cambiarVista(vista) {
        document
            .querySelectorAll(
                ".tabs-reportes button[data-reporte]"
            )
            .forEach(
                (boton) => {
                    boton.classList.toggle(
                        "activo",
                        boton.dataset.reporte ===
                        vista
                    );
                }
            );

        document
            .querySelectorAll(
                ".vista-reporte"
            )
            .forEach(
                (contenedor) => {
                    contenedor.classList.remove(
                        "activa"
                    );
                }
            );

        const nombres = {
            productos:
                "vistaReporteProductos",

            empleados:
                "vistaReporteEmpleados",

            clientes:
                "vistaReporteClientes",

            proveedores:
                "vistaReporteProveedores",

            stock:
                "vistaReporteStock",

            ventas:
                "vistaReporteVentas"
        };

        $(nombres[vista])
            .classList.add(
                "activa"
            );
    }

    function csvCelda(valor) {
        return `"${String(
            valor ?? ""
        ).replaceAll('"', '""')}"`;
    }

    function exportarCSV() {
        if (!estado.reporte) {
            mostrarMensaje(
                "Primero genera un reporte",
                "error"
            );

            return;
        }

        const filas = [
            [
                "REPORTE MYN SOFTWARE"
            ],

            [
                "Desde",
                estado.reporte.periodo
                    .fecha_desde
            ],

            [
                "Hasta",
                estado.reporte.periodo
                    .fecha_hasta
            ],

            [],

            [
                "INDICADOR",
                "VALOR"
            ],

            [
                "Total ventas",
                estado.reporte.resumen
                    .total_ventas
            ],

            [
                "Cantidad ventas",
                estado.reporte.resumen
                    .cantidad_ventas
            ],

            [
                "Total compras",
                estado.reporte.resumen
                    .total_compras
            ],

            [
                "Cantidad compras",
                estado.reporte.resumen
                    .cantidad_compras
            ],

            [
                "Utilidad bruta estimada",
                estado.reporte.resumen
                    .utilidad_bruta
            ],

            [
                "Margen bruto",
                estado.reporte.resumen
                    .margen_bruto
            ],

            [
                "Valor inventario a costo",
                estado.reporte.resumen
                    .valor_inventario_costo
            ],

            [],

            [
                "PRODUCTOS MÁS VENDIDOS"
            ],

            [
                "Código",
                "Producto",
                "Marca",
                "Unidades",
                "Venta neta",
                "Utilidad estimada"
            ],

            ...estado.reporte
                .productos_mas_vendidos
                .map(
                    (item) => [
                        item.codigo,
                        item.nombre,
                        item.marca,
                        item.unidades_vendidas,
                        item.venta_neta,
                        item.utilidad_estimada
                    ]
                )
        ];

        const contenido =
            "\uFEFF" +
            filas.map(
                (fila) =>
                    fila.map(
                        csvCelda
                    ).join(";")
            ).join("\r\n");

        const blob =
            new Blob(
                [contenido],
                {
                    type:
                        "text/csv;charset=utf-8"
                }
            );

        const url =
            URL.createObjectURL(blob);

        const enlace =
            document.createElement("a");

        enlace.href = url;

        enlace.download =
            `reporte-${estado.reporte.periodo.fecha_desde}-${estado.reporte.periodo.fecha_hasta}.csv`;

        document.body.appendChild(
            enlace
        );

        enlace.click();
        enlace.remove();

        URL.revokeObjectURL(url);
    }

    inicializar();
})();