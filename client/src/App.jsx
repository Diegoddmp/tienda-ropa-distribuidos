import React, { useState } from 'react';
import { ShoppingCart } from './components/ShoppingCart';
import { useCart } from './hooks/useCart';

export default function App() {
  const {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalAmount,
    totalItemsCount,
  } = useCart();

  const [selectedSize, setSelectedSize] = useState('M');

  // Catálogo simulado para probar el carrito (Apartado 2)
  const sampleProducts = [
    { id: 'p1', name: 'Camiseta Oversize Básica', price: 25.0, stock: 6 },
    { id: 'p2', name: 'Pantalón Cargo Negro', price: 42.0, stock: 4 },
    { id: 'p3', name: 'Hoodie Fleece Premium', price: 55.0, stock: 3 },
  ];

  const handleConfirmOrder = async (orderPayload) => {
    console.log('--- PEDIDO EMITIDO ---', orderPayload);
    alert(`¡Pedido ${orderPayload.orderId} confirmado!\nTotal: $${orderPayload.total.toFixed(2)}`);
    clearCart();
  };

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1100px',
      margin: '40px auto',
      padding: '0 20px',
      color: '#1a202c',
    }}>
      <header style={{ marginBottom: '30px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Tienda Virtual - Pruebas Apartado 2</h1>
        <p style={{ margin: '6px 0 0 0', color: '#718096' }}>
          Módulo de Carrito de Compras: selección de ropa, cálculo de total y confirmación de pedidos[cite: 5].
        </p>
      </header>

      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
        {/* Catálogo simulado (Apartado 1) */}
        <section style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#2d3748' }}>Prendas disponibles</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {sampleProducts.map((prod) => (
              <div
                key={prod.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem' }}>{prod.name}</h3>
                <p style={{ margin: '4px 0', fontWeight: 'bold', color: '#2b6cb0', fontSize: '1.1rem' }}>
                  ${prod.price.toFixed(2)}
                </p>
                <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#718096' }}>
                  Stock disponible: {prod.stock}
                </p>

                <div style={{ margin: '14px 0 10px 0' }}>
                  <label style={{ fontSize: '0.85rem', marginRight: '8px', fontWeight: '500' }}>Talla:</label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  >
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => addToCart(prod, selectedSize)}
                  style={{
                    width: '100%',
                    padding: '9px',
                    backgroundColor: '#edf2f7',
                    border: '1px solid #cbd5e0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Agregar al Carrito
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Componente del Carrito (Apartado 2) */}
        <aside>
          <ShoppingCart
            cart={cart}
            totalAmount={totalAmount}
            totalItemsCount={totalItemsCount}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onConfirmOrder={handleConfirmOrder}
          />
        </aside>
      </div>
    </div>
  );
}