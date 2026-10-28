
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET: Consultar todas las categorías
router.get('/', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT id, nombre, descripcion
            FROM categorias
            ORDER BY id ASC
        `);

        res.status(200).json(resultado.rows);

    } catch (error) {
        console.error('Error:', error.message);

        res.status(500).json({
            mensaje: 'Error al consultar categorías'
        });
    }
});

module.exports = router;
