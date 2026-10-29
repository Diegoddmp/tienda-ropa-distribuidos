import { BrowserRouter, Routes, Route, Link, Outlet } from 'react-router-dom';
import ProductCatalog from './components/ProductCatalog';
import ProductDetail from './pages/productDetail';
import AdminPanel from './components/AdminPanel';
import './App.css';

function StorefrontLayout() {
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
          </ul>

          <div className="shein-header-actions">
            <button type="button" className="shein-icon-btn">
              <span>Bolsa</span>
              <span className="cart-badge">0</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="shein-main">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
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

export default App;
