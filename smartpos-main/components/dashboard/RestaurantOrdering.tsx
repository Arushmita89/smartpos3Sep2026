'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Minus, ShoppingCart, Search, CreditCard } from 'lucide-react';
import { usePOSStore } from '@/lib/store';
import ItemOptionsDialog from '@/components/ui/ItemOptionsDialog';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

interface RestaurantOrderingProps {
  restaurant: {
    restaurant_id: string;
    restaurant_name: string;
    item_options?: string[] | null;
    currency?: string | null;
  };
  onOrderComplete: () => void;
}

export default function RestaurantOrdering({
  restaurant,
  onOrderComplete,
}: RestaurantOrderingProps) {
  const currency = restaurant.currency || 'INR';
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [optionsDialogItem, setOptionsDialogItem] = useState<any>(null);
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
    selectedTable,
    selectedTab,
    setSelectedTable,
    setSelectedTab,
    settleTab,
    activeOrders,
    fetchActiveOrders,
  } = usePOSStore();

  useEffect(() => {
    if (restaurant.restaurant_id) {
      fetchProducts(restaurant.restaurant_id);
      fetchActiveOrders(restaurant.restaurant_id, selectedTable, selectedTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.restaurant_id]);

  const filteredProducts = useMemo(
    () =>
      (selectedCategory === 'All'
        ? products.filter((p) => p.available)
        : products.filter(
            (p) => p.available && p.category === selectedCategory
          )).filter((p) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
          p.name.toLowerCase().includes(term) ||
          (p.description || '').toLowerCase().includes(term) ||
          (p.category || '').toLowerCase().includes(term)
        );
      }),
    [products, selectedCategory, searchTerm]
  );

  const cartTotal = getCartTotal();
  const taxAmount = Math.round(cartTotal * 0.18);
  const totalWithTax = cartTotal + taxAmount;
  const cartItemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const activeOrdersTotal = useMemo(
    () => activeOrders.reduce((sum, o) => sum + o.total, 0),
    [activeOrders]
  );

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(cats).sort()];
  }, [products]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    try {
      await createOrder({
        restaurant_id: restaurant.restaurant_id,
        items: cart.map((i) => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          options: i.options || [],
          notes: i.notes || "",
        })),
        subtotal: cartTotal,
        tax: taxAmount,
        total: totalWithTax,
        customer_name: 'Walk-in',
        customer_phone: '0000000000',
        payment_method: 'cash',
      });
      toast.success('Order created!');
      clearCart();
      onOrderComplete();
    } catch (err: any) {
      toast.error(`Failed to create order: ${err.message}`);
    }
  };

  const handleSettleAll = async () => {
    try {
      await settleTab(restaurant.restaurant_id, selectedTable, selectedTab);
      toast.success('Tab settled and cleared!');
    } catch {
      toast.error('Failed to settle tab');
    }
  };

  const CartContent = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeOrders.length === 0 && cart.length === 0 ? (
          <div className="text-center text-gray-500">Cart is empty</div>
        ) : (
          <>
            {activeOrders.length > 0 && (
              <>
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                  Previous Orders ({activeOrders.length})
                </div>
                {activeOrders.map((order) => (
                  <div key={order.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-blue-800">Order #{order.id}</span>
                      <span className="text-xs text-blue-600">{formatCurrency(order.total, currency)}</span>
                    </div>
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-700">
                        <span>{item.name} x{item.quantity}</span>
                        <span>{formatCurrency(item.price * item.quantity, currency)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}

            {cart.length > 0 && (
              <>
                {activeOrders.length > 0 && (
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mt-2 mb-1">
                    New Items
                  </div>
                )}
                {cart.map((item) => (
                  <div key={item.key} className="flex justify-between items-center mb-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm">{item.name} x{item.quantity}</span>
                      {item.options && item.options.length > 0 && (
                        <p className="text-xs text-blue-700 truncate">{item.options.join(", ")}</p>
                      )}
                      {item.notes && <p className="text-xs text-gray-500 truncate">{item.notes}</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        onClick={() => updateCartQuantity(item.key, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        onClick={() => updateCartQuantity(item.key, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(item.price * item.quantity, currency)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
      <div className="p-4 border-t space-y-1">
        <div className="font-semibold text-sm text-gray-700 mb-1">
          Cart — {selectedTable}-{selectedTab}
        </div>
        {activeOrders.length > 0 && (
          <div className="flex justify-between text-sm text-blue-600">
            <span>Previous</span>
            <span>{formatCurrency(activeOrdersTotal, currency)}</span>
          </div>
        )}
        <div className="flex justify-between mb-1">
          <span>Subtotal:</span>
          <span>{formatCurrency(cartTotal, currency)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Tax 18%:</span>
          <span>{formatCurrency(taxAmount, currency)}</span>
        </div>
        <div className="flex justify-between font-bold mb-3">
          <span>Grand Total</span>
          <span>{formatCurrency(activeOrdersTotal + totalWithTax, currency)}</span>
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
    <div className="flex flex-col flex-1">
      {/* Table / Tab selector bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-500 uppercase">Table</span>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(parseInt(e.target.value), restaurant.restaurant_id)}
            className="text-sm font-bold text-gray-900 bg-gray-100 border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>Table {n}</option>
            ))}
          </select>
        </div>
        <div className="h-5 w-px bg-gray-300" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-500 uppercase">Tab</span>
          <select
            value={selectedTab}
            onChange={(e) => setSelectedTab(parseInt(e.target.value), restaurant.restaurant_id)}
            className="text-sm font-bold text-gray-900 bg-gray-100 border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{selectedTable}-{n}</option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <button
          onClick={handleSettleAll}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
        >
          <CreditCard className="w-4 h-4" />
          Settle All
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-3">
                  <h3 className="font-bold">{p.name}</h3>
                  <p className="text-gray-600">{formatCurrency(p.price, currency)}</p>
                  {(p.options || []).length > 0 && (
                    <p className="text-xs text-gray-500 truncate">{p.options!.join(", ")}</p>
                  )}
                  <button
                    className="mt-2 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 flex items-center justify-center"
                    onClick={() => setOptionsDialogItem(p)}
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

        {optionsDialogItem && (
          <ItemOptionsDialog
            item={optionsDialogItem}
            commonOptions={restaurant.item_options || []}
            onConfirm={(options, notes) => {
              addToCart(optionsDialogItem, options, notes);
              setOptionsDialogItem(null);
            }}
            onCancel={() => setOptionsDialogItem(null)}
          />
        )}
      </div>
    </div>
  );
}
