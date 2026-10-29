import { useState } from 'react';

export function useCart() {
  const [cart, setCart] = useState([]);

  const addToCart = (product, selectedSize) => {
    if (!selectedSize) {
      alert('Por favor selecciona una talla antes de agregar al carrito.');
      return;
    }

    setCart((prevCart) => {
      const itemIndex = prevCart.findIndex(
        (item) => item.id === product.id && item.size === selectedSize
      );

      if (itemIndex > -1) {
        const item = prevCart[itemIndex];
        if (item.quantity >= item.stock) {
          alert(`Stock máximo alcanzado (${item.stock} unidades) para la talla ${selectedSize}.`);
          return prevCart;
        }

        const updated = [...prevCart];
        updated[itemIndex] = {
          ...item,
          quantity: item.quantity + 1,
          subtotal: (item.quantity + 1) * item.price,
        };
        return updated;
      }

      return [
        ...prevCart,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          size: selectedSize,
          stock: product.stock,
          quantity: 1,
          subtotal: Number(product.price),
        },
      ];
    });
  };

  const updateQuantity = (productId, size, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, size);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === productId && item.size === size) {
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

  const removeFromCart = (productId, size) => {
    setCart((prevCart) =>
      prevCart.filter((item) => !(item.id === productId && item.size === size))
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
