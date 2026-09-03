import { create } from 'zustand';
import { supabase } from './supabase';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  available: boolean;
  preparation_time?: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface POSState {
  products: Product[];
  cart: CartItem[];
  loading: boolean;
  fetchProducts: (restaurantId: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
  addToCart: (product: Product) => void;
  updateCartQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  createOrder: (orderData: {
    restaurant_id: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    items: { name: string; price: number; quantity: number }[];
    subtotal: number;
    tax: number;
    total: number;
    customer_name: string;
    customer_phone: string;
    customer_email?: string | null;
    payment_method: string;
  }) => Promise<any>;
}

let currentRestaurantId: string | null = null;

export const usePOSStore = create<POSState>((set, get) => ({
  products: [],
  cart: [],
  loading: false,

  fetchProducts: async (restaurantId: string) => {
    currentRestaurantId = restaurantId;
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('menu')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true });
      if (error) throw error;
      set({ products: (data as Product[]) || [] });
    } catch (err) {
      console.error('Error fetching products:', err);
      set({ products: [] });
    } finally {
      set({ loading: false });
    }
  },

  refreshProducts: async () => {
    if (currentRestaurantId) {
      await get().fetchProducts(currentRestaurantId);
    }
  },

  addToCart: (product: Product) => {
    const cart = get().cart;
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      set({
        cart: cart.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      set({
        cart: [
          ...cart,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
          },
        ],
      });
    }
  },

  updateCartQuantity: (id: string, quantity: number) => {
    if (quantity <= 0) {
      set({ cart: get().cart.filter((i) => i.id !== id) });
    } else {
      set({
        cart: get().cart.map((i) => (i.id === id ? { ...i, quantity } : i)),
      });
    }
  },

  clearCart: () => set({ cart: [] }),

  getCartTotal: () => {
    return get().cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  createOrder: async (orderData) => {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id: orderData.restaurant_id,
        razorpay_order_id: orderData.razorpay_order_id || null,
        razorpay_payment_id: orderData.razorpay_payment_id || null,
        items: orderData.items,
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        total: orderData.total,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        customer_email: orderData.customer_email || null,
        payment_method: orderData.payment_method,
        status: 'pending',
        order_type: 'customer',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      throw error;
    }

    return data;
  },
}));
