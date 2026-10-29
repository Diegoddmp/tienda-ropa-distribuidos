// Configurar las conexiones de Socket.IO
function configurarPedidosSocket(io) {

    // Detectar cuando un cliente se conecta
    io.on('connection', (socket) => {

        console.log('Cliente conectado:', socket.id);

        // Detectar cuando un cliente se desconecta
        socket.on('disconnect', () => {
            console.log('Cliente desconectado:', socket.id);
        });

    });

}

// Exportar la función
module.exports = configurarPedidosSocket;