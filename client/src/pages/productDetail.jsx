import { useState, useEffect, useCallback } from "react";
import ProductImage from "../components/ProductImage";
import { useParams, Link, useOutletContext } from "react-router-dom";
import socket from "../services/socket";

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useOutletContext() || {};
  const [product, setProduct] = useState(null);
  const [variantes, setVariantes] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProductAndInventory = useCallback(async () => {
    try {
      const [prodRes, invRes] = await Promise.all([
        fetch(`http://localhost:3000/api/productos/${id}`),
        fetch(`http://localhost:3000/api/inventario/producto/${id}`)
      ]);

      if (!prodRes.ok) {
        throw new Error("Producto no encontrado");
      }

      const prodData = await prodRes.json();
      const invData = invRes.ok ? await invRes.json() : [];

      setProduct(prodData);
      setVariantes(invData);

      setSelectedVariant((prev) => {
        if (prev) {
          const updatedPrev = invData.find((v) => v.variante_id === prev.variante_id);
          if (updatedPrev && updatedPrev.stock > 0) return updatedPrev;
        }
        return invData.find((v) => v.stock > 0) || invData[0] || null;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProductAndInventory();

    socket.on("inventory:update", fetchProductAndInventory);
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("inventory:update", fetchProductAndInventory);
    };
  }, [fetchProductAndInventory]);

  const handleAddToCart = () => {
    if (!addToCart || !product || !selectedVariant) return;
    addToCart(product, selectedVariant);
  };

  if (loading) {
    return <div className="fashion-status" role="status"><span className="fashion-eyebrow">Un momento</span><h1>Cargando tu próxima prenda…</h1></div>;
  }

  if (error || !product) {
    return (
      <div className="fashion-status" role="alert">
        <span className="fashion-eyebrow">La colección</span>
        <h1>No encontramos esta prenda.</h1>
        <p>Explora el catálogo para descubrir las prendas disponibles.</p>
        <Link to="/" className="fashion-btn-outline">← Volver al catálogo</Link>
      </div>
    );
  }

  const sinStockSeleccionado = !selectedVariant || selectedVariant.stock <= 0;

  return (
    <div className="fashion-detail">
      <nav className="fashion-breadcrumb" aria-label="Ruta de navegación">
        <Link to="/">Colección</Link><span aria-hidden="true">/</span><span aria-current="page">{product.nombre}</span>
      </nav>
      <div className="fashion-detail-layout">
        <div className="fashion-detail-image">
          <ProductImage key={product.id} src={product.imagen_url} alt={product.nombre} priority />
        </div>
        <div className="fashion-detail-info">
          <span className="fashion-eyebrow">{product.categoria || 'La colección'}</span>
          <h1>{product.nombre}</h1>
          <p className="fashion-reference">Referencia / {product.id}</p>
          <div className="fashion-detail-price">${parseFloat(product.precio).toFixed(2)}</div>
          <p className="fashion-description">{product.descripcion || 'Este producto aún no tiene una descripción disponible.'}</p>
          <div className="fashion-variant-section">
            <div className="fashion-variant-heading"><h2>Elige talla y color</h2><span>{selectedVariant && selectedVariant.stock > 0 ? `${selectedVariant.stock} disponibles` : 'Sin disponibilidad'}</span></div>
            {variantes.length > 0 ? (
              <div className="fashion-variants" role="group" aria-label="Tallas y colores disponibles">
                {variantes.map((v) => (
                  <button key={v.variante_id} type="button" disabled={v.stock <= 0} aria-pressed={selectedVariant?.variante_id === v.variante_id} onClick={() => setSelectedVariant(v)} className={`fashion-variant ${selectedVariant?.variante_id === v.variante_id ? 'selected' : ''}`}>
                    {v.talla}{v.color ? ` · ${v.color}` : ''}
                  </button>
                ))}
              </div>
            ) : <p className="fashion-muted">Sin tallas disponibles por el momento.</p>}
            {selectedVariant && <p className="fashion-selection">Tu selección: <strong>{selectedVariant.talla}{selectedVariant.color ? ` / ${selectedVariant.color}` : ''}</strong></p>}
          </div>
          <button type="button" className="fashion-btn-primary fashion-detail-cta" disabled={sinStockSeleccionado} onClick={handleAddToCart}>
            {sinStockSeleccionado ? 'Agotado' : 'Añadir a la bolsa'}<span aria-hidden="true">＋</span>
          </button>
          <div className="fashion-detail-note"><span aria-hidden="true">○</span><p>Disponibilidad actualizada en tiempo real.<br />Elige la variante que mejor va contigo.</p></div>
          <Link to="/" className="fashion-back-link">← Seguir explorando</Link>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
