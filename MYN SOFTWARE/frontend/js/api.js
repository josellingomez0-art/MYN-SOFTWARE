async function peticion(
    url,
    metodo = "GET",
    datos = null
) {
    const opciones = {
        method: metodo,

        headers: {
            "Content-Type":
                "application/json"
        }
    };

    const token =
        localStorage.getItem("token");

    if (token) {
        opciones.headers.Authorization =
            `Bearer ${token}`;
    }

    if (
        datos !== null &&
        datos !== undefined
    ) {
        opciones.body =
            JSON.stringify(datos);
    }

    let respuesta;

    try {
        respuesta = await fetch(
            API + url,
            opciones
        );
    } catch (error) {
        throw new Error(
            "No fue posible conectar con el servidor"
        );
    }

    const tipo =
        respuesta.headers.get(
            "content-type"
        ) || "";

    const cuerpo =
        tipo.includes("application/json")
            ? await respuesta
                  .json()
                  .catch(() => ({}))
            : await respuesta
                  .text()
                  .catch(() => "");

    if (
        respuesta.status === 401 &&
        !url.startsWith("/auth")
    ) {
        localStorage.removeItem("token");
        sessionStorage.clear();

        if (
            typeof abrirModulo ===
            "function"
        ) {
            abrirModulo("login");
        }

        throw new Error(
            cuerpo?.mensaje ||
            "La sesión expiró o no está autorizada"
        );
    }

    if (!respuesta.ok) {
        throw new Error(
            cuerpo?.mensaje ||
            `La solicitud falló (${respuesta.status})`
        );
    }

    return cuerpo;
}

function tienePermiso(nombrePermiso) {
    try {
        const permisos = JSON.parse(
            sessionStorage.getItem(
                "permisos"
            ) || "[]"
        );

        return permisos.includes(
            nombrePermiso
        );
    } catch (error) {
        return false;
    }
}