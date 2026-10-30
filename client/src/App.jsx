import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import ProductCatalog from './components/ProductCatalog';
import ProductDetail from './pages/productDetail';
import AdminPanel from './components/AdminPanel';
import { ShoppingCart } from './components/ShoppingCart';
import CartDrawer from './components/CartDrawer';
import OrderTracking from './pages/OrderTracking';
import { readTrackedOrder, rememberTrackedOrder } from './services/orderTracking';
import { useCart } from './hooks/useCart';
import './App.css';
import './Storefront.css';

function StorefrontLayout() {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  // NUEVO: referencia local, obtenida únicamente de la respuesta de una compra exitosa.
  const [trackingOrderId, setTrackingOrderId] = useState(readTrackedOrder);

  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

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

    setOrderConfirmation(data.pedido);
    // NUEVO: habilita la demostración de seguimiento de este pedido, sin guardar datos personales.
    setTrackingOrderId(rememberTrackedOrder(data.pedido.id));

    clearCart();
    setIsCartOpen(false);
  };

  return (
    <div className="storefront fashion-store">
      <div className="fashion-announcement">EL ARTE DE VESTIR CADA DÍA</div>
      <header className="fashion-header">
        <Link to="/" className="fashion-wordmark" aria-label="Tienda de ropa, inicio">
          TIENDA <span>DE ROPA</span>
        </Link>
        <nav className="fashion-nav" aria-label="Navegación principal">
          <Link to="/" aria-current={location.pathname === '/' ? 'page' : undefined}>Colección</Link>
          <Link to={isAdmin ? '/admin' : '/#catalogo'} aria-current={isAdmin ? 'page' : undefined}>{isAdmin ? 'Administración' : 'Explorar prendas'}</Link>
          {trackingOrderId && <Link to={`/seguimiento/${trackingOrderId}`} aria-current={location.pathname.startsWith('/seguimiento/') ? 'page' : undefined}>Mi pedido</Link>}
        </nav>
        <div className="fashion-header-actions">
          <Link to={isAdmin ? '/' : '/admin'} className="fashion-admin-link">{isAdmin ? 'Ver tienda ↗' : 'Panel Admin'}</Link>
          <button type="button" className="fashion-bag" onClick={() => setIsCartOpen(!isCartOpen)} aria-expanded={isCartOpen} aria-label={`Abrir bolsa, ${totalItemsCount} artículos`}>
            <svg width="19" height="22" viewBox="0 0 24 26" fill="none" aria-hidden="true"><path d="M4 8h16l1 16H3L4 8Z" stroke="currentColor" strokeWidth="1.3"/><path d="M8 10V6a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.3"/></svg>
            <span>Bolsa</span><span className="fashion-bag-count">{totalItemsCount}</span>
          </button>
        </div>
      </header>

      {isCartOpen && (
        <CartDrawer onClose={() => setIsCartOpen(false)}>
          <ShoppingCart
            cart={cart}
            totalAmount={totalAmount}
            totalItemsCount={totalItemsCount}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onConfirmOrder={handleConfirmOrder}
            onContinueShopping={() => { setIsCartOpen(false); navigate('/'); }}
          />
        </CartDrawer>
      )}

      {orderConfirmation && (
        <div className="fashion-order-confirmation" role="status" aria-atomic="true">
          <span className="fashion-order-check" aria-hidden="true">✓</span>
          <div>
            <span className="fashion-eyebrow">Gracias por tu compra</span>
            <h2>Pedido #{orderConfirmation.id} confirmado.</h2>
            <p>{orderConfirmation.nombre_cliente} · ${parseFloat(orderConfirmation.total).toFixed(2)}</p>
            {trackingOrderId && <Link className="fashion-order-tracking-link" to={`/seguimiento/${trackingOrderId}`} onClick={() => setOrderConfirmation(null)}>Ver estado del pedido ↗</Link>}
          </div>
          <button type="button" className="fashion-cart-close" onClick={() => setOrderConfirmation(null)} aria-label="Cerrar confirmación del pedido">×</button>
        </div>
      )}

      {/* Contenido principal con acceso a la función addToCart para las rutas hijas */}
      <main className="fashion-main">
        <Outlet context={{ addToCart, openCart: () => setIsCartOpen(true), trackingOrderId }} />
      </main>
      <footer className="fashion-footer">
        <Link to="/" className="fashion-footer-brand">TIENDA DE ROPA</Link>
        <p>Tu estilo. Tu forma de llevarlo.</p>
        <Link to="/">Volver al catálogo <span aria-hidden="true">↗</span></Link>
      </footer>
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
          {/* NUEVO: conserva las rutas de los demás integrantes. */}
          <Route path="/seguimiento/:id" element={<OrderTracking />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
