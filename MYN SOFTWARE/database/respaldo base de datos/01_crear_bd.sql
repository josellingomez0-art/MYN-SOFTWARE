/*============================================================
    MYN SOFTWARE
    Sistema POS + Inventario
    Base de Datos Oficial
    Versión 1.0
    Motor: MySQL 8
=============================================================*/

DROP DATABASE IF EXISTS mynsoftware;

CREATE DATABASE mynsoftware
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE mynsoftware;

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    estado BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permisos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    estado BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE rol_permiso (

    id INT AUTO_INCREMENT PRIMARY KEY,

    id_rol INT NOT NULL,

    id_permiso INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rp_rol
        FOREIGN KEY(id_rol)
        REFERENCES roles(id),

    CONSTRAINT fk_rp_permiso
        FOREIGN KEY(id_permiso)
        REFERENCES permisos(id)

) ENGINE=InnoDB;

CREATE TABLE usuarios (

    id INT AUTO_INCREMENT PRIMARY KEY,

    id_rol INT NOT NULL,

    nombres VARCHAR(100) NOT NULL,

    apellidos VARCHAR(100) NOT NULL,

    documento VARCHAR(30) UNIQUE,

    telefono VARCHAR(30),

    correo VARCHAR(120) UNIQUE,

    password VARCHAR(255) NOT NULL,

    foto VARCHAR(255),

    estado BOOLEAN DEFAULT TRUE,

    ultimo_login DATETIME,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_usuario_rol
        FOREIGN KEY(id_rol)
        REFERENCES roles(id)

) ENGINE=InnoDB;

/*============================================================
TABLA CATEGORIAS
============================================================*/

CREATE TABLE categorias (

    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL UNIQUE,

    descripcion VARCHAR(255),

    estado BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

) ENGINE=InnoDB;


/*============================================================
TABLA PROVEEDORES
============================================================*/

CREATE TABLE proveedores (

    id INT AUTO_INCREMENT PRIMARY KEY,

    nit VARCHAR(30) UNIQUE,

    razon_social VARCHAR(150) NOT NULL,

    contacto VARCHAR(100),

    telefono VARCHAR(30),

    correo VARCHAR(120),

    direccion VARCHAR(200),

    ciudad VARCHAR(100),

    estado BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

) ENGINE=InnoDB;


/*============================================================
TABLA PRODUCTOS
============================================================*/

CREATE TABLE productos (

    id INT AUTO_INCREMENT PRIMARY KEY,

    id_categoria INT NOT NULL,

    id_proveedor INT,

    codigo VARCHAR(50) NOT NULL UNIQUE,

    nombre VARCHAR(150) NOT NULL,

    descripcion TEXT,

    marca VARCHAR(100),

    unidad_medida VARCHAR(30),

    costo DECIMAL(12,2) NOT NULL,

    precio DECIMAL(12,2) NOT NULL,

    iva DECIMAL(5,2) DEFAULT 19,

    stock_minimo INT DEFAULT 5,

    imagen VARCHAR(255),

    estado BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_producto_categoria
        FOREIGN KEY(id_categoria)
        REFERENCES categorias(id),

    CONSTRAINT fk_producto_proveedor
        FOREIGN KEY(id_proveedor)
        REFERENCES proveedores(id)

) ENGINE=InnoDB;


/*============================================================
TABLA INVENTARIO
============================================================*/

CREATE TABLE inventario (

    id INT AUTO_INCREMENT PRIMARY KEY,

    id_producto INT NOT NULL UNIQUE,

    stock_actual INT DEFAULT 0,

    stock_reservado INT DEFAULT 0,

    ubicacion VARCHAR(100),

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_inventario_producto
        FOREIGN KEY(id_producto)
        REFERENCES productos(id)

) ENGINE=InnoDB;

/*============================================================
TABLA CLIENTES
============================================================*/

CREATE TABLE clientes (

    id INT AUTO_INCREMENT PRIMARY KEY,

    tipo_documento VARCHAR(10) DEFAULT 'CC',

    documento VARCHAR(30) UNIQUE,

    nombres VARCHAR(100) NOT NULL,

    apellidos VARCHAR(100),

    telefono VARCHAR(30),

    correo VARCHAR(120),

    direccion VARCHAR(200),

    ciudad VARCHAR(100),

    estado BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

) ENGINE=InnoDB;


/*============================================================
TABLA COMPRAS
============================================================*/

CREATE TABLE compras (

    id INT AUTO_INCREMENT PRIMARY KEY,

    id_proveedor INT NOT NULL,

    id_usuario INT NOT NULL,

    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,

    subtotal DECIMAL(12,2),

    iva DECIMAL(12,2),

    total DECIMAL(12,2),

    estado VARCHAR(30) DEFAULT 'FINALIZADA',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_compra_proveedor
        FOREIGN KEY(id_proveedor)
        REFERENCES proveedores(id),

    CONSTRAINT fk_compra_usuario
        FOREIGN KEY(id_usuario)
        REFERENCES usuarios(id)

) ENGINE=InnoDB;


/*============================================================
TABLA DETALLE_COMPRAS
============================================================*/

CREATE TABLE detalle_compras (

    id INT AUTO_INCREMENT PRIMARY KEY,

    id_compra INT NOT NULL,

    id_producto INT NOT NULL,

    cantidad INT NOT NULL,

    costo DECIMAL(12,2),

    subtotal DECIMAL(12,2),

    CONSTRAINT fk_detalle_compra
        FOREIGN KEY(id_compra)
        REFERENCES compras(id),

    CONSTRAINT fk_detalle_producto_compra
        FOREIGN KEY(id_producto)
        REFERENCES productos(id)

) ENGINE=InnoDB;


/*============================================================
TABLA VENTAS
============================================================*/

CREATE TABLE ventas (

    id INT AUTO_INCREMENT PRIMARY KEY,

    id_cliente INT,

    id_usuario INT NOT NULL,

    id_metodo_pago INT,

    id_turno INT,

    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,

    subtotal DECIMAL(12,2),

    iva DECIMAL(12,2),

    descuento DECIMAL(12,2) DEFAULT 0,

    total DECIMAL(12,2),

    estado VARCHAR(30) DEFAULT 'PAGADA',

    id_usuario_anula INT,

    fecha_anulacion DATETIME,

    motivo_anulacion VARCHAR(200),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_venta_cliente
        FOREIGN KEY(id_cliente)
        REFERENCES clientes(id),

    CONSTRAINT fk_venta_usuario
        FOREIGN KEY(id_usuario)
        REFERENCES usuarios(id),

    CONSTRAINT fk_venta_usuario_anula
        FOREIGN KEY(id_usuario_anula)
        REFERENCES usuarios(id)

) ENGINE=InnoDB;


/*============================================================
TABLA DETALLE_VENTAS
============================================================*/

CREATE TABLE detalle_ventas (

    id INT AUTO_INCREMENT PRIMARY KEY,

    id_venta INT NOT NULL,

    id_producto INT NOT NULL,

    cantidad INT NOT NULL,

    precio DECIMAL(12,2),

    descuento DECIMAL(12,2),

    subtotal DECIMAL(12,2),

    CONSTRAINT fk_detalle_venta
        FOREIGN KEY(id_venta)
        REFERENCES ventas(id),

    CONSTRAINT fk_detalle_producto
        FOREIGN KEY(id_producto)
        REFERENCES productos(id)

) ENGINE=InnoDB;

/*============================================================
TABLA METODOS_PAGO
============================================================*/

CREATE TABLE metodos_pago (

    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(50) NOT NULL UNIQUE,

    descripcion VARCHAR(150),

    estado BOOLEAN DEFAULT TRUE

) ENGINE=InnoDB;


/*============================================================
TABLA CAJAS
============================================================*/

CREATE TABLE cajas (

    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL,

    descripcion VARCHAR(200),

    estado BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB;


/*============================================================
TABLA TURNOS_CAJA
(cada apertura y cierre de una caja física; el arqueo se hace
por turno, no por caja)
============================================================*/

CREATE TABLE turnos_caja (

    id INT AUTO_INCREMENT PRIMARY KEY,

    id_caja INT NOT NULL,

    id_usuario_apertura INT NOT NULL,

    id_usuario_cierre INT,

    monto_inicial DECIMAL(12,2) NOT NULL DEFAULT 0,

    monto_final_sistema DECIMAL(12,2),

    monto_final_real DECIMAL(12,2),

    diferencia DECIMAL(12,2),

    fecha_apertura DATETIME DEFAULT CURRENT_TIMESTAMP,

    fecha_cierre DATETIME,

    estado ENUM('ABIERTA','CERRADA') DEFAULT 'ABIERTA',

    CONSTRAINT fk_turno_caja
        FOREIGN KEY(id_caja)
        REFERENCES cajas(id),

    CONSTRAINT fk_turno_usuario_apertura
        FOREIGN KEY(id_usuario_apertura)
        REFERENCES usuarios(id),

    CONSTRAINT fk_turno_usuario_cierre
        FOREIGN KEY(id_usuario_cierre)
        REFERENCES usuarios(id)

) ENGINE=InnoDB;


/*============================================================
TABLA MOVIMIENTOS_CAJA
============================================================*/

CREATE TABLE movimientos_caja (

    id INT AUTO_INCREMENT PRIMARY KEY,

    id_caja INT NOT NULL,

    id_turno INT NOT NULL,

    id_usuario INT NOT NULL,

    tipo ENUM('INGRESO','EGRESO') NOT NULL,

    concepto VARCHAR(200),

    valor DECIMAL(12,2) NOT NULL,

    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mov_caja
        FOREIGN KEY(id_caja)
        REFERENCES cajas(id),

    CONSTRAINT fk_mov_turno
        FOREIGN KEY(id_turno)
        REFERENCES turnos_caja(id),

    CONSTRAINT fk_mov_usuario
        FOREIGN KEY(id_usuario)
        REFERENCES usuarios(id)

) ENGINE=InnoDB;


/*============================================================
TABLA EMPRESA
============================================================*/

CREATE TABLE empresa (

    id INT AUTO_INCREMENT PRIMARY KEY,

    nit VARCHAR(30),

    nombre VARCHAR(150),

    propietario VARCHAR(150),

    direccion VARCHAR(200),

    telefono VARCHAR(30),

    correo VARCHAR(120),

    ciudad VARCHAR(100),

    logo VARCHAR(255)

) ENGINE=InnoDB;


/*============================================================
TABLA CONFIGURACION
============================================================*/

CREATE TABLE configuracion (

    id INT AUTO_INCREMENT PRIMARY KEY,

    iva DECIMAL(5,2) DEFAULT 19,

    moneda VARCHAR(20) DEFAULT 'COP',

    simbolo VARCHAR(5) DEFAULT '$',

    impresora VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB;


/*============================================================
TABLA AUDITORIA
============================================================*/

CREATE TABLE auditoria (

    id INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT,

    accion VARCHAR(200),

    tabla VARCHAR(100),

    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,

    ip VARCHAR(50),

    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY(id_usuario)
        REFERENCES usuarios(id)

) ENGINE=InnoDB;


/*============================================================
TABLA SESIONES
============================================================*/

CREATE TABLE sesiones (

    id INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    token TEXT NOT NULL,

    inicio DATETIME DEFAULT CURRENT_TIMESTAMP,

    expiracion DATETIME,

    activa BOOLEAN DEFAULT TRUE,

    CONSTRAINT fk_sesion_usuario
        FOREIGN KEY(id_usuario)
        REFERENCES usuarios(id)

) ENGINE=InnoDB;

/*============================================================
ÍNDICES
============================================================*/

CREATE INDEX idx_usuario_documento ON usuarios(documento);
CREATE INDEX idx_usuario_correo ON usuarios(correo);

CREATE INDEX idx_producto_nombre ON productos(nombre);
CREATE INDEX idx_producto_codigo ON productos(codigo);

CREATE INDEX idx_cliente_documento ON clientes(documento);

CREATE INDEX idx_proveedor_nit ON proveedores(nit);

CREATE INDEX idx_venta_fecha ON ventas(fecha);

ALTER TABLE ventas
    ADD CONSTRAINT fk_venta_metodo_pago
        FOREIGN KEY(id_metodo_pago) REFERENCES metodos_pago(id),
    ADD CONSTRAINT fk_venta_turno
        FOREIGN KEY(id_turno) REFERENCES turnos_caja(id);

CREATE INDEX idx_compra_fecha ON compras(fecha);

CREATE INDEX idx_movimiento_fecha ON movimientos_caja(fecha);



/*============================================================
DATOS INICIALES
============================================================*/

INSERT INTO roles(nombre,descripcion) VALUES
('Administrador','Acceso total al sistema'),
('Supervisor','Supervisa operaciones'),
('Cajero','Realiza ventas'),
('Bodega','Controla inventario');



/*============================================================
CATÁLOGO DE PERMISOS
============================================================*/

INSERT INTO permisos(nombre,descripcion) VALUES
('dashboard.ver','Ver el panel principal'),
('reportes.ver','Ver reportes de ventas y compras'),
('productos.ver','Ver el catálogo de productos'),
('productos.gestionar','Crear, editar y eliminar productos y categorías'),
('inventario.ver','Ver el inventario'),
('inventario.ajustar','Ajustar manualmente el stock'),
('clientes.ver','Ver clientes'),
('clientes.gestionar','Crear, editar y eliminar clientes'),
('proveedores.ver','Ver proveedores'),
('proveedores.gestionar','Crear, editar y eliminar proveedores'),
('compras.ver','Ver compras registradas'),
('compras.crear','Registrar compras a proveedores'),
('ventas.ver','Ver ventas registradas'),
('ventas.crear','Registrar ventas en el punto de venta'),
('ventas.anular','Anular una venta ya registrada'),
('caja.operar','Abrir turno de caja y registrar movimientos'),
('caja.cerrar','Cerrar el turno de caja (arqueo)'),
('usuarios.ver','Ver empleados del sistema'),
('usuarios.gestionar','Crear, editar y eliminar empleados'),
('roles.gestionar','Asignar permisos a los roles'),
('configuracion.editar','Editar los datos de la empresa y los parámetros del sistema');



/*============================================================
ASIGNACIÓN DE PERMISOS POR ROL (valores por defecto)
Se puede modificar después desde el módulo Roles y Permisos.
============================================================*/

-- Administrador: todos los permisos
INSERT INTO rol_permiso(id_rol, id_permiso)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Administrador';

-- Supervisor: todo menos gestionar usuarios, roles y configuración
INSERT INTO rol_permiso(id_rol, id_permiso)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Supervisor'
AND p.nombre IN (
    'dashboard.ver','reportes.ver',
    'productos.ver','productos.gestionar',
    'inventario.ver','inventario.ajustar',
    'clientes.ver','clientes.gestionar',
    'proveedores.ver','proveedores.gestionar',
    'compras.ver','compras.crear',
    'ventas.ver','ventas.crear','ventas.anular',
    'caja.operar','caja.cerrar',
    'usuarios.ver'
);

-- Cajero: solo lo necesario para vender y manejar su caja
INSERT INTO rol_permiso(id_rol, id_permiso)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Cajero'
AND p.nombre IN (
    'dashboard.ver',
    'productos.ver',
    'inventario.ver',
    'clientes.ver','clientes.gestionar',
    'ventas.ver','ventas.crear',
    'caja.operar','caja.cerrar'
);

-- Bodega: productos, inventario, proveedores y compras
INSERT INTO rol_permiso(id_rol, id_permiso)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Bodega'
AND p.nombre IN (
    'dashboard.ver',
    'productos.ver','productos.gestionar',
    'inventario.ver','inventario.ajustar',
    'proveedores.ver','proveedores.gestionar',
    'compras.ver','compras.crear'
);



INSERT INTO metodos_pago(nombre,descripcion) VALUES
('Efectivo','Pago en efectivo'),
('Nequi','Pago por Nequi'),
('Daviplata','Pago por Daviplata'),
('Transferencia','Transferencia bancaria'),
('Tarjeta Débito','Pago con tarjeta débito'),
('Tarjeta Crédito','Pago con tarjeta crédito');



INSERT INTO cajas(nombre,descripcion)
VALUES('Caja Principal','Caja principal del sistema');



INSERT INTO configuracion(
iva,
moneda,
simbolo
)
VALUES(
19,
'COP',
'$'
);



INSERT INTO empresa(
nit,
nombre,
propietario,
ciudad
)
VALUES(
'900000000',
'MYN SOFTWARE',
'Administrador',
'Bogotá'
);

