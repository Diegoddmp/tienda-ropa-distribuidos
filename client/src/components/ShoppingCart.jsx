import { useState } from 'react';

export function ShoppingCart({
  cart,
  totalAmount,
  totalItemsCount,
  onUpdateQuantity,
  onRemoveFromCart,
  onConfirmOrder,
  onContinueShopping,
}) {
  const [nombreCliente, setNombreCliente] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!nombreCliente.trim()) {
      setErrorMsg('Por favor ingresa tu nombre para registrar el pedido.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    // Estructura exacta requerida por POST /api/pedidos en el backend
    const orderPayload = {
      nombre_cliente: nombreCliente.trim(),
      items: cart.map((item) => ({
        variante_id: item.variante_id,
        cantidad: item.quantity,
      })),
    };

    try {
      await onConfirmOrder(orderPayload);
      setNombreCliente('');
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo procesar el pedido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="fashion-cart">
      <header className="fashion-cart-heading">
        <h2 id="fashion-cart-title">Tu bolsa.</h2>
        <span className="fashion-cart-count">{totalItemsCount} {totalItemsCount === 1 ? 'prenda' : 'prendas'}</span>
      </header>

      {cart.length === 0 ? (
        <div className="fashion-cart-empty">
          <svg width="55" height="62" viewBox="0 0 56 64" fill="none" aria-hidden="true"><path d="M10 20h36l3 39H7l3-39Z" stroke="currentColor" strokeWidth="1.2"/><path d="M19 24V13a9 9 0 0 1 18 0v11" stroke="currentColor" strokeWidth="1.2"/></svg>
          <h3>Un espacio para tus favoritos.</h3>
          <p>Tu bolsa está vacía. Explora la colección y encuentra esa prenda que va contigo.</p>
          <button type="button" className="fashion-btn-primary" onClick={onContinueShopping}>Explorar la colección <span aria-hidden="true">↗</span></button>
        </div>
      ) : (
        <form onSubmit={handleCheckout} className="fashion-cart-form" aria-busy={loading}>
          <div className="fashion-cart-items" aria-label="Prendas en tu bolsa">
            {cart.map((item) => (
              <article key={item.variante_id} className="fashion-cart-item">
                <div className="fashion-cart-item-heading">
                  <h3>{item.name}</h3>
                  <button type="button" className="fashion-cart-remove" onClick={() => onRemoveFromCart(item.variante_id)} aria-label={`Quitar ${item.name} de la bolsa`} title="Quitar prenda">×</button>
                </div>
                <p className="fashion-cart-variant">Talla: <strong>{item.size}</strong>{item.color ? <> · Color: <strong>{item.color}</strong></> : null}</p>
                <p className="fashion-cart-unit-price">${item.price.toFixed(2)} por unidad</p>
                <div className="fashion-cart-item-bottom">
                  <div className="fashion-cart-quantity" role="group" aria-label={`Cantidad de ${item.name}`}>
                    <button type="button" onClick={() => onUpdateQuantity(item.variante_id, item.quantity - 1)} aria-label={`Reducir cantidad de ${item.name}`}>−</button>
                    <span aria-live="polite" aria-atomic="true">{item.quantity}</span>
                    <button type="button" onClick={() => onUpdateQuantity(item.variante_id, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label={`Aumentar cantidad de ${item.name}`}>+</button>
                  </div>
                  <p className="fashion-cart-subtotal"><span>Subtotal</span> ${item.subtotal.toFixed(2)}</p>
                </div>
                {item.quantity >= item.stock && <p className="fashion-cart-stock-note">Has alcanzado las unidades disponibles.</p>}
              </article>
            ))}
          </div>

          <div className="fashion-cart-checkout">
            <span className="fashion-eyebrow">Un paso más</span>
            <h3>Completa tu pedido</h3>
            <p className="fashion-cart-help" id="fashion-checkout-help">Ingresa tu nombre para registrar la compra.</p>
            <label htmlFor="nombre-cliente-input" className="fashion-field-label">Nombre del cliente <span aria-hidden="true">*</span></label>
            <input id="nombre-cliente-input" className="fashion-field" type="text" autoComplete="name" aria-required="true" aria-invalid={Boolean(errorMsg && !nombreCliente.trim())} aria-describedby={errorMsg ? 'fashion-checkout-help fashion-checkout-error' : 'fashion-checkout-help'} placeholder="Tu nombre completo" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} maxLength={100} />

            {errorMsg && <div id="fashion-checkout-error" className="fashion-feedback fashion-feedback-error" role="alert">{errorMsg}</div>}

            <div className="fashion-cart-total"><span>Total</span><strong>${totalAmount.toFixed(2)}</strong></div>
            <button type="submit" className="fashion-btn-primary fashion-cart-submit" disabled={loading}>
              {loading ? 'Procesando compra…' : 'Confirmar pedido'}<span aria-hidden="true">{loading ? '…' : '↗'}</span>
            </button>
            <button type="button" className="fashion-cart-continue" onClick={onContinueShopping}>← Seguir explorando</button>
          </div>
        </form>
      )}
    </section>
  );
}
