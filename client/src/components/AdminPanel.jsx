import { useState, useEffect } from "react";
import socket from "../services/socket";

function AdminPanel() {

  // Estado de conexión con el servidor
  const [conectado, setConectado] = useState(false);

// **** MODIFICADO: guardar pedidos reales
const [pedidos, setPedidos] = useState([]);

// **** NUEVO: consultar los pedidos guardados
const obtenerPedidos = async () => {
  try {
    const respuesta = await fetch("http://localhost:3000/api/pedidos");

    if (!respuesta.ok) {
      throw new Error("No se pudieron consultar los pedidos");
    }

    const datos = await respuesta.json();
    setPedidos(datos);

  } catch (error) {
    console.error("Error al obtener pedidos:", error);
  }
};



// **** NUEVO: actualizar el estado en PostgreSQL
const cambiarEstado = async (id, nuevoEstado) => {
  try {
    const respuesta = await fetch(
      `http://localhost:3000/api/pedidos/${id}/estado`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          estado: nuevoEstado
        })
      }
    );

    if (!respuesta.ok) {
      throw new Error("No se pudo actualizar el estado");
    }

    // Actualizar la tabla después de guardar
    await obtenerPedidos();

  } catch (error) {
    console.error("Error al cambiar estado:", error);
    alert("No se pudo actualizar el estado del pedido");
  }
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

    // **** NUEVO: escuchar las compras en tiempo real
    const nuevoPedido = (datos) => {
      console.log("Nuevo pedido recibido:", datos);

      // Actualizar la tabla con la información de PostgreSQL
      obtenerPedidos();
    };

    socket.on("connect", conectar);
    socket.on("disconnect", desconectar);
    socket.on("order:new", nuevoPedido);
    // **** NUEVO: escuchar cambios de estado
  socket.on("order:status", obtenerPedidos);

    // Consultar los pedidos existentes al abrir el panel
    obtenerPedidos();

    socket.connect();
    setConectado(socket.connected);

    return () => {
      socket.off("connect", conectar);
      socket.off("disconnect", desconectar);
      socket.disconnect();
      socket.off("order:new", nuevoPedido);
      socket.off("order:status", obtenerPedidos);
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
            <th>Total</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acción</th>
          </tr>
        </thead>

        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td>{pedido.id}</td>
              <td>{pedido.nombre_cliente}</td>
              <td>${pedido.total}</td>
              <td>{pedido.estado}</td>
              <td>{new Date(pedido.fecha_pedido).toLocaleString()}</td>
              {/* **** NUEVO: selector para cambiar el estado */}
                <td>
                  <select
                    value={pedido.estado}
                    onChange={(e) =>
                      cambiarEstado(pedido.id, e.target.value)
                    }
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="preparando">Preparando</option>
                    <option value="enviado">Enviado</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
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