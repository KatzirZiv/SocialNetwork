import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const useSocket = (userId) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    if (socketRef.current) return;
    socketRef.current = io('http://localhost:5000', {
      withCredentials: true
    });

    // Connect user
    socketRef.current.emit('join', userId);

    // Cleanup on unmount
    return () => {
      socketRef.current.emit('leave', userId);
      socketRef.current.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return socketRef.current;
};

export default useSocket; 