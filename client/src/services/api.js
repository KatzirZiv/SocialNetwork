import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  // Removed default Content-Type header to allow FormData uploads
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
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
  login: (credentials) =>
    api.post("/auth/login", credentials, {
      headers: { "Content-Type": "application/json" },
    }),
  register: (userData) =>
    api.post("/auth/register", userData, {
      headers: { "Content-Type": "application/json" },
    }),
  getProfile: () => api.get("/auth/me"),
};

// User endpoints
export const users = {
  getAll: () => api.get("/users"),
  getById: (id) => api.get(`/users/${id}`),
  getPosts: (id) => api.get(`/users/${id}/posts`),
  update: (id, data) => {
    if (data instanceof FormData) {
      return api.put(`/users/${id}`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
        transformRequest: [
          (data) => {
            return data;
          },
        ],
        onUploadProgress: (progressEvent) => {
        },
      });
    } else {
      return api.put(`/users/${id}`, data, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
    }
  },
  delete: (id) => api.delete(`/users/${id}`),
  follow: (id) => api.post(`/users/${id}/follow`),
  unfollow: (id) => api.post(`/users/${id}/unfollow`),
  getFriends: (id) => api.get(`/users/${id}/friends`),
  addFriend: (id, friendId) => api.post(`/users/${id}/friends/${friendId}`),
  removeFriend: (id, friendId) =>
    api.delete(`/users/${id}/friends/${friendId}`),
  sendFriendRequest: async (userId) => {
    const url = `/users/${userId}/friend-request`;
    try {
      const response = await api.post(url);
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error("Failed to send friend request");
    }
  },
  cancelFriendRequest: async (requestId) => {
    const url = `/users/friend-request/${requestId}`;
    try {
      const response = await api.delete(url);
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error("Failed to cancel friend request");
    }
  },
  acceptFriendRequest: async (requestId) => {
    const url = `/users/friend-request/${requestId}/accept`;
    try {
      const response = await api.put(url);
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error("Failed to accept friend request");
    }
  },
  rejectFriendRequest: async (requestId) => {
    const url = `/users/friend-request/${requestId}/reject`;
    try {
      const response = await api.put(url);
      return response.data;
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error("Failed to reject friend request");
    }
  },
  getFriendRequests: () => api.get("/users/friend-requests"),
  search: async (query) => {
    try {
      const response = await api.get(
        `/users/search?query=${encodeURIComponent(query)}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  changePassword: (id, data) =>
    api.put(`/users/${id}/password`, data, {
      headers: { 'Content-Type': 'application/json' },
    }),
};

// Group endpoints
export const groups = {
  getAll: () => api.get("/groups"),
  getById: (id) => api.get(`/groups/${id}`),
  create: (data) =>
    api.post("/groups", data, {
      headers: { "Content-Type": "application/json" },
    }),
  update: (id, data) => {
    if (data instanceof FormData) {
      return api.put(`/groups/${id}`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
        transformRequest: [
          (data) => {
            return data;
          },
        ],
        onUploadProgress: (progressEvent) => {},
      });
    } else {
      return api.put(`/groups/${id}`, data, {
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      });
    }
  },
  delete: (id) => api.delete(`/groups/${id}`),
  join: (id) => api.post(`/groups/${id}/join`),
  leave: (id) => api.post(`/groups/${id}/leave`),
  invite: (id, userId) =>
    api.post(
      `/groups/${id}/invite`,
      { userId },
      { headers: { "Content-Type": "application/json" } }
    ),
  addMember: (id, userId) =>
    api.post(
      `/groups/${id}/add-member`,
      { userId },
      { headers: { "Content-Type": "application/json" } }
    ),
  removeMember: (id, userId) =>
    api.post(
      `/groups/${id}/remove-member`,
      { userId },
      { headers: { "Content-Type": "application/json" } }
    ),
  transferAdmin: (id, newAdminId) =>
    api.post(`/groups/${id}/transfer-admin`, { newAdminId }),
};

// Post endpoints
export const posts = {
  getAll: (filters) => {
    let url = "/posts";
    if (filters && typeof filters === 'object' && Object.keys(filters).length > 0) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      url += `?${params.toString()}`;
    }
    return api.get(url);
  },
  getById: (id) => api.get(`/posts/${id}`),
  create: (data) => {
    if (data instanceof FormData) {
      return api.post('/posts', data);
    } else {
      return api.post('/posts', data, {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
  update: (id, data) =>
    api.put(`/posts/${id}`, data, {
      headers: { "Content-Type": "application/json" },
    }),
  delete: (id) => api.delete(`/posts/${id}`),
  like: (id) => api.put(`/posts/${id}/like`),
  unlike: (id) => api.put(`/posts/${id}/unlike`),
  comment: (id, data) =>
    api.post(`/posts/${id}/comments`, data, {
      headers: { "Content-Type": "application/json" },
    }),
  addComment: (postId, content) =>
    api.post(
      `/posts/${postId}/comments`,
      { content },
      { headers: { "Content-Type": "application/json" } }
    ),
  updateComment: (postId, commentId, content) =>
    api.put(
      `/posts/${postId}/comments/${commentId}`,
      { content },
      { headers: { "Content-Type": "application/json" } }
    ),
  deleteComment: (postId, commentId) =>
    api.delete(`/posts/${postId}/comments/${commentId}`),
};

// Message endpoints
export const messages = {
  getAll: () => api.get("/messages"),
  getConversation: (userId) => api.get(`/messages/${userId}`),
  send: (data) =>
    api.post("/messages", data, {
      headers: { "Content-Type": "application/json" },
    }),
  delete: (id) => api.delete(`/messages/${id}`),
};