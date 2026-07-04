'use client';

/**
 * Client-side shopping-cart state.
 *
 * Provides a React context that holds the cart line items and exposes mutation
 * helpers (add/remove/update/toggle installation/clear) plus derived totals.
 * The cart is persisted to `localStorage` under {@link CART_KEY} so it survives
 * reloads, and is hydrated lazily after the first client render to avoid a
 * server/client markup mismatch. Consume it via the {@link useCart} hook.
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

/** A single line in the cart. A product+variant combination is one distinct line. */
export interface CartItem {
  /** Product (artikel) UUID. */
  artikel_id: string;
  /** Optional selected variant id; distinct variants are separate cart lines. */
  variant_id?: string;
  /** Product slug for building links back to the product page. */
  slug?: string;
  /** Display title. */
  titel: string;
  /** Human-readable article number (SKU). */
  artikelnummer: string;
  /** Gross unit price in EUR (incl. VAT). */
  preis_brutto: number;
  /** Optional discounted gross unit price; when set it overrides `preis_brutto`. */
  rabattpreis: number | null;
  /** Quantity (always ≥ 1 while in the cart). */
  menge: number;
  /** Thumbnail URL, or null when the product has no image. */
  bild_url: string | null;
  /** Whether the customer opted to add professional installation. */
  mit_installation: boolean;
  /** The installation service (dienstleistung) id when installation is selected. */
  dienstleistung_id: string | null;
}

/** Shape of the cart context value exposed to consumers. */
interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'menge'> & { menge?: number }) => void;
  removeItem: (artikel_id: string, variant_id?: string) => void;
  updateQuantity: (artikel_id: string, menge: number, variant_id?: string) => void;
  toggleInstallation: (artikel_id: string, mit_installation: boolean, dienstleistung_id?: string, variant_id?: string) => void;
  clearCart: () => void;
  /** Total unit count across all lines. */
  itemCount: number;
  /** Gross total in EUR (uses `rabattpreis` when present). */
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/** localStorage key under which the cart is persisted. */
const CART_KEY = 'kks-cart';

/**
 * Context provider that owns cart state and localStorage persistence.
 *
 * Wrap the app (or the shop subtree) in this provider so descendants can call
 * {@link useCart}. Hydration from localStorage happens once after mount; the
 * first render always uses an empty cart to keep SSR and client markup in sync.
 *
 * @param props.children - The subtree that may consume the cart.
 */
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

  /**
   * Add an item to the cart, or increase quantity if the same product+variant
   * is already present. Quantity defaults to 1 and is floored at 1.
   */
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

  /** Remove the line matching the given product+variant from the cart. */
  const removeItem = useCallback((artikel_id: string, variant_id?: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.artikel_id === artikel_id && i.variant_id === variant_id))
    );
  }, []);

  /** Set a line's quantity; a quantity ≤ 0 removes the line entirely. */
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

  /**
   * Toggle the installation add-on for a line and attach/detach the associated
   * installation service (dienstleistung).
   */
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

  /** Empty the cart entirely. */
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

/**
 * Access the cart context.
 *
 * @returns The cart state and mutation helpers.
 * @throws {Error} If called outside a {@link CartProvider}.
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}


