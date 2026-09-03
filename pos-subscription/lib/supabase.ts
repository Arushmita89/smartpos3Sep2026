import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      parameters: {
        Row: {
          restaurant_id: string;
          restaurant_name: string;
          mpin: string;
          created_at: string;
          login_name: string | null;
          password_hash: string | null;
          gst_number: string | null;
          phone: string | null;
          address_line1: string | null;
          address_line2: string | null;
          address_line3: string | null;
          owner1: string | null;
          owner2: string | null;
          owner3: string | null;
          owner4: string | null;
          tax_rate: number;
        };
        Insert: {
          restaurant_id: string;
          restaurant_name: string;
          mpin?: string;
          login_name?: string | null;
          password_hash?: string | null;
          gst_number?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          address_line3?: string | null;
          owner1?: string | null;
          owner2?: string | null;
          owner3?: string | null;
          owner4?: string | null;
          tax_rate?: number;
        };
        Update: {
          restaurant_name?: string;
          mpin?: string;
          login_name?: string | null;
          password_hash?: string | null;
          gst_number?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          address_line3?: string | null;
          owner1?: string | null;
          owner2?: string | null;
          owner3?: string | null;
          owner4?: string | null;
          tax_rate?: number;
        };
      };
      menu: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          price: number;
          category: string;
          image_url: string | null;
          available: boolean;
          preparation_time: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          price: number;
          category: string;
          image_url?: string | null;
          available?: boolean;
          preparation_time?: number;
        };
        Update: {
          name?: string;
          description?: string | null;
          price?: number;
          category?: string;
          image_url?: string | null;
          available?: boolean;
          preparation_time?: number;
        };
      };
      categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          type?: string;
        };
        Update: {
          name?: string;
          type?: string;
        };
      };
      orders: {
        Row: {
          id: number;
          restaurant_id: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          items: { name: string; price: number; quantity: number }[];
          subtotal: number;
          tax: number;
          total: number;
          customer_name: string | null;
          customer_phone: string | null;
          customer_email: string | null;
          payment_method: string;
          status: string;
          order_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          restaurant_id: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          items: { name: string; price: number; quantity: number }[];
          subtotal: number;
          tax: number;
          total: number;
          customer_name?: string | null;
          customer_phone?: string | null;
          customer_email?: string | null;
          payment_method?: string;
          status?: string;
          order_type?: string;
        };
        Update: {
          status?: string;
          payment_method?: string;
        };
      };
    };
  };
};
