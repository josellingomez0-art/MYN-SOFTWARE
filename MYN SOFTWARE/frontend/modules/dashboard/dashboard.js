/*=========================================
        MYN SOFTWARE
        DASHBOARD
=========================================*/

cargarDashboard();


function formatoMoneda(valor){

    return new Intl.NumberFormat("es-CO",{
        style:"currency",
        currency:"COP",
        maximumFractionDigits:0
    }).format(valor || 0);

}


async function cargarDashboard(){

    try{

        const datos = await peticion("/dashboard");

        document.getElementById("kpiVentasHoy").textContent =
            formatoMoneda(datos.ventasHoy);

        document.getElementById("kpiProductos").textContent =
            datos.productos;

        document.getElementById("kpiClientes").textContent =
            datos.clientes;

        document.getElementById("kpiStockBajo").textContent =
            datos.stockBajo;

        pintarUltimasVentas(datos.ultimasVentas || []);

        pintarStockBajo(datos.productosStockBajo || []);

    }catch(error){

        console.error("Error al cargar el dashboard:", error);

    }

}


function pintarUltimasVentas(ventas){

    const tabla = document.getElementById("tablaUltimasVentas");

    if(ventas.length === 0){

        tabla.innerHTML = `<tr><td colspan="3">Sin ventas registradas</td></tr>`;
        return;

    }

    tabla.innerHTML = ventas.map(v => `
        <tr>
            <td>FV${String(v.id).padStart(3,"0")}</td>
            <td>${v.cliente && v.cliente.trim() ? v.cliente : "Cliente General"}</td>
            <td>${formatoMoneda(v.total)}</td>
        </tr>
    `).join("");

}


function pintarStockBajo(productos){

    const tabla = document.getElementById("tablaStockBajo");

    if(productos.length === 0){

        tabla.innerHTML = `<tr><td colspan="2">Sin productos con stock bajo</td></tr>`;
        return;

    }

    tabla.innerHTML = productos.map(p => `
        <tr>
            <td>${p.nombre}</td>
            <td>${p.stock_actual}</td>
        </tr>
    `).join("");

}

