'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface CartItem {
  artikel_id: string;
  titel: string;
  artikelnummer: string;
  preis_brutto: number;
  rabattpreis: number | null;
  menge: number;
  bild_url: string | null;
  mit_installation: boolean;
  dienstleistung_id: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'menge'>) => void;
  removeItem: (artikel_id: string) => void;
  updateQuantity: (artikel_id: string, menge: number) => void;
  toggleInstallation: (artikel_id: string, mit_installation: boolean, dienstleistung_id?: string) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = 'said-klima-cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'menge'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.artikel_id === item.artikel_id);
      if (existing) {
        return prev.map((i) =>
          i.artikel_id === item.artikel_id ? { ...i, menge: i.menge + 1 } : i
        );
      }
      return [...prev, { ...item, menge: 1 }];
    });
  }, []);

  const removeItem = useCallback((artikel_id: string) => {
    setItems((prev) => prev.filter((i) => i.artikel_id !== artikel_id));
  }, []);

  const updateQuantity = useCallback((artikel_id: string, menge: number) => {
    if (menge <= 0) {
      setItems((prev) => prev.filter((i) => i.artikel_id !== artikel_id));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.artikel_id === artikel_id ? { ...i, menge } : i))
    );
  }, []);

  const toggleInstallation = useCallback((artikel_id: string, mit_installation: boolean, dienstleistung_id?: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.artikel_id === artikel_id
          ? { ...i, mit_installation, dienstleistung_id: dienstleistung_id || null }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.menge, 0);

  const total = items.reduce((sum, i) => {
    const price = i.rabattpreis ?? i.preis_brutto;
    return sum + price * i.menge;
  }, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, toggleInstallation, clearCart, itemCount, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}


