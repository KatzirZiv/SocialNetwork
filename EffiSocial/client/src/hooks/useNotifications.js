import { useState, useCallback, useEffect } from 'react';
import { users } from '../services/api';

const useNotifications = (userId) => {
  // console.log('useNotifications userId', userId);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId || userId === '') {
      return;
    }
    try {
      const incomingRes = await users.getFriendRequests();
      const incoming = (incomingRes?.data?.data || []).map(req => ({
        type: 'friend_request_incoming',
        from: req.sender,
        createdAt: req.createdAt,
        status: req.status,
        _id: req._id,
        read: false,
        message: `${req.sender?.username || 'Someone'} sent you a friend request`,
        avatar: req.sender?.profilePicture || '/default-profile.png',
      }));
      setNotifications(incoming);
      setUnreadCount(incoming.length); // You can add logic to track read/unread if needed
    } catch (err) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userId]);

  useEffect(() => {
    // console.log('useEffect in useNotifications running', userId);
    if (userId && userId !== '') {
      fetchNotifications();
      // Poll for notifications every 10 seconds
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [userId, fetchNotifications]);

  const markAsRead = () => {
    setUnreadCount(0);
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

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  };
};

export default useNotifications; 