'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, BellRing } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Notif {
  id: string;
  type: string | null;
  title: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { restaurant, subscription } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const restaurantId = restaurant?.restaurant_id;
  const canNotify = !!restaurantId && !subscription?.isLocked;

  const load = async () => {
    if (!restaurantId) return;
    try {
      const res = await fetch(
        `/api/subscription/notifications?restaurantId=${encodeURIComponent(
          restaurantId
        )}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      // ignore notification load errors
    }
  };

  useEffect(() => {
    if (!canNotify) return;
    load();
    const interval = setInterval(load, 60000);
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', onDocClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, canNotify]);

  const unread = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (!restaurantId) return;
    try {
      await fetch('/api/subscription/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const goToSubscription = async () => {
    await markAllRead();
    setOpen(false);
    router.push('/subscription');
  };

  if (!canNotify) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        {unread > 0 ? (
          <BellRing className="h-5 w-5 text-amber-500" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-sm text-gray-900">
              Notifications
              {unread > 0 && (
                <span className="ml-2 text-xs font-medium text-red-500">
                  {unread} unread
                </span>
              )}
            </p>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-sm text-gray-500 p-4 text-center">
                No notifications
              </p>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-gray-50 ${
                  n.is_read ? '' : 'bg-blue-50'
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>

          {notifications.length > 0 && (
            <button
              onClick={goToSubscription}
              className="w-full px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 text-center"
            >
              Manage subscription →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
