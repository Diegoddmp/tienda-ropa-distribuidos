import React from "react";
import { useParams } from "react-router-dom";
import { products } from "../data/mockProducts";

const ProductDetail = () => {
    const { productId } = useParams();

    const product = products.find((p) => p.id === parseInt(productId));

    if (!product) {
        return (
        <div>
            <h2>Producto no encontrado</h2>
            <Link to="/">Volver al catálogo</Link>
        </div>
    );
    }

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <img src={product.imagen_url} alt={product.nombre} style={{ width: "300px", borderRadius: "4px", objectFit: "cover" }} />
            <h2>{product.nombre}</h2>
            <p><strong>Categoría:</strong> {product.categoria.nombre}</p>
        </div>

        <div>
            
        </div>

    )
};