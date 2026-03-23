import { create } from 'zustand';
import { supabase } from '../config/supabaseClient';
import { getNotifications, markNotificationRead } from '../services/api';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  addNotification: (notif: Notification) => void;
  subscribeToNotifications: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (userId: string) => {
    set({ loading: true });
    try {
      const data = await getNotifications(userId);
      set({ 
        notifications: data, 
        unreadCount: data.filter((n: any) => !n.is_read).length,
        loading: false 
      });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await markNotificationRead(id);
      const { notifications } = get();
      const updated = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
      set({ 
        notifications: updated,
        unreadCount: updated.filter(n => !n.is_read).length
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  },

  addNotification: (notif: Notification) => {
    const { notifications } = get();
    // Prepend new notification
    const updated = [notif, ...notifications];
    set({ 
      notifications: updated,
      unreadCount: updated.filter(n => !n.is_read).length
    });
  },

  subscribeToNotifications: (userId: string) => {
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          console.log("New notification received:", payload);
          get().addNotification(payload.new as Notification);
          
          // Optional: Trigger a browser notification or a toast here
          if ('Notification' in window && Notification.permission === 'granted') {
             new Notification(payload.new.title, { body: payload.new.message });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}));
