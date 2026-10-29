require('dotenv').config();

const express = require('express');
const cors = require('cors');

// **** NUEVO: importar HTTP y Socket.IO
const http = require('http');
const { Server } = require('socket.io');

// **** NUEVO: importar configuración de sockets
const configurarPedidosSocket = require('./sockets/pedidosSocket');

const { conectarBD } = require('./config/db');
const productosRoutes = require('./routes/productos.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const categoriasRoutes = require('./routes/categorias.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middlewares
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174']
}));
app.use(express.json());

// **** NUEVO: crear servidor HTTP
const server = http.createServer(app);

// **** NUEVO: configurar Socket.IO
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:5174'],
        methods: ['GET', 'POST']
    }
});

// **** NUEVO: permitir que las rutas REST usen Socket.IO
app.set('io', io);


// **** NUEVO: registrar eventos WebSocket
configurarPedidosSocket(io);

// Ruta para verificar que el servidor funciona
app.get('/', (req, res) => {
    res.json({
        mensaje: 'API de Tienda Virtual funcionando'
    });
});

// Rutas de productos
app.use('/api/productos', productosRoutes);

app.use('/api/inventario', inventarioRoutes);

app.use('/api/pedidos', pedidosRoutes);

app.use('/api/categorias', categoriasRoutes);

// Iniciar servidor
async function iniciarServidor() {
    try {
        await conectarBD();

        // **** MODIFICADO: iniciar HTTP y Socket.IO juntos
        server.listen(PORT, () => {
            console.log(`Servidor en http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('No fue posible iniciar el servidor');
        process.exit(1);
    }
}

iniciarServidor();