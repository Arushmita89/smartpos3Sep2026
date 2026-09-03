'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, ArrowLeft } from 'lucide-react';
import { usePOSStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

interface RestaurantOrderingProps {
  restaurant: { restaurant_id: string; restaurant_name: string };
  onOrderComplete: () => void;
}

export default function RestaurantOrdering({
  restaurant,
  onOrderComplete,
}: RestaurantOrderingProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showMobileCart, setShowMobileCart] = useState(false);

  const {
    products,
    cart,
    addToCart,
    updateCartQuantity,
    clearCart,
    createOrder,
    getCartTotal,
    fetchProducts,
  } = usePOSStore();

  useEffect(() => {
    if (restaurant.restaurant_id) {
      fetchProducts(restaurant.restaurant_id);
    }
  }, [restaurant.restaurant_id, fetchProducts]);

  const filteredProducts = useMemo(
    () =>
      selectedCategory === 'All'
        ? products.filter((p) => p.available)
        : products.filter(
            (p) => p.available && p.category === selectedCategory
          ),
    [products, selectedCategory]
  );

  const cartTotal = getCartTotal();
  const taxAmount = Math.round(cartTotal * 0.18);
  const totalWithTax = cartTotal + taxAmount;
  const cartItemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(cats).sort()];
  }, [products]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    try {
      const order = await createOrder({
        restaurant_id: restaurant.restaurant_id,
        items: cart.map((i) => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        subtotal: cartTotal,
        tax: taxAmount,
        total: totalWithTax,
        customer_name: 'Walk-in',
        customer_phone: '0000000000',
        payment_method: 'cash',
      });
      toast.success(`Order #${order.id} created!`);
      clearCart();
      onOrderComplete();
    } catch (err: any) {
      toast.error(`Failed to create order: ${err.message}`);
    }
  };

  const CartContent = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="text-center text-gray-500">Cart is empty</div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center mb-3"
            >
              <span className="text-sm">
                {item.name} x{item.quantity}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                  onClick={() =>
                    updateCartQuantity(item.id, item.quantity - 1)
                  }
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                  onClick={() =>
                    updateCartQuantity(item.id, item.quantity + 1)
                  }
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <span className="text-sm font-medium">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t">
        <div className="flex justify-between mb-1">
          <span>Subtotal:</span>
          <span>{formatCurrency(cartTotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Tax 18%:</span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex justify-between font-bold mb-3">
          <span>Total:</span>
          <span>{formatCurrency(totalWithTax)}</span>
        </div>
        <button
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          onClick={handlePlaceOrder}
          disabled={cart.length === 0}
        >
          Place Order
        </button>
        <button
          className="w-full mt-2 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          onClick={clearCart}
          disabled={cart.length === 0}
        >
          Clear Cart
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex space-x-2 mb-4 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                selectedCategory === c
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="p-3">
                <h3 className="font-bold">{p.name}</h3>
                <p className="text-gray-600">{formatCurrency(p.price)}</p>
                <button
                  className="mt-2 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 flex items-center justify-center"
                  onClick={() => addToCart(p)}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden lg:flex lg:w-80 bg-white shadow-md">
        <CartContent />
      </div>
      {showMobileCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-end">
          <div className="w-80 bg-white shadow-lg flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">Cart</h2>
              <button onClick={() => setShowMobileCart(false)}>Close</button>
            </div>
            <CartContent />
          </div>
        </div>
      )}
      <button
        onClick={() => setShowMobileCart(true)}
        className="lg:hidden fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-lg"
      >
        <ShoppingCart className="h-6 w-6" />
        {cartItemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
            {cartItemCount}
          </span>
        )}
      </button>
    </div>
  );
}
