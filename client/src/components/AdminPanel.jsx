import { useState, useEffect } from "react";
import socket from "../services/socket";

function AdminPanel() {

  // Estado de conexión con el servidor
  const [conectado, setConectado] = useState(false);

  // Pedidos de prueba
  const [pedidos, setPedidos] = useState([
    {
      id: 1,
      cliente: "María",
      producto: "Camiseta negra",
      talla: "M",
      total: 15,
      estado: "Pendiente"
    },
    {
      id: 2,
      cliente: "Carlos",
      producto: "Pantalón jean",
      talla: "L",
      total: 25,
      estado: "Pendiente"
    },
    {
      id: 3,
      cliente: "Ana",
      producto: "Vestido azul",
      talla: "S",
      total: 30,
      estado: "Preparando"
    }
  ]);

  // Cambiar estado del pedido
  const cambiarEstado = (id, nuevoEstado) => {
    setPedidos(pedidos.map(pedido =>
      pedido.id === id
        ? { ...pedido, estado: nuevoEstado }
        : pedido
    ));
  };

  // Conexión con Socket.IO
  useEffect(() => {

    const conectar = () => {
      console.log("Conectado al servidor");
      setConectado(true);
    };

    const desconectar = () => {
      console.log("Desconectado del servidor");
      setConectado(false);
    };

    socket.on("connect", conectar);
    socket.on("disconnect", desconectar);

    socket.connect();
    setConectado(socket.connected);

    return () => {
      socket.off("connect", conectar);
      socket.off("disconnect", desconectar);
      socket.disconnect();
    };

  }, []);

  return (
    <div style={{ padding: "30px" }}>

      <h1>Panel de Administración</h1>

      <p>
        Estado del servidor:{" "}
        <strong style={{ color: conectado ? "green" : "red" }}>
          {conectado ? "Conectado" : "Desconectado"}
        </strong>
      </p>

      <p>Gestión de pedidos de la tienda de ropa</p>

      <h2>Pedidos recibidos: {pedidos.length}</h2>

      <table border="1" cellPadding="12">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Producto</th>
            <th>Talla</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>

        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td>{pedido.id}</td>
              <td>{pedido.cliente}</td>
              <td>{pedido.producto}</td>
              <td>{pedido.talla}</td>
              <td>${pedido.total}</td>
              <td>{pedido.estado}</td>

              <td>
                <select
                  value={pedido.estado}
                  onChange={(e) =>
                    cambiarEstado(pedido.id, e.target.value)
                  }
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Preparando">Preparando</option>
                  <option value="Entregado">Entregado</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}

export default AdminPanel;