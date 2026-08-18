/**
 * ==========================================================
 * MYN SOFTWARE
 * Router principal
 * ==========================================================
 */

const app = document.getElementById("app");

/*
|--------------------------------------------------------------------------
| Rutas de los módulos
|--------------------------------------------------------------------------
*/

const ROUTES = {
    splash: {
        path: "modules/splash",
        html: "index.html",
        css: "splash.css",
        js: "splash.js",
        layout: false
    },

    login: {
        path: "modules/login",
        html: "index.html",
        css: "login.css",
        js: "login.js",
        layout: false
    },

    dashboard: {
        path: "modules/dashboard",
        html: "index.html",
        css: "dashboard.css",
        js: "dashboard.js",
        layout: true
    },

    ventas: {
        path: "modules/ventas",
        html: "index.html",
        css: "ventas.css",
        js: "ventas.js",
        layout: true
    },

    caja: {
        path: "modules/caja",
        html: "index.html",
        css: "caja.css",
        js: "caja.js",
        layout: true
    },

    productos: {
        path: "modules/productos",
        html: "index.html",
        css: "productos.css",
        js: "productos.js",
        layout: true
    },

    inventario: {
        path: "modules/inventario",
        html: "index.html",
        css: "inventario.css",
        js: "inventario.js",
        layout: true
    },

    clientes: {
        path: "modules/clientes",
        html: "index.html",
        css: "clientes.css",
        js: "clientes.js",
        layout: true
    },

    proveedores: {
        path: "modules/proveedores",
        html: "index.html",
        css: "proveedores.css",
        js: "proveedores.js",
        layout: true
    },

    compras: {
        path: "modules/compras",
        html: "index.html",
        css: "compras.css",
        js: "compras.js",
        layout: true
    },

    empleados: {
        path: "modules/empleados",
        html: "index.html",
        css: "empleados.css",
        js: "empleados.js",
        layout: true
    },

    roles: {
        path: "modules/roles",
        html: "index.html",
        css: "roles.css",
        js: "roles.js",
        layout: true
    },

    reportes: {
        path: "modules/reportes",
        html: "index.html",
        css: "reportes.css",
        js: "reportes.js",
        layout: true
    },

    configuracion: {
        path: "modules/configuracion",
        html: "index.html",
        css: "configuracion.css",
        js: "configuracion.js",
        layout: true
    }
};

/*
|--------------------------------------------------------------------------
| Permisos por módulo
|--------------------------------------------------------------------------
*/

const PERMISOS_MODULOS = {
    dashboard: "dashboard.ver",
    ventas: "ventas.ver",
    caja: "caja.operar",
    productos: "productos.ver",
    inventario: "inventario.ver",
    clientes: "clientes.ver",
    proveedores: "proveedores.ver",
    compras: "compras.ver",
    empleados: "usuarios.ver",
    roles: "roles.gestionar",
    reportes: "reportes.ver",
    configuracion: "configuracion.editar"
};

/*
|--------------------------------------------------------------------------
| Estado del router
|--------------------------------------------------------------------------
*/

let layoutConstruido = false;
let moduloActual = null;

/*
|--------------------------------------------------------------------------
| Utilidades
|--------------------------------------------------------------------------
*/

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function tieneAccesoAlModulo(nombre) {
    const modulo = ROUTES[nombre];

    if (!modulo) {
        return false;
    }

    if (!modulo.layout) {
        return true;
    }

    const permiso = PERMISOS_MODULOS[nombre];

    if (!permiso) {
        return true;
    }

    if (typeof tienePermiso !== "function") {
        return true;
    }

    return tienePermiso(permiso);
}

function mostrarErrorRouter(error) {
    console.error(error);

    const mensaje =
        error?.message ||
        "Ocurrió un error al cargar el módulo.";

    app.innerHTML = `
        <div
            style="
                padding:40px;
                font-family:Arial,sans-serif;
                text-align:center;
            "
        >
            <h2>Error</h2>

            <p>
                ${escaparHTML(mensaje)}
            </p>

            <button
                id="btnVolverDashboard"
                type="button"
                style="
                    margin-top:15px;
                    padding:10px 16px;
                    border:0;
                    border-radius:6px;
                    background:#079c2c;
                    color:#fff;
                    cursor:pointer;
                "
            >
                Volver
            </button>
        </div>
    `;

    const boton =
        document.getElementById(
            "btnVolverDashboard"
        );

    boton?.addEventListener(
        "click",
        () => {
            const token =
                localStorage.getItem("token");

            abrirModulo(
                token
                    ? "dashboard"
                    : "login"
            );
        }
    );
}

/*
|--------------------------------------------------------------------------
| Sidebar
|--------------------------------------------------------------------------
*/

function aplicarPermisosSidebar() {
    document
        .querySelectorAll(
            "#sidebarContainer button[data-modulo]"
        )
        .forEach((boton) => {
            const nombre =
                boton.dataset.modulo;

            const permitido =
                tieneAccesoAlModulo(nombre);

            const elementoLista =
                boton.closest("li");

            if (elementoLista) {
                elementoLista.hidden =
                    !permitido;
            } else {
                boton.hidden =
                    !permitido;
            }
        });
}

function marcarModuloActivo(nombre) {
    document
        .querySelectorAll(
            "#sidebarContainer button[data-modulo]"
        )
        .forEach((boton) => {
            boton.classList.toggle(
                "activo",
                boton.dataset.modulo ===
                    nombre
            );

            boton.setAttribute(
                "aria-current",
                boton.dataset.modulo ===
                    nombre
                    ? "page"
                    : "false"
            );
        });
}

function enlazarNavegacionSidebar() {
    const sidebar =
        document.getElementById(
            "sidebarContainer"
        );

    if (!sidebar) {
        return;
    }

    sidebar.addEventListener(
        "click",
        (evento) => {
            const boton =
                evento.target.closest(
                    "button[data-modulo]"
                );

            if (!boton) {
                return;
            }

            abrirModulo(
                boton.dataset.modulo
            );
        }
    );
}

/*
|--------------------------------------------------------------------------
| Acciones internas de los módulos
|--------------------------------------------------------------------------
*/

function enlazarAccionesDelModulo(
    contenedor
) {
    if (!contenedor) {
        return;
    }

    contenedor
        .querySelectorAll(
            "[data-abrir-modulo]"
        )
        .forEach((boton) => {
            boton.addEventListener(
                "click",
                () => {
                    abrirModulo(
                        boton.dataset
                            .abrirModulo
                    );
                }
            );
        });
}

/*
|--------------------------------------------------------------------------
| Layout
|--------------------------------------------------------------------------
*/

async function construirLayout() {
    const [
        sidebar,
        topbar,
        footer
    ] = await Promise.all([
        loadHTML(
            "components/sidebar.html"
        ),

        loadHTML(
            "components/topbar.html"
        ),

        loadHTML(
            "components/footer.html"
        )
    ]);

    app.innerHTML = `
        <div class="app-container">

            <div id="sidebarContainer">
                ${sidebar}
            </div>

            <div class="main-content">

                <div id="topbarContainer">
                    ${topbar}
                </div>

                <main
                    id="moduleContainer"
                    tabindex="-1"
                ></main>

                <div id="footerContainer">
                    ${footer}
                </div>

            </div>

        </div>
    `;

    const usuario =
        document.getElementById(
            "usuario-logueado"
        );

    if (usuario) {
        usuario.textContent =
            sessionStorage.getItem(
                "usuario"
            ) ||
            localStorage.getItem(
                "usuario"
            ) ||
            "Administrador";
    }

    const btnCerrarSesion =
        document.getElementById(
            "btnCerrarSesion"
        );

    btnCerrarSesion
        ?.addEventListener(
            "click",
            cerrarSesionGlobal
        );

    enlazarNavegacionSidebar();
    aplicarPermisosSidebar();

    layoutConstruido = true;
}

/*
|--------------------------------------------------------------------------
| Abrir módulo
|--------------------------------------------------------------------------
*/

async function abrirModulo(nombre) {
    try {
        const modulo =
            ROUTES[nombre];

        if (!modulo) {
            throw new Error(
                `El módulo "${nombre}" no existe.`
            );
        }

        if (
            modulo.layout &&
            !tieneAccesoAlModulo(nombre)
        ) {
            throw new Error(
                "No tienes permiso para abrir este módulo."
            );
        }

        /*
         * Módulos sin layout:
         * splash y login.
         */
        if (!modulo.layout) {
            layoutConstruido = false;
            moduloActual = nombre;

            await loadModuleFiles(
                app,
                modulo.path,
                modulo.html,
                modulo.css,
                modulo.js
            );

            enlazarAccionesDelModulo(
                app
            );

            return;
        }

        /*
         * Construir layout solo cuando
         * todavía no existe.
         */
        if (!layoutConstruido) {
            await construirLayout();
        }

        const contenedor =
            document.getElementById(
                "moduleContainer"
            );

        if (!contenedor) {
            throw new Error(
                "No se encontró el contenedor principal."
            );
        }

        await loadModuleFiles(
            contenedor,
            modulo.path,
            modulo.html,
            modulo.css,
            modulo.js
        );

        moduloActual = nombre;

        marcarModuloActivo(nombre);

        enlazarAccionesDelModulo(
            contenedor
        );

        contenedor.focus({
            preventScroll: true
        });
    } catch (error) {
        mostrarErrorRouter(error);
    }
}

/*
|--------------------------------------------------------------------------
| Cerrar sesión
|--------------------------------------------------------------------------
*/

function cerrarSesionGlobal() {
    const salir =
        window.confirm(
            "¿Desea cerrar la sesión?"
        );

    if (!salir) {
        return;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("permisos");

    sessionStorage.clear();

    layoutConstruido = false;
    moduloActual = null;

    abrirModulo("login");
}

/*
|--------------------------------------------------------------------------
| Funciones globales necesarias
|--------------------------------------------------------------------------
*/

window.abrirModulo =
    abrirModulo;

window.cerrarSesionGlobal =
    cerrarSesionGlobal;

/*
|--------------------------------------------------------------------------
| Inicio
|--------------------------------------------------------------------------
*/

window.addEventListener(
    "DOMContentLoaded",
    () => {
        abrirModulo("splash");
    }
);