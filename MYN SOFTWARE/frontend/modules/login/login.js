/**
 * ==========================================
 * MYN SOFTWARE
 * Módulo de inicio de sesión
 * ==========================================
 */

(function iniciarModuloLogin() {
    const inputCorreo = document.getElementById("usuario");
    const inputPassword = document.getElementById("password");
    const botonLogin = document.getElementById("btnLogin");
    const botonMostrarPassword = document.getElementById("mostrarPassword");
    const mensajeError = document.getElementById("error");
    const recordarUsuario = document.getElementById("recordar");

    if (
        !inputCorreo ||
        !inputPassword ||
        !botonLogin ||
        !mensajeError
    ) {
        console.error("No se pudieron encontrar los elementos del formulario de login.");
        return;
    }

    cargarUsuarioRecordado();

    botonLogin.addEventListener("click", ejecutarLogin);

    inputCorreo.addEventListener("keydown", manejarEnter);
    inputPassword.addEventListener("keydown", manejarEnter);

    if (botonMostrarPassword) {
        botonMostrarPassword.addEventListener("click", alternarPassword);
    }

    function manejarEnter(evento) {
        if (evento.key === "Enter") {
            evento.preventDefault();
            ejecutarLogin();
        }
    }

    function alternarPassword() {
        const passwordVisible = inputPassword.type === "text";

        inputPassword.type = passwordVisible
            ? "password"
            : "text";

        botonMostrarPassword.textContent = passwordVisible
            ? "👁"
            : "🙈";

        inputPassword.focus();
    }

    function cargarUsuarioRecordado() {
        const correoGuardado = localStorage.getItem("correoRecordado");

        if (correoGuardado) {
            inputCorreo.value = correoGuardado;

            if (recordarUsuario) {
                recordarUsuario.checked = true;
            }

            inputPassword.focus();
        } else {
            inputCorreo.focus();
        }
    }

    async function ejecutarLogin() {
        const correo = inputCorreo.value.trim();
        const password = inputPassword.value;

        limpiarMensaje();

        if (!correo) {
            mostrarError("Ingrese el correo electrónico.");
            inputCorreo.focus();
            return;
        }

        if (!validarCorreo(correo)) {
            mostrarError("Ingrese un correo electrónico válido.");
            inputCorreo.focus();
            return;
        }

        if (!password) {
            mostrarError("Ingrese la contraseña.");
            inputPassword.focus();
            return;
        }

        cambiarEstadoBoton(true);

        try {
            const respuesta = await peticion(
                "/auth/login",
                "POST",
                {
                    correo,
                    password
                }
            );

            if (!respuesta || !respuesta.token || !respuesta.usuario) {
                mostrarError(
                    respuesta?.mensaje ||
                    "No fue posible iniciar sesión."
                );
                return;
            }

            localStorage.setItem("token", respuesta.token);

            sessionStorage.setItem(
                "usuario",
                `${respuesta.usuario.nombres} ${respuesta.usuario.apellidos}`.trim()
            );

            sessionStorage.setItem(
                "idUsuario",
                String(respuesta.usuario.id)
            );

            sessionStorage.setItem(
                "rol",
                respuesta.usuario.rol || ""
            );

            guardarUsuarioRecordado(correo);

            await cargarPermisos();

            await abrirModulo("dashboard");
        } catch (error) {
            console.error("Error durante el inicio de sesión:", error);

            mostrarError(
                error.message ||
                "No fue posible conectar con el servidor."
            );
        } finally {
            cambiarEstadoBoton(false);
        }
    }

    async function cargarPermisos() {
        try {
            const permisos = await peticion("/permisos/mios");

            sessionStorage.setItem(
                "permisos",
                JSON.stringify(
                    Array.isArray(permisos) ? permisos : []
                )
            );
        } catch (error) {
            console.error(
                "No se pudieron cargar los permisos:",
                error
            );

            sessionStorage.setItem(
                "permisos",
                JSON.stringify([])
            );
        }
    }

    function guardarUsuarioRecordado(correo) {
        if (recordarUsuario?.checked) {
            localStorage.setItem(
                "correoRecordado",
                correo
            );
        } else {
            localStorage.removeItem("correoRecordado");
        }
    }

    function cambiarEstadoBoton(cargando) {
        botonLogin.disabled = cargando;
        botonLogin.textContent = cargando
            ? "Ingresando..."
            : "Ingresar";
    }

    function mostrarError(mensaje) {
        mensajeError.textContent = mensaje;
    }

    function limpiarMensaje() {
        mensajeError.textContent = "";
    }

    function validarCorreo(correo) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    }
})();