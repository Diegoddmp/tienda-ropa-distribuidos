
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Validar identificadores
function idValido(id) {
    return Number.isInteger(Number(id)) && Number(id) > 0;
}

// Validar datos de un producto
function validarProducto(datos) {
    if (!idValido(datos.categoria_id)) {
        return 'La categoría es inválida';
    }

    if (typeof datos.nombre !== 'string' ||
        datos.nombre.trim() === '') {
        return 'El nombre es obligatorio';
    }

    if (datos.precio === undefined ||
        datos.precio === null ||
        datos.precio === '' ||
        !Number.isFinite(Number(datos.precio)) ||
        Number(datos.precio) <= 0) {
        return 'El precio debe ser mayor a cero';
    }

    return null;
}

// GET: Listar productos disponibles
router.get('/', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                p.id,
                p.categoria_id,
                p.nombre,
                p.descripcion,
                p.precio,
                p.imagen_url,
                c.nombre AS categoria,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'id', v.id,
                                'talla', v.talla,
                                'color', v.color,
                                'stock', v.stock
                            ) ORDER BY v.id
                        )
                        FROM variantes_producto v
                        WHERE v.producto_id = p.id
                    ),
                    '[]'::json
                ) AS variantes
            FROM productos p
            JOIN categorias c
                ON p.categoria_id = c.id
            WHERE p.activo = TRUE
            ORDER BY p.id
        `);

        res.status(200).json(resultado.rows);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            mensaje: 'Error al listar productos'
        });
    }
});

// GET: Buscar un producto por ID
router.get('/:id', async (req, res) => {
    try {
        if (!idValido(req.params.id)) {
            return res.status(400).json({
                mensaje: 'ID inválido'
            });
        }

        const resultado = await pool.query(
            `SELECT * FROM productos
             WHERE id = $1 AND activo = TRUE`,
            [req.params.id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Producto no encontrado'
            });
        }

        res.status(200).json(resultado.rows[0]);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            mensaje: 'Error al buscar producto'
        });
    }
});

// POST: Registrar producto con sus variantes
router.post('/', async (req, res) => {
    let cliente;

    try {
        const {
            categoria_id,
            nombre,
            descripcion,
            precio,
            imagen_url,
            variantes
        } = req.body;

        const error = validarProducto(req.body);

        if (error) {
            return res.status(400).json({ mensaje: error });
        }

        if (!Array.isArray(variantes) ||
            variantes.length === 0) {
            return res.status(400).json({
                mensaje: 'Debe incluir al menos una variante'
            });
        }

        const tallas = ['XS', 'S', 'M', 'L', 'XL', 'UNICA'];
        const combinaciones = new Set();

        for (const v of variantes) {
            if (!v || !tallas.includes(v.talla) ||
                typeof v.color !== 'string' ||
                !v.color.trim() ||
                !Number.isInteger(v.stock) ||
                v.stock < 0) {
                return res.status(400).json({
                    mensaje: 'Variante inválida'
                });
            }

            const clave = `${v.talla}:${v.color.trim().toLowerCase()}`;

            if (combinaciones.has(clave)) {
                return res.status(400).json({
                    mensaje: 'Existen variantes repetidas'
                });
            }

            combinaciones.add(clave);
        }

        cliente = await pool.connect();
        await cliente.query('BEGIN');

        const resultado = await cliente.query(
            `INSERT INTO productos
             (categoria_id, nombre, descripcion, precio, imagen_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                categoria_id,
                nombre.trim(),
                descripcion || '',
                precio,
                imagen_url || null
            ]
        );

        const producto = resultado.rows[0];
        const variantesCreadas = [];

        for (const v of variantes) {
            const resultadoVariante = await cliente.query(
                `INSERT INTO variantes_producto
                 (producto_id, talla, color, stock)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [producto.id, v.talla, v.color.trim(), v.stock]
            );

            variantesCreadas.push(resultadoVariante.rows[0]);
        }

        await cliente.query('COMMIT');

        res.status(201).json({
            mensaje: 'Producto registrado correctamente',
            producto,
            variantes: variantesCreadas
        });

    } catch (error) {
        if (cliente) await cliente.query('ROLLBACK');

        console.error(error.message);

        const estado =
            error.code === '23503' ? 400 :
            error.code === '23505' ? 409 : 500;

        res.status(estado).json({
            mensaje: estado === 400
                ? 'La categoría no existe'
                : estado === 409
                ? 'Producto con variante duplicada'
                : 'Error al registrar producto'
        });

    } finally {
        if (cliente) cliente.release();
    }
});

// PUT: Modificar información general del producto
router.put('/:id', async (req, res) => {
    try {
        if (!idValido(req.params.id)) {
            return res.status(400).json({
                mensaje: 'ID inválido'
            });
        }

        const error = validarProducto(req.body);

        if (error) {
            return res.status(400).json({ mensaje: error });
        }

        const {
            categoria_id,
            nombre,
            descripcion,
            precio,
            imagen_url
        } = req.body;

        const resultado = await pool.query(
            `UPDATE productos SET
                categoria_id = $1,
                nombre = $2,
                descripcion = $3,
                precio = $4,
                imagen_url = $5
             WHERE id = $6 AND activo = TRUE
             RETURNING *`,
            [
                categoria_id,
                nombre.trim(),
                descripcion || '',
                precio,
                imagen_url || null,
                req.params.id
            ]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                mensaje: 'Producto no encontrado'
            });
        }

        res.status(200).json({
            mensaje: 'Producto actualizado',
            producto: resultado.rows[0]
        });

    } catch (error) {
        console.error(error.message);

        res.status(error.code === '23503' ? 400 : 500).json({
            mensaje: error.code === '23503'
                ? 'La categoría no existe'
                : 'Error al actualizar producto'
        });
    }
});

// DELETE: Desactivar producto (eliminación lógica)
router.delete('/:id', async (req, res) => {
    try {
        if (!idValido(req.params.id)) {
            return res.status(400).json({
                mensaje: 'ID inválido'
            });
        }

        const resultado = await pool.query(
            `UPDATE productos
             SET activo = FALSE
             WHERE id = $1 AND activo = TRUE
             RETURNING id, nombre`,
            [req.params.id]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                mensaje: 'Producto no encontrado'
            });
        }

        res.status(200).json({
            mensaje: 'Producto desactivado correctamente',
            producto: resultado.rows[0]
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            mensaje: 'Error al eliminar producto'
        });
    }
});

module.exports = router;
