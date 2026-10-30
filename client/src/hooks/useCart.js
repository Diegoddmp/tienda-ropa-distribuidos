import { useState } from 'react';

export function useCart() {
  const [cart, setCart] = useState([]);

  const addToCart = (product, selectedVariant) => {
    if (!selectedVariant) {
      alert('Por favor selecciona una variante disponible antes de agregar a la bolsa.');
      return;
    }

    const varianteId = Number(selectedVariant.variante_id ?? selectedVariant.id);
    const stockDisponible = Number(selectedVariant.stock ?? 0);

    if (!varianteId || stockDisponible <= 0) {
      alert('Esta variante no tiene stock disponible.');
      return;
    }

    const precioUnitario = Number(product.precio ?? product.price ?? 0);
    const nombreProducto = product.nombre || product.name || 'Prenda';
    const talla = selectedVariant.talla || selectedVariant.size || 'UNICA';
    const color = selectedVariant.color || '';

    setCart((prevCart) => {
      const itemIndex = prevCart.findIndex(
        (item) => item.variante_id === varianteId
      );

      if (itemIndex > -1) {
        const item = prevCart[itemIndex];
        if (item.quantity >= stockDisponible) {
          alert(
            `Stock máximo alcanzado (${stockDisponible} unidades) para ${nombreProducto} (${talla}${color ? ' · ' + color : ''}).`
          );
          return prevCart;
        }

        const updated = [...prevCart];
        const nuevaCantidad = item.quantity + 1;
        updated[itemIndex] = {
          ...item,
          stock: stockDisponible,
          quantity: nuevaCantidad,
          subtotal: nuevaCantidad * item.price,
        };
        return updated;
      }

      return [
        ...prevCart,
        {
          variante_id: varianteId,
          id: product.id,
          name: nombreProducto,
          price: precioUnitario,
          size: talla,
          color,
          stock: stockDisponible,
          quantity: 1,
          subtotal: precioUnitario,
        },
      ];
    });
  };

  const updateQuantity = (varianteId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(varianteId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.variante_id === varianteId) {
          const validQty = Math.min(newQuantity, item.stock);
          return {
            ...item,
            quantity: validQty,
            subtotal: validQty * item.price,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (varianteId) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.variante_id !== varianteId)
    );
  };

  const clearCart = () => setCart([]);

  const totalAmount = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalAmount,
    totalItemsCount,
  };
}
