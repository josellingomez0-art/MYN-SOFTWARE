require("dotenv").config();

const app = require("./app");
const pool = require("./src/config/database");

const PORT = process.env.PORT || 8080;

async function iniciarServidor() {
    try {
        const conexion = await pool.getConnection();
        conexion.release();

        console.log("=======================================");
        console.log("        MYN SOFTWARE API");
        console.log("=======================================");
        console.log("✅ Base de datos conectada correctamente");
        console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🌐 Servidor escuchando en 0.0.0.0:${PORT}`);
        });

    } catch (error) {
        console.error("❌ Error al conectar con MySQL");
        console.error(error);

        process.exit(1);
    }
}

iniciarServidor();
