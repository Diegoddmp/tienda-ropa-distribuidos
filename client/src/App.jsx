import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import ProductCatalog from './components/ProductCatalog';
import ProductDetail from './pages/productDetail';
import AdminPanel from './components/AdminPanel';
import { ShoppingCart } from './components/ShoppingCart';
import { useCart } from './hooks/useCart';
import './App.css';

function StorefrontLayout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

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
    const response = await fetch('http://localhost:3000/api/pedidos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.mensaje || 'Error al registrar el pedido');
    }

    alert(
      `¡Pedido #${data.pedido.id} registrado correctamente!\nCliente: ${data.pedido.nombre_cliente}\nTotal: $${parseFloat(data.pedido.total).toFixed(2)}`
    );

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
            <li><Link to="/" className={!isAdmin ? 'active' : ''}>Catálogo</Link></li>
            <li><Link to="/">Mujer</Link></li>
            <li><Link to="/">Hombre</Link></li>
            <li><Link to="/">Accesorios</Link></li>
            <li><Link to="/" className="sale-link">Rebajas</Link></li>
            <li>
              <Link to="/admin" className={isAdmin ? 'active' : ''}>
                Panel Admin
              </Link>
            </li>
          </ul>

          <div className="shein-header-actions">
            <Link
              to={isAdmin ? '/' : '/admin'}
              style={{
                textDecoration: 'none',
                color: isAdmin ? '#ffffff' : '#000000',
                backgroundColor: isAdmin ? '#000000' : '#f6f6f6',
                border: '1px solid #000000',
                fontWeight: '700',
                fontSize: '0.78rem',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                padding: '8px 14px',
              }}
            >
              {isAdmin ? '← Ver Tienda' : 'Panel Admin'}
            </Link>

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
                border: '1px solid #000000',
                backgroundColor: '#ffffff',
                borderRadius: 0,
                textTransform: 'uppercase',
                fontSize: '0.78rem',
                letterSpacing: '0.6px',
              }}
            >
              <span style={{ fontWeight: '700' }}>Bolsa</span>
              <span
                className="cart-badge"
                style={{
                  backgroundColor: '#fa6338',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '2px 7px',
                  fontSize: '0.75rem',
                  fontWeight: '800'
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
            backgroundColor: 'rgba(0,0,0,0.45)',
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
              boxShadow: '-4px 0 16px rgba(0,0,0,0.12)',
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
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
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
        <Outlet context={{ addToCart, openCart: () => setIsCartOpen(true) }} />
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
          <Route path="/admin" element={<AdminPanel />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
