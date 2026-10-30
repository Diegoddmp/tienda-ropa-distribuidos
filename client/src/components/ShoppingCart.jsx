import React, { useState } from 'react';

export function ShoppingCart({
  cart,
  totalAmount,
  totalItemsCount,
  onUpdateQuantity,
  onRemoveFromCart,
  onConfirmOrder,
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
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '24px',
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      width: '100%',
      height: 'fit-content',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #edf2f7', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#1a202c' }}>
          Mi Bolsa
        </h2>
        <span style={{ backgroundColor: '#edf2f7', color: '#4a5568', padding: '2px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}>
          {totalItemsCount} {totalItemsCount === 1 ? 'prenda' : 'prendas'}
        </span>
      </div>

      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#a0aec0' }}>
          <p style={{ margin: 0 }}>Tu bolsa está vacía.</p>
        </div>
      ) : (
        <form onSubmit={handleCheckout}>
          <div style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
            {cart.map((item) => (
              <div
                key={item.variante_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #f7fafc',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: '#2d3748', fontSize: '0.95rem' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '2px' }}>
                    Talla: <strong>{item.size}</strong>
                    {item.color ? <> · Color: <strong>{item.color}</strong></> : null}
                    {' '}· ${item.price.toFixed(2)} c/u
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fa6338', marginTop: '4px' }}>
                    Subtotal: ${item.subtotal.toFixed(2)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.variante_id, item.quantity - 1)}
                    style={{
                      width: '28px',
                      height: '28px',
                      border: '1px solid #cbd5e0',
                      borderRadius: '6px',
                      background: '#fff',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    -
                  </button>
                  <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: '600' }}>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.variante_id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    style={{
                      width: '28px',
                      height: '28px',
                      border: '1px solid #cbd5e0',
                      borderRadius: '6px',
                      background: item.quantity >= item.stock ? '#edf2f7' : '#fff',
                      cursor: item.quantity >= item.stock ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveFromCart(item.variante_id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#e53e3e',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      marginLeft: '6px',
                      padding: '4px',
                    }}
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px solid #edf2f7', paddingTop: '16px' }}>
            <div style={{ marginBottom: '14px' }}>
              <label
                htmlFor="nombre-cliente-input"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#2d3748', marginBottom: '6px', textTransform: 'uppercase' }}
              >
                Nombre del Cliente *
              </label>
              <input
                id="nombre-cliente-input"
                type="text"
                placeholder="Ej. María Gómez"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                maxLength={100}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e0',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {errorMsg && (
              <div style={{ color: '#e53e3e', fontSize: '0.83rem', marginBottom: '12px', fontWeight: '600' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '1rem', color: '#4a5568' }}>Total:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#000000' }}>
                ${totalAmount.toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: loading ? '#a0aec0' : '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontWeight: '800',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Procesando compra...' : 'Confirmar Pedido'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
