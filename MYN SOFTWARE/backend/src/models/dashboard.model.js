const pool = require("../config/database");

async function obtenerDashboard() {

    const [[productos]] = await pool.query(
        "SELECT COUNT(*) total FROM productos"
    );

    const [[clientes]] = await pool.query(
        "SELECT COUNT(*) total FROM clientes"
    );

    const [[proveedores]] = await pool.query(
        "SELECT COUNT(*) total FROM proveedores"
    );

    const [[ventasHoy]] = await pool.query(`
        SELECT
            IFNULL(SUM(total),0) total
        FROM ventas
        WHERE DATE(fecha)=CURDATE()
    `);

    const [[comprasHoy]] = await pool.query(`
        SELECT
            IFNULL(SUM(total),0) total
        FROM compras
        WHERE DATE(fecha)=CURDATE()
    `);

    const [[stockBajo]] = await pool.query(`
        SELECT COUNT(*) total
        FROM productos p
        INNER JOIN inventario i ON i.id_producto = p.id
        WHERE i.stock_actual <= p.stock_minimo
    `);

    const [ultimasVentas] = await pool.query(`
        SELECT
            v.id,
            CONCAT(c.nombres, ' ', IFNULL(c.apellidos,'')) AS cliente,
            v.total
        FROM ventas v
        LEFT JOIN clientes c ON v.id_cliente = c.id
        ORDER BY v.fecha DESC
        LIMIT 5
    `);

    const [productosStockBajo] = await pool.query(`
        SELECT
            p.nombre,
            i.stock_actual
        FROM productos p
        INNER JOIN inventario i ON i.id_producto = p.id
        WHERE i.stock_actual <= p.stock_minimo
        ORDER BY i.stock_actual ASC
        LIMIT 5
    `);

    return {

        productos: productos.total,

        clientes: clientes.total,

        proveedores: proveedores.total,

        ventasHoy: ventasHoy.total,

        comprasHoy: comprasHoy.total,

        stockBajo: stockBajo.total,

        ultimasVentas,

        productosStockBajo

    };

}

module.exports = {

    obtenerDashboard

};