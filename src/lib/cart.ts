
import { useCallback, useEffect, useState } from "react";

export type CartItem = {
  productId: string;
  name: string;
  imageUrl: string | null;
  originalPrice: number;
  sellingPrice: number;
  quantity: number;
  stock: number;
};

const CART_STORAGE_KEY = "kisaan-accessories-cart";
const CART_EVENT = "kisaan-cart-updated";

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item["productId"] === "string" &&
    typeof item["name"] === "string" &&
    (typeof item["imageUrl"] === "string" ||
      item["imageUrl"] === null) &&
    typeof item["originalPrice"] === "number" &&
    typeof item["sellingPrice"] === "number" &&
    typeof item["quantity"] === "number" &&
    typeof item["stock"] === "number"
  );
}

function readCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(
      CART_STORAGE_KEY,
    );

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isCartItem);
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(items),
  );

  window.dispatchEvent(
    new CustomEvent(CART_EVENT),
  );
}

export function getCart(): CartItem[] {
  return readCart();
}

export function addToCart(item: CartItem): boolean {
  if (item.stock <= 0) {
    return false;
  }

  const cart = readCart();

  const existingIndex = cart.findIndex(
    (cartItem) =>
      cartItem.productId === item.productId,
  );

  if (existingIndex === -1) {
    saveCart([
      ...cart,
      {
        productId: item.productId,
        name: item.name,
        imageUrl: item.imageUrl,
        originalPrice: item.originalPrice,
        sellingPrice: item.sellingPrice,
        quantity: 1,
        stock: item.stock,
      },
    ]);

    return true;
  }

  const existingItem = cart[existingIndex];

  if (!existingItem) {
    return false;
  }

  if (existingItem.quantity >= item.stock) {
    return false;
  }

  const updatedCart = cart.map(
    (cartItem, index) => {
      if (index !== existingIndex) {
        return cartItem;
      }

      return {
        productId: existingItem.productId,
        name: item.name,
        imageUrl: item.imageUrl,
        originalPrice: item.originalPrice,
        sellingPrice: item.sellingPrice,
        quantity: existingItem.quantity + 1,
        stock: item.stock,
      };
    },
  );

  saveCart(updatedCart);

  return true;
}

export function updateCartQuantity(
  productId: string,
  quantity: number,
): boolean {
  const cart = readCart();

  const index = cart.findIndex(
    (item) => item.productId === productId,
  );

  if (index === -1) {
    return false;
  }

  const item = cart[index];

  if (!item) {
    return false;
  }

  const safeQuantity = Math.max(
    1,
    Math.min(quantity, item.stock),
  );

  const updatedCart = cart.map(
    (cartItem, cartIndex) => {
      if (cartIndex !== index) {
        return cartItem;
      }

      return {
        productId: cartItem.productId,
        name: cartItem.name,
        imageUrl: cartItem.imageUrl,
        originalPrice: cartItem.originalPrice,
        sellingPrice: cartItem.sellingPrice,
        quantity: safeQuantity,
        stock: cartItem.stock,
      };
    },
  );

  saveCart(updatedCart);

  return true;
}

export function removeFromCart(
  productId: string,
): void {
  const cart = readCart();

  saveCart(
    cart.filter(
      (item) => item.productId !== productId,
    ),
  );
}

export function clearCart(): void {
  saveCart([]);
}

export function getCartItemCount(): number {
  return readCart().reduce(
    (total, item) => total + item.quantity,
    0,
  );
}

export function getCartTotal(): number {
  return readCart().reduce(
    (total, item) =>
      total +
      item.sellingPrice * item.quantity,
    0,
  );
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(
    [],
  );

  const refresh = useCallback(() => {
    setItems(readCart());
  }, []);

  useEffect(() => {
    refresh();

    const handleCartUpdate = () => {
      refresh();
    };

    window.addEventListener(
      CART_EVENT,
      handleCartUpdate,
    );

    return () => {
      window.removeEventListener(
        CART_EVENT,
        handleCartUpdate,
      );
    };
  }, [refresh]);

  const total = items.reduce(
    (sum, item) =>
      sum +
      item.sellingPrice * item.quantity,
    0,
  );

  const itemCount = items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return {
    items,
    total,
    itemCount,
    updateQuantity: updateCartQuantity,
    removeItem: removeFromCart,
    clear: clearCart,
    refresh,
  };
}

