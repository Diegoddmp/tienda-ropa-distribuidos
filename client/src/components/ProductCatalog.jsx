import React from 'react';
import { products } from '../data/mockProducts';

const ProductCatalog = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Catálogo de Prendas</h2>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {products.map((product) => {
          // Extraemos las tallas únicas recorriendo las variantes del producto
          const tallasUnicas = [...new Set(product.variantes.map(v => v.talla))];

          return (
            <div key={product.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', width: '250px', backgroundColor: '#fff' }}>
              <img 
                src={product.imagen_url} 
                alt={product.nombre} 
                style={{ width: '100%', borderRadius: '4px', objectFit: 'cover' }} 
              />
              <h3 style={{ margin: '10px 0 5px' }}>{product.nombre}</h3>
              <span style={{ backgroundColor: '#eee', padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                {product.categoria.nombre}
              </span>
              <p style={{ color: '#555', fontSize: '0.9rem', height: '40px', overflow: 'hidden' }}>
                {product.descripcion}
              </p>
              <p style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '10px 0' }}>
                ${product.precio.toFixed(2)}
              </p>
              
              <div style={{ marginBottom: '15px', fontSize: '0.9rem' }}>
                <strong>Tallas disponibles: </strong>
                {tallasUnicas.length > 0 ? tallasUnicas.join(', ') : 'Agotado'}
              </div>
              
              {/* El Integrante 2 (Carrito) le dará funcionalidad a este botón después */}
              <button href="#"style={{ width: '100%', padding: '10px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                Agregar al carrito
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductCatalog;