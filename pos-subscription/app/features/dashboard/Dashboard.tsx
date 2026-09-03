'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CustomerMode from '@/components/customer/CustomerMode';
import RestaurantOrdering from '@/components/dashboard/RestaurantOrdering';
import OrderManagement from '@/components/dashboard/OrderManagement';
import Analytics from '@/components/dashboard/Analytics';
import RestaurantDashboard from '@/components/dashboard/RestaurantDashboard';
import MenuManagement from '@/components/dashboard/MenuManagement';
import { usePOSStore } from '@/lib/store';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Store,
  Clock,
  Package,
  Users,
  BarChart3,
  Settings,
  User,
  LogOut,
  BookOpen,
  X,
} from 'lucide-react';

export default function Dashboard() {
  const { restaurant, signOut } = useAuth();
  const [mode, setMode] = useState<'restaurant' | 'customer'>('restaurant');
  const [activeSection, setActiveSection] = useState('pos');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const handleRestaurantModeAccess = () => {
    setMode('restaurant');
  };

  const handleCustomerModeAccess = () => {
    usePOSStore.getState().refreshProducts();
    setMode('customer');
  };

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Restaurant not found
          </h2>
          <p className="text-gray-600 mb-4">
            Please contact support or try logging in again.
          </p>
          <button
            onClick={handleSignOut}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'customer') {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerMode onBack={handleRestaurantModeAccess} />
      </div>
    );
  }

  const sidebarItems = [
    { id: 'pos', name: 'Point of Sale', icon: ShoppingCart },
    { id: 'order-now', name: 'Order Now', icon: Store },
    { id: 'order-status', name: 'Order Status', icon: Clock },
    { id: 'menu', name: 'Menu Management', icon: BookOpen },
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'customers', name: 'Customers', icon: Users },
    { id: 'reports', name: 'Reports', icon: BarChart3 },
    { id: 'settings', name: 'Settings', icon: Settings },
    { id: 'admin', name: 'Admin', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 w-64 bg-blue-600 text-white flex flex-col z-40 transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-blue-500 flex items-center justify-between">
          <div className="flex items-center">
            <Store className="h-8 w-8 mr-3" />
            <div>
              <h1 className="text-lg font-bold">SmartPOS</h1>
              <p className="text-xs text-blue-200">Restaurant System</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-blue-200 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveSection(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors ${
                      activeSection === item.id
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-100 hover:bg-blue-500 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    {item.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-blue-500">
          <div className="mb-3">
            <p className="text-sm font-medium truncate">{restaurant.restaurant_name}</p>
            <p className="text-xs text-blue-200">System Admin</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-3 py-2 text-blue-100 hover:bg-blue-500 hover:text-white rounded-lg transition-colors text-sm"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-sm border-b h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {sidebarItems.find((item) => item.id === activeSection)?.name || 'Point of Sale'}
              </h2>
              <p className="text-xs text-gray-500 hidden sm:block">Manage your restaurant operations</p>
            </div>
          </div>
          <button
            onClick={handleCustomerModeAccess}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm font-medium"
          >
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Customer Mode</span>
            <span className="sm:hidden">Customer</span>
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto bg-gray-100">
          {activeSection === 'pos' && (
            <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Point of Sale</h3>
              <p className="text-gray-600 mb-4">
                Switch to Customer Mode to browse menu and place orders, or use Order Now for quick in-house orders.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCustomerModeAccess}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Customer Mode
                </button>
                <button
                  onClick={() => setActiveSection('order-now')}
                  className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center font-medium"
                >
                  <Store className="h-5 w-5 mr-2" />
                  Quick Order
                </button>
              </div>
            </div>
          )}
          {activeSection === 'order-now' && (
            <RestaurantOrdering
              restaurant={restaurant}
              onOrderComplete={() => {
                toast.success('Order completed successfully!');
              }}
            />
          )}
          {activeSection === 'order-status' && (
            <OrderManagement restaurant={restaurant} />
          )}
          {activeSection === 'menu' && <MenuManagement restaurant={restaurant} />}
          {activeSection === 'inventory' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Inventory Management</h3>
              <p className="text-gray-600">Inventory management features coming soon.</p>
            </div>
          )}
          {activeSection === 'customers' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Management</h3>
              <p className="text-gray-600">Customer management features coming soon.</p>
            </div>
          )}
          {activeSection === 'reports' && <Analytics restaurant={restaurant} />}
          {activeSection === 'settings' && (
            <RestaurantDashboard />
          )}
          {activeSection === 'admin' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Panel</h3>
              <p className="text-gray-600">Admin features coming soon.</p>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
