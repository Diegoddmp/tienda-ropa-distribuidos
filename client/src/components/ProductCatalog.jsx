import { useState, useEffect, useCallback } from 'react';
import ProductImage from './ProductImage';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import socket from '../services/socket';

const ProductCatalog = () => {
  const { hash } = useLocation();
  const { addToCart } = useOutletContext() || {};
  const [products, setProducts] = useState([]);
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && !error && hash === '#catalogo') {
      document.getElementById('catalogo')?.scrollIntoView();
    }
  }, [loading, error, hash]);

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
    return <div className="fashion-status" role="status"><span className="fashion-eyebrow">La colección</span><h1>Preparando tu próxima inspiración…</h1><p>Cargando prendas disponibles.</p></div>;
  }

  if (error) {
    return (
      <div className="fashion-status" role="alert">
        <span className="fashion-eyebrow">Un momento, por favor</span>
        <h1>No pudimos cargar la colección.</h1>
        <p>{error}. Vuelve a intentarlo en unos instantes.</p>
        <button type="button" className="fashion-btn-primary" onClick={fetchProducts}>Volver a intentar</button>
      </div>
    );
  }

  const categories = ['TODAS', ...new Set(products.map((p) => p.categoria).filter(Boolean))];
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'TODAS' || product.categoria === selectedCategory;
    const matchesSearch =
      product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fashion-catalog">
      <section className="fashion-intro" aria-labelledby="collection-title">
        <div>
          <span className="fashion-eyebrow">El guardarropa cotidiano</span>
          <h1 id="collection-title">Esenciales con <em>carácter.</em></h1>
        </div>
        <div className="fashion-intro-note">
          <span className="fashion-editorial-mark" aria-hidden="true">01 / COLECCIÓN</span>
          <p>Encuentra tu próxima prenda favorita.<br />Hazla parte de tu día a día.</p>
          <a href="#catalogo">Explorar la colección <span aria-hidden="true">↓</span></a>
        </div>
      </section>
      <section id="catalogo" className="fashion-collection" aria-label="Catálogo de productos">
        <div className="fashion-collection-heading">
          <h2>La colección</h2>
          <span role="status">{filteredProducts.length} {filteredProducts.length === 1 ? 'prenda' : 'prendas'}</span>
        </div>
        <div className="fashion-toolbar">
          <div className="fashion-categories" role="group" aria-label="Filtrar por categoría">
            {categories.map((cat) => (
              <button key={cat} type="button" className={`fashion-category ${selectedCategory === cat ? 'active' : ''}`} aria-pressed={selectedCategory === cat} onClick={() => setSelectedCategory(cat)}>
                {cat === 'TODAS' ? 'Ver todo' : cat}
              </button>
            ))}
          </div>
          <form className="fashion-search" role="search" onSubmit={(e) => e.preventDefault()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.4"/></svg>
            <input type="search" aria-label="Buscar prendas" placeholder="Buscar una prenda…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <button type="submit" aria-label="Buscar">↗</button>
          </form>
        </div>
        {filteredProducts.length === 0 ? (
          <div className="fashion-status">
            <span className="fashion-empty-symbol" aria-hidden="true">＋</span>
            <h2>{products.length === 0 ? 'Lo próximo está por llegar.' : 'Tu próxima prenda sigue por descubrir.'}</h2>
            <p>{products.length === 0 ? 'Muy pronto encontrarás aquí las prendas disponibles. Vuelve a explorar la colección más adelante.' : 'Prueba con otra búsqueda o explora todas las categorías.'}</p>
            {products.length > 0 && <button type="button" className="fashion-btn-outline" onClick={() => { setSelectedCategory('TODAS'); setSearchTerm(''); }}>Ver toda la colección</button>}
          </div>
        ) : (
          <div className="fashion-product-grid">
            {filteredProducts.map((product) => {
              const variantes = product.variantes || [];
              const variantesConStock = variantes.filter((v) => v.stock > 0);
              const agotado = variantesConStock.length === 0;
              const selectedVariant = selectedVariantByProduct[product.id] || variantesConStock[0] || null;
              return (
                <article key={product.id} className="fashion-card">
                  <div className="fashion-card-image">
                    <Link to={`/producto/${product.id}`} aria-label={`Ver ${product.nombre}`}>
                      <ProductImage src={product.imagen_url} alt={product.nombre} />
                    </Link>
                    {agotado && <span className="fashion-stock-tag">Agotado</span>}
                    <button type="button" className="fashion-quick-add" disabled={agotado} onClick={() => handleAddFromCatalog(product, variantesConStock)}>
                      {agotado ? 'Sin stock' : `+ Añadir (${selectedVariant?.talla}${selectedVariant?.color ? ' · ' + selectedVariant.color : ''})`}
                    </button>
                  </div>
                  <div className="fashion-card-body">
                    <p className="fashion-card-category">{product.categoria || 'Colección'}</p>
                    <div className="fashion-card-heading">
                      <h3><Link to={`/producto/${product.id}`} className="fashion-card-title">{product.nombre}</Link></h3>
                      <span className="fashion-price">${parseFloat(product.precio).toFixed(2)}</span>
                    </div>
                    <div className="fashion-card-availability">
                      <span>Talla{selectedVariant?.color ? ` · ${selectedVariant.color}` : ''}</span>
                      {selectedVariant && !agotado && <span>{selectedVariant.stock} disponibles</span>}
                    </div>
                    <div className="fashion-sizes" role="group" aria-label={`Tallas y colores de ${product.nombre}`}>
                      {variantes.length > 0 ? variantes.map((v) => (
                        <button key={v.id} type="button" disabled={v.stock <= 0} aria-pressed={selectedVariant?.id === v.id} onClick={() => handleSelectVariant(product.id, v)} className={`fashion-size ${selectedVariant?.id === v.id ? 'selected' : ''}`} title={`${v.talla}${v.color ? ' · ' + v.color : ''} — ${v.stock <= 0 ? 'Agotado' : v.stock + ' disponibles'}`}>
                          {v.talla}{variantes.some((other) => other.id !== v.id && other.talla === v.talla) ? ` · ${v.color}` : ''}
                        </button>
                      )) : <span className="fashion-muted">Sin tallas disponibles</span>}
                    </div>
                    <div className="fashion-card-actions">
                      <Link to={`/producto/${product.id}`} className="fashion-btn-outline">Ver detalle <span aria-hidden="true">↗</span></Link>
                      <button type="button" className="fashion-btn-primary" disabled={agotado} onClick={() => handleAddFromCatalog(product, variantesConStock)}>{agotado ? 'Agotado' : 'Agregar +'}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductCatalog;
