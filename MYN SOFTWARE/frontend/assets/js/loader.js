/**
 * ==========================================================
 * MYN SOFTWARE
 * Cargador dinámico de módulos
 * ==========================================================
 */

let currentCss = null;
let currentScript = null;

async function loadHTML(path) {
    const response = await fetch(
        `${path}?v=${Date.now()}`,
        {
            cache: "no-store"
        }
    );

    if (!response.ok) {
        throw new Error(
            `No se pudo cargar ${path} (${response.status})`
        );
    }

    return await response.text();
}

function loadCSS(path) {
    return new Promise(
        (resolve, reject) => {
            if (currentCss) {
                currentCss.remove();
                currentCss = null;
            }

            const nuevoCss =
                document.createElement("link");

            nuevoCss.rel = "stylesheet";

            nuevoCss.href =
                `${path}?v=${Date.now()}`;

            nuevoCss.onload = () => {
                currentCss = nuevoCss;
                resolve();
            };

            nuevoCss.onerror = () => {
                nuevoCss.remove();

                reject(
                    new Error(
                        `No se pudo cargar el CSS: ${path}`
                    )
                );
            };

            document.head.appendChild(
                nuevoCss
            );
        }
    );
}

function loadJS(path) {
    return new Promise(
        (resolve, reject) => {
            if (currentScript) {
                currentScript.remove();
                currentScript = null;
            }

            const nuevoScript =
                document.createElement("script");

            nuevoScript.src =
                `${path}?v=${Date.now()}`;

            nuevoScript.async = false;

            nuevoScript.onload = () => {
                currentScript =
                    nuevoScript;

                resolve();
            };

            nuevoScript.onerror = () => {
                nuevoScript.remove();

                reject(
                    new Error(
                        `No se pudo cargar el JavaScript: ${path}`
                    )
                );
            };

            document.body.appendChild(
                nuevoScript
            );
        }
    );
}

function clearContainer(container) {
    if (!container) {
        throw new Error(
            "No existe el contenedor del módulo"
        );
    }

    container.replaceChildren();
}

async function loadModuleFiles(
    container,
    modulePath,
    htmlFile = "index.html",
    cssFile = null,
    jsFile = null
) {
    clearContainer(container);

    const htmlPath =
        `${modulePath}/${htmlFile}`;

    const html =
        await loadHTML(htmlPath);

    container.innerHTML = html;

    if (cssFile) {
        await loadCSS(
            `${modulePath}/${cssFile}`
        );
    }

    if (jsFile) {
        await loadJS(
            `${modulePath}/${jsFile}`
        );
    }
}