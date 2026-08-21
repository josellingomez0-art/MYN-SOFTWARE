const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

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

// =====================================================
// MIDDLEWARES GENERALES
// =====================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================================
// CONFIGURACIÓN DEL FRONTEND
// =====================================================

// Buscar automáticamente la carpeta frontend
// según la ubicación donde Railway ejecute la aplicación.

const posiblesRutasFrontend = [
    path.resolve(__dirname, "../frontend"),
    path.resolve(process.cwd(), "frontend"),
    "/app/frontend",
    "/frontend"
];

const frontendPath = posiblesRutasFrontend.find((ruta) =>
    fs.existsSync(path.join(ruta, "index.html"))
);

console.log("=======================================");
console.log("       CONFIGURACIÓN DEL FRONTEND");
console.log("=======================================");
console.log("📁 Rutas frontend revisadas:");
console.log(posiblesRutasFrontend);
console.log("📁 Frontend seleccionado:", frontendPath);

if (!frontendPath) {
    console.error("❌ NO SE ENCONTRÓ frontend/index.html");
} else {
    console.log("✅ FRONTEND ENCONTRADO:", frontendPath);

    // Servir archivos estáticos del frontend
    app.use(express.static(frontendPath));
}

// =====================================================
// RUTA PÚBLICA DE AUTENTICACIÓN
// =====================================================

app.use("/api/auth", authRoutes);

// =====================================================
// RUTAS PROTEGIDAS
// =====================================================

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

app.use("/api/reportes", verificarToken, reportesRoutes);

// =====================================================
// PÁGINA PRINCIPAL DEL SISTEMA
// =====================================================

app.get("/", (req, res) => {

    if (!frontendPath) {
        return res.status(500).json({
            ok: false,
            mensaje: "No se encontró el frontend/index.html"
        });
    }

    return res.sendFile(path.join(frontendPath, "index.html"));
});

// =====================================================
// RUTA DE RESPALDO PARA EL FRONTEND
// Compatible con Express 5
// =====================================================

app.get(/.*/, (req, res, next) => {

    // No interferir con las rutas de la API
    if (req.path.startsWith("/api/")) {
        return next();
    }

    if (!frontendPath) {
        return res.status(500).json({
            ok: false,
            mensaje: "No se encontró el frontend/index.html"
        });
    }

    return res.sendFile(path.join(frontendPath, "index.html"));
});

// =====================================================
// MANEJO DE RUTAS API INEXISTENTES
// =====================================================

app.use("/api", (req, res) => {

    return res.status(404).json({
        ok: false,
        mensaje: "Ruta de API no encontrada"
    });

});

// =====================================================
// MANEJO GLOBAL DE ERRORES
// =====================================================

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

// =====================================================
// EXPORTAR APLICACIÓN
// =====================================================

module.exports = app;
