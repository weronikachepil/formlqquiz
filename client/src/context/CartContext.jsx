import { createContext, useCallback, useContext, useEffect, useState } from "react";

const CART_KEY = "formlq_cart";
const CartContext = createContext(null);

function readCart() {
  try {
    const data = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function defaultFormatsFor(product) {
  const formats = {};
  (product.formats || []).forEach((f, i) => {
    formats[f] = i === 0;
  });
  return formats;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readCart());

  useEffect(() => {
    writeCart(items);
  }, [items]);

  const addToCart = useCallback((productId, formats) => {
    setItems((prev) => {
      if (prev.some((item) => item.productId === productId)) return prev;
      return [...prev, { productId, addedAt: Date.now(), formats: formats || {} }];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const updateFormats = useCallback((productId, formats) => {
    setItems((prev) => prev.map((item) => (item.productId === productId ? { ...item, formats } : item)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const isInCart = useCallback((productId) => items.some((item) => item.productId === productId), [items]);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateFormats, clearCart, isInCart, count: items.length }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
