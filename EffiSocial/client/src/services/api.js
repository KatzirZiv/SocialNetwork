import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth endpoints
export const auth = {
  login: (credentials) => api.post('/auth/login', credentials, { headers: { 'Content-Type': 'application/json' } }),
  register: (userData) => api.post('/auth/register', userData, { headers: { 'Content-Type': 'application/json' } }),
  getProfile: () => api.get('/auth/me'),
};

// User endpoints
export const users = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  getPosts: (id) => api.get(`/users/${id}/posts`),
  update: (id, data) => {
    console.log('API Update Request - ID:', id);
    console.log('API Update Request - Data:', data);
    
    if (data instanceof FormData) {
      // Log FormData contents
      for (let pair of data.entries()) {
        console.log('FormData entry:', pair[0], pair[1]);
      }
      
      // Ensure proper headers for multipart/form-data
      return api.put(`/users/${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        transformRequest: [(data) => {
          console.log('Transform Request - Data:', data);
          return data;
        }],
        onUploadProgress: (progressEvent) => {
          console.log('Upload progress:', progressEvent);
        }
      });
    } else {
      return api.put(`/users/${id}`, data, {
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    }
  },
  delete: (id) => api.delete(`/users/${id}`),
  follow: (id) => api.post(`/users/${id}/follow`),
  unfollow: (id) => api.post(`/users/${id}/unfollow`),
  getFriends: (id) => api.get(`/users/${id}/friends`),
  addFriend: (id, friendId) => api.post(`/users/${id}/friends/${friendId}`),
  removeFriend: (id, friendId) => api.delete(`/users/${id}/friends/${friendId}`),
  sendFriendRequest: async (userId) => {
    const url = `/users/${userId}/friend-request`;
    console.log('Sending friend request:', {
      userId,
      url,
      fullUrl: `${API_URL}${url}`,
      method: 'POST'
    });
    try {
      const response = await api.post(url);
      return response.data;
    } catch (error) {
      console.error('Friend request error details:', {
        status: error.response?.status,
        data: error.response?.data,
        config: error.config,
        url: error.config?.url,
        fullUrl: `${API_URL}${error.config?.url}`
      });
      
      // If we have a specific error message from the server, throw it
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      // Otherwise throw a generic error
      throw new Error('Failed to send friend request');
    }
  },
  cancelFriendRequest: async (userId) => {
    const url = `/users/${userId}/friend-request`;
    console.log('Cancelling friend request:', {
      userId,
      url,
      fullUrl: `${API_URL}${url}`,
      method: 'DELETE'
    });
    try {
      const response = await api.delete(url);
      return response.data;
    } catch (error) {
      console.error('Cancel friend request error details:', {
        status: error.response?.status,
        data: error.response?.data,
        config: error.config,
        url: error.config?.url,
        fullUrl: `${API_URL}${error.config?.url}`
      });
      
      // If we have a specific error message from the server, throw it
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      // Otherwise throw a generic error
      throw new Error('Failed to cancel friend request');
    }
  },
  acceptFriendRequest: (userId) => api.put(`/users/accept-friend/${userId}`),
  rejectFriendRequest: (userId) => api.put(`/users/reject-friend/${userId}`),
  getFriendRequests: () => api.get('/users/friend-requests'),
  search: async (query) => {
    console.log('=== API Search Function ===');
    console.log('Search query:', query);
    console.log('API URL:', `${API_URL}/users/search?query=${encodeURIComponent(query)}`);
    try {
      const response = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
      console.log('Search API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });
      return response.data;
    } catch (error) {
      console.error('Search API Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      throw error;
    }
  },
};

// Group endpoints
export const groups = {
  getAll: () => api.get('/groups'),
  getById: (id) => api.get(`/groups/${id}`),
  create: (data) => api.post('/groups', data, { headers: { 'Content-Type': 'application/json' } }),
  update: (id, data) => api.put(`/groups/${id}`, data, { headers: { 'Content-Type': 'application/json' } }),
  delete: (id) => api.delete(`/groups/${id}`),
  join: (id) => api.post(`/groups/${id}/join`),
  leave: (id) => api.post(`/groups/${id}/leave`),
  invite: (id, userId) => api.post(`/groups/${id}/invite`, { userId }, { headers: { 'Content-Type': 'application/json' } }),
};

// Post endpoints
export const posts = {
  getAll: () => api.get('/posts'),
  getById: (id) => api.get(`/posts/${id}`),
  create: (data) => api.post('/posts', data), // No Content-Type header, allows FormData
  update: (id, data) => api.put(`/posts/${id}`, data, { headers: { 'Content-Type': 'application/json' } }),
  delete: (id) => api.delete(`/posts/${id}`),
  like: (id) => api.post(`/posts/${id}/like`),
  unlike: (id) => api.post(`/posts/${id}/unlike`),
  comment: (id, data) => api.post(`/posts/${id}/comments`, data, { headers: { 'Content-Type': 'application/json' } }),
  addComment: (postId, content) =>
    api.post(`/posts/${postId}/comments`, { content }, { headers: { 'Content-Type': 'application/json' } }),
};

// Message endpoints
export const messages = {
  getAll: () => api.get('/messages'),
  getConversation: (userId) => api.get(`/messages/${userId}`),
  send: (data) => api.post('/messages', data, { headers: { 'Content-Type': 'application/json' } }),
  delete: (id) => api.delete(`/messages/${id}`),
};

export default api; 