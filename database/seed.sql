
-- DATOS INICIALES PARA TIENDA VIRTUAL DE ROPA
-- Ejecutar después de schema_final.sql

INSERT INTO categorias (nombre, descripcion)
VALUES
('Camisetas', 'Camisetas deportivas y casuales'),
('Pantalones', 'Jeans y pantalones de vestir'),
('Chaquetas', 'Chaquetas, abrigos y chompas'),
('Vestidos', 'Vestidos casuales y elegantes'),
('Accesorios', 'Accesorios de moda'),
('Calzado', 'Zapatos y zapatillas'),
('Ropa deportiva', 'Ropa para hacer deporte'),
('Sudaderas', 'Sudaderas y hoodies')
ON CONFLICT (nombre) DO NOTHING;
