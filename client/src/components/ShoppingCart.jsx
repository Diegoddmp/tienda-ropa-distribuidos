import React, { useState } from 'react';

export function ShoppingCart({
  cart,
  totalAmount,
  totalItemsCount,
  onUpdateQuantity,
  onRemoveFromCart,
  onConfirmOrder,
}) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setLoading(true);

    const orderData = {
      orderId: 'ORD-' + Date.now().toString().slice(-6),
      timestamp: new Date().toISOString(),
      items: cart.map((item) => ({
        productId: item.id,
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.price,
        subtotal: item.subtotal,
      })),
      total: totalAmount,
    };

    try {
      await onConfirmOrder(orderData);
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
      minWidth: '340px',
      maxWidth: '400px',
      height: 'fit-content',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #edf2f7', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#1a202c' }}>
          Mi Carrito
        </h2>
        <span style={{ backgroundColor: '#edf2f7', color: '#4a5568', padding: '2px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}>
          {totalItemsCount} prendas
        </span>
      </div>

      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#a0aec0' }}>
          <p style={{ margin: 0 }}>El carrito está vacío.</p>
        </div>
      ) : (
        <>
          <div style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
            {cart.map((item) => (
              <div
                key={`${item.id}-${item.size}`}
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
                    Talla: <strong>{item.size}</strong> · ${item.price.toFixed(2)} c/u
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#3182ce', marginTop: '4px' }}>
                    Subtotal: ${item.subtotal.toFixed(2)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.size, item.quantity - 1)}
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
                    onClick={() => onUpdateQuantity(item.id, item.size, item.quantity + 1)}
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
                    onClick={() => onRemoveFromCart(item.id, item.size)}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '1rem', color: '#4a5568' }}>Total:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#2d3748' }}>
                ${totalAmount.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: loading ? '#a0aec0' : '#3182ce',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Confirmando pedido...' : 'Confirmar Pedido'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
