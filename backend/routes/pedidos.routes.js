
const express = require('express');
const router = express.Router();

const { pool } = require('../config/db');

// Función para devolver errores controlados
function errorHttp(estado, mensaje) {
    const error = new Error(mensaje);
    error.estado = estado;
    return error;
}

// Convertir un precio NUMERIC de PostgreSQL a centavos
function convertirCentavos(precio) {
    const partes = String(precio).split('.');
    const entero = partes[0];
    const decimal = (partes[1] || '').padEnd(2, '0');

    return Number(entero) * 100 + Number(decimal);
}

// ============================================
// GET: LISTAR TODOS LOS PEDIDOS
// ============================================
router.get('/', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                id,
                nombre_cliente,
                total,
                estado,
                fecha_pedido
            FROM pedidos
            ORDER BY id DESC
        `);

        res.status(200).json(resultado.rows);

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            mensaje: 'Error al listar pedidos'
        });
    }
});

// ============================================
// GET: CONSULTAR PEDIDO POR ID
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                mensaje: 'ID inválido'
            });
        }

        const pedido = await pool.query(
            'SELECT * FROM pedidos WHERE id = $1',
            [id]
        );

        if (pedido.rowCount === 0) {
            return res.status(404).json({
                mensaje: 'Pedido no encontrado'
            });
        }

        const detalles = await pool.query(
            `SELECT
                id,
                variante_id,
                nombre_producto,
                talla,
                color,
                cantidad,
                precio_unitario
             FROM detalle_pedido
             WHERE pedido_id = $1
             ORDER BY id`,
            [id]
        );

        res.status(200).json({
            pedido: pedido.rows[0],
            detalles: detalles.rows
        });

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            mensaje: 'Error al consultar pedido'
        });
    }
});

// ============================================
// POST: REGISTRAR UNA COMPRA
// ============================================
router.post('/', async (req, res) => {

    const { nombre_cliente, items } = req.body;

    // Validar nombre del cliente
    if (typeof nombre_cliente !== 'string' ||
        !nombre_cliente.trim() ||
        nombre_cliente.trim().length > 100) {
        return res.status(400).json({
            mensaje: 'Nombre del cliente inválido'
        });
    }

    // Validar lista de productos
    if (!Array.isArray(items) ||
        items.length === 0 ||
        items.length > 25) {
        return res.status(400).json({
            mensaje: 'Debe incluir entre 1 y 25 productos'
        });
    }

    // Validar variantes y cantidades
    const ids = new Set();

    for (const item of items) {

        if (!item ||
            !Number.isInteger(item.variante_id) ||
            item.variante_id <= 0 ||
            !Number.isInteger(item.cantidad) ||
            item.cantidad <= 0 ||
            item.cantidad > 1000) {

            return res.status(400).json({
                mensaje: 'Datos de productos inválidos'
            });
        }

        if (ids.has(item.variante_id)) {
            return res.status(400).json({
                mensaje: 'No repitas una variante en el pedido'
            });
        }

        ids.add(item.variante_id);
    }

    let cliente;

    try {

        cliente = await pool.connect();

        // INICIAR TRANSACCIÓN
        await cliente.query('BEGIN');

        // Consultar variantes bloqueando sus filas.
        // Evita compras simultáneas de la misma unidad.
        const variantes = await cliente.query(
            `SELECT
                v.id,
                v.stock,
                v.talla,
                v.color,
                p.nombre,
                p.precio
             FROM variantes_producto v
             INNER JOIN productos p
                ON p.id = v.producto_id
             WHERE v.id = ANY($1::integer[])
               AND p.activo = TRUE
             ORDER BY v.id
             FOR UPDATE OF v`,
            [[...ids].sort((a, b) => a - b)]
        );

        if (variantes.rowCount !== items.length) {
            throw errorHttp(
                404,
                'Uno o más productos no existen'
            );
        }

        const datos = new Map(
            variantes.rows.map(v => [v.id, v])
        );

        let totalCentavos = 0;

        // Verificar stock y calcular total
        for (const item of items) {

            const variante = datos.get(item.variante_id);

            if (variante.stock < item.cantidad) {
                throw errorHttp(
                    409,
                    `Stock insuficiente para ${variante.nombre}, talla ${variante.talla}`
                );
            }

            totalCentavos +=
                convertirCentavos(variante.precio) *
                item.cantidad;
        }

        // Verificar capacidad del NUMERIC(10,2)
        if (totalCentavos > 9999999999) {
            throw errorHttp(
                400,
                'El total del pedido es demasiado grande'
            );
        }

        const total = (totalCentavos / 100).toFixed(2);

        // Registrar el pedido
        const resultadoPedido = await cliente.query(
            `INSERT INTO pedidos
                (nombre_cliente, total, estado)
             VALUES ($1, $2, 'pendiente')
             RETURNING *`,
            [nombre_cliente.trim(), total]
        );

        const pedido = resultadoPedido.rows[0];
        const detalles = [];

        // Registrar cada prenda comprada
        for (const item of items) {

            const variante = datos.get(item.variante_id);

            const stockAnterior = variante.stock;
            const stockNuevo = stockAnterior - item.cantidad;

            // Descontar inventario
            await cliente.query(
                `UPDATE variantes_producto
                 SET stock = $1
                 WHERE id = $2`,
                [stockNuevo, variante.id]
            );

            // Registrar detalle del pedido
            const detalle = await cliente.query(
                `INSERT INTO detalle_pedido
                 (pedido_id, variante_id, cantidad,
                  precio_unitario, nombre_producto,
                  talla, color)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [
                    pedido.id,
                    variante.id,
                    item.cantidad,
                    variante.precio,
                    variante.nombre,
                    variante.talla,
                    variante.color
                ]
            );

            detalles.push(detalle.rows[0]);

            // Registrar movimiento del inventario
            await cliente.query(
                `INSERT INTO movimientos_inventario
                 (variante_id, pedido_id, tipo,
                  cantidad_delta, stock_anterior,
                  stock_nuevo, motivo)
                 VALUES ($1, $2, 'SALIDA', $3, $4, $5, $6)`,
                [
                    variante.id,
                    pedido.id,
                    -item.cantidad,
                    stockAnterior,
                    stockNuevo,
                    'Venta de producto'
                ]
            );
        }

        // Guardar todos los cambios
        await cliente.query('COMMIT');

        res.status(201).json({
            mensaje: 'Pedido registrado correctamente',
            pedido,
            detalles
        });

    } catch (error) {

        // Deshacer cambios si algo falla
        if (cliente) {
            await cliente.query('ROLLBACK')
                .catch(console.error);
        }

        console.error(error.message);

        res.status(error.estado || 500).json({
            mensaje: error.estado
                ? error.message
                : 'Error al registrar pedido'
        });

    } finally {

        // Liberar la conexión
        if (cliente) {
            cliente.release();
        }
    }
});

module.exports = router;
