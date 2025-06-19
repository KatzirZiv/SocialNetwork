import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const useSocket = (userId) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    // console.log('[Socket] Connecting with userId:', userId);
    socketRef.current = io('http://localhost:5000', {
      withCredentials: true
    });

    // Connect user
    if (userId) {
      socketRef.current.emit('join', userId);
    }

    // Cleanup on unmount
    return () => {
      if (userId) {
        socketRef.current.emit('leave', userId);
      }
      socketRef.current.disconnect();
    };
  }, [userId]);

  return socketRef.current;
};

export default useSocket; 