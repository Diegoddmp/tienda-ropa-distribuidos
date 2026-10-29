import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet } from 'react-router-dom';
import ProductCatalog from './components/ProductCatalog';
import ProductDetail from './pages/productDetail';
import AdminPanel from './components/AdminPanel';
import { ShoppingCart } from './components/ShoppingCart';
import { useCart } from './hooks/useCart';
import './App.css';

function StorefrontLayout() {
  const {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalAmount,
    totalItemsCount,
  } = useCart();

  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleConfirmOrder = async (orderPayload) => {
    console.log('--- PEDIDO EMITIDO ---', orderPayload);
    alert(`¡Pedido ${orderPayload.orderId} confirmado!\nTotal: $${orderPayload.total.toFixed(2)}`);
    clearCart();
    setIsCartOpen(false);
  };

  return (
    <div className="storefront">
      {/* Barra superior promocional estilo SHEIN */}
      <div className="top-promo-bar">
        ENVÍO ESTÁNDAR GRATIS EN PEDIDOS DE +$29.99 <span>| NUEVA COLECCIÓN DE TEMPORADA</span>
      </div>

      {/* Header principal */}
      <header className="shein-header">
        <div className="shein-header-inner">
          <Link to="/" className="shein-logo">
            TIENDA DE ROPA
          </Link>

          <ul className="shein-nav-links">
            <li><Link to="/" className="active">Novedades</Link></li>
            <li><Link to="/">Mujer</Link></li>
            <li><Link to="/">Hombre</Link></li>
            <li><Link to="/">Accesorios</Link></li>
            <li><Link to="/" className="sale-link">Rebajas</Link></li>
            <li><Link to="/admin" style={{ color: '#2563eb', fontWeight: 'bold' }}>Panel Admin</Link></li>
          </ul>

          <div className="shein-header-actions">
            <button
              type="button"
              className="shein-icon-btn"
              onClick={() => setIsCartOpen(!isCartOpen)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff'
              }}
            >
              <span style={{ fontWeight: '600' }}>Bolsa</span>
              <span
                className="cart-badge"
                style={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '2px 8px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}
              >
                {totalItemsCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Panel lateral desplegable del carrito */}
      {isCartOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsCartOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              width: '100%',
              maxWidth: '420px',
              height: '100%',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '-4px 0 16px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ✕ Cerrar
              </button>
            </div>

            <ShoppingCart
              cart={cart}
              totalAmount={totalAmount}
              totalItemsCount={totalItemsCount}
              onUpdateQuantity={updateQuantity}
              onRemoveFromCart={removeFromCart}
              onConfirmOrder={handleConfirmOrder}
            />
          </div>
        </div>
      )}

      {/* Contenido principal con acceso a la función addToCart para las rutas hijas */}
      <main className="shein-main">
        <Outlet context={{ addToCart }} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<StorefrontLayout />}>
          <Route path="/" element={<ProductCatalog />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
        </Route>
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}