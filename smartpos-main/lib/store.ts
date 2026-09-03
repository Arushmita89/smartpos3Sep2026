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
  options?: string[];
}

export interface CartItem {
  id: string;
  key: string;
  name: string;
  price: number;
  quantity: number;
  options?: string[];
  notes?: string;
}

export interface ActiveOrder {
  id: number;
  items: { name: string; price: number; quantity: number; options?: string[]; notes?: string }[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
}

interface POSState {
  products: Product[];
  cart: CartItem[];
  loading: boolean;
  selectedTable: number;
  selectedTab: number;
  activeOrders: ActiveOrder[];
  activeOrdersLoading: boolean;
  setSelectedTable: (table: number, restaurantId?: string) => void;
  setSelectedTab: (tab: number, restaurantId?: string) => void;
  fetchActiveOrders: (restaurantId: string, tableNumber: number, tabNumber: number) => Promise<void>;
  fetchProducts: (restaurantId: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
  addToCart: (product: Product, options?: string[], notes?: string) => void;
  updateCartQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  settleTab: (restaurantId: string, tableNumber: number, tabNumber: number) => Promise<void>;
  settleOrdersWithPayment: (
    restaurantId: string,
    tableNumber: number,
    tabNumber: number,
    payment: { method: string; razorpayOrderId?: string; razorpayPaymentId?: string },
    excludeOrderId?: number
  ) => Promise<void>;
  createOrder: (orderData: {
    restaurant_id: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    items: { name: string; price: number; quantity: number; options?: string[]; notes?: string }[];
    subtotal: number;
    tax: number;
    total: number;
    customer_name: string;
    customer_phone: string;
    customer_email?: string | null;
    customer_address?: string | null;
    payment_method: string;
    order_type?: string;
    table_number?: number;
    tab_number?: number;
    estimated_delivery_time?: number | null;
    status?: string;
  }) => Promise<any>;
  lookupCustomerByPhone: (restaurantId: string, phone: string) => Promise<{ name: string; phone: string; email: string | null; address: string | null } | null>;
  upsertCustomer: (restaurantId: string, customer: { name: string; phone: string; email?: string; address?: string }) => Promise<void>;
}

let currentRestaurantId: string | null = null;
let activeOrdersFetchGeneration = 0;

export const usePOSStore = create<POSState>((set, get) => ({
  products: [],
  cart: [],
  loading: false,
  selectedTable: 1,
  selectedTab: 1,
  activeOrders: [],
  activeOrdersLoading: false,

  setSelectedTable: (table: number, restaurantId?: string) => {
    set({ selectedTable: table, selectedTab: 1 });
    if (restaurantId) {
      get().fetchActiveOrders(restaurantId, table, 1);
    }
  },

  setSelectedTab: (tab: number, restaurantId?: string) => {
    set({ selectedTab: tab });
    if (restaurantId) {
      get().fetchActiveOrders(restaurantId, get().selectedTable, tab);
    }
  },

  fetchActiveOrders: async (restaurantId: string, tableNumber: number, tabNumber: number) => {
    const generation = ++activeOrdersFetchGeneration;
    set({ activeOrdersLoading: true, activeOrders: [] });
    try {
      // Unpaid orders only: everything not yet settled and not cancelled,
      // so orders stay visible in the cart until Settle Now completes payment
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('table_number', tableNumber)
        .eq('tab_number', tabNumber)
        .not('status', 'in', '(settled,cancelled)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (generation !== activeOrdersFetchGeneration) return;
      set({ activeOrders: (data || []) as ActiveOrder[] });
    } catch (err) {
      console.error('Error fetching active orders:', err);
      set({ activeOrders: [] });
    } finally {
      set({ activeOrdersLoading: false });
    }
  },

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
      set({ products: ((data || []) as Product[]).map((p) => ({ ...p, options: p.options || [] })) });
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

  settleTab: async (restaurantId: string, tableNumber: number, tabNumber: number) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'settled', updated_at: new Date().toISOString() })
        .eq('restaurant_id', restaurantId)
        .eq('table_number', tableNumber)
        .eq('tab_number', tabNumber)
        .in('status', ['pending', 'in_progress']);
      if (error) throw error;
      set({ activeOrders: [], cart: [] });
    } catch (err) {
      console.error('Error settling tab:', err);
      throw err;
    }
  },

  settleOrdersWithPayment: async (restaurantId, tableNumber, tabNumber, payment, excludeOrderId) => {
    try {
      // Stamp every unpaid row (any kitchen status, including 'completed')
      let query = supabase
        .from('orders')
        .update({
          status: 'settled',
          payment_method: payment.method,
          razorpay_order_id: payment.razorpayOrderId || null,
          razorpay_payment_id: payment.razorpayPaymentId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('restaurant_id', restaurantId)
        .eq('table_number', tableNumber)
        .eq('tab_number', tabNumber)
        .not('status', 'in', '(settled,cancelled)');

      if (excludeOrderId) {
        query = query.neq('id', excludeOrderId);
      }

      const { error } = await query;
      if (error) throw error;
      set({ activeOrders: [] });
    } catch (err) {
      console.error('Error settling orders with payment:', err);
      throw err;
    }
  },

  addToCart: (product: Product, options?: string[], notes?: string) => {
    const cart = get().cart;
    const opts = (options || []).filter(Boolean);
    const key = [product.id, opts.join('|'), (notes || '').trim()].join('__');
    const existing = cart.find((i) => i.key === key);
    if (existing) {
      set({
        cart: cart.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      set({
        cart: [
          ...cart,
          {
            id: product.id,
            key,
            name: product.name,
            price: product.price,
            quantity: 1,
            options: opts.length ? opts : undefined,
            notes: notes?.trim() || undefined,
          },
        ],
      });
    }
  },

  updateCartQuantity: (key: string, quantity: number) => {
    if (quantity <= 0) {
      set({ cart: get().cart.filter((i) => i.key !== key) });
    } else {
      set({
        cart: get().cart.map((i) => (i.key === key ? { ...i, quantity } : i)),
      });
    }
  },

  clearCart: () => set({ cart: [] }),

  getCartTotal: () => {
    return get().cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  createOrder: async (orderData) => {
    const { selectedTable, selectedTab } = get();
    const tableNumber = orderData.table_number ?? selectedTable;
    const tabNumber = orderData.tab_number ?? selectedTab;
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
        customer_address: orderData.customer_address || null,
        payment_method: orderData.payment_method,
        status: orderData.status || 'pending',
        order_type: orderData.order_type || 'customer',
        table_number: tableNumber,
        tab_number: tabNumber,
        estimated_delivery_time: orderData.estimated_delivery_time || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      throw error;
    }

    // After creating, refresh active orders for this tab
    if (orderData.restaurant_id) {
      get().fetchActiveOrders(orderData.restaurant_id, tableNumber, tabNumber);
    }

    return data;
  },

  lookupCustomerByPhone: async (restaurantId: string, phone: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('name, phone, email, address')
        .eq('restaurant_id', restaurantId)
        .eq('phone', phone)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error looking up customer:', err);
      return null;
    }
  },

  upsertCustomer: async (restaurantId: string, customer: { name: string; phone: string; email?: string; address?: string }) => {
    try {
      const { error } = await supabase
        .from('customers')
        .upsert(
          {
            restaurant_id: restaurantId,
            name: customer.name,
            phone: customer.phone,
            email: customer.email || null,
            address: customer.address || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'restaurant_id,phone' }
        );
      if (error) throw error;
    } catch (err) {
      console.error('Error upserting customer:', err);
    }
  },
}));
