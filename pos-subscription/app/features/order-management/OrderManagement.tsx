"use client";

import React, { useState, useEffect } from "react";
import { Database } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  Package,
  CreditCard,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

type Restaurant = Database["public"]["Tables"]["parameters"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];

interface OrderManagementProps {
  restaurant: Restaurant;
  onOrderUpdate?: () => void;
}

export default function OrderManagement({
  restaurant,
  onOrderUpdate,
}: OrderManagementProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurant.restaurant_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      setUpdatingOrderId(orderId);
      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (error) throw error;

      setOrders(orders.map(order =>
        order.id === orderId
          ? { ...order, status: newStatus as any, updated_at: new Date().toISOString() }
          : order
      ));

      toast.success(`Order marked as ${newStatus}`);
      if (onOrderUpdate) onOrderUpdate();
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast.error(`Failed to update order status: ${error?.message || 'Unknown error'}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3 mr-1" />;
      case 'in_progress':
        return <RefreshCw className="h-3 w-3 mr-1" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'cancelled':
        return <XCircle className="h-3 w-3 mr-1" />;
      default:
        return <Package className="h-3 w-3 mr-1" />;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter === "all") return true;
    return order.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button
            onClick={fetchOrders}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Orders</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {orders.filter(order => order.status === 'pending' || !order.status).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {orders.filter(order => {
                  const orderDate = new Date(order.created_at).toDateString();
                  const today = new Date().toDateString();
                  return orderDate === today && order.status === 'completed';
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {statusFilter === "all" ? "No orders found" : `No ${statusFilter} orders found`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        Order #{order.id}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status || 'pending')}`}>
                        {getStatusIcon(order.status || 'pending')}
                        {(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1).replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(order.created_at)}
                      </div>
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-1" />
                        {order.payment_method || 'online'}
                      </div>
                      {order.customer_name && (
                        <div className="flex items-center">
                          <span className="text-gray-500">Customer:</span>
                          <span className="ml-1 font-medium">{order.customer_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Order Items:</h5>
                      <div className="space-y-2">
                        {order.items.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">
                              {item.name} x {item.quantity}
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tax:</span>
                          <span className="text-gray-900">{formatCurrency(order.tax)}</span>
                        </div>
                        <div className="flex justify-between font-medium text-base border-t border-blue-200 pt-1">
                          <span className="text-gray-900">Total:</span>
                          <span className="text-gray-900">{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {order.updated_at && order.updated_at !== order.created_at && (
                          <span>Last updated: {formatDate(order.updated_at)}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {(order.status === 'pending' || !order.status) && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'in_progress')}
                            disabled={updatingOrderId === order.id}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Start Preparing
                          </button>
                        )}
                        {order.status === 'in_progress' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            disabled={updatingOrderId === order.id}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Complete
                          </button>
                        )}
                        {(order.status === 'pending' || order.status === 'in_progress') && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            disabled={updatingOrderId === order.id}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
