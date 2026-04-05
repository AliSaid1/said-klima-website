'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

export interface CartItem {
  artikel_id: string;
  variant_id?: string;
  slug?: string;
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
  addItem: (item: Omit<CartItem, 'menge'> & { menge?: number }) => void;
  removeItem: (artikel_id: string, variant_id?: string) => void;
  updateQuantity: (artikel_id: string, menge: number, variant_id?: string) => void;
  toggleInstallation: (artikel_id: string, mit_installation: boolean, dienstleistung_id?: string, variant_id?: string) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = 'kks-cart';

export function CartProvider({ children }: { children: ReactNode }) {
  // Read localStorage once to seed the initial state, but defer it to avoid
  // a server/client mismatch.  The first render always uses [].
  const hydratedRef = useRef(false);

  const [items, setItems] = useState<CartItem[]>([]);

  // Hydrate from localStorage after the first client render
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    try {
      const stored = localStorage.getItem(CART_KEY);
      if (stored) {
        const parsed: CartItem[] = JSON.parse(stored);
        if (parsed.length) setItems(parsed); // eslint-disable-line react-hooks/set-state-in-effect
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  // Persist to localStorage (skip the very first render which is still [])
  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'menge'> & { menge?: number }) => {
    const qty = Math.max(1, item.menge ?? 1);
    // Strip the optional menge key before spreading so the CartItem shape stays clean.
    const { menge: _qty, ...rest } = item as any;
    setItems((prev) => {
      // Key on BOTH artikel_id and variant_id — different variants must be separate cart entries
      const existing = prev.find(
        (i) => i.artikel_id === rest.artikel_id && i.variant_id === rest.variant_id,
      );
      if (existing) {
        return prev.map((i) =>
          i.artikel_id === rest.artikel_id && i.variant_id === rest.variant_id
            ? { ...i, menge: i.menge + qty }
            : i
        );
      }
      return [...prev, { ...rest, menge: qty }];
    });
  }, []);

  const removeItem = useCallback((artikel_id: string, variant_id?: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.artikel_id === artikel_id && i.variant_id === variant_id))
    );
  }, []);

  const updateQuantity = useCallback((artikel_id: string, menge: number, variant_id?: string) => {
    if (menge <= 0) {
      setItems((prev) =>
        prev.filter((i) => !(i.artikel_id === artikel_id && i.variant_id === variant_id))
      );
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.artikel_id === artikel_id && i.variant_id === variant_id ? { ...i, menge } : i
      )
    );
  }, []);

  const toggleInstallation = useCallback(
    (artikel_id: string, mit_installation: boolean, dienstleistung_id?: string, variant_id?: string) => {
      setItems((prev) =>
        prev.map((i) =>
          i.artikel_id === artikel_id && i.variant_id === variant_id
            ? { ...i, mit_installation, dienstleistung_id: dienstleistung_id || null }
            : i
        )
      );
    },
    [],
  );

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


