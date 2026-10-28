
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET: Consultar inventario de un producto
router.get('/producto/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(`
            SELECT
                v.id AS variante_id,
                p.nombre AS producto,
                v.talla,
                v.color,
                v.stock
            FROM variantes_producto v
            INNER JOIN productos p
                ON v.producto_id = p.id
            WHERE p.id = $1
            ORDER BY v.id
        `, [id]);

        res.status(200).json(resultado.rows);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            mensaje: 'Error al consultar inventario'
        });
    }
});

// PATCH: Actualizar stock de una variante
router.patch('/variante/:id', async (req, res) => {
    const { id } = req.params;
    const { stock, motivo } = req.body;

    if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
        return res.status(400).json({
            mensaje: 'ID de variante inválido'
        });
    }

    if (!Number.isInteger(stock) || stock < 0) {
        return res.status(400).json({
            mensaje: 'El stock debe ser un entero mayor o igual a cero'
        });
    }

    let cliente;

    try {
        cliente = await pool.connect();
        await cliente.query('BEGIN');

        // Bloquear la variante para evitar cambios simultáneos
        const actual = await cliente.query(
            `SELECT id, stock
             FROM variantes_producto
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (actual.rowCount === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({
                mensaje: 'Variante no encontrada'
            });
        }

        const stockAnterior = actual.rows[0].stock;
        const diferencia = stock - stockAnterior;

        const resultado = await cliente.query(
            `UPDATE variantes_producto
             SET stock = $1
             WHERE id = $2
             RETURNING *`,
            [stock, id]
        );

        // Registrar el movimiento si realmente cambió el stock
        if (diferencia !== 0) {
            await cliente.query(
                `INSERT INTO movimientos_inventario
                 (variante_id, tipo, cantidad_delta,
                  stock_anterior, stock_nuevo, motivo)
                 VALUES ($1, 'AJUSTE', $2, $3, $4, $5)`,
                [
                    id,
                    diferencia,
                    stockAnterior,
                    stock,
                    motivo || 'Actualización manual de inventario'
                ]
            );
        }

        await cliente.query('COMMIT');

        res.status(200).json({
            mensaje: 'Inventario actualizado correctamente',
            variante: resultado.rows[0]
        });

    } catch (error) {
        if (cliente) {
            await cliente.query('ROLLBACK');
        }

        console.error(error.message);
        res.status(500).json({
            mensaje: 'Error al actualizar inventario'
        });

    } finally {
        if (cliente) cliente.release();
    }
});

module.exports = router;
