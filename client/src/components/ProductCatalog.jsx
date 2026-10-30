import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import socket from '../services/socket';

const ProductCatalog = () => {
  const { addToCart } = useOutletContext() || {};
  const [products, setProducts] = useState([]);
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/productos');

      if (!response.ok) {
        throw new Error('Error al obtener los productos');
      }

      const data = await response.json();
      setProducts(data);

      // Seleccionar por defecto la primera variante con stock de cada producto
      setSelectedVariantByProduct((prev) => {
        const next = { ...prev };
        data.forEach((product) => {
          const variantesConStock = (product.variantes || []).filter((v) => v.stock > 0);
          const currentSelected = next[product.id];
          const stillValid =
            currentSelected &&
            variantesConStock.some((v) => v.id === currentSelected.id);

          if (!stillValid) {
            next[product.id] = variantesConStock[0] || null;
          } else {
            // Actualizar stock de la variante seleccionada
            next[product.id] = variantesConStock.find((v) => v.id === currentSelected.id);
          }
        });
        return next;
      });

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();

    // Escuchar actualizaciones de inventario en tiempo real
    socket.on('inventory:update', fetchProducts);
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('inventory:update', fetchProducts);
    };
  }, [fetchProducts]);

  const handleSelectVariant = (productId, variante) => {
    setSelectedVariantByProduct((prev) => ({
      ...prev,
      [productId]: variante,
    }));
  };

  const handleAddFromCatalog = (product, variantesConStock) => {
    if (!addToCart || variantesConStock.length === 0) return;
    const chosenVariant =
      selectedVariantByProduct[product.id] || variantesConStock[0];
    addToCart(product, chosenVariant);
  };

  if (loading) {
    return <div className="shein-status-box">Cargando tendencia...</div>;
  }

  if (error) {
    return (
      <div className="shein-status-box" style={{ color: '#fa6338' }}>
        <h3>No se pudo conectar con el catálogo</h3>
        <p style={{ marginTop: '8px' }}>Detalle: {error}</p>
      </div>
    );
  }

  // Categorías únicas extraídas de los productos
  const categories = ['TODAS', ...new Set(products.map((p) => p.categoria).filter(Boolean))];

  // Filtrado por categoría y texto de búsqueda
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
          <h2>Colección Esenciales</h2>
          <p>Descubre las prendas más buscadas con disponibilidad en tiempo real.</p>
        </div>
         Llamado a la acción promocional (comentado para uso futuro)
        <div className="shein-hero-promo-box">
          <strong>HASTA -40%</strong>
          <span>En artículos seleccionados</span>
        </div>

      </section>*/}

      {/* Barra de filtros por categoría y buscador */}
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
            const agotado = variantesConStock.length === 0;
            const selectedVariant =
              selectedVariantByProduct[product.id] || variantesConStock[0] || null;

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

                  <button
                    type="button"
                    className="shein-quick-add"
                    disabled={agotado}
                    onClick={() => handleAddFromCatalog(product, variantesConStock)}
                  >
                    {agotado
                      ? 'Sin Stock'
                      : `+ Añadir (${selectedVariant?.talla}${selectedVariant?.color ? ' · ' + selectedVariant.color : ''})`}
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
                    {selectedVariant && !agotado && (
                      <span style={{ fontSize: '0.72rem', color: '#767676' }}>
                        Stock: {selectedVariant.stock}
                      </span>
                    )}
                  </div>

                  {/* Botones interactivos de tallas / variantes */}
                  <div className="shein-sizes-row">
                    {variantes.length > 0 ? (
                      variantes.map((v) => {
                        const isSelected = selectedVariant?.id === v.id;
                        const sinStock = v.stock <= 0;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            disabled={sinStock}
                            onClick={() => handleSelectVariant(product.id, v)}
                            className={`shein-size-chip ${isSelected ? 'selected' : ''}`}
                            title={
                              sinStock
                                ? `${v.talla} (${v.color}) - Agotado`
                                : `${v.talla} (${v.color}) - ${v.stock} disponibles`
                            }
                          >
                            {v.talla}
                            {variantes.some(
                              (other) => other.id !== v.id && other.talla === v.talla
                            )
                              ? ` · ${v.color}`
                              : ''}
                          </button>
                        );
                      })
                    ) : (
                      <span className="shein-size-chip" style={{ cursor: 'default' }}>
                        Sin tallas disponibles
                      </span>
                    )}
                  </div>

                  <div className="shein-card-actions">
                    <Link to={`/producto/${product.id}`} className="shein-btn-outline">
                      Ver detalle
                    </Link>
                    <button
                      type="button"
                      className="shein-btn-primary"
                      disabled={agotado}
                      onClick={() => handleAddFromCatalog(product, variantesConStock)}
                    >
                      {agotado ? 'Agotado' : 'Agregar'}
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
