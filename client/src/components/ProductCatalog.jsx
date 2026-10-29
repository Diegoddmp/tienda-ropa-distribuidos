import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/productos');

        if (!response.ok) {
          throw new Error('Error al obtener los productos');
        }

        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return <div className="shein-status-box">Cargando tendencia...</div>;
  }

  if (error) {
    return (
      <div className="shein-status-box" style={{ color: '#fa6338' }}>
        <h3>No se pudo conectar con el catÃ¡logo</h3>
        <p style={{ marginTop: '8px' }}>Detalle: {error}</p>
      </div>
    );
  }

  // CategorÃ­as Ãºnicas extraÃ­das de los productos
  const categories = ['TODAS', ...new Set(products.map((p) => p.categoria).filter(Boolean))];

  // Filtrado por categorÃ­a y texto de bÃºsqueda
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === 'TODAS' || product.categoria === selectedCategory;
    const matchesSearch =
      product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      {/* Banner promocional estilo SHEIN
      <section className="shein-hero">
        <div>
          <span className="shein-hero-tag">Tendencia 2026</span>
          <h2>ColecciÃ³n Esenciales</h2>
          <p>Descubre las prendas mÃ¡s buscadas con disponibilidad en tiempo real.</p>
        </div>
         Llamado a la acciÃ³n promocional (comentado para uso futuro)
        <div className="shein-hero-promo-box">
          <strong>HASTA -40%</strong>
          <span>En artÃ­culos seleccionados</span>
        </div>

      </section>*/}

      {/* Barra de filtros por categorÃ­a y buscador */}
      <div className="catalog-toolbar">
        <div className="category-pills">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar prendas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="button" className="search-box-btn">
            Buscar
          </button>
        </div>
      </div>

      {/* Grid de productos */}
      {filteredProducts.length === 0 ? (
        <div className="shein-status-box">
          No se encontraron prendas que coincidan con tu filtro.
        </div>
      ) : (
        <div className="shein-product-grid">
          {filteredProducts.map((product) => {
            const variantes = product.variantes || [];
            const variantesConStock = variantes.filter((v) => v.stock > 0);
            const tallasUnicas = [...new Set(variantesConStock.map((v) => v.talla))];
            const agotado = variantes.length > 0 && tallasUnicas.length === 0;

            return (
              <div key={product.id} className="shein-card">
                <div className="shein-card-img-wrapper">
                  <Link to={`/producto/${product.id}`}>
                    <img
                      src={
                        product.imagen_url ||
                        'https://placehold.co/600x800/f3f3f3/222222?text=SHEIN'
                      }
                      alt={product.nombre}
                    />
                  </Link>

                  {product.categoria && (
                    <span className="shein-category-tag">{product.categoria}</span>
                  )}

                  {agotado && <span className="shein-stock-tag">Agotado</span>}

                  <button type="button" className="shein-quick-add" disabled={agotado}>
                    {agotado ? 'Sin Stock' : '+ AÃ±adir a la bolsa'}
                  </button>
                </div>

                <div className="shein-card-body">
                  <Link to={`/producto/${product.id}`} className="shein-card-title">
                    {product.nombre}
                  </Link>

                  <div className="shein-price-row">
                    <span className="shein-price">
                      ${parseFloat(product.precio).toFixed(2)}
                    </span>
                  </div>

                  <div className="shein-sizes-row">
                    {tallasUnicas.length > 0 ? (
                      tallasUnicas.map((talla) => (
                        <span key={talla} className="shein-size-chip">
                          {talla}
                        </span>
                      ))
                    ) : (
                      <span className="shein-size-chip">Sin tallas disponibles</span>
                    )}
                  </div>

                  <div className="shein-card-actions">
                    <Link to={`/producto/${product.id}`} className="shein-btn-outline">
                      Ver detalle
                    </Link>
                    <button type="button" className="shein-btn-primary" disabled={agotado}>
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
