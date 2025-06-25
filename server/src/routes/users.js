const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getFriends,
  addFriend,
  removeFriend,
  handleMulterError,
  uploadMiddleware,
  getUserPosts,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  cancelFriendRequest,
  getOutgoingFriendRequests,
  getNewUsersPerMonth
} = require('../controllers/users');

// Search users route - allow non-logged-in users but check auth if available
router.get('/search', async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (err) {
      // If token is invalid, continue without user
      console.log('Invalid token in search route:', err.message);
    }
  }
  next();
}, searchUsers);

// Friend request routes without ID
router.get('/friend-requests', protect, getFriendRequests);
router.get('/friends', protect, getFriends);

// Friend request routes with ID - moved before /:id route
router.post('/:id/friend-request', protect, (req, res, next) => {
  console.log('=== Friend Request Route ===');
  console.log('Request details:', {
    method: req.method,
    url: req.originalUrl,
    params: req.params,
    body: req.body,
    headers: req.headers,
    user: req.user ? { id: req.user._id, username: req.user.username } : 'Not authenticated'
  });
  console.log('Route params:', {
    id: req.params.id,
    path: req.path,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl
  });
  console.log('Available routes:', router.stack.map(r => ({
    path: r.route?.path,
    methods: r.route?.methods
  })).filter(r => r.path));
  next();
}, sendFriendRequest);

// User ID routes
router.route('/:id')
  .get(protect, getUser)
  .put(protect, async (req, res, next) => {
    try {
      await uploadMiddleware(req, res);
      next();
    } catch (error) {
      next(error);
    }
  }, handleMulterError, updateUser)
  .delete(protect, authorize('admin'), deleteUser);

// Friends routes
router.route('/:id/friends')
  .get(protect, getFriends);

router.route('/:id/friends/:friendId')
  .post(protect, addFriend)
  .delete(protect, removeFriend);

// Get user's posts
router.get('/:id/posts', protect, getUserPosts);

// Base routes
router.route('/')
  .get(protect, getUsers)
  .post(protect, authorize('admin'), createUser);

// Friend request routes
router.delete('/friend-request/:requestId', protect, cancelFriendRequest);
router.put('/friend-request/:requestId/accept', protect, acceptFriendRequest);
router.put('/friend-request/:requestId/reject', protect, rejectFriendRequest);

// Outgoing friend requests
router.get('/outgoing-friend-requests', protect, getOutgoingFriendRequests);


router.get('/stats/new-per-month', getNewUsersPerMonth);

// Catch-all for unknown /api/users/* routes - must be last
router.use((req, res) => {
  console.log('Catch-all route hit:', {
    method: req.method,
    url: req.originalUrl,
    params: req.params,
    body: req.body,
    headers: req.headers
  });
  res.status(404).json({ success: false, error: 'Not found in /api/users' });
});

module.exports = router; 