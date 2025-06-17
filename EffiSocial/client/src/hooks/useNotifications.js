import { useState, useEffect } from 'react';
import useSocket from './useSocket';

const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const socket = useSocket(userId);

  useEffect(() => {
    if (socket) {
      socket.on('notification:new', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
      });

      return () => {
        socket.off('notification:new');
      };
    }
  }, [socket]);

  const markAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification._id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  };

  const clearNotification = (notificationId) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification._id !== notificationId)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  };
};

export default useNotifications; 