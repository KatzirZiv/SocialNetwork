const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
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
  uploadMiddleware
} = require('../controllers/users');

// Routes
router.route('/')
  .get(protect, getUsers)
  .post(protect, authorize('admin'), createUser);

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

router.route('/:id/friends')
  .get(protect, getFriends);

router.route('/:id/friends/:friendId')
  .post(protect, addFriend)
  .delete(protect, removeFriend);

module.exports = router; 