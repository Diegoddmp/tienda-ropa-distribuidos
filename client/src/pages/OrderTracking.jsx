import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import socket from '../services/socket';
import './OrderTracking.css';

const STEPS = [
  { value: 'pendiente', label: 'Recibido', description: 'Tu pedido está registrado.' },
  { value: 'preparando', label: 'En preparación', description: 'Estamos preparando tus prendas.' },
  { value: 'enviado', label: 'Enviado', description: 'Tu pedido ha sido enviado.' },
  { value: 'entregado', label: 'Entregado', description: 'Tu pedido ha sido entregado.' },
];
const ALLOWED_STATUSES = [...STEPS.map((step) => step.value), 'cancelado'];

// NUEVO: demostración local, sin buscador de IDs ni consultas a la lista de pedidos.
export default function OrderTracking() {
  const { id } = useParams();
  const { trackingOrderId } = useOutletContext();
  const allowed = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) === trackingOrderId;
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(socket.connected);
  const requestRef = useRef({ sequence: 0 });

  const fetchOrder = useCallback(() => {
    if (!allowed) return;
    const requests = requestRef.current;
    const requestId = ++requests.sequence;
    return fetch(`http://localhost:3000/api/pedidos/${id}`).then(async (response) => {
      if (!response.ok) throw new Error('No pudimos consultar el pedido. Vuelve a intentarlo.');
      const data = await response.json();
      if (requestId !== requests.sequence) return;
      if (Number(data.pedido?.id) !== Number(id) || !ALLOWED_STATUSES.includes(data.pedido?.estado)) {
        throw new Error('La respuesta del pedido no es válida.');
      }
      // Solo se conserva lo necesario para mostrar el seguimiento, sin información personal.
      setOrder({ id: Number(data.pedido.id), estado: data.pedido.estado });
      setError('');
    }).catch((err) => {
      if (requestId === requests.sequence) setError(err.message);
    }).finally(() => {
      if (requestId === requests.sequence) setLoading(false);
    });
  }, [id, allowed]);

  useEffect(() => {
    if (!allowed) return;
    const requests = requestRef.current;
    const onStatus = (updatedOrder) => {
      // Se descarta cualquier notificación que corresponda a otro pedido.
      if (Number(updatedOrder?.id) === Number(id)) fetchOrder();
    };
    const onConnect = () => { setConnected(true); fetchOrder(); };
    const onDisconnect = () => setConnected(false);
    socket.on('order:status', onStatus);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    fetchOrder();
    if (!socket.connected) socket.connect();
    return () => {
      ++requests.sequence;
      socket.off('order:status', onStatus);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      // La conexión es compartida con el catálogo y el administrador.
    };
  }, [allowed, id, fetchOrder]);

  if (!allowed) {
    return <section className="fashion-status"><span className="fashion-eyebrow">Seguimiento local</span><h1>Este pedido no está disponible en esta pestaña.</h1><p>El seguimiento de demostración se habilita después de completar una compra aquí. No se pueden buscar pedidos de otros clientes.</p><Link to="/" className="fashion-btn-outline">Volver a la colección</Link></section>;
  }

  // NUEVO: al navegar entre referencias no se muestra temporalmente el estado de otro ID.
  const currentOrder = order?.id === Number(id) ? order : null;
  const activeStep = STEPS.findIndex((step) => step.value === currentOrder?.estado);
  const cancelled = currentOrder?.estado === 'cancelado';

  return (
    <section className="fashion-tracking" aria-labelledby="tracking-title">
      <nav className="fashion-breadcrumb" aria-label="Ruta de navegación"><Link to="/">Colección</Link><span aria-hidden="true">/</span><span>Tu pedido</span></nav>
      <header className="fashion-tracking-header"><div><span className="fashion-eyebrow">Seguimiento de tu compra</span><h1 id="tracking-title">Pedido #{id}</h1><p>Un paso más cerca de tu próximo favorito.</p></div><span className={`fashion-tracking-connection ${connected ? 'is-connected' : ''}`} role="status">{connected ? 'Actualizaciones en vivo' : 'Sin conexión · esperando reconexión'}</span></header>
      {(loading || (!currentOrder && !error)) && <p className="fashion-tracking-loading" role="status">Consultando el estado de tu pedido…</p>}
      {error && <div className="fashion-feedback fashion-feedback-error" role="alert"><p>{error}{currentOrder ? ' Se muestra el último estado recibido.' : ''}</p><button type="button" className="fashion-btn-outline" onClick={fetchOrder}>Volver a intentar</button></div>}
      {currentOrder && (
        <>
          <div className="fashion-tracking-current" role="status" aria-live="polite" aria-atomic="true"><span className="fashion-eyebrow">Estado actual{!connected || error ? ' · última información recibida' : ''}</span><h2>{cancelled ? 'Pedido cancelado' : STEPS[activeStep].label}</h2><p>{cancelled ? 'Este pedido ha sido cancelado.' : STEPS[activeStep].description}</p></div>
          {!cancelled && <ol className="fashion-tracking-steps" aria-label="Progreso del pedido">{STEPS.map((step, index) => <li key={step.value} className={index <= activeStep ? 'is-complete' : ''} aria-current={index === activeStep ? 'step' : undefined}><span className="fashion-tracking-step-number" aria-hidden="true">{index < activeStep ? '✓' : String(index + 1).padStart(2, '0')}</span><strong>{step.label}</strong><p>{index > activeStep ? 'Aún pendiente.' : step.description}</p></li>)}</ol>}
        </>
      )}
      <p className="fashion-tracking-demo">Demostración local del último pedido creado en esta pestaña. El seguimiento público requiere autenticación o un enlace seguro.</p>
      <Link to="/" className="fashion-back-link">← Seguir explorando</Link>
    </section>
  );
}
