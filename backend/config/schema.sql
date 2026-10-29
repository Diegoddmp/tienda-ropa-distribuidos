-- TIENDA VIRTUAL DE ROPA | Esquema final propuesto
-- PostgreSQL 14+
-- Uso: crear primero la BD tienda_ropa, conectarse a ella y ejecutar este archivo.
-- IMPORTANTE: este script es para una base VACÍA. Para una existente, usar migracion_a_esquema_final.sql.
-- El código Node.js del primer parcial necesitará extensiones para usar usuarios, carrito, etc.
BEGIN;

-- SEGURIDAD (tercer parcial)
CREATE TABLE roles (
    id SMALLSERIAL PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    rol_id SMALLINT NOT NULL REFERENCES roles(id),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL DEFAULT '',
    correo VARCHAR(180) NOT NULL,
    password_hash TEXT NOT NULL,
    telefono VARCHAR(25),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Correos únicos independientemente de mayúsculas/minúsculas.
CREATE UNIQUE INDEX uq_usuarios_correo_insensible ON usuarios (LOWER(correo));

CREATE TABLE direcciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    etiqueta VARCHAR(60) NOT NULL DEFAULT 'Casa',
    destinatario VARCHAR(120) NOT NULL,
    telefono VARCHAR(25),
    provincia VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    direccion TEXT NOT NULL,
    referencia TEXT,
    principal BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_direccion_principal_por_usuario
    ON direcciones(usuario_id) WHERE principal = TRUE;

-- CATÁLOGO (primer parcial)
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion TEXT NOT NULL DEFAULT ''
);

CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id),
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(1000) NOT NULL DEFAULT '',
    precio NUMERIC(10,2) NOT NULL CHECK (precio > 0),
    imagen_url VARCHAR(800),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE variantes_producto (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    talla VARCHAR(12) NOT NULL CHECK (talla IN ('XS','S','M','L','XL','UNICA')),
    color VARCHAR(50) NOT NULL,
    sku VARCHAR(80) UNIQUE,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    UNIQUE (producto_id, talla, color)
);

-- CARRITO PERSISTENTE (mejora progresiva)
-- Durante el primer parcial también se puede usar localStorage como en el prototipo.
CREATE TABLE carritos (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE carrito_detalle (
    id BIGSERIAL PRIMARY KEY,
    carrito_id BIGINT NOT NULL REFERENCES carritos(id) ON DELETE CASCADE,
    variante_id INTEGER NOT NULL REFERENCES variantes_producto(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    UNIQUE (carrito_id, variante_id)
);

-- VENTAS (primer parcial + ampliaciones posteriores)
CREATE TABLE pedidos (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT REFERENCES usuarios(id), -- Nullable para conservar pedidos del primer parcial
    nombre_cliente VARCHAR(100) NOT NULL,      -- Nombre histórico de quien compró
    telefono_contacto VARCHAR(25),
    direccion_entrega TEXT,                     -- Copia de la dirección al comprar
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente','preparando','enviado','entregado','cancelado')),
    fecha_pedido TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE detalle_pedido (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedidos(id),
    variante_id INTEGER NOT NULL REFERENCES variantes_producto(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario > 0),
    nombre_producto VARCHAR(120), -- Instantánea del producto al comprar, opcional para compatibilidad
    talla VARCHAR(12),
    color VARCHAR(50)
);

CREATE TABLE historial_estado_pedido (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES pedidos(id),
    estado_anterior VARCHAR(20),
    estado_nuevo VARCHAR(20) NOT NULL,
    cambiado_por BIGINT REFERENCES usuarios(id),
    observacion TEXT,
    fecha_cambio TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TRAZABILIDAD DEL INVENTARIO
CREATE TABLE movimientos_inventario (
    id BIGSERIAL PRIMARY KEY,
    variante_id INTEGER NOT NULL REFERENCES variantes_producto(id),
    pedido_id BIGINT REFERENCES pedidos(id),
    usuario_id BIGINT REFERENCES usuarios(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('INGRESO','SALIDA','AJUSTE','DEVOLUCION')),
    cantidad_delta INTEGER NOT NULL CHECK (cantidad_delta <> 0),
    stock_anterior INTEGER NOT NULL CHECK (stock_anterior >= 0),
    stock_nuevo INTEGER NOT NULL CHECK (stock_nuevo >= 0),
    motivo TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICACIONES Y OBSERVABILIDAD
CREATE TABLE notificaciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
    pedido_id BIGINT REFERENCES pedidos(id),
    tipo VARCHAR(60) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auditoria_eventos (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT REFERENCES usuarios(id),
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(80) NOT NULL,
    entidad_id BIGINT,
    detalles JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_origen INET,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OPCIONAL/AVANZADO SEGUNDO PARCIAL: patrón transactional outbox para RabbitMQ.
CREATE TABLE eventos_outbox (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    agregado VARCHAR(80) NOT NULL,
    agregado_id BIGINT NOT NULL,
    payload JSONB NOT NULL,
    publicado BOOLEAN NOT NULL DEFAULT FALSE,
    intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos >= 0),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    publicado_en TIMESTAMPTZ
);

-- ÍNDICES DE CONSULTA
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_variantes_producto ON variantes_producto(producto_id);
CREATE INDEX idx_carrito_detalle_carrito ON carrito_detalle(carrito_id);
CREATE INDEX idx_pedidos_usuario_fecha ON pedidos(usuario_id,fecha_pedido DESC);
CREATE INDEX idx_pedidos_estado_fecha ON pedidos(estado,fecha_pedido DESC);
CREATE INDEX idx_detalle_pedido ON detalle_pedido(pedido_id);
CREATE INDEX idx_historial_pedido_fecha ON historial_estado_pedido(pedido_id,fecha_cambio DESC);
CREATE INDEX idx_movimientos_variante_fecha ON movimientos_inventario(variante_id,creado_en DESC);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id,leida,creado_en DESC);
CREATE INDEX idx_auditoria_fecha ON auditoria_eventos(creado_en DESC);
CREATE INDEX idx_outbox_pendiente ON eventos_outbox(id) WHERE publicado = FALSE;

INSERT INTO roles(nombre,descripcion) VALUES
('cliente','Compra y consulta sus pedidos'),
('administrador','Gestiona productos, inventario y pedidos');

COMMIT;
