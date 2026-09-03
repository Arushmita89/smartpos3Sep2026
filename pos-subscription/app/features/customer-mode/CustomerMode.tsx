"use client";

import { useState, useMemo, useEffect } from "react";
import { ShoppingCart, Plus, ArrowLeft, Minus, Printer, X } from "lucide-react";
import { usePOSStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_JYYxadLPnYq0QW";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function CustomerInfoModal({
  onSubmit,
  onCancel,
}: {
  onSubmit: (info: { name: string; phone: string; email?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Please enter customer name and phone number");
      return;
    }
    if (phone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-gray-600 text-sm mb-6">
          Please provide customer details for the receipt
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Customer Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter customer name"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="Enter 10-digit phone number"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !phone.trim() || phone.length < 10}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  amount,
  customerInfo,
  onSuccess,
  onCancel,
}: {
  amount: number;
  customerInfo: { name: string; phone: string; email?: string };
  onSuccess: (data: {
    method: "online" | "cash";
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    cashReceived?: number;
    change?: number;
  }) => void;
  onCancel: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash" | null>(null);
  const [cashAmount, setCashAmount] = useState("");

  const handleOnlinePayment = async () => {
    setProcessing(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment system. Please try again.");
        return;
      }

      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(amount) }),
      });
      if (!res.ok) throw new Error("Failed to create order");
      const order = await res.json();

      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency,
        name: "SmartPOS",
        description: "Food Order",
        order_id: order.id,
        handler: (response: any) => {
          onSuccess({
            method: "online",
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
          });
        },
        prefill: {
          name: customerInfo.name,
          email: customerInfo.email || "customer@example.com",
          contact: customerInfo.phone,
        },
        theme: { color: "#2563eb" },
        method: { upi: true, card: true, netbanking: true },
        modal: {
          ondismiss: () => {
            toast.error("Payment was cancelled.");
            onCancel();
          },
        },
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error("Payment failed, please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCashPayment = () => {
    const cash = parseFloat(cashAmount);
    if (isNaN(cash) || cash < amount) {
      toast.error(`Please enter at least ${formatCurrency(amount)}`);
      return;
    }
    onSuccess({
      method: "cash",
      cashReceived: cash,
      change: cash - amount,
    });
  };

  if (!paymentMethod) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Choose Payment Method</h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600 mb-6">
            Total Amount: <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod("online")}
              className="w-full p-4 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              Pay Online (UPI / Card / Net Banking)
            </button>
            <button
              onClick={() => setPaymentMethod("cash")}
              className="w-full p-4 border-2 border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium"
            >
              Pay with Cash
            </button>
          </div>
          <button
            onClick={onCancel}
            className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (paymentMethod === "cash") {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Cash Payment</h3>
            <button onClick={() => setPaymentMethod(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600 mb-4">
            Total Amount: <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Cash Received
            </label>
            <input
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder={`Minimum ${formatCurrency(amount)}`}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              min={amount}
              step="0.01"
            />
          </div>
          {cashAmount && parseFloat(cashAmount) >= amount && (
            <p className="text-green-600 mb-4 font-medium">
              Change: {formatCurrency(parseFloat(cashAmount) - amount)}
            </p>
          )}
          <div className="flex space-x-3">
            <button
              onClick={() => setPaymentMethod(null)}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCashPayment}
              disabled={!cashAmount || parseFloat(cashAmount) < amount}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Payment</h3>
        <p className="text-gray-600 mb-6">Amount: {formatCurrency(amount)}</p>
        <button
          onClick={handleOnlinePayment}
          disabled={processing}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {processing ? "Processing..." : "Pay Now"}
        </button>
        <button
          onClick={onCancel}
          className="w-full mt-3 bg-gray-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ReceiptModal({ order, onClose }: { order: any; onClose: () => void }) {
  if (!order) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">SmartPOS Receipt</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Order #{order.id} - {new Date(order.created_at).toLocaleString()}
        </p>
        {order.customerInfo && (
          <div className="border-b pb-3 mb-3">
            <h4 className="font-semibold text-sm mb-1">Customer Details:</h4>
            <p className="text-sm text-gray-600">Name: {order.customerInfo.name}</p>
            <p className="text-sm text-gray-600">Phone: {order.customerInfo.phone}</p>
            {order.customerInfo.email && (
              <p className="text-sm text-gray-600">Email: {order.customerInfo.email}</p>
            )}
          </div>
        )}
        <div className="space-y-1 mb-3">
          {order.items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.name} x{item.quantity}</span>
              <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax (18%):</span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-1 border-t">
            <span>Total:</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          <div className="pt-2">
            <div className="flex justify-between text-sm">
              <span>Payment Method:</span>
              <span className="capitalize">{order.paymentMethod || "Online"}</span>
            </div>
            {order.paymentMethod === "cash" && order.cashReceived && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Cash Received:</span>
                  <span>{formatCurrency(order.cashReceived)}</span>
                </div>
                {order.change !== undefined && order.change > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Change Given:</span>
                    <span>{formatCurrency(order.change)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex space-x-3 mt-6">
          <button
            onClick={() => window.print()}
            className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerMode({ onBack }: { onBack: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<{
    name: string;
    phone: string;
    email?: string;
  } | null>(null);

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
  const { restaurant } = useAuth();
  const restaurantId = restaurant?.restaurant_id;

  useEffect(() => {
    if (restaurantId) {
      fetchProducts(restaurantId);
    }
  }, [restaurantId, fetchProducts]);

  const filteredProducts = useMemo(
    () =>
      selectedCategory === "All"
        ? products.filter((p) => p.available)
        : products.filter((p) => p.available && p.category === selectedCategory),
    [products, selectedCategory],
  );

  const cartTotal = useMemo(() => getCartTotal(), [cart]);
  const taxAmount = useMemo(() => Math.round(cartTotal * 0.18), [cartTotal]);
  const totalWithTax = useMemo(() => cartTotal + taxAmount, [cartTotal, taxAmount]);
  const cartItemCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(cats).sort()];
  }, [products]);

  const handleProceedToPayment = () => {
    if (cart.length === 0) return;
    setShowMobileCart(false);
    setShowCustomerInfo(true);
  };

  const handleCustomerInfoSubmit = (info: {
    name: string;
    phone: string;
    email?: string;
  }) => {
    setCustomerInfo(info);
    setShowCustomerInfo(false);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (paymentData: {
    method: "online" | "cash";
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    cashReceived?: number;
    change?: number;
  }) => {
    try {
      if (!restaurantId) {
        toast.error("Unable to place order. Restaurant ID missing.");
        return;
      }
      if (!customerInfo) {
        toast.error("Customer information missing. Please try again.");
        return;
      }

      const orderData = {
        restaurant_id: restaurantId,
        razorpay_order_id:
          paymentData.razorpayOrderId ||
          (paymentData.method === "cash" ? `cash_${Date.now()}` : ""),
        razorpay_payment_id:
          paymentData.razorpayPaymentId ||
          (paymentData.method === "cash" ? `cash_payment_${Date.now()}` : ""),
        items: cart.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        subtotal: cartTotal,
        tax: taxAmount,
        total: totalWithTax,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email || null,
        payment_method: paymentData.method,
      };

      const order = await createOrder(orderData);

      setLastOrder({
        ...order,
        paymentMethod: paymentData.method,
        cashReceived: paymentData.cashReceived,
        change: paymentData.change,
        customerInfo: customerInfo,
      });
      setShowPayment(false);
      setShowReceipt(true);
      clearCart();
      setCustomerInfo(null);
      toast.success(`Order #${order.id} created successfully!`);
    } catch (err: any) {
      console.error("Error in handlePaymentSuccess:", err);
      toast.error("Something went wrong while saving order. Please try again.");
    }
  };

  const CartContent = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Cart is empty</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-500">{formatCurrency(item.price)} each</p>
              </div>
              <div className="flex items-center space-x-2 mx-3">
                <button
                  className="p-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                  onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                <button
                  className="p-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                  onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-sm font-semibold text-gray-900 w-16 text-right">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t bg-gray-50 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(cartTotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Tax (18%)</span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 pt-2 border-t">
          <span>Total</span>
          <span>{formatCurrency(totalWithTax)}</span>
        </div>
        <button
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium mt-2"
          onClick={handleProceedToPayment}
          disabled={cart.length === 0}
        >
          Place & Pay
        </button>
        <button
          className="w-full border border-gray-300 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-gray-600"
          onClick={clearCart}
          disabled={cart.length === 0}
        >
          Clear Cart
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <button onClick={onBack} className="p-2 hover:bg-blue-700 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">SmartPOS</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-blue-100 hidden sm:inline">{cartItemCount} items</span>
          <button
            onClick={() => setShowMobileCart(true)}
            className="lg:hidden p-2 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex space-x-2 mb-6 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                  selectedCategory === c
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setSelectedCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center text-gray-400 py-20">
              <p>No items available in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="w-full h-40 bg-gray-100">
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 text-sm">{p.name}</h3>
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-base font-bold text-gray-900">{formatCurrency(p.price)}</span>
                      <button
                        className="bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 flex items-center text-sm transition-colors"
                        onClick={() => addToCart(p)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden lg:flex lg:w-80 bg-white shadow-md border-l border-gray-200 flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Cart</h2>
          </div>
          <CartContent />
        </div>
      </div>

      {showMobileCart && (
        <div className="fixed inset-0 bg-black/50 z-40 flex justify-end">
          <div className="w-80 bg-white shadow-lg flex flex-col max-w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Cart</h2>
              <button
                onClick={() => setShowMobileCart(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CartContent />
          </div>
        </div>
      )}

      {showCustomerInfo && (
        <CustomerInfoModal
          onSubmit={handleCustomerInfoSubmit}
          onCancel={() => setShowCustomerInfo(false)}
        />
      )}
      {showPayment && customerInfo && (
        <PaymentModal
          amount={totalWithTax}
          customerInfo={customerInfo}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPayment(false)}
        />
      )}
      {showReceipt && (
        <ReceiptModal order={lastOrder} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}
