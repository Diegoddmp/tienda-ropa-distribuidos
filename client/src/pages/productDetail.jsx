import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [variantes, setVariantes] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProductAndInventory = async () => {
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

        const firstAvailable = invData.find((v) => v.stock > 0) || invData[0] || null;
        setSelectedVariant(firstAvailable);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndInventory();
  }, [id]);

  if (loading) {
    return <div className="shein-status-box">Cargando prenda...</div>;
  }

  if (error || !product) {
    return (
      <div className="shein-status-box">
        <h2>Producto no encontrado</h2>
        <p style={{ marginTop: "10px" }}>
          <Link to="/" className="shein-btn-outline" style={{ display: "inline-block" }}>
            ← Volver al catálogo
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Migas de pan */}
      <nav className="shein-breadcrumb">
        <Link to="/">Inicio</Link> / <span>{product.nombre}</span>
      </nav>

      <div className="shein-detail-layout">
        {/* Columna izquierda: Imagen */}
        <div className="shein-detail-image-box">
          <img
            src={
              product.imagen_url ||
              "https://placehold.co/600x800/f3f3f3/222222?text=SHEIN"
            }
            alt={product.nombre}
          />
        </div>

        {/* Columna derecha: Información y compra */}
        <div className="shein-detail-info">
          <h1>{product.nombre}</h1>
          <div className="shein-sku">SKU: SHN-2026-00{product.id}</div>

          <div className="shein-detail-price-box">
            <span className="shein-detail-price">
              ${parseFloat(product.precio).toFixed(2)}
            </span>
            <span className="shein-tax-note">IVA incluido</span>
          </div>

          <p style={{ marginBottom: "22px", lineHeight: "1.5", color: "#444", fontSize: "0.92rem" }}>
            {product.descripcion || "Prenda de temporada con corte cómodo y materiales de alta calidad."}
          </p>

          {/* Selector de Talla y Color según inventario real */}
          {variantes.length > 0 && (
            <div>
              <div className="shein-section-label">
                Talla / Color{" "}
                {selectedVariant && (
                  <span style={{ fontWeight: 400, color: "#767676" }}>
                    — Stock disponible: {selectedVariant.stock} uds.
                  </span>
                )}
              </div>

              <div className="shein-variant-pills">
                {variantes.map((v) => {
                  const isSelected = selectedVariant?.variante_id === v.variante_id;
                  return (
                    <button
                      key={v.variante_id}
                      type="button"
                      disabled={v.stock <= 0}
                      onClick={() => setSelectedVariant(v)}
                      className={`shein-variant-pill ${isSelected ? "selected" : ""}`}
                    >
                      {v.talla} · {v.color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            className="shein-cta-big"
            disabled={selectedVariant && selectedVariant.stock <= 0}
          >
            Añadir a la bolsa
          </button>

          <div className="shein-perks-box">
            <div>✓ <strong>Envío Gratis</strong> en pedidos superiores a $29.99</div>
            <div>✓ <strong>Devolución gratuita</strong> durante los primeros 30 días</div>
            <div>✓ <strong>Stock verificado</strong> en tiempo real desde nuestra base de datos</div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <Link to="/" className="shein-btn-outline" style={{ display: "inline-block" }}>
              ← Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
