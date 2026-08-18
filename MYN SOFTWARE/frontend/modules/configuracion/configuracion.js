(() => {
    "use strict";

    const estado = {
        puedeEditar: false,
        guardandoEmpresa: false,
        guardandoConfiguracion: false
    };

    const $ = (id) =>
        document.getElementById(id);

    function texto(
        valor,
        maximo = 255
    ) {
        return String(valor ?? "")
            .trim()
            .slice(0, maximo);
    }

    function correoValido(
        correo
    ) {
        if (!correo) {
            return true;
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            correo
        );
    }

    function mostrarMensaje(
        mensaje,
        tipo = "exito"
    ) {
        const contenedor =
            $("mensajeConfiguracion");

        if (!contenedor) {
            return;
        }

        contenedor.textContent =
            mensaje;

        contenedor.className =
            `mensaje-configuracion visible ${tipo}`;

        clearTimeout(
            mostrarMensaje.temporizador
        );

        mostrarMensaje.temporizador =
            setTimeout(() => {
                contenedor.textContent =
                    "";

                contenedor.className =
                    "mensaje-configuracion";
            }, 4500);
    }

    function enlazarEventos() {
        $("formEmpresa")
            ?.addEventListener(
                "submit",
                guardarEmpresa
            );

        $("formConfiguracion")
            ?.addEventListener(
                "submit",
                guardarConfiguracion
            );

        $("cfgMoneda")
            ?.addEventListener(
                "change",
                sincronizarMoneda
            );

        $("cfgSimbolo")
            ?.addEventListener(
                "input",
                actualizarVistaPrevia
            );
    }

    function establecerPermisos() {
        estado.puedeEditar =
            typeof tienePermiso ===
                "function" &&
            tienePermiso(
                "configuracion.editar"
            );

        document
            .querySelectorAll(
                "#formEmpresa input, " +
                "#formEmpresa button, " +
                "#formConfiguracion input, " +
                "#formConfiguracion select, " +
                "#formConfiguracion button"
            )
            .forEach((elemento) => {
                elemento.disabled =
                    !estado.puedeEditar;
            });

        if (!estado.puedeEditar) {
            mostrarMensaje(
                "Tu rol puede consultar la configuración, pero no modificarla.",
                "advertencia"
            );
        }
    }

    async function inicializar() {
        enlazarEventos();

        establecerPermisos();

        await Promise.all([
            cargarEmpresa(),
            cargarConfiguracion()
        ]);

        actualizarVistaPrevia();
    }

    async function cargarEmpresa() {
        try {
            const empresa =
                await peticion(
                    "/empresa"
                );

            $("empNombre").value =
                empresa?.nombre || "";

            $("empNit").value =
                empresa?.nit || "";

            $("empPropietario").value =
                empresa?.propietario || "";

            $("empDireccion").value =
                empresa?.direccion || "";

            $("empCiudad").value =
                empresa?.ciudad || "";

            $("empTelefono").value =
                empresa?.telefono || "";

            $("empCorreo").value =
                empresa?.correo || "";
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                "No fue posible cargar los datos de la empresa.",
                "error"
            );
        }
    }

    async function cargarConfiguracion() {
        try {
            const configuracion =
                await peticion(
                    "/configuracion"
                );

            $("cfgIva").value =
                configuracion?.iva ?? 19;

            $("cfgMoneda").value =
                configuracion?.moneda ||
                "COP";

            $("cfgSimbolo").value =
                configuracion?.simbolo ||
                "$";

            $("cfgImpresora").value =
                configuracion?.impresora ||
                "";

            actualizarVistaPrevia();
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                "No fue posible cargar los parámetros.",
                "error"
            );
        }
    }

    function obtenerDatosEmpresa() {
        return {
            nombre:
                texto(
                    $("empNombre").value,
                    150
                ),

            nit:
                texto(
                    $("empNit").value,
                    30
                ),

            propietario:
                texto(
                    $("empPropietario").value,
                    150
                ),

            direccion:
                texto(
                    $("empDireccion").value,
                    200
                ),

            ciudad:
                texto(
                    $("empCiudad").value,
                    100
                ),

            telefono:
                texto(
                    $("empTelefono").value,
                    30
                ),

            correo:
                texto(
                    $("empCorreo").value,
                    150
                ).toLowerCase()
        };
    }

    function validarEmpresa(
        datos
    ) {
        if (!datos.nombre) {
            return (
                "El nombre de la empresa es obligatorio."
            );
        }

        if (
            !correoValido(
                datos.correo
            )
        ) {
            return (
                "El correo electrónico de la empresa no es válido."
            );
        }

        return null;
    }

    async function guardarEmpresa(
        evento
    ) {
        evento.preventDefault();

        if (
            !estado.puedeEditar ||
            estado.guardandoEmpresa
        ) {
            return;
        }

        const datos =
            obtenerDatosEmpresa();

        const errorValidacion =
            validarEmpresa(datos);

        if (errorValidacion) {
            mostrarMensaje(
                errorValidacion,
                "error"
            );

            return;
        }

        estado.guardandoEmpresa =
            true;

        const boton =
            $("btnGuardarEmpresa");

        boton.disabled = true;

        boton.textContent =
            "Guardando...";

        try {
            const respuesta =
                await peticion(
                    "/empresa",
                    "PUT",
                    datos
                );

            mostrarMensaje(
                respuesta.mensaje ||
                "Datos de la empresa guardados correctamente."
            );
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                "Error al guardar los datos de la empresa.",
                "error"
            );
        } finally {
            estado.guardandoEmpresa =
                false;

            boton.disabled =
                !estado.puedeEditar;

            boton.textContent =
                "Guardar datos de la empresa";
        }
    }

    function obtenerDatosConfiguracion() {
        return {
            iva:
                Number(
                    $("cfgIva").value
                ),

            moneda:
                texto(
                    $("cfgMoneda").value,
                    10
                ).toUpperCase(),

            simbolo:
                texto(
                    $("cfgSimbolo").value,
                    10
                ),

            impresora:
                texto(
                    $("cfgImpresora").value,
                    150
                )
        };
    }

    function validarConfiguracion(
        datos
    ) {
        if (
            !Number.isFinite(
                datos.iva
            ) ||
            datos.iva < 0 ||
            datos.iva > 100
        ) {
            return (
                "El IVA debe ser un número entre 0 y 100."
            );
        }

        if (!datos.moneda) {
            return (
                "Selecciona una moneda."
            );
        }

        if (!datos.simbolo) {
            return (
                "El símbolo monetario es obligatorio."
            );
        }

        return null;
    }

    async function guardarConfiguracion(
        evento
    ) {
        evento.preventDefault();

        if (
            !estado.puedeEditar ||
            estado.guardandoConfiguracion
        ) {
            return;
        }

        const datos =
            obtenerDatosConfiguracion();

        const errorValidacion =
            validarConfiguracion(
                datos
            );

        if (errorValidacion) {
            mostrarMensaje(
                errorValidacion,
                "error"
            );

            return;
        }

        estado.guardandoConfiguracion =
            true;

        const boton =
            $("btnGuardarConfiguracion");

        boton.disabled = true;

        boton.textContent =
            "Guardando...";

        try {
            const respuesta =
                await peticion(
                    "/configuracion",
                    "PUT",
                    datos
                );

            mostrarMensaje(
                respuesta.mensaje ||
                "Configuración guardada correctamente."
            );

            actualizarVistaPrevia();
        } catch (error) {
            console.error(error);

            mostrarMensaje(
                error.message ||
                "Error al guardar los parámetros.",
                "error"
            );
        } finally {
            estado.guardandoConfiguracion =
                false;

            boton.disabled =
                !estado.puedeEditar;

            boton.textContent =
                "Guardar parámetros";
        }
    }

    function sincronizarMoneda() {
        const simbolos = {
            COP: "$",
            USD: "US$",
            EUR: "€"
        };

        const moneda =
            $("cfgMoneda").value;

        $("cfgSimbolo").value =
            simbolos[moneda] || "$";

        actualizarVistaPrevia();
    }

    function actualizarVistaPrevia() {
        const simbolo =
            $("cfgSimbolo")
                ?.value
                ?.trim() || "$";

        const vista =
            $("vistaPreviaMoneda");

        if (vista) {
            vista.textContent =
                `${simbolo} 1.000.000`;
        }
    }

    inicializar();
})();