import { io } from "socket.io-client";

// Crear la conexión con el servidor
const socket = io("http://localhost:3000", {
  autoConnect: false
});

export default socket;