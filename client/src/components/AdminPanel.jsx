
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import socket from "../services/socket";
import "./AdminPanel.css";

function AdminPanel() {

  // Estado de conexión con el servidor
  const [conectado, setConectado] = useState(false);

  // Guardar pedidos reales
  const [pedidos, setPedidos] = useState([]);

  // Guardar el inventario
  const [inventario, setInventario] = useState([]);

  // **** NUEVO: guardar la notificación de una compra
  const [notificacion, setNotificacion] = useState("");
  const [errorEstado, setErrorEstado] = useState("");
  // NUEVO: edición por variante y avisos independientes de las notificaciones de pedidos.
  const [stockDrafts, setStockDrafts] = useState({});
  const [savingStock, setSavingStock] = useState({});
  const [stockFeedback, setStockFeedback] = useState({});
  const [errorInventario, setErrorInventario] = useState("");
  const [alertasStock, setAlertasStock] = useState([]);
  const stockAnteriorRef = useRef(null);
  const inventarioRequestRef = useRef(0);

  // Consultar los pedidos guardados en PostgreSQL
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

  // Consultar inventario de todos los productos
  const obtenerInventario = async () => {
    // MODIFICADO: una respuesta antigua no debe sobrescribir una consulta más reciente.
    const requestId = ++inventarioRequestRef.current;
    try {
      const respuesta = await fetch(
        "http://localhost:3000/api/inventario"
      );

      if (!respuesta.ok) {
        throw new Error("No se pudo consultar el inventario");
      }

      const datos = await respuesta.json();
      if (requestId !== inventarioRequestRef.current) return;

      // NUEVO: la primera consulta establece la referencia; la tabla ya identifica el stock bajo.
      const anteriores = stockAnteriorRef.current;
      stockAnteriorRef.current = new Map(datos.map((item) => [item.variante_id, Number(item.stock)]));
      if (anteriores) {
        const cambios = datos.filter((item) => {
          const anterior = anteriores.get(item.variante_id);
          const actual = Number(item.stock);
          return anterior !== undefined && (
            (anterior >= 5 && actual < 5) || (anterior > 0 && actual === 0)
          );
        });
        if (cambios.length > 0) {
          setAlertasStock((prev) => [
            ...cambios,
            ...prev.filter((alerta) => !cambios.some((item) => item.variante_id === alerta.variante_id)),
          ].slice(0, 8));
        }
      }
      setInventario(datos);
      setErrorInventario("");

    } catch (error) {
      if (requestId !== inventarioRequestRef.current) return;
      console.error("Error al obtener inventario:", error);
      setErrorInventario("No se pudo sincronizar el inventario. Se conservan los últimos datos recibidos.");
    }
  };

  // NUEVO: utiliza el PATCH existente; las transacciones y los movimientos siguen en el backend.
  const ajustarStock = async (event, item) => {
    event.preventDefault();
    const varianteId = item.variante_id;
    if (savingStock[varianteId]) return;
    const valor = stockDrafts[varianteId] ?? String(item.stock);
    const stock = Number(valor);
    if (!valor.trim() || !Number.isSafeInteger(stock) || stock < 0) {
      setStockFeedback((prev) => ({ ...prev, [varianteId]: { error: true, mensaje: "Ingresa un número entero mayor o igual a cero." } }));
      return;
    }
    setSavingStock((prev) => ({ ...prev, [varianteId]: true }));
    setStockFeedback((prev) => ({ ...prev, [varianteId]: null }));
    try {
      const respuesta = await fetch(`http://localhost:3000/api/inventario/variante/${varianteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock, motivo: "Ajuste manual desde el panel de administración" }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje || "No se pudo ajustar el inventario.");
      setStockDrafts((prev) => { const next = { ...prev }; delete next[varianteId]; return next; });
      setStockFeedback((prev) => ({ ...prev, [varianteId]: { error: false, mensaje: "Stock actualizado correctamente." } }));
      await obtenerInventario();
    } catch (error) {
      setStockFeedback((prev) => ({ ...prev, [varianteId]: { error: true, mensaje: error.message } }));
    } finally {
      setSavingStock((prev) => ({ ...prev, [varianteId]: false }));
    }
  };

  // Actualizar el estado de los pedidos en PostgreSQL
  const cambiarEstado = async (id, nuevoEstado) => {
    setErrorEstado("");
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

      await obtenerPedidos();

    } catch (error) {
      console.error("Error al cambiar estado:", error);
      setErrorEstado("No se pudo actualizar el estado del pedido. Vuelve a intentarlo.");
    }
  };

  // Conexión con Socket.IO
  useEffect(() => {

    const conectar = () => {
      console.log("Conectado al servidor");
      setConectado(true);

      // Sincronizar datos al reconectarse
      obtenerPedidos();
      obtenerInventario();
    };

    const desconectar = () => {
      console.log("Desconectado del servidor");
      setConectado(false);
    };

    // Escuchar nuevos pedidos en tiempo real
    const nuevoPedido = (datos) => {
      console.log("Nuevo pedido recibido:", datos);

      // **** NUEVO: mostrar notificación visual
      if (datos?.pedido?.id) {
        setNotificacion(
          `¡Nuevo pedido #${datos.pedido.id} recibido!`
        );
      } else {
        setNotificacion("¡Nuevo pedido recibido!");
      }

      // Actualizar pedidos automáticamente
      obtenerPedidos();
    };

    socket.on("connect", conectar);
    socket.on("disconnect", desconectar);
    socket.on("order:new", nuevoPedido);
    socket.on("order:status", obtenerPedidos);

    // Escuchar cambios de inventario
    socket.on("inventory:update", obtenerInventario);

    // Consultar datos iniciales
    obtenerPedidos();
    obtenerInventario();

    socket.connect();
    setConectado(socket.connected);

    return () => {
      socket.off("connect", conectar);
      socket.off("disconnect", desconectar);
      socket.off("order:new", nuevoPedido);
      socket.off("order:status", obtenerPedidos);
      socket.off("inventory:update", obtenerInventario);

      // MODIFICADO: la conexión es compartida; otras vistas pueden seguir utilizándola.
    };

  }, []);

  const pedidosPendientes = pedidos.filter((pedido) => pedido.estado === "pendiente").length;
  const variantesStockBajo = inventario.filter((item) => item.stock < 5).length;

  return (
    <div className="admin-panel">
      <header className="admin-panel__header">
        <div>
          <p className="admin-panel__eyebrow"><Link to="/">← VOLVER A LA TIENDA</Link> / ADMINISTRACIÓN</p>
          <h1 className="admin-panel__title">Panel de Administración</h1>
          <p className="admin-panel__subtitle">Gestión de pedidos e inventario de la tienda</p>
        </div>
        <div className={`admin-panel__connection ${conectado ? "admin-panel__connection--online" : "admin-panel__connection--offline"}`} role="status">
          <span className="admin-panel__connection-dot" aria-hidden="true" />
          <div><span className="admin-panel__connection-label">Servidor</span><strong>{conectado ? "Conectado" : "Desconectado"}</strong></div>
        </div>
      </header>

      {errorEstado && (
        <div className="admin-panel__notification admin-panel__notification--error" role="alert">
          <div className="admin-panel__notification-copy"><strong>{errorEstado}</strong></div>
          <button className="admin-panel__dismiss" type="button" onClick={() => setErrorEstado("")} aria-label="Cerrar error de actualización">Cerrar <span aria-hidden="true">×</span></button>
        </div>
      )}

      {notificacion && (
        <div className="admin-panel__notification" role="status" aria-atomic="true">
          <svg className="admin-panel__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" strokeLinecap="round" />
          </svg>
          <div className="admin-panel__notification-copy"><strong>{notificacion}</strong><p>La lista de pedidos se actualiza automáticamente.</p></div>
          <button className="admin-panel__dismiss" type="button" onClick={() => setNotificacion("")} aria-label="Cerrar notificación de pedido nuevo">Cerrar <span aria-hidden="true">×</span></button>
        </div>
      )}

      {/* NUEVO: alertas por transición, sin sustituir las notificaciones de pedidos. */}
      {alertasStock.length > 0 && (
        <section className="admin-panel__stock-alerts" aria-label="Alertas recientes de inventario" aria-live="polite" aria-relevant="additions">
          <div className="admin-panel__stock-alerts-heading"><h2>Atención al inventario</h2><button className="admin-panel__dismiss" type="button" onClick={() => setAlertasStock([])}>Limpiar avisos</button></div>
          {alertasStock.map((item) => (
            <p key={item.variante_id} className="admin-panel__stock-alert" data-variant-id={item.variante_id}>
              <strong>{Number(item.stock) === 0 ? "Agotado" : "Stock bajo"} · {item.producto}</strong>
              <span>Talla {item.talla} · {item.color} · {item.stock} unidades al detectar el cambio</span>
            </p>
          ))}
        </section>
      )}

      <section className="admin-panel__stats" aria-label="Resumen de la tienda">
        <article className="admin-panel__stat">
          <div className="admin-panel__stat-top"><span>Total de pedidos</span><span className="admin-panel__stat-icon" aria-hidden="true">
            <svg className="admin-panel__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 7h14l1 14H4L5 7Z" strokeLinejoin="round" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></svg>
          </span></div>
          <strong className="admin-panel__stat-value">{pedidos.length}</strong><p>Pedidos registrados en la tienda</p>
        </article>
        <article className="admin-panel__stat">
          <div className="admin-panel__stat-top"><span>Pedidos pendientes</span><span className="admin-panel__stat-icon admin-panel__stat-icon--amber" aria-hidden="true">
            <svg className="admin-panel__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" /></svg>
          </span></div>
          <strong className="admin-panel__stat-value">{pedidosPendientes}</strong><p>En espera de preparación</p>
        </article>
        <article className="admin-panel__stat">
          <div className="admin-panel__stat-top"><span>Variantes con stock bajo</span><span className="admin-panel__stat-icon admin-panel__stat-icon--rose" aria-hidden="true">
            <svg className="admin-panel__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m12 3 9 5v9l-9 5-9-5V8l9-5Z" strokeLinejoin="round" /><path d="m3 8 9 5 9-5M12 13v9M7.5 5.5l9 5" /></svg>
          </span></div>
          <strong className="admin-panel__stat-value">{variantesStockBajo}</strong><p>Menos de 5 unidades, incluidas agotadas</p>
        </article>
      </section>

      <section className="admin-panel__section" aria-labelledby="admin-panel-orders-title">
        <div className="admin-panel__section-header">
          <div><h2 id="admin-panel-orders-title" className="admin-panel__section-title">Pedidos recibidos</h2><p>Consulta las compras y gestiona cada entrega.</p></div>
          <span className="admin-panel__count">{pedidos.length} pedidos</span>
        </div>
        <div className="admin-panel__table-scroll" role="region" aria-label="Tabla de pedidos; desplaza horizontalmente para ver todas las columnas" tabIndex={0}>
          <table className="admin-panel__table admin-panel__table--orders">
            <thead><tr><th scope="col">ID</th><th scope="col">Cliente</th><th scope="col">Total</th><th scope="col">Estado</th><th scope="col">Fecha</th><th scope="col">Acción</th></tr></thead>
            <tbody>
              {pedidos.length === 0 && (<tr><td colSpan={6} className="admin-panel__empty"><strong>Aún no hay pedidos</strong><span>Las nuevas compras aparecerán aquí automáticamente.</span></td></tr>)}
              {pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td className="admin-panel__order-id">#{pedido.id}</td>
                  <td className="admin-panel__primary-cell">{pedido.nombre_cliente}</td>
                  <td className="admin-panel__money">${pedido.total}</td>
                  <td><span className={`admin-panel__badge admin-panel__badge--${pedido.estado}`}>{pedido.estado}</span></td>
                  <td className="admin-panel__date">{new Date(pedido.fecha_pedido).toLocaleString()}</td>
                  <td>
                    <select className="admin-panel__select" aria-label={`Cambiar estado del pedido #${pedido.id}`} value={pedido.estado} onChange={(e) => cambiarEstado(pedido.id, e.target.value)}>
                      <option value="pendiente">Pendiente</option><option value="preparando">Preparando</option><option value="enviado">Enviado</option><option value="entregado">Entregado</option><option value="cancelado">Cancelado</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel__section" aria-labelledby="admin-panel-inventory-title">
        <div className="admin-panel__section-header">
          <div><h2 id="admin-panel-inventory-title" className="admin-panel__section-title">Inventario de productos</h2><p>Disponibilidad por producto, talla y color.</p></div>
          <span className="admin-panel__count">{inventario.length} variantes</span>
        </div>
        {errorInventario && <div className="admin-panel__inventory-error" role="alert">{errorInventario}</div>}
        <div className="admin-panel__legend" aria-label="Niveles de stock">
          <span><i className="admin-panel__legend-dot admin-panel__legend-dot--green" aria-hidden="true" />Suficiente: 5 o más</span>
          <span><i className="admin-panel__legend-dot admin-panel__legend-dot--amber" aria-hidden="true" />Bajo: 1 a 4</span>
          <span><i className="admin-panel__legend-dot admin-panel__legend-dot--red" aria-hidden="true" />Agotado: 0</span>
        </div>
        <div className="admin-panel__table-scroll" role="region" aria-label="Tabla de inventario; desplaza horizontalmente para ver todas las columnas" tabIndex={0}>
          <table className="admin-panel__table admin-panel__table--inventory">
            <thead><tr><th scope="col">Producto</th><th scope="col">Talla</th><th scope="col">Color</th><th scope="col">Stock disponible</th><th scope="col">Ajustar existencias</th></tr></thead>
            <tbody>
              {inventario.length === 0 && (<tr><td colSpan={5} className="admin-panel__empty"><strong>No hay inventario para mostrar</strong><span>Los productos disponibles se mostrarán en esta sección.</span></td></tr>)}
              {inventario.map((item) => (
                <tr key={item.variante_id}>
                  <td className="admin-panel__primary-cell">{item.producto}</td>
                  <td><span className="admin-panel__size">{item.talla}</span></td><td>{item.color}</td>
                  <td><span className={`admin-panel__badge admin-panel__stock ${item.stock <= 0 ? "admin-panel__stock--empty" : item.stock < 5 ? "admin-panel__stock--low" : "admin-panel__stock--available"}`}><strong>{item.stock}</strong><span>{item.stock <= 0 ? "Agotado" : item.stock < 5 ? "Stock bajo" : "Disponible"}</span></span></td>
                  <td>
                    <form className="admin-panel__stock-form" onSubmit={(event) => ajustarStock(event, item)} noValidate aria-busy={Boolean(savingStock[item.variante_id])}>
                      <label className="admin-panel__stock-label" htmlFor={`stock-${item.variante_id}`}>Nuevo stock</label>
                      <div className="admin-panel__stock-controls">
                        <input id={`stock-${item.variante_id}`} type="number" min="0" step="1" inputMode="numeric" value={stockDrafts[item.variante_id] ?? String(item.stock)} disabled={savingStock[item.variante_id]} aria-label={`Nuevo stock de ${item.producto}, talla ${item.talla}, color ${item.color}`} aria-invalid={Boolean(stockFeedback[item.variante_id]?.error)} aria-describedby={stockFeedback[item.variante_id] ? `stock-feedback-${item.variante_id}` : undefined} onChange={(event) => { setStockDrafts((prev) => ({ ...prev, [item.variante_id]: event.target.value })); setStockFeedback((prev) => ({ ...prev, [item.variante_id]: null })); }} />
                        <button type="submit" disabled={savingStock[item.variante_id]}>{savingStock[item.variante_id] ? "Guardando…" : "Guardar"}</button>
                      </div>
                      {stockFeedback[item.variante_id] && <p id={`stock-feedback-${item.variante_id}`} className={`admin-panel__stock-feedback ${stockFeedback[item.variante_id].error ? "is-error" : ""}`} role={stockFeedback[item.variante_id].error ? "alert" : "status"}>{stockFeedback[item.variante_id].mensaje}</p>}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="admin-panel__footer">Los pedidos y las existencias se sincronizan automáticamente cuando el servidor está conectado.</p>
    </div>
  );
}

export default AdminPanel;
