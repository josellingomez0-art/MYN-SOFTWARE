const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// ...

const frontendPath = "/app/frontend";

console.log("📁 FRONTEND PATH:", frontendPath);
console.log(
    "📄 INDEX EXISTE:",
    fs.existsSync(path.join(frontendPath, "index.html"))
);

const usuariosRoutes = require("./src/routes/usuarios.routes");
const clientesRoutes = require("./src/routes/clientes.routes");
const productosRoutes = require("./src/routes/productos.routes");
const categoriasRoutes = require("./src/routes/categorias.routes");
const proveedoresRoutes = require("./src/routes/proveedores.routes");
const comprasRoutes = require("./src/routes/compras.routes");
const ventasRoutes = require("./src/routes/ventas.routes");
const dashboardRoutes = require("./src/routes/dashboard.routes");
const authRoutes = require("./src/auth/auth.routes");
const inventarioRoutes = require("./src/routes/inventario.routes");
const rolesRoutes = require("./src/routes/roles.routes");
const empresaRoutes = require("./src/routes/empresa.routes");
const configuracionRoutes = require("./src/routes/configuracion.routes");
const cajaRoutes = require("./src/routes/caja.routes");
const metodosPagoRoutes = require("./src/routes/metodosPago.routes");
const permisosRoutes = require("./src/routes/permisos.routes");
const reportesRoutes = require("./src/routes/reportes.routes");

const { verificarToken } = require("./src/middleware/auth.middleware");

const app = express();

// Middlewares generales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta absoluta de la carpeta frontend
const posiblesRutasFrontend = [
    path.resolve(__dirname, "../frontend"),
    path.resolve(process.cwd(), "frontend"),
    path.resolve("/app/frontend")
];

const frontendPath = posiblesRutasFrontend.find(ruta =>
    fs.existsSync(path.join(ruta, "index.html"))
);

if (!frontendPath) {
    console.error("❌ No se encontró frontend/index.html");
    console.error("Rutas revisadas:", posiblesRutasFrontend);
} else {
    console.log("✅ Frontend encontrado en:", frontendPath);
}

console.log("📁 __dirname:", __dirname);
console.log("📁 frontendPath:", frontendPath);
console.log("📄 index.html:", path.join(frontendPath, "index.html"));
console.log("📂 existe frontend:", require("fs").existsSync(frontendPath));
console.log("📄 existe index.html:", require("fs").existsSync(path.join(frontendPath, "index.html")));
console.log("📦 CONTENIDO RAÍZ:", require("fs").readdirSync("/"));

// Servir archivos estáticos del frontend
app.use(express.static(frontendPath));

// Ruta pública de autenticación
app.use("/api/auth", authRoutes);

// Rutas protegidas
app.use("/api/usuarios", verificarToken, usuariosRoutes);
app.use("/api/clientes", verificarToken, clientesRoutes);
app.use("/api/productos", verificarToken, productosRoutes);
app.use("/api/categorias", verificarToken, categoriasRoutes);
app.use("/api/proveedores", verificarToken, proveedoresRoutes);
app.use("/api/compras", verificarToken, comprasRoutes);
app.use("/api/ventas", verificarToken, ventasRoutes);
app.use("/api/dashboard", verificarToken, dashboardRoutes);
app.use("/api/inventario", verificarToken, inventarioRoutes);
app.use("/api/roles", verificarToken, rolesRoutes);
app.use("/api/empresa", verificarToken, empresaRoutes);
app.use("/api/configuracion", verificarToken, configuracionRoutes);
app.use("/api/caja", verificarToken, cajaRoutes);
app.use("/api/metodos-pago", verificarToken, metodosPagoRoutes);
app.use("/api/permisos", verificarToken, permisosRoutes);
app.use( "/api/reportes",verificarToken,reportesRoutes);

// Página principal del sistema
app.get("/", (req, res) => {
    return res.sendFile(path.join(frontendPath, "index.html"));
});

// Ruta de respaldo para el frontend.
// Compatible con Express 5: se usa una expresión regular en lugar de "*".
app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api/")) {
        return next();
    }

    return res.sendFile(path.join(frontendPath, "index.html"));
});

// Manejo de rutas API inexistentes
app.use("/api", (req, res) => {
    return res.status(404).json({
        ok: false,
        mensaje: "Ruta de API no encontrada"
    });
});

// Manejo global de errores
app.use((error, req, res, next) => {
    console.error("Error no controlado:", error);

    if (res.headersSent) {
        return next(error);
    }

    return res.status(error.status || 500).json({
        ok: false,
        mensaje: error.message || "Error interno del servidor"
    });
});

module.exports = app;
