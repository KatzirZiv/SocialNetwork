import { useEffect, useRef } from 'react';
import io from 'socket.io-client';

const useSocket = (userId) => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');

    // Connect user
    if (userId) {
      socketRef.current.emit('user:connect', userId);
    }

    // Cleanup on unmount
    return () => {
      if (userId) {
        socketRef.current.emit('user:disconnect', userId);
      }
      socketRef.current.disconnect();
    };
  }, [userId]);

  return socketRef.current;
};

export default useSocket; 